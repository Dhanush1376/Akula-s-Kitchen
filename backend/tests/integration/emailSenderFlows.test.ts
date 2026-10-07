import { describe, it, expect, vi, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import NodeModule from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Every major email flow, end to end through the real templates and the real delivery
 * pipeline (idempotency, tracking, layout wrapper, provider), with Brevo's HTTP API
 * stubbed. Checks the From / Reply-To identity and basic rendering of each message.
 * No email is sent.
 */

// Set before any application module loads. dotenv never overrides existing keys, so a
// developer's .env.local cannot swap in real credentials or a real admin inbox here.
vi.hoisted(() => {
  Object.assign(process.env, {
    BREVO_API_KEY: 'xkeysib-integration-test-key-not-real',
    BREVO_SENDER_EMAIL: 'orders@akulas.kitchen',
    BREVO_SENDER_NAME: "Akula's Kitchen",
    BREVO_REPLY_TO_EMAIL: 'support@akulas.kitchen',
    SMTP_FROM_EMAIL: '',
    SMTP_REPLY_TO_EMAIL: '',
    SMTP_USER: '',
    SMTP_PASS: '',
    MARKETING_EMAIL_TEST_MODE: '',
    TEST_MARKETING_RECIPIENT: '',
    ADMIN_EMAIL: 'ops-admin@example.com',
    SUPER_ADMIN_EMAIL: '',
  });
});

// The notification engine's development fallback (Ethereal) must never be reached.
vi.mock('nodemailer', () => {
  const blocked = () => {
    throw new Error('nodemailer must not be used in this test');
  };
  const api = { createTransport: blocked, createTestAccount: blocked, getTestMessageUrl: blocked };
  return { default: api, ...api };
});

import './setup';
import User, * as userModule from '../../src/models/User';
import EmailTemplate from '../../src/models/EmailTemplate';
import * as emailTemplates from '../../src/utils/email/emailTemplates';
import * as templateEngine from '../../src/utils/email/templateEngine';
import { sendDirectEmailProcessor } from '../../src/services/notificationService';
import { TransactionalEmailService } from '../../src/services/TransactionalEmailService';
import { EmailAdapter } from '../../src/services/notifications/adapters/EmailAdapter';
import { EmailProviderAbstraction } from '../../src/services/marketing/EmailProviderAbstraction';
import {
  getOtpEmailTemplate,
  getCodOtpEmailTemplate,
  getTeamInviteEmailTemplate,
  getAdminNotificationTemplate,
} from '../../src/utils/email/emailTemplates';

/**
 * A few modules on these paths are loaded lazily with `require()` (the layout wrapper,
 * the .hbs template engine, and the User model for the admin recipient lookup). Node's
 * CommonJS loader cannot resolve TypeScript files under Vitest, although the compiled
 * build can, so point those requires at the instances Vitest has already loaded.
 */
const srcDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../src');
const lazyRequires = new Map<string, unknown>([
  [path.join(srcDir, 'utils/email/emailTemplates'), emailTemplates],
  [path.join(srcDir, 'utils/email/templateEngine'), templateEngine],
  [path.join(srcDir, 'models/User'), userModule],
]);
type NodeModuleInternals = {
  _resolveFilename: (request: string, parent: any, ...rest: any[]) => string;
  _cache: Record<string, unknown>;
};
const nodeModule = NodeModule as unknown as NodeModuleInternals;
const originalResolveFilename = nodeModule._resolveFilename;

beforeAll(() => {
  nodeModule._resolveFilename = function (request, parent, ...rest) {
    if (request.startsWith('.') && parent?.filename) {
      const target = path.resolve(path.dirname(parent.filename), request);
      if (lazyRequires.has(target)) {
        const filename = `${target}.ts`;
        nodeModule._cache[filename] = {
          id: filename,
          filename,
          loaded: true,
          exports: lazyRequires.get(target),
        };
        return filename;
      }
    }
    return originalResolveFilename.call(this, request, parent, ...rest);
  };
});

afterAll(() => {
  nodeModule._resolveFilename = originalResolveFilename;
});

const BRAND_SENDER = { name: "Akula's Kitchen", email: 'orders@akulas.kitchen' };
const REPLY_TO = { email: 'support@akulas.kitchen' };

const fetchMock = vi.fn(
  async (_url: string, _init?: RequestInit) =>
    new Response(JSON.stringify({ messageId: `<${Date.now()}@brevo.test>` }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    }),
);

/** Request bodies handed to Brevo since the test started. */
const brevoMessages = () =>
  fetchMock.mock.calls
    .filter(([url]) => String(url) === 'https://api.brevo.com/v3/smtp/email')
    .map(([, init]) => JSON.parse(String(init!.body)));

const recipientsOf = (messages: any[]) => messages.map((m) => m.to[0].email).sort();

/** Brand identity, plus checks that the message renders and works in an inbox. */
const expectBrandedEmail = (message: any) => {
  expect(message.sender).toEqual(BRAND_SENDER);
  expect(message.replyTo).toEqual(REPLY_TO);
  expect(message.subject).toBeTruthy();

  const html: string = message.htmlContent;
  expect(html.length).toBeGreaterThan(300);
  expect(html).not.toMatch(/\bundefined\b|\bNaN\b|\[object Object\]/);
  for (const [, src] of html.matchAll(/<img[^>]+src="([^"]*)"/g)) {
    expect(src, 'image URLs must be absolute').toMatch(/^(https?:|data:|cid:)/);
  }
  for (const [, href] of html.matchAll(/<a[^>]+href="([^"]*)"/g)) {
    expect(href, 'link URLs must be absolute').toMatch(/^(https?:|mailto:|tel:|#)/);
  }
};

const customer = {
  _id: '665f0c0f2a9b4c0012ab3401',
  name: 'Ravi Verma',
  email: 'ravi.verma@example.com',
};

const order = {
  _id: '665f0c0f2a9b4c0012ab3499',
  orderUuid: 'AK-2026-1001',
  invoiceNumber: 'INV-2026-1001',
  user: customer,
  items: [
    {
      name: 'Tomato Pickle',
      title: 'Tomato Pickle',
      variant: '500 g',
      price: 250,
      quantity: 2,
      imageSrc: 'https://res.cloudinary.com/demo/image/upload/tomato-pickle.jpg',
    },
  ],
  subtotal: 500,
  discount: 0,
  shippingFee: 40,
  courierCharges: 0,
  tax: 0,
  total: 540,
  paymentMethod: 'razorpay',
  paymentStatus: 'paid',
  shippingAddress: {
    name: 'Ravi Verma',
    email: 'ravi.verma@example.com',
    phone: '9876543210',
    address: '12 Temple Street',
    locality: 'Ameerpet',
    city: 'Hyderabad',
    state: 'Telangana',
    pincode: '500016',
    country: 'India',
  },
};

describe('email flows send as the Akula’s Kitchen brand', () => {
  beforeEach(async () => {
    fetchMock.mockClear();
    vi.stubGlobal('fetch', fetchMock);
    await User.create({ name: 'Store Admin', email: 'store-admin@example.com', role: 'admin' });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('login OTP', async () => {
    await sendDirectEmailProcessor({
      email: customer.email,
      subject: "482913 is your Akula's Kitchen verification code",
      customHtml: getOtpEmailTemplate('482913', 5),
      type: 'security',
      action: 'otp_auth',
    });
    const [message] = brevoMessages();
    expect(message.to).toEqual([{ email: customer.email }]);
    expectBrandedEmail(message);
  });

  it('COD order verification OTP', async () => {
    await sendDirectEmailProcessor({
      email: customer.email,
      subject: '731904 is your COD Order Verification Code',
      customHtml: getCodOtpEmailTemplate('731904', 5),
      type: 'security',
      action: 'cod_otp',
    });
    expectBrandedEmail(brevoMessages()[0]);
  });

  // The welcome and login-alert emails use admin-managed templates stored in the database
  // (production has both); seed stand-ins so these flows can run.
  const seedTemplate = (name: string, subjectLine: string, htmlContent: string) =>
    EmailTemplate.create({ name, subjectLine, htmlContent, type: 'transactional' });

  it('welcome email', async () => {
    await seedTemplate(
      'Welcome Email',
      "Welcome to Akula's Kitchen, {{name}}",
      '<h2>Welcome, {{name}}</h2><p>Explore our batters and podis at <a href="{{frontend_url}}">Akula’s Kitchen</a>.</p>',
    );
    await sendDirectEmailProcessor({
      email: customer.email,
      subject: `Welcome to Akula's Kitchen, ${customer.name}`,
      templateName: 'Welcome Email',
      templateData: { name: customer.name, frontend_url: 'https://www.akulas.kitchen' },
      type: 'marketing',
      action: 'welcome_email',
    });
    expectBrandedEmail(brevoMessages()[0]);
  });

  it('new-login security alert', async () => {
    await seedTemplate(
      'Suspicious Login Alert',
      'Security Alert: New Login Detected',
      '<h2>New login</h2><p>Hi {{name}}, your account was accessed on {{loginTime}} from {{deviceInfo}}.</p>',
    );
    await sendDirectEmailProcessor({
      email: customer.email,
      subject: 'Security Alert: New Login Detected',
      templateName: 'Suspicious Login Alert',
      templateData: {
        name: customer.name,
        loginTime: '7 Oct 2026, 09:30',
        deviceInfo: '203.0.113.7',
      },
      type: 'security',
      action: 'new_login_detected',
    });
    expectBrandedEmail(brevoMessages()[0]);
  });

  it('order confirmation to the customer and every admin', async () => {
    await TransactionalEmailService.sendOrderPlacedEmails(order, customer, 'evt-order-placed');
    const messages = brevoMessages();
    expect(recipientsOf(messages)).toEqual([
      'ops-admin@example.com',
      'ravi.verma@example.com',
      'store-admin@example.com',
    ]);
    messages.forEach(expectBrandedEmail);
  });

  it('payment confirmation', async () => {
    await TransactionalEmailService.sendPaymentSuccessEmails(order, customer, 'evt-payment-ok');
    const messages = brevoMessages();
    expect(messages).toHaveLength(3);
    messages.forEach(expectBrandedEmail);
  });

  it('order status / shipping update', async () => {
    await TransactionalEmailService.sendOrderStatusChangeEmail(
      order,
      customer,
      'confirmed',
      'shipped',
      'evt-shipped',
    );
    const [message] = brevoMessages();
    expect(message.to).toEqual([{ email: customer.email }]);
    expectBrandedEmail(message);
  });

  it('payment failed', async () => {
    await TransactionalEmailService.sendPaymentFailedEmail(
      order,
      customer,
      'Card declined by the bank',
      'evt-payment-failed',
    );
    expectBrandedEmail(brevoMessages()[0]);
  });

  it('refund completed', async () => {
    await sendDirectEmailProcessor({
      email: customer.email,
      subject: `Refund Processed Successfully - Order #${order.orderUuid}`,
      customHtml:
        '<h1>Refund Processed</h1><p>Your refund of ₹540 has been successfully processed via Razorpay. It should reflect in your account shortly.</p>',
      type: 'order',
      action: 'order_refund_completed',
      notificationKey: 'ORDER_REFUND_COMPLETED:evt-refund:CUSTOMER',
    });
    expectBrandedEmail(brevoMessages()[0]);
  });

  it('admin password reset', async () => {
    const resetLink = 'https://www.akulas.kitchen/admin/reset-password?token=test-token';
    await sendDirectEmailProcessor({
      email: 'store-admin@example.com',
      subject: 'Admin Password Reset Request',
      customHtml: `<p>You requested an admin password reset.</p><p>Click <a href="${resetLink}">here</a> to reset your password. This link is valid for 15 minutes.</p><p>If you did not request this, please ignore this email.</p>`,
      type: 'security',
      action: 'admin_password_reset',
    });
    expectBrandedEmail(brevoMessages()[0]);
  });

  it('team invite and admin notification', async () => {
    await sendDirectEmailProcessor({
      email: 'new-member@example.com',
      subject: "Invitation to join Akula's Kitchen Team",
      customHtml: getTeamInviteEmailTemplate(
        'https://www.akulas.kitchen/admin/accept-invite?token=test-token',
        'admin',
        'orders, products',
      ),
      type: 'security',
      action: 'team_invite',
    });
    await sendDirectEmailProcessor({
      email: 'store-admin@example.com',
      subject: 'Low stock: Tomato Pickle',
      customHtml: getAdminNotificationTemplate(
        'Low stock',
        'Tomato Pickle is running low.',
        'https://www.akulas.kitchen/admin/products',
      ),
      type: 'system',
      action: 'system_alert',
    });
    const messages = brevoMessages();
    expect(messages).toHaveLength(2);
    messages.forEach(expectBrandedEmail);
  });

  it('customer inquiry to the customer and every admin', async () => {
    await TransactionalEmailService.sendInquiryEmails(
      {
        name: customer.name,
        email: customer.email,
        subject: 'Bulk order for a family function',
        message: 'Can you prepare 5 kg of idli batter for Saturday?',
      },
      'evt-inquiry',
    );
    const messages = brevoMessages();
    expect(messages).toHaveLength(3);
    messages.forEach(expectBrandedEmail);
  });

  it('scheduled digest reports (notification engine path)', async () => {
    const result = await new EmailAdapter().send(
      { email: 'store-admin@example.com' },
      { subject: 'Daily sales report', html: '<p>Orders today: 12</p>' },
      'normal',
    );
    expect(result.success).toBe(true);
    const [message] = brevoMessages();
    expect(message.sender).toEqual(BRAND_SENDER);
    expect(message.replyTo).toEqual(REPLY_TO);
  });

  it('marketing campaign set to a personal Gmail sender still sends as the brand', async () => {
    const result = await EmailProviderAbstraction.send({
      to: customer.email,
      subject: 'Fresh podis are back',
      html: '<p>New batch today.</p>',
      from: 'mahesh.akula@gmail.com',
      fromName: "Akula's Kitchen",
    });
    expect(result.success).toBe(true);
    expect(brevoMessages()[0].sender).toEqual(BRAND_SENDER);
  });
});
