import React from 'react';
import { Skeleton } from '../SkeletonBase';
import { ProductCardSkeleton } from './ProductSkeletons';

export function CollectionSkeleton() {
  return (
    <div className="bg-surface min-h-screen" aria-busy="true" aria-label="Loading collection">
      {/* 1. Collection Header matching .ak-shop-head */}
      <section
        className="ak-shop-head"
        style={{ paddingTop: 'calc(var(--ak-header-h, 72px) + 20px)' }}
      >
        <div className="ak-shop-head__inner">
          <div className="ak-shop-head__text space-y-2.5 py-1">
            <div className="flex gap-2 items-center">
              <Skeleton className="h-3 w-12 rounded-full" />
              <span className="text-neutral-300 text-xs">/</span>
              <Skeleton className="h-3 w-20 rounded-full" />
            </div>
            <Skeleton className="h-10 sm:h-12 lg:h-14 w-44 sm:w-56 rounded-xl" />
            <Skeleton className="h-3.5 sm:h-4 w-64 sm:w-96 max-w-full rounded-lg" />
          </div>
        </div>
      </section>

      {/* 2. Main Grid */}
      <main className="max-w-max-width mx-auto px-margin-mobile lg:px-margin-desktop relative pb-8 lg:pb-24 pt-4 sm:pt-6">
        <div className="flex flex-col lg:flex-row gap-0 lg:gap-8 xl:gap-12">
          <aside className="w-full lg:w-64 xl:w-72 flex-shrink-0 hidden lg:block">
            <div className="rounded-2xl border border-black/[0.08] bg-white p-4 sm:p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-black/[0.06]">
                <Skeleton className="h-6 w-20 rounded-lg" />
                <Skeleton className="h-3.5 w-14 rounded-full" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-8 w-full rounded-lg" />
                <Skeleton className="h-8 w-full rounded-lg" />
                <Skeleton className="h-8 w-full rounded-lg" />
              </div>
            </div>
          </aside>
          <div className="flex-1 min-w-0">
            <div className="hidden lg:flex items-center justify-between mb-6 pb-4 border-b border-outline-variant/15">
              <Skeleton className="h-8 w-32 rounded-lg" />
              <Skeleton className="h-4 w-24 rounded-full" />
            </div>
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
