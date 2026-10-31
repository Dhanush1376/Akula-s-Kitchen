import { describe, it, expect } from 'vitest';
import {
  applyProductSeo,
  buildProductJsonLd,
  generateProductSeo,
  getPackOptions,
  resolveProductSeo,
  sanitizeCanonicalOverride,
  slugify,
} from '../../../src/services/seo/productSeo';
import { SEO_LIMITS, SITE_URL } from '../../../src/config/seoConfig';

const pickles = { _id: 'c1', name: 'Pickles', slug: 'pickles' };

// Mirrors the live "Mango Avakaaya" product (description, tags, weight options).
const mango = (over: Record<string, any> = {}) => ({
  _id: '6ac4ba5658b53ac90876a53b',
  title: 'Mango Avakaaya',
  slug: 'mango-avakaaya',
  sku: 'PRD-638890-670',
  primaryCategory: pickles,
  description:
    'Tangy and spicy mango pickle made with authentic Andhra spices. Perfect accompaniment for rice, rotis, and festive meals.',
  price: 500,
  stock: 50,
  reservedStock: 0,
  isActive: true,
  imageSrc: 'https://res.cloudinary.com/demo/image/upload/v1/akulas-kitchen/products/mango.jpg',
  images: ['https://res.cloudinary.com/demo/image/upload/v1/akulas-kitchen/products/mango-2.jpg'],
  tags: ['Spicy', 'Homemade', 'Avakaya', 'Mango Pickle', '500g'],
  optionGroups: [
    {
      name: 'Weight',
      type: 'SINGLE_SELECT',
      required: true,
      options: [
        { label: '250g', priceAdjustment: 0, available: true, sortOrder: 0 },
        { label: '500g', priceAdjustment: 100, available: true, sortOrder: 1 },
        { label: '1kg', priceAdjustment: 200, available: false, sortOrder: 2 },
      ],
    },
  ],
  ...over,
});

describe('slugify', () => {
  it('produces lowercase hyphenated slugs within the length limit', () => {
    expect(slugify("Akula's Mango Pickle (Avakaya)")).toBe('akulas-mango-pickle-avakaya');
    expect(slugify('  Idli & Dosa  Batter ')).toBe('idli-and-dosa-batter');
    expect(slugify('x'.repeat(200)).length).toBeLessThanOrEqual(SEO_LIMITS.slugMax);
  });
});

describe('generateProductSeo', () => {
  it('builds title, description, keywords and alt text from real product data', () => {
    const seo = generateProductSeo(mango());
    expect(seo.seoTitle).toBe("Homemade Mango Avakaaya Pickle | Akula's Kitchen");
    expect(seo.seoTitle.length).toBeLessThanOrEqual(SEO_LIMITS.titleMax);
    expect(seo.seoDescription).toContain('Tangy and spicy mango pickle');
    expect(seo.seoDescription).toContain('250g, 500g and 1kg');
    expect(seo.seoDescription.length).toBeLessThanOrEqual(SEO_LIMITS.descriptionMax);
    expect(seo.seoDescription).not.toMatch(/\.\.\.|…/);
    expect(seo.seoFocusKeyword).toBe('mango avakaaya pickle');
    expect(seo.seoKeywords).not.toContain('500g');
    expect(seo.seoImageAlt).toBe("Homemade Mango Avakaaya Pickle from Akula's Kitchen");
    expect(seo.seoOgImage).toContain('/upload/c_fill,g_auto,w_1200,h_630,q_auto,f_jpg/');
  });

  it('adds no qualifier or noun the category config does not define', () => {
    const seo = generateProductSeo({
      ...mango(),
      title: 'Cashews W240',
      primaryCategory: { name: 'Cashews', slug: 'cashews' },
      optionGroups: [],
    });
    expect(seo.seoTitle).toBe("Cashews W240 | Akula's Kitchen");
    expect(seo.seoDescription).not.toMatch(/homemade|organic|healthy/i);
  });
});

describe('applyProductSeo (override tracking)', () => {
  it('fills every SEO field automatically on create', () => {
    const data: any = mango();
    applyProductSeo(data, null);
    expect(data.seoTitle).toBe("Homemade Mango Avakaaya Pickle | Akula's Kitchen");
    expect(data.seoOverrides).toEqual([]);
  });

  it('keeps a manual value through ordinary updates and regenerates the rest', () => {
    const created: any = applyProductSeo(mango(), null);
    const edit: any = applyProductSeo({ seoTitle: 'Avakaya Mango Pickle Online | AK' }, created);
    expect(edit.seoOverrides).toEqual(['seoTitle']);
    const stored = { ...created, ...edit };

    const renamed: any = applyProductSeo({ title: 'Classic Mango Avakaaya' }, stored);
    expect(renamed.seoTitle).toBeUndefined(); // custom value is not touched
    expect(renamed.seoImageAlt).toContain('Classic Mango Avakaaya');
    expect(renamed.seoOverrides).toEqual(['seoTitle']);
  });

  it('returns a field to automatic when sent empty and ignores client-sent override lists', () => {
    const stored: any = { ...mango(), seoTitle: 'Custom', seoOverrides: ['seoTitle'] };
    const update: any = applyProductSeo({ seoTitle: '', seoOverrides: ['seoDescription'] }, stored);
    expect(update.seoTitle).toBe("Homemade Mango Avakaaya Pickle | Akula's Kitchen");
    expect(update.seoOverrides).toEqual([]);
  });

  it('treats legacy stored SEO values (no override list) as automatic at read time', () => {
    const legacy = mango({ seoTitle: 'Mango Avakaaya | Akula', seoDescription: 'Tangy....' });
    expect(resolveProductSeo(legacy).seoDescription).not.toBe('Tangy....');
  });

  it('only accepts same-site canonical overrides', () => {
    expect(sanitizeCanonicalOverride('https://evil.example/x')).toBe('');
    expect(sanitizeCanonicalOverride(`${SITE_URL}/product/foo/`)).toBe(`${SITE_URL}/product/foo`);
  });
});

describe('buildProductJsonLd', () => {
  it('emits a ProductGroup with one priced Offer per pack size', () => {
    const ld = buildProductJsonLd(mango());
    expect(ld['@type']).toBe('ProductGroup');
    expect(ld.productGroupID).toBe('PRD-638890-670');
    expect(ld.hasVariant).toHaveLength(3);
    const [small, medium, large] = ld.hasVariant;
    expect(small.offers).toMatchObject({ price: '500.00', priceCurrency: 'INR' });
    expect(medium.offers.price).toBe('600.00');
    expect(small.offers.availability).toBe('https://schema.org/InStock');
    expect(large.offers.availability).toBe('https://schema.org/OutOfStock'); // option unavailable
    expect(small.offers.url).toBe(`${SITE_URL}/product/mango-avakaaya`);
    expect(ld.aggregateRating).toBeUndefined(); // no real reviews
    expect(JSON.stringify(ld)).not.toMatch(/priceValidUntil|"review"/);
  });

  it('reflects price updates and real inventory', () => {
    const ld = buildProductJsonLd(mango({ price: 550, stock: 3, reservedStock: 3 }));
    expect(ld.hasVariant[0].offers.price).toBe('550.00');
    for (const v of ld.hasVariant)
      expect(v.offers.availability).toBe('https://schema.org/OutOfStock');
  });

  it('uses a single Product+Offer without pack options and adds ratings only when real', () => {
    const ld = buildProductJsonLd(mango({ optionGroups: [], rating: 4.5, reviews: 6 }));
    expect(ld['@type']).toBe('Product');
    expect(ld.offers.price).toBe('500.00');
    expect(ld.aggregateRating).toMatchObject({ ratingValue: 4.5, reviewCount: 6 });
  });

  it('derives pack prices from base price plus adjustment', () => {
    expect(getPackOptions(mango()).map((p) => p.price)).toEqual([500, 600, 700]);
  });
});

describe('resolveProductSeo', () => {
  it('noindexes unpublished or opted-out products', () => {
    expect(resolveProductSeo(mango()).robots).toMatch(/^index/);
    expect(resolveProductSeo(mango({ isActive: false })).robots).toBe('noindex, follow');
    expect(resolveProductSeo(mango({ seoIndexable: false })).indexable).toBe(false);
  });

  it('generates distinct alt text per image', () => {
    const alts = resolveProductSeo(mango()).imageAlts;
    expect(alts).toHaveLength(2);
    expect(new Set(alts).size).toBe(alts.length);
  });
});
