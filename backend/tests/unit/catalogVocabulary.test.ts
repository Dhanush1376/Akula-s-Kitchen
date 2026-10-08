import { describe, it, expect } from 'vitest';
import {
  analyzeWithVocabulary,
  buildVocabulary,
  correctQuery,
  normalizeSearchText,
  parseWeightIntent,
  parseWeightLabel,
} from '../../src/services/search/catalogVocabulary';

const weightGroup = (labels: string[], unavailable: string[] = []) => [
  {
    name: 'Weight',
    options: labels.map((label) => ({
      label,
      value: label,
      available: !unavailable.includes(label),
    })),
  },
];

const vocab = buildVocabulary({
  categories: [
    { _id: 'c1', name: 'Pickles', slug: 'pickles' },
    { _id: 'c2', name: 'Batters', slug: 'batters' },
    { _id: 'c3', name: 'Sweets', slug: 'sweets' },
  ],
  products: [
    {
      _id: 'p1',
      title: 'Mango Avakaaya',
      slug: 'mango-avakaaya',
      primaryCategory: 'c1',
      tags: ['Avakaya', 'Mamidi Achar', 'Aam Ka Achar', 'Spicy', 'Breakfast'],
      stock: 10,
      optionGroups: weightGroup(['250g', '500g', '1kg']),
    },
    {
      _id: 'p2',
      title: 'Tomato Pickle',
      slug: 'tomato-pickle',
      primaryCategory: 'c1',
      tags: ['Tomato Pachadi', 'Spicy', 'Breakfast'],
      stock: 0,
      optionGroups: weightGroup(['250g', '500g', '1kg']),
    },
    {
      _id: 'p3',
      title: 'Dosa Batter',
      slug: 'dosa-batter',
      primaryCategory: 'c2',
      tags: ['Dosa Mix', 'Breakfast'],
      stock: 5,
      optionGroups: weightGroup(['500g', '1kg', '2kg'], ['2kg']),
    },
    {
      _id: 'p4',
      title: 'Appam Batter',
      slug: 'appam-batter',
      primaryCategory: 'c2',
      tags: ['Appam Mix', 'Breakfast'],
      stock: 5,
      optionGroups: weightGroup(['500 gms', '1 Kg']),
    },
  ],
  synonyms: [{ terms: ['idli', 'idly', 'iddly'] }],
});

const titles = (q: string) => analyzeWithVocabulary(q, vocab).products.map((p) => p.title);

describe('catalogVocabulary', () => {
  it('normalizes case, accents, punctuation and glued numbers', () => {
    expect(normalizeSearchText('  Dosa-BATTER!! ')).toBe('dosa batter');
    expect(normalizeSearchText('dosa500')).toBe('dosa 500');
    expect(normalizeSearchText('1.5kg')).toBe('1.5kg');
    expect(normalizeSearchText('a'.repeat(500)).length).toBeLessThanOrEqual(100);
  });

  it('reads weight labels the way admins type them', () => {
    expect(parseWeightLabel('250g')).toBe(250);
    expect(parseWeightLabel('1 Kg')).toBe(1000);
    expect(parseWeightLabel('500 gms')).toBe(500);
    expect(parseWeightLabel('1.5kg')).toBe(1500);
    expect(parseWeightLabel('Glass')).toBeNull();
  });

  it('finds weight intent only for sizes that exist', () => {
    expect(parseWeightIntent('dosa 500', vocab.weightGrams)).toMatchObject({
      grams: 500,
      residual: 'dosa',
    });
    expect(parseWeightIntent('1kg', vocab.weightGrams)?.label).toBe('1kg');
    expect(parseWeightIntent('half kg pickle', vocab.weightGrams)).toMatchObject({
      grams: 500,
      residual: 'pickle',
    });
    // No 3kg or 7g pack exists, so a bare number is just a number
    expect(parseWeightIntent('dosa 3', vocab.weightGrams)).toBeNull();
    expect(parseWeightIntent('dosa 7', vocab.weightGrams)).toBeNull();
  });

  it('corrects misspellings with a confidence level', () => {
    expect(correctQuery('mngo', vocab)).toMatchObject({ corrected: 'mango', level: 'high' });
    expect(correctQuery('tomto pikle', vocab).corrected).toBe('tomato pickle');
    expect(correctQuery('avkaya', vocab).corrected).toBe('avakaya');
    expect(correctQuery('dosa', vocab).level).toBe('none');
    expect(correctQuery('xqzv', vocab).level).toBe('none');
  });

  it('matches single letters on names only', () => {
    expect(titles('d')).toEqual(['Dosa Batter']);
    expect(titles('a').sort()).toEqual(['Appam Batter', 'Mango Avakaaya']);
    expect(titles('t')).toEqual(['Tomato Pickle']);
  });

  it('matches typos, tags and word order', () => {
    expect(titles('avkaya')[0]).toBe('Mango Avakaaya');
    expect(titles('aam ka achar')[0]).toBe('Mango Avakaaya');
    expect(titles('batter dosa')[0]).toBe('Dosa Batter');
  });

  it('applies weight intent and never invents sizes', () => {
    const a = analyzeWithVocabulary('dosa 500g', vocab);
    expect(a.intent).toBe('product_weight');
    expect(a.products[0]).toMatchObject({ title: 'Dosa Batter', matchedWeight: '500g' });
    // 2kg is listed but unavailable, so it is not offered
    expect(a.weights.map((w) => w.label)).toEqual(['500g', '1kg']);

    const weightOnly = analyzeWithVocabulary('500g', vocab);
    expect(weightOnly.intent).toBe('weight');
    expect(weightOnly.products.every((p) => p.matchedWeight === '500g')).toBe(true);
  });

  it('ranks in-stock products above out-of-stock ones', () => {
    expect(titles('pickles')).toEqual(['Mango Avakaaya', 'Tomato Pickle']);
    const out = analyzeWithVocabulary('tomato', vocab).products[0];
    expect(out).toMatchObject({ title: 'Tomato Pickle', inStock: false });
  });

  it('recognises category intent and skips empty categories', () => {
    const a = analyzeWithVocabulary('pickles', vocab);
    expect(a.intent).toBe('category');
    expect(a.categories[0]).toMatchObject({ name: 'Pickles', productCount: 2 });
    expect(analyzeWithVocabulary('sweets', vocab).categories).toEqual([]);
  });

  it('falls back to popular in-stock products when nothing matches', () => {
    const a = analyzeWithVocabulary('ewve', vocab);
    expect(a.fallback).toBe(true);
    expect(a.total).toBe(0);
    expect(a.intent).toBe('unknown');
    expect(a.products.every((p) => p.inStock)).toBe(true);
  });

  it('only suggests related terms that share a word with the query', () => {
    const related = analyzeWithVocabulary('achar', vocab).related.map((r) => r.toLowerCase());
    expect(related).toContain('aam ka achar');
    expect(related).not.toContain('breakfast');
  });

  it('treats regex characters as plain text', () => {
    expect(() => analyzeWithVocabulary('.*(dosa[', vocab)).not.toThrow();
    expect(titles('.*(dosa[')[0]).toBe('Dosa Batter');
  });
});
