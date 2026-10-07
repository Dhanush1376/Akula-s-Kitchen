/**
 * Email Provider Service
 * =====================
 * Production-ready email delivery using Brevo HTTP API (port 443 - works on ALL hosting providers including Render free tier).
 *
 * WHY NOT SMTP?
 * - Render.com blocks outbound ports 25, 465, 587 on free tier (SMTP ports) since September 2025.
 * - Gmail SMTP also gets blocked by cloud providers due to IP reputation.
 * - HTTP API (HTTPS port 443) is NEVER blocked - it's regular web traffic.
 *
 * SETUP:
 * 1. Brevo → SMTP & API → API Keys → create a REST API key and set BREVO_API_KEY.
 * 2. Authenticate the brand domain (akulas.kitchen) in Brevo and add its DNS records.
 * 3. Set the sender: BREVO_SENDER_EMAIL=orders@akulas.kitchen, BREVO_SENDER_NAME, and
 *    optionally BREVO_REPLY_TO_EMAIL. Sender rules live in config/emailSender.ts.
 * Full steps: docs/email-brand-authentication.md
 *
 * OPTIONAL - SMTP fallback for local dev: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS.
 */

import logger from '../config/logger';
import dns from 'dns';
import { resolveSender } from '../config/emailSender';

// Force Node.js >= 17 to prefer IPv4 first (fixes ENETUNREACH on IPv6 to Gmail SMTP)
if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder('ipv4first');
}

export interface EmailPayload {
  to: string;
  subject: string;
  html: string;
  /** Sender address override; honoured only on the configured sending domain. */
  from?: string;
  fromName?: string;
  replyTo?: string;
  attachments?: {
    filename: string;
    content: Buffer | string;
    contentType?: string;
  }[];
  headers?: Record<string, string>;
}

/**
 * Send email via Brevo HTTP API
 */
export const sendViaBrevo = async (payload: EmailPayload): Promise<{ messageId: string }> => {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) throw new Error('BREVO_API_KEY missing');

  // Brevo HTTP API requires a REST API key (starts with "xkeysib-").
  // Keys starting with "xsmtpsib-" are SMTP passwords and will always fail with 401 Unauthorized.
  if (apiKey.startsWith('xsmtpsib-')) {
    throw new Error(
      'BREVO_API_KEY is an SMTP relay key (starts with "xsmtpsib-"), not a REST API key (which starts with "xkeysib-"). Brevo HTTP API requires an API key.',
    );
  }

  const sender = resolveSender({
    email: payload.from,
    name: payload.fromName,
    replyTo: payload.replyTo,
  });

  const body: any = {
    sender: { name: sender.name, email: sender.email },
    to: [{ email: payload.to }],
    subject: payload.subject,
    htmlContent: payload.html,
  };

  if (sender.replyTo) {
    body.replyTo = { email: sender.replyTo };
  }

  if (payload.headers && Object.keys(payload.headers).length > 0) {
    body.headers = payload.headers;
  }

  if (payload.attachments && payload.attachments.length > 0) {
    body.attachment = payload.attachments.map((a) => ({
      name: a.filename,
      content:
        typeof a.content === 'string'
          ? Buffer.from(a.content).toString('base64')
          : a.content.toString('base64'),
    }));
  }

  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json', 'api-key': apiKey },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Brevo API error (${response.status}): ${errorText}`);
  }

  const result: any = await response.json();
  logger.info(`[BREVO SUCCESS] Email delivered to ${payload.to}. MessageId: ${result.messageId}`);
  return { messageId: result.messageId || 'brevo-sent' };
};

/**
 * Send email via Nodemailer SMTP with persistent connection pooling
 */
let cachedTransporter: any = null;

export const sendViaSMTP = async (payload: EmailPayload): Promise<{ messageId: string }> => {
  const nodemailer = require('nodemailer');
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
  const configuredPort = Number(process.env.SMTP_PORT);
  // Default to 465 (direct SSL) for Gmail if not explicitly overridden, or 587
  const smtpPort = configuredPort || (smtpHost.includes('gmail') ? 465 : 587);
  const isSecure = smtpPort === 465;

  if (!cachedTransporter) {
    cachedTransporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: isSecure,
      pool: true,
      maxConnections: 3,
      maxMessages: 100,
      rateDelta: 1000,
      rateLimit: 5,
      auth: { user: smtpUser, pass: smtpPass },
      tls: { rejectUnauthorized: false }, // Helps with local firewalls / VPNs
      // Force IPv4 to prevent ENETUNREACH issues when IPv6 is broken locally
      family: 4,
      connectionTimeout: 8000,
      greetingTimeout: 8000,
      socketTimeout: 15000,
    });
  }

  const transporter = cachedTransporter;

  const sender = resolveSender({
    email: payload.from,
    name: payload.fromName,
    replyTo: payload.replyTo,
  });

  try {
    const info = await transporter.sendMail({
      from: `"${sender.name}" <${sender.email}>`,
      replyTo: sender.replyTo,
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
      headers: payload.headers,
      attachments: payload.attachments,
    });

    logger.info(`[SMTP SUCCESS] Email sent to ${payload.to}. MessageId: ${info.messageId}`);
    return { messageId: info.messageId };
  } catch (err: any) {
    // Reset cached transporter so broken connections are purged immediately
    cachedTransporter = null;
    throw err;
  }
};

/**
 * Authoritative Recipient Resolution & Test Safety Gate
 * Every email passing through the application boundary must resolve here.
 * When MARKETING_EMAIL_TEST_MODE is enabled, all emails are strictly intercepted
 * and redirected to TEST_MARKETING_RECIPIENT if configured.
 */
export const resolveAuthoritativeRecipient = (
  payload: EmailPayload,
): { resolvedPayload: EmailPayload; isRedirected: boolean; originalRecipient: string } => {
  const isMarketingTestMode = process.env.MARKETING_EMAIL_TEST_MODE === 'true';
  const testRecipient = (process.env.TEST_MARKETING_RECIPIENT || process.env.SMTP_USER || '')
    .trim()
    .toLowerCase();
  const originalRecipient = (payload.to || '').trim().toLowerCase();

  if (isMarketingTestMode && testRecipient && originalRecipient !== testRecipient) {
    const safetyBanner = `
      <div style="background-color: #fef2f2; border: 2px solid #ef4444; border-radius: 8px; padding: 12px 16px; margin-bottom: 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 13px; color: #991b1b; text-align: left;">
        <div style="font-weight: 700; margin-bottom: 4px;">MARKETING SAFETY GATE ACTIVE</div>
        <div>Original Target Recipient: <strong>${originalRecipient}</strong></div>
        <div style="font-size: 11px; color: #b91c1c; margin-top: 4px;">Development safety mode is active. This message was intercepted and redirected to authorized test inbox: <strong>${testRecipient}</strong>. No actual customer was contacted.</div>
      </div>
    `;

    return {
      resolvedPayload: {
        ...payload,
        to: testRecipient,
        subject: `[TEST MODE] ${payload.subject}`,
        html: `${safetyBanner}${payload.html}`,
        headers: {
          ...payload.headers,
          'X-Marketing-Test-Mode': 'true',
          'X-Original-Recipient': originalRecipient,
        },
      },
      isRedirected: true,
      originalRecipient,
    };
  }

  return {
    resolvedPayload: payload,
    isRedirected: false,
    originalRecipient,
  };
};

/**
 * Get current configured provider status and diagnostics
 */
export const getProviderStatus = () => {
  const brevoKey = process.env.BREVO_API_KEY;
  const isBrevoHttpEligible = Boolean(brevoKey && !brevoKey.startsWith('xsmtpsib-'));
  const hasSMTP = Boolean(process.env.SMTP_USER && process.env.SMTP_PASS);
  let activeProvider = 'ethereal_dev';
  if (isBrevoHttpEligible) {
    activeProvider = 'brevo_https';
  } else if (hasSMTP) {
    activeProvider = 'smtp';
  }

  return {
    activeProvider,
    brevoConfigured: isBrevoHttpEligible,
    brevoKeyWarning: brevoKey?.startsWith('xsmtpsib-')
      ? 'BREVO_API_KEY is an SMTP relay key (starts with "xsmtpsib-"). Brevo HTTP API requires an API key starting with "xkeysib-".'
      : null,
    smtpConfigured: hasSMTP,
    nodeEnv: process.env.NODE_ENV || 'development',
    marketingTestMode: process.env.MARKETING_EMAIL_TEST_MODE === 'true',
    testRecipient: (process.env.TEST_MARKETING_RECIPIENT || process.env.SMTP_USER || '').trim(),
  };
};

/**
 * Smart Email Sender: Tries Resend -> SendGrid -> Brevo -> SMTP fallback
 */
export const sendEmail = async (
  rawPayload: EmailPayload,
): Promise<{ messageId: string; redirected?: boolean; originalRecipient?: string }> => {
  const { resolvedPayload, isRedirected, originalRecipient } =
    resolveAuthoritativeRecipient(rawPayload);

  if (isRedirected) {
    logger.warn(
      `[MARKETING SAFETY GATE] Intercepted email to "${originalRecipient}" -> Authoritatively redirected to "${resolvedPayload.to}"`,
    );
  }

  const payload = resolvedPayload;
  const errors: string[] = [];

  const brevoKey = process.env.BREVO_API_KEY;
  const isBrevoHttpEligible = Boolean(brevoKey && !brevoKey.startsWith('xsmtpsib-'));

  if (isBrevoHttpEligible) {
    logger.info(`[EMAIL PROVIDER] selected=BREVO`);
    try {
      const result = await sendViaBrevo(payload);
      logger.info(`[EMAIL PROVIDER][SUCCESS] provider=BREVO messageId=${result.messageId}`);
      return result;
    } catch (err: any) {
      logger.error(`[EMAIL PROVIDER][FAILED] provider=BREVO error=${err.message}`);
      errors.push(`Brevo: ${err.message}`);
    }
  } else if (brevoKey?.startsWith('xsmtpsib-')) {
    logger.warn(
      `[EMAIL PROVIDER] BREVO_API_KEY starts with "xsmtpsib-" (SMTP key). Bypassing Brevo HTTP API (which requires "xkeysib-") to prevent 401 Unauthorized delays. Using SMTP directly.`,
    );
  }

  if (process.env.SMTP_USER && process.env.SMTP_PASS) {
    try {
      return await sendViaSMTP(payload);
    } catch (err: any) {
      logger.error(`SMTP failed: ${err.message}`);
      errors.push(`SMTP: ${err.message}`);
    }
  }

  if (process.env.NODE_ENV !== 'production') {
    logger.warn('[EMAIL] No real email provider configured. Using Ethereal test mail...');
    const nodemailer = require('nodemailer');
    const testAccount = await nodemailer.createTestAccount();
    const transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: { user: testAccount.user, pass: testAccount.pass },
    });
    const sender = resolveSender({
      email: payload.from,
      name: payload.fromName,
      replyTo: payload.replyTo,
    });
    const info = await transporter.sendMail({
      from: `"${sender.name}" <${sender.email}>`,
      replyTo: sender.replyTo,
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
      attachments: payload.attachments,
    });
    logger.info(`[ETHEREAL] Test email preview URL: ${nodemailer.getTestMessageUrl(info)}`);
    return { messageId: info.messageId };
  }

  if (errors.length > 0) {
    throw new Error(`Email delivery failed: ${errors.join(', ')}`);
  }

  throw new Error('No email provider configured! Set BREVO_API_KEY or SMTP_USER/PASS.');
};
