import mongoose from 'mongoose';
import Product from '../../models/Product';
import ApiError from '../../utils/ApiError';
import { isValidSlug, slugify } from './productSeo';

// Matches live *and* soft-deleted products: the unique slug index covers both,
// and a deleted product's URL must not be silently reused by another product.
const ANY_DELETION_STATE = { $in: [true, false, null] };

/** Paths under /product/ that collide with sub-routes of the product page. */
const RESERVED_SLUGS = new Set(['reviews', 'images', 'new', 'add', 'edit']);

export async function findSlugOwner(slug: string, excludeId?: string) {
  const filter: Record<string, any> = {
    isDeleted: ANY_DELETION_STATE,
    $or: [{ slug }, { previousSlugs: slug }],
  };
  if (excludeId && mongoose.Types.ObjectId.isValid(excludeId)) {
    filter._id = { $ne: new mongoose.Types.ObjectId(excludeId) };
  }
  return Product.findOne(filter).select('_id title slug isDeleted').lean();
}

export async function isSlugAvailable(slug: string, excludeId?: string): Promise<boolean> {
  if (!isValidSlug(slug) || RESERVED_SLUGS.has(slug)) return false;
  return !(await findSlugOwner(slug, excludeId));
}

/** Returns `base` or the first free `base-2`, `base-3`, … variant. */
export async function generateUniqueSlug(base: string, excludeId?: string): Promise<string> {
  const root = slugify(base) || 'product';
  if (await isSlugAvailable(root, excludeId)) return root;
  for (let i = 2; i < 200; i++) {
    const candidate = `${root.slice(0, 76)}-${i}`;
    if (await isSlugAvailable(candidate, excludeId)) return candidate;
  }
  return `${root.slice(0, 60)}-${Date.now().toString(36)}`;
}

/**
 * Decide the slug for a write.
 * - Create: the requested slug (or one derived from the title), made unique.
 * - Update: unchanged unless explicitly changed. A changed slug must be free;
 *   the old slug is kept in `previousSlugs` so existing links 301-redirect.
 */
export async function resolveSlugForWrite(
  data: Record<string, any>,
  existing?: { _id: any; slug?: string; previousSlugs?: string[] } | null,
): Promise<void> {
  if (!existing) {
    data.slug = await generateUniqueSlug(data.slug || data.title || '');
    return;
  }

  if (data.slug === undefined || data.slug === null || data.slug === '') {
    delete data.slug;
    return;
  }

  const requested = slugify(String(data.slug));
  if (requested === existing.slug) {
    delete data.slug;
    return;
  }
  if (!requested || !(await isSlugAvailable(requested, String(existing._id)))) {
    throw new ApiError(409, `The URL slug "${requested || data.slug}" is already used or invalid.`);
  }

  const previous = new Set(existing.previousSlugs || []);
  if (existing.slug) previous.add(existing.slug);
  previous.delete(requested);
  data.slug = requested;
  data.previousSlugs = Array.from(previous);
}
