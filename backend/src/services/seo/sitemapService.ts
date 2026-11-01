import Product from '../../models/Product';
import Category from '../../models/Category';
import Policy from '../../models/Policy';
import { SITE_URL, SITEMAP_CHUNK_SIZE } from '../../config/seoConfig';
import { getProductImages, isProductIndexable } from './productSeo';
import { getSeoCacheVersion } from './seoCache';

export interface SitemapEntry {
  loc: string;
  lastmod?: Date | string;
  images?: string[];
}

export function escapeXml(value: string): string {
  return String(value).replace(/[<>&'"]/g, (c) =>
    c === '<' ? '&lt;' : c === '>' ? '&gt;' : c === '&' ? '&amp;' : c === "'" ? '&apos;' : '&quot;',
  );
}

const toW3cDate = (value?: Date | string) => {
  if (!value) return undefined;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
};

const latest = (...dates: Array<Date | string | undefined>) => {
  const times = dates.map((d) => (d ? new Date(d).getTime() : NaN)).filter((t) => !Number.isNaN(t));
  return times.length ? new Date(Math.max(...times)) : undefined;
};

export function buildUrlsetXml(entries: SitemapEntry[]): string {
  const hasImages = entries.some((e) => e.images?.length);
  const lines = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"${
      hasImages ? ' xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"' : ''
    }>`,
  ];
  for (const entry of entries) {
    lines.push('  <url>');
    lines.push(`    <loc>${escapeXml(entry.loc)}</loc>`);
    const lastmod = toW3cDate(entry.lastmod);
    if (lastmod) lines.push(`    <lastmod>${lastmod}</lastmod>`);
    for (const img of entry.images || []) {
      lines.push(`    <image:image><image:loc>${escapeXml(img)}</image:loc></image:image>`);
    }
    lines.push('  </url>');
  }
  lines.push('</urlset>');
  return `${lines.join('\n')}\n`;
}

export function buildSitemapIndexXml(sitemaps: { loc: string; lastmod?: Date | string }[]): string {
  const lines = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ];
  for (const s of sitemaps) {
    lines.push('  <sitemap>');
    lines.push(`    <loc>${escapeXml(s.loc)}</loc>`);
    const lastmod = toW3cDate(s.lastmod);
    if (lastmod) lines.push(`    <lastmod>${lastmod}</lastmod>`);
    lines.push('  </sitemap>');
  }
  lines.push('</sitemapindex>');
  return `${lines.join('\n')}\n`;
}

/**
 * Pure: turn catalogue state into sitemap entries. Only public, indexable URLs
 * are emitted; lastmod is set only from real modification timestamps.
 */
export function buildSitemapEntries(input: {
  products: any[];
  categories: any[];
  policies?: any[];
}): SitemapEntry[] {
  const products = input.products.filter(isProductIndexable);
  const newestProduct = latest(...products.map((p) => p.updatedAt));

  const productsByCategory = new Map<string, any[]>();
  for (const p of products) {
    const id = String(p.primaryCategory?._id || p.primaryCategory || '');
    if (!id) continue;
    if (!productsByCategory.has(id)) productsByCategory.set(id, []);
    productsByCategory.get(id)!.push(p);
  }

  const entries: SitemapEntry[] = [
    { loc: `${SITE_URL}/`, lastmod: newestProduct },
    { loc: `${SITE_URL}/shop`, lastmod: newestProduct },
    { loc: `${SITE_URL}/menu` },
    { loc: `${SITE_URL}/contact` },
  ];

  // Category landing pages that actually list products (empty ones are noindex).
  for (const cat of input.categories) {
    if (!cat?.isActive || cat.isDeleted || !cat.slug) continue;
    const items = productsByCategory.get(String(cat._id)) || [];
    if (!items.length) continue;
    entries.push({
      loc: `${SITE_URL}/category/${cat.slug}`,
      lastmod: latest(cat.updatedAt, ...items.map((p) => p.updatedAt)),
    });
  }

  for (const p of products) {
    entries.push({
      loc: `${SITE_URL}/product/${p.slug}`,
      lastmod: p.updatedAt,
      images: getProductImages(p).slice(0, 4),
    });
  }

  for (const policy of input.policies || []) {
    if (policy?.status !== 'published' || !policy.slug || policy.isDeleted) continue;
    entries.push({ loc: `${SITE_URL}/policy/${policy.slug}`, lastmod: policy.updatedAt });
  }

  return entries;
}

export async function loadSitemapInput() {
  const [products, categories, policies] = await Promise.all([
    Product.find({ isActive: true, seoIndexable: { $ne: false } })
      .select(
        'slug title imageSrc images updatedAt primaryCategory isActive isDeleted seoIndexable',
      )
      .lean(),
    Category.find({ isActive: true }).select('slug name isActive updatedAt').lean(),
    Policy.find({ status: 'published' }).select('slug status updatedAt').lean(),
  ]);
  return { products, categories, policies };
}

// Small in-process cache; product/category writes bump the SEO cache version.
let cache: { at: number; version: number; entries: SitemapEntry[] } | null = null;
const CACHE_TTL_MS = 10 * 60 * 1000;

export async function getSitemapEntries(): Promise<SitemapEntry[]> {
  const version = getSeoCacheVersion();
  if (cache && cache.version === version && Date.now() - cache.at < CACHE_TTL_MS) {
    return cache.entries;
  }
  const entries = buildSitemapEntries(await loadSitemapInput());
  cache = { at: Date.now(), version, entries };
  return entries;
}

/**
 * `/sitemap.xml`: a urlset while the site fits one file, otherwise a sitemap
 * index pointing at `/sitemap-<n>.xml` chunks.
 */
export async function renderSitemap(chunk?: number): Promise<string | null> {
  const entries = await getSitemapEntries();
  const chunks = Math.ceil(entries.length / SITEMAP_CHUNK_SIZE);
  if (chunk === undefined) {
    if (chunks <= 1) return buildUrlsetXml(entries);
    return buildSitemapIndexXml(
      Array.from({ length: chunks }, (_, i) => {
        const slice = entries.slice(i * SITEMAP_CHUNK_SIZE, (i + 1) * SITEMAP_CHUNK_SIZE);
        return {
          loc: `${SITE_URL}/sitemap-${i + 1}.xml`,
          lastmod: latest(...slice.map((e) => e.lastmod)),
        };
      }),
    );
  }
  if (chunk < 1 || chunk > chunks) return null;
  return buildUrlsetXml(
    entries.slice((chunk - 1) * SITEMAP_CHUNK_SIZE, chunk * SITEMAP_CHUNK_SIZE),
  );
}
