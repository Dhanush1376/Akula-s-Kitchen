import mongoose from 'mongoose';
import { ISoftDeleted } from '../utils/SoftDeletePlugin';

export interface ISelectedOptionSnapshot {
  groupId: string;
  groupName: string;
  optionId: string;
  optionLabel: string;
  priceAdjustment: number;
}

export interface IUser extends ISoftDeleted {
  id: string;
  name: string;
  email: string;
  phone?: string;
  phoneVerified?: boolean;
  emailVerified?: boolean;
  role:
    | 'user'
    | 'customer'
    | 'owner'
    | 'super_admin'
    | 'main_admin'
    | 'moderator'
    | 'support_admin'
    | 'support'
    | 'order_manager'
    | 'content_manager'
    | 'admin'
    | 'manager'
    | 'coordinator';
  avatar?: string;
  providers: ('otp' | 'google')[];
  googleId?: string;
  gender?: string;
  dateOfBirth?: string;
  wishlist: mongoose.Types.ObjectId[];

  cart: Array<{
    product: mongoose.Types.ObjectId;
    quantity: number;
    variant?: string;
    customizationNote?: string;
    selectedOptions?: ISelectedOptionSnapshot[];
    configurationSignature?: string;
    configuredUnitPrice?: number;
  }>;
  recentlyViewed?: Array<{
    product: mongoose.Types.ObjectId;
    viewedAt: Date;
  }>;
  notificationPreferences?: {
    email: boolean;
    sms: boolean;
    whatsapp: boolean;
    inApp: boolean;
    push: boolean;
    categories: {
      orderUpdates: boolean;
      promotions: boolean;
      security: boolean;
      newsletter: boolean;
    };
  };
  accountPreferences?: {
    theme: string;
    language: string;
  };
  isVerified: boolean;
  lastLogin?: Date;
  passwordHash?: string;
  passwordChangedAt?: Date;
  twoFactorEnabled?: boolean;
  twoFactorSecret?: string;
  failedLoginAttempts?: number;
  isLocked?: boolean;
  lockUntil?: Date;
  walletBalance?: number;
  rewardCoins: number;
  loyaltyTier: 'Bronze' | 'Silver' | 'Gold' | 'Platinum';
  referralCode?: string;
  referredBy?: mongoose.Types.ObjectId;
  referralsCount: number;
  referralRewarded?: boolean;
  createdAt: Date;
  updatedAt: Date;
}
