import { PURCHASE_STATUS, TRANSACTION_TYPES } from '../constants/statusConstants';
import logger from '../config/logger';

export class StatusNormalizationService {
  /**
   * Normalizes legacy Purchase Order statuses to Canonical UPPER_SNAKE_CASE
   */
  static normalizePurchaseStatus(rawStatus: string): string {
    if (!rawStatus) return PURCHASE_STATUS.UNKNOWN;
    const s = String(rawStatus).toLowerCase().trim();

    const map: Record<string, string> = {
      'pending cod': PURCHASE_STATUS.PENDING,
      pending_payment: PURCHASE_STATUS.PENDING,
      'payment pending': PURCHASE_STATUS.PENDING,
      pending: PURCHASE_STATUS.PENDING,
      'pending approval': PURCHASE_STATUS.PENDING_APPROVAL,
      confirmed: PURCHASE_STATUS.CONFIRMED,
      processing: PURCHASE_STATUS.PROCESSING,
      packed: PURCHASE_STATUS.PROCESSING,
      'ready to ship': PURCHASE_STATUS.PROCESSING,
      shipped: PURCHASE_STATUS.PROCESSING,
      dispatched: PURCHASE_STATUS.PROCESSING,
      in_transit: PURCHASE_STATUS.PROCESSING,
      'out for delivery': PURCHASE_STATUS.PROCESSING,
      delivered: PURCHASE_STATUS.DELIVERED,
      completed: PURCHASE_STATUS.DELIVERED,
      cancelled: PURCHASE_STATUS.CANCELLED,
      returned: PURCHASE_STATUS.RETURNED,
      return_requested: PURCHASE_STATUS.RETURN_REQUESTED,
      'return requested': PURCHASE_STATUS.RETURN_REQUESTED,
      return_approved: PURCHASE_STATUS.RETURN_APPROVED,
      refunded: PURCHASE_STATUS.REFUNDED,
    };

    if (map[s]) return map[s];
    if (Object.values(PURCHASE_STATUS).includes(rawStatus as any)) return rawStatus; // Already canonical

    logger.warn(`Unknown Purchase Order status encountered: ${rawStatus}`);
    return PURCHASE_STATUS.UNKNOWN;
  }

  /**
   * Normalizes any transaction status by type
   */
  static normalizeStatus(rawStatus: string, transactionType: string): string {
    switch (transactionType) {
      case TRANSACTION_TYPES.PURCHASE:
        return this.normalizePurchaseStatus(rawStatus);
      default:
        logger.warn(`Unknown transaction type: ${transactionType} for status: ${rawStatus}`);
        return 'UNKNOWN';
    }
  }
}
