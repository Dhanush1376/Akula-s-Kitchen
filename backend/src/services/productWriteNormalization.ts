import mongoose from 'mongoose';
import { IProduct } from '../models/Product';
import Category from '../models/Category';
import { CategoryService } from './CategoryService';
import ApiError from '../utils/ApiError';
import { NormalizationEngine } from './NormalizationEngine';

// Product write-path normalization helpers extracted from productService.ts:
// image de-duplication/limits and category resolution.
// Pure input-shaping used by ProductService create/update — no query/cache concerns.

export function normalizeProductImages(data: Partial<IProduct>, existingProduct?: IProduct) {
  const rawImages = Array.isArray(data.images) ? data.images : undefined;
  const imageSrc = typeof data.imageSrc === 'string' ? data.imageSrc.trim() : undefined;
  const existingImageSrc =
    typeof existingProduct?.imageSrc === 'string' ? existingProduct.imageSrc.trim() : undefined;

  const orderedImages = [...(imageSrc ? [imageSrc] : []), ...(rawImages || [])]
    .map((img) => (typeof img === 'string' ? img.trim() : ''))
    .filter(Boolean);
  const uniqueImages = Array.from(new Set(orderedImages));

  if (uniqueImages.length > 4) {
    throw new ApiError(400, 'A product can have a maximum of 4 images');
  }

  if (uniqueImages.length > 0) {
    data.imageSrc = uniqueImages[0];
    data.images = uniqueImages.slice(1, 4);
    return;
  }

  if (!existingProduct) {
    return;
  }

  if (rawImages && rawImages.length === 0 && !imageSrc) {
    data.images = [];
    return;
  }

  if (!imageSrc && rawImages === undefined && existingImageSrc) {
    data.imageSrc = existingImageSrc;
  }
}

export async function resolveCategories(data: any) {
  // Frontend might send 'category' string or 'primaryCategory' string
  const primaryString = data.primaryCategory || data.category;
  if (typeof primaryString === 'string') {
    const matchedId = await CategoryService.intelligentMatch(primaryString);
    if (matchedId) {
      data.primaryCategory = matchedId;
    } else {
      // Auto-create safe fallback
      const fallbackCat = await Category.create({
        name: primaryString.trim(),
        slug: primaryString
          .trim()
          .replace(/[\s\W-]+/g, '-')
          .toLowerCase(),
        type: 'product',
        isActive: true,
      });
      data.primaryCategory = fallbackCat._id;
    }
  }

  // Handle secondaryCategories array of strings
  if (data.secondaryCategories && Array.isArray(data.secondaryCategories)) {
    const resolvedSec = [];
    for (const sec of data.secondaryCategories) {
      if (typeof sec === 'string') {
        const matchedId = await CategoryService.intelligentMatch(sec);
        if (matchedId) resolvedSec.push(matchedId);
      } else if (mongoose.Types.ObjectId.isValid(sec as any)) {
        resolvedSec.push(sec);
      }
    }
    data.secondaryCategories = resolvedSec;
  }
}

export async function normalizeProductAttributes(data: Partial<IProduct>) {
  if (data.variants?.length) {
    data.variants = await NormalizationEngine.normalizeVariants(data.variants);
  }

  if (data.tags?.length || typeof data.tags === 'string') {
    const tagArray =
      typeof data.tags === 'string'
        ? (data.tags as string)
            .split(',')
            .map((t: string) => t.trim())
            .filter(Boolean)
        : data.tags;
    const { tagIds, displayTags } = await NormalizationEngine.normalizeTags(tagArray as string[]);
    data.tags = displayTags;
    data.tagIds = tagIds;
  }

  if (data.material) {
    data.material = await NormalizationEngine.normalizeMaterial(data.material);
  }
}
