import './setup';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { HealthController } from '../../src/controllers/system/healthController';

const call = async () => {
  const res: any = { statusCode: 0, body: null };
  res.status = (c: number) => ((res.statusCode = c), res);
  res.json = (b: any) => ((res.body = b), res);
  await HealthController.readiness({} as any, res);
  return res;
};

describe('Readiness reflects required dependencies', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('is ready with MongoDB alone when Redis is optional', async () => {
    delete process.env.REQUIRE_REDIS;
    const res = await call();
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('ready');
    expect(res.body.redisRequired).toBe(false);
    expect(res.body.checks.mongodb.status).toBe('connected');
  });

  it('is NOT ready when Redis is required but unavailable', async () => {
    process.env.REQUIRE_REDIS = 'true';
    const res = await call();
    expect(res.statusCode).toBe(503);
    expect(res.body.status).toBe('not_ready');
    expect(res.body.redisRequired).toBe(true);
    expect(res.body.checks.redis.status).not.toBe('connected');
  });
});
