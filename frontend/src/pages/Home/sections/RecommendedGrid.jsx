import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { SectionHeader } from '../../../components/shared/SectionHeader';
import { ProductCard } from '../../../components/shared/ProductCard';
import { useProducts } from '../../../hooks/useProductQueries';
import { useWebsiteContent } from '../../../hooks/useWebsiteContent';
import React, { useMemo } from 'react';

/**
 * Recommended grid using real personalized feed API or manual curation with automatic fallback.
 */
export function RecommendedGrid({ previewContent }) {
  const cms = useWebsiteContent();
  const activeCms = previewContent || cms;
  const config = activeCms?.recommendedProducts || {};

  const productIds = config.productIds || [];
  const isManualMode = config.useAutoFeed === false && productIds.length > 0;

  const { data, isPending, isError } = useProducts(
    {
      ...(isManualMode ? { ids: productIds.join(',') } : {}),
      limit: config.maxDisplay || 12,
    },
    { enabled: config.isVisible !== false },
  );

  const rawList = useMemo(() => {
    if (Array.isArray(data?.products)) return data.products;
    if (Array.isArray(data?.data?.products)) return data.data.products;
    if (Array.isArray(data?.data)) return data.data;
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.items)) return data.items;
    return [];
  }, [data]);

  const needsFallback = (rawList.length === 0 || isError) && !isPending;
  const { data: fallbackData } = useProducts(
    { limit: config.maxDisplay || 8 },
    { enabled: config.isVisible !== false && needsFallback },
  );

  const fallbackList = useMemo(() => {
    if (Array.isArray(fallbackData?.products)) return fallbackData.products;
    if (Array.isArray(fallbackData?.data?.products)) return fallbackData.data.products;
    if (Array.isArray(fallbackData?.data)) return fallbackData.data;
    if (Array.isArray(fallbackData)) return fallbackData;
    if (Array.isArray(fallbackData?.items)) return fallbackData.items;
    return [];
  }, [fallbackData]);

  const products = rawList.length > 0 ? rawList : fallbackList;

  if (config.isVisible === false) return null;
  if (products.length === 0 && !isPending) return null;

  return (
    <section className="h1-section relative isolate py-8 lg:py-12" id="h1-recommended">
      <div className="h1-container relative z-10">
        <SectionHeader
          title={config.sectionTitle || 'Recommended For You'}
          kicker={config.sectionSubtitle || ''}
          seeAllLink={config.seeAllLink || '/collections'}
        />
      </div>
      <div className="h1-container relative z-10 mt-6">
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-2.5 sm:gap-4 lg:gap-6 lg:gap-8">
          {products.slice(0, config.maxDisplay || 8).map((product) => (
            <ProductCard
              key={product.id || product._id}
              {...product}
              id={product.id || product._id}
              imageSrc={
                product.imageSrc ||
                product.image ||
                product.thumbnail ||
                (product.images && product.images[0])
              }
              price={product.price || product.basePrice}
              oldPrice={product.strikingPrice || product.oldPrice || product.mrp}
              badges={config.badgeText ? [config.badgeText] : []}
            />
          ))}
        </div>

        {/* View more CTA redirecting to Shop page (/collections) */}
        <div className="flex justify-center mt-7 sm:mt-10">
          <Link
            to={config.seeAllLink || '/collections'}
            className="group inline-flex items-center gap-2 px-6 py-2.5 sm:px-8 sm:py-3 rounded-full border border-[#283618]/25 hover:border-[#283618] bg-white hover:bg-[#283618] text-[#283618] hover:text-[#f7bb0e] font-display font-bold text-[13px] sm:text-[14px] tracking-wide transition-all duration-200 active:scale-95 cursor-pointer shadow-xs hover:shadow-sm"
          >
            <span>View More</span>
            <ArrowRight
              className="w-4 h-4 text-[#283618]/60 group-hover:text-[#f7bb0e] transition-transform duration-200 group-hover:translate-x-1"
              strokeWidth={2.2}
              aria-hidden="true"
            />
          </Link>
        </div>
      </div>
    </section>
  );
}
