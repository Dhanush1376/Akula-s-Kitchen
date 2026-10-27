import './setup';
import crypto from 'crypto';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import WhatsAppNotification from '../../src/models/WhatsAppNotification';
import {
  WhatsAppAdminAlertService,
  normalizeWhatsAppNumber,
  buildOrderAlertParams,
} from '../../src/services/notifications/WhatsAppAdminAlertService';
import {
  verifyWhatsAppSignature,
  applyWhatsAppStatusUpdates,
  verifyWhatsAppWebhook,
} from '../../src/controllers/notifications/whatsappWebhookController';

const order = {
  _id: '6ad92523fbb82e5f798e5df6',
  orderNumber: 'AK-1042',
  createdAt: new Date('2026-10-27T06:30:00Z'),
  total: 540,
  paymentMethod: 'COD',
  paymentStatus: 'Pending COD',
  items: [
    { title: 'Avakaya Pickle', quantity: 2, variant: '250g' },
    { title: 'Dosa Batter\nFresh', quantity: 1 },
    { title: 'Gunpowder Podi', quantity: 1 },
    { title: 'Cashews', quantity: 1 },
  ],
  shippingAddress: {
    name: 'Customer A',
    phone: '9876543210',
    email: 'a@example.com',
    address: '123 Main St',
    city: 'Hyderabad',
  },
};

const okResponse = (id = 'wamid.TEST1') =>
  ({ ok: true, status: 200, json: async () => ({ messages: [{ id }] }) }) as any;
const errResponse = (status: number, code = 131000) =>
  ({ ok: false, status, json: async () => ({ error: { code, message: 'boom' } }) }) as any;

describe('WhatsApp admin new-order alerts', () => {
  const originalEnv = process.env;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      WHATSAPP_ACCESS_TOKEN: 'test-token',
      WHATSAPP_PHONE_NUMBER_ID: '1234567890',
      WHATSAPP_ADMIN_NUMBERS: '9866006648, +91 98660 06648',
    };
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.unstubAllGlobals();
  });

  it('normalizes Indian and international numbers', () => {
    expect(normalizeWhatsAppNumber('9866006648')).toBe('919866006648');
    expect(normalizeWhatsAppNumber('+91 98660-06648')).toBe('919866006648');
    expect(normalizeWhatsAppNumber('+44 7700 900123')).toBe('447700900123');
    expect(normalizeWhatsAppNumber('12345')).toBeNull();
    expect(normalizeWhatsAppNumber('')).toBeNull();
  });

  it('builds 7 single-line template params without customer contact details', () => {
    const params = buildOrderAlertParams(order);
    expect(params).toHaveLength(7);
    expect(params[0]).toBe('AK-1042');
    expect(params[2]).toContain('540');
    expect(params[4]).toContain('2x Avakaya Pickle (250g)');
    expect(params[4]).toContain('+1 more');
    expect(params[5]).toBe('Hyderabad');
    expect(params[6]).toMatch(/\/admin\/orders\/6ad92523fbb82e5f798e5df6$/);
    for (const p of params) {
      expect(p).not.toMatch(/[\r\n\t]/);
      expect(p).not.toContain('9876543210');
      expect(p).not.toContain('a@example.com');
      expect(p).not.toContain('123 Main St');
    }
  });

  it('does nothing when WhatsApp is not configured', async () => {
    delete process.env.WHATSAPP_ACCESS_TOKEN;
    await WhatsAppAdminAlertService.notifyNewOrder(order);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(await WhatsAppNotification.countDocuments({})).toBe(0);
  });

  it('sends one template per unique admin number and is idempotent on retry', async () => {
    fetchMock.mockResolvedValue(okResponse());

    await WhatsAppAdminAlertService.notifyNewOrder(order);
    await WhatsAppAdminAlertService.notifyNewOrder(order); // outbox retry / duplicate event

    expect(fetchMock).toHaveBeenCalledTimes(1); // the two configured numbers are the same
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://graph.facebook.com/v23.0/1234567890/messages');
    const body = JSON.parse(init.body);
    expect(body.to).toBe('919866006648');
    expect(body.type).toBe('template');
    expect(body.template.name).toBe('new_order_alert');
    expect(body.template.components[0].parameters).toHaveLength(7);

    const rows = await WhatsAppNotification.find({}).lean();
    expect(rows).toHaveLength(1);
    expect(rows[0].status).toBe('accepted');
    expect(rows[0].providerMessageId).toBe('wamid.TEST1');
    expect(rows[0].recipientLast4).toBe('6648');
  });

  it('retries transient provider errors, then records acceptance', async () => {
    fetchMock.mockResolvedValueOnce(errResponse(503)).mockResolvedValueOnce(okResponse('wamid.R'));
    await WhatsAppAdminAlertService.notifyNewOrder(order);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const row = await WhatsAppNotification.findOne({}).lean();
    expect(row?.status).toBe('accepted');
    expect(row?.attempts).toBe(2);
  });

  it('does not retry permanent errors and never throws', async () => {
    fetchMock.mockResolvedValue(errResponse(400, 132001));
    await expect(WhatsAppAdminAlertService.notifyNewOrder(order)).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const row = await WhatsAppNotification.findOne({}).lean();
    expect(row?.status).toBe('failed');
    expect(row?.lastError).toContain('132001');
  });

  it('survives network failures without throwing', async () => {
    fetchMock.mockRejectedValue(new Error('ECONNRESET'));
    await expect(WhatsAppAdminAlertService.notifyNewOrder(order)).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledTimes(3); // bounded
  }, 15000);
});

describe('WhatsApp webhook', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      WHATSAPP_APP_SECRET: 'app-secret-for-tests',
      WHATSAPP_WEBHOOK_VERIFY_TOKEN: 'verify-me',
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  const sign = (body: Buffer) =>
    'sha256=' + crypto.createHmac('sha256', 'app-secret-for-tests').update(body).digest('hex');

  it('accepts only correctly signed payloads', () => {
    const raw = Buffer.from('{"entry":[]}');
    expect(verifyWhatsAppSignature(raw, sign(raw))).toBe(true);
    expect(verifyWhatsAppSignature(raw, sign(Buffer.from('tampered')))).toBe(false);
    expect(verifyWhatsAppSignature(raw, undefined)).toBe(false);
    delete process.env.WHATSAPP_APP_SECRET;
    expect(verifyWhatsAppSignature(raw, sign(raw))).toBe(false);
  });

  it('answers the verification challenge only for the right token', () => {
    const res: any = {
      status: vi.fn().mockReturnThis(),
      type: vi.fn().mockReturnThis(),
      send: vi.fn(),
      sendStatus: vi.fn(),
    };
    verifyWhatsAppWebhook(
      {
        query: { 'hub.mode': 'subscribe', 'hub.verify_token': 'verify-me', 'hub.challenge': '42' },
      } as any,
      res,
    );
    expect(res.send).toHaveBeenCalledWith('42');

    const bad: any = { sendStatus: vi.fn() };
    verifyWhatsAppWebhook(
      {
        query: { 'hub.mode': 'subscribe', 'hub.verify_token': 'nope', 'hub.challenge': '42' },
      } as any,
      bad,
    );
    expect(bad.sendStatus).toHaveBeenCalledWith(403);
  });

  it('moves delivery status forward only', async () => {
    await WhatsAppNotification.create({
      dedupeKey: 'ORDER_CREATED:x:y',
      kind: 'ORDER_CREATED',
      recipientHash: 'y',
      recipientLast4: '6648',
      template: 'new_order_alert',
      status: 'accepted',
      providerMessageId: 'wamid.S1',
    });
    const status = (s: string) => ({
      entry: [{ changes: [{ value: { statuses: [{ id: 'wamid.S1', status: s }] } }] }],
    });

    await applyWhatsAppStatusUpdates(status('delivered'));
    await applyWhatsAppStatusUpdates(status('sent')); // late, out-of-order event
    const row = await WhatsAppNotification.findOne({ providerMessageId: 'wamid.S1' }).lean();
    expect(row?.status).toBe('delivered');

    await applyWhatsAppStatusUpdates(status('read'));
    expect((await WhatsAppNotification.findOne({}).lean())?.status).toBe('read');
  });
});
