import Product from '../../models/Product';
import { BRAND_NAME, SITE_URL } from '../../config/seoConfig';
import { escapeXml } from './sitemapService';
import {
  getCategoryContext,
  getPackOptions,
  getProductImages,
  isProductInStock,
  isProductIndexable,
  resolveProductSeo,
  slugify,
  stripHtml,
} from './productSeo';
import { getSeoCacheVersion } from './seoCache';

/**
 * Google Merchant Center product feed (RSS 2.0 + g: namespace), generated from
 * the live catalogue. One item per purchasable pack size, grouped with
 * item_group_id. Only verified attributes are emitted: no GTINs (the store
 * has none, so identifier_exists=no), no invented shipping or sale data.
 * Shipping and returns should be configured in Merchant Center itself.
 */

export interface FeedItem {
  id: string;
  itemGroupId?: string;
  title: string;
  description: string;
  link: string;
  imageLink: string;
  additionalImageLinks: string[];
  availability: 'in_stock' | 'out_of_stock';
  price: string;
  size?: string;
  productType?: string;
}

export function buildFeedItems(products: any[]): FeedItem[] {
  const items: FeedItem[] = [];
  for (const product of products) {
    if (!isProductIndexable(product)) continue;
    const images = getProductImages(product);
    if (!images.length) continue; // image_link is mandatory
    const seo = resolveProductSeo(product);
    const category = getCategoryContext(product);
    const description = (stripHtml(product.description) || seo.seoDescription).slice(0, 5000);
    const baseId = product.sku || String(product._id);
    const inStock = isProductInStock(product);
    const packs = getPackOptions(product);
    const common = {
      description,
      link: seo.canonicalUrl,
      imageLink: images[0],
      additionalImageLinks: images.slice(1, 10),
      productType: category.name,
    };

    if (packs.length >= 2) {
      for (const pack of packs) {
        items.push({
          ...common,
          id: `${baseId}-${slugify(pack.label) || 'pack'}`,
          itemGroupId: baseId,
          title: `${product.title} (${pack.label})`.slice(0, 150),
          availability: inStock && pack.available ? 'in_stock' : 'out_of_stock',
          price: `${pack.price.toFixed(2)} INR`,
          size: pack.label,
        });
      }
    } else {
      const pack = packs[0];
      items.push({
        ...common,
        id: baseId,
        title: String(product.title).slice(0, 150),
        availability: inStock && (pack ? pack.available : true) ? 'in_stock' : 'out_of_stock',
        price: `${(pack ? pack.price : Number(product.price) || 0).toFixed(2)} INR`,
        ...(pack ? { size: pack.label } : {}),
      });
    }
  }
  return items;
}

export function buildFeedXml(items: FeedItem[]): string {
  const tag = (name: string, value?: string) =>
    value ? `      <g:${name}>${escapeXml(value)}</g:${name}>` : '';
  const body = items
    .map((item) =>
      [
        '    <item>',
        tag('id', item.id),
        tag('item_group_id', item.itemGroupId),
        tag('title', item.title),
        tag('description', item.description),
        tag('link', item.link),
        tag('image_link', item.imageLink),
        ...item.additionalImageLinks.map((l) => tag('additional_image_link', l)),
        tag('availability', item.availability),
        tag('price', item.price),
        tag('condition', 'new'),
        tag('brand', BRAND_NAME),
        tag('identifier_exists', 'no'),
        tag('size', item.size),
        tag('product_type', item.productType),
        '    </item>',
      ]
        .filter(Boolean)
        .join('\n'),
    )
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>${escapeXml(BRAND_NAME)}</title>
    <link>${escapeXml(`${SITE_URL}/`)}</link>
    <description>${escapeXml(`${BRAND_NAME} product feed`)}</description>
${body}
  </channel>
</rss>
`;
}

let cache: { at: number; version: number; xml: string } | null = null;
const CACHE_TTL_MS = 10 * 60 * 1000;

export async function renderMerchantFeed(): Promise<string> {
  const version = getSeoCacheVersion();
  if (cache && cache.version === version && Date.now() - cache.at < CACHE_TTL_MS) return cache.xml;
  const products = await Product.find({ isActive: true, seoIndexable: { $ne: false } })
    .select(
      'title slug sku description price stock reservedStock isActive isDeleted imageSrc images optionGroups primaryCategory seoIndexable seoOverrides seoCanonicalUrl seoDescription',
    )
    .populate('primaryCategory', 'name slug')
    .lean();
  const xml = buildFeedXml(buildFeedItems(products as any[]));
  cache = { at: Date.now(), version, xml };
  return xml;
}
