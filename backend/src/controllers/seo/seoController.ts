import { Request, Response } from 'express';
import asyncHandler from '../../utils/asyncHandler';
import ApiResponse from '../../utils/ApiResponse';
import ApiError from '../../utils/ApiError';
import { resolvePageSeo } from '../../services/seo/pageSeoService';
import { renderMerchantFeed } from '../../services/seo/merchantFeedService';
import {
  buildProductJsonLd,
  generateProductSeo,
  isValidSlug,
  resolveProductSeo,
  slugify,
} from '../../services/seo/productSeo';
import {
  findSlugOwner,
  generateUniqueSlug,
  isSlugAvailable,
} from '../../services/seo/productSlugService';
import { SEO_LIMITS, SITE_URL } from '../../config/seoConfig';

/** Page descriptor consumed by the storefront's server-side head renderer. */
export const getPageSeo = asyncHandler(async (req: Request, res: Response) => {
  const path = typeof req.query.path === 'string' ? req.query.path : '/';
  if (!path.startsWith('/') || path.length > 2048) throw new ApiError(400, 'Invalid path');
  const descriptor = await resolvePageSeo(path);
  res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=900');
  res.status(200).json(new ApiResponse(true, 'Page SEO resolved', descriptor));
});

export const getMerchantFeed = asyncHandler(async (_req: Request, res: Response) => {
  const xml = await renderMerchantFeed();
  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=900, s-maxage=900');
  res.status(200).send(xml);
});

/** Admin: is this slug free? Suggests the nearest free alternative when not. */
export const checkSlug = asyncHandler(async (req: Request, res: Response) => {
  const raw = typeof req.query.slug === 'string' ? req.query.slug : '';
  const excludeId = typeof req.query.excludeId === 'string' ? req.query.excludeId : undefined;
  const slug = slugify(raw);
  const valid = isValidSlug(slug);
  const available = valid && (await isSlugAvailable(slug, excludeId));
  const owner = !available && valid ? await findSlugOwner(slug, excludeId) : null;
  res.status(200).json(
    new ApiResponse(true, 'Slug checked', {
      slug,
      valid,
      available,
      usedBy: owner
        ? { id: owner._id, title: (owner as any).title, deleted: Boolean((owner as any).isDeleted) }
        : null,
      suggestion: available ? slug : await generateUniqueSlug(slug || raw, excludeId),
      url: `${SITE_URL}/product/${slug}`,
    }),
  );
});

/**
 * Admin: generated SEO defaults + final resolved values + JSON-LD for a draft
 * product, so the editor previews exactly what the storefront will emit.
 */
export const previewProductSeo = asyncHandler(async (req: Request, res: Response) => {
  const draft = { ...(req.body?.product || {}) };
  const category =
    req.body?.category && typeof req.body.category === 'object' ? req.body.category : undefined;
  if (typeof draft.categoryName === 'string' && !category) {
    draft.primaryCategory = { name: draft.categoryName, slug: slugify(draft.categoryName) };
  }
  if (!draft.slug && draft.title) draft.slug = slugify(draft.title);
  const generated = generateProductSeo(draft, category);
  res.status(200).json(
    new ApiResponse(true, 'SEO preview generated', {
      generated,
      resolved: resolveProductSeo(draft, category),
      jsonLd: draft.title ? buildProductJsonLd(draft, category) : null,
      limits: SEO_LIMITS,
    }),
  );
});
