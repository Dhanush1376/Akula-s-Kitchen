import crypto from 'crypto';
import mongoose from 'mongoose';
import Order from '../models/Order';
import ApiError from '../utils/ApiError';
import logger from '../config/logger';
import { RazorpayGateway } from '../utils/payment/RazorpayGateway';
import PaymentAudit from '../models/PaymentAudit';
import OutboxEvent from '../models/OutboxEvent';
import * as Sentry from '@sentry/node';
import { InventoryService } from './InventoryService';
import Product from '../models/Product';
import User from '../models/User';
import AnalyticsService from './analyticsService';
import PaymentAttempt from '../models/PaymentAttempt';
import PaymentEvent from '../models/PaymentEvent';
import { generateUuid } from '../shared/utils/uuidGenerator';
import { TransactionalEmailService } from './TransactionalEmailService';

export class PaymentVerificationService {
  static async verifyPayment(
    paymentData: any,
    invokerId: string,
    role: string,
    source: 'frontend' | 'webhook' = 'frontend',
    externalSession?: mongoose.ClientSession,
  ) {
    const razorpay_order_id = paymentData.razorpay_order_id || paymentData.razorpayOrderId;
    const razorpay_payment_id = paymentData.razorpay_payment_id || paymentData.razorpayPaymentId;
    const razorpay_signature = paymentData.razorpay_signature || paymentData.razorpaySignature;

    if (!razorpay_order_id || !razorpay_payment_id) {
      throw new ApiError(400, 'Missing payment verification parameters');
    }

    if (source === 'frontend' && !razorpay_signature) {
      throw new ApiError(400, 'Missing payment signature');
    }

    const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!razorpayKeySecret) {
      throw new ApiError(500, 'Payment verification is not configured on the server');
    }

    const shasum = crypto.createHmac('sha256', razorpayKeySecret);
    shasum.update(`${razorpay_order_id}|${razorpay_payment_id}`);
    const digest = shasum.digest('hex');
    const expectedHash = Buffer.from(digest, 'utf8');
    const signatureHash = Buffer.from(razorpay_signature || '', 'utf8');
    const isSignatureValid =
      source === 'webhook'
        ? true
        : expectedHash.length === signatureHash.length &&
          crypto.timingSafeEqual(expectedHash, signatureHash);

    // Fetch payment from Razorpay API BEFORE starting the transaction
    let fetchedPayment;
    try {
      fetchedPayment = await RazorpayGateway.getPayment(razorpay_payment_id);
    } catch (err: any) {
      logger.error(`Failed to fetch payment ${razorpay_payment_id} from Razorpay:`, err);
      throw new ApiError(502, 'Failed to connect to payment gateway for verification');
    }

    const session = externalSession || (await mongoose.startSession());
    if (!externalSession) session.startTransaction();
    let finalOrder: any;

    let attempt: any;
    try {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      const processingNode = process.env.HOSTNAME || require('os').hostname();

      attempt = await PaymentAttempt.findOneAndUpdate(
        {
          razorpayOrderId: razorpay_order_id,
          $or: [
            { status: { $in: ['initiated', 'failed'] } },
            { status: 'processing', leaseExpiresAt: { $lt: fiveMinutesAgo } },
          ],
        },
        {
          $set: {
            status: 'processing',
            processingBy: processingNode,
            leaseExpiresAt: new Date(Date.now() + 5 * 60 * 1000),
          },
        },
        { returnDocument: 'after', session },
      );

      if (!attempt) {
        const existingAttempt = await PaymentAttempt.findOne({
          razorpayOrderId: razorpay_order_id,
        }).session(session);
        if (existingAttempt && existingAttempt.status === 'success') {
          logger.info(
            `[PAYMENT REDUNDANCY] Payment already processed successfully for intent: ${existingAttempt._id}`,
          );

          let existingDoc;
          if (existingAttempt.type === 'purchase') {
            existingDoc = await Order.findById(existingAttempt.orderData.pendingOrderId).session(
              session,
            );
          }

          if (!externalSession) {
            await session.abortTransaction();
            session.endSession();
          }
          return existingDoc;
        }
        if (existingAttempt && existingAttempt.status === 'processing') {
          logger.info(
            `[PAYMENT RACE] Intent ${existingAttempt._id} is actively being processed by a webhook.`,
          );
          if (!externalSession) {
            await session.abortTransaction();
            session.endSession();
          }
          // Ideally poll here, but for now just return error to let client retry
          throw new ApiError(
            409,
            'Payment is currently being processed. Please check back in a few seconds.',
          );
        }
        throw new ApiError(404, 'Checkout intent not found or cannot be locked for processing');
      }

      if (attempt.userId.toString() !== invokerId && role !== 'admin') {
        attempt.status = 'initiated';
        await attempt.save({ session });
        throw new ApiError(403, 'You are not authorized to verify this payment');
      }

      const userId = attempt.userId.toString();

      const expectedAmount = Math.round(
        (attempt.orderData.total ?? attempt.orderData.totalAmount) * 100,
      );

      const isAmountValid = Number(fetchedPayment.amount) === expectedAmount;
      const isCurrencyValid = fetchedPayment.currency === 'INR';
      const isOrderValid = fetchedPayment.order_id === razorpay_order_id;
      const isStatusValid =
        fetchedPayment.status === 'captured' || fetchedPayment.status === 'authorized';

      const isValid =
        isSignatureValid && isAmountValid && isCurrencyValid && isOrderValid && isStatusValid;

      await PaymentAudit.create([
        {
          orderId: attempt.orderData.pendingOrderId, // Assuming we use pendingOrderId for all
          userId: attempt.userId,
          razorpayOrderId: razorpay_order_id,
          razorpayPaymentId: razorpay_payment_id,
          eventType: 'verification_attempt',
          status: isValid ? 'success' : !isSignatureValid ? 'failed' : 'tampered',
          amountExpected: expectedAmount,
          amountReceived: Number(Number(fetchedPayment.amount)),
          currencyReceived: String(fetchedPayment.currency),
          signatureValid: isSignatureValid,
          notes: `Signature: ${isSignatureValid}, Amount Match: ${isAmountValid}, Status: ${fetchedPayment.status}`,
          rawPayload: JSON.stringify(fetchedPayment),
        },
      ]);

      if (!isValid) {
        attempt.status = 'failed';
        // We do not save it with the session because the session will be aborted.
        // We will update it outside the transaction below.

        if (attempt.orderData?.reservationIds?.length > 0) {
          for (const resId of attempt.orderData.reservationIds) {
            try {
              // Note: if session is aborted, this might also be rolled back if it uses the session.
              // We should probably just pass the session for now.
              await InventoryService.cancelReservation(resId.toString(), session);
            } catch (err) {
              logger.error(`Failed to cancel reservation ${resId} on failed payment:`, err);
            }
          }
        }

        // External side-effects are now handled via Outbox Pattern AFTER rollback
        // So we rollback the active transaction immediately.
        if (!externalSession) {
          await session.abortTransaction();
          session.endSession();
        }

        // Persist the attempt failure outside the transaction boundary
        try {
          await PaymentAttempt.updateOne({ _id: attempt._id }, { $set: { status: 'failed' } });
        } catch (err) {
          logger.error('Failed to persist payment attempt failure after rollback:', err);
        }

        // Persist the failed-payment audit event OUTSIDE the main transaction boundary
        // to ensure it is durably recorded despite the rollback of business state.
        try {
          await PaymentEvent.create([
            {
              eventId: generateUuid(),
              orderId: attempt.orderData.pendingOrderId,
              orderType: attempt.type,
              eventType: 'failed',
              amount: expectedAmount / 100,
              currency: 'INR',
              razorpayOrderId: razorpay_order_id,
              razorpayPaymentId: razorpay_payment_id,
              performedBy: 'system',
              gatewayResponse: fetchedPayment,
            },
          ]);

          await OutboxEvent.create({
            aggregateId: attempt.orderData.pendingOrderId.toString(),
            aggregateType: 'Order',
            eventType: 'PaymentFailed',
            payload: {
              razorpayPaymentId: razorpay_payment_id,
              reason: !isSignatureValid ? 'tampered_signature' : 'invalid_amount_or_status',
            },
          });
        } catch (auditErr) {
          logger.error(
            'Failed to save PaymentEvent audit and OutboxEvent after rollback:',
            auditErr,
          );
        }

        if (fetchedPayment && fetchedPayment.status === 'captured') {
          try {
            await OutboxEvent.create({
              aggregateId: attempt.orderData.pendingOrderId.toString(),
              aggregateType: 'Order',
              eventType: 'RefundRequested',
              payload: {
                razorpayPaymentId: razorpay_payment_id,
                amount: Number(fetchedPayment.amount),
                reason: 'tampered_signature',
              },
            });
            logger.info(
              `[PAYMENT REFUND] Scheduled outbox refund for tampered captured payment ${razorpay_payment_id}`,
            );
          } catch (refundErr) {
            Sentry.captureException(refundErr, {
              tags: { critical: 'checkout_failure', tampered: 'true' },
              extra: { razorpay_payment_id },
            });
          }
        }

        Sentry.captureException(new Error(`Payment untrusted for attempt ${attempt._id}`), {
          tags: { critical: 'checkout_failure' },
          extra: { attemptId: attempt._id, razorpay_order_id, razorpay_payment_id },
        });

        try {
          await TransactionalEmailService.sendPaymentFailedEmail(
            {
              orderId: attempt.orderData.pendingOrderId,
              total: attempt.orderData.total || expectedAmount / 100,
              shippingAddress: attempt.orderData.shippingAddress,
            },
            null,
            'Invalid payment details. Payment untrusted.',
            attempt._id.toString(),
          );
        } catch (emailErr) {
          logger.warn('Failed to send payment failure email notification:', emailErr);
        }

        throw new ApiError(400, 'Invalid payment details. Payment untrusted.');
      }

      await PaymentEvent.create(
        [
          {
            eventId: generateUuid(),
            orderId: attempt.orderData.pendingOrderId,
            orderType: attempt.type,
            eventType: 'paid',
            amount: expectedAmount / 100,
            currency: 'INR',
            razorpayOrderId: razorpay_order_id,
            razorpayPaymentId: razorpay_payment_id,
            performedBy: 'system',
            gatewayResponse: fetchedPayment,
          },
        ],
        { session },
      );

      // Valid payment. Let's create the actual order/booking based on attempt.type
      const orderData = attempt.orderData;

      if (attempt.type === 'purchase') {
        // --- PURCHASE VERIFICATION ---
        for (const item of orderData.orderItems) {
          if (item.productId) {
            await Product.findByIdAndUpdate(
              item.productId,
              { $inc: { sold: item.quantity || 1 } },
              { session },
            );
          }
        }

        const orderedProductIds = orderData.orderItems.map((item: any) => item.productId);
        await User.findByIdAndUpdate(
          userId,
          { $pull: { cart: { product: { $in: orderedProductIds } } } },
          { session },
        );

        // Payment verified and confirmed
        const initialStatus = 'Confirmed';
        const initialNote = 'Payment verified and order confirmed';

        if (orderData.reservationIds && orderData.reservationIds.length > 0) {
          for (const resId of orderData.reservationIds) {
            await InventoryService.confirmReservation(resId.toString(), session);
          }
        }

        finalOrder = await Order.create(
          [
            {
              _id: orderData.pendingOrderId,
              user: userId,
              items: orderData.orderItems,
              shippingAddress: orderData.shippingAddress,
              customerName: orderData.customerName || orderData.shippingAddress?.name || '',
              customerEmail: orderData.customerEmail || orderData.shippingAddress?.email || '',
              customerPhone: orderData.customerPhone || orderData.shippingPhone || '',
              shippingPhone: orderData.shippingPhone || orderData.shippingAddress?.phone || '',
              codPhoneVerified: false,
              paymentDetails: {
                provider: 'Razorpay',
                paymentId: razorpay_payment_id,
                orderId: razorpay_order_id,
                method: fetchedPayment?.method || 'online',
                upiVpa: fetchedPayment?.vpa || undefined,
              },
              subtotal: orderData.subtotal,
              shippingFee: orderData.shippingFee,
              discount: orderData.discount || 0,
              codFee: orderData.codFee,
              walletDeduction: orderData.walletDeduction,
              total: orderData.total,
              paymentMethod: orderData.paymentMethod,
              paymentStatus: 'paid',
              orderStatus: initialStatus as any,
              reservationIds: orderData.reservationIds,
              statusHistory: [
                {
                  status: initialStatus as any,
                  note: initialNote,
                },
              ],
              invoiceNumber: orderData.invoiceNumber,
              // Transfer immutable invoice snapshots from PaymentAttempt
              invoice: orderData.invoice,
              store: orderData.store,
              tax: orderData.tax,
              trackingNumber: orderData.trackingNumber,
              courierPartner: orderData.courierPartner,
              barcodeData: orderData.barcodeData,
              qrCodeData: orderData.qrCodeData,
              notes: orderData.notes,
              needByDate: orderData.needByDate,
              idempotencyKey: orderData.idempotencyKey,
              razorpayOrderId: razorpay_order_id,
              razorpayPaymentId: razorpay_payment_id,
              razorpaySignature: razorpay_signature,
            },
          ],
          { session },
        ).then((res: any) => res?.[0]);

        await OutboxEvent.create(
          [
            {
              aggregateId: finalOrder._id.toString(),
              aggregateType: 'Order',
              eventType: 'OrderCreated',
              payload: {
                orderId: finalOrder._id.toString(),
                userId: userId,
                type: 'online',
                amount: finalOrder.total,
              },
            },
          ],
          { session },
        );
      }

      attempt.status = 'success';
      await attempt.save({ session });

      if (!externalSession) await session.commitTransaction();
    } catch (error) {
      if (!externalSession && session.inTransaction()) {
        await session.abortTransaction();
      }
      throw error;
    } finally {
      if (!externalSession) session.endSession();
    }

    AnalyticsService.clearCache();
    logger.info(`Payment verified and entity created successfully: ${finalOrder._id}`);

    if (attempt.type === 'purchase' && finalOrder) {
      try {
        const { default: AutomationEngineService } = require('./marketing/AutomationEngineService');
        AutomationEngineService.cancelUserEnrollments(finalOrder.user, 'purchased').catch(() => {});
        AutomationEngineService.attributeOrderConversion(finalOrder).catch(() => {});
      } catch (_mktErr) {}
    }

    return finalOrder;
  }
}
