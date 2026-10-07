import { Request, Response } from 'express';
import asyncHandler from '../../utils/asyncHandler';
import { PaymentRefundService } from '../../services/PaymentRefundService';
import ApiError from '../../utils/ApiError';
import { z } from 'zod';
import { validateRequest } from '../../middleware/zodValidationMiddleware';
import logger from '../../config/logger';

const adminRefundSchema = z.object({
  body: z.object({
    amount: z.number().positive('Refund amount must be a positive number'),
    reason: z.string().min(5, 'Please provide a valid reason for the refund'),
    isPartial: z.boolean().optional().default(false),
  }),
});

// Admin Manual Refund
export const issueManualRefund = [
  validateRequest(adminRefundSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const entityType = String(req.params.entityType);
    const entityId = String(req.params.entityId);
    const { amount, reason, isPartial } = req.body;

    if (entityType !== 'Order') {
      throw new ApiError(400, 'Invalid entity type. Must be Order.');
    }

    // Refunds are issued against the captured Razorpay payment on the order.
    const Order = require('../../models/Order').default;
    const order = await Order.findById(entityId).select('razorpayPaymentId').lean();
    if (!order) throw new ApiError(404, 'Order not found');
    if (!order.razorpayPaymentId)
      throw new ApiError(400, 'Order does not have a captured Razorpay payment');
    const originalTransactionId: string = order.razorpayPaymentId;

    await PaymentRefundService.initiateAsyncRefund({
      amount,
      currency: 'INR',
      originalTransactionId,
      entityType: 'Order',
      entityId,
      isPartial,
      reason: `Admin Manual Refund: ${reason}`,
    });

    logger.info(
      `[ADMIN REFUND] Admin ${req.user?.id} initiated refund for ${entityType} ${entityId}`,
    );

    const { AdminAuditService } = require('../../services/AdminAuditService');
    await AdminAuditService.logAction({
      actorId: req.user?.id,
      actorEmail: req.user?.email,
      actorRole: req.user?.role,
      method: req.method,
      path: req.originalUrl,
      ip: req.ip,
      userAgent: req.get('user-agent'),
      entityType: entityType as any,
      entityId,
      action: 'manual_refund_initiated',
      newValue: { amount, reason, isPartial },
    });

    res.status(200).json({
      success: true,
      message: 'Refund initiated successfully and queued for processing.',
    });
  }),
];

// Customer Refund Status
export const getRefundStatus = asyncHandler(async (req: Request, res: Response) => {
  const entityType = String(req.params.entityType);
  const entityId = String(req.params.entityId);

  if (entityType !== 'Order') {
    throw new ApiError(400, 'Invalid entity type');
  }

  // Authorization check
  let isAuthorized = false;
  if (['super_admin', 'main_admin', 'admin'].includes(req.user?.role as any)) {
    isAuthorized = true;
  } else {
    const Order = require('../../models/Order').default;
    const order = await Order.findById(entityId).select('user').lean();
    if (order && String(order.user) === String(req.user?.id)) isAuthorized = true;
  }

  if (!isAuthorized) {
    throw new ApiError(403, 'Unauthorized access to refund status');
  }

  const refundStatus = await PaymentRefundService.getRefundStatusForEntity(entityType, entityId);

  res.status(200).json({
    success: true,
    data: refundStatus,
  });
});
