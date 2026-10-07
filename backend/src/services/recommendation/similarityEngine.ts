import Product from '../../models/Product';
import UserInteraction from '../../models/UserInteraction';
import { RecommendationCache } from './recommendationCache';
import { escapeRegex } from '../../services/searchService';
import logger from '../../config/logger';

export interface SimilarItem {
  targetId: string;
  targetType: string;
  similarityScore: number;
  matchedSignals: string[];
}

/**
 * Complementary category mapping — for "Complete the Setup" recommendations.
 * When a user views item in category A, suggest items from category B.
 */
const COMPLEMENTARY_CATEGORIES: Record<string, string[]> = {};

/**
 * Compute Jaccard similarity between two tag/keyword arrays.
 */
function jaccardSimilarity(a: string[], b: string[]): number {
  if (a.length === 0 && b.length === 0) return 0;
  const setA = new Set(a.map((s) => s.toLowerCase()));
  const setB = new Set(b.map((s) => s.toLowerCase()));
  const intersection = new Set([...setA].filter((x) => setB.has(x)));
  const union = new Set([...setA, ...setB]);
  return union.size > 0 ? intersection.size / union.size : 0;
}

/**
 * Compute price proximity score (0-1).
 * Returns 1 if same price, decays as difference grows.
 */
function priceProximity(priceA: number, priceB: number): number {
  if (priceA === 0 || priceB === 0) return 0;
  const ratio = Math.min(priceA, priceB) / Math.max(priceA, priceB);
  return ratio >= 0.7 ? (ratio - 0.7) / 0.3 : 0; // Only count if within 30% range
}

/**
 * Find similar items for a given product.
 */
export async function findSimilarProducts(
  productId: string,
  options: { limit?: number } = {},
): Promise<SimilarItem[]> {
  const limit = options.limit || 12;

  try {
    // Check cache
    const cached = await RecommendationCache.getSimilar(productId);
    if (cached) return cached;

    const sourceProduct = await Product.findById(productId)
      .select('primaryCategory tags price material badges')
      .lean();

    if (!sourceProduct) return [];

    // Find candidates in same or related categories
    const relatedCategories = [
      sourceProduct.primaryCategory,
      ...(COMPLEMENTARY_CATEGORIES[sourceProduct.primaryCategory?.toString().toLowerCase()] || []),
    ];

    const candidates = await Product.find({
      _id: { $ne: productId },
      isActive: true,
      category: { $in: relatedCategories.map((c) => new RegExp(escapeRegex(String(c)), 'i')) },
    })
      .select('_id primaryCategory tags price material badges')
      .limit(100)
      .lean();

    // Score each candidate
    const scored: SimilarItem[] = candidates.map((candidate) => {
      const matchedSignals: string[] = [];
      let score = 0;

      // Tag similarity (Jaccard)
      const tagSim = jaccardSimilarity(sourceProduct.tags || [], candidate.tags || []);
      score += tagSim * 0.35;
      if (tagSim > 0) matchedSignals.push('tags');

      // Same category
      if (candidate.primaryCategory?.toString() === sourceProduct.primaryCategory?.toString()) {
        score += 0.25;
        matchedSignals.push('category');
      }

      // Price proximity
      const priceSim = priceProximity(sourceProduct.price || 0, candidate.price || 0);
      score += priceSim * 0.15;
      if (priceSim > 0) matchedSignals.push('price');

      // Same material
      if (
        candidate.material &&
        sourceProduct.material &&
        candidate.material.toLowerCase() === sourceProduct.material.toLowerCase()
      ) {
        score += 0.1;
        matchedSignals.push('material');
      }

      // Badge overlap
      const badgeSim = jaccardSimilarity(sourceProduct.badges || [], candidate.badges || []);
      score += badgeSim * 0.15;
      if (badgeSim > 0) matchedSignals.push('badges');

      return {
        targetId: (candidate._id as any).toString(),
        targetType: 'product' as const,
        similarityScore: Math.round(score * 100) / 100,
        matchedSignals,
      };
    });

    const sorted = scored.sort((a, b) => b.similarityScore - a.similarityScore).slice(0, limit);

    await RecommendationCache.setSimilar(productId, sorted);
    return sorted;
  } catch (err: any) {
    logger.error(
      `[SIMILARITY ENGINE] Error finding similar products for ${productId}: ${err.message}`,
    );
    return [];
  }
}

/**
 * "Users Also Viewed" — collaborative-style recommendations.
 * Find items that other users who viewed item X also viewed.
 */
export async function getUsersAlsoViewed(
  targetId: string,
  targetType: string,
  options: { limit?: number } = {},
): Promise<SimilarItem[]> {
  const limit = options.limit || 10;
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  try {
    // Find users/sessions that viewed this item
    const viewers = await UserInteraction.distinct('sessionId', {
      targetId: targetId as any,
      targetType: targetType as any,
      eventType: 'product_view',
      timestamp: { $gte: sevenDaysAgo },
    });

    if (viewers.length === 0) return [];

    // Find what else those users viewed
    const coViewed = await UserInteraction.aggregate([
      {
        $match: {
          sessionId: { $in: viewers.slice(0, 100) as any[] }, // Cap for performance
          targetId: { $ne: targetId as any },
          eventType: {
            $in: ['product_view', 'product_click'],
          },
          timestamp: { $gte: sevenDaysAgo },
        },
      },
      {
        $group: {
          _id: { targetId: '$targetId', targetType: '$targetType' },
          count: { $sum: 1 },
          uniqueSessions: { $addToSet: '$sessionId' },
        },
      },
      {
        $addFields: {
          sessionCount: { $size: '$uniqueSessions' },
        },
      },
      { $sort: { sessionCount: -1 } },
      { $limit: limit },
    ]);

    return coViewed.map((item, _idx) => ({
      targetId: item._id.targetId.toString(),
      targetType: item._id.targetType,
      similarityScore: Math.round((item.sessionCount / Math.max(viewers.length, 1)) * 100) / 100,
      matchedSignals: ['co-viewed'],
    }));
  } catch (err: any) {
    logger.error(`[SIMILARITY ENGINE] Error in usersAlsoViewed for ${targetId}: ${err.message}`);
    return [];
  }
}

/**
 * "Complete the Setup" — complementary category recommendations.
 */
export async function getComplementaryItems(
  sourceCategory: string,
  excludeIds: string[],
  options: { limit?: number } = {},
): Promise<SimilarItem[]> {
  const limit = options.limit || 8;
  const normalized = sourceCategory.toLowerCase();
  const complementary = COMPLEMENTARY_CATEGORIES[normalized] || [];

  if (complementary.length === 0) return [];

  try {
    const items = await Product.find({
      _id: { $nin: excludeIds },
      isActive: true,
      category: { $in: complementary.map((c) => new RegExp(escapeRegex(c), 'i')) },
    })
      .select('_id primaryCategory')
      .sort({ rating: -1, reviews: -1 })
      .limit(limit)
      .lean();

    return items.map((item, idx) => ({
      targetId: (item._id as any).toString(),
      targetType: 'product' as const,
      similarityScore: 1 - idx * 0.05, // Descending score by rating rank
      matchedSignals: ['complementary-category'],
    }));
  } catch (err: any) {
    logger.error(`[SIMILARITY ENGINE] Error in complementary items: ${err.message}`);
    return [];
  }
}

/**
 * FAST FALLBACKS (Used directly by controllers for zero-latency responses)
 */

export async function getFastFallbackSimilar(
  targetType: string,
  targetId: string,
  limit: number,
): Promise<any[]> {
  try {
    if (targetType === 'product') {
      const product = await Product.findById(targetId).select('primaryCategory').lean();
      if (!product) return [];

      const products = await Product.find({
        primaryCategory: product.primaryCategory,
        _id: { $ne: targetId },
        isActive: true,
      })
        .select(
          '_id title imageSrc images primaryCategory price oldPrice strikingPrice mrp originalPrice rating reviews slug',
        )
        .populate('primaryCategory', 'name')
        .limit(limit)
        .lean();

      return products.map((p) => ({
        _id: (p._id as any).toString(),
        targetType: 'product',
        title: p.title,
        imageSrc: p.imageSrc,
        images: p.images,
        category: (p.primaryCategory as any)?.name || p.primaryCategory?.toString(),
        primaryCategory: p.primaryCategory,
        price: p.price,
        oldPrice:
          (p as any).oldPrice ||
          (p as any).strikingPrice ||
          (p as any).mrp ||
          (p as any).originalPrice,
        rating: p.rating,
        reviews: p.reviews,
        slug: p.slug,
      }));
    }
    return [];
  } catch (err: any) {
    logger.error(`[SIMILARITY ENGINE] Error in fast fallback similar: ${err.message}`);
    return [];
  }
}

export async function getFastFallbackCompleteSetup(
  targetType: string,
  targetId: string,
  limit: number,
): Promise<any[]> {
  try {
    if (targetType === 'product') {
      return getFastFallbackSimilar(targetType, targetId, limit);
    }
    return [];
  } catch (err: any) {
    logger.error(`[SIMILARITY ENGINE] Error in fast fallback setup: ${err.message}`);
    return [];
  }
}
