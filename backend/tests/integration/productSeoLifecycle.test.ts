import './setup';
import mongoose from 'mongoose';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/socket', () => ({
  emitAdminEvent: vi.fn(),
  emitGlobalUserEvent: vi.fn(),
  emitAdminNotification: vi.fn(),
}));

import Category from '../../src/models/Category';
import Product from '../../src/models/Product';
import ProductService from '../../src/services/productService';
import { CategoryService } from '../../src/services/CategoryService';
import { resolvePageSeo } from '../../src/services/seo/pageSeoService';
import { renderSitemap } from '../../src/services/seo/sitemapService';
import { renderMerchantFeed } from '../../src/services/seo/merchantFeedService';
import { triggerSitemapUpdate } from '../../src/utils/sitemapGenerator';
import { SITE_URL } from '../../src/config/seoConfig';

// Fixed id: CategoryService.intelligentMatch memoises name -> id across tests.
const PICKLES_ID = new mongoose.Types.ObjectId();
const IMG = 'https://res.cloudinary.com/demo/image/upload/v1/akulas-kitchen/products/mango.jpg';

const payload = (over: Record<string, any> = {}) => ({
  title: 'Mango Avakaaya',
  category: 'Pickles',
  description:
    'Tangy and spicy mango pickle made with authentic Andhra spices. Perfect accompaniment for rice.',
  price: 500,
  stock: 50,
  imageSrc: IMG,
  images: [IMG],
  isActive: true,
  optionGroups: [
    {
      name: 'Weight',
      type: 'SINGLE_SELECT',
      required: true,
      sortOrder: 0,
      options: [
        { label: '250g', value: '250g', priceAdjustment: 0, available: true, sortOrder: 0 },
        { label: '1kg', value: '1kg', priceAdjustment: 200, available: true, sortOrder: 1 },
      ],
    },
  ],
  ...over,
});

const productLd = (descriptor: any) =>
  descriptor.jsonLd.find((j: any) => j['@type'] === 'ProductGroup' || j['@type'] === 'Product');

describe('Product SEO lifecycle (real ProductService + MongoDB)', () => {
  beforeEach(async () => {
    CategoryService.invalidateCache(); // collections are wiped between tests
    await Category.create({
      _id: PICKLES_ID,
      name: 'Pickles',
      slug: 'pickles',
      type: 'product',
      isActive: true,
    } as any);
    triggerSitemapUpdate();
  });

  it('1-2. creating a product generates slug and SEO fields automatically', async () => {
    const created: any = await ProductService.createProduct(payload() as any);
    expect(created.slug).toBe('mango-avakaaya');
    expect(created.seoTitle).toBe("Homemade Mango Avakaaya Pickle | Akula's Kitchen");
    expect(created.seoDescription).toContain('250g and 1kg');
    expect(created.seoImageAlt).toContain('Mango Avakaaya Pickle');
    expect(created.seoOverrides).toEqual([]);

    // A second product with the same title gets a unique slug instead of failing.
    const dup: any = await ProductService.createProduct(payload({ sku: 'DUP-1' }) as any);
    expect(dup.slug).toBe('mango-avakaaya-2');
  });

  it('3. manual SEO edits survive later ordinary updates', async () => {
    const created: any = await ProductService.createProduct(payload() as any);
    const edited: any = await ProductService.updateProduct(String(created._id), {
      seoTitle: 'Avakaya Mango Pickle | Akula',
      __v: created.__v,
    } as any);
    expect(edited.seoOverrides).toContain('seoTitle');

    const later: any = await ProductService.updateProduct(String(created._id), {
      description: 'A new description sentence. More detail.',
      __v: edited.__v,
    } as any);
    expect(later.seoTitle).toBe('Avakaya Mango Pickle | Akula');
    expect(later.seoDescription).toContain('A new description sentence.');
  });

  it('4-5. price and stock changes flow into page metadata and structured data', async () => {
    const created: any = await ProductService.createProduct(payload() as any);
    let page: any = await resolvePageSeo('/product/mango-avakaaya');
    expect(productLd(page).hasVariant[0].offers.price).toBe('500.00');
    expect(productLd(page).hasVariant[0].offers.availability).toBe('https://schema.org/InStock');

    const repriced: any = await ProductService.updateProduct(String(created._id), {
      price: 450,
      stock: 0,
      __v: created.__v,
    } as any);
    expect(repriced.price).toBe(450);
    page = await resolvePageSeo('/product/mango-avakaaya');
    expect(productLd(page).hasVariant[0].offers.price).toBe('450.00');
    expect(productLd(page).hasVariant[1].offers.price).toBe('650.00');
    for (const v of productLd(page).hasVariant) {
      expect(v.offers.availability).toBe('https://schema.org/OutOfStock');
    }
    expect(page.head.productAvailability).toBe('out of stock');
  });

  it('6. unpublishing removes the product from sitemap/feed and the URL 404s; republishing restores it', async () => {
    const created: any = await ProductService.createProduct(payload() as any);
    expect(await renderSitemap()).toContain(`${SITE_URL}/product/mango-avakaaya`);
    expect(await renderMerchantFeed()).toContain('/product/mango-avakaaya');

    await ProductService.updateStatus(String(created._id), 'inactive');
    expect(await renderSitemap()).not.toContain('/product/mango-avakaaya');
    expect(await renderMerchantFeed()).not.toContain('/product/mango-avakaaya');
    expect((await resolvePageSeo('/product/mango-avakaaya'))!.status).toBe(404);

    await ProductService.updateStatus(String(created._id), 'active');
    expect(await renderSitemap()).toContain('/product/mango-avakaaya');
    expect((await resolvePageSeo('/product/mango-avakaaya'))!.status).toBe(200);
  });

  it('7. deleting a product answers 410 and drops it from the sitemap', async () => {
    const created: any = await ProductService.createProduct(payload() as any);
    // ProductService.deleteProduct performs exactly this soft delete, then cleans
    // user carts via a CommonJS require that vitest cannot resolve for .ts files.
    const doc: any = await Product.findById(created._id);
    doc.isDeleted = true;
    doc.deletedAt = new Date();
    await doc.save();
    expect(await renderSitemap()).not.toContain('/product/mango-avakaaya');
    expect((await resolvePageSeo('/product/mango-avakaaya'))!.status).toBe(410);
    // The deleted product's slug is not silently reused.
    const next: any = await ProductService.createProduct(payload({ sku: 'NEW-1' }) as any);
    expect(next.slug).toBe('mango-avakaaya-2');
  });

  it('8. updating images updates Open Graph image and alt text', async () => {
    const created: any = await ProductService.createProduct(payload() as any);
    const NEW_IMG =
      'https://res.cloudinary.com/demo/image/upload/v2/akulas-kitchen/products/jar.jpg';
    const updated: any = await ProductService.updateProduct(String(created._id), {
      imageSrc: NEW_IMG,
      images: [NEW_IMG, IMG],
      __v: created.__v,
    } as any);
    expect(updated.seoOgImage).toContain('/v2/akulas-kitchen/products/jar.jpg');
    const page: any = await resolvePageSeo('/product/mango-avakaaya');
    expect(page.head.ogImage).toContain('w_1200,h_630');
    expect(page.head.ogImage).toContain('jar.jpg');
    expect(page.head.ogImageWidth).toBe(1200);
  });

  it('9. sitemap lists new products by slug with category pages', async () => {
    await ProductService.createProduct(payload() as any);
    const xml = (await renderSitemap())!;
    expect(xml).toContain(`<loc>${SITE_URL}/product/mango-avakaaya</loc>`);
    expect(xml).toContain(`<loc>${SITE_URL}/category/pickles</loc>`);
    expect(xml).not.toMatch(/\/product\/[a-f0-9]{24}</);
  });

  it('10. page metadata: canonical, redirects for ObjectId and renamed slugs', async () => {
    const created: any = await ProductService.createProduct(payload() as any);
    const page: any = await resolvePageSeo('/product/mango-avakaaya');
    expect(page.status).toBe(200);
    expect(page.head.title).toBe("Homemade Mango Avakaaya Pickle | Akula's Kitchen");
    expect(page.head.canonical).toBe(`${SITE_URL}/product/mango-avakaaya`);
    expect(page.bodyHtml).toContain('<h1>Mango Avakaaya</h1>');

    const byId: any = await resolvePageSeo(`/product/${created._id}`);
    expect(byId).toMatchObject({ status: 301, redirect: '/product/mango-avakaaya' });

    await ProductService.updateProduct(String(created._id), {
      slug: 'homemade-mango-avakaya-pickle',
      __v: created.__v,
    } as any);
    const old: any = await resolvePageSeo('/product/mango-avakaaya');
    expect(old).toMatchObject({ status: 301, redirect: '/product/homemade-mango-avakaya-pickle' });
    const stored: any = await Product.findById(created._id).lean();
    expect(stored.previousSlugs).toContain('mango-avakaaya');

    // Storefront API still resolves the retired slug for old links.
    const apiProduct: any = await ProductService.getProductById('mango-avakaaya');
    expect(apiProduct.slug).toBe('homemade-mango-avakaya-pickle');
    expect(apiProduct.seo.canonicalUrl).toBe(`${SITE_URL}/product/homemade-mango-avakaya-pickle`);
  });

  it('handles category, legacy and unknown routes with correct statuses', async () => {
    await ProductService.createProduct(payload() as any);
    expect((await resolvePageSeo('/category/pickles'))!.status).toBe(200);
    expect(await resolvePageSeo('/collection/pickles')).toMatchObject({
      status: 301,
      redirect: '/category/pickles',
    });
    expect((await resolvePageSeo('/shop'))!.status).toBe(200);
    expect(await resolvePageSeo('/collections')).toMatchObject({ status: 301, redirect: '/shop' });
    expect(await resolvePageSeo('/Contact/')).toMatchObject({ status: 301, redirect: '/contact' });
    expect((await resolvePageSeo('/category/does-not-exist'))!.status).toBe(404);
    expect((await resolvePageSeo('/totally-unknown'))!.status).toBe(404);
    expect(await resolvePageSeo('/checkout')).toBeNull();
  });
});
