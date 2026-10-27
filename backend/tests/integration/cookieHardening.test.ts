import './setup';
import { describe, it, expect, vi, afterEach } from 'vitest';
import SessionAuthService from '../../src/services/SessionAuthService';
import RefreshToken from '../../src/models/RefreshToken';
import User from '../../src/models/User';
import { logout } from '../../src/controllers/auth/authController';
import { ALL_REFRESH_COOKIE_NAMES } from '../../src/utils/security/authCookies';

const seedUser = () =>
  User.create({
    name: 'Cookie User',
    email: `cookie_${Date.now()}_${Math.random().toString(36).slice(2)}@example.com`,
    password: 'hashed_placeholder_value',
    isVerified: true,
  } as any);

const run = (handler: any, req: any) =>
  new Promise<{ res: any; err: any }>((resolve) => {
    const res: any = {
      statusCode: 200,
      headers: {} as Record<string, string>,
      cleared: [] as string[],
      status(c: number) {
        res.statusCode = c;
        return res;
      },
      setHeader(k: string, v: string) {
        res.headers[k] = v;
      },
      clearCookie(name: string) {
        res.cleared.push(name);
      },
      cookie: vi.fn(),
      json(body: any) {
        res.body = body;
        resolve({ res, err: null });
        return res;
      },
    };
    handler(req, res, (err?: any) => resolve({ res, err }));
  });

describe('Cookie hardening on hosted deployments', () => {
  const originalEnv = process.env;

  afterEach(() => {
    process.env = originalEnv;
    vi.resetModules();
  });

  it('uses __Secure- names and Secure cookies on Render even if NODE_ENV is not production', async () => {
    process.env = { ...originalEnv, NODE_ENV: 'development', RENDER: 'true' };
    vi.resetModules();
    const cfg = await import('../../src/config/cookieConfig');
    expect(cfg.getAuthCookieName('akula_refresh_token')).toBe('__Secure-akula_refresh_token');
    expect(cfg.getCsrfCookieName()).toBe('__Secure-akula_csrf');
    const opts = cfg.getAuthCookieOptions(1000);
    expect(opts.secure).toBe(true);
    expect(opts.httpOnly).toBe(true);
  });

  it('keeps plain, non-Secure cookies on a developer machine', async () => {
    process.env = { ...originalEnv, NODE_ENV: 'development' };
    delete process.env.RENDER;
    vi.resetModules();
    const cfg = await import('../../src/config/cookieConfig');
    expect(cfg.getAuthCookieName('akula_refresh_token')).toBe('akula_refresh_token');
    expect(cfg.getAuthCookieOptions(1000).secure).toBe(false);
  });
});

describe('Logout across cookie naming styles', () => {
  it('revokes sessions held under both plain and __Secure- names and clears every refresh cookie', async () => {
    const user = await seedUser();
    const legacy = await SessionAuthService.createSession(user as any, 'legacy-cookie');
    const current = await SessionAuthService.createSession(user as any, 'current-cookie');
    expect(await RefreshToken.countDocuments({ userId: user._id })).toBe(2);

    const { res, err } = await run(logout, {
      cookies: {
        akula_refresh_token: legacy.refreshToken,
        '__Secure-akula_refresh_token': current.refreshToken,
      },
      body: {},
      headers: {},
    });

    expect(err).toBeFalsy();
    expect(res.statusCode).toBe(200);
    expect(await RefreshToken.countDocuments({ userId: user._id })).toBe(0);
    for (const name of ALL_REFRESH_COOKIE_NAMES) expect(res.cleared).toContain(name);

    // The legacy token can no longer restore a session.
    await expect(SessionAuthService.refreshSession(legacy.refreshToken)).rejects.toMatchObject({
      statusCode: 401,
    });
  });

  it('also revokes a body token from cookie-less clients', async () => {
    const user = await seedUser();
    const s = await SessionAuthService.createSession(user as any);
    await run(logout, { cookies: {}, body: { refreshToken: s.refreshToken }, headers: {} });
    expect(await RefreshToken.countDocuments({ userId: user._id })).toBe(0);
  });
});
