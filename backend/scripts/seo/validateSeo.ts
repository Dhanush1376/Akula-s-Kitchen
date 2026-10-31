/**
 * SEO validation against the real catalogue.
 *
 *   npm run seo:validate                      # live public API (read-only)
 *   SEO_SOURCE=https://staging.example.com npm run seo:validate
 *   SEO_FIXTURE=path/to/catalog.json npm run seo:validate   # offline
 *
 * Fetches only public, read-only endpoints (products, categories, public
 * settings), then runs the same builders the backend uses for page metadata,
 * JSON-LD, sitemap and Merchant feed, renders the final crawler HTML through
 * the storefront's renderer, and checks for:
 *   missing/duplicate titles and descriptions, missing canonicals, invalid
 *   JSON-LD, missing product structured data or alt text, duplicate slugs,
 *   unintended noindex, availability that disagrees with stock, orphaned
 *   products, and sitemap URLs that do not resolve to an indexable page.
 * Exits non-zero when any error is found.
 */
import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';
import {
  buildCategoryPage,
  buildContactPage,
  buildHomePage,
  buildMenuPage,
  buildProductPage,
  buildShopPage,
  CatalogData,
  PageSeoDescriptor,
} from '../../src/services/seo/pageSeoService';
import { buildSitemapEntries, buildUrlsetXml } from '../../src/services/seo/sitemapService';
import { buildFeedItems } from '../../src/services/seo/merchantFeedService';
import { isProductInStock, isProductPublic } from '../../src/services/seo/productSeo';
import { SEO_LIMITS, SITE_URL } from '../../src/config/seoConfig';

type Issue = { level: 'error' | 'warn'; page: string; message: string };
const issues: Issue[] = [];
const error = (page: string, message: string) => issues.push({ level: 'error', page, message });
const warn = (page: string, message: string) => issues.push({ level: 'warn', page, message });

const SOURCE = (process.env.SEO_SOURCE || 'https://akulas.kitchen').replace(/\/+$/, '');

async function getJson(url: string) {
  const res = await fetch(url, { headers: { accept: 'application/json' } });
  if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}`);
  return res.json();
}

async function loadCatalog(): Promise<CatalogData> {
  if (process.env.SEO_FIXTURE) {
    return JSON.parse(fs.readFileSync(process.env.SEO_FIXTURE, 'utf8'));
  }
  const [products, categories, settings] = await Promise.all([
    getJson(`${SOURCE}/api/v1/products?limit=500`),
    getJson(`${SOURCE}/api/v1/categories/active`),
    getJson(`${SOURCE}/api/v1/settings/public`).catch(() => ({ data: {} })),
  ]);
  const list: any[] = products?.data?.data || products?.data || [];
  // The listing omits descriptions; fetch each product's detail (public endpoint).
  const detailed = await Promise.all(
    list.map(async (p) => {
      try {
        const d = await getJson(`${SOURCE}/api/v1/products/${encodeURIComponent(p.slug || p._id)}`);
        return { ...p, ...d.data };
      } catch {
        return p;
      }
    }),
  );
  const c = settings?.data?.contact || {};
  return {
    products: detailed.filter((p) => isProductPublic(p) && p.seoIndexable !== false),
    categories: categories?.data || [],
    contact: {
      storeName: settings?.data?.general?.storeName,
      phone: c.phone,
      alternatePhone: c.alternatePhone,
      email: c.email,
      address: c.address,
      city: c.city,
      state: c.state,
      country: c.country,
      postalCode: c.postalCode,
    },
  };
}

const REQUIRED_PRODUCT_FIELDS = ['name', 'image', 'description', 'brand'];

function checkJsonLd(page: string, jsonLd: any[], productExpected: any | null) {
  for (const ld of jsonLd) {
    try {
      JSON.parse(JSON.stringify(ld));
    } catch {
      error(page, 'JSON-LD is not serialisable');
    }
    if (!ld['@context'] || !ld['@type']) error(page, 'JSON-LD missing @context or @type');
    const text = JSON.stringify(ld);
    if (/priceValidUntil|"@type":"Review"|openingHours|"geo"/.test(text)) {
      error(page, 'JSON-LD contains unverified fields (priceValidUntil/Review/openingHours/geo)');
    }
  }
  if (!productExpected) return;
  const product = jsonLd.find((j) => j['@type'] === 'Product' || j['@type'] === 'ProductGroup');
  if (!product) return error(page, 'missing Product/ProductGroup structured data');
  if (product.aggregateRating) {
    const stored = Number(productExpected.reviews) || 0;
    if (product.aggregateRating.reviewCount !== stored || stored < 1) {
      error(page, 'aggregateRating does not match the stored approved review count');
    } else {
      warn(
        page,
        `aggregateRating from ${stored} approved review(s): ensure reviews are visible on the page`,
      );
    }
  }
  for (const f of REQUIRED_PRODUCT_FIELDS)
    if (!product[f] || product[f].length === 0) error(page, `Product JSON-LD missing ${f}`);
  const offers = product.hasVariant
    ? product.hasVariant.map((v: any) => v.offers)
    : [product.offers];
  const inStock = isProductInStock(productExpected);
  for (const o of offers) {
    if (!o || !o.price || o.priceCurrency !== 'INR' || !o.availability) {
      error(page, 'Offer missing price, INR currency or availability');
      continue;
    }
    if (!inStock && /InStock$/.test(o.availability))
      error(page, 'Offer says InStock but sellable stock is 0');
    if (o.url !== `${SITE_URL}/product/${productExpected.slug}`)
      error(page, `Offer url is not canonical: ${o.url}`);
  }
}

function checkHead(page: string, d: PageSeoDescriptor) {
  const h = d.head;
  if (!h.title) error(page, 'missing title');
  else if (h.title.length > 70) warn(page, `title is ${h.title.length} chars`);
  if (!h.description) error(page, 'missing meta description');
  else if (h.description.length > SEO_LIMITS.descriptionMax)
    warn(page, `description is ${h.description.length} chars`);
  else if (h.description.length < SEO_LIMITS.descriptionMin)
    warn(page, `description is only ${h.description.length} chars`);
  if (/\.\.\.\.?$|…$/.test(h.description || ''))
    error(page, 'description ends in a truncation ellipsis');
  if (!h.canonical) error(page, 'missing canonical');
  else if (!h.canonical.startsWith(SITE_URL))
    error(page, `canonical not on ${SITE_URL}: ${h.canonical}`);
  if (!h.ogImage) error(page, 'missing og:image');
  if (!h.ogImageAlt) warn(page, 'missing og:image:alt');
  if (!/<h1>/.test(d.bodyHtml)) error(page, 'content shell has no <h1>');
}

async function main() {
  const data = await loadCatalog();
  console.log(`Source: ${process.env.SEO_FIXTURE || SOURCE}`);
  console.log(
    `Catalogue: ${data.products.length} public products, ${data.categories.length} active categories\n`,
  );

  // Duplicate slugs
  const slugCounts = new Map<string, number>();
  for (const p of data.products) slugCounts.set(p.slug, (slugCounts.get(p.slug) || 0) + 1);
  for (const [slug, n] of slugCounts)
    if (n > 1) error(`/product/${slug}`, `slug used by ${n} products`);
  for (const p of data.products)
    if (!p.slug || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(p.slug))
      error(`product ${p._id}`, `non-canonical slug "${p.slug}"`);

  const pages = new Map<string, { d: PageSeoDescriptor; product?: any }>();
  pages.set('/', { d: buildHomePage(data) });
  pages.set('/collections', { d: buildShopPage(data, new URLSearchParams()) });
  pages.set('/menu', { d: buildMenuPage(data) });
  pages.set('/contact', { d: buildContactPage(data) });
  for (const c of data.categories)
    pages.set(`/category/${c.slug}`, { d: buildCategoryPage(c, data) });
  for (const p of data.products)
    pages.set(`/product/${p.slug}`, { d: buildProductPage(p, data), product: p });

  // Per-page checks
  const indexable = [...pages].filter(([, v]) => !/noindex/.test(v.d.head.robots));
  for (const [url, { d, product }] of pages) {
    if (/noindex/.test(d.head.robots)) {
      const isEmptyCategory =
        url.startsWith('/category/') && /No products are available/.test(d.bodyHtml);
      if (isEmptyCategory) warn(url, 'noindex: category has no products (intended)');
      else error(url, `public page is noindex (${d.head.robots})`);
      continue;
    }
    checkHead(url, d);
    checkJsonLd(url, d.jsonLd, product || null);
    if (product) {
      if (!d.head.ogImageAlt) error(url, 'missing primary image alt text');
      if (/<img [^>]*alt=""/.test(d.bodyHtml)) error(url, 'product image has empty alt');
    }
  }

  // Duplicates across indexable pages
  for (const field of ['title', 'description', 'canonical'] as const) {
    const seen = new Map<string, string>();
    for (const [url, { d }] of indexable) {
      const v = d.head[field];
      if (!v) continue;
      if (seen.has(v)) error(url, `duplicate ${field} (also on ${seen.get(v)})`);
      else seen.set(v, url);
    }
  }

  // Orphans: every product must be linked from a category or the shop shell
  const linkSources = ['/collections', ...data.categories.map((c) => `/category/${c.slug}`)]
    .map((u) => pages.get(u)?.d.bodyHtml || '')
    .join('\n');
  for (const p of data.products) {
    if (!linkSources.includes(`href="/product/${p.slug}"`))
      error(`/product/${p.slug}`, 'orphaned: not linked from shop or any category page');
  }

  // Sitemap: every <loc> must map to an indexable page we generated
  const entries = buildSitemapEntries({ products: data.products, categories: data.categories });
  const xml = buildUrlsetXml(entries);
  for (const e of entries) {
    const rel = e.loc.replace(SITE_URL, '') || '/';
    const page = pages.get(rel === '' ? '/' : rel);
    if (!e.loc.startsWith(`${SITE_URL}/`)) error(e.loc, 'sitemap URL not on the canonical host');
    else if (!page) error(e.loc, 'sitemap URL has no page');
    else if (/noindex/.test(page.d.head.robots)) error(e.loc, 'sitemap lists a noindex page');
    else if (page.d.head.canonical !== e.loc)
      error(e.loc, `sitemap URL differs from canonical ${page.d.head.canonical}`);
  }
  for (const [url] of indexable) {
    if (!entries.some((e) => (e.loc.replace(SITE_URL, '') || '/') === url))
      warn(url, 'indexable page missing from sitemap');
  }

  // Merchant feed
  const feed = buildFeedItems(data.products);
  const feedIds = new Set<string>();
  for (const item of feed) {
    if (feedIds.has(item.id)) error(`feed ${item.id}`, 'duplicate feed item id');
    feedIds.add(item.id);
    if (!/^\d+\.\d{2} INR$/.test(item.price)) error(`feed ${item.id}`, `bad price ${item.price}`);
  }

  // Final crawler HTML through the storefront renderer
  const rendererPath = path.resolve(__dirname, '../../../frontend/api/_lib/seoHtml.js');
  const templatePath = path.resolve(__dirname, '../../../frontend/index.html');
  let renderedChecked = 0;
  if (fs.existsSync(rendererPath) && fs.existsSync(templatePath)) {
    const { injectIntoTemplate } = await import(pathToFileURL(rendererPath).href);
    const template = fs.readFileSync(templatePath, 'utf8');
    for (const [url, { d }] of pages) {
      const html: string = injectIntoTemplate(template, d);
      if ((html.match(/<title/g) || []).length !== 1)
        error(url, 'rendered HTML does not have exactly one <title>');
      if ((html.match(/rel="canonical"/g) || []).length > 1)
        error(url, 'rendered HTML has multiple canonicals');
      if ((html.match(/name="description"/g) || []).length !== 1)
        error(url, 'rendered HTML does not have exactly one description');
      for (const m of html.matchAll(
        /<script type="application\/ld\+json" data-seo-ssr>(.*?)<\/script>/g,
      )) {
        try {
          JSON.parse(m[1]);
        } catch {
          error(url, 'rendered JSON-LD does not parse');
        }
      }
      renderedChecked++;
    }
  }

  // Report
  const errors = issues.filter((i) => i.level === 'error');
  const warnings = issues.filter((i) => i.level === 'warn');
  console.log(
    `Pages checked: ${pages.size} (${indexable.length} indexable), rendered HTML checked: ${renderedChecked}`,
  );
  console.log(
    `Sitemap URLs: ${entries.length} (${xml.length} bytes), Merchant feed items: ${feed.length}\n`,
  );
  console.log('Sample titles:');
  for (const [url, { d }] of [...pages].slice(0, 40))
    console.log(`  ${url.padEnd(38)} ${d.head.title}`);
  console.log('');
  for (const i of [...errors, ...warnings])
    console.log(`${i.level === 'error' ? 'ERROR' : 'warn '} ${i.page}: ${i.message}`);
  console.log(`\n${errors.length} error(s), ${warnings.length} warning(s)`);
  process.exit(errors.length ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(2);
});
