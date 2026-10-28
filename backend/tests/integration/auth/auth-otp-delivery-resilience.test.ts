import '../setup';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import crypto from 'crypto';

import OtpAuthService from '../../../src/services/OtpAuthService';
import { PhoneAuthService } from '../../../src/services/PhoneAuthService';
import OtpChallenge from '../../../src/models/OtpChallenge';
import * as notificationService from '../../../src/services/notificationService';
import * as smsProviderService from '../../../src/services/SmsProviderService';

describe('OTP Delivery Resilience & Failure Handling Tests', () => {
  const ip = '127.0.0.1';

  beforeEach(async () => {
    await OtpChallenge.deleteMany({});
    vi.spyOn(crypto, 'randomInt').mockReturnValue(654321 as any);
  });

  describe('Email OTP Delivery Failures', () => {
    it('should throw ApiError 502 and exhaust the challenge if email delivery provider fails', async () => {
      const email = 'failing-provider@example.com';

      // Mock email sending failure (e.g. SMTP connection timeout / rejection)
      vi.spyOn(notificationService, 'sendDirectEmailProcessor').mockRejectedValueOnce(
        new Error('SMTP connection timed out on port 465'),
      );

      await expect(OtpAuthService.generateOTP(email, ip)).rejects.toMatchObject({
        statusCode: 502,
        message: expect.stringContaining('Unable to deliver verification code'),
      });

      // Verify the challenge was marked exhausted so no unused orphan challenge remains valid
      const challenges = await OtpChallenge.find({ identifier: email });
      expect(challenges.length).toBeGreaterThan(0);
      expect(challenges.every((c) => c.exhausted)).toBe(true);
    });

    it('should successfully return challengeId when email delivery provider succeeds', async () => {
      const email = 'success-provider@example.com';

      vi.spyOn(notificationService, 'sendDirectEmailProcessor').mockResolvedValueOnce({
        status: 'sent',
      } as any);

      const result = await OtpAuthService.generateOTP(email, ip);
      expect(result.challengeId).toBeDefined();

      const challenge = await OtpChallenge.findOne({ challengeId: result.challengeId });
      expect(challenge).toBeDefined();
      expect(challenge?.exhausted).toBe(false);
    });
  });

  describe('Phone OTP Delivery Failures', () => {
    it('should throw 503 directing to email when SMS provider is unconfigured', async () => {
      const phone = '9876543210';

      vi.spyOn(smsProviderService, 'getSmsProvider').mockReturnValueOnce({
        sendOtp: vi.fn().mockResolvedValue({
          success: false,
          error: 'SMS Gateway Configuration Error: FAST2SMS_API_KEY is not configured',
        }),
      });

      await expect(PhoneAuthService.requestOtp(phone, ip)).rejects.toMatchObject({
        statusCode: 503,
        message: expect.stringContaining('sign in using your email address'),
      });
    });

    it('should throw 500 when SMS provider returns an unexpected runtime failure', async () => {
      const phone = '9876543210';

      vi.spyOn(smsProviderService, 'getSmsProvider').mockReturnValueOnce({
        sendOtp: vi.fn().mockResolvedValue({
          success: false,
          error: 'Fast2SMS Gateway Error: Account Balance Exhausted',
        }),
      });

      await expect(PhoneAuthService.requestOtp(phone, ip)).rejects.toMatchObject({
        statusCode: 500,
        message: expect.stringContaining('Fast2SMS Gateway Error'),
      });
    });
  });
});
