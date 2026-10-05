import React, { useState, useEffect, useRef, Profiler } from 'react';
import { useSearchParams, useLocation } from 'react-router-dom';

import { SEO } from '../../components/seo/SEO';
import { QuickViewModal } from '../../components/ui';

import { useWebsiteContent } from '../../hooks/useWebsiteContent';
import { useScrollDirection } from '../../hooks/useScrollDirection';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { logRenderMetrics } from '../../utils/performance/profilerLogger';

import { useProductListingState } from './useProductListingState';
import { ProductListingHeader } from './ProductListingHeader';
import { ProductListingGrid } from './ProductListingGrid';
import { scrollToShopAnchor } from './shopScrollAnchor';

export function ProductListing() {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();

  const isMobile = useMediaQuery('(max-width: 1023px)');
  const { scrollDirection, isAtTop } = useScrollDirection();
  const isNavbarHidden = !isAtTop && scrollDirection === 'down';

  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [navbarHeight, setNavbarHeight] = useState(0);
  const [activeProduct, setActiveProduct] = useState(null);
  const [isQuickViewOpen, setIsQuickViewOpen] = useState(false);

  const state = useProductListingState();
  const prevSearchRef = useRef(searchParams.get('search'));
  const prevCategoryRef = useRef(state.categoryParam);

  const prevCollectionRef = useRef(searchParams.get('collection'));
  const prevIdsRef = useRef(searchParams.get('ids'));
  const isInitialMount = useRef(true);

  // Auto-scroll to shop anchor when category, collection, ids, or external link changes
  useEffect(() => {
    const hasCategory = state.categoryParam && state.categoryParam !== 'All';
    const hasSearch = Boolean(searchParams.get('search'));
    const hasCollection = Boolean(searchParams.get('collection'));
    const hasIds = Boolean(searchParams.get('ids'));
    const hasScrollState = Boolean(location.state?.scrollToShop);

    const hasActiveFilter = hasCategory || hasSearch || hasCollection || hasIds || hasScrollState;

    if (isInitialMount.current) {
      isInitialMount.current = false;
      if (hasActiveFilter) {
        // Immediate and staged scroll to guarantee exact position as DOM and lazy images settle
        scrollToShopAnchor({ smooth: false });
        const timer1 = setTimeout(() => {
          scrollToShopAnchor({ smooth: false });
        }, 120);
        const timer2 = setTimeout(() => {
          scrollToShopAnchor({ smooth: true });
        }, 320);
        return () => {
          clearTimeout(timer1);
          clearTimeout(timer2);
        };
      }
      return;
    }

    const currentCollection = searchParams.get('collection');
    const isCollectionChange = prevCollectionRef.current !== currentCollection;
    prevCollectionRef.current = currentCollection;

    const currentIds = searchParams.get('ids');
    const isIdsChange = prevIdsRef.current !== currentIds;
    prevIdsRef.current = currentIds;

    const isCategoryChange = prevCategoryRef.current !== state.categoryParam;
    prevCategoryRef.current = state.categoryParam;

    if (isCategoryChange || isCollectionChange || isIdsChange || hasScrollState) {
      const timer = setTimeout(() => {
        scrollToShopAnchor({ smooth: true });
      }, 60);
      return () => clearTimeout(timer);
    }
  }, [state.categoryParam, searchParams, location.state]);

  // Auto-scroll to shop anchor when search query itself changes
  useEffect(() => {
    const search = searchParams.get('search');
    const isSearchChange = prevSearchRef.current !== search;
    prevSearchRef.current = search;

    const isTypingInPageSearch =
      document.activeElement?.getAttribute('placeholder') === 'Search batters, pickles, podis…';

    if (isSearchChange && search && !isTypingInPageSearch) {
      const timer = setTimeout(() => {
        scrollToShopAnchor({ smooth: true });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [searchParams]);

  const websiteContent = useWebsiteContent();
  const shopContent = websiteContent?.shopPage || {
    hero: {
      title: 'Shop',
      subtitle: 'Culinary Offerings',
      description: 'Authentic recipes and gourmet culinary creations.',
    },
  };

  useEffect(() => {
    if (isFilterOpen) {
      document.body.classList.add('filters-open');
    } else {
      document.body.classList.remove('filters-open');
    }
    return () => document.body.classList.remove('filters-open');
  }, [isFilterOpen]);

  const openQuickView = React.useCallback((e, product) => {
    e.preventDefault();
    e.stopPropagation();
    setActiveProduct(product);
    setIsQuickViewOpen(true);
  }, []);

  const handleNextQuickView = React.useCallback(() => {
    if (!activeProduct || !state.products) return;
    const idx = state.products.findIndex(
      (p) => (p._id || p.id) === (activeProduct._id || activeProduct.id),
    );
    if (idx >= 0 && idx < state.products.length - 1) {
      setActiveProduct(state.products[idx + 1]);
    }
  }, [activeProduct, state.products]);

  const handlePrevQuickView = React.useCallback(() => {
    if (!activeProduct || !state.products) return;
    const idx = state.products.findIndex(
      (p) => (p._id || p.id) === (activeProduct._id || activeProduct.id),
    );
    if (idx > 0) {
      setActiveProduct(state.products[idx - 1]);
    }
  }, [activeProduct, state.products]);

  const activeProductIndex =
    activeProduct && state.products
      ? state.products.findIndex((p) => (p._id || p.id) === (activeProduct._id || activeProduct.id))
      : -1;

  return (
    <Profiler id="ProductListing" onRender={logRenderMetrics}>
      <div className="bg-surface min-h-screen">
        <SEO
          title="Shop"
          description="Shop fresh batters, chutneys, pickles, podis & masalas, namkeen and cashews."
        />

        <ProductListingHeader
          isMobile={isMobile}
          searchParam={state.searchParam}
          shopContent={shopContent}
        />

        <div
          id="product-listing-sort-bar-anchor"
          className="h-0 w-full pointer-events-none"
          aria-hidden="true"
        />

        <ProductListingGrid
          {...state}
          isFilterOpen={isFilterOpen}
          setIsFilterOpen={setIsFilterOpen}
          openQuickView={openQuickView}
          isNavbarHidden={isNavbarHidden}
          navbarHeight={navbarHeight}
        />

        <QuickViewModal
          isOpen={isQuickViewOpen}
          onClose={() => setIsQuickViewOpen(false)}
          product={activeProduct}
          onNext={handleNextQuickView}
          onPrev={handlePrevQuickView}
          hasNext={activeProductIndex !== -1 && activeProductIndex < state.products.length - 1}
          hasPrev={activeProductIndex > 0}
        />
      </div>
    </Profiler>
  );
}
