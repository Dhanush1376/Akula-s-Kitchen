import { describe, it, expect } from 'vitest';
import { cleanRentalInfo, calculateCartSummary, transformDbCart } from '../cartCalculations';

describe('cleanRentalInfo', () => {
  it('returns undefined as rentals are decommissioned', () => {
    expect(cleanRentalInfo(undefined)).toBeUndefined();
    expect(cleanRentalInfo({})).toBeUndefined();
    expect(cleanRentalInfo({ startDate: '2026-07-01', endDate: '2026-07-05' })).toBeUndefined();
  });
});

describe('calculateCartSummary', () => {
  it('sums purchase items with quantity', () => {
    const items = [
      { product: { price: 100 }, quantity: 2 },
      { product: { price: 50 }, quantity: 1 },
    ];
    expect(calculateCartSummary(items, 'purchase')).toEqual({
      subtotal: 250,
      depositTotal: 0,
      shippingFee: 0,
      platformFee: 0,
      total: 250,
    });
  });

  it('adds shipping fee into the total only', () => {
    const items = [{ product: { price: 100 }, quantity: 1 }];
    const summary = calculateCartSummary(items, 'purchase', 49);
    expect(summary.subtotal).toBe(100);
    expect(summary.shippingFee).toBe(49);
    expect(summary.total).toBe(149);
  });

  it('adds platform fee and shipping fee into the total only', () => {
    const items = [{ product: { price: 100 }, quantity: 1 }];
    const summary = calculateCartSummary(items, 'purchase', 49, 10);
    expect(summary.subtotal).toBe(100);
    expect(summary.shippingFee).toBe(49);
    expect(summary.platformFee).toBe(10);
    expect(summary.total).toBe(159);
  });

  it('calculates tax correctly with taxSettings (inclusive)', () => {
    const items = [{ product: { price: 118 }, quantity: 1 }];
    const summary = calculateCartSummary(items, 'purchase', 0, 0, {
      gstEnabled: true,
      taxInclusive: true,
      gstRate: 0.18,
    });
    expect(summary.subtotal).toBe(118);
    expect(summary.estimatedTax).toBe(18);
    expect(summary.total).toBe(118);
  });

  it('calculates tax correctly with taxSettings (exclusive)', () => {
    const items = [{ product: { price: 100 }, quantity: 1 }];
    const summary = calculateCartSummary(items, 'purchase', 0, 0, {
      gstEnabled: true,
      taxInclusive: false,
      gstRate: 0.18,
    });
    expect(summary.subtotal).toBe(100);
    expect(summary.estimatedTax).toBe(18);
    expect(summary.total).toBe(118);
  });
});

describe('transformDbCart', () => {
  it('returns an empty array for null/undefined/non-array input', () => {
    expect(transformDbCart(null)).toEqual([]);
    expect(transformDbCart(undefined)).toEqual([]);
    expect(transformDbCart({})).toEqual([]);
  });

  it('drops items whose product reference failed to populate', () => {
    const items = [
      { product: null, quantity: 1 },
      { product: { _id: 'p1', title: 'Cookware', price: 100 }, quantity: 2 },
    ];
    const result = transformDbCart(items);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('p1');
    expect(result[0].quantity).toBe(2);
  });

  it('defaults type to purchase and variant to Default', () => {
    const [item] = transformDbCart([
      { product: { _id: 'p1', title: 'Cookware', price: 100 }, quantity: 1 },
    ]);
    expect(item.type).toBe('purchase');
    expect(item.variant).toBe('Default');
    expect(item.price).toBe(100);
  });

  it('maps product properties accurately', () => {
    const [item] = transformDbCart([
      {
        product: {
          _id: 'p2',
          title: 'Copper Pan',
          price: 1500,
          oldPrice: 2000,
          stock: 15,
          rating: 4.8,
          category: 'Cookware',
        },
        quantity: 3,
      },
    ]);
    expect(item.id).toBe('p2');
    expect(item.title).toBe('Copper Pan');
    expect(item.price).toBe(1500);
    expect(item.oldPrice).toBe(2000);
    expect(item.stock).toBe(15);
    expect(item.rating).toBe(4.8);
    expect(item.category).toBe('Cookware');
    expect(item.quantity).toBe(3);
    expect(item.deposit).toBe(0);
  });
});
