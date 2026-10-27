import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { Request } from 'express';
import {
  isHostedDeployment,
  isLocalDevelopment,
  isLocalDevOrTest,
  isMisconfiguredHostedEnv,
} from '../../src/config/runtimeEnv';
import { skipRateLimit } from '../../src/middleware/rateLimiter';
import { resolveClientIp, clientIpResolver } from '../../src/middleware/clientIpResolver';

const fakeReq = (
  headers: Record<string, string>,
  ip = '10.25.3.4',
  url = '/api/v1/auth/verify-otp',
) => ({ headers, ip, originalUrl: url, url }) as unknown as Request;

describe('runtime environment guards', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.RENDER;
    delete process.env.RAILWAY_ENVIRONMENT;
    delete process.env.FLY_APP_NAME;
    delete process.env.K_SERVICE;
    delete process.env.TEST_RATE_LIMIT;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('treats NODE_ENV=development on Render as hosted, not local development', () => {
    process.env.NODE_ENV = 'development';
    process.env.RENDER = 'true';
    expect(isHostedDeployment()).toBe(true);
    expect(isLocalDevelopment()).toBe(false);
    expect(isLocalDevOrTest()).toBe(false);
    expect(isMisconfiguredHostedEnv()).toBe(true);
  });

  it('keeps local development relaxations on a developer machine', () => {
    process.env.NODE_ENV = 'development';
    expect(isLocalDevelopment()).toBe(true);
    expect(isMisconfiguredHostedEnv()).toBe(false);
  });

  it('does not skip auth rate limits on a hosted deployment running in development mode', () => {
    process.env.NODE_ENV = 'development';
    process.env.RENDER = 'true';
    expect(skipRateLimit(fakeReq({}))).toBe(false);
  });

  it('still skips rate limits for local development', () => {
    process.env.NODE_ENV = 'development';
    expect(skipRateLimit(fakeReq({}))).toBe(true);
  });
});

describe('client IP resolution behind the edge', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('prefers the Vercel-reported client address', () => {
    const req = fakeReq({
      'x-vercel-forwarded-for': '49.36.10.20',
      'x-forwarded-for': '49.36.10.20, 76.76.21.9, 10.25.3.4',
    });
    expect(resolveClientIp(req)).toBe('49.36.10.20');
  });

  it('uses the first public X-Forwarded-For entry, skipping private hops', () => {
    const req = fakeReq({ 'x-forwarded-for': '10.0.0.5, 103.21.44.7, 10.25.3.4' });
    expect(resolveClientIp(req)).toBe('103.21.44.7');
  });

  it('falls back to req.ip when no public address is reported', () => {
    expect(resolveClientIp(fakeReq({ 'x-forwarded-for': '10.0.0.5' }))).toBe('10.25.3.4');
    expect(resolveClientIp(fakeReq({ 'x-forwarded-for': 'garbage' }))).toBe('10.25.3.4');
  });

  it('gives two customers behind the same Render proxy different keys', () => {
    process.env.RENDER = 'true';
    const a = fakeReq({ 'x-forwarded-for': '49.36.10.20, 10.25.3.4' });
    const b = fakeReq({ 'x-forwarded-for': '157.48.2.9, 10.25.3.4' });
    clientIpResolver(a, {} as any, () => {});
    clientIpResolver(b, {} as any, () => {});
    expect(a.ip).toBe('49.36.10.20');
    expect(b.ip).toBe('157.48.2.9');
  });

  it('leaves req.ip untouched on a developer machine unless opted in', () => {
    delete process.env.RENDER;
    delete process.env.RESOLVE_EDGE_CLIENT_IP;
    const req = fakeReq({ 'x-forwarded-for': '49.36.10.20' }, '127.0.0.1');
    clientIpResolver(req, {} as any, () => {});
    expect(req.ip).toBe('127.0.0.1');
  });
});
