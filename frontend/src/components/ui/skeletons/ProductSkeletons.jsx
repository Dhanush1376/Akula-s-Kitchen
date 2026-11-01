import React from 'react';
import { Skeleton } from '../SkeletonBase';

// ─── Product Listing Skeleton ───
export function ProductListSkeleton() {
  return (
    <div className="bg-surface min-h-screen" aria-busy="true" aria-label="Loading shop">
      {/* 1. Shop Hero Header (matches ProductListingHeader & .ak-shop-head) */}
      <section
        className="ak-shop-head"
        style={{ paddingTop: 'calc(var(--ak-header-h, 72px) + 20px)' }}
      >
        <div className="ak-shop-head__inner">
          <div className="ak-shop-head__text space-y-2.5 py-1">
            <Skeleton className="h-3.5 w-28 rounded-full" />
            <Skeleton className="h-10 sm:h-12 lg:h-14 w-44 sm:w-56 rounded-xl" />
            <Skeleton className="h-3.5 sm:h-4 w-64 sm:w-96 max-w-full rounded-lg" />
          </div>
        </div>
      </section>

      {/* 2. Anchor target space */}
      <div
        id="product-listing-sort-bar-anchor"
        className="h-0 w-full pointer-events-none"
        aria-hidden="true"
      />

      {/* 3. Main Layout Grid (mirrors ProductListingGrid) */}
      <main
        id="shop-collection"
        className="max-w-max-width mx-auto px-margin-mobile lg:px-margin-desktop relative pb-8 lg:pb-24 pt-4 sm:pt-6"
      >
        <div className="flex flex-col lg:flex-row gap-0 lg:gap-8 xl:gap-12">
          {/* Desktop Filter Panel sidebar */}
          <aside className="w-full lg:w-64 xl:w-72 flex-shrink-0 hidden lg:block">
            <div className="rounded-2xl border border-black/[0.08] bg-white p-4 sm:p-5 shadow-xs space-y-5">
              {/* Header: Filters title + Clear All */}
              <div className="flex items-center justify-between pb-3 border-b border-black/[0.06]">
                <Skeleton className="h-6 w-20 rounded-lg" />
                <Skeleton className="h-3.5 w-14 rounded-full" />
              </div>

              {/* Category Pills Section */}
              <div className="space-y-3 pb-3 border-b border-black/[0.06]">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-3.5 w-24 rounded-full" />
                  <Skeleton className="h-3.5 w-3.5 rounded-full" />
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <Skeleton className="h-7 w-14 rounded-full" />
                  <Skeleton className="h-7 w-20 rounded-full" />
                  <Skeleton className="h-7 w-16 rounded-full" />
                  <Skeleton className="h-7 w-18 rounded-full" />
                  <Skeleton className="h-7 w-22 rounded-full" />
                </div>
              </div>

              {/* Sort By Section */}
              <div className="space-y-2 pb-3 border-b border-black/[0.06]">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-3.5 w-20 rounded-full" />
                  <Skeleton className="h-3.5 w-3.5 rounded-full" />
                </div>
                <div className="space-y-1.5">
                  <Skeleton className="h-8 w-full rounded-lg" />
                  <Skeleton className="h-8 w-full rounded-lg" />
                  <Skeleton className="h-8 w-full rounded-lg" />
                </div>
              </div>

              {/* Price Range Section */}
              <div className="space-y-2.5 pb-2">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-3.5 w-24 rounded-full" />
                  <Skeleton className="h-3.5 w-3.5 rounded-full" />
                </div>
                <Skeleton className="h-2.5 w-full rounded-full" />
                <div className="flex justify-between items-center pt-1">
                  <Skeleton className="h-4 w-12 rounded-md" />
                  <Skeleton className="h-4 w-12 rounded-md" />
                </div>
              </div>
            </div>
          </aside>

          {/* Product Grid & Controls */}
          <div className="flex-1 min-w-0">
            {/* Desktop Top Bar: Title + Count */}
            <div className="hidden lg:flex items-center justify-between mb-6 pb-4 border-b border-outline-variant/15">
              <div className="space-y-1.5">
                <Skeleton className="h-8 w-32 rounded-lg" />
                <Skeleton className="h-4 w-28 rounded-full" />
              </div>
            </div>

            {/* Mobile Top Bar: Count badge + Filter icon */}
            <div className="lg:hidden mb-4 px-1 flex items-center justify-between gap-2">
              <Skeleton className="h-6 w-20 rounded-full" />
              <Skeleton className="w-10 h-10 rounded-full shrink-0" />
            </div>

            {/* Product Card Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-3 gap-x-2 sm:gap-x-4 lg:gap-x-8 gap-y-6 sm:gap-y-8 lg:gap-y-12">
              {[...Array(6)].map((_, i) => (
                <ProductCardSkeleton key={i} />
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export function ProductCardSkeleton({ isRectangular = false, compact = false }) {
  return (
    <div
      className={`group relative flex flex-col select-none ${
        isRectangular ? 'rounded-md' : 'rounded-[12px]'
      }`}
    >
      {/* 1. Visual Canvas: Aspect 4/5, rounded container */}
      <div className="relative">
        <Skeleton
          className={`aspect-[4/5] w-full border border-black/[0.08] ${
            isRectangular ? 'rounded-md' : 'rounded-[14px]'
          }`}
        />
        {/* Wishlist button placeholder */}
        <div className="absolute top-2 right-2 sm:top-2.5 sm:right-2.5 pointer-events-none">
          <Skeleton className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/80" />
        </div>
        {/* Add button pill straddling bottom-right */}
        <div className="absolute -bottom-3.5 right-2.5 sm:right-3 pointer-events-none">
          <Skeleton
            className={`${compact ? 'h-6 w-14' : 'h-7 sm:h-8 w-16 sm:w-20'} ${
              isRectangular ? 'rounded-md' : 'rounded-[14px]'
            } bg-white shadow-xs`}
          />
        </div>
      </div>

      {/* 2. Product Details: Category, Title, Price */}
      <div
        className={`${compact ? 'pt-2 pb-1 px-1.5' : 'pt-3 pb-2 px-3.5 lg:px-4'} flex flex-col flex-1 space-y-2`}
      >
        <div className="flex items-center gap-1.5 h-4 lg:h-5">
          <Skeleton className="h-3 w-16 rounded-full" />
          <Skeleton className="h-3 w-10 rounded-full" />
        </div>
        <Skeleton className="h-4.5 sm:h-5 w-4/5 rounded-md" />
        <div className="flex items-center gap-2 pt-0.5">
          <Skeleton className="h-4 sm:h-5 w-16 rounded-md" />
          <Skeleton className="h-3.5 w-12 rounded-md" />
        </div>
      </div>
    </div>
  );
}

// ─── Product Detail Skeleton ───
// Mirrors pages/ProductDetails.jsx + ProductGallery + ProductInfo + the inline
// ProductConfigurator block for block (same wrappers, gaps and heights), so
// nothing shifts when the real product replaces it.
export function ProductDetailSkeleton() {
  return (
    <div className="bg-surface relative min-h-screen" aria-busy="true" aria-label="Loading product">
      {/* Desktop breadcrumbs: Home / Shop / Category / Product */}
      <div className="hidden lg:block pt-[calc(var(--ak-header-h,144px)+20px)] pb-3.5 max-w-max-width mx-auto px-margin-desktop relative z-10">
        <div className="flex items-center gap-2 h-5 pb-1">
          <Skeleton className="h-2.5 w-10 rounded-full" />
          <span className="text-neutral-300 text-[10.5px]">/</span>
          <Skeleton className="h-2.5 w-9 rounded-full" />
          <span className="text-neutral-300 text-[10.5px]">/</span>
          <Skeleton className="h-2.5 w-14 rounded-full" />
          <span className="text-neutral-300 text-[10.5px]">/</span>
          <Skeleton className="h-2.5 w-28 rounded-full" />
        </div>
      </div>

      <section className="product-detail-section pt-[calc(var(--ak-header-h,96px)+12px)] lg:pt-0 pb-12 lg:pb-24 max-w-max-width mx-auto px-2.5 sm:px-3 md:px-margin-mobile lg:px-margin-desktop relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4 md:gap-8 lg:gap-12 xl:gap-20">
          {/* Gallery: one square image, capped at 580px like ProductGallery */}
          <div className="flex flex-col gap-4 md:gap-6 lg:gap-10 md:sticky md:top-24 lg:static md:self-start lg:self-auto">
            <Skeleton className="w-full aspect-square max-h-[580px] rounded-2xl sm:rounded-3xl" />
          </div>

          {/* Product info column */}
          <div className="px-1.5 md:px-0">
            <div className="flex flex-col gap-5 lg:gap-6 pt-2.5 sm:pt-3.5 md:pt-0">
              {/* Category pill + returns badge, then title */}
              <div className="space-y-2 sm:space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <Skeleton className="h-[22px] w-16 rounded-full" />
                  <Skeleton className="h-[22px] w-44 rounded-full" />
                </div>
                <div className="space-y-1">
                  <Skeleton className="h-[30px] sm:h-[37px] lg:h-[44px] w-[62%] rounded-xl" />
                </div>
              </div>

              {/* Price, old price, discount pill, savings */}
              <div className="py-3 border-b border-black/[0.08]">
                <div className="flex flex-wrap items-center gap-3 mb-3">
                  <Skeleton className="h-[30px] sm:h-[38px] w-24 sm:w-28 rounded-lg" />
                  <Skeleton className="h-4 w-12 rounded-md" />
                  <Skeleton className="h-6 w-16 rounded-full" />
                  <Skeleton className="h-3.5 w-16 rounded-md" />
                </div>
              </div>

              {/* Inline configurator: weight card, unit price + qty, CTAs */}
              <div className="space-y-4 mt-2">
                <div className="flex flex-col gap-6 w-full">
                  <div className="p-4 rounded-2xl border border-neutral-200/80 bg-white">
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <Skeleton className="h-3.5 w-16 rounded-md" />
                      <Skeleton className="h-5 w-[72px] rounded-full" />
                    </div>
                    <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
                      {[...Array(3)].map((_, i) => (
                        <Skeleton key={i} className="h-[58px] sm:h-[64px] w-full rounded-xl" />
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 pt-3 border-t border-neutral-200/80">
                    <div className="flex items-center justify-between min-h-[39px] sm:min-h-[44px]">
                      <div className="flex flex-col gap-1.5">
                        <Skeleton className="h-2.5 w-14 rounded-full" />
                        <Skeleton className="h-[22px] sm:h-[26px] w-20 rounded-md" />
                      </div>
                      <div className="flex items-center gap-2">
                        <Skeleton className="hidden sm:block h-2.5 w-7 rounded-full" />
                        <Skeleton className="h-9 w-[92px] rounded-full" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
                      <Skeleton className="h-[48px] sm:h-[52px] w-full rounded-full" />
                      <Skeleton className="h-[48px] sm:h-[52px] w-full rounded-full" />
                    </div>
                  </div>
                </div>
              </div>

              {/* About this item */}
              <div className="space-y-3 mt-3 pt-3 border-t border-black/[0.08]">
                {/* Rows sized to the real 14px heading and 15px/relaxed body lines */}
                <div className="space-y-1">
                  <div className="h-[21px] flex items-center">
                    <Skeleton className="h-3.5 w-28 rounded-md" />
                  </div>
                  <div>
                    <div className="h-[23px] sm:h-6 flex items-center">
                      <Skeleton className="h-3.5 w-full rounded-md" />
                    </div>
                    <div className="h-[23px] sm:h-6 flex items-center">
                      <Skeleton className="h-3.5 w-full sm:w-[70%] rounded-md" />
                    </div>
                    {/* Body text wraps to a third line on phones */}
                    <div className="h-[23px] flex items-center sm:hidden">
                      <Skeleton className="h-3.5 w-[45%] rounded-md" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Trust tiles: Fresh / Pure / Hygienic / Homestyle */}
              <div className="grid grid-cols-4 gap-1.5 sm:gap-2.5 pt-4 sm:pt-5 border-t border-black/10">
                {[...Array(4)].map((_, i) => (
                  <div
                    key={i}
                    className="flex flex-col items-center gap-1 sm:gap-1.5 py-2 px-1 sm:py-2.5 sm:px-2 rounded-xl sm:rounded-2xl bg-white border border-black/[0.08]"
                  >
                    <Skeleton variant="circle" className="w-7 h-7 sm:w-8 sm:h-8" />
                    <div className="h-[15px] flex items-center">
                      <Skeleton className="h-2 w-10 rounded-full" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Reviews (same fallback the page shows while that section loads) */}
      <div className="max-w-max-width mx-auto px-margin-mobile lg:px-margin-desktop py-8">
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    </div>
  );
}

export function CategorySkeleton() {
  return (
    <div className="flex flex-col items-center gap-3">
      <Skeleton variant="circle" className="w-16 h-16 lg:w-20 lg:h-20" />
      <Skeleton className="h-3 w-20" />
    </div>
  );
}

export function RecommendationSkeleton({ horizontal = false, compact = false }) {
  if (compact) {
    return (
      <div className="flex gap-2.5 sm:gap-3.5 overflow-x-hidden w-full pb-1">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="w-[160px] sm:w-[175px] flex-shrink-0">
            <div className="flex flex-col gap-2 w-full">
              <Skeleton className="aspect-[4/5] w-full rounded-[14px]" />
              <div className="space-y-1.5 pt-1 px-1">
                <Skeleton className="h-2.5 w-1/3 rounded" />
                <Skeleton className="h-3.5 w-4/5 rounded" />
                <Skeleton className="h-3.5 w-1/2 rounded" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div
      className={
        horizontal ? 'flex gap-6 overflow-x-hidden' : 'grid grid-cols-2 lg:grid-cols-4 gap-6'
      }
    >
      {[...Array(4)].map((_, i) => (
        <div key={i} className={horizontal ? 'min-w-[240px] lg:min-w-[280px]' : ''}>
          <ProductCardSkeleton />
        </div>
      ))}
    </div>
  );
}

export function RecommendationGridSkeleton({ cards = 4 }) {
  return (
    <div
      className="grid grid-cols-2 gap-3 pb-2 pt-1"
      aria-busy="true"
      aria-label="Loading recommendations"
    >
      {Array.from({ length: cards }).map((_, i) => (
        <div key={i} className="w-full flex flex-col gap-2">
          <Skeleton className="aspect-square w-full rounded-xl" delay={i * 90} />
          <Skeleton className="h-3 w-1/3 rounded" delay={i * 90 + 70} />
          <Skeleton className="h-4 w-3/4 rounded" delay={i * 90 + 130} />
          <Skeleton className="h-4 w-1/2 rounded" delay={i * 90 + 170} />
        </div>
      ))}
    </div>
  );
}
