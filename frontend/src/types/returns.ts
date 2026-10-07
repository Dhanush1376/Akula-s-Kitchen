/**
 * Canonical Returns Domain Types
 */

export interface ReturnSettings {
  isReturnable: boolean;
  returnWindowDays: number;
  restockingFeePercentage: number;
  isExchangeable: boolean;
  exchangeWindowDays: number;
  requiresInspection: boolean;
}

export interface ReturnRequest {
  id: string;
  orderId: string;
  orderItemId: string;
  reason: string;
  status: 'REQUESTED' | 'APPROVED' | 'REJECTED' | 'COMPLETED';
  createdAt: string;
  updatedAt: string;
}
