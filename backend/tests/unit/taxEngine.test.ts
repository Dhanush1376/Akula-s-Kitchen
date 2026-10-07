import { describe, it, expect, vi } from 'vitest';
import { TaxEngine } from '../../src/services/taxes/TaxEngine';
import { canonicalizeState } from '../../src/utils/stateCanonicalizer';
import { computeOrderTotals } from '../../src/services/orders/orderTotals';
import { InvoiceService } from '../../src/services/InvoiceService';
import storeSettingsService from '../../src/services/StoreSettingsService';
import { SequenceGeneratorService } from '../../src/services/SequenceGeneratorService';
import { ApiError } from '../../src/utils/ApiError';

describe('State Canonicalizer', () => {
  it('correctly canonicalizes standard 2-letter Indian state codes', () => {
    expect(canonicalizeState('AP')).toBe('AP');
    expect(canonicalizeState('ts')).toBe('TS');
    expect(canonicalizeState('mh')).toBe('MH');
    expect(canonicalizeState('DL')).toBe('DL');
    expect(canonicalizeState('ka')).toBe('KA');
  });

  it('correctly canonicalizes full Indian state and UT names', () => {
    expect(canonicalizeState('Andhra Pradesh')).toBe('AP');
    expect(canonicalizeState('telangana')).toBe('TS');
    expect(canonicalizeState('MAHARASHTRA')).toBe('MH');
    expect(canonicalizeState('Tamil Nadu')).toBe('TN');
    expect(canonicalizeState('Karnataka')).toBe('KA');
    expect(canonicalizeState('Jammu & Kashmir')).toBe('JK');
    expect(canonicalizeState('Jammu and Kashmir')).toBe('JK');
    expect(canonicalizeState('Delhi')).toBe('DL');
    expect(canonicalizeState('National Capital Territory of Delhi')).toBe('DL');
  });

  it('returns null for unrecognized or foreign states', () => {
    expect(canonicalizeState('California')).toBeNull();
    expect(canonicalizeState('Unknown Province')).toBeNull();
    expect(canonicalizeState('')).toBeNull();
    expect(canonicalizeState(null as any)).toBeNull();
  });
});

describe('TaxEngine - Unit Calculations', () => {
  const defaultTaxSettings = {
    gstEnabled: true,
    taxInclusive: true,
    gstRate: 0.18,
    cgstRate: 0.09,
    sgstRate: 0.09,
  };

  it('throws ApiError(400) when customer state is missing or invalid', () => {
    expect(() =>
      TaxEngine.calculateTax({
        subtotal: 1000,
        discount: 0,
        taxSettings: defaultTaxSettings,
        customerState: '',
        storeState: 'AP',
      }),
    ).toThrow(ApiError);

    expect(() =>
      TaxEngine.calculateTax({
        subtotal: 1000,
        discount: 0,
        taxSettings: defaultTaxSettings,
        customerState: 'California',
        storeState: 'AP',
      }),
    ).toThrow(ApiError);
  });

  it('calculates zero tax across all customer states and settings', () => {
    const resultAP = TaxEngine.calculateTax({
      subtotal: 1000,
      discount: 0,
      customerState: 'AP',
      storeState: 'AP',
    });

    expect(resultAP.isGstEnabled).toBe(false);
    expect(resultAP.taxableBase).toBe(1000);
    expect(resultAP.taxableAmount).toBe(1000);
    expect(resultAP.taxAmount).toBe(0);
    expect(resultAP.cgst).toBe(0);
    expect(resultAP.sgst).toBe(0);
    expect(resultAP.igst).toBe(0);

    const resultInterState = TaxEngine.calculateTax({
      subtotal: 1180,
      discount: 0,
      customerState: 'Maharashtra',
      storeState: 'AP',
    });

    expect(resultInterState.isGstEnabled).toBe(false);
    expect(resultInterState.taxableBase).toBe(1180);
    expect(resultInterState.taxableAmount).toBe(1180);
    expect(resultInterState.taxAmount).toBe(0);
    expect(resultInterState.cgst).toBe(0);
    expect(resultInterState.sgst).toBe(0);
    expect(resultInterState.igst).toBe(0);
  });
});

describe('Order Totals Math Integration', () => {
  it('computes order total with zero tax addition', () => {
    const totals = computeOrderTotals({
      subtotal: 1000,
      isCod: false,
      codFee: 0,
      freeShippingThreshold: 500,
      deliveryCharge: 50,
      platformFee: 10,
      taxAmount: 0,
      isTaxInclusive: false,
      useWallet: false,
      walletBalance: 0,
    });

    // 1000 + 0 (shipping free >= 500) + 10 (platform) + 0 (tax) = 1010
    expect(totals.taxAmount).toBe(0);
    expect(totals.preliminaryTotal).toBe(1010);
    expect(totals.total).toBe(1010);
  });

  it('handles shipping below threshold with zero tax', () => {
    const totals = computeOrderTotals({
      subtotal: 400,
      isCod: false,
      codFee: 0,
      freeShippingThreshold: 500,
      deliveryCharge: 50,
      platformFee: 10,
      taxAmount: 0,
      isTaxInclusive: true,
      useWallet: false,
      walletBalance: 0,
    });

    // 400 + 50 (shipping) + 10 (platform) = 460
    expect(totals.taxAmount).toBe(0);
    expect(totals.preliminaryTotal).toBe(460);
    expect(totals.total).toBe(460);
  });
});

describe('Settings Drift Immutability & Invoice Snapshot', () => {
  it('locks tax snapshot fields so snapshot is zero tax and immutable', async () => {
    const taxResult = TaxEngine.calculateTax({
      subtotal: 1000,
      discount: 0,
      customerState: 'AP',
      storeState: 'AP',
    });

    const orderTotals = {
      subtotal: 1000,
      discount: 0,
      shippingFee: 0,
      codFee: 0,
      walletDeduction: 0,
      total: 1000,
    };

    const invoicingMeta = {
      hsnCode: '',
      invoicePrefix: 'INV-2026-',
      invoiceFooter: 'Terms and conditions.',
    };

    const mockStoreSettings = {
      general: { storeName: "Akula's Kitchen" },
      legal: { companyName: "Akula's Kitchen Pvt Ltd", cin: 'U12345' },
      taxes: {
        gstEnabled: false,
        taxInclusive: false,
        gstRate: 0,
        cgstRate: 0,
        sgstRate: 0,
        gstNumber: '',
        hsnCode: '',
        invoicePrefix: 'INV-2026-',
        invoiceFooter: 'Terms and conditions.',
      },
    };

    vi.spyOn(storeSettingsService, 'getSettings').mockResolvedValue(mockStoreSettings as any);
    vi.spyOn(SequenceGeneratorService, 'generateInvoiceNumber').mockImplementation(
      async (prefix) => `${prefix}0001`,
    );

    const snapshots = await InvoiceService.generateOrderSnapshots(
      orderTotals,
      taxResult,
      invoicingMeta,
    );

    // Verify initial snapshot properties
    expect(snapshots.tax.gstRate).toBe(0);
    expect(snapshots.tax.cgstRate).toBe(0);
    expect(snapshots.tax.sgstRate).toBe(0);
    expect(snapshots.tax.taxableAmount).toBe(1000);
    expect(snapshots.tax.taxAmount).toBe(0);
    expect(snapshots.tax.totalTax).toBe(0);
    expect(snapshots.tax.gstEnabled).toBe(false);
    expect(snapshots.invoice.number).toMatch(/^INV-2026-/);
  });
});
