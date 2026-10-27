import redisClient from '../cache/redis';
import TwoFactorPending from '../../models/TwoFactorPending';

const keyFor = (userId: string) => `2fa:pending:${userId}`;
const TTL_SECONDS = 300;

const readyRedis = () => (redisClient && redisClient.isReady ? redisClient : null);

// Redis is preferred; MongoDB (TTL collection) is the fallback. Neither path ever
// treats a missing marker as present: the 2FA endpoints are unauthenticated and rely
// on this marker to prove the password step was completed.

export const setTwoFactorPending = async (userId: string): Promise<void> => {
  if (typeof userId !== 'string' || !userId) return;
  const redis = readyRedis();
  if (redis) {
    await redis.set(keyFor(userId), '1', { EX: TTL_SECONDS });
    return;
  }
  await TwoFactorPending.findOneAndUpdate(
    { userId },
    { $set: { expiresAt: new Date(Date.now() + TTL_SECONDS * 1000) } },
    { upsert: true },
  );
};

export const consumeTwoFactorPending = async (userId: string): Promise<boolean> => {
  if (typeof userId !== 'string' || !userId) return false;
  const redis = readyRedis();
  if (redis) {
    const removed = await redis.del(keyFor(userId));
    return removed === 1;
  }
  const removed = await TwoFactorPending.findOneAndDelete({
    userId,
    expiresAt: { $gt: new Date() },
  });
  return Boolean(removed);
};

export const hasTwoFactorPending = async (userId: string): Promise<boolean> => {
  if (typeof userId !== 'string' || !userId) return false;
  const redis = readyRedis();
  if (redis) {
    const val = await redis.get(keyFor(userId));
    return val === '1';
  }
  const pending = await TwoFactorPending.exists({ userId, expiresAt: { $gt: new Date() } });
  return Boolean(pending);
};
