import { describe, it, expect } from 'vitest';
import {
  buildSitemapEntries,
  buildSitemapIndexXml,
  buildUrlsetXml,
} from '../../../src/services/seo/sitemapService';
import { buildFeedItems, buildFeedXml } from '../../../src/services/seo/merchantFeedService';
import {
  buildCategoryPage,
  buildContactPage,
  buildHomePage,
  buildMenuPage,
  buildProductPage,
  buildShopPage,
} from '../../../src/services/seo/pageSeoService';
import { SITE_URL } from '../../../src/config/seoConfig';

const cat = (slug: string, name: string) => ({
  _id: `cat-${slug}`,
  slug,
  name,
  isActive: true,
  updatedAt: '2026-10-01T00:00:00Z',
});
const categories = [cat('pickles', 'Pickles'), cat('batters', 'Batters'), cat('sweets', 'Sweets')];

const product = (slug: string, category: any, over: Record<string, any> = {}) => ({
  _id: `p-${slug}`,
  slug,
  title: slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
  sku: `SKU-${slug}`,
  description: `Description for ${slug}.`,
  price: 250,
  stock: 10,
  reservedStock: 0,
  isActive: true,
  isDeleted: false,
  imageSrc: `https://res.cloudinary.com/demo/image/upload/${slug}.jpg`,
  images: [],
  primaryCategory: category,
  updatedAt: '2026-10-20T10:00:00Z',
  ...over,
});

const products = [
  product('tomato-pickle', categories[0]),
  product('idli-batter', categories[1], { featured: true }),
  product('draft-pickle', categories[0], { isActive: false }),
  product('hidden-pickle', categories[0], { seoIndexable: false }),
  product('deleted-pickle', categories[0], { isDeleted: true }),
];

describe('sitemap', () => {
  const entries = buildSitemapEntries({
    products,
    categories,
    policies: [
      { slug: 'privacy-policy', status: 'published' },
      { slug: 'draft-policy', status: 'draft' },
    ],
  });
  const locs = entries.map((e) => e.loc);

  it('includes public pages, stocked categories and published products by slug', () => {
    expect(locs).toEqual(
      expect.arrayContaining([
        `${SITE_URL}/`,
        `${SITE_URL}/collections`,
        `${SITE_URL}/menu`,
        `${SITE_URL}/contact`,
        `${SITE_URL}/category/pickles`,
        `${SITE_URL}/category/batters`,
        `${SITE_URL}/product/tomato-pickle`,
        `${SITE_URL}/product/idli-batter`,
        `${SITE_URL}/policy/privacy-policy`,
      ]),
    );
  });

  it('excludes unpublished, noindex, deleted, empty-category and private URLs', () => {
    for (const bad of [
      'draft-pickle',
      'hidden-pickle',
      'deleted-pickle',
      'category/sweets',
      '/cart',
      '/checkout',
      '/admin',
      '/api',
      'draft-policy',
    ]) {
      expect(locs.some((l) => l.includes(bad))).toBe(false);
    }
    expect(new Set(locs).size).toBe(locs.length);
  });

  it('sets lastmod only from real timestamps', () => {
    expect(entries.find((e) => e.loc.endsWith('/menu'))!.lastmod).toBeUndefined();
    expect(entries.find((e) => e.loc.endsWith('/product/tomato-pickle'))!.lastmod).toBe(
      '2026-10-20T10:00:00Z',
    );
  });

  it('renders escaped XML and the index format', () => {
    const xml = buildUrlsetXml([{ loc: `${SITE_URL}/a?b=1&c=2`, images: ['https://x/y.jpg'] }]);
    expect(xml.startsWith('<?xml')).toBe(true);
    expect(xml).toContain('&amp;c=2');
    expect(xml).toContain('xmlns:image=');
    expect(buildSitemapIndexXml([{ loc: `${SITE_URL}/sitemap-1.xml` }])).toContain('<sitemapindex');
  });
});

describe('merchant feed', () => {
  it('emits one item per pack size with group id, INR price and availability', () => {
    const p = product('mango-pickle', categories[0], {
      optionGroups: [
        {
          name: 'Weight',
          type: 'SINGLE_SELECT',
          options: [
            { label: '250g', priceAdjustment: 0 },
            { label: '1kg', priceAdjustment: 300 },
          ],
        },
      ],
    });
    const items = buildFeedItems([p, products[2]]); // draft product is skipped
    expect(items).toHaveLength(2);
    expect(items[1]).toMatchObject({
      itemGroupId: 'SKU-mango-pickle',
      price: '550.00 INR',
      availability: 'in_stock',
      size: '1kg',
    });
    const xml = buildFeedXml(items);
    expect(xml).toContain('<g:condition>new</g:condition>');
    expect(xml).toContain(`<g:link>${SITE_URL}/product/mango-pickle</g:link>`);
  });
});

describe('page descriptors', () => {
  const data = {
    products: products.filter((p) => p.isActive && !p.isDeleted && p.seoIndexable !== false),
    categories,
    contact: {
      phone: '+91 8800775528',
      email: 'help@example.com',
      city: 'Noida',
      state: 'Uttar Pradesh',
      country: 'India',
    },
  };

  it('gives every public page a unique title, description and canonical', () => {
    const pages = [
      buildHomePage(data),
      buildShopPage(data, new URLSearchParams()),
      buildMenuPage(data),
      buildContactPage(data),
      buildCategoryPage(categories[0], data),
      buildCategoryPage(categories[1], data),
      buildProductPage(data.products[0], data),
    ];
    expect(new Set(pages.map((p) => p.head.title)).size).toBe(pages.length);
    expect(new Set(pages.map((p) => p.head.description)).size).toBe(pages.length);
    expect(new Set(pages.map((p) => p.head.canonical)).size).toBe(pages.length);
    for (const p of pages) {
      expect(p.head.robots).toMatch(/^index/);
      expect(p.bodyHtml).toMatch(/<h1>/);
    }
  });

  it('home Organization uses real settings and no invented data', () => {
    const org = buildHomePage(data).jsonLd.find((j) => j['@type'] === 'Organization')!;
    expect(org.address.addressLocality).toBe('Noida');
    expect(JSON.stringify(org)).not.toMatch(/geo|openingHours|Andhra|priceRange/);
  });

  it('product shell links to its category and siblings (no orphans)', () => {
    const page = buildProductPage(data.products[0], data);
    expect(page.bodyHtml).toContain('href="/category/pickles"');
    expect(page.head.ogType).toBe('product');
    expect(page.head.ogImage).toContain('w_1200,h_630');
    expect(page.jsonLd.map((j) => j['@type'])).toEqual(['Product', 'BreadcrumbList']);
  });

  it('noindexes empty categories and filtered shop views; canonicalises ?category=', () => {
    expect(buildCategoryPage(categories[2], data).head.robots).toBe('noindex, follow');
    expect(buildShopPage(data, new URLSearchParams('search=mango')).head.robots).toBe(
      'noindex, follow',
    );
    expect(buildShopPage(data, new URLSearchParams('category=Pickles')).head.canonical).toBe(
      `${SITE_URL}/category/pickles`,
    );
  });

  it('escapes HTML in the content shell', () => {
    const evil = { ...data.products[0], title: '<script>alert(1)</script>' };
    expect(buildProductPage(evil, data).bodyHtml).not.toContain('<script>');
  });
});
