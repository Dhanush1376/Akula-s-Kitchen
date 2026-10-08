import React from 'react';
import { Skeleton } from '../SkeletonBase';

export function ContactSkeleton() {
  return (
    <div className="bg-white min-h-screen pt-44 sm:pt-48 lg:pt-52 pb-[calc(var(--bottom-nav-height,65px)+3.5rem)] lg:pb-24">
      <div className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-10">
        {/* Breadcrumb Skeleton */}
        <Skeleton className="h-2.5 w-32 mb-3" />

        {/* Header Skeleton */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6 lg:mb-8">
          <div>
            <Skeleton className="h-10 sm:h-12 w-52 sm:w-64 mb-2" />
            <Skeleton className="h-3 w-48" />
          </div>
          <Skeleton className="h-10 w-36 rounded-full shrink-0" />
        </div>

        <hr className="border-t border-[#283618]/10 mb-8 sm:mb-10" />

        {/* 2-Column Layout Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
          {/* Left Column */}
          <div className="lg:col-span-5 space-y-3.5">
            <Skeleton className="h-3 w-28 mb-1" />
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="p-4 rounded-2xl border border-[#283618]/10 bg-[#fdfbf7] flex items-center gap-3"
              >
                <Skeleton className="w-9 h-9 rounded-xl shrink-0" />
                <div className="space-y-1.5 flex-1">
                  <Skeleton className="h-2.5 w-16" />
                  <Skeleton className="h-4 w-36" />
                </div>
              </div>
            ))}
          </div>

          {/* Right Column */}
          <div className="lg:col-span-7 space-y-3.5">
            <Skeleton className="h-3 w-36 mb-1" />
            <div className="rounded-2xl border border-[#283618]/10 bg-[#fdfbf7] p-4 space-y-3.5">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-56 sm:h-64 w-full rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
