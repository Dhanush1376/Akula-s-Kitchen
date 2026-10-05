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

/** Atomic siriCoins credit. */
export const creditSiriCoins = async (
  userId: mongoose.Types.ObjectId | string,
  amount: number,
  session?: ClientSession,
) => {
  if (amount <= 0) return User.findById(userId).session(session || null);
  return User.findByIdAndUpdate(
    userId,
    { $inc: { siriCoins: amount } },
    { returnDocument: 'after', session },
  );
};

/** Atomic siriCoins debit — throws if balance would go negative. */
export const debitSiriCoins = async (
  userId: mongoose.Types.ObjectId | string,
  amount: number,
  session?: ClientSession,
) => {
  if (amount <= 0) return User.findById(userId).session(session || null);
  const updated = await User.findOneAndUpdate(
    { _id: userId, siriCoins: { $gte: amount } },
    { $inc: { siriCoins: -amount } },
    { returnDocument: 'after', session },
  );
  if (!updated) {
    throw new ApiError(400, 'Insufficient reward coins balance');
  }
  return updated;
};
