import mongoose from 'mongoose';
import { InventoryService } from '../InventoryService';
import logger from '../../config/logger';

/**
 * OrderRollbackService — Centralized rollback operations for failed/cancelled orders.
 *
 * Eliminates code duplication between:
 * - PaymentVerificationService (verification failure rollback)
 * - PaymentWebhookService (webhook failure rollback)
 * - OrderFulfillmentService (cancellation/return rollback)
 *
 * Every rollback operation writes to InventoryLog via InventoryService.
 */
export class OrderRollbackService {
  /**
   * Releases inventory reservations OR restores confirmed stock.
   * @param order The order document
   * @param isConfirmed Whether stock was already confirmed (deducted from stock) or just reserved
   * @param session MongoDB session for transaction safety
   */
  static async rollbackInventory(
    order: any,
    isConfirmed: boolean,
    session: mongoose.ClientSession,
  ): Promise<void> {
    if (isConfirmed) {
      // Stock was already deducted — restore it
      for (const item of order.items) {
        if (item.productId && item.quantity) {
          await InventoryService.restoreStock(
            item.productId.toString(),
            item.quantity,
            'order_cancelled',
            order._id.toString(),
            'Order',
            'system',
            session,
          );
        }
      }
    } else {
      // Stock was only reserved — release reservations
      if (order.reservationIds && order.reservationIds.length > 0) {
        for (const resId of order.reservationIds) {
          try {
            await InventoryService.cancelReservation(resId.toString(), session);
          } catch (err: any) {
            if (err.statusCode === 404 || err.message?.includes('not found')) {
              logger.warn(
                `[ROLLBACK] Reservation ${resId} not found during rollback of order ${order._id}. Skipping since it is already released.`,
              );
            } else {
              throw err;
            }
          }
        }
      } else {
        // Fallback for older orders without reservation tracking
        for (const item of order.items) {
          if (item.productId && item.quantity) {
            await InventoryService.releaseReservedStock(
              item.productId.toString(),
              item.quantity,
              'order_cancelled',
              order._id.toString(),
              'Order',
              'system',
              session,
            );
          }
        }
      }
    }
  }

  /**
   * Rolls back coupon usage for the given order (no-op since coupons are removed).
   */
  static async rollbackCoupon(_order: any, _session?: mongoose.ClientSession): Promise<void> {
    // No-op: Coupons have been removed from the platform
  }

  /**
   * Refunds wallet deduction for the given order.
   * Includes idempotency check to prevent double refunds.
   */
  static async rollbackWallet(_order: any, _session: mongoose.ClientSession): Promise<void> {
    // Wallet feature has been removed
    return;
  }

  /**
   * Performs a complete rollback of all checkout side effects.
   * Used when payment verification fails or webhook reports failure.
   *
   * @param order The order document
   * @param isConfirmed Whether stock was already confirmed (post-payment) or just reserved (pre-payment)
   * @param session MongoDB session
   */
  static async rollbackAll(
    order: any,
    isConfirmed: boolean,
    session: mongoose.ClientSession,
  ): Promise<void> {
    await this.rollbackInventory(order, isConfirmed, session);
    await this.rollbackCoupon(order, session);
    await this.rollbackWallet(order, session);
  }
}
