import { describe, it, expect } from 'vitest';
import Transport from 'winston-transport';
import logger from '../../src/config/logger';

// Regression: an old log contained a full AI provider API key, logged from the request
// body of POST /api/v1/ai/providers. Every logged line must have credentials masked.
class Capture extends Transport {
  lines: any[] = [];
  log(info: any, next: () => void) {
    this.lines.push(info);
    next();
  }
}

describe('Log redaction', () => {
  it('masks credentials inside logged request bodies', async () => {
    const capture = new Capture({ level: 'debug' });
    logger.add(capture);
    try {
      logger.warn('[API Inbound] POST /api/v1/ai/providers', {
        body: {
          apiKey: 'gsk_live_example_key_value_1234567890',
          name: 'Groq',
          nested: {
            client_secret: 'abc123secretvalue',
            refreshToken: 'r'.repeat(40),
            otp: '123456',
          },
        },
        headers: { authorization: 'Bearer abc.def.ghi' },
      });
      await new Promise((r) => setImmediate(r));
      const serialized = JSON.stringify(capture.lines);
      expect(serialized).not.toContain('gsk_live_example_key_value_1234567890');
      expect(serialized).not.toContain('abc123secretvalue');
      expect(serialized).not.toContain('r'.repeat(40));
      expect(serialized).not.toContain('123456');
      expect(serialized).not.toContain('abc.def.ghi');
      expect(serialized).toContain('Groq'); // non-sensitive fields survive
    } finally {
      logger.remove(capture);
    }
  });

  it('masks secrets embedded in the message text itself', async () => {
    const capture = new Capture({ level: 'debug' });
    logger.add(capture);
    try {
      logger.warn(
        'Connecting to mongodb+srv://user:hunter2pass@cluster0.example.net/db with eyJhbGciOiJIUzI1NiJ9.eyJpZCI6IjEifQ.c2lnbmF0dXJl',
      );
      await new Promise((r) => setImmediate(r));
      const serialized = JSON.stringify(capture.lines);
      expect(serialized).not.toContain('hunter2pass');
      expect(serialized).not.toContain('eyJhbGciOiJIUzI1NiJ9');
      expect(serialized).toContain('Connecting to');
    } finally {
      logger.remove(capture);
    }
  });
});
