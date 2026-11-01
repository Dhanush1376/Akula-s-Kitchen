import { SectionHeader } from '../../../components/shared/SectionHeader';
import { HomeProductRowSkeleton } from '../../../components/ui/skeletons/HomeSkeleton';
import { CarouselWrapper } from '../../../components/shared/CarouselWrapper';
import { ProductCard } from '../../../components/shared/ProductCard';
import { useProducts } from '../../../hooks/useProductQueries';
import { useWebsiteContent } from '../../../hooks/useWebsiteContent';

/**
 * Best sellers using real API data.
 */
export function BestSellers({ previewContent }) {
  const cms = useWebsiteContent({ includeDefaults: false });
  const activeCms = previewContent || cms;
  // Home passes its own CMS object as previewContent, so read loading from the active object
  // (an admin preview has no loading field).
  const loading = Boolean(activeCms?.loading);
  const config = activeCms?.featuredProducts || {};
  const productIds = config.productIds || [];
  // Same default as the admin toggle: auto feed unless switched off. With the auto feed
  // off but nothing picked, fall back to the auto feed rather than hiding the section.
  const hasManualIds = productIds.length > 0;
  const useManualIds = config.useAutoFeed === false && hasManualIds;

  const { data, isPending, isError } = useProducts(
    {
      ...(useManualIds ? { ids: productIds.join(',') } : { sort: 'bestSelling' }),
      limit: config.maxDisplay || 10,
    },
    { enabled: config.isVisible !== false },
  );

  if (config.isVisible === false) return null;
  // Until the CMS arrives the feed mode is unknown; hold the row's space rather than vanish.
  if (loading) return <HomeProductRowSkeleton label="Loading best sellers" />;

  if (isPending) {
    return <HomeProductRowSkeleton label="Loading best sellers" />;
  }

  const products = Array.isArray(data?.products)
    ? data.products
    : Array.isArray(data?.data?.products)
      ? data.data.products
      : Array.isArray(data?.data)
        ? data.data
        : Array.isArray(data)
          ? data
          : Array.isArray(data?.items)
            ? data.items
            : [];
  if (isError || products.length === 0) {
    return null;
  }

  return (
    <section className="h1-section relative isolate" id="h1-best-sellers">
      <div className="h1-container relative z-10">
        <SectionHeader
          title={config.sectionTitle || 'Bestsellers'}
          seeAllLink={config.seeAllLink || '/collections'}
        />
      </div>
      <div className="h1-container--full pl-4 lg:pl-9 relative z-10">
        <CarouselWrapper gap="16px">
          {products.slice(0, config.maxDisplay || 8).map((product) => {
            const customBadges = [];
            if (config.badgeText || config.badgeIcon) {
              customBadges.push({
                text: config.badgeText || '',
                icon: config.badgeIcon || '',
              });
            }

            return (
              <div key={product.id || product._id} className="h1-scroll-item">
                <ProductCard
                  key={product.id || product._id}
                  {...product}
                  id={product.id || product._id}
                  imageSrc={product.imageSrc || product.image || product.thumbnail}
                  price={product.price || product.basePrice}
                  oldPrice={product.strikingPrice || product.oldPrice || product.mrp}
                  badges={customBadges}
                />
              </div>
            );
          })}
        </CarouselWrapper>
      </div>
    </section>
  );
}
