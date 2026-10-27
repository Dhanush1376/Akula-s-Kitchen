import mongoose, { Schema, Document } from 'mongoose';

/**
 * Durable fallback for the "password step passed, awaiting 2FA" marker when Redis is
 * unavailable. Without it, the marker could not be checked and the 2FA endpoints had
 * to either lock admins out or trust any userId.
 */
export interface ITwoFactorPending extends Document {
  userId: string;
  expiresAt: Date;
}

const TwoFactorPendingSchema: Schema = new Schema(
  {
    userId: { type: String, required: true, unique: true, index: true },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true },
);

TwoFactorPendingSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const TwoFactorPending = mongoose.model<ITwoFactorPending>(
  'TwoFactorPending',
  TwoFactorPendingSchema,
  'twofactorpendings',
);
export default TwoFactorPending;
