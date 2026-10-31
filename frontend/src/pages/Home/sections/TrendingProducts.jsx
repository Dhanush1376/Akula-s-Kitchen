import { SectionHeader } from '../../../components/shared/SectionHeader';
import { HomeProductRowSkeleton } from '../../../components/ui/skeletons/HomeSkeleton';
import { CarouselWrapper } from '../../../components/shared/CarouselWrapper';
import { ProductCard } from '../../../components/shared/ProductCard';
import { useTrendingRecommendations } from '../../../hooks/useRecommendationQueries';
import { useProducts } from '../../../hooks/useProductQueries';
import { useWebsiteContent } from '../../../hooks/useWebsiteContent';

import React from 'react';

/**
 * Trending products using real recommendation API.
 */
export const TrendingProducts = React.memo(function TrendingProducts({ previewContent }) {
  const cms = useWebsiteContent({ includeDefaults: false });
  const activeCms = previewContent || cms;
  // Home passes its own CMS object as previewContent, so read loading from the active object
  // (an admin preview has no loading field).
  const loading = Boolean(activeCms?.loading);
  const config = activeCms?.trendingProducts || {};
  const _productIds = config.productIds || [];
  const isManualMode = config.useAutoFeed === false;

  const {
    data: manualData,
    isPending: manualPending,
    isError: manualError,
    refetch: manualRefetch,
  } = useProducts(
    { ids: _productIds.join(','), limit: config.maxDisplay || 10 },
    { enabled: config.isVisible !== false && isManualMode && _productIds.length > 0 },
  );

  const {
    data: trendingData,
    isLoading: trendingPending,
    isError: trendingError,
    refetch: trendingRefetch,
  } = useTrendingRecommendations(
    {
      feed: 'trendingNow',
      limit: config.maxDisplay || 10,
    },
    { enabled: config.isVisible !== false && !isManualMode },
  );

  if (config.isVisible === false) return null;
  if (isManualMode && _productIds.length === 0) return null;

  const isPending = isManualMode ? manualPending : trendingPending;
  const isError = isManualMode ? manualError : trendingError;
  const refetch = isManualMode ? manualRefetch : trendingRefetch;

  const rawTrending = trendingData?.items || (Array.isArray(trendingData) ? trendingData : []);

  const products = isManualMode
    ? manualData?.data?.products ||
      manualData?.products ||
      manualData?.data ||
      manualData?.items ||
      (Array.isArray(manualData) ? manualData : [])
    : rawTrending;

  if (isPending || loading) {
    return (
      <HomeProductRowSkeleton
        sectionClassName="h1-section !pt-4 lg:!pt-8 !pb-4 lg:!pb-8"
        label="Loading trending products"
      />
    );
  }

  // const products = trendingProducts; // removed as products is already defined above
  if (isError || !products || products.length === 0) {
    return null;
  }

  const headingTitle =
    config.sectionTitle && config.sectionTitle !== "Today's picks"
      ? config.sectionTitle
      : 'Trending Now';

  return (
    <section className="h1-section !pt-4 lg:!pt-8 !pb-4 lg:!pb-8 relative isolate" id="h1-trending">
      <div className="h1-container relative z-10">
        <SectionHeader title={headingTitle} seeAllLink={config.seeAllLink || '/collections'} />
      </div>
      <div className="h1-container--full pl-4 lg:pl-9 relative z-10">
        <CarouselWrapper gap="16px">
          {products.map((product) => (
            <div key={product.id || product._id} className="h1-scroll-item">
              <ProductCard
                {...product}
                id={product.id || product._id}
                imageSrc={product.imageSrc || product.image || product.thumbnail}
                price={product.price || product.basePrice}
                oldPrice={product.strikingPrice || product.oldPrice || product.mrp}
              />
            </div>
          ))}
        </CarouselWrapper>
      </div>
    </section>
  );
});
