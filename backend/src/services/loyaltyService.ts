import mongoose from 'mongoose';
import User from '../models/User';
import Order from '../models/Order';
import ApiError from '../utils/ApiError';
import logger from '../config/logger';
import { saveUniqueReferralCode } from '../utils/referralCode';
import storeSettingsService from './StoreSettingsService';

export class LoyaltyService {
  /**
   * Computes all loyalty dashboard metrics including aggregations
   */
  static async getDashboardData(userId: string, _skip: number = 0, _limit: number = 20) {
    const user = await User.findById(userId).lean();
    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    if (!user.referralCode) {
      user.referralCode = await saveUniqueReferralCode(user._id, user.name);
    }

    const spendAggregation = await Order.aggregate([
      { $match: { user: user._id, orderStatus: { $nin: ['Cancelled', 'Refunded'] } } },
      { $group: { _id: null, totalSpend: { $sum: '$total' } } },
    ]);
    const lifetimeSpend = spendAggregation[0]?.totalSpend || 0;

    const settings = await storeSettingsService.getSettings();
    const loyaltyTiers = settings.loyalty.tiers || [];
    const currentTierIndex = loyaltyTiers.findIndex((t: any) => t.name === user.loyaltyTier);
    const nextTierObj = loyaltyTiers[currentTierIndex + 1];

    let nextTier: string;
    let spendRequired: number;
    let progressPercentage: number;

    if (nextTierObj) {
      nextTier = nextTierObj.name;
      spendRequired = Math.max(0, nextTierObj.minSpend - lifetimeSpend);
      const currentTierSpend = currentTierIndex >= 0 ? loyaltyTiers[currentTierIndex].minSpend : 0;
      const tierRange = nextTierObj.minSpend - currentTierSpend;
      const currentProgress = lifetimeSpend - currentTierSpend;
      progressPercentage =
        tierRange > 0
          ? Math.max(0, Math.min(100, Math.round((currentProgress / tierRange) * 100)))
          : 100;
    } else {
      nextTier = 'None (Max Tier reached)';
      spendRequired = 0;
      progressPercentage = 100;
    }

    return {
      walletBalance: 0,
      rewardCoins: user.rewardCoins || 0,
      loyaltyTier: user.loyaltyTier || settings.loyalty.tiers?.[0]?.name || 'Bronze',
      referralCode: user.referralCode,
      referralsCount: user.referralsCount || 0,
      lifetimeSpend,
      nextTier,
      spendRequired,
      progressPercentage,
      transactions: [],
      totalTransactions: 0,
      coupons: [],
    };
  }
  /**
   * Welcomes a newly registered user with onboarding credits and generates their referral code
   */
  static async setupNewUserRewards(userId: string, _retryCount = 0): Promise<void> {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const user = await User.findById(userId).session(session);
      if (!user) {
        await session.abortTransaction();
        return;
      }

      const settings = await storeSettingsService.getSettings();

      const setFields: Record<string, string> = {};
      if (!user.referralCode) {
        setFields.referralCode = await saveUniqueReferralCode(user._id, user.name, session);
      }
      if (!user.loyaltyTier) {
        setFields.loyaltyTier = settings.loyalty.tiers?.[0]?.name || 'Bronze';
      }
      if (Object.keys(setFields).length > 0) {
        await User.findByIdAndUpdate(userId, { $set: setFields }, { session });
      }

      await session.commitTransaction();
      logger.info(`Loyalty Welcome Setup successful for user: ${userId}`);
    } catch (err: any) {
      await session.abortTransaction();
      logger.error('Failed to setup welcome onboarding rewards:', err);
    } finally {
      session.endSession();
    }
  }

  /**
   * Apply a referral code at signup — wallet credit and ledger row in one transaction.
   */
  static async applyReferralCode(userId: string, referralCode: string) {
    const user = await User.findById(userId).lean();
    if (!user) throw new ApiError(404, 'User session not found');
    if (user.referredBy) throw new ApiError(400, 'You have already applied a referral code');

    const cleanCode = referralCode.trim().toUpperCase();
    if (user.referralCode === cleanCode) {
      throw new ApiError(400, "Self-referral is forbidden. Please enter a friend's referral code.");
    }

    const referrer = await User.findOne({ referralCode: cleanCode }).lean();
    if (!referrer) {
      throw new ApiError(404, 'Invalid referral code. Please check and try again.');
    }

    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const settings = await storeSettingsService.getSettings();

      if (!settings.loyalty.referralProgramEnabled) {
        throw new ApiError(400, 'Referral program is currently disabled');
      }

      await User.findByIdAndUpdate(userId, { $set: { referredBy: referrer._id } }, { session });

      await session.commitTransaction();
      return { referredBy: referrer.name };
    } catch (err) {
      await session.abortTransaction();
      throw err;
    } finally {
      session.endSession();
    }
  }

  /**
   * Process and apply purchase rewards (Cashback, reward coins, Tier upgrades) upon checkout completion
   * Strictly guarded against multiple executions and uncontrolled wallet payouts.
   */
  static async processPurchaseRewards(userId: string, orderId: string, _totalSpend?: number) {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const user = await User.findById(userId).session(session);
      const order = await Order.findById(orderId).session(session);
      if (!user || !order) {
        await session.abortTransaction();
        session.endSession();
        return;
      }

      // 0. Strict Idempotency: Has this order already been rewarded?
      if (order.rewardsProcessed) {
        logger.info(`[LOYALTY] Purchase rewards already processed for order ${orderId}, skipping.`);
        await session.abortTransaction();
        session.endSession();
        return;
      }

      const settings = await storeSettingsService.getSettings();

      // 1. Calculate reward coins earned (reward points, NOT cash currency)
      const coinsPerRupee = Number(settings.loyalty?.coinsPerRupee) || 0;
      const coinsEarned = coinsPerRupee > 0 ? Math.round(order.subtotal * coinsPerRupee) : 0;

      // Atomically update User rewards (reward coins only)
      if (coinsEarned > 0) {
        await User.findByIdAndUpdate(userId, { $inc: { rewardCoins: coinsEarned } }, { session });
      }

      // 2. Update Order Document for idempotency tracking
      order.coinsEarned = coinsEarned;
      order.cashbackEarned = 0;
      order.rewardsProcessed = true;
      await order.save({ session });

      await session.commitTransaction();

      // 3. Evaluate Membership Tier Upgrades based on Lifetime Valid Purchases
      await this.evaluateTierUpgrades(userId);
    } catch (err) {
      await session.abortTransaction();
      logger.error(`Failed to process purchase rewards for order ${orderId}:`, err);
    } finally {
      session.endSession();
    }
  }

  /**
   * Applies referral bonus to referrer on referee's first purchase completion.
   * Strictly idempotent and single-use per referee.
   */
  static async applyReferralBonus(_referrerId: string, _refereeId: string) {
    // Wallet referral bonus has been retired
    return;
  }

  /**
   * Evaluates user's cumulative spent or orders to unlock next Loyalty Tier status
   */
  static async evaluateTierUpgrades(userId: string) {
    try {
      const user = await User.findById(userId).lean();
      if (!user) return;

      // Calculate lifetime purchase spend (excluding cancelled/refunded orders) via DB Aggregation
      const result = await Order.aggregate([
        {
          $match: {
            user: new mongoose.Types.ObjectId(userId),
            orderStatus: { $nin: ['Cancelled', 'Refunded'] },
          },
        },
        { $group: { _id: null, lifetimeSpend: { $sum: '$total' } } },
      ]);
      const lifetimeSpend = result[0]?.lifetimeSpend || 0;

      const settings = await storeSettingsService.getSettings();
      const { getTierBySpend } = require('../constants/loyaltyTiers');
      const newTier = getTierBySpend(lifetimeSpend, settings.loyalty.tiers);

      if (user.loyaltyTier !== newTier) {
        const oldTier = user.loyaltyTier;
        await User.findByIdAndUpdate(userId, { loyaltyTier: newTier });
        logger.info(
          `User ${userId} upgraded loyalty membership tier from ${oldTier} to ${newTier}!`,
        );
      }
    } catch (err) {
      logger.error(`Failed to evaluate tier upgrades for user ${userId}:`, err);
    }
  }

  /**
   * Process rating and review submission credits instantly
   */
  static async processReviewRewards(
    userId: string,
    _rating: number,
    _hasPhoto: boolean,
    _hasVideo: boolean,
    _reviewId: string,
  ) {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const user = await User.findById(userId).session(session);
      if (!user) {
        await session.abortTransaction();
        session.endSession();
        return { alreadyRewarded: false, rewardIssued: false };
      }

      const settings = await storeSettingsService.getSettings();

      if (!settings.loyalty.reviewRewardsEnabled) {
        await session.abortTransaction();
        session.endSession();
        return { alreadyRewarded: false, rewardIssued: false };
      }

      if (settings.loyalty.reviewCoinsBonus && settings.loyalty.reviewCoinsBonus > 0) {
        await User.findByIdAndUpdate(
          userId,
          { $inc: { rewardCoins: settings.loyalty.reviewCoinsBonus } },
          { session },
        );
      }

      await session.commitTransaction();
      logger.info(`Instantly rewarded user ${userId} with review coins.`);
      return { alreadyRewarded: false, rewardIssued: true, amount: 0 };
    } catch (err: any) {
      await session.abortTransaction();
      logger.error('Failed to reward review writing:', err);
      throw err;
    } finally {
      session.endSession();
    }
  }

  /**
   * Reverse reward coins if order is cancelled or refunded
   */
  static async reversePurchaseRewards(orderId: string, providedSession?: mongoose.ClientSession) {
    const session = providedSession || (await mongoose.startSession());
    if (!providedSession) session.startTransaction();
    try {
      const order = await Order.findById(orderId).session(session);
      if (!order) {
        await session.abortTransaction();
        session.endSession();
        return;
      }

      const user = await User.findById(order.user).session(session);
      if (!user) {
        await session.abortTransaction();
        session.endSession();
        return;
      }

      // Revoke earned reward coins
      if (order.coinsEarned && order.coinsEarned > 0) {
        await User.findByIdAndUpdate(
          user._id,
          [
            {
              $set: {
                rewardCoins: {
                  $max: [0, { $subtract: [{ $ifNull: ['$rewardCoins', 0] }, order.coinsEarned] }],
                },
              },
            },
          ],
          { session },
        );
      }

      order.cashbackEarned = 0;
      order.coinsEarned = 0;
      await order.save({ session });

      if (!providedSession) await session.commitTransaction();
      logger.info(`Successfully reversed earned rewards for order ${orderId}`);
    } catch (err) {
      if (!providedSession) await session.abortTransaction();
      logger.error(`Failed to reverse rewards for order ${orderId}:`, err);
      if (providedSession) throw err;
    } finally {
      if (!providedSession) session.endSession();
    }
  }

  /**
   * Admin manual adjustment of a user's wallet balance (Deprecated / Retired)
   */
  static async adjustWalletBalance(
    _adminId: string,
    _userId: string,
    _type: 'credit' | 'debit',
    _amount: number,
    _description: string,
    _ipAddress?: string,
  ) {
    throw new ApiError(400, 'Wallet feature has been retired');
  }
}
