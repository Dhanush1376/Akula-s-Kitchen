import Product from '../../models/Product';
import '../../models/Category';
import { getTrendingFeeds } from './trendingEngine';
import { getCachedSeasonalContext, computeSeasonalBoost } from './seasonalEngine';
import { RecommendationCache } from './recommendationCache';
import logger from '../../config/logger';

/**
 * Cold start handler — generates recommendations for users with no behavioral history.
 * Uses a combination of trending data, seasonal boosting, popularity, and top-rated items.
 */

export interface ColdStartRecommendation {
  targetId: string;
  targetType: string;
  score: number;
  source: string;
  title?: string;
  image?: string;
  category?: string;
  primaryCategory?: string;
  price?: number;
  oldPrice?: number;
  availabilityMode?: string;
}

/**
 * Get cold start recommendations (for anonymous or new users).
 * Checks cache first, computes if stale.
 */
export async function getColdStartFeed(
  options: { limit?: number; targetType?: string } = {},
): Promise<ColdStartRecommendation[]> {
  const limit = options.limit || 20;
  const targetType = options.targetType;

  try {
    // Check cache
    const cached = await RecommendationCache.getColdStartFeed();
    if (cached) {
      const filtered = targetType ? cached.filter((i: any) => i.targetType === targetType) : cached;
      return filtered.slice(0, limit);
    }

    const seasonalContext = await getCachedSeasonalContext();
    const feed: ColdStartRecommendation[] = [];

    // 1. Trending products (weighted highest for cold start)
    const trendingFeeds = await getTrendingFeeds(
      seasonalContext.isSeasonallyActive ? seasonalContext.activePeriods[0]?.context : undefined,
    );

    // 2. Featured/popular products from DB
    const featuredProducts = await Product.find({ isActive: true, featured: true })
      .select(
        '_id title imageSrc primaryCategory price oldPrice strikingPrice mrp originalPrice rating tags availabilityMode',
      )
      .populate('primaryCategory', 'name')
      .sort({ rating: -1, reviews: -1 })
      .limit(12)
      .lean();

    // Score and add featured products
    for (const product of featuredProducts) {
      const seasonalBoost = computeSeasonalBoost(
        product.primaryCategory?.toString(),
        undefined,
        product.tags,
        seasonalContext,
      );

      // Check if this item is trending (bonus)
      const trendingItem = trendingFeeds.trendingNow.find(
        (t) => t.targetId === (product._id as any).toString(),
      );
      const trendingBonus = trendingItem ? trendingItem.score * 0.3 : 0;

      const baseScore = (product.rating || 0) * 2 + (product.featured ? 5 : 0);
      const finalScore = (baseScore + trendingBonus) * seasonalBoost;

      feed.push({
        targetId: (product._id as any).toString(),
        targetType: 'product',
        score: Math.round(finalScore * 100) / 100,
        source: trendingItem ? 'trending+featured' : 'featured',
        title: product.title,
        image: product.imageSrc,
        category: (product.primaryCategory as any)?.name,
        primaryCategory: product.primaryCategory?.toString(),
        price: product.price,
        oldPrice:
          (product as any).oldPrice ||
          (product as any).strikingPrice ||
          (product as any).mrp ||
          (product as any).originalPrice,
        availabilityMode: product.availabilityMode,
      });
    }

    // Sort by score, add diversity (don't show 3 of same type in a row)
    feed.sort((a, b) => b.score - a.score);
    const diversified = applyDiversityFilter(feed);

    // Cache the result
    await RecommendationCache.setColdStartFeed(diversified);

    const filtered = targetType
      ? diversified.filter((i) => i.targetType === targetType)
      : diversified;
    return filtered.slice(0, limit);
  } catch (err: any) {
    logger.error(`[COLD START] Error generating cold start feed: ${err.message}`);
    return [];
  }
}

/**
 * Ensure no more than 2 consecutive items of the same target type,
 * and remove items with duplicate titles.
 */
function applyDiversityFilter(items: ColdStartRecommendation[]): ColdStartRecommendation[] {
  const result: ColdStartRecommendation[] = [];
  const deferred: ColdStartRecommendation[] = [];
  const seenTitles = new Set<string>();

  for (const item of items) {
    const titleLower = (item.title || '').toLowerCase().trim();
    if (seenTitles.has(titleLower)) continue;
    seenTitles.add(titleLower);

    // Check if adding this item would create 3+ consecutive same type
    const lastTwo = result.slice(-2);
    const wouldTriple =
      lastTwo.length === 2 &&
      lastTwo[0].targetType === item.targetType &&
      lastTwo[1].targetType === item.targetType;

    if (wouldTriple) {
      deferred.push(item);
    } else {
      result.push(item);
    }
  }

  // Append deferred items at the end
  return [...result, ...deferred];
}
