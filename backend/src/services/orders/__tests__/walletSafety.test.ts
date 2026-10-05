import { describe, it, expect, vi, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { OrderRollbackService } from '../OrderRollbackService';
import * as walletMutations from '../../../utils/payment/walletMutations';

describe('Wallet Safety & Deprecation', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('OrderRollbackService.rollbackWallet', () => {
    it('is a safe no-op and never calls creditWalletBalance', async () => {
      const creditSpy = vi
        .spyOn(walletMutations, 'creditWalletBalance')
        .mockResolvedValue({} as any);
      const session = {} as mongoose.ClientSession;

      await OrderRollbackService.rollbackWallet(
        { _id: new mongoose.Types.ObjectId(), walletDeduction: 500 },
        session,
      );
      expect(creditSpy).not.toHaveBeenCalled();
    });
  });
});
