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

export const CartEmptyState = ({ activeCartMode }) => {
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
          {activeCartMode === 'rental' ? 'No Rental Items Yet' : 'Your Bag is Empty'}
        </h2>
        <p className="font-body text-[13px] text-neutral-500 font-medium max-w-[320px] mx-auto leading-relaxed mb-6">
          {activeCartMode === 'rental'
            ? 'Browse rental products and reserve them for your event.'
            : "Looks like you haven't added any fresh homemade snacks, pickles, or sweets yet."}
        </p>
        <div className="flex justify-center">
          <Link
            to="/collections"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#f7bb0e] text-neutral-950 hover:bg-[#eab00d] border-[1.5px] border-[#f7bb0e] font-extrabold text-[12px] uppercase tracking-wider shadow-[0_2px_0_0_#d99b00,0_4px_12px_rgba(247,187,14,0.3)] transition-all active:scale-95 cursor-pointer"
          >
            <span>Explore Kitchen Delights</span>
            <ArrowRight className="w-4 h-4" strokeWidth={2.2} />
          </Link>
        </div>
      </motion.div>

      <div className="mt-3 pt-3 border-t border-outline-variant/10">
        <React.Suspense fallback={<Skeleton className="h-52 w-full rounded-2xl" />}>
          <RecommendationSystem
            hideHeader={false}
            horizontalScroll={true}
            compact={true}
            rentalOnly={false}
          />
        </React.Suspense>
      </div>
    </>
  );
};
