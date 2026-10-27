import '../setup';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import User from '../../../src/models/User';
import Order from '../../../src/models/Order';
import {
  getOrderTimeline,
  getOrderPublicTrack,
} from '../../../src/controllers/commerce/orderController';
import {
  setTwoFactorPending,
  hasTwoFactorPending,
  consumeTwoFactorPending,
} from '../../../src/utils/security/twoFactorPending';
import { requireMetricsKey } from '../../../src/middleware/metricsAuth';

const makeRes = () => {
  const res: any = { statusCode: 200, body: null };
  res.status = (code: number) => {
    res.statusCode = code;
    return res;
  };
  res.json = (payload: any) => {
    res.body = payload;
    return res;
  };
  return res;
};

/** Runs an asyncHandler-wrapped controller and resolves with the error passed to next, if any. */
const run = (handler: any, req: any): Promise<{ res: any; err: any }> =>
  new Promise((resolve) => {
    const res = makeRes();
    const origJson = res.json;
    res.json = (payload: any) => {
      origJson(payload);
      resolve({ res, err: null });
      return res;
    };
    handler(req, res, (err?: any) => resolve({ res, err }));
  });

const seedUser = (role = 'user') =>
  User.create({
    name: `${role} user`,
    email: `${role}_${Date.now()}_${Math.random().toString(36).slice(2)}@example.com`,
    password: 'password_hash_placeholder',
    role,
    isVerified: true,
  } as any);

const seedOrder = (userId: unknown) =>
  Order.create({
    orderNumber: `ORD-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    user: userId,
    items: [
      {
        title: 'Avakaya Pickle (250 g)',
        price: 300,
        quantity: 1,
        imageSrc: 'https://res.cloudinary.com/demo/image/upload/pickle.webp',
      },
    ],
    shippingAddress: {
      name: 'Customer A',
      phone: '9876543210',
      email: 'a@example.com',
      pincode: '500001',
      locality: 'Banjara Hills',
      address: '123 Main St',
      city: 'Hyderabad',
      state: 'Telangana',
      country: 'India',
    },
    paymentMethod: 'razorpay',
    paymentStatus: 'paid',
    orderStatus: 'Confirmed',
    subtotal: 300,
    total: 300,
  } as any);

describe('Launch hardening: order read authorization', () => {
  let owner: any;
  let other: any;
  let staff: any;
  let order: any;

  beforeEach(async () => {
    owner = await seedUser();
    other = await seedUser();
    staff = await seedUser('admin');
    order = await seedOrder(owner._id);
  });

  const as = (user: any) => ({ id: user._id.toString(), role: user.role });

  it('blocks another customer from reading an order timeline', async () => {
    const { err } = await run(getOrderTimeline, {
      params: { id: order._id.toString() },
      user: as(other),
    });
    expect(err?.statusCode).toBe(403);
  });

  it('lets the owner and staff read the order timeline', async () => {
    for (const user of [owner, staff]) {
      const { err, res } = await run(getOrderTimeline, {
        params: { id: order._id.toString() },
        user: as(user),
      });
      expect(err).toBeFalsy();
      expect(res.body?.success).toBe(true);
    }
  });

  it('blocks another signed-in customer from public-track without a token', async () => {
    const { err } = await run(getOrderPublicTrack, {
      params: { id: order._id.toString() },
      query: {},
      user: as(other),
    });
    expect(err?.statusCode).toBe(403);
  });

  it('still lets the owner track their order without a token', async () => {
    const { err, res } = await run(getOrderPublicTrack, {
      params: { id: order._id.toString() },
      query: {},
      user: as(owner),
    });
    expect(err).toBeFalsy();
    expect(res.body?.data?.orderStatus).toBe('Confirmed');
  });
});

describe('Launch hardening: 2FA pending marker without Redis', () => {
  it('never reports a pending 2FA login that was not started', async () => {
    expect(await hasTwoFactorPending('64b7f0c2a1b2c3d4e5f60718')).toBe(false);
    expect(await consumeTwoFactorPending('64b7f0c2a1b2c3d4e5f60718')).toBe(false);
  });

  it('rejects non-string user ids (operator injection)', async () => {
    await setTwoFactorPending('64b7f0c2a1b2c3d4e5f60719');
    expect(await hasTwoFactorPending({ $ne: null } as any)).toBe(false);
    expect(await consumeTwoFactorPending({ $gt: '' } as any)).toBe(false);
  });

  it('records the marker after the password step and consumes it exactly once', async () => {
    const userId = '64b7f0c2a1b2c3d4e5f6071a';
    await setTwoFactorPending(userId);
    expect(await hasTwoFactorPending(userId)).toBe(true);
    expect(await consumeTwoFactorPending(userId)).toBe(true);
    expect(await consumeTwoFactorPending(userId)).toBe(false);
    expect(await hasTwoFactorPending(userId)).toBe(false);
  });
});

describe('Launch hardening: metrics endpoints', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.METRICS_API_KEY;
    delete process.env.RENDER;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  const call = (headers: Record<string, string> = {}) => {
    const res = makeRes();
    const next = vi.fn();
    requireMetricsKey({ headers } as any, res, next);
    return { res, next };
  };

  it('fails closed on a hosted deploy with no key configured', () => {
    process.env.NODE_ENV = 'development';
    process.env.RENDER = 'true';
    const { res, next } = call();
    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(404);
  });

  it('requires the configured key', () => {
    process.env.NODE_ENV = 'production';
    process.env.METRICS_API_KEY = 'k'.repeat(40);
    expect(call({ 'x-metrics-api-key': 'wrong' }).res.statusCode).toBe(403);
    expect(call({ 'x-metrics-api-key': 'k'.repeat(40) }).next).toHaveBeenCalled();
  });

  it('stays open on a local developer machine without a key', () => {
    process.env.NODE_ENV = 'development';
    expect(call().next).toHaveBeenCalled();
  });
});

describe('Launch hardening: refresh token never reaches JS when cookies work', () => {
  it('omits the token for browsers that sent our cookies', async () => {
    const { refreshTokenForResponseBody } = await import('../../../src/utils/security/authCookies');
    const withCookie = { cookies: { akula_csrf: 'x' } } as any;
    const securePrefixed = { cookies: { '__Secure-akula_csrf': 'x' } } as any;
    const cookieless = { cookies: {} } as any;

    expect(refreshTokenForResponseBody(withCookie, 'rt')).toBeUndefined();
    expect(refreshTokenForResponseBody(securePrefixed, 'rt')).toBeUndefined();
    expect(refreshTokenForResponseBody(cookieless, 'rt')).toBe('rt');
    // Refresh endpoint: decided by whether the cookie carried the refresh token.
    expect(refreshTokenForResponseBody(withCookie, 'rt', false)).toBe('rt');
    expect(refreshTokenForResponseBody(cookieless, 'rt', true)).toBeUndefined();
  });
});
