import React from 'react';
import { Skeleton } from '../SkeletonBase';

/**
 * Homepage skeletons — one source of truth, built from the real sections' own layout
 * classes (ak-today, ak-cats, h1-section, ak-section-header, h1-scroll-*) and measured
 * sizes, so swapping a skeleton for real content does not move the page.
 *
 *   Hero (Today's Kitchen masonry) .... HomeHeroSkeleton
 *   Category grid ...................... HomeCategorySkeleton
 *   Horizontal product row ............. HomeProductRowSkeleton
 *   Product grid (recommendations) ..... HomeProductGridSkeleton
 *   Whole page (route fallback) ........ HomeSkeleton
 *
 * The shimmer comes from <Skeleton> (CSS only); the global prefers-reduced-motion rule
 * switches it off.
 */

// Same breakpoints as EditorialHero's useColumnCount (640px / 1024px).
const heroColumnsForViewport = () => {
  if (typeof window === 'undefined' || !window.matchMedia) return 2;
  if (window.matchMedia('(min-width: 1024px)').matches) return 4;
  if (window.matchMedia('(min-width: 640px)').matches) return 3;
  return 2;
};

// Varied card heights echo the masonry; three per column fill a phone screen like the
// real hero (≈840px tall at 375px wide), so content below never jumps into view.
const HERO_COLUMN_HEIGHTS = [
  [240, 270, 250],
  [270, 230, 260],
  [250, 260, 240],
  [260, 240, 270],
];

export function HomeHeroSkeleton({ columns }) {
  const cols = Math.max(1, Math.min(4, columns || heroColumnsForViewport()));
  return (
    <section className="ak-today" aria-busy="true" aria-label="Loading today's menu">
      <div className="ak-today__head">
        <div className="ak-today__eyebrow">
          <Skeleton className="h-3 w-32 !rounded-full" glassy />
        </div>
        <div className="ak-today__title">
          <Skeleton className="h-8 w-44 sm:w-56 !rounded-lg" glassy />
        </div>
        <div className="ak-today__all">
          <Skeleton className="h-8.5 w-24 !rounded-full" glassy />
        </div>
      </div>
      <div className="ak-today__grid" style={{ '--cols': cols }}>
        {HERO_COLUMN_HEIGHTS.slice(0, cols).map((heights, c) => (
          <div key={c} className="ak-today__col">
            {heights.map((h, i) => (
              <div key={i} style={{ height: h }}>
                <Skeleton className="!rounded-[18px] w-full h-full" delay={(c + i) * 60} glassy />
              </div>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}

export function HomeCategorySkeleton() {
  return (
    <section className="ak-cats py-8 lg:py-12" aria-busy="true" aria-label="Loading categories">
      <div className="h1-container">
        <Skeleton className="h-7 w-52 !rounded-full mb-6" />
        <div className="grid grid-cols-3 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-4 lg:gap-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton
              key={i}
              delay={i * 50}
              className="aspect-[8/9] sm:aspect-auto sm:h-[210px] md:h-[240px] lg:h-[270px] !rounded-lg sm:!rounded-xl lg:!rounded-2xl"
            />
          ))}
        </div>
      </div>
    </section>
  );
}

/** Mirrors ProductCard: 4:5 image (14px radius), category line, title, price + Add button. */
export function HomeProductCardSkeleton({ delay = 0 }) {
  return (
    <div className="flex flex-col" aria-hidden="true">
      <Skeleton className="aspect-[4/5] w-full !rounded-[14px]" delay={delay} />
      <div className="pt-2.5 px-0.5 flex flex-col gap-1.5">
        <Skeleton className="h-3 w-1/3 !rounded" delay={delay} />
        <Skeleton className="h-4 w-4/5 !rounded" delay={delay} />
        <div className="flex items-center justify-between gap-2 mt-0.5">
          <Skeleton className="h-4 w-2/5 !rounded" delay={delay} />
          <Skeleton className="h-7 sm:h-8 w-16 !rounded-[14px]" delay={delay} />
        </div>
      </div>
    </div>
  );
}

function SectionHeaderSkeleton() {
  return (
    <div className="ak-section-header" aria-hidden="true">
      <Skeleton className="h-5 w-40 !rounded-full" />
      <Skeleton className="h-4 w-14 !rounded-full" />
    </div>
  );
}

/** Horizontal product row (Trending / New arrivals): same section, track and 280px items. */
export function HomeProductRowSkeleton({ cards = 4, sectionClassName = 'h1-section', label }) {
  return (
    <section
      className={`${sectionClassName} relative isolate`}
      aria-busy="true"
      aria-label={label || 'Loading products'}
    >
      <div className="h1-container relative z-10">
        <SectionHeaderSkeleton />
      </div>
      <div className="h1-container--full pl-4 lg:pl-9 relative z-10">
        <div className="h1-scroll-container">
          <div className="h1-scroll-container__track" style={{ gap: '16px' }}>
            {Array.from({ length: cards }).map((_, i) => (
              <div key={i} className="h1-scroll-item">
                <HomeProductCardSkeleton delay={i * 70} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/** Product grid (Recommended for you): same responsive column counts as the real grid. */
export function HomeProductGridSkeleton({
  cards = 4,
  sectionClassName = 'h1-section py-8 lg:py-12',
}) {
  return (
    <section
      className={`${sectionClassName} relative isolate`}
      aria-busy="true"
      aria-label="Loading recommendations"
    >
      <div className="h1-container relative z-10">
        <SectionHeaderSkeleton />
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-2.5 sm:gap-4 lg:gap-6 lg:gap-8">
          {Array.from({ length: cards }).map((_, i) => (
            <HomeProductCardSkeleton key={i} delay={i * 70} />
          ))}
        </div>
      </div>
    </section>
  );
}

/** Whole-homepage skeleton, shown while the homepage code itself is still loading. */
export function HomeSkeleton() {
  return (
    <div className="h1-page relative bg-surface-bright overflow-hidden" aria-busy="true">
      <div className="relative z-10">
        <HomeHeroSkeleton />
        <HomeCategorySkeleton />
        <HomeProductRowSkeleton sectionClassName="h1-section !pt-4 lg:!pt-8 !pb-4 lg:!pb-8" />
        <HomeProductRowSkeleton />
      </div>
    </div>
  );
}
