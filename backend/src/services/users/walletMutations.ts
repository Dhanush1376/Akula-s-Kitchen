import mongoose, { ClientSession } from 'mongoose';
import User from '../../models/User';
import ApiError from '../../utils/ApiError';

/** @deprecated Wallet feature has been retired. */
export const debitWalletBalance = async (
  _userId: mongoose.Types.ObjectId | string,
  _amount: number,
  _session?: ClientSession,
) => {
  return null;
};

/** @deprecated Wallet feature has been retired. */
export const creditWalletBalance = async (
  _userId: mongoose.Types.ObjectId | string,
  _amount: number,
  _session?: ClientSession,
) => {
  return null;
};

/** Atomic rewardCoins credit. */
export const creditRewardCoins = async (
  userId: mongoose.Types.ObjectId | string,
  amount: number,
  session?: ClientSession,
) => {
  if (amount <= 0) return User.findById(userId).session(session || null);
  return User.findByIdAndUpdate(
    userId,
    { $inc: { rewardCoins: amount } },
    { returnDocument: 'after', session },
  );
};

/** Atomic rewardCoins debit — throws if balance would go negative. */
export const debitRewardCoins = async (
  userId: mongoose.Types.ObjectId | string,
  amount: number,
  session?: ClientSession,
) => {
  if (amount <= 0) return User.findById(userId).session(session || null);
  const updated = await User.findOneAndUpdate(
    { _id: userId, rewardCoins: { $gte: amount } },
    { $inc: { rewardCoins: -amount } },
    { returnDocument: 'after', session },
  );
  if (!updated) {
    throw new ApiError(400, 'Insufficient reward coins balance');
  }
  return updated;
};
