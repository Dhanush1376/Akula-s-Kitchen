import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import RefreshToken from '../models/RefreshToken';
import UsedRefreshToken from '../models/UsedRefreshToken';
import User from '../models/User';
import { IUser } from '../types/user';
import ApiError from '../utils/ApiError';
import logger from '../config/logger';

class SessionAuthService {
  static generateAccessToken(user: IUser) {
    return jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET!, {
      expiresIn: (process.env.JWT_EXPIRES_IN || '15m') as any,
    });
  }

  static hashRefreshToken(token: string) {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  static getRefreshTokenTtlMs() {
    const days = Number(process.env.REFRESH_TOKEN_EXPIRES_DAYS || 30);
    return Math.max(1, days) * 24 * 60 * 60 * 1000;
  }

  static async createSession(user: IUser, userAgent: string = '', familyId?: string) {
    const accessToken = this.generateAccessToken(user);
    const refreshToken = crypto.randomBytes(48).toString('base64url');
    const tokenHash = this.hashRefreshToken(refreshToken);
    const expiresAt = new Date(Date.now() + this.getRefreshTokenTtlMs());

    // Create a new session document (supports multiple sessions per user)
    await RefreshToken.create({
      userId: user._id,
      tokenHash,
      expiresAt,
      userAgent,
      familyId: familyId || crypto.randomUUID(),
    });

    // Enforce a maximum of 10 active sessions per user (evict oldest). Runs off the
    // response path: a transient 11th session is harmless and saves 1-3 DB round trips.
    this.pruneExcessSessions(user._id).catch((err) =>
      logger.warn('[SessionAuthService] Session pruning failed', { error: err?.message }),
    );

    return { user, token: accessToken, accessToken, refreshToken };
  }

  /**
   * Deletes only sessions strictly older than the Nth-newest one. Idempotent under
   * concurrent logins: overlapping runs can never evict a newer session.
   */
  static async pruneExcessSessions(userId: IUser['_id'], maxSessions = 10) {
    const boundary = await RefreshToken.find({ userId })
      .sort({ createdAt: -1 })
      .skip(maxSessions - 1)
      .limit(1)
      .select('createdAt')
      .lean();
    const cutoff = (boundary[0] as { createdAt?: Date } | undefined)?.createdAt;
    if (cutoff) {
      await RefreshToken.deleteMany({ userId, createdAt: { $lt: cutoff } });
    }
  }

  static async refreshSession(refreshToken: string, userAgent: string = '') {
    if (!refreshToken) {
      throw new ApiError(401, 'Refresh session is missing');
    }

    const tokenHash = this.hashRefreshToken(refreshToken);

    // 1. Detect if this token was already used (Replay attack detection).
    // The live-session lookup is independent, so fetch both in one round trip.
    const [isUsed, session] = await Promise.all([
      UsedRefreshToken.findOne({ tokenHash }),
      RefreshToken.findOne({ tokenHash, expiresAt: { $gt: new Date() } }),
    ]);
    if (isUsed) {
      const usedDate = isUsed.createdAt ? new Date(isUsed.createdAt) : null;
      const timeSinceUsedMs =
        usedDate && !isNaN(usedDate.getTime()) ? Date.now() - usedDate.getTime() : 0;
      // Generous 120-second grace period allows page reloads, multiple tabs, and React StrictMode to safely succeed
      const GRACE_PERIOD_MS = 120000;

      if (timeSinceUsedMs < GRACE_PERIOD_MS) {
        logger.warn(
          `[AUTH] Grace period overlap (${Math.round(timeSinceUsedMs / 1000)}s) detected for userId: ${isUsed.userId}. Servicing concurrent request safely via 409 retry.`,
        );
        throw new ApiError(409, 'Session refreshed concurrently in another tab.');
      }

      // Replay detected outside grace period: revoke the rotation chain this token
      // belongs to (the device it was issued to, or whoever stole it). Other devices
      // keep their sessions, so one lost mobile response no longer logs a customer
      // out everywhere. Legacy tokens issued before families existed fall back to
      // revoking every session.
      logger.warn(
        `[AUTH] Stale refresh token used for userId: ${isUsed.userId} outside grace period (${Math.round(timeSinceUsedMs / 1000)}s).`,
      );
      if (isUsed.familyId) {
        await RefreshToken.deleteMany({ userId: isUsed.userId, familyId: isUsed.familyId });
      } else {
        await this.revokeAllSessions(isUsed.userId.toString());
      }
      throw new ApiError(401, 'Session expired. Please log in again.');
    }

    // 2. The session must exist in the RefreshToken collection
    if (!session) {
      logger.warn('[AUTH] Refresh session not found or expired');
      throw new ApiError(401, 'Refresh session is invalid or expired');
    }

    // 3. Verify the user exists and is active
    const user = await User.findOne({ _id: session.userId, isVerified: true });
    if (!user) {
      await RefreshToken.deleteOne({ _id: session._id });
      throw new ApiError(401, 'User account not found or not verified');
    }

    // Legacy sessions (created before token families) start a family on rotation.
    const familyId = session.familyId || String(session._id);

    // 4. Record old refresh token as spent/used (for replay detection)
    try {
      await UsedRefreshToken.create({
        tokenHash,
        userId: user._id,
        expiresAt: session.expiresAt,
        userAgent: session.userAgent || userAgent,
        familyId,
      });
    } catch (err: any) {
      if (err.name === 'MongoServerError' && err.code === 11000) {
        throw new ApiError(401, 'Session expired or refresh conflict. Please log in again.');
      }
      throw err;
    }

    // 5. Delete the old session document
    await RefreshToken.deleteOne({ _id: session._id });

    // 6. Create a fresh session (generates new access & rotated refresh token)
    return this.createSession(user, userAgent || session.userAgent || '', familyId);
  }

  static async revokeSession(refreshToken?: string) {
    if (!refreshToken) return;
    const tokenHash = this.hashRefreshToken(refreshToken);
    // Only delete the specific session document
    await RefreshToken.deleteOne({ tokenHash });
  }

  static async revokeAllSessions(userId: string) {
    await RefreshToken.deleteMany({ userId }, { bypassDestructionGuard: true } as any);
    await UsedRefreshToken.deleteMany({ userId }, { bypassDestructionGuard: true } as any);
  }
}

export default SessionAuthService;
