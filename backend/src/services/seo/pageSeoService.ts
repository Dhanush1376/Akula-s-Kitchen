import mongoose from 'mongoose';
import Product from '../../models/Product';
import Category from '../../models/Category';
import {
  BRAND_NAME,
  CATEGORY_SEO,
  DEFAULT_OG_IMAGE,
  LOGO_URL,
  PRIVATE_PATH_PREFIXES,
  SEO_LIMITS,
  SITE_URL,
} from '../../config/seoConfig';
import {
  buildBreadcrumbJsonLd,
  buildProductSeoPayload,
  Crumb,
  getPackOptions,
  getProductImages,
  isProductInStock,
  isProductPublic,
  resolveProductSeo,
  stripHtml,
  toOgImageUrl,
  truncateWords,
} from './productSeo';
import { getSeoCacheVersion } from './seoCache';

/**
 * Resolves a storefront URL into everything a crawler needs in the initial
 * HTML: status/redirect, head metadata, JSON-LD and a small crawlable content
 * shell. Consumed by the Vercel renderer (frontend/api/seo-render.js).
 */

export interface PageSeoHead {
  title: string;
  description: string;
  canonical?: string;
  robots: string;
  keywords?: string;
  ogType: 'website' | 'product';
  ogTitle: string;
  ogDescription: string;
  ogImage: string;
  ogImageWidth?: number;
  ogImageHeight?: number;
  ogImageType?: string;
  ogImageAlt: string;
  ogUrl?: string;
  productPrice?: string;
  productAvailability?: string;
}

export interface PageSeoDescriptor {
  status: 200 | 301 | 404 | 410;
  redirect?: string;
  head: PageSeoHead;
  jsonLd: Record<string, any>[];
  /** Escaped HTML placed in #root until React mounts. */
  bodyHtml: string;
  /** Visible copy for pages whose text lives server-side (category landing pages). */
  page?: { heading: string; intro: string; category?: { name: string; slug: string } };
}

export interface StoreContact {
  storeName?: string;
  phone?: string;
  alternatePhone?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  sameAs?: string[];
}

const INDEX = 'index, follow, max-image-preview:large';
const NOINDEX = 'noindex, follow';

export const escapeHtml = (value: unknown): string =>
  String(value ?? '').replace(/[&<>"']/g, (c) =>
    c === '&' ? '&amp;' : c === '<' ? '&lt;' : c === '>' ? '&gt;' : c === '"' ? '&quot;' : '&#39;',
  );

const inr = (n: number) => `₹${Number(n).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

const HOME_TITLE = `${BRAND_NAME} | Fresh • Tasty • Healthy`;
const HOME_DESCRIPTION =
  'Fresh, homemade idli & dosa batters, authentic traditional pickles, and delicious podis delivered fresh to your doorstep. Fresh • Tasty • Healthy.';
const SHOP_TITLE = `Shop Homemade Pickles, Batters & Podis Online | ${BRAND_NAME}`;
const SHOP_DESCRIPTION =
  "Browse the full Akula's Kitchen range: idli and dosa batters, homemade pickles, chutneys, podis and masalas, namkeen and cashews, with pack sizes and prices.";
const MENU_TITLE = `Menu & Price List: Batters, Pickles, Podis | ${BRAND_NAME}`;
const MENU_DESCRIPTION =
  "See everything Akula's Kitchen makes on one page, grouped by category with current prices: batters, pickles, chutneys, podis and masalas, namkeen and cashews.";
const CONTACT_TITLE = `Contact ${BRAND_NAME} | Orders & Customer Support`;
const CONTACT_DESCRIPTION =
  "Contact Akula's Kitchen for help with orders, deliveries and product questions. Find our phone number, email and address, or send us a message online.";

function baseHead(
  partial: Partial<PageSeoHead> & { title: string; description: string },
): PageSeoHead {
  return {
    robots: INDEX,
    ogType: 'website',
    ogTitle: partial.title,
    ogDescription: partial.description,
    ogImage: DEFAULT_OG_IMAGE,
    ogImageWidth: 1200,
    ogImageHeight: 630,
    ogImageType: 'image/png',
    ogImageAlt: `${BRAND_NAME} logo and storefront banner`,
    ...partial,
    ogUrl: partial.ogUrl ?? partial.canonical,
  };
}

// ─── Structured data builders (pure) ─────────────────────────────────────────

export function buildOrganizationJsonLd(contact: StoreContact = {}) {
  const hasAddress = Boolean(contact.city || contact.address);
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${SITE_URL}/#organization`,
    name: contact.storeName || BRAND_NAME,
    url: `${SITE_URL}/`,
    logo: LOGO_URL,
    ...(contact.email ? { email: contact.email } : {}),
    ...(contact.phone ? { telephone: contact.phone } : {}),
    ...(hasAddress
      ? {
          address: {
            '@type': 'PostalAddress',
            ...(contact.address ? { streetAddress: contact.address } : {}),
            ...(contact.city ? { addressLocality: contact.city } : {}),
            ...(contact.state ? { addressRegion: contact.state } : {}),
            ...(contact.postalCode ? { postalCode: contact.postalCode } : {}),
            ...(contact.country
              ? { addressCountry: contact.country === 'India' ? 'IN' : contact.country }
              : {}),
          },
        }
      : {}),
    ...(contact.phone || contact.email
      ? {
          contactPoint: [
            {
              '@type': 'ContactPoint',
              contactType: 'customer service',
              ...(contact.phone ? { telephone: contact.phone } : {}),
              ...(contact.email ? { email: contact.email } : {}),
              areaServed: 'IN',
            },
          ],
        }
      : {}),
    ...(contact.sameAs?.length ? { sameAs: contact.sameAs } : {}),
  };
}

export function buildWebSiteJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${SITE_URL}/#website`,
    name: BRAND_NAME,
    url: `${SITE_URL}/`,
    inLanguage: 'en-IN',
    publisher: { '@id': `${SITE_URL}/#organization` },
  };
}

export function buildItemListJsonLd(items: { name: string; path: string }[]) {
  return {
    '@type': 'ItemList',
    numberOfItems: items.length,
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: `${SITE_URL}${item.path}`,
      name: item.name,
    })),
  };
}

export function buildCollectionPageJsonLd(opts: {
  name: string;
  description: string;
  path: string;
  items: { name: string; path: string }[];
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: opts.name,
    description: opts.description,
    url: `${SITE_URL}${opts.path}`,
    isPartOf: { '@id': `${SITE_URL}/#website` },
    mainEntity: buildItemListJsonLd(opts.items),
  };
}

// ─── HTML shell helpers (pure) ───────────────────────────────────────────────

function breadcrumbHtml(crumbs: Crumb[]): string {
  return `<nav aria-label="Breadcrumb"><ol>${crumbs
    .map((c, i) =>
      i === crumbs.length - 1
        ? `<li aria-current="page">${escapeHtml(c.name)}</li>`
        : `<li><a href="${escapeHtml(c.path)}">${escapeHtml(c.name)}</a></li>`,
    )
    .join('')}</ol></nav>`;
}

function productListHtml(products: any[]): string {
  if (!products.length) return '';
  return `<ul>${products
    .map((p) => {
      const packs = getPackOptions(p);
      const from = packs.length ? Math.min(...packs.map((x) => x.price)) : Number(p.price) || 0;
      return `<li><a href="/product/${escapeHtml(p.slug)}">${escapeHtml(p.title)}</a> — ${
        packs.length > 1 ? 'from ' : ''
      }${escapeHtml(inr(from))}</li>`;
    })
    .join('')}</ul>`;
}

function categoryLinksHtml(categories: { name: string; slug: string }[]): string {
  if (!categories.length) return '';
  return `<ul>${categories
    .map((c) => `<li><a href="/category/${escapeHtml(c.slug)}">${escapeHtml(c.name)}</a></li>`)
    .join('')}</ul>`;
}

const shell = (inner: string) => `<main class="seo-shell">${inner}</main>`;

// ─── Page builders (pure, given loaded data) ─────────────────────────────────

export interface CatalogData {
  products: any[]; // public products with populated primaryCategory
  categories: any[]; // active categories
  contact?: StoreContact;
}

function listableCategories(data: CatalogData) {
  const counts = new Map<string, number>();
  for (const p of data.products) {
    const id = String(p.primaryCategory?._id || p.primaryCategory || '');
    counts.set(id, (counts.get(id) || 0) + 1);
  }
  return data.categories
    .filter((c) => c.slug && counts.get(String(c._id)))
    .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0) || a.name.localeCompare(b.name))
    .map((c) => ({ name: c.name, slug: c.slug, heading: CATEGORY_SEO[c.slug]?.heading || c.name }));
}

export function buildHomePage(data: CatalogData): PageSeoDescriptor {
  const canonical = `${SITE_URL}/`;
  const cats = listableCategories(data);
  const featured = data.products.filter((p) => p.featured).slice(0, 12);
  return {
    status: 200,
    head: baseHead({
      title: HOME_TITLE,
      description: HOME_DESCRIPTION,
      keywords:
        "dosa batter, idli batter, fresh batter, homemade pickles, tomato pickle, gongura pickle, podi, karam podi, south indian food, breakfast batter, akula's kitchen",
      canonical,
    }),
    jsonLd: [buildOrganizationJsonLd(data.contact), buildWebSiteJsonLd()],
    bodyHtml: shell(
      `<h1>${escapeHtml(BRAND_NAME)}: homemade batters, pickles and traditional foods</h1>` +
        `<p>${escapeHtml(HOME_DESCRIPTION)}</p>` +
        (cats.length ? `<h2>Shop by category</h2>${categoryLinksHtml(cats)}` : '') +
        (featured.length ? `<h2>Featured products</h2>${productListHtml(featured)}` : '') +
        `<p><a href="/shop">Browse all products</a> · <a href="/menu">Menu &amp; price list</a> · <a href="/contact">Contact us</a></p>`,
    ),
  };
}

export function buildShopPage(data: CatalogData, query: URLSearchParams): PageSeoDescriptor {
  const canonical = `${SITE_URL}/shop`;
  const cats = listableCategories(data);
  const filtered = [
    'search',
    'q',
    'sort',
    'page',
    'minPrice',
    'maxPrice',
    'category',
    'collection',
  ].some((k) => query.has(k));
  // ?category=<Name> is a filtered view of a category landing page.
  const catParam = query.get('category');
  const matched = catParam
    ? cats.find(
        (c) => c.name.toLowerCase() === catParam.toLowerCase() || c.slug === catParam.toLowerCase(),
      )
    : undefined;
  const items = data.products.map((p) => ({ name: p.title, path: `/product/${p.slug}` }));
  return {
    status: 200,
    head: baseHead({
      title: SHOP_TITLE,
      description: SHOP_DESCRIPTION,
      canonical: matched ? `${SITE_URL}/category/${matched.slug}` : canonical,
      // Search/sort/price variants are low-value duplicates of the shop page.
      robots: filtered && !matched ? NOINDEX : INDEX,
      ogUrl: canonical,
    }),
    jsonLd: [
      buildCollectionPageJsonLd({
        name: 'Shop all products',
        description: SHOP_DESCRIPTION,
        path: '/shop',
        items,
      }),
      buildBreadcrumbJsonLd([
        { name: 'Home', path: '/' },
        { name: 'Shop', path: '/shop' },
      ]),
    ],
    bodyHtml: shell(
      breadcrumbHtml([
        { name: 'Home', path: '/' },
        { name: 'Shop', path: '/shop' },
      ]) +
        `<h1>Shop homemade foods online</h1><p>${escapeHtml(SHOP_DESCRIPTION)}</p>` +
        (cats.length ? `<h2>Categories</h2>${categoryLinksHtml(cats)}` : '') +
        `<h2>All products</h2>${productListHtml(data.products)}`,
    ),
  };
}

export function buildMenuPage(data: CatalogData): PageSeoDescriptor {
  const canonical = `${SITE_URL}/menu`;
  const cats = listableCategories(data);
  const sections = cats
    .map((c) => {
      const items = data.products.filter((p) => p.primaryCategory?.slug === c.slug);
      return `<section><h2><a href="/category/${escapeHtml(c.slug)}">${escapeHtml(c.name)}</a></h2>${productListHtml(items)}</section>`;
    })
    .join('');
  return {
    status: 200,
    head: baseHead({ title: MENU_TITLE, description: MENU_DESCRIPTION, canonical }),
    jsonLd: [
      buildCollectionPageJsonLd({
        name: `${BRAND_NAME} menu`,
        description: MENU_DESCRIPTION,
        path: '/menu',
        items: cats.map((c) => ({ name: c.name, path: `/category/${c.slug}` })),
      }),
      buildBreadcrumbJsonLd([
        { name: 'Home', path: '/' },
        { name: 'Menu', path: '/menu' },
      ]),
    ],
    bodyHtml: shell(
      breadcrumbHtml([
        { name: 'Home', path: '/' },
        { name: 'Menu', path: '/menu' },
      ]) + `<h1>Our menu and price list</h1><p>${escapeHtml(MENU_DESCRIPTION)}</p>${sections}`,
    ),
  };
}

export function buildContactPage(data: CatalogData): PageSeoDescriptor {
  const canonical = `${SITE_URL}/contact`;
  const c = data.contact || {};
  const lines: string[] = [];
  if (c.phone)
    lines.push(
      `<li>Phone: <a href="tel:${escapeHtml(c.phone.replace(/[^\d+]/g, ''))}">${escapeHtml(c.phone)}</a></li>`,
    );
  if (c.alternatePhone)
    lines.push(
      `<li>Alternate phone: <a href="tel:${escapeHtml(c.alternatePhone.replace(/[^\d+]/g, ''))}">${escapeHtml(c.alternatePhone)}</a></li>`,
    );
  if (c.email)
    lines.push(
      `<li>Email: <a href="mailto:${escapeHtml(c.email)}">${escapeHtml(c.email)}</a></li>`,
    );
  if (c.address) lines.push(`<li>Address: ${escapeHtml(c.address)}</li>`);
  return {
    status: 200,
    head: baseHead({ title: CONTACT_TITLE, description: CONTACT_DESCRIPTION, canonical }),
    jsonLd: [
      {
        '@context': 'https://schema.org',
        '@type': 'ContactPage',
        name: `Contact ${BRAND_NAME}`,
        url: canonical,
        about: buildOrganizationJsonLd(c),
      },
      buildBreadcrumbJsonLd([
        { name: 'Home', path: '/' },
        { name: 'Contact', path: '/contact' },
      ]),
    ],
    bodyHtml: shell(
      breadcrumbHtml([
        { name: 'Home', path: '/' },
        { name: 'Contact', path: '/contact' },
      ]) +
        `<h1>Contact us</h1><p>${escapeHtml(CONTACT_DESCRIPTION)}</p>` +
        (lines.length ? `<ul>${lines.join('')}</ul>` : ''),
    ),
  };
}

export function buildCategoryPage(category: any, data: CatalogData): PageSeoDescriptor {
  const defaults = CATEGORY_SEO[category.slug];
  const path = `/category/${category.slug}`;
  const canonical = `${SITE_URL}${path}`;
  const products = data.products.filter(
    (p) => String(p.primaryCategory?._id || p.primaryCategory) === String(category._id),
  );
  const heading = defaults?.heading || category.name;
  const title = (
    category.seoTitle ||
    defaults?.title ||
    `${category.name} Online | ${BRAND_NAME}`
  ).trim();
  const productNames = products.slice(0, 4).map((p) => p.title);
  const description = truncateWords(
    (
      category.seoDescription ||
      defaults?.description ||
      `Shop ${category.name.toLowerCase()} from ${BRAND_NAME}${
        productNames.length ? `, including ${productNames.join(', ')}` : ''
      }. Compare pack sizes and prices and order online.`
    ).trim(),
    SEO_LIMITS.descriptionMax,
  );
  const intro = (category.seoIntro || defaults?.intro || description).trim();
  const crumbs: Crumb[] = [
    { name: 'Home', path: '/' },
    { name: 'Shop', path: '/shop' },
    { name: category.name, path },
  ];
  const coverImage = toOgImageUrl(
    getProductImages(products[0] || {})[0] || category.imageSrc || '',
  );
  return {
    status: 200,
    head: baseHead({
      title,
      description,
      canonical,
      // Empty categories are thin pages: keep them out of the index until stocked.
      robots: products.length ? INDEX : NOINDEX,
      ...(coverImage
        ? {
            ogImage: coverImage,
            ogImageAlt: `${heading} from ${BRAND_NAME}`,
            ...(/w_1200,h_630/.test(coverImage)
              ? { ogImageWidth: 1200, ogImageHeight: 630, ogImageType: 'image/jpeg' }
              : { ogImageWidth: undefined, ogImageHeight: undefined, ogImageType: undefined }),
          }
        : {}),
    }),
    page: { heading, intro, category: { name: category.name, slug: category.slug } },
    jsonLd: [
      buildCollectionPageJsonLd({
        name: heading,
        description,
        path,
        items: products.map((p) => ({ name: p.title, path: `/product/${p.slug}` })),
      }),
      buildBreadcrumbJsonLd(crumbs),
    ],
    bodyHtml: shell(
      breadcrumbHtml(crumbs) +
        `<h1>${escapeHtml(heading)}</h1><p>${escapeHtml(intro)}</p>` +
        (products.length
          ? `<h2>${escapeHtml(category.name)} available now</h2>${productListHtml(products)}`
          : `<p>No products are available in this category right now. <a href="/shop">Browse all products</a>.</p>`),
    ),
  };
}

export function buildProductPage(product: any, data: CatalogData): PageSeoDescriptor {
  const seo = resolveProductSeo(product);
  const payload = buildProductSeoPayload(product);
  const packs = getPackOptions(product);
  const inStock = isProductInStock(product);
  const prices = packs.length ? packs.map((p) => p.price) : [Number(product.price) || 0];
  const minPrice = Math.min(...prices);
  const category = product.primaryCategory;
  const related = data.products
    .filter(
      (p) =>
        String(p._id) !== String(product._id) &&
        category &&
        String(p.primaryCategory?._id || p.primaryCategory) === String(category._id || category),
    )
    .slice(0, 8);
  const description = stripHtml(product.description);
  const images = getProductImages(product);

  return {
    status: 200,
    head: baseHead({
      title: seo.seoTitle,
      description: seo.seoDescription,
      canonical: seo.canonicalUrl,
      robots: seo.robots,
      keywords: payload.keywords,
      ogType: 'product',
      ogTitle: seo.seoOgTitle,
      ogDescription: seo.seoOgDescription,
      ogImage: seo.seoOgImage || DEFAULT_OG_IMAGE,
      ogImageWidth: seo.seoOgImage ? seo.ogImageWidth : 1200,
      ogImageHeight: seo.seoOgImage ? seo.ogImageHeight : 630,
      ogImageType: seo.seoOgImage ? seo.ogImageType : 'image/png',
      ogImageAlt: seo.seoImageAlt,
      productPrice: minPrice.toFixed(2),
      productAvailability: inStock ? 'in stock' : 'out of stock',
    }),
    jsonLd: payload.jsonLd,
    bodyHtml: shell(
      breadcrumbHtml(payload.breadcrumbs) +
        `<article>` +
        (images[0]
          ? `<img src="${escapeHtml(images[0])}" alt="${escapeHtml(seo.seoImageAlt)}" width="600" height="600">`
          : '') +
        `<h1>${escapeHtml(product.title)}</h1>` +
        `<p>${packs.length > 1 ? 'From ' : ''}${escapeHtml(inr(minPrice))} · ${inStock ? 'In stock' : 'Out of stock'}</p>` +
        (description ? `<p>${escapeHtml(description)}</p>` : '') +
        (packs.length
          ? `<h2>Pack sizes</h2><ul>${packs
              .map(
                (p) =>
                  `<li>${escapeHtml(p.label)}: ${escapeHtml(inr(p.price))}${p.available ? '' : ' (unavailable)'}</li>`,
              )
              .join('')}</ul>`
          : '') +
        (product.seoContent
          ? `<h2>About ${escapeHtml(payload.displayName)}</h2><p>${escapeHtml(product.seoContent)}</p>`
          : '') +
        `</article>` +
        (related.length
          ? `<h2>More ${escapeHtml(category?.name || 'products')}</h2>${productListHtml(related)}`
          : '') +
        (category?.slug
          ? `<p><a href="/category/${escapeHtml(category.slug)}">See all ${escapeHtml(category.name)}</a></p>`
          : ''),
    ),
  };
}

export function buildNotFoundPage(status: 404 | 410 = 404): PageSeoDescriptor {
  const title =
    status === 410
      ? `Product No Longer Available | ${BRAND_NAME}`
      : `Page Not Found | ${BRAND_NAME}`;
  const description =
    status === 410
      ? 'This product has been removed from our catalogue. Browse our current batters, pickles, chutneys, podis, namkeen and cashews.'
      : 'The page you are looking for has moved or is no longer available.';
  return {
    status,
    head: baseHead({ title, description, robots: 'noindex, follow' }),
    jsonLd: [],
    bodyHtml: shell(
      `<h1>${status === 410 ? 'Product no longer available' : 'Page not found'}</h1><p>${escapeHtml(description)}</p><p><a href="/shop">Browse all products</a></p>`,
    ),
  };
}

const redirect = (to: string): PageSeoDescriptor => ({
  ...buildNotFoundPage(),
  status: 301,
  redirect: to,
});

// ─── Data loading + routing ──────────────────────────────────────────────────

async function loadContact(): Promise<StoreContact> {
  try {
    const { storeSettingsService } = require('../StoreSettingsService');
    const settings: any = await storeSettingsService.getPublicSettings();
    const c = settings?.contact || {};
    const g = settings?.general || {};
    return {
      storeName: g.storeName || BRAND_NAME,
      phone: c.phone || g.phone || '',
      alternatePhone: c.alternatePhone || '',
      email: c.email || g.supportEmail || '',
      address: c.address || [c.addressLine1, c.addressLine2].filter(Boolean).join(', '),
      city: c.city || '',
      state: c.state || '',
      country: c.country || '',
      postalCode: c.postalCode || '',
      sameAs: [c.instagram, c.facebook, c.pinterest, c.youtube].filter(
        (u: unknown) => typeof u === 'string' && /^https?:\/\//.test(u),
      ),
    };
  } catch {
    return { storeName: BRAND_NAME };
  }
}

let catalogCache: { at: number; version: number; data: CatalogData } | null = null;
const CATALOG_TTL_MS = 5 * 60 * 1000;

export async function loadCatalog(): Promise<CatalogData> {
  const version = getSeoCacheVersion();
  if (
    catalogCache &&
    catalogCache.version === version &&
    Date.now() - catalogCache.at < CATALOG_TTL_MS
  ) {
    return catalogCache.data;
  }
  const [products, categories, contact] = await Promise.all([
    Product.find({ isActive: true })
      .select(
        'title slug price stock reservedStock isActive isDeleted featured imageSrc images optionGroups primaryCategory seoIndexable updatedAt createdAt',
      )
      .populate('primaryCategory', 'name slug')
      .sort({ featured: -1, createdAt: -1 })
      .lean(),
    Category.find({ isActive: true })
      .select('name slug imageSrc displayOrder seoTitle seoDescription seoIntro updatedAt')
      .lean(),
    loadContact(),
  ]);
  const data: CatalogData = {
    products: (products as any[]).filter((p) => isProductPublic(p) && p.seoIndexable !== false),
    categories: categories as any[],
    contact,
  };
  catalogCache = { at: Date.now(), version, data };
  return data;
}

const PRODUCT_FIELDS_POPULATE = { path: 'primaryCategory', select: 'name slug' };

async function resolveProductRoute(key: string, data: CatalogData): Promise<PageSeoDescriptor> {
  const slug = key.toLowerCase();
  const product: any = await Product.findOne({ slug }).populate(PRODUCT_FIELDS_POPULATE).lean();

  if (!product && mongoose.Types.ObjectId.isValid(key)) {
    const byId: any = await Product.findById(key).select('slug isActive').lean();
    if (byId?.isActive && byId.slug) return redirect(`/product/${byId.slug}`);
  }
  if (!product) {
    const renamed: any = await Product.findOne({ previousSlugs: slug })
      .select('slug isActive')
      .lean();
    if (renamed?.isActive && renamed.slug) return redirect(`/product/${renamed.slug}`);
  }
  if (!product) {
    // Soft-deleted products answer 410 Gone so crawlers drop them quickly.
    const deleted = await Product.findOne({
      isDeleted: true,
      $or: [
        { slug },
        { previousSlugs: slug },
        ...(mongoose.Types.ObjectId.isValid(key) ? [{ _id: key }] : []),
      ],
    })
      .select('_id')
      .lean();
    return buildNotFoundPage(deleted ? 410 : 404);
  }
  if (!isProductPublic(product)) return buildNotFoundPage(404);
  return buildProductPage(product, data);
}

/** Legacy and alias URLs that permanently moved (mirrors the SPA's <Navigate> routes). */
const LEGACY_REDIRECTS: Record<string, string> = {
  '/collections': '/shop',
  '/about': '/',
  '/shipping': '/policy/shipping-policy',
  '/refund': '/policy/refund-policy',
  '/cancellation': '/policy/cancellation-policy',
  '/privacy': '/policy/privacy-policy',
  '/terms': '/policy/terms-and-conditions',
  '/return': '/policy/return-policy',
  '/returns': '/policy/return-policy',
  '/exchange': '/policy/exchange-policy',
};

/** First path segments the SPA routes; anything else is a real 404. */
const SPA_SEGMENTS = new Set([
  '',
  'shop',
  'collections',
  'product',
  'category',
  'collection',
  'menu',
  'contact',
  'policy',
]);
/** Public SPA routes rendered client-side without server SEO data. */
const SPA_ONLY_SEGMENTS = new Set(['policy']);

/**
 * Entry point: resolve a storefront path (optionally with query string).
 * Returns `null` for routes the SPA owns without SEO data (private pages and
 * policy pages handled client-side), so the renderer serves the plain shell.
 */
export async function resolvePageSeo(rawPath: string): Promise<PageSeoDescriptor | null> {
  const url = new URL(rawPath || '/', SITE_URL);
  const path = url.pathname.replace(/\/{2,}/g, '/');

  if (PRIVATE_PATH_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`))) return null;

  // One preferred URL per page: no trailing slash, lower-case path.
  const normalized = (path.length > 1 ? path.replace(/\/+$/, '') : path).toLowerCase();
  if (normalized !== path) return redirect(`${normalized}${url.search}`);

  if (LEGACY_REDIRECTS[normalized]) return redirect(LEGACY_REDIRECTS[normalized]);

  const firstSegment = normalized.split('/')[1] || '';
  if (!SPA_SEGMENTS.has(firstSegment)) return buildNotFoundPage(404);
  if (SPA_ONLY_SEGMENTS.has(firstSegment)) return null;

  const data = await loadCatalog();

  if (normalized === '/') return buildHomePage(data);
  if (normalized === '/shop' || normalized === '/collections')
    return buildShopPage(data, url.searchParams);
  if (normalized === '/menu') return buildMenuPage(data);
  if (normalized === '/contact') return buildContactPage(data);

  const categoryMatch = normalized.match(/^\/(category|collection)\/([^/]+)$/);
  if (categoryMatch) {
    const slug = decodeURIComponent(categoryMatch[2]).toLowerCase();
    const category =
      data.categories.find((c) => c.slug === slug) ||
      data.categories.find((c) => c.name.toLowerCase().replace(/\s+/g, '-') === slug);
    if (!category) return buildNotFoundPage(404);
    if (categoryMatch[1] === 'collection' || category.slug !== slug) {
      return redirect(`/category/${category.slug}`);
    }
    return buildCategoryPage(category, data);
  }

  const productMatch = normalized.match(/^\/product\/([^/]+)(\/reviews(\/images)?)?$/);
  if (productMatch) {
    const result = await resolveProductRoute(decodeURIComponent(productMatch[1]), data);
    // Review sub-views share the product's metadata but are not separate pages.
    if (productMatch[2] && result.status === 200) {
      return { ...result, head: { ...result.head, robots: NOINDEX } };
    }
    if (productMatch[2] && result.status === 301 && result.redirect) {
      return { ...result, redirect: `${result.redirect}${productMatch[2]}` };
    }
    return result;
  }

  return null;
}
