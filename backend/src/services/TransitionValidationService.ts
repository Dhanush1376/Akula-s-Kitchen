import { PURCHASE_STATUS, TRANSACTION_TYPES } from '../constants/statusConstants';
import logger from '../config/logger';

export class TransitionValidationService {
  /**
   * Defines allowed status transitions for Purchase Orders
   */
  private static getPurchaseTransitions(): Record<string, string[]> {
    return {
      [PURCHASE_STATUS.PENDING]: [
        PURCHASE_STATUS.PENDING_APPROVAL,
        PURCHASE_STATUS.CONFIRMED,
        PURCHASE_STATUS.CANCELLED,
      ],
      [PURCHASE_STATUS.PENDING_APPROVAL]: [PURCHASE_STATUS.CONFIRMED, PURCHASE_STATUS.CANCELLED],
      [PURCHASE_STATUS.CONFIRMED]: [PURCHASE_STATUS.PROCESSING, PURCHASE_STATUS.CANCELLED],
      [PURCHASE_STATUS.PROCESSING]: [PURCHASE_STATUS.DELIVERED, PURCHASE_STATUS.CANCELLED],
      [PURCHASE_STATUS.DELIVERED]: [PURCHASE_STATUS.RETURN_REQUESTED],
      [PURCHASE_STATUS.CANCELLED]: [PURCHASE_STATUS.REFUNDED],
      [PURCHASE_STATUS.RETURN_REQUESTED]: [
        PURCHASE_STATUS.RETURN_APPROVED,
        PURCHASE_STATUS.CANCELLED,
      ], // cancelled means return denied
      [PURCHASE_STATUS.RETURN_APPROVED]: [PURCHASE_STATUS.RETURNED],
      [PURCHASE_STATUS.RETURNED]: [PURCHASE_STATUS.REFUNDED],
      [PURCHASE_STATUS.REFUNDED]: [],
      [PURCHASE_STATUS.UNKNOWN]: [],
    };
  }

  /**
   * Validates if a transition from currentStatus to newStatus is allowed.
   */
  static validateTransition(
    transactionType: string,
    currentStatus: string,
    newStatus: string,
  ): boolean {
    if (currentStatus === newStatus) return true; // Idempotent

    let transitions: Record<string, string[]>;

    switch (transactionType) {
      case TRANSACTION_TYPES.PURCHASE:
        transitions = this.getPurchaseTransitions();
        break;
      default:
        logger.error(`Unknown transaction type in validation: ${transactionType}`);
        return false;
    }

    const allowed = transitions[currentStatus] || [];
    return allowed.includes(newStatus);
  }

  /**
   * Returns all allowed next states for a given status
   */
  static getAllowedTransitions(transactionType: string, currentStatus: string): string[] {
    switch (transactionType) {
      case TRANSACTION_TYPES.PURCHASE:
        return this.getPurchaseTransitions()[currentStatus] || [];
      default:
        return [];
    }
  }
}
