import { describe, it, expect } from 'vitest';
import { computeOrderTotals, OrderTotalsInput } from '../orderTotals';

const base: OrderTotalsInput = {
  subtotal: 1000,
  depositTotal: 0,
  isCod: false,
  codFee: 90,
  freeShippingThreshold: 2000,
  deliveryCharge: 100,
  useWallet: false,
  walletBalance: 0,
};

describe('computeOrderTotals', () => {
  it('applies flat shipping below the free-shipping threshold', () => {
    const t = computeOrderTotals({ ...base, subtotal: 1000 });
    expect(t.shippingFee).toBe(100);
    expect(t.total).toBe(1100);
  });

  it('gives free shipping at or above the threshold', () => {
    expect(computeOrderTotals({ ...base, subtotal: 2001 }).shippingFee).toBe(0);
    // Exactly at the threshold gets free shipping (>= rule)
    expect(computeOrderTotals({ ...base, subtotal: 2000 }).shippingFee).toBe(0);
    // Strictly below threshold pays shipping
    expect(computeOrderTotals({ ...base, subtotal: 1999 }).shippingFee).toBe(100);
  });

  it('charges shipping when enableFreeShipping is false even at or above threshold', () => {
    expect(
      computeOrderTotals({ ...base, subtotal: 2000, enableFreeShipping: false }).shippingFee,
    ).toBe(100);
    expect(
      computeOrderTotals({ ...base, subtotal: 5000, enableFreeShipping: false }).shippingFee,
    ).toBe(100);
  });

  it('charges zero shipping for an empty cart (subtotal === 0)', () => {
    const t = computeOrderTotals({ ...base, subtotal: 0 });
    expect(t.shippingFee).toBe(0);
    expect(t.total).toBe(0);
  });

  it('participates platformFee in preliminaryTotal and final payable total', () => {
    const t1 = computeOrderTotals({ ...base, subtotal: 1000, platformFee: 50 });
    // subtotal(1000) + shipping(100) + platformFee(50) = 1150
    expect(t1.platformFee).toBe(50);
    expect(t1.total).toBe(1150);

    const t2 = computeOrderTotals({ ...base, subtotal: 2000, platformFee: 25 });
    // subtotal(2000) + shipping(0) + platformFee(25) = 2025
    expect(t2.platformFee).toBe(25);
    expect(t2.total).toBe(2025);
  });

  it('adds the COD fee only for COD orders', () => {
    expect(computeOrderTotals({ ...base, isCod: true }).codFee).toBe(90);
    expect(computeOrderTotals({ ...base, isCod: false }).codFee).toBe(0);
    expect(computeOrderTotals({ ...base, subtotal: 1000, isCod: true }).total).toBe(
      1000 + 100 + 90,
    );
  });

  it('includes refundable deposits in the payable amount', () => {
    const t = computeOrderTotals({ ...base, subtotal: 1000, depositTotal: 500 });
    expect(t.total).toBe(1000 + 100 + 500);
  });

  it('always returns walletDeduction as 0 since wallet feature is retired', () => {
    const t = computeOrderTotals({
      ...base,
      subtotal: 1000,
      useWallet: true,
      walletBalance: 5000,
    });
    expect(t.walletDeduction).toBe(0);
    expect(t.total).toBe(1100); // 1000 + 100 shipping
  });

  it('composes platformFee with COD, shipping, and deposit correctly', () => {
    const t = computeOrderTotals({
      subtotal: 1500,
      depositTotal: 300,
      isCod: true,
      codFee: 90,
      freeShippingThreshold: 2000,
      deliveryCharge: 100,
      platformFee: 49,
      useWallet: true,
      walletBalance: 500,
    });
    // preliminary = 1500 + 100(shipping) + 49(platformFee) + 90(cod) + 300(deposit) = 2039
    expect(t.platformFee).toBe(49);
    expect(t.preliminaryTotal).toBe(2039);
    expect(t.walletDeduction).toBe(0);
    expect(t.total).toBe(2039);
  });
});
