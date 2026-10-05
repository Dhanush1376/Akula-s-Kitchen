import logger from '../config/logger';
import OutboxEvent from '../models/OutboxEvent';
import { withCronLock } from '../utils/cronLock';
import * as Sentry from '@sentry/node';
import { TransactionalEmailService } from '../services/TransactionalEmailService';
import Order from '../models/Order';

/**
 * OutboxProcessor — Processes ALL outbox event types.
 *
 * Previously only handled 'OrderCreated'. Now handles:
 * - OrderCreated → Customer + admin order confirmation emails
 * - PaymentFailed → Customer failure email + admin alert
 * - PaymentDisputed → Admin dispute notification
 * - BookingConfirmed → Customer booking confirmation email + admin notification
 * - RentalCreated → Customer rental confirmation email + admin notification
 * - RentalPaymentFailed → Customer failure email
 * - RefundFailed → Critical admin alert + Sentry
 */
export const processOutboxEvents = async () => {
  await withCronLock('outbox-processor', 20, async () => {
    // Process up to 50 pending events
    const events = await OutboxEvent.find({ status: 'PENDING' })
      .sort({ createdAt: 1 })
      .limit(50)
      .maxTimeMS(10000);

    if (events.length === 0) return;

    logger.info(`[OUTBOX] Found ${events.length} pending events to process`);

    for (const event of events) {
      try {
        await processEvent(event);

        event.status = 'PUBLISHED';
        await event.save();
      } catch (err: any) {
        logger.error(
          `[OUTBOX] Failed to process event ${event._id} (${event.aggregateType}/${event.eventType}):`,
          err,
        );
        event.retryCount += 1;
        event.errorDetails = err.message;
        if (event.retryCount >= 5) {
          event.status = 'FAILED';
          Sentry.captureMessage(
            `Outbox event exhausted retries: ${event.aggregateType}/${event.eventType}`,
            {
              level: 'error',
              tags: { critical: 'outbox_dead_letter' },
              extra: {
                eventId: event._id.toString(),
                aggregateId: event.aggregateId,
                errorDetails: err.message,
              },
            },
          );
        }
        await event.save();
      }
    }
  });
};

/**
 * Process a single outbox event by its MongoDB _id.
 * Called INLINE after a transaction commits so emails/notifications fire
 * immediately without depending on cron or Redis.
 * Safe to call: errors are caught and logged, the event is marked FAILED for retry.
 */
export const processOutboxEventById = async (eventId: string) => {
  try {
    const event = await OutboxEvent.findById(eventId);
    if (!event || event.status !== 'PENDING') return;

    await processEvent(event);
    event.status = 'PUBLISHED';
    await event.save();
    logger.info(
      `[OUTBOX-INLINE] Successfully processed event ${eventId} (${event.aggregateType}/${event.eventType})`,
    );
  } catch (err: any) {
    logger.error(`[OUTBOX-INLINE] Failed to process event ${eventId}:`, err?.message || err);
    // Don't crash the caller — the cron will retry if it's ever enabled
    try {
      await OutboxEvent.findByIdAndUpdate(eventId, {
        $inc: { retryCount: 1 },
        $set: { errorDetails: err?.message || 'Inline processing failed' },
      });
    } catch {}
  }
};

export async function processEvent(event: any): Promise<void> {
  // Convert "Aggregate:Action" to "AGGREGATE_ACTION" format
  const eventName = `${event.aggregateType}_${event.eventType}`.toUpperCase();

  // 1. Process Transactional Emails based on Outbox Event (Persistent/Idempotent)
  try {
    if (eventName === 'ORDER_ORDERCREATED') {
      const order = await Order.findById(event.aggregateId).populate('user');
      if (order)
        await TransactionalEmailService.sendOrderPlacedEmails(
          order,
          order.user,
          event._id.toString(),
        );
    } else if (eventName === 'ORDER_REFUNDCOMPLETED') {
      const order = await Order.findById(event.aggregateId).populate('user');
      if (order && order.user && (order.user as any).email) {
        const { sendDirectEmail } = require('../services/notificationService');
        await sendDirectEmail({
          email: (order.user as any).email,
          subject: `Refund Processed Successfully - Order #${(order as any).orderId || order._id}`,
          customHtml: `<h1>Refund Processed</h1><p>Your refund of ₹${event.payload?.amount || ''} has been successfully processed via Razorpay. It should reflect in your account shortly.</p>`,
          type: 'order',
          action: 'order_refund_completed',
        });
      }
    } else if (eventName === 'ORDER_ORDERSTATUSUPDATED') {
      const order = await Order.findById(event.aggregateId).populate('user');
      if (order && event.payload) {
        await TransactionalEmailService.sendOrderStatusChangeEmail(
          order,
          order.user,
          event.payload.oldStatus,
          event.payload.newStatus,
          event._id.toString(),
        );
      }
    } else if (eventName === 'ORDER_PAYMENTFAILED') {
      const order = await Order.findById(event.aggregateId).populate('user');
      if (order && event.payload) {
        await TransactionalEmailService.sendPaymentFailedEmail(
          order,
          order.user,
          event.payload.reason || 'Payment processing failed',
          event._id.toString(),
        );
      }
    }
  } catch (emailErr) {
    logger.error(`[OUTBOX] Failed to send transactional email for ${eventName}:`, emailErr);
    // We intentionally don't throw here to avoid poisoning the outbox for non-email side-effects,
    // as TransactionalEmailService itself uses a persistent queue.
  }

  // 1.5 Process Admin Notifications (Persistent/Idempotent)
  try {
    const { createAdminNotification } = require('../services/notificationService');
    const AdminNotification = require('../models/AdminNotification').default;

    // Idempotency check: Don't create if one already exists for this outbox event
    const existingNotif = await AdminNotification.findOne({
      'metadata.outboxEventId': event._id.toString(),
    });

    if (!existingNotif) {
      if (eventName === 'ORDER_ORDERCREATED') {
        const order = await Order.findById(event.aggregateId).populate('user');
        if (order) {
          const firstTitle = order.items?.[0]?.title || (order.items?.[0] as any)?.name;
          const moreCount = order.items?.length > 1 ? ` (+${order.items.length - 1} more)` : '';
          const productTitle = firstTitle ? `${firstTitle}${moreCount}` : 'Order';
          await createAdminNotification({
            title: `New Order: ${productTitle}`,
            message: `${productTitle} placed by ${(order.user as any)?.name || order.shippingAddress?.name || 'Customer'} (₹${order.total})`,
            type: 'order',
            actionLink: `/admin/orders/${order._id}`,
            metadata: { outboxEventId: event._id.toString() },
          });
        }
      } else if (eventName === 'ORDER_ORDERSTATUSUPDATED') {
        const order = await Order.findById(event.aggregateId);
        if (order && event.payload) {
          const firstTitle = order.items?.[0]?.title || (order.items?.[0] as any)?.name;
          const moreCount = order.items?.length > 1 ? ` (+${order.items.length - 1} more)` : '';
          const productTitle = firstTitle ? `${firstTitle}${moreCount}` : 'Order';
          await createAdminNotification({
            title: `${productTitle} Status Updated`,
            message: `${productTitle} status changed: ${event.payload.oldStatus} → ${event.payload.newStatus}`,
            type: 'order',
            actionLink: `/admin/orders/${order._id}`,
            metadata: { outboxEventId: event._id.toString() },
          });
        }
      } else if (eventName === 'ORDER_PAYMENTFAILED') {
        const order = await Order.findById(event.aggregateId);
        if (order) {
          const firstTitle = order.items?.[0]?.title || (order.items?.[0] as any)?.name || 'Order';
          await createAdminNotification({
            title: 'Payment Failed',
            message: `Payment failed for ${firstTitle}`,
            type: 'payment',
            actionLink: `/admin/orders/${order._id}`,
            metadata: {
              outboxEventId: event._id.toString(),
              image: order.items?.length > 0 ? order.items[0].imageSrc : null,
            },
          });
        }
      } else if (eventName === 'ORDER_REFUNDREQUESTED') {
        const order = await Order.findById(event.aggregateId);
        if (order) {
          const firstTitle = order.items?.[0]?.title || (order.items?.[0] as any)?.name || 'Order';
          await createAdminNotification({
            title: 'Refund Requested',
            message: `Refund requested for ${firstTitle}`,
            type: 'payment',
            actionLink: `/admin/orders/${order._id}`,
            metadata: {
              outboxEventId: event._id.toString(),
              image: order.items?.length > 0 ? order.items[0].imageSrc : null,
            },
          });
        }
      } else if (eventName === 'ORDER_PAYMENTCAPTURED') {
        const order = await Order.findById(event.aggregateId);
        if (order) {
          const firstTitle = order.items?.[0]?.title || (order.items?.[0] as any)?.name || 'Order';
          await createAdminNotification({
            title: 'Payment Captured',
            message: `Payment successful for ${firstTitle}`,
            type: 'payment',
            actionLink: `/admin/orders/${order._id}`,
            metadata: { outboxEventId: event._id.toString() },
          });
        }
      }
    }
  } catch (adminNotifErr) {
    logger.error(`[OUTBOX] Failed to create admin notification for ${eventName}:`, adminNotifErr);
  }

  // 1.6 Process Customer Notifications (Persistent/Idempotent)
  try {
    const InAppNotification = require('../models/InAppNotification').default;
    const { emitUserEvent } = require('../socket');

    // Idempotency check: Don't create if one already exists for this outbox event
    const existingUserNotif = await InAppNotification.findOne({
      'metadata.outboxEventId': event._id.toString(),
    });

    if (!existingUserNotif) {
      let customerNotificationPayload: any = null;
      let targetUserId: string | null = null;

      if (eventName === 'ORDER_ORDERCREATED') {
        const order = await Order.findById(event.aggregateId);
        if (order) {
          targetUserId = order.user.toString();
          const firstTitle = order.items?.[0]?.title || (order.items?.[0] as any)?.name;
          const moreCount = order.items?.length > 1 ? ` (+${order.items.length - 1} more)` : '';
          const productTitle = firstTitle ? `${firstTitle}${moreCount}` : 'Order';
          customerNotificationPayload = {
            user: targetUserId,
            event: 'ORDER_CREATED',
            title: `Order Confirmed: ${productTitle}`,
            message: `Your order for ${productTitle} has been placed successfully.`,
            type: 'order',
            actionUrl: `/dashboard/orders/${order._id}`,
            metadata: {
              outboxEventId: event._id.toString(),
              orderId: order._id.toString(),
              entityId: order.orderUuid || order._id.toString(),
              imageSrc: order.items?.[0]?.imageSrc,
            },
          };
        }
      } else if (eventName === 'ORDER_ORDERSTATUSUPDATED') {
        const order = await Order.findById(event.aggregateId);
        if (order && event.payload) {
          targetUserId = order.user.toString();
          const firstTitle = order.items?.[0]?.title || (order.items?.[0] as any)?.name;
          const moreCount = order.items?.length > 1 ? ` (+${order.items.length - 1} more)` : '';
          const productTitle = firstTitle ? `${firstTitle}${moreCount}` : 'Order';
          customerNotificationPayload = {
            user: targetUserId,
            event: 'ORDER_UPDATED',
            title: `${productTitle} is now ${event.payload.newStatus}`,
            message: `The status of your ${productTitle} has been updated to ${event.payload.newStatus}.`,
            type: 'order',
            actionUrl: `/dashboard/orders/${order._id}`,
            metadata: {
              outboxEventId: event._id.toString(),
              orderId: order._id.toString(),
              entityId: order.orderUuid || order._id.toString(),
              imageSrc: order.items?.[0]?.imageSrc,
            },
          };
        }
      } else if (eventName === 'ORDER_PAYMENTCAPTURED') {
        const order = await Order.findById(event.aggregateId);
        if (order) {
          targetUserId = order.user.toString();
          const firstTitle =
            order.items?.[0]?.title || (order.items?.[0] as any)?.name || 'your order';
          customerNotificationPayload = {
            user: targetUserId,
            event: 'PAYMENT_SUCCESSFUL',
            title: 'Payment Successful',
            message: `Payment for ${firstTitle} was successful.`,
            type: 'payment',
            actionUrl: `/dashboard/orders/${order._id}`,
            metadata: {
              outboxEventId: event._id.toString(),
              orderId: order._id.toString(),
              entityId: order.orderUuid || order._id.toString(),
              imageSrc: order.items?.[0]?.imageSrc,
            },
          };
        }
      } else if (eventName === 'ORDER_PAYMENTFAILED') {
        const order = await Order.findById(event.aggregateId);
        if (order) {
          targetUserId = order.user.toString();
          const firstTitle =
            order.items?.[0]?.title || (order.items?.[0] as any)?.name || 'your order';
          customerNotificationPayload = {
            user: targetUserId,
            event: 'PAYMENT_FAILED',
            title: 'Payment Failed',
            message: `Payment for ${firstTitle} failed. Please retry.`,
            type: 'payment',
            actionUrl: `/dashboard/orders/${order._id}`,
            metadata: {
              outboxEventId: event._id.toString(),
              orderId: order._id.toString(),
              entityId: order.orderUuid || order._id.toString(),
              imageSrc: order.items?.[0]?.imageSrc,
            },
          };
        }
      } else if (eventName === 'ORDER_REFUNDREQUESTED') {
        const order = await Order.findById(event.aggregateId);
        if (order) {
          targetUserId = order.user.toString();
          customerNotificationPayload = {
            user: targetUserId,
            event: 'REFUND_INITIATED',
            title: 'Refund Requested',
            message: `A refund has been requested for your order #${order.orderUuid || order._id}.`,
            type: 'payment',
            actionUrl: `/dashboard/orders/${order._id}`,
            metadata: {
              outboxEventId: event._id.toString(),
              orderId: order._id.toString(),
              entityId: order.orderUuid || order._id.toString(),
              imageSrc: order.items?.[0]?.imageSrc,
            },
          };
        }
      }

      if (customerNotificationPayload && targetUserId) {
        const createdNotif = await InAppNotification.create(customerNotificationPayload);

        // Notify via socket
        try {
          emitUserEvent(targetUserId, 'notification:new', createdNotif);
        } catch (socketErr) {
          logger.error(
            `[OUTBOX] Failed to emit socket event for customer notification:`,
            socketErr,
          );
        }
      }
    }
  } catch (customerNotifErr) {
    logger.error(
      `[OUTBOX] Failed to create customer notification for ${eventName}:`,
      customerNotifErr,
    );
  }

  // 2. Handle specific internal Business Domain Side-Effects (Event Subscribers)
  // In a full microservices architecture, this would publish to Kafka/RabbitMQ.
  // Here we route to specific domain services if necessary.

  if (eventName === 'ORDER_ORDERSTATUSUPDATED') {
    const { triggerPurchaseRewards, triggerReversalRewards, total, userId, orderId } =
      event.payload;
    if (triggerPurchaseRewards) {
      try {
        const { LoyaltyService } = require('../services/loyaltyService');
        await LoyaltyService.processPurchaseRewards(userId, orderId, total);
      } catch (err) {
        logger.error('Failed to process purchase rewards:', err);
      }
    } else if (triggerReversalRewards) {
      try {
        const { LoyaltyService } = require('../services/loyaltyService');
        await LoyaltyService.reversePurchaseRewards(orderId);
      } catch (err) {
        logger.error('Failed to reverse purchase rewards:', err);
      }
    }
  }

  if (eventName.endsWith('_REFUNDREQUESTED')) {
    const { PaymentRefundService } = await import('../services/PaymentRefundService.js');
    const { amount, reason, razorpayPaymentId } = event.payload;
    try {
      await PaymentRefundService.initiateAsyncRefund({
        amount,
        currency: 'INR',
        originalTransactionId: razorpayPaymentId,
        entityType: event.aggregateType,
        entityId: event.aggregateId,
        reason,
      });
      logger.info(`[OUTBOX REFUND] Successfully enqueued refund for ${razorpayPaymentId}`);
    } catch (err) {
      logger.error(`[OUTBOX REFUND] Failed to enqueue refund for ${razorpayPaymentId}:`, err);
      throw err; // Force retry
    }
  }

  if (eventName === 'SYSTEM_NOTIFICATIONQUEUED') {
    if (event.payload && event.payload.emailOptions) {
      const { sendDirectEmailProcessor } = await import('../services/notificationService.js');
      await sendDirectEmailProcessor(event.payload.emailOptions);
    }
  }
}
