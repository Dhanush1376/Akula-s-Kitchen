import logger from './logger';
import { getStoreConfigSync } from './storeConfig';

/**
 * Sender identity for every outgoing email (Brevo API and SMTP alike).
 *
 * Production mail must come from the brand domain that is authenticated in Brevo
 * (akulas.kitchen), so SPF/DKIM/DMARC align and BIMI can apply. Configure it with:
 *   BREVO_SENDER_EMAIL    (falls back to SMTP_FROM_EMAIL)   e.g. orders@akulas.kitchen
 *   BREVO_SENDER_NAME     (falls back to SMTP_FROM_NAME)    e.g. Akula's Kitchen
 *   BREVO_REPLY_TO_EMAIL  (falls back to SMTP_REPLY_TO_EMAIL, optional) e.g. support@akulas.kitchen
 *
 * See docs/email-brand-authentication.md for the Brevo and DNS steps.
 */

export const DEFAULT_SENDER_EMAIL = 'orders@akulas.kitchen';

// Personal mailbox providers. Mail "from" these domains can never pass DMARC alignment
// when it is delivered through Brevo, so they must not be used as a production sender.
const PERSONAL_MAIL_DOMAINS = new Set([
  'gmail.com',
  'googlemail.com',
  'yahoo.com',
  'yahoo.co.in',
  'ymail.com',
  'hotmail.com',
  'outlook.com',
  'live.com',
  'msn.com',
  'icloud.com',
  'me.com',
  'aol.com',
  'proton.me',
  'protonmail.com',
  'rediffmail.com',
  'zoho.com',
]);

export interface SenderIdentity {
  email: string;
  name: string;
  replyTo?: string;
}

const clean = (value?: string | null) => (value ?? '').trim();

export const emailDomain = (address: string): string =>
  clean(address).split('@')[1]?.toLowerCase() ?? '';

export const isPersonalMailbox = (address: string): boolean =>
  PERSONAL_MAIL_DOMAINS.has(emailDomain(address));

/** The configured default sender. */
export function getSenderIdentity(): SenderIdentity {
  const email =
    clean(process.env.BREVO_SENDER_EMAIL) ||
    clean(process.env.SMTP_FROM_EMAIL) ||
    DEFAULT_SENDER_EMAIL;
  const name =
    clean(process.env.BREVO_SENDER_NAME) ||
    clean(process.env.SMTP_FROM_NAME) ||
    getStoreConfigSync().name ||
    "Akula's Kitchen";
  const replyTo =
    clean(process.env.BREVO_REPLY_TO_EMAIL) || clean(process.env.SMTP_REPLY_TO_EMAIL) || undefined;

  return { email: email.toLowerCase(), name, replyTo };
}

/**
 * Sender for one message. A per-message address (e.g. a campaign sent as
 * hello@akulas.kitchen) is honoured only when it is on the configured sending domain;
 * anything else would fail DMARC alignment, so it is ignored in favour of the default.
 * Display name and Reply-To may be overridden freely, as neither affects authentication.
 */
export function resolveSender(override?: {
  email?: string;
  name?: string;
  replyTo?: string;
}): SenderIdentity {
  const base = getSenderIdentity();
  const requested = clean(override?.email).toLowerCase();

  let email = base.email;
  if (requested && requested !== base.email) {
    if (emailDomain(requested) === emailDomain(base.email)) {
      email = requested;
    } else {
      logger.warn(
        `[EMAIL SENDER] Ignored sender override on @${emailDomain(requested) || 'unknown'}; ` +
          `only @${emailDomain(base.email)} is configured for sending.`,
      );
    }
  }

  return {
    email,
    name: clean(override?.name) || base.name,
    replyTo: clean(override?.replyTo) || base.replyTo,
  };
}

/**
 * Which route outgoing mail will actually take, mirroring services/emailProvider.ts:
 * Brevo's HTTP API needs a REST key (xkeysib-…); otherwise mail falls back to SMTP_*.
 */
export function getDeliveryRoute(): 'brevo-api' | 'gmail-smtp' | 'smtp' | 'none' {
  const key = clean(process.env.BREVO_API_KEY);
  if (key && !key.startsWith('xsmtpsib-')) return 'brevo-api';
  if (clean(process.env.SMTP_USER) && clean(process.env.SMTP_PASS)) {
    const host = clean(process.env.SMTP_HOST) || 'smtp.gmail.com';
    return /gmail|googlemail/i.test(host) ? 'gmail-smtp' : 'smtp';
  }
  return 'none';
}

/**
 * Startup check. Warns (never blocks) when mail cannot go out as the configured sender:
 * in any environment when it would be relayed through Gmail (which always sends as the
 * Gmail account and shows its profile photo), and in production when the sender is a
 * personal mailbox, so a development sender cannot silently become the production sender.
 */
export function auditSenderConfig(): void {
  const { email, replyTo } = getSenderIdentity();

  if (getDeliveryRoute() === 'gmail-smtp') {
    const keyHint = clean(process.env.BREVO_API_KEY).startsWith('xsmtpsib-')
      ? 'BREVO_API_KEY is a Brevo SMTP relay key (xsmtpsib-…), which the Brevo API cannot use, so '
      : '';
    logger.warn(
      `[EMAIL SENDER] ${keyHint}mail is going out through Gmail SMTP. Gmail always sends as the ` +
        `signed-in Gmail account, so recipients see that address and its profile photo, not ` +
        `@${emailDomain(email)}. Set BREVO_API_KEY to a Brevo REST API key (xkeysib-…), or point ` +
        'SMTP_* at smtp-relay.brevo.com (see docs/email-brand-authentication.md).',
    );
  }

  if (process.env.NODE_ENV !== 'production') return;

  if (isPersonalMailbox(email)) {
    logger.warn(
      `[EMAIL SENDER] Production sender is a personal @${emailDomain(email)} address. ` +
        `Authenticate akulas.kitchen in Brevo, then set BREVO_SENDER_EMAIL=${DEFAULT_SENDER_EMAIL} ` +
        '(see docs/email-brand-authentication.md).',
    );
  } else {
    logger.info(
      `[EMAIL SENDER] Sending as @${emailDomain(email)}${replyTo ? `, replies to @${emailDomain(replyTo)}` : ''}`,
    );
  }
}
