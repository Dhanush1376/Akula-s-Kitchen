import crypto from 'crypto';
import { Request, Response } from 'express';
import logger from '../../config/logger';
import WhatsAppNotification, {
  WhatsAppNotificationStatus,
} from '../../models/WhatsAppNotification';

/**
 * Meta WhatsApp Cloud API webhook: endpoint verification (GET) and message status
 * updates (POST, signed with X-Hub-Signature-256 = HMAC-SHA256(raw body, app secret)).
 * Only message *status* events are consumed; inbound messages are ignored.
 */

// Webhooks may arrive out of order; a status only ever moves forward.
const RANK: Record<WhatsAppNotificationStatus, number> = {
  pending: 0,
  failed: 1,
  accepted: 2,
  sent: 3,
  delivered: 4,
  read: 5,
};

export const verifyWhatsAppSignature = (rawBody: Buffer, header: string | undefined) => {
  const secret = process.env.WHATSAPP_APP_SECRET;
  if (!secret || !header?.startsWith('sha256=')) return false;
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  const provided = header.slice('sha256='.length);
  const a = Buffer.from(provided, 'hex');
  const b = Buffer.from(expected, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};

export const verifyWhatsAppWebhook = (req: Request, res: Response) => {
  const expectedToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;
  const mode = req.query['hub.mode'];
  const token = String(req.query['hub.verify_token'] || '');
  const challenge = String(req.query['hub.challenge'] || '');

  const tokenMatches =
    Boolean(expectedToken) &&
    token.length === expectedToken!.length &&
    crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expectedToken!));

  if (mode === 'subscribe' && tokenMatches) {
    res.status(200).type('text/plain').send(challenge);
    return;
  }
  res.sendStatus(403);
};

export const applyWhatsAppStatusUpdates = async (payload: any): Promise<number> => {
  let applied = 0;
  for (const entry of payload?.entry || []) {
    for (const change of entry?.changes || []) {
      for (const s of change?.value?.statuses || []) {
        const next = s?.status as WhatsAppNotificationStatus;
        if (!s?.id || !(next in RANK)) continue;

        const record = await WhatsAppNotification.findOne({ providerMessageId: String(s.id) });
        if (!record || RANK[next] <= RANK[record.status]) continue;

        const update: Record<string, unknown> = { status: next, statusUpdatedAt: new Date() };
        if (next === 'failed') {
          const err = s?.errors?.[0];
          update.lastError =
            `${err?.code ?? ''} ${err?.title ?? err?.message ?? 'delivery failed'}`.trim();
        }
        await WhatsAppNotification.updateOne(
          { _id: record._id, status: record.status },
          { $set: update },
        );
        applied += 1;
      }
    }
  }
  return applied;
};

export const receiveWhatsAppWebhook = async (req: Request, res: Response) => {
  const raw = (req as any).rawBody as Buffer | undefined;
  if (!raw || !verifyWhatsAppSignature(raw, req.get('x-hub-signature-256'))) {
    logger.warn('[WHATSAPP WEBHOOK] Rejected request with invalid or missing signature');
    res.sendStatus(401);
    return;
  }

  try {
    const applied = await applyWhatsAppStatusUpdates(req.body);
    if (applied) logger.info(`[WHATSAPP WEBHOOK] Applied ${applied} status update(s)`);
  } catch (err: any) {
    // Still acknowledge: Meta retries non-2xx responses, and the status is advisory.
    logger.error('[WHATSAPP WEBHOOK] Failed to apply status update', { error: err?.message });
  }
  res.sendStatus(200);
};
