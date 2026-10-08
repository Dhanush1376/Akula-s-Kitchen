import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { SectionHeader } from '../../../components/shared/SectionHeader';
import { ProductCard } from '../../../components/shared/ProductCard';
import { useProducts } from '../../../hooks/useProductQueries';
import { useWebsiteContent } from '../../../hooks/useWebsiteContent';
import React from 'react';

/**
 * Recommended grid using real personalized feed API or manual curation.
 */
export function RecommendedGrid({ previewContent }) {
  const cms = useWebsiteContent({ includeDefaults: false });
  const activeCms = previewContent || cms;
  const loading = !previewContent && cms?.loading;
  const config = activeCms?.recommendedProducts || {};

  const productIds = config.productIds || [];
  const isManualMode = config.useAutoFeed === false && productIds.length > 0;

  const { data, isPending, isError, refetch } = useProducts(
    {
      ...(isManualMode ? { ids: productIds.join(',') } : {}),
      limit: config.maxDisplay || 12,
    },
    { enabled: config.isVisible !== false },
  );

  if (config.isVisible === false) return null;

  if (isPending || loading) {
    return (
      <section className="h1-section relative isolate" id="h1-recommended">
        <div className="h1-container relative z-10 animate-pulse">
          <div className="flex justify-between items-end mb-8 lg:mb-10">
            <div>
              <div className="h-8 lg:h-10 w-48 lg:w-64 bg-surface-container-high rounded-full"></div>
            </div>
            <div className="h-4 w-20 bg-surface-container-high rounded-full hidden lg:block"></div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-4 lg:gap-6 lg:gap-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex flex-col gap-4">
                <div className="w-full aspect-[3/4] bg-surface-container-high rounded-[24px] lg:rounded-[32px]"></div>
                <div className="px-1 lg:px-2">
                  <div className="w-[80%] h-4 bg-surface-container-high rounded-full mb-2"></div>
                  <div className="w-[60%] h-3 bg-surface-container-high rounded-full mb-3"></div>
                  <div className="w-[40%] h-5 bg-surface-container-high rounded-full"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  const products = data?.data || data?.products || data?.items || (Array.isArray(data) ? data : []);
  if (isError || !products || products.length === 0) {
    return null;
  }

  return (
    <section className="h1-section relative isolate" id="h1-recommended">
      <div className="h1-container relative z-10">
        <SectionHeader
          title={config.sectionTitle || 'Recommended For You'}
          seeAllLink={config.seeAllLink || '/collections'}
        />
      </div>
      <div className="h1-container relative z-10 mt-6">
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-4 lg:gap-6 lg:gap-8">
          {products.slice(0, config.maxDisplay || 8).map((product) => (
            <ProductCard
              key={product.id || product._id}
              {...product}
              id={product.id || product._id}
              imageSrc={product.imageSrc || product.image || product.thumbnail}
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
