import { describe, it, expect } from 'vitest';
import {
  canonicalWeightLabel,
  isWeightLabel,
  weightInGrams,
  weightMatchRegex,
} from '../../src/utils/weightLabel';

describe('weight labels', () => {
  it('gives one canonical label per weight', () => {
    expect(canonicalWeightLabel('1 Kg')).toBe('1kg');
    expect(canonicalWeightLabel('1kg')).toBe('1kg');
    expect(canonicalWeightLabel('2 kgs')).toBe('2kg');
    expect(canonicalWeightLabel('500 GM')).toBe('500g');
    expect(canonicalWeightLabel('1.50 Ltr')).toBe('1.5l');
    expect(canonicalWeightLabel('Spicy')).toBe('Spicy');
  });

  it('matches every spelling of a weight when filtering', () => {
    const kg = weightMatchRegex('1kg')!;
    for (const s of ['1kg', '1 Kg', '1KGS', '1 kilo', '1.0 kg']) expect(kg.test(s)).toBe(true);
    for (const s of ['11kg', '1g', '10 kg', '1.5kg']) expect(kg.test(s)).toBe(false);
    expect(weightMatchRegex('1.5kg')!.test('1.50 Kg')).toBe(true);
    expect(weightMatchRegex('Spicy')).toBeNull();
  });

  it('sorts by actual weight', () => {
    expect(isWeightLabel('250 grams')).toBe(true);
    expect(isWeightLabel('Mango')).toBe(false);
    const sorted = ['2 kg', '500g', '1 Kg', '200g'].sort(
      (a, b) => weightInGrams(a) - weightInGrams(b),
    );
    expect(sorted).toEqual(['200g', '500g', '1 Kg', '2 kg']);
  });
});
