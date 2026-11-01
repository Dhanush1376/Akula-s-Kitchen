import { ChefHat, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { m as motion, AnimatePresence } from 'framer-motion';
import { ProductCard } from '../shared/ProductCard';
import { SectionHeader } from '../shared/SectionHeader';
import { RecommendationSkeleton } from '../ui/Skeleton';
import { useState, useEffect, useMemo } from 'react';
import {
  useSimilarRecommendations,
  useCompleteSetup,
  useAlsoViewed,
  useTrendingRecommendations,
} from '../../hooks/useRecommendationQueries';
import { useRecentlyViewed } from '../../hooks/useUserQueries';
import { useCategories, useProducts } from '../../hooks/useProductQueries';
import { useAuth } from '../../context/AuthContext';

export function RecommendationSystem({
  category,
  currentProductId,
  targetType = 'product',
  hideHeader = false,
  hideChefDivider = false,
  containerClassName = '',
  compact = false,
  horizontalScroll = false,
  showViewMore = !compact && !horizontalScroll,
  viewMoreLink = '/shop',
  viewMoreText = 'View More',
}) {
  const { isAuthenticated } = useAuth();
  // If compact, fetch immediately without delay; otherwise defer slightly for main page rendering
  const [shouldFetch, setShouldFetch] = useState(Boolean(compact));
  const { data: categoriesData = [] } = useCategories();

  useEffect(() => {
    if (compact) {
      setShouldFetch(true);
      return;
    }
    const timer = setTimeout(() => {
      setShouldFetch(true);
    }, 400);
    return () => clearTimeout(timer);
  }, [compact]);

  const cleanProductId = currentProductId ? String(currentProductId).split('___')[0] : null;

  const categoryName = useMemo(() => {
    if (!category) return null;
    if (typeof category === 'string') return category.trim();
    return (category.name || category.title || category.slug || '').trim() || null;
  }, [category]);

  const similarQuery = useSimilarRecommendations(targetType, cleanProductId, 8, {
    enabled: shouldFetch && !!cleanProductId,
  });
  const completeQuery = useCompleteSetup(cleanProductId, targetType, 8, {
    enabled: shouldFetch && !!cleanProductId,
  });
  const alsoViewedQuery = useAlsoViewed(cleanProductId, targetType, 8, {
    enabled: shouldFetch && !!cleanProductId,
  });
  const recentlyViewedQuery = useRecentlyViewed();

  // Category fallback: products in the same category so Similar Delights ALWAYS shows items
  const categoryProductsQuery = useProducts(
    categoryName ? { category: categoryName, limit: 12 } : { limit: 12 },
    { enabled: shouldFetch },
  );

  // Trending fallback query
  const trendingQuery = useTrendingRecommendations({ limit: 12 }, { enabled: shouldFetch });

  const similarList = useMemo(() => {
    const data = similarQuery.data;
    if (!data) return [];
    if (Array.isArray(data)) return data;
    if (Array.isArray(data.items)) return data.items;
    return [];
  }, [similarQuery.data]);

  const completeSetupList = useMemo(() => {
    const data = completeQuery.data;
    if (!data) return [];
    if (Array.isArray(data)) return data;
    if (Array.isArray(data.items)) return data.items;
    return [];
  }, [completeQuery.data]);

  const alsoViewedList = useMemo(() => {
    const data = alsoViewedQuery.data;
    if (!data) return [];
    if (Array.isArray(data)) return data;
    if (Array.isArray(data.items)) return data.items;
    return [];
  }, [alsoViewedQuery.data]);

  const trendingList = useMemo(() => {
    const data = trendingQuery.data;
    if (!data) return [];
    if (Array.isArray(data)) return data;
    if (Array.isArray(data.items)) return data.items;
    return [];
  }, [trendingQuery.data]);

  const categoryList = useMemo(() => {
    const data = categoryProductsQuery.data;
    if (!data) return [];
    if (Array.isArray(data)) return data;
    if (Array.isArray(data.products)) return data.products;
    if (Array.isArray(data.items)) return data.items;
    return [];
  }, [categoryProductsQuery.data]);

  const recentlyViewedList = useMemo(() => {
    if (!isAuthenticated || !recentlyViewedQuery.data) return [];
    const list =
      recentlyViewedQuery.data.data ||
      recentlyViewedQuery.data.items ||
      (Array.isArray(recentlyViewedQuery.data) ? recentlyViewedQuery.data : []);
    return list
      .filter((item) => item.product)
      .map((item) => ({
        id: item.product._id || item.product.id,
        _id: item.product._id || item.product.id,
        title: item.product.title,
        price: item.product.price,
        oldPrice:
          item.product.strikingPrice ||
          item.product.oldPrice ||
          item.product.originalPrice ||
          item.product.mrp,
        imageSrc: item.product.imageSrc || item.product.image || item.product.images?.[0],
        category: item.product.category,
        primaryCategory: item.product.primaryCategory,
        rating: item.product.rating || 0,
        slug: item.product.slug,
      }))
      .filter((p) => p.id !== currentProductId)
      .slice(0, 8);
  }, [recentlyViewedQuery.data, isAuthenticated, currentProductId]);

  const activeList = useMemo(() => {
    const combined = [
      ...similarList,
      ...completeSetupList,
      ...alsoViewedList,
      ...categoryList,
      ...recentlyViewedList,
      ...trendingList,
    ];
    const uniqueIds = new Set();
    const uniqueList = [];
    const currentIdStr = cleanProductId ? String(cleanProductId).toLowerCase() : '';

    for (const item of combined) {
      const rawId = item.id || item._id;
      if (!rawId) continue;
      const idStr = String(rawId).split('___')[0].toLowerCase();

      if (!uniqueIds.has(idStr) && idStr !== currentIdStr) {
        uniqueIds.add(idStr);
        uniqueList.push(item);
      }
    }

    return uniqueList.slice(0, 16);
  }, [
    similarList,
    completeSetupList,
    alsoViewedList,
    categoryList,
    recentlyViewedList,
    trendingList,
    cleanProductId,
  ]);

  // Determine if we should show the loading skeleton
  // Only show skeleton if we have NO items yet AND relevant queries are still in flight
  const isAnyPending =
    (similarQuery.isPending && !similarQuery.isError) ||
    (completeQuery.isPending && !completeQuery.isError) ||
    (alsoViewedQuery.isPending && !alsoViewedQuery.isError) ||
    (categoryProductsQuery.isPending && !categoryProductsQuery.isError) ||
    (trendingQuery.isPending && !trendingQuery.isError);

  const loading = shouldFetch && isAnyPending && activeList.length === 0;

  if (!shouldFetch) {
    // Return placeholder matching compact or full height
    return (
      <div className={compact ? 'w-full' : 'py-8 min-h-[300px] bg-transparent'}>
        <RecommendationSkeleton horizontal={horizontalScroll} compact={compact} />
      </div>
    );
  }

  if (!loading && activeList.length === 0) {
    if (compact) {
      return (
        <div className="py-8 text-center text-neutral-500 text-xs font-medium">
          No similar delights found at the moment.
        </div>
      );
    }
    return null;
  }

  return (
    <section
      className={`${compact ? 'pt-0 pb-0' : 'pt-6 pb-4 lg:pt-10 lg:pb-6'} bg-transparent relative overflow-hidden`}
    >
      {/* Subtle Warm Glow Accent */}
      <div className="absolute top-1/2 left-1/4 w-[500px] h-[500px] bg-[#f7bb0e]/5 rounded-full blur-[100px] -translate-y-1/2 pointer-events-none z-0" />

      <div
        className={
          containerClassName || 'max-w-max-width mx-auto px-4 lg:px-6 lg:px-8 relative z-10'
        }
      >
        {!compact && !hideHeader && !hideChefDivider && (
          <div className="w-full flex justify-center mb-8 lg:mb-10">
            <div className="w-full max-w-[180px] flex items-center justify-center gap-3 opacity-70">
              <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-black to-black" />
              <ChefHat className="w-4 h-4 text-black shrink-0" strokeWidth={2} />
              <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent via-black to-black" />
            </div>
          </div>
        )}

        {!hideHeader && (
          <SectionHeader
            title="You May Also Like"
            seeAllLink="/shop"
            linkText="View All"
            size="sm"
            className="mb-3"
          />
        )}

        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div
              key="loading-skeleton"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <RecommendationSkeleton horizontal={horizontalScroll} compact={compact} />
            </motion.div>
          ) : activeList.length > 0 ? (
            <motion.div
              key="grid-list"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className={
                horizontalScroll
                  ? `flex gap-2.5 sm:gap-3.5 ${compact ? 'pb-1' : 'pb-4'} overflow-x-auto snap-x snap-mandatory scroll-smooth no-scrollbar touch-pan-x`
                  : 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-2 sm:gap-x-4 lg:gap-x-6 gap-y-6 sm:gap-y-8 lg:gap-y-10 pb-6'
              }
            >
              {activeList.map((product, idx) => {
                const motionProps = horizontalScroll
                  ? {}
                  : {
                      initial: { opacity: 0, scale: 0.96 },
                      animate: { opacity: 1, scale: 1 },
                      transition: { delay: idx * 0.04, duration: 0.4 },
                    };
                const matchedCategory =
                  typeof product.primaryCategory === 'string'
                    ? categoriesData.find((c) => c._id === product.primaryCategory)?.name ||
                      product.category?.name ||
                      product.category
                    : product.primaryCategory?.name || product.category?.name || product.category;

                return (
                  <motion.div
                    key={product.id || product._id || `reco-item-${idx}`}
                    {...motionProps}
                    className={
                      horizontalScroll
                        ? `${compact ? 'w-[160px] sm:w-[175px]' : 'w-[200px] sm:w-[240px] lg:w-[280px]'} flex-shrink-0 snap-start`
                        : 'w-full'
                    }
                  >
                    <ProductCard
                      {...product}
                      id={product.id || product._id}
                      isRectangular={false}
                      imageSrc={product.imageSrc || product.image || product.images?.[0]}
                      price={product.price || product.basePrice}
                      oldPrice={
                        product.strikingPrice ||
                        product.oldPrice ||
                        product.originalPrice ||
                        product.mrp
                      }
                      category={matchedCategory}
                      compact={compact}
                    />
                  </motion.div>
                );
              })}
            </motion.div>
          ) : null}
        </AnimatePresence>

        {/* Minimal View More CTA redirecting to Shop page (/shop) */}
        {showViewMore && activeList.length > 0 && (
          <div className="flex justify-center mt-6 sm:mt-8 pb-3">
            <Link
              to={viewMoreLink}
              className="group inline-flex items-center gap-2 px-5 py-2 sm:px-6 sm:py-2.5 rounded-full border border-neutral-300 hover:border-neutral-900 bg-white hover:bg-neutral-900 text-neutral-700 hover:text-white font-sans text-[12.5px] sm:text-[13px] font-medium tracking-wide transition-all duration-200 active:scale-95 cursor-pointer shadow-2xs hover:shadow-xs"
            >
              <span>{viewMoreText}</span>
              <ArrowRight
                className="w-3.5 h-3.5 text-neutral-400 group-hover:text-white transition-transform duration-200 group-hover:translate-x-0.5"
                strokeWidth={2}
                aria-hidden="true"
              />
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}

export default RecommendationSystem;
