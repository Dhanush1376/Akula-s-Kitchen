import { useParams, Link, useLocation, useNavigate } from 'react-router-dom';
import { m as motion } from 'framer-motion';
import { ProductGallery } from '../components/ui/ProductGallery';
import { ProductInfo } from '../components/ui/ProductInfo';
import { Skeleton, ProductDetailSkeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/FeedbackStates';
import { SEO } from '../components/seo/SEO';
import { StickyMobileATC } from '../components/ui/StickyMobileATC';
import React, { useEffect, useMemo, useRef, Suspense } from 'react';
import { userService } from '../services/domainServices';
import { useProduct } from '../hooks/useProductQueries';
import { useAuth } from '../context/AuthContext';
import { useRecommendationTracker } from '../hooks/useRecommendationTracker';
import { useQueryClient } from '@tanstack/react-query';
import recommendationService from '../services/api/recommendationService';
import logger from '../utils/core/logger';
import { getCategoryRoute } from '../utils/ecommerce/productRouteUtils';

const RecommendationSystem = React.lazy(() =>
  import('../components/sections/RecommendationSystem').then((m) => ({
    default: m.RecommendationSystem,
  })),
);

const LazyProductReviews = React.lazy(() =>
  import('../components/sections/ProductReviews').then((m) => ({
    default: m.ProductReviews,
  })),
);

export function ProductDetails() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const atcRef = useRef(null);
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Use product passed from QuickView if available for instantaneous zero-flicker render
  const initialProduct = useMemo(() => {
    const p = location.state?.product;
    if (
      p &&
      ((p._id && String(p._id) === String(id)) ||
        (p.id && String(p.id) === String(id)) ||
        (p.slug && p.slug === id))
    ) {
      return p;
    }
    return undefined;
  }, [location.state, id]);

  const {
    data: product,
    isLoading: loading,
    error,
  } = useProduct(id, {
    initialData: initialProduct,
    initialDataUpdatedAt: 0,
  });

  // Track product view, dwell time, and scroll depth
  useRecommendationTracker({
    targetType: 'product',
    targetId: product?._id || product?.id || id,
    category: product?.primaryCategory?.name || product?.category,
    price: product?.price || product?.basePrice,
    tags: product?.tags,
  });

  // Prefetch recommendations to prevent waterfalls
  useEffect(() => {
    if (product) {
      const productId = product._id || product.id || id;
      // Similar
      queryClient
        .prefetchQuery({
          queryKey: ['recommendations', 'similar', 'product', productId, 8],
          queryFn: async () => {
            const res = await recommendationService.getSimilar('product', productId, 8);
            return res.success ? res.data : res;
          },
        })
        .catch(() => {});
      // Also viewed
      queryClient
        .prefetchQuery({
          queryKey: ['recommendations', 'alsoViewed', productId, 'product', 8],
          queryFn: async () => {
            const res = await recommendationService.getAlsoViewed(productId, 'product', 8);
            return res.success ? res.data : res;
          },
        })
        .catch(() => {});
    }
  }, [product, queryClient, id]);

  useEffect(() => {
    if (product && user) {
      userService.trackRecentlyViewed(product._id || product.id || id).catch((err) => {
        logger.error('Failed to track recently viewed product:', err);
      });
    }
  }, [product, user, id]);

  useEffect(() => {
    // Immediate scroll to top on mount and ID change, or smooth scroll to hash if provided
    if (typeof window !== 'undefined') {
      if (location.hash) {
        const timer = setTimeout(() => {
          const el = document.querySelector(location.hash);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth' });
          }
        }, 120);
        return () => clearTimeout(timer);
      }
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    }
  }, [id, location.hash]);

  // One URL per product: /product/<id> and retired slugs move to the current slug.
  useEffect(() => {
    if (!product?.slug || product.slug === id) return;
    const subPath = location.pathname.split(`/product/${id}`)[1] || '';
    navigate(`/product/${product.slug}${subPath}${location.search}${location.hash}`, {
      replace: true,
      state: location.state,
    });
  }, [
    product?.slug,
    id,
    location.pathname,
    location.search,
    location.hash,
    location.state,
    navigate,
  ]);

  const galleryImages = useMemo(() => {
    if (!product) return [];
    return Array.from(new Set([product.imageSrc, ...(product.images || [])].filter(Boolean)));
  }, [product]);

  if (loading) {
    return <ProductDetailSkeleton />;
  }

  if (error || !product) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface p-6">
        <EmptyState
          title="Product Not Found"
          description="The product you are looking for may have been moved or is currently unavailable."
          icon="inventory_2"
          actionLabel="Return to Collections"
          onAction={() => (window.location.href = '/collections')}
        />
      </div>
    );
  }

  return (
    <motion.div
      initial={location.state?.fromQuickView ? { opacity: 0 } : false}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
      className="bg-surface relative min-h-screen"
    >
      {product.seo ? (
        <SEO
          fullTitle={product.seo.title}
          description={product.seo.description}
          keywords={product.seo.keywords}
          canonicalUrl={product.seo.canonicalUrl}
          robots={location.pathname.includes('/reviews') ? 'noindex, follow' : product.seo.robots}
          ogType="product"
          ogImage={product.seo.ogImage}
          ogImageWidth={product.seo.ogImageWidth}
          ogImageHeight={product.seo.ogImageHeight}
          ogImageAlt={product.seo.imageAlt}
          schema={product.seo.jsonLd}
        />
      ) : (
        <SEO title={product.title} canonicalUrl={`/product/${product.slug || id}`} />
      )}

      {/* Desktop Breadcrumbs */}
      <div className="hidden lg:block pt-[calc(var(--ak-header-h,144px)+20px)] pb-3.5 max-w-max-width mx-auto px-margin-desktop relative z-10">
        <nav
          aria-label="Breadcrumb"
          className="flex items-center gap-2 text-[10.5px] uppercase tracking-[0.18em] text-neutral-400 font-bold overflow-x-auto no-scrollbar whitespace-nowrap pb-1"
        >
          <Link to="/" className="hover:text-neutral-950 transition-colors">
            Home
          </Link>
          <span className="text-neutral-300">/</span>
          <Link to="/collections" className="hover:text-neutral-950 transition-colors">
            Shop
          </Link>
          {(product.primaryCategory?.name || product.category) && (
            <>
              <span className="text-neutral-300">/</span>
              <Link
                to={getCategoryRoute(product.primaryCategory || product.category)}
                className="hover:text-neutral-950 transition-colors"
              >
                {product.primaryCategory?.name || product.category}
              </Link>
            </>
          )}
          <span className="text-neutral-300">/</span>
          <span className="text-neutral-950 font-extrabold truncate max-w-md">{product.title}</span>
        </nav>
      </div>

      <section className="product-detail-section pt-[calc(var(--ak-header-h,96px)+12px)] lg:pt-0 pb-12 lg:pb-20 lg:pb-24 max-w-max-width mx-auto px-2.5 sm:px-3 md:px-margin-mobile lg:px-margin-desktop relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4 md:gap-8 lg:gap-12 xl:gap-20">
          <div className="flex flex-col gap-4 md:gap-6 lg:gap-10 md:sticky md:top-24 lg:static lg:top-auto md:self-start lg:self-auto">
            <ProductGallery images={galleryImages} product={product} />
          </div>
          <div className="px-1.5 md:px-0">
            <ProductInfo product={product} atcRef={atcRef} />
          </div>
        </div>
      </section>

      {/* Verified Purchaser Reviews */}
      <Suspense
        fallback={
          <div className="max-w-max-width mx-auto px-margin-mobile lg:px-margin-desktop py-8">
            <Skeleton className="h-64 w-full rounded-2xl" />
          </div>
        }
      >
        <LazyProductReviews
          productId={product._id || product.id || id}
          productTitle={product.title}
        />
      </Suspense>

      <React.Suspense
        fallback={
          <div className="max-w-max-width mx-auto px-margin-mobile lg:px-margin-desktop py-8">
            <Skeleton className="h-44 w-full rounded-2xl" />
          </div>
        }
      >
        <RecommendationSystem
          category={product.primaryCategory?.name || product.category}
          currentProductId={product._id || product.id || id}
        />
      </React.Suspense>

      {/* ─── Mobile Floating Bottom Bar — Actually adds to cart ─── */}
      <StickyMobileATC product={product} triggerRef={atcRef} />
    </motion.div>
  );
}
