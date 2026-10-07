import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * Sender identity rules (config/emailSender.ts) and the exact request each email path
 * hands to Brevo. `fetch` is stubbed, so no email ever leaves the machine.
 *
 * Every email variable is set explicitly (empty means "unset") so a developer's
 * .env.local, which dotenv never lets override existing keys, cannot leak into these tests.
 */

// Store settings come from the database; here the public support email is a personal
// Gmail, exactly the value that must never become the sender.
vi.mock('../../src/config/storeConfig', () => ({
  getStoreConfigSync: () => ({
    name: "Akula's Kitchen",
    logo: '',
    websiteUrl: 'https://www.akulas.kitchen',
    websiteDomain: 'akulas.kitchen',
    contact: {
      email: 'mahesh.akula@gmail.com',
      phone: '',
      alternatePhone: '',
      whatsappNumber: '',
      address: '',
    },
  }),
}));

const BASE_ENV: Record<string, string> = {
  BREVO_API_KEY: 'xkeysib-unit-test-key-not-real',
  BREVO_SENDER_EMAIL: '',
  BREVO_SENDER_NAME: '',
  BREVO_REPLY_TO_EMAIL: '',
  SMTP_FROM_EMAIL: '',
  SMTP_FROM_NAME: '',
  SMTP_REPLY_TO_EMAIL: '',
  SMTP_USER: '',
  SMTP_PASS: '',
  MARKETING_EMAIL_TEST_MODE: '',
  TEST_MARKETING_RECIPIENT: '',
};

const BRAND_ENV = {
  BREVO_SENDER_EMAIL: 'orders@akulas.kitchen',
  BREVO_SENDER_NAME: "Akula's Kitchen",
  BREVO_REPLY_TO_EMAIL: 'support@akulas.kitchen',
};

const stubBrevo = () => {
  const fetchMock = vi.fn(
    async (_url: string, _init?: RequestInit) =>
      new Response(JSON.stringify({ messageId: '<unit-test@brevo>' }), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      }),
  );
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
};

const brevoRequest = (fetchMock: ReturnType<typeof stubBrevo>, call = -1) => {
  const [url, init] = fetchMock.mock.calls.at(call)!;
  return { url, body: JSON.parse(String(init!.body)) };
};

const loadSender = () => import('../../src/config/emailSender');

describe('email sender identity', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv, ...BASE_ENV, NODE_ENV: 'test' };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  describe('getSenderIdentity', () => {
    it('defaults to the brand sender when nothing is configured', async () => {
      const { getSenderIdentity } = await loadSender();
      expect(getSenderIdentity()).toEqual({
        email: 'orders@akulas.kitchen',
        name: "Akula's Kitchen",
        replyTo: undefined,
      });
    });

    it('prefers the BREVO_* variables over SMTP_*', async () => {
      Object.assign(process.env, BRAND_ENV, {
        SMTP_FROM_EMAIL: 'owner@gmail.com',
        SMTP_FROM_NAME: 'Owner',
        SMTP_REPLY_TO_EMAIL: 'owner@gmail.com',
      });
      const { getSenderIdentity } = await loadSender();
      expect(getSenderIdentity()).toEqual({
        email: 'orders@akulas.kitchen',
        name: "Akula's Kitchen",
        replyTo: 'support@akulas.kitchen',
      });
    });

    it('falls back to the existing SMTP_* variables', async () => {
      Object.assign(process.env, {
        SMTP_FROM_EMAIL: 'Hello@Akulas.Kitchen',
        SMTP_FROM_NAME: 'Akula Kitchen Team',
        SMTP_REPLY_TO_EMAIL: 'support@akulas.kitchen',
      });
      const { getSenderIdentity } = await loadSender();
      expect(getSenderIdentity()).toEqual({
        email: 'hello@akulas.kitchen',
        name: 'Akula Kitchen Team',
        replyTo: 'support@akulas.kitchen',
      });
    });
  });

  describe('resolveSender', () => {
    beforeEach(() => Object.assign(process.env, BRAND_ENV));

    it('honours an override on the authenticated domain', async () => {
      const { resolveSender } = await loadSender();
      expect(resolveSender({ email: 'hello@akulas.kitchen', name: 'Akula Offers' })).toEqual({
        email: 'hello@akulas.kitchen',
        name: 'Akula Offers',
        replyTo: 'support@akulas.kitchen',
      });
    });

    it('ignores a personal mailbox or another domain, and logs why', async () => {
      const logger = (await import('../../src/config/logger')).default;
      const warn = vi.spyOn(logger, 'warn');
      const { resolveSender } = await loadSender();

      expect(resolveSender({ email: 'mahesh.akula@gmail.com' }).email).toBe(
        'orders@akulas.kitchen',
      );
      expect(resolveSender({ email: 'news@another-shop.com' }).email).toBe('orders@akulas.kitchen');
      expect(warn).toHaveBeenCalledTimes(2);
      expect(String(warn.mock.calls[0][0])).toContain('@gmail.com');
    });

    it('lets Reply-To be overridden, since it does not affect authentication', async () => {
      const { resolveSender } = await loadSender();
      expect(resolveSender({ replyTo: 'owner@gmail.com' }).replyTo).toBe('owner@gmail.com');
    });
  });

  describe('Brevo request (main sender used by every transactional email)', () => {
    it('sends as the brand with Reply-To, even when a caller passes a Gmail sender', async () => {
      Object.assign(process.env, BRAND_ENV);
      const fetchMock = stubBrevo();
      const { sendEmail } = await import('../../src/services/emailProvider');

      await sendEmail({
        to: 'customer@example.com',
        subject: 'Order confirmed',
        html: '<p>Thanks</p>',
        from: 'mahesh.akula@gmail.com',
      });

      const { url, body } = brevoRequest(fetchMock);
      expect(url).toBe('https://api.brevo.com/v3/smtp/email');
      expect(body.sender).toEqual({ name: "Akula's Kitchen", email: 'orders@akulas.kitchen' });
      expect(body.replyTo).toEqual({ email: 'support@akulas.kitchen' });
      expect(body.to).toEqual([{ email: 'customer@example.com' }]);
    });

    it('omits Reply-To when none is configured', async () => {
      Object.assign(process.env, { BREVO_SENDER_EMAIL: 'orders@akulas.kitchen' });
      const fetchMock = stubBrevo();
      const { sendEmail } = await import('../../src/services/emailProvider');

      await sendEmail({ to: 'customer@example.com', subject: 'Hi', html: '<p>Hi</p>' });

      expect(brevoRequest(fetchMock).body).not.toHaveProperty('replyTo');
    });

    it('keeps the brand sender when test mode redirects the recipient', async () => {
      Object.assign(process.env, BRAND_ENV, {
        MARKETING_EMAIL_TEST_MODE: 'true',
        TEST_MARKETING_RECIPIENT: 'qa@example.com',
      });
      const fetchMock = stubBrevo();
      const { sendEmail } = await import('../../src/services/emailProvider');

      await sendEmail({ to: 'customer@example.com', subject: 'Hi', html: '<p>Hi</p>' });

      const { body } = brevoRequest(fetchMock);
      expect(body.to).toEqual([{ email: 'qa@example.com' }]);
      expect(body.sender.email).toBe('orders@akulas.kitchen');
    });
  });

  describe('notification engine provider (digests, admin SMTP test)', () => {
    it('never falls back to the store support email as the sender', async () => {
      const fetchMock = stubBrevo();
      const { BrevoProvider } =
        await import('../../src/services/notifications/providers/email/BrevoProvider');

      const result = await new BrevoProvider().sendEmail({
        to: 'admin@example.com',
        subject: 'Daily sales report',
        html: '<p>Report</p>',
        from: "Akula's Kitchen Reports",
      });

      expect(result.success).toBe(true);
      expect(brevoRequest(fetchMock).body.sender).toEqual({
        name: "Akula's Kitchen Reports",
        email: 'orders@akulas.kitchen',
      });
    });
  });

  describe('auditSenderConfig', () => {
    it('warns when production would send from a personal mailbox', async () => {
      Object.assign(process.env, { NODE_ENV: 'production', SMTP_FROM_EMAIL: 'owner@gmail.com' });
      const logger = (await import('../../src/config/logger')).default;
      const warn = vi.spyOn(logger, 'warn');
      const { auditSenderConfig } = await loadSender();

      auditSenderConfig();

      expect(warn).toHaveBeenCalledOnce();
      expect(String(warn.mock.calls[0][0])).toContain('personal @gmail.com');
    });

    it('stays quiet for the brand sender in production', async () => {
      Object.assign(process.env, { NODE_ENV: 'production', ...BRAND_ENV });
      const logger = (await import('../../src/config/logger')).default;
      const warn = vi.spyOn(logger, 'warn');

      (await loadSender()).auditSenderConfig();

      expect(warn).not.toHaveBeenCalled();
    });

    it('stays quiet outside production', async () => {
      Object.assign(process.env, {
        NODE_ENV: 'development',
        BREVO_SENDER_EMAIL: 'owner@gmail.com',
      });
      const logger = (await import('../../src/config/logger')).default;
      const warn = vi.spyOn(logger, 'warn');

      (await loadSender()).auditSenderConfig();

      expect(warn).not.toHaveBeenCalled();
    });
  });
});
