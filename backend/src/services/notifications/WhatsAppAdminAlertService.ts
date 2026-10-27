import crypto from 'crypto';
import logger from '../../config/logger';
import WhatsAppNotification, {
  WhatsAppNotificationStatus,
} from '../../models/WhatsAppNotification';
import { getPublicWebsiteUrl } from '../../utils/getFrontendUrl';

/**
 * WhatsApp new-order alerts for store admins via the official Meta WhatsApp
 * Business Platform (Cloud API). Business-initiated messages to the admin are sent
 * as an approved UTILITY template (required outside a 24h customer-service window).
 *
 * Contract:
 *  - Called from the outbox ORDER_CREATED handler, i.e. only for genuine orders
 *    (verified online payment, or accepted COD / zero-total order).
 *  - Never throws: a WhatsApp outage must not affect orders or the email channel.
 *  - Idempotent per (order, recipient) via WhatsAppNotification.dedupeKey.
 *  - Bounded retries only for transient errors (network, 429, 5xx).
 *  - No tokens, full phone numbers or customer contact details in logs or messages.
 */

const SENT_OR_BETTER: WhatsAppNotificationStatus[] = ['accepted', 'sent', 'delivered', 'read'];
const MAX_ATTEMPTS_PER_RUN = 3;
const MAX_TOTAL_ATTEMPTS = 6;
const REQUEST_TIMEOUT_MS = 10_000;
const BACKOFF_MS = [1_000, 3_000];

export interface WhatsAppConfig {
  accessToken: string;
  phoneNumberId: string;
  recipients: string[];
  template: string;
  language: string;
  apiVersion: string;
}

/** Digits-only E.164 without '+'. Bare 10-digit Indian mobiles get the 91 prefix. */
export const normalizeWhatsAppNumber = (raw: string): string | null => {
  const digits = String(raw || '').replace(/\D/g, '');
  const withCountry = digits.length === 10 && /^[6-9]/.test(digits) ? `91${digits}` : digits;
  return /^[1-9]\d{9,14}$/.test(withCountry) ? withCountry : null;
};

export const getWhatsAppConfig = (): WhatsAppConfig | null => {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN?.trim();
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim();
  const recipients = String(process.env.WHATSAPP_ADMIN_NUMBERS || '')
    .split(',')
    .map((n) => normalizeWhatsAppNumber(n))
    .filter((n): n is string => Boolean(n));

  if (!accessToken || !phoneNumberId || recipients.length === 0) return null;

  return {
    accessToken,
    phoneNumberId,
    recipients: [...new Set(recipients)],
    template: process.env.WHATSAPP_ORDER_ALERT_TEMPLATE?.trim() || 'new_order_alert',
    language: process.env.WHATSAPP_TEMPLATE_LANGUAGE?.trim() || 'en',
    apiVersion: process.env.WHATSAPP_GRAPH_API_VERSION?.trim() || 'v23.0',
  };
};

/** Template parameters may not contain newlines/tabs or >4 consecutive spaces. */
const cleanParam = (value: unknown, maxLength = 120): string => {
  const text = String(value ?? '')
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/ {2,}/g, ' ')
    .trim();
  const clipped = text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text;
  return clipped || '-';
};

const formatInr = (amount: unknown) =>
  `₹${Number(amount || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

const formatIst = (date: unknown) =>
  new Date((date as string | number | Date) || Date.now()).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

/**
 * Positional body parameters for the `new_order_alert` template:
 *  {{1}} order reference  {{2}} placed at (IST)  {{3}} total  {{4}} payment
 *  {{5}} items summary    {{6}} delivery city    {{7}} admin order link
 */
export const buildOrderAlertParams = (order: any): string[] => {
  const items: any[] = Array.isArray(order?.items) ? order.items : [];
  const summary = items
    .slice(0, 3)
    .map((i) => `${i.quantity || 1}x ${i.title || 'Item'}${i.variant ? ` (${i.variant})` : ''}`)
    .join(', ');
  const more = items.length > 3 ? ` +${items.length - 3} more` : '';
  const reference = order?.orderNumber || order?.orderId || String(order?._id || '');
  const payment = `${order?.paymentMethod || 'Online'} - ${order?.paymentStatus || 'pending'}`;

  return [
    cleanParam(reference, 40),
    cleanParam(formatIst(order?.createdAt)),
    cleanParam(formatInr(order?.total)),
    cleanParam(payment, 60),
    cleanParam(`${summary}${more}` || 'No items', 200),
    cleanParam(order?.shippingAddress?.city || 'Not specified', 60),
    cleanParam(`${getPublicWebsiteUrl()}/admin/orders/${order?._id}`, 200),
  ];
};

const hashRecipient = (number: string) =>
  crypto.createHash('sha256').update(number).digest('hex').slice(0, 24);

const isTransient = (status?: number) => !status || status === 429 || status >= 500;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const postTemplate = async (config: WhatsAppConfig, to: string, params: string[]) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(
      `https://graph.facebook.com/${config.apiVersion}/${config.phoneNumberId}/messages`,
      {
        method: 'POST',
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${config.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to,
          type: 'template',
          template: {
            name: config.template,
            language: { code: config.language },
            components: [
              { type: 'body', parameters: params.map((text) => ({ type: 'text', text })) },
            ],
          },
        }),
      },
    );
    const body: any = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = body?.error || {};
      return {
        ok: false as const,
        status: res.status,
        error: `${res.status} ${err.code ?? ''} ${err.message ?? 'request failed'}`.trim(),
      };
    }
    return { ok: true as const, messageId: body?.messages?.[0]?.id as string | undefined };
  } catch (e: any) {
    return {
      ok: false as const,
      status: undefined,
      error: e?.name === 'AbortError' ? 'timeout' : e?.message || 'network error',
    };
  } finally {
    clearTimeout(timer);
  }
};

export class WhatsAppAdminAlertService {
  static isConfigured(): boolean {
    return getWhatsAppConfig() !== null;
  }

  /** Sends the new-order alert to every configured admin number. Never throws. */
  static async notifyNewOrder(order: any): Promise<void> {
    try {
      const config = getWhatsAppConfig();
      if (!config) return; // Not configured: email remains the only channel.
      if (!order?._id) return;

      const orderId = String(order._id);
      const params = buildOrderAlertParams(order);

      for (const recipient of config.recipients) {
        await this.sendOnce(config, orderId, recipient, params);
      }
    } catch (err: any) {
      logger.error('[WHATSAPP] Unexpected failure in new-order alert', { error: err?.message });
    }
  }

  private static async sendOnce(
    config: WhatsAppConfig,
    orderId: string,
    recipient: string,
    params: string[],
  ) {
    const recipientHash = hashRecipient(recipient);
    const dedupeKey = `ORDER_CREATED:${orderId}:${recipientHash}`;

    // Claim the (order, recipient) slot. Concurrent runs see the same document.
    const record = await WhatsAppNotification.findOneAndUpdate(
      { dedupeKey },
      {
        $setOnInsert: {
          dedupeKey,
          kind: 'ORDER_CREATED',
          orderId,
          recipientHash,
          recipientLast4: recipient.slice(-4),
          template: config.template,
          status: 'pending',
          attempts: 0,
        },
      },
      { upsert: true, new: true },
    );

    if (SENT_OR_BETTER.includes(record.status)) return; // already sent: retries are no-ops
    if (record.attempts >= MAX_TOTAL_ATTEMPTS) return;

    for (let attempt = 0; attempt < MAX_ATTEMPTS_PER_RUN; attempt++) {
      // Atomically take the attempt so two workers never send the same alert.
      const claimed = await WhatsAppNotification.findOneAndUpdate(
        {
          _id: record._id,
          status: { $in: ['pending', 'failed'] },
          attempts: { $lt: MAX_TOTAL_ATTEMPTS },
          updatedAt: record.updatedAt,
        },
        { $inc: { attempts: 1 }, $set: { status: 'pending' } },
        { new: true },
      );
      if (!claimed) return;
      record.updatedAt = claimed.updatedAt;

      const result = await postTemplate(config, recipient, params);
      if (result.ok) {
        await WhatsAppNotification.updateOne(
          { _id: record._id },
          {
            $set: {
              status: 'accepted',
              providerMessageId: result.messageId,
              statusUpdatedAt: new Date(),
            },
            $unset: { lastError: '' },
          },
        );
        logger.info('[WHATSAPP] New-order alert accepted', {
          orderId,
          recipient: `***${recipient.slice(-4)}`,
        });
        return;
      }

      const updated = await WhatsAppNotification.findOneAndUpdate(
        { _id: record._id },
        { $set: { status: 'failed', lastError: result.error, statusUpdatedAt: new Date() } },
        { new: true },
      );
      if (updated) record.updatedAt = updated.updatedAt;
      logger.warn('[WHATSAPP] New-order alert failed', {
        orderId,
        recipient: `***${recipient.slice(-4)}`,
        error: result.error,
        attempt: attempt + 1,
      });

      if (!isTransient(result.status) || attempt === MAX_ATTEMPTS_PER_RUN - 1) return;
      await sleep(BACKOFF_MS[attempt] ?? 3_000);
    }
  }
}

export default WhatsAppAdminAlertService;
