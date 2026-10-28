import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  normalizeIndianPhone,
  maskPhone,
  Fast2SmsProvider,
  MockSmsProvider,
  getSmsProvider,
} from '../../src/services/SmsProviderService';
import logger from '../../src/config/logger';

describe('SmsProviderService', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  describe('normalizeIndianPhone', () => {
    it('normalizes +91 formatted numbers', () => {
      expect(normalizeIndianPhone('+919876543210')).toBe('9876543210');
      expect(normalizeIndianPhone('+91 98765 43210')).toBe('9876543210');
    });

    it('normalizes 0 prefix formatted numbers', () => {
      expect(normalizeIndianPhone('09876543210')).toBe('9876543210');
    });

    it('normalizes 91 prefix without plus', () => {
      expect(normalizeIndianPhone('919876543210')).toBe('9876543210');
    });

    it('preserves clean 10-digit numbers', () => {
      expect(normalizeIndianPhone('9876543210')).toBe('9876543210');
    });
  });

  describe('maskPhone', () => {
    it('masks phone numbers to protect PII in logs', () => {
      expect(maskPhone('+919876543210')).toBe('+91 ******3210');
      expect(maskPhone('9876543210')).toBe('+91 ******3210');
    });
  });

  describe('Fast2SmsProvider', () => {
    it('returns error if FAST2SMS_API_KEY is not set', async () => {
      delete process.env.FAST2SMS_API_KEY;
      const provider = new Fast2SmsProvider();
      const result = await provider.sendOtp('+919876543210', '123456');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Configuration Error');
    });

    it('returns error if phone number is invalid', async () => {
      process.env.FAST2SMS_API_KEY = 'test_key';
      const provider = new Fast2SmsProvider();
      const result = await provider.sendOtp('12345', '123456');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid recipient phone number');
    });

    it('successfully calls Fast2SMS API with dedicated OTP route and valid payload', async () => {
      process.env.FAST2SMS_API_KEY = 'mock_valid_key';
      delete process.env.FAST2SMS_DLT_TEMPLATE_ID;
      delete process.env.FAST2SMS_SENDER_ID;
      const provider = new Fast2SmsProvider();

      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          return: true,
          request_id: 'req_test_123',
          message: ['SMS sent successfully.'],
        }),
      });
      global.fetch = fetchMock;

      const result = await provider.sendOtp('+919876543210', '654321');

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('req_test_123');
      expect(fetchMock).toHaveBeenCalledTimes(1);

      const [url, options] = fetchMock.mock.calls[0];
      expect(url).toBe('https://www.fast2sms.com/dev/bulkV2');
      expect(options.method).toBe('POST');
      expect(options.headers.authorization).toBe('mock_valid_key');

      const parsedBody = JSON.parse(options.body);
      expect(parsedBody).toEqual({
        route: 'otp',
        variables_values: '654321',
        numbers: '9876543210',
      });
    });

    it('uses DLT route when FAST2SMS_DLT_TEMPLATE_ID and FAST2SMS_SENDER_ID are configured', async () => {
      process.env.FAST2SMS_API_KEY = 'mock_valid_key';
      process.env.FAST2SMS_DLT_TEMPLATE_ID = '1207161728394051';
      process.env.FAST2SMS_SENDER_ID = 'AKULAK';
      const provider = new Fast2SmsProvider();

      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          return: true,
          request_id: 'req_dlt_456',
          message: ['SMS sent successfully.'],
        }),
      });
      global.fetch = fetchMock;

      const result = await provider.sendOtp('+919876543210', '998877');

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('req_dlt_456');

      const [, options] = fetchMock.mock.calls[0];
      const parsedBody = JSON.parse(options.body);
      expect(parsedBody).toEqual({
        route: 'dlt',
        sender_id: 'AKULAK',
        message: '1207161728394051',
        variables_values: '998877',
        numbers: '9876543210',
      });
    });

    it('handles Fast2SMS API error response cleanly', async () => {
      process.env.FAST2SMS_API_KEY = 'mock_valid_key';
      const provider = new Fast2SmsProvider();

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          return: false,
          status_code: 411,
          message: ['Invalid Numbers'],
        }),
      });

      const result = await provider.sendOtp('+919876543210', '654321');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid Numbers');
    });

    it('handles Fast2SMS 401/403 authorization failures with clear config error', async () => {
      process.env.FAST2SMS_API_KEY = 'invalid_key';
      const provider = new Fast2SmsProvider();

      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({
          return: false,
          status_code: 401,
          message: 'Invalid API Key',
        }),
      });

      const result = await provider.sendOtp('+919876543210', '654321');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Configuration Error');
    });

    it('handles string format error messages from Fast2SMS', async () => {
      process.env.FAST2SMS_API_KEY = 'mock_valid_key';
      const provider = new Fast2SmsProvider();

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          return: false,
          status_code: 400,
          message: 'Account balance insufficient',
        }),
      });

      const result = await provider.sendOtp('+919876543210', '654321');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Account balance insufficient');
    });

    it('handles network failure gracefully', async () => {
      process.env.FAST2SMS_API_KEY = 'mock_valid_key';
      const provider = new Fast2SmsProvider();

      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      const result = await provider.sendOtp('+919876543210', '654321');

      expect(result.success).toBe(false);
      expect(result.error).toBe('SMS Gateway Communication Error');
    });

    it('never logs raw OTP or API key during dispatch', async () => {
      const secretKey = 'super_secret_fast2sms_api_key_xyz';
      process.env.FAST2SMS_API_KEY = secretKey;
      const provider = new Fast2SmsProvider();

      const loggerInfoSpy = vi.spyOn(logger, 'info');

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          return: true,
          request_id: 'req_audit_789',
          message: ['SMS sent successfully.'],
        }),
      });

      const rawOtp = '741852';
      await provider.sendOtp('+919999999999', rawOtp);

      expect(loggerInfoSpy).toHaveBeenCalled();
      const loggedText = loggerInfoSpy.mock.calls.map((c) => c.join(' ')).join(' ');
      expect(loggedText).toContain('+91 ******9999');
      expect(loggedText).not.toContain(rawOtp);
      expect(loggedText).not.toContain(secretKey);
    });
  });

  describe('getSmsProvider factory', () => {
    it('returns Fast2SmsProvider when SMS_PROVIDER=fast2sms and key exists', () => {
      process.env.SMS_PROVIDER = 'fast2sms';
      process.env.FAST2SMS_API_KEY = 'real_key';
      const provider = getSmsProvider();
      expect(provider).toBeInstanceOf(Fast2SmsProvider);
    });

    it('returns MockSmsProvider in dev when SMS_PROVIDER=fast2sms but key is missing', () => {
      process.env.NODE_ENV = 'development';
      process.env.SMS_PROVIDER = 'fast2sms';
      delete process.env.FAST2SMS_API_KEY;
      const provider = getSmsProvider();
      expect(provider).toBeInstanceOf(MockSmsProvider);
    });

    it('returns MockSmsProvider when SMS_PROVIDER=mock', () => {
      process.env.SMS_PROVIDER = 'mock';
      const provider = getSmsProvider();
      expect(provider).toBeInstanceOf(MockSmsProvider);
    });

    it('rejects msg91 as an unsupported provider', () => {
      process.env.SMS_PROVIDER = 'msg91';
      expect(() => getSmsProvider()).toThrow(/unsupported sms provider/i);
    });

    it('returns Fast2SmsProvider when FAST2SMS_API_KEY is set and SMS_PROVIDER is unset', () => {
      delete process.env.SMS_PROVIDER;
      process.env.FAST2SMS_API_KEY = 'auto_detect_key';
      const provider = getSmsProvider();
      expect(provider).toBeInstanceOf(Fast2SmsProvider);
    });

    it('defaults to Fast2SmsProvider in production when no provider is configured', () => {
      process.env.NODE_ENV = 'production';
      delete process.env.SMS_PROVIDER;
      delete process.env.FAST2SMS_API_KEY;
      const provider = getSmsProvider();
      expect(provider).toBeInstanceOf(Fast2SmsProvider);
    });
  });
});
