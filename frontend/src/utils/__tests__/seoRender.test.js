import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect } from 'vitest';
import {
  HEAD_END,
  HEAD_START,
  injectIntoTemplate,
  injectVerification,
  isPrivatePath,
  originalPathFromRequest,
  serializeJsonLd,
} from '../../../api/_lib/seoHtml.js';
import { getCategoryRoute, getProductRoute } from '../ecommerce/productRouteUtils';

const template = fs.readFileSync(path.resolve(__dirname, '../../../index.html'), 'utf8');

const productDescriptor = {
  status: 200,
  head: {
    title: "Homemade Mango Avakaaya Pickle | Akula's Kitchen",
    description:
      "Shop homemade Mango Avakaaya Pickle from Akula's Kitchen. Available in 250g and 1kg packs.",
    canonical: 'https://akulas.kitchen/product/mango-avakaaya',
    robots: 'index, follow, max-image-preview:large',
    ogType: 'product',
    ogTitle: "Mango Avakaaya Pickle | Akula's Kitchen",
    ogDescription: 'Shop homemade Mango Avakaaya Pickle.',
    ogUrl: 'https://akulas.kitchen/product/mango-avakaaya',
    ogImage:
      'https://res.cloudinary.com/demo/image/upload/c_fill,g_auto,w_1200,h_630,q_auto,f_jpg/m.jpg',
    ogImageWidth: 1200,
    ogImageHeight: 630,
    ogImageType: 'image/jpeg',
    ogImageAlt: 'Homemade Mango Avakaaya Pickle',
    productPrice: '500.00',
    productAvailability: 'in stock',
  },
  jsonLd: [{ '@context': 'https://schema.org', '@type': 'Product', name: 'Mango </script><b>' }],
  bodyHtml: '<main class="seo-shell"><h1>Mango Avakaaya</h1></main>',
};

describe('index.html template', () => {
  it('has replaceable SEO markers and no static canonical or JSON-LD', () => {
    expect(template).toContain(HEAD_START);
    expect(template).toContain(HEAD_END);
    expect(template).not.toMatch(/rel="canonical"/);
    expect(template).not.toMatch(/application\/ld\+json/);
    expect(template).toMatch(/<div id="root"><\/div>/);
  });
});

describe('injectIntoTemplate', () => {
  const html = injectIntoTemplate(template, productDescriptor, { verification: 'TOKEN123' });

  it('replaces the default head with exactly one set of page tags', () => {
    expect(html.match(/<title/g)).toHaveLength(1);
    expect(html.match(/name="description"/g)).toHaveLength(1);
    expect(html.match(/rel="canonical"/g)).toHaveLength(1);
    expect(html).toContain(
      '<link rel="canonical" href="https://akulas.kitchen/product/mango-avakaaya" data-seo-ssr>',
    );
    expect(html).toContain('property="og:type" content="product"');
    expect(html).toContain('property="og:image:width" content="1200"');
    expect(html).toContain('property="product:price:currency" content="INR"');
    expect(html).toContain('name="google-site-verification" content="TOKEN123"');
    expect(html).toContain('Akula&#39;s Kitchen');
  });

  it('serialises JSON-LD safely inside <script>', () => {
    expect(html).not.toContain('</script><b>');
    const json = html.match(/<script type="application\/ld\+json" data-seo-ssr>(.*?)<\/script>/)[1];
    expect(JSON.parse(json).name).toBe('Mango </script><b>');
    expect(serializeJsonLd({ a: '<' })).toBe('{"a":"\\u003c"}');
  });

  it('seeds #root with the crawlable shell marked for removal', () => {
    expect(html).toContain(
      '<div id="root"><div data-seo-shell><main class="seo-shell"><h1>Mango Avakaaya</h1>',
    );
  });

  it('adds only the verification tag to plain pages', () => {
    const plain = injectVerification(template, 'TOKEN123');
    expect(plain.match(/google-site-verification/g)).toHaveLength(1);
    expect(injectVerification(template, '')).toBe(template);
  });
});

describe('request helpers', () => {
  it('rebuilds the original path and query from the rewrite', () => {
    expect(originalPathFromRequest('/api/seo-render?__path=/product/mango&utm=x')).toEqual({
      pathname: '/product/mango',
      path: '/product/mango?utm=x',
    });
    expect(originalPathFromRequest('/api/seo-render?__path=/').path).toBe('/');
  });

  it('recognises private routes', () => {
    for (const p of ['/cart', '/checkout', '/dashboard/orders', '/admin/products', '/track/123']) {
      expect(isPrivatePath(p)).toBe(true);
    }
    for (const p of ['/', '/collections', '/product/cart-thing', '/category/pickles']) {
      expect(isPrivatePath(p)).toBe(false);
    }
  });
});

describe('product and category routes', () => {
  it('prefers slugs and encodes ids', () => {
    expect(getProductRoute({ slug: 'mango-avakaaya', _id: 'abc' })).toBe('/product/mango-avakaaya');
    expect(getProductRoute({ _id: '6ac4ba5658b53ac90876a53b' })).toBe(
      '/product/6ac4ba5658b53ac90876a53b',
    );
    expect(getProductRoute('idli-batter')).toBe('/product/idli-batter');
  });

  it('builds category landing URLs from names or objects', () => {
    expect(getCategoryRoute('Pickles')).toBe('/category/pickles');
    expect(getCategoryRoute({ name: 'Podis & Masala' })).toBe('/category/podis-and-masala');
    expect(getCategoryRoute({ slug: 'masala', name: 'Masala' })).toBe('/category/masala');
    expect(getCategoryRoute('')).toBe('/collections');
  });
});
