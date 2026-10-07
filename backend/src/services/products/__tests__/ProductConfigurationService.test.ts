import { describe, it, expect } from 'vitest';
import {
  ProductConfigurationService,
  IProductOptionGroupConfig,
} from '../ProductConfigurationService';

describe('ProductConfigurationService', () => {
  const tomatoPickleProduct: { price: number; optionGroups: IProductOptionGroupConfig[] } = {
    price: 1000,
    optionGroups: [
      {
        groupId: 'grp_weight',
        name: 'Weight',
        type: 'SINGLE_SELECT',
        required: true,
        sortOrder: 0,
        options: [
          {
            optionId: 'opt_500g',
            label: '500 g',
            value: '500g',
            priceAdjustment: 0,
            available: true,
            isDefault: true,
            sortOrder: 0,
          },
          {
            optionId: 'opt_1kg',
            label: '1 kg',
            value: '1kg',
            priceAdjustment: 800,
            available: true,
            isDefault: false,
            sortOrder: 1,
          },
          {
            optionId: 'opt_2kg',
            label: '2 kg',
            value: '2kg',
            priceAdjustment: 2400,
            available: true,
            isDefault: false,
            sortOrder: 2,
          },
        ],
      },
      {
        groupId: 'grp_jar',
        name: 'Jar',
        type: 'SINGLE_SELECT',
        required: true,
        sortOrder: 1,
        options: [
          {
            optionId: 'opt_standard_jar',
            label: 'Standard Jar',
            value: 'standard',
            priceAdjustment: 0,
            available: true,
            isDefault: true,
            sortOrder: 0,
          },
          {
            optionId: 'opt_premium_jar',
            label: 'Premium Glass Jar',
            value: 'premium',
            priceAdjustment: 150,
            available: true,
            isDefault: false,
            sortOrder: 1,
          },
        ],
      },
      {
        groupId: 'grp_spice',
        name: 'Spice Level',
        type: 'SINGLE_SELECT',
        required: false,
        sortOrder: 2,
        options: [
          {
            optionId: 'opt_mild',
            label: 'Mild',
            value: 'mild',
            priceAdjustment: 0,
            available: true,
            isDefault: true,
            sortOrder: 0,
          },
          {
            optionId: 'opt_medium',
            label: 'Medium',
            value: 'medium',
            priceAdjustment: 50,
            available: true,
            isDefault: false,
            sortOrder: 1,
          },
          {
            optionId: 'opt_spicy',
            label: 'Spicy',
            value: 'spicy',
            priceAdjustment: 75,
            available: true,
            isDefault: false,
            sortOrder: 2,
          },
        ],
      },
      {
        groupId: 'grp_addons',
        name: 'Add-ons',
        type: 'MULTI_SELECT',
        required: false,
        minSelections: 0,
        maxSelections: 3,
        sortOrder: 3,
        options: [
          {
            optionId: 'opt_masala',
            label: 'Extra Masala',
            value: 'extra_masala',
            priceAdjustment: 100,
            available: true,
            isDefault: false,
            sortOrder: 0,
          },
          {
            optionId: 'opt_gift',
            label: 'Gift Packaging',
            value: 'gift_packaging',
            priceAdjustment: 200,
            available: true,
            isDefault: false,
            sortOrder: 1,
          },
          {
            optionId: 'opt_spoon',
            label: 'Wooden Spoon',
            value: 'wooden_spoon',
            priceAdjustment: 50,
            available: false, // unavailable option
            isDefault: false,
            sortOrder: 2,
          },
        ],
      },
    ],
  };

  it('1. Product without options adds normally at base price', () => {
    const productWithoutOptions = { price: 850, optionGroups: [] };
    const res = ProductConfigurationService.validateAndCalculateConfiguration(
      productWithoutOptions,
      [],
    );

    expect(res.isValid).toBe(true);
    expect(res.configuredUnitPrice).toBe(850);
    expect(res.basePrice).toBe(850);
    expect(res.selectedOptions).toEqual([]);
    expect(res.configurationSignature).toBe('default');
  });

  it('2. Product with required weight cannot be added without weight', () => {
    // Missing Weight selection
    const selections = [{ groupId: 'grp_jar', optionId: 'opt_standard_jar' }];
    const res = ProductConfigurationService.validateAndCalculateConfiguration(
      tomatoPickleProduct,
      selections,
    );

    expect(res.isValid).toBe(false);
    expect(res.errors).toContain('Option group "Weight" is required');
  });

  it('3. 500g calculates correctly (+₹0 => ₹1,000)', () => {
    const selections = [
      { groupId: 'grp_weight', optionId: 'opt_500g' },
      { groupId: 'grp_jar', optionId: 'opt_standard_jar' },
    ];
    const res = ProductConfigurationService.validateAndCalculateConfiguration(
      tomatoPickleProduct,
      selections,
    );

    expect(res.isValid).toBe(true);
    expect(res.configuredUnitPrice).toBe(1000);
    expect(res.basePrice).toBe(1000);
  });

  it('4. 1kg calculates correctly (+₹800 => ₹1,800)', () => {
    const selections = [
      { groupId: 'grp_weight', optionId: 'opt_1kg' },
      { groupId: 'grp_jar', optionId: 'opt_standard_jar' },
    ];
    const res = ProductConfigurationService.validateAndCalculateConfiguration(
      tomatoPickleProduct,
      selections,
    );

    expect(res.isValid).toBe(true);
    expect(res.configuredUnitPrice).toBe(1800);
  });

  it('5. 2kg calculates correctly (+₹2,400 => ₹3,400)', () => {
    const selections = [
      { groupId: 'grp_weight', optionId: 'opt_2kg' },
      { groupId: 'grp_jar', optionId: 'opt_standard_jar' },
    ];
    const res = ProductConfigurationService.validateAndCalculateConfiguration(
      tomatoPickleProduct,
      selections,
    );

    expect(res.isValid).toBe(true);
    expect(res.configuredUnitPrice).toBe(3400);
  });

  it('6 & 7. Full configuration: 1kg + Premium Jar + Spicy + Extra Masala = ₹2,125', () => {
    // Base 1000 + 800 (1kg) + 150 (Premium Jar) + 75 (Spicy) + 100 (Masala) = 2125
    const selections = [
      { groupId: 'grp_weight', optionId: 'opt_1kg' },
      { groupId: 'grp_jar', optionId: 'opt_premium_jar' },
      { groupId: 'grp_spice', optionId: 'opt_spicy' },
      { groupId: 'grp_addons', optionId: 'opt_masala' },
    ];
    const res = ProductConfigurationService.validateAndCalculateConfiguration(
      tomatoPickleProduct,
      selections,
    );

    expect(res.isValid).toBe(true);
    expect(res.configuredUnitPrice).toBe(2125);
    expect(res.selectedOptions).toHaveLength(4);
  });

  it('8. Single-select rejects multiple selections in same group', () => {
    const selections = [
      { groupId: 'grp_weight', optionId: 'opt_500g' },
      { groupId: 'grp_weight', optionId: 'opt_1kg' },
      { groupId: 'grp_jar', optionId: 'opt_standard_jar' },
    ];
    const res = ProductConfigurationService.validateAndCalculateConfiguration(
      tomatoPickleProduct,
      selections,
    );

    expect(res.isValid).toBe(false);
    expect(res.errors).toContain('Option group "Weight" only allows 1 selection');
  });

  it('9 & 10. minSelections and maxSelections bounds are enforced', () => {
    const productWithMin = {
      price: 1000,
      optionGroups: [
        {
          groupId: 'grp_box',
          name: 'Gift Box Items',
          type: 'MULTI_SELECT',
          required: true,
          minSelections: 2,
          maxSelections: 2,
          options: [
            { optionId: 'i1', label: 'Item 1', priceAdjustment: 0, available: true },
            { optionId: 'i2', label: 'Item 2', priceAdjustment: 0, available: true },
            { optionId: 'i3', label: 'Item 3', priceAdjustment: 0, available: true },
          ],
        },
      ],
    };

    // Only 1 selection when min is 2
    const resUnder = ProductConfigurationService.validateAndCalculateConfiguration(productWithMin, [
      { groupId: 'grp_box', optionId: 'i1' },
    ]);
    expect(resUnder.isValid).toBe(false);
    expect(resUnder.errors).toContain(
      'Option group "Gift Box Items" requires at least 2 selection(s)',
    );

    // 3 selections when max is 2
    const resOver = ProductConfigurationService.validateAndCalculateConfiguration(productWithMin, [
      { groupId: 'grp_box', optionId: 'i1' },
      { groupId: 'grp_box', optionId: 'i2' },
      { groupId: 'grp_box', optionId: 'i3' },
    ]);
    expect(resOver.isValid).toBe(false);
    expect(resOver.errors).toContain('Option group "Gift Box Items" allows at most 2 selection(s)');
  });

  it('11. Unavailable options cannot be selected', () => {
    const selections = [
      { groupId: 'grp_weight', optionId: 'opt_500g' },
      { groupId: 'grp_jar', optionId: 'opt_standard_jar' },
      { groupId: 'grp_addons', optionId: 'opt_spoon' }, // Wooden spoon is available: false
    ];
    const res = ProductConfigurationService.validateAndCalculateConfiguration(
      tomatoPickleProduct,
      selections,
    );

    expect(res.isValid).toBe(false);
    expect(res.errors).toContain('Option "Wooden Spoon" is currently unavailable');
  });

  it('12. Duplicate selections within group are rejected', () => {
    const selections = [
      { groupId: 'grp_weight', optionId: 'opt_500g' },
      { groupId: 'grp_jar', optionId: 'opt_standard_jar' },
      { groupId: 'grp_addons', optionId: 'opt_masala' },
      { groupId: 'grp_addons', optionId: 'opt_masala' },
    ];
    const res = ProductConfigurationService.validateAndCalculateConfiguration(
      tomatoPickleProduct,
      selections,
    );

    expect(res.isValid).toBe(false);
    expect(res.errors).toContain('Option "Extra Masala" was selected more than once');
  });

  it('13 & 14. Deterministic signature generation differentiates distinct configurations', () => {
    const confA = [
      { groupId: 'grp_weight', optionId: 'opt_500g' },
      { groupId: 'grp_jar', optionId: 'opt_standard_jar' },
    ];
    const confB = [
      { groupId: 'grp_weight', optionId: 'opt_1kg' },
      { groupId: 'grp_jar', optionId: 'opt_premium_jar' },
    ];
    // confA order reversed
    const confAReversed = [
      { groupId: 'grp_jar', optionId: 'opt_standard_jar' },
      { groupId: 'grp_weight', optionId: 'opt_500g' },
    ];

    const sigA = ProductConfigurationService.generateSignature(confA);
    const sigB = ProductConfigurationService.generateSignature(confB);
    const sigAReversed = ProductConfigurationService.generateSignature(confAReversed);

    // Identical configurations must generate identical signature regardless of insertion order
    expect(sigA).toBe(sigAReversed);
    // Different configurations must generate different signatures
    expect(sigA).not.toBe(sigB);
  });

  it('19 & 20. Server recalculates price from DB authority, ignoring any client price spoofing', () => {
    // Client sends spoofed priceAdjustment: 0 for 1kg
    const spoofedSelections = [
      { groupId: 'grp_weight', optionId: 'opt_1kg', priceAdjustment: 0 },
      { groupId: 'grp_jar', optionId: 'opt_standard_jar', priceAdjustment: 0 },
    ];

    const res = ProductConfigurationService.validateAndCalculateConfiguration(
      tomatoPickleProduct,
      spoofedSelections,
    );

    expect(res.isValid).toBe(true);
    // Server enforces official +800 adjustment
    expect(res.configuredUnitPrice).toBe(1800);
    expect(res.selectedOptions[0].priceAdjustment).toBe(800);
  });
});
