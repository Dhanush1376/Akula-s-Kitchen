import { describe, it, expect } from 'vitest';
import { calculateCartSummary, transformDbCart } from '../cartCalculations';

describe('calculateCartSummary', () => {
  it('sums purchase items with quantity', () => {
    const items = [
      { product: { price: 100 }, quantity: 2 },
      { product: { price: 50 }, quantity: 1 },
    ];
    expect(calculateCartSummary(items)).toEqual({
      subtotal: 250,
      shippingFee: 0,
      platformFee: 0,
      estimatedTax: 0,
      taxInclusive: false,
      gstEnabled: false,
      total: 250,
    });
  });

  it('adds shipping fee into the total only', () => {
    const items = [{ product: { price: 100 }, quantity: 1 }];
    const summary = calculateCartSummary(items, 49);
    expect(summary.subtotal).toBe(100);
    expect(summary.shippingFee).toBe(49);
    expect(summary.estimatedTax).toBe(0);
    expect(summary.total).toBe(149);
  });

  it('adds platform fee and shipping fee into the total only', () => {
    const items = [{ product: { price: 100 }, quantity: 1 }];
    const summary = calculateCartSummary(items, 49, 10);
    expect(summary.subtotal).toBe(100);
    expect(summary.shippingFee).toBe(49);
    expect(summary.platformFee).toBe(10);
    expect(summary.estimatedTax).toBe(0);
    expect(summary.total).toBe(159);
  });

  it('always enforces zero tax regardless of taxSettings', () => {
    const items = [{ product: { price: 118 }, quantity: 1 }];
    const summary = calculateCartSummary(items, 0, 0, {
      gstEnabled: true,
      taxInclusive: true,
      gstRate: 0.18,
    });
    expect(summary.subtotal).toBe(118);
    expect(summary.estimatedTax).toBe(0);
    expect(summary.gstEnabled).toBe(false);
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

  it('defaults variant to Default', () => {
    const [item] = transformDbCart([
      { product: { _id: 'p1', title: 'Idli Batter', price: 100 }, quantity: 1 },
    ]);
    expect(item.variant).toBe('Default');
    expect(item.price).toBe(100);
  });

  it('maps product properties accurately', () => {
    const [item] = transformDbCart([
      {
        product: {
          _id: 'p2',
          title: 'Mango Pickle',
          price: 1500,
          oldPrice: 2000,
          stock: 15,
          rating: 4.8,
          category: 'Pickles',
        },
        quantity: 3,
      },
    ]);
    expect(item.id).toBe('p2');
    expect(item.title).toBe('Mango Pickle');
    expect(item.price).toBe(1500);
    expect(item.oldPrice).toBe(2000);
    expect(item.stock).toBe(15);
    expect(item.rating).toBe(4.8);
    expect(item.category).toBe('Pickles');
    expect(item.quantity).toBe(3);
  });

  it('preserves configuredUnitPrice, selectedOptions, and signature-based unique IDs', () => {
    const rawItems = [
      {
        product: { _id: 'pickle1', title: 'Tomato Pickle', price: 1000 },
        configuredUnitPrice: 1800,
        configurationSignature: 'grp_weight:opt_1kg',
        selectedOptions: [
          {
            groupId: 'grp_weight',
            groupName: 'Weight',
            optionId: 'opt_1kg',
            optionLabel: '1 kg',
            priceAdjustment: 800,
          },
        ],
        quantity: 1,
      },
      {
        product: { _id: 'pickle1', title: 'Tomato Pickle', price: 1000 },
        configuredUnitPrice: 3400,
        configurationSignature: 'grp_weight:opt_2kg',
        selectedOptions: [
          {
            groupId: 'grp_weight',
            groupName: 'Weight',
            optionId: 'opt_2kg',
            optionLabel: '2 kg',
            priceAdjustment: 2400,
          },
        ],
        quantity: 2,
      },
    ];

    const result = transformDbCart(rawItems);
    expect(result).toHaveLength(2);

    // Line 1: 1kg
    expect(result[0].id).toBe('pickle1___grp_weight:opt_1kg');
    expect(result[0].productId).toBe('pickle1');
    expect(result[0].price).toBe(1800);
    expect(result[0].configuredUnitPrice).toBe(1800);
    expect(result[0].selectedOptions[0].optionLabel).toBe('1 kg');

    // Line 2: 2kg
    expect(result[1].id).toBe('pickle1___grp_weight:opt_2kg');
    expect(result[1].productId).toBe('pickle1');
    expect(result[1].price).toBe(3400);
    expect(result[1].configuredUnitPrice).toBe(3400);

    // Distinct configurations do NOT collide IDs
    expect(result[0].id).not.toBe(result[1].id);

    // Summary calculation sums configured prices correctly: 1800*1 + 3400*2 = 8600
    const summary = calculateCartSummary(result);
    expect(summary.subtotal).toBe(8600);
  });
});
