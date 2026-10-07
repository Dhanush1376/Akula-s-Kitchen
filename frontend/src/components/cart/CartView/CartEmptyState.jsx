import { ArrowRight, ShoppingBag } from 'lucide-react';
import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Skeleton } from '../../ui/Skeleton';
const RecommendationSystem = React.lazy(() =>
  import('../../sections/RecommendationSystem').then((m) => ({
    default: m.RecommendationSystem,
  })),
);

export const CartEmptyState = () => {
  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center max-w-md mx-auto pt-10 pb-6 lg:pt-14 lg:pb-8 px-4"
      >
        <div className="w-16 h-16 rounded-full bg-[#fef9e7] border border-[#fae182] flex items-center justify-center mb-4 mx-auto relative shadow-xs">
          <ShoppingBag className="w-7 h-7 text-neutral-950 relative z-10" strokeWidth={1.9} />
        </div>
        <h2 className="font-bold text-[18px] sm:text-[20px] text-neutral-900 tracking-tight mb-2">
          Your Bag is Empty
        </h2>
        <p className="font-body text-[13px] text-neutral-500 font-medium max-w-[320px] mx-auto leading-relaxed mb-6">
          Looks like you haven&apos;t added any fresh homemade snacks, pickles, or sweets yet.
        </p>
        <div className="flex justify-center">
          <Link
            to="/collections"
            className="inline-flex items-center justify-between gap-4 pl-6 pr-2 py-1.5 rounded-full bg-[#283618] text-white hover:bg-[#1f2b13] border border-[#283618] font-extrabold text-[12px] uppercase tracking-wider shadow-sm transition-all active:scale-[0.98] group cursor-pointer"
          >
            <span>Explore Kitchen Delights</span>
            <span className="w-8 h-8 rounded-full bg-white text-[#283618] flex items-center justify-center shrink-0 shadow-xs transition-transform duration-200 group-hover:scale-105">
              <ArrowRight
                className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5"
                strokeWidth={2.5}
                aria-hidden="true"
              />
            </span>
          </Link>
        </div>
      </motion.div>

      <div className="mt-3 pt-3 border-t border-outline-variant/10">
        <React.Suspense fallback={<Skeleton className="h-52 w-full rounded-2xl" />}>
          <RecommendationSystem hideHeader={false} horizontalScroll={true} compact={true} />
        </React.Suspense>
      </div>
    </>
  );
};
