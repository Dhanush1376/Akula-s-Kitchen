import path from 'path';
import { pathToFileURL } from 'url';
import { describe, it, expect, beforeAll, vi } from 'vitest';
import { buildInvoiceModel } from '../../../src/services/invoice/invoiceModel';
import { renderInvoicePdf } from '../../../src/services/invoice/invoicePdf';

/**
 * The invoice the customer downloads on the website and the PDF attached to
 * the order email must show the same data. The website builds it with
 * frontend/src/components/ui/invoiceModel.js; the server with its TS port.
 * These fixtures cover every branch of the shared rules.
 */

const store = {
  displayName: "Akula's Kitchen",
  legalCompanyName: "Akula's Kitchen",
  addressLine1:
    'Plot No. 93/1, Purvanchal Silver City, Block-9-B204, Sector 93, Noida, Uttar Pradesh, India - 201304',
};

const fixtures: Record<string, any> = {
  prepaidSimple: {
    _id: '68bc22849129031022',
    invoice: { number: 'INV-2026-000022', issuedAt: '2026-09-06T05:00:00Z' },
    paymentMethod: 'Razorpay',
    shippingAddress: {
      name: 'Asha Rao',
      email: 'asha@example.com',
      phone: '9876543210',
      address: 'Flat 101, Green Meadows',
      locality: 'Gachibowli',
      city: 'Hyderabad',
      state: 'Telangana',
      pincode: '500081',
    },
    store,
    items: [
      { title: 'Mango Avakaaya', quantity: 2, price: 600, variant: '500g' },
      { title: 'Idli Batter', quantity: 1, price: 180, variant: 'Default' },
    ],
    subtotal: 1380,
    shippingFee: 100,
    total: 1480,
    tax: { grandTotal: 1480, currencySymbol: '₹' },
  },
  codWithInferredFee: {
    _id: '6ac4ba5658b53ac90876a53b',
    invoiceNumber: 'INV-2026-000107',
    createdAt: '2026-10-29T20:15:00Z', // after 18:30 UTC: next day in IST
    paymentMethod: 'cod',
    shippingAddress: {
      name: 'Ravi',
      email: 'r@example.com',
      phone: '9000000000',
      address: 'H.No 4',
      city: 'Pune',
      state: 'MH',
      pincode: '411001',
    },
    store: {
      ...store,
      addressLine2: 'Sector 93',
      city: 'Noida',
      state: 'Uttar Pradesh',
      postalCode: '201304',
    },
    items: [{ title: 'Tomato Pickle', quantity: 1, price: 250 }],
    subtotal: 250,
    shippingFee: 0,
    platformFee: 10,
    discount: 25,
    total: 325, // implies a ₹90 COD fee that is not stored
  },
  noInvoiceSnapshot: {
    _id: '6ae2cbcf3d10ba75ada59295',
    paymentMethod: 'UPI',
    deliveryAddress: {
      name: 'Guest',
      phone: '8000000000',
      addressString: 'Plot 7',
      city: 'Chennai',
      pincode: '600001',
    },
    items: [{ name: 'Cashews W240', qty: 3, unitPrice: 1200, weight: '500g' }],
    totalAmount: 3600,
  },
  lakhAmounts: {
    _id: '6ae2a17fda7517e01af16aa9',
    invoice: { number: 'INV/2026/999999 SPECIAL' },
    paymentMethod: 'Razorpay',
    shippingAddress: {
      name: 'Corporate Buyer',
      email: 'b@example.com',
      phone: '9',
      address: 'Tower A',
      city: 'Mumbai',
      state: 'MH',
      pincode: '400001',
    },
    store,
    items: [{ title: 'Festive Hamper (Bulk)', quantity: 100, price: 1499 }],
    subtotal: 149900,
    shippingFee: 0,
    total: 149900,
  },
};

const opts = {
  user: { name: 'Fallback User', email: 'fallback@example.com' },
  storeName: "Akula's Kitchen",
  storeSettings: { legal: { companyName: "Akula's Kitchen Pvt Ltd" }, taxes: {} },
  brand: { name: "Akula's Kitchen" },
  origin: 'https://akulas.kitchen',
};

let frontendModel: (order: any, o: any) => any;

beforeAll(async () => {
  const file = path.resolve(__dirname, '../../../../frontend/src/components/ui/invoiceModel.js');
  frontendModel = (await import(pathToFileURL(file).href)).buildInvoiceModel;
});

describe('invoice model parity (website vs email PDF)', () => {
  for (const [name, order] of Object.entries(fixtures)) {
    it(`produces identical invoice data: ${name}`, () => {
      expect(buildInvoiceModel(order, opts)).toEqual(frontendModel(order, opts));
    });
  }

  it('applies the shared business rules', () => {
    const cod = buildInvoiceModel(fixtures.codWithInferredFee, opts);
    expect(cod.codFee).toBe(90);
    expect(cod.grandTotal).toBe(325);
    expect(cod.invoiceDate).toBe('30 Oct 2026'); // dates are shown in IST
    expect(cod.storeAddressLines).toHaveLength(1); // address parts already in line 1 are not repeated

    const prepaid = buildInvoiceModel(fixtures.prepaidSimple, opts);
    expect(prepaid.grandTotal).toBe(1380); // shipping is excluded from the invoice total
    expect(prepaid.items[0]).toMatchObject({ lineTotal: 1200, details: '500g' });
    expect(prepaid.items[1].details).toBe('');
    expect(prepaid.trackingUrl).toBe('https://akulas.kitchen/track/68bc22849129031022');

    const guest = buildInvoiceModel(fixtures.noInvoiceSnapshot, opts);
    expect(guest.invoiceNumber).toBe('INV-ADA59295');
    expect(guest.items[0]).toMatchObject({
      title: 'Cashews W240',
      quantity: 3,
      price: 1200,
      details: '500g',
    });
    expect(guest.filename).toBe('Invoice_INV-ADA59295.pdf');

    expect(buildInvoiceModel(fixtures.lakhAmounts, opts).filename).toBe(
      'Invoice_INV_2026_999999_SPECIAL.pdf',
    );
  });
});

describe('renderInvoicePdf', () => {
  it('renders a single-page A4 PDF with the invoice filename', async () => {
    const { buffer, filename } = await renderInvoicePdf(fixtures.prepaidSimple, opts);
    expect(buffer.subarray(0, 5).toString()).toBe('%PDF-');
    expect(filename).toBe('Invoice_INV-2026-000022.pdf');
    const raw = buffer.toString('latin1');
    expect(raw.match(/\/Type \/Page\b/g)).toHaveLength(1);
    expect(raw).toMatch(/\/MediaBox \[0 0 595\.28 841\.89\]/);
    expect(raw).toContain('Invoice INV-2026-000022'); // document title metadata
    expect(buffer.length).toBeLessThan(150_000); // small enough for any mailbox
  });

  it('handles long item lists and every optional row', async () => {
    const many = {
      ...fixtures.codWithInferredFee,
      items: Array.from({ length: 12 }, (_, i) => ({
        title: `Pickle variety number ${i + 1} with a long descriptive name`,
        quantity: i + 1,
        price: 99 + i,
        variant: '250g',
      })),
    };
    const { buffer } = await renderInvoicePdf(many, opts);
    expect(buffer.subarray(0, 5).toString()).toBe('%PDF-');
    // Too tall for one A4 page: continues on a second page instead of being cut off.
    expect(buffer.toString('latin1').match(/\/Type \/Page\b/g)).toHaveLength(2);
  });
});

describe('order confirmation email', () => {
  it('attaches the invoice PDF and links to website tracking', async () => {
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-for-tracking-links';
    const sent: any[] = [];
    vi.doMock('../../../src/services/notificationService', () => ({
      sendDirectEmailProcessor: async (o: any) => {
        sent.push(o);
      },
    }));
    vi.doMock('../../../src/config/adminConfig', () => ({
      getActiveAdminEmailsFromDB: async () => [],
    }));
    vi.doMock('../../../src/services/StoreSettingsService', () => ({
      default: { getPublicSettings: async () => ({ general: { storeName: "Akula's Kitchen" } }) },
    }));
    vi.resetModules();
    const { TransactionalEmailService } =
      await import('../../../src/services/TransactionalEmailService');
    await TransactionalEmailService.sendOrderPlacedEmails(
      fixtures.prepaidSimple,
      { name: 'Asha', email: 'asha@example.com' },
      'evt-1',
    );

    const customer = sent.find((e) => e.action === 'order_confirmation_customer');
    expect(customer).toBeTruthy();
    expect(customer.attachments).toHaveLength(1);
    expect(customer.attachments[0]).toMatchObject({
      filename: 'Invoice_INV-2026-000022.pdf',
      contentType: 'application/pdf',
    });
    expect(Buffer.isBuffer(customer.attachments[0].content)).toBe(true);
    expect(customer.customHtml).toContain('Your invoice is attached');
    expect(customer.customHtml).toContain('Track your order');
    expect(customer.customHtml).toMatch(/\/track\/68bc22849129031022\?token=/);
    vi.doUnmock('../../../src/services/notificationService');
    vi.doUnmock('../../../src/config/adminConfig');
    vi.doUnmock('../../../src/services/StoreSettingsService');
  });
});
