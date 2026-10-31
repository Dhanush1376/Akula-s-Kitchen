import { BRAND_NAME, CATEGORY_SEO, SEO_LIMITS, SITE_URL } from '../../config/seoConfig';

/**
 * Product SEO generation — pure functions, no database access.
 *
 * Everything here is derived only from data the product actually carries
 * (title, category, description, pack-size options, price, inventory, images).
 * Nothing is invented: no ingredients, ratings, shelf life or delivery promises.
 */

/** SEO fields that admins may override; anything not overridden is regenerated. */
export const OVERRIDABLE_SEO_FIELDS = [
  'seoTitle',
  'seoDescription',
  'seoFocusKeyword',
  'seoKeywords',
  'seoOgTitle',
  'seoOgDescription',
  'seoOgImage',
  'seoImageAlt',
] as const;

export type OverridableSeoField = (typeof OVERRIDABLE_SEO_FIELDS)[number];

export interface CategoryContext {
  name?: string;
  slug?: string;
}

export interface GeneratedProductSeo {
  seoTitle: string;
  seoDescription: string;
  seoFocusKeyword: string;
  seoKeywords: string[];
  seoOgTitle: string;
  seoOgDescription: string;
  seoOgImage: string;
  seoImageAlt: string;
}

export interface ResolvedProductSeo extends GeneratedProductSeo {
  slug: string;
  canonicalUrl: string;
  path: string;
  indexable: boolean;
  robots: string;
  imageAlts: string[];
  ogImageWidth?: number;
  ogImageHeight?: number;
  ogImageType?: string;
  overrides: string[];
}

export interface PackOption {
  label: string;
  price: number;
  available: boolean;
}

// ─── Text helpers ────────────────────────────────────────────────────────────

const ENTITY_MAP: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&#039;': "'",
  '&nbsp;': ' ',
};

export function stripHtml(input: unknown): string {
  if (typeof input !== 'string') return '';
  return input
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/(p|div|li|h[1-6])>/gi, ' ')
    .replace(/<[^>]*>/g, '')
    .replace(/&[a-z#0-9]+;/gi, (m) => ENTITY_MAP[m.toLowerCase()] ?? ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function slugify(input: unknown, maxLength: number = SEO_LIMITS.slugMax): string {
  if (typeof input !== 'string') return '';
  const slug = input
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  if (slug.length <= maxLength) return slug;
  const cut = slug.slice(0, maxLength);
  const lastDash = cut.lastIndexOf('-');
  return (lastDash > 20 ? cut.slice(0, lastDash) : cut).replace(/-+$/g, '');
}

export function isValidSlug(slug: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) && slug.length <= SEO_LIMITS.slugMax;
}

/** Trim to a maximum length on a word boundary without a trailing ellipsis. */
export function truncateWords(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max + 1);
  const lastSpace = cut.lastIndexOf(' ');
  return cut
    .slice(0, lastSpace > max * 0.6 ? lastSpace : max)
    .replace(/[\s,;:–-]+$/g, '')
    .trim();
}

function firstSentence(text: string): string {
  const match = text.match(/^(.+?[.!?])(\s|$)/);
  return (match ? match[1] : text).trim();
}

function joinList(items: string[]): string {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

export function toAbsoluteUrl(url: string | undefined | null): string {
  if (!url || typeof url !== 'string') return '';
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith('//')) return `https:${url}`;
  return `${SITE_URL}${url.startsWith('/') ? '' : '/'}${url}`;
}

// ─── Product data accessors ─────────────────────────────────────────────────

export function getCategoryContext(product: any, fallback?: CategoryContext): CategoryContext {
  const cat = product?.primaryCategory;
  if (cat && typeof cat === 'object' && (cat.name || cat.slug)) {
    return { name: cat.name, slug: cat.slug || slugify(cat.name) };
  }
  return fallback || {};
}

export function getProductImages(product: any): string[] {
  const list = [product?.imageSrc, ...(Array.isArray(product?.images) ? product.images : [])]
    .filter((img) => typeof img === 'string' && img.trim() && !img.startsWith('blob:'))
    .map((img: string) => toAbsoluteUrl(img.trim()));
  return Array.from(new Set(list));
}

const PACK_GROUP_PATTERN = /weight|size|pack|quantity|qty|portion/i;

/**
 * Purchasable pack options (e.g. 250g / 500g / 1kg) with their real prices.
 * Uses the product's own option group; falls back to a single base offer.
 */
export function getPackOptions(product: any): PackOption[] {
  const base = Number(product?.price) || 0;
  const groups: any[] = Array.isArray(product?.optionGroups) ? product.optionGroups : [];
  const group =
    groups.find(
      (g) =>
        g?.type !== 'MULTI_SELECT' && PACK_GROUP_PATTERN.test(g?.name || '') && g.options?.length,
    ) || groups.find((g) => g?.type === 'SINGLE_SELECT' && g?.required && g.options?.length);

  if (!group) return [];

  return [...group.options]
    .sort((a: any, b: any) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
    .filter((o: any) => o && typeof o.label === 'string' && o.label.trim())
    .map((o: any) => ({
      label: o.label.trim(),
      price: Math.max(0, Math.round((base + (Number(o.priceAdjustment) || 0)) * 100) / 100),
      available: o.available !== false,
    }));
}

export function getSellableStock(product: any): number {
  const stock = Number(product?.stock);
  const reserved = Number(product?.reservedStock) || 0;
  if (!Number.isFinite(stock)) return 0;
  return Math.max(0, stock - reserved);
}

/** Mirrors checkout: an order is rejected when stock - reservedStock <= 0. */
export function isProductInStock(product: any): boolean {
  return Boolean(product?.isActive) && !product?.isDeleted && getSellableStock(product) > 0;
}

export function isProductPublic(product: any): boolean {
  return Boolean(product) && product.isActive === true && !product.isDeleted;
}

export function isProductIndexable(product: any): boolean {
  return isProductPublic(product) && product.seoIndexable !== false;
}

// ─── Generation ─────────────────────────────────────────────────────────────

function categoryDefaults(category: CategoryContext) {
  return (category.slug && CATEGORY_SEO[category.slug]) || undefined;
}

/** "Mango Avakaaya" in pickles -> "Mango Avakaaya Pickle". */
export function productDisplayName(title: string, category: CategoryContext): string {
  const name = (title || '').trim().replace(/\s+/g, ' ');
  const noun = categoryDefaults(category)?.productNoun;
  if (!noun || !name) return name;
  return name.toLowerCase().includes(noun.toLowerCase()) ? name : `${name} ${noun}`;
}

const SIZE_TOKEN = /^\d+(\.\d+)?\s?(g|gm|gms|kg|ml|l|ltr|pcs?)$/i;

export function generateProductSeo(
  product: any,
  categoryInput?: CategoryContext,
): GeneratedProductSeo {
  const category = getCategoryContext(product, categoryInput);
  const defaults = categoryDefaults(category);
  const qualifier = defaults?.productQualifier || '';
  const displayName = productDisplayName(product?.title || '', category);
  const suffix = ` | ${BRAND_NAME}`;

  // Title: "<Qualifier> <Name> | Brand", dropping the qualifier and then the
  // brand if needed to stay within the visible SERP width.
  const candidates = [
    qualifier ? `${qualifier} ${displayName}${suffix}` : '',
    `${displayName}${suffix}`,
    displayName,
  ].filter(Boolean);
  const seoTitle =
    candidates.find((t) => t.length <= SEO_LIMITS.titleMax) ||
    truncateWords(displayName, SEO_LIMITS.titleMax);

  // Description: lead + the product's own first sentence + real pack sizes.
  const lead = `Shop ${qualifier ? `${qualifier.toLowerCase()} ` : ''}${displayName} from ${BRAND_NAME}.`;
  const detail = firstSentence(stripHtml(product?.description));
  const packs = getPackOptions(product).map((p) => p.label);
  const sizes = packs.length
    ? `Available in ${joinList(packs)} pack${packs.length > 1 ? 's' : ''}.`
    : product?.weight
      ? `Pack size: ${String(product.weight).trim()}.`
      : '';
  let seoDescription = lead;
  for (const part of [detail, sizes, 'Order online.']) {
    if (part && `${seoDescription} ${part}`.length <= SEO_LIMITS.descriptionMax) {
      seoDescription = `${seoDescription} ${part}`;
    }
  }
  if (seoDescription.length < SEO_LIMITS.descriptionMin && detail) {
    seoDescription = truncateWords(`${lead} ${detail}`, SEO_LIMITS.descriptionMax);
  }

  // Keywords: product phrase first, then real alternate names from its tags.
  const focus = displayName.toLowerCase();
  const keywordPool = [
    `${focus} online`,
    `buy ${focus}`,
    qualifier ? `${qualifier.toLowerCase()} ${focus}` : '',
    category.name ? category.name.toLowerCase() : '',
    ...(Array.isArray(product?.tags) ? product.tags : []).map((t: string) =>
      String(t || '')
        .trim()
        .toLowerCase(),
    ),
  ];
  const seen = new Set<string>([focus]);
  const seoKeywords: string[] = [];
  for (const kw of keywordPool) {
    if (!kw || kw.length < 3 || SIZE_TOKEN.test(kw) || seen.has(kw)) continue;
    seen.add(kw);
    seoKeywords.push(kw);
    if (seoKeywords.length >= SEO_LIMITS.keywordsMax) break;
  }

  const images = getProductImages(product);
  const seoImageAlt = displayName
    ? `${qualifier ? `${qualifier} ` : ''}${displayName} from ${BRAND_NAME}`
    : '';

  return {
    seoTitle,
    seoDescription,
    seoFocusKeyword: focus,
    seoKeywords,
    seoOgTitle: `${displayName}${suffix}`.length <= 70 ? `${displayName}${suffix}` : displayName,
    seoOgDescription: seoDescription,
    seoOgImage: images[0] ? toOgImageUrl(images[0]) : '',
    seoImageAlt,
  };
}

/** 1200x630 JPEG derivative for social cards (Cloudinary URLs only). */
export function toOgImageUrl(url: string): string {
  if (!url) return '';
  if (/res\.cloudinary\.com\/.+\/image\/upload\//.test(url) && !/\/upload\/[^/]*w_1200/.test(url)) {
    return url.replace('/image/upload/', '/image/upload/c_fill,g_auto,w_1200,h_630,q_auto,f_jpg/');
  }
  return url;
}

function isCloudinaryOgDerivative(url: string) {
  return /res\.cloudinary\.com\/.+\/upload\/[^/]*w_1200,h_630/.test(url);
}

const normalizeValue = (field: OverridableSeoField, value: unknown): string | string[] => {
  if (field === 'seoKeywords') {
    const arr = Array.isArray(value) ? value : typeof value === 'string' ? value.split(',') : [];
    return arr.map((v) => String(v).trim()).filter(Boolean);
  }
  return typeof value === 'string' ? value.trim() : '';
};

const isEmptyValue = (v: string | string[]) => (Array.isArray(v) ? v.length === 0 : !v);
const sameValue = (a: string | string[], b: string | string[]) =>
  Array.isArray(a) && Array.isArray(b)
    ? a.length === b.length && a.every((x, i) => x.toLowerCase() === String(b[i]).toLowerCase())
    : a === b;

/**
 * Merge an incoming write with generated SEO defaults.
 *
 * - A field sent with a non-empty value that differs from the generated one is
 *   recorded in `seoOverrides` and kept as the admin wrote it.
 * - A field sent empty (or equal to the generated value) goes back to automatic.
 * - A field not sent keeps its current override status; automatic fields are
 *   regenerated so they follow title/description/price/image changes.
 *
 * Mutates and returns `data` (the update payload).
 */
export function applyProductSeo(
  data: Record<string, any>,
  existing: Record<string, any> | null | undefined,
  category?: CategoryContext,
): Record<string, any> {
  const merged = { ...(existing || {}), ...data };
  const generated = generateProductSeo(merged, category);
  // Override state is derived server-side only; never trust a client-sent list.
  const overrides = new Set<string>(
    Array.isArray(existing?.seoOverrides) ? existing!.seoOverrides : [],
  );
  delete data.seoOverrides;

  for (const field of OVERRIDABLE_SEO_FIELDS) {
    const generatedValue = generated[field];
    if (Object.prototype.hasOwnProperty.call(data, field) && data[field] !== undefined) {
      const value = normalizeValue(field, data[field]);
      if (isEmptyValue(value) || sameValue(value, generatedValue)) {
        overrides.delete(field);
        data[field] = generatedValue;
      } else {
        overrides.add(field);
        data[field] = field === 'seoOgImage' ? toAbsoluteUrl(value as string) : value;
      }
    } else if (!overrides.has(field)) {
      data[field] = generatedValue;
    }
  }

  if (typeof data.seoCanonicalUrl === 'string') {
    data.seoCanonicalUrl = sanitizeCanonicalOverride(data.seoCanonicalUrl);
  }
  if (typeof data.seoContent === 'string') {
    data.seoContent = stripHtml(data.seoContent).slice(0, 5000);
  }

  data.seoOverrides = Array.from(overrides);
  return data;
}

/** Only same-site absolute canonical overrides are accepted. */
export function sanitizeCanonicalOverride(url: string): string {
  const trimmed = (url || '').trim();
  if (!trimmed) return '';
  try {
    const parsed = new URL(trimmed, SITE_URL);
    const site = new URL(SITE_URL);
    if (parsed.hostname.replace(/^www\./, '') !== site.hostname.replace(/^www\./, '')) return '';
    return `${SITE_URL}${parsed.pathname.replace(/\/+$/, '') || '/'}`;
  } catch {
    return '';
  }
}

/**
 * Final SEO values for a stored product: admin overrides win, everything else
 * is regenerated from the product's current data at read time, so metadata
 * can never drift from price, stock, title or image changes.
 */
export function resolveProductSeo(
  product: any,
  categoryInput?: CategoryContext,
): ResolvedProductSeo {
  const category = getCategoryContext(product, categoryInput);
  const generated = generateProductSeo(product, category);
  const overrides: string[] = Array.isArray(product?.seoOverrides) ? product.seoOverrides : [];
  const pick = <K extends OverridableSeoField>(field: K): GeneratedProductSeo[K] => {
    if (!overrides.includes(field)) return generated[field];
    const stored = product?.[field];
    const value = normalizeValue(field, stored) as GeneratedProductSeo[K];
    return isEmptyValue(value as any) ? generated[field] : value;
  };

  const slug = product?.slug || String(product?._id || '');
  const path = `/product/${slug}`;
  const canonicalUrl =
    sanitizeCanonicalOverride(product?.seoCanonicalUrl || '') || `${SITE_URL}${path}`;
  const indexable = isProductIndexable(product);
  const images = getProductImages(product);
  const seoImageAlt = pick('seoImageAlt');
  const displayName = productDisplayName(product?.title || '', category);
  const seoOgImage = pick('seoOgImage') || toOgImageUrl(images[0] || '');
  const isDerivative = isCloudinaryOgDerivative(seoOgImage);

  return {
    seoTitle: pick('seoTitle'),
    seoDescription: pick('seoDescription'),
    seoFocusKeyword: pick('seoFocusKeyword'),
    seoKeywords: pick('seoKeywords'),
    seoOgTitle: pick('seoOgTitle'),
    seoOgDescription: pick('seoOgDescription'),
    seoOgImage,
    seoImageAlt,
    slug,
    path,
    canonicalUrl,
    indexable,
    robots: indexable ? 'index, follow, max-image-preview:large' : 'noindex, follow',
    imageAlts: images.map((_, i) =>
      i === 0 ? seoImageAlt : `${displayName}, photo ${i + 1} of ${images.length}`,
    ),
    ...(isDerivative ? { ogImageWidth: 1200, ogImageHeight: 630, ogImageType: 'image/jpeg' } : {}),
    overrides,
  };
}

// ─── Structured data ────────────────────────────────────────────────────────

const SCHEMA_IN_STOCK = 'https://schema.org/InStock';
const SCHEMA_OUT_OF_STOCK = 'https://schema.org/OutOfStock';
const SCHEMA_NEW = 'https://schema.org/NewCondition';

const formatPrice = (n: number) => (Math.round(n * 100) / 100).toFixed(2);

/**
 * Product (single offer) or ProductGroup (one Product+Offer per pack size)
 * JSON-LD built from stored data. Ratings are included only when the product
 * has real approved reviews (the review controller maintains rating/reviews).
 */
export function buildProductJsonLd(
  product: any,
  categoryInput?: CategoryContext,
): Record<string, any> {
  const category = getCategoryContext(product, categoryInput);
  const seo = resolveProductSeo(product, category);
  const images = getProductImages(product);
  const description = stripHtml(product?.description) || seo.seoDescription;
  const inStock = isProductInStock(product);
  const baseSku = product?.sku || String(product?._id || seo.slug);
  const brand = { '@type': 'Brand', name: BRAND_NAME };
  const rating =
    Number(product?.reviews) > 0 && Number(product?.rating) > 0
      ? {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: Number(product.rating),
            reviewCount: Number(product.reviews),
            bestRating: 5,
            worstRating: 1,
          },
        }
      : {};

  const offerFor = (price: number, available: boolean) => ({
    '@type': 'Offer',
    url: seo.canonicalUrl,
    priceCurrency: 'INR',
    price: formatPrice(price),
    availability: inStock && available ? SCHEMA_IN_STOCK : SCHEMA_OUT_OF_STOCK,
    itemCondition: SCHEMA_NEW,
  });

  const packs = getPackOptions(product);

  if (packs.length >= 2) {
    return {
      '@context': 'https://schema.org',
      '@type': 'ProductGroup',
      '@id': `${seo.canonicalUrl}#product`,
      name: product.title,
      description,
      url: seo.canonicalUrl,
      image: images,
      brand,
      ...(category.name ? { category: category.name } : {}),
      productGroupID: baseSku,
      variesBy: ['https://schema.org/size'],
      hasVariant: packs.map((pack) => ({
        '@type': 'Product',
        name: `${product.title} (${pack.label})`,
        sku: `${baseSku}-${slugify(pack.label) || 'pack'}`,
        size: pack.label,
        image: images[0],
        inProductGroupWithID: baseSku,
        offers: offerFor(pack.price, pack.available),
      })),
      ...rating,
    };
  }

  const single = packs[0];
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    '@id': `${seo.canonicalUrl}#product`,
    name: product.title,
    description,
    url: seo.canonicalUrl,
    image: images,
    sku: baseSku,
    brand,
    ...(category.name ? { category: category.name } : {}),
    ...(single ? { size: single.label } : {}),
    offers: offerFor(
      single ? single.price : Number(product?.price) || 0,
      single ? single.available : true,
    ),
    ...rating,
  };
}

export interface Crumb {
  name: string;
  path: string;
}

export function buildBreadcrumbJsonLd(crumbs: Crumb[]): Record<string, any> {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.name,
      item: c.path === '/' ? `${SITE_URL}/` : `${SITE_URL}${c.path}`,
    })),
  };
}

export function productBreadcrumbs(product: any, categoryInput?: CategoryContext): Crumb[] {
  const category = getCategoryContext(product, categoryInput);
  const crumbs: Crumb[] = [
    { name: 'Home', path: '/' },
    { name: 'Shop', path: '/collections' },
  ];
  if (category.slug && category.name) {
    crumbs.push({ name: category.name, path: `/category/${category.slug}` });
  }
  crumbs.push({ name: product.title, path: `/product/${product.slug}` });
  return crumbs;
}

/** Public, client-safe SEO payload attached to product API responses. */
export function buildProductSeoPayload(product: any, categoryInput?: CategoryContext) {
  const category = getCategoryContext(product, categoryInput);
  const seo = resolveProductSeo(product, category);
  return {
    title: seo.seoTitle,
    description: seo.seoDescription,
    keywords: [seo.seoFocusKeyword, ...seo.seoKeywords].filter(Boolean).join(', '),
    canonicalUrl: seo.canonicalUrl,
    path: seo.path,
    robots: seo.robots,
    indexable: seo.indexable,
    ogTitle: seo.seoOgTitle,
    ogDescription: seo.seoOgDescription,
    ogImage: seo.seoOgImage,
    ogImageWidth: seo.ogImageWidth,
    ogImageHeight: seo.ogImageHeight,
    ogImageType: seo.ogImageType,
    imageAlt: seo.seoImageAlt,
    imageAlts: seo.imageAlts,
    displayName: productDisplayName(product?.title || '', category),
    breadcrumbs: productBreadcrumbs(product, category),
    jsonLd: [
      buildProductJsonLd(product, category),
      buildBreadcrumbJsonLd(productBreadcrumbs(product, category)),
    ],
  };
}
