import { BadgeCheck, X, Search, Star, Pencil } from 'lucide-react';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { m as motion, AnimatePresence } from 'framer-motion';
import { reviewService } from '../../services/domainServices';
import { useAuth } from '../../context/AuthContext';
import { WriteReviewModal, getPremiumReviewerName } from './ProductReviews';
import { OptimizedImage } from '../ui/OptimizedImage';
import { useMobileDrawerEngine, DrawerDragHandle } from '../ui/drawer';

// Helper Star Component
function StarRating({ value = 0, size = 11 }) {
  return (
    <div className="flex items-center gap-0.5 select-none">
      {Array.from({ length: 5 }).map((_, i) => {
        const filled = i < Math.round(value);
        return (
          <svg
            key={i}
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill={filled ? '#F7BB0E' : 'none'}
            stroke={filled ? '#F7BB0E' : '#d1d5db'}
            strokeWidth="1.8"
            className="shrink-0"
          >
            <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
          </svg>
        );
      })}
    </div>
  );
}

// Compact Drawer Review Card
function DrawerReviewCard({ review, productId }) {
  const customerName = getPremiumReviewerName(review);
  const initials = customerName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const date = review.createdAt
    ? new Date(review.createdAt).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : '';

  const rawImages = review.images || review.reviewImages || [];
  const reviewImages = rawImages
    .map((img) => (typeof img === 'string' ? img : img?.secureUrl || img?.url))
    .filter(Boolean);

  return (
    <div className="bg-white rounded-xl border border-black/10 shadow-2xs p-3 sm:p-3.5 flex flex-col justify-between">
      <div>
        <div className="flex items-start justify-between gap-2 border-b border-black/10 pb-2">
          <div className="flex items-center gap-2 min-w-0">
            {/* Avatar */}
            <div className="w-7 h-7 rounded-full bg-[#283618]/10 border border-[#283618]/15 flex items-center justify-center shrink-0">
              <span className="font-display text-[#283618] text-[11px] font-bold">{initials}</span>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1 min-w-0">
                <p className="font-body text-[12px] font-bold text-neutral-900 leading-tight truncate">
                  {customerName}
                </p>
                {review.verified && (
                  <span
                    title="Verified Purchase"
                    className="shrink-0 inline-flex items-center text-emerald-600"
                  >
                    <BadgeCheck className="w-3.5 h-3.5" strokeWidth={2.2} />
                  </span>
                )}
              </div>
              {date && (
                <span className="font-sans text-[9.5px] text-neutral-400 font-normal leading-tight mt-0.5 block">
                  {date}
                </span>
              )}
            </div>
          </div>

          {/* 1-Star Rating at Top Right */}
          {review.rating > 0 && (
            <div className="flex items-center gap-1 shrink-0 pt-0.5">
              <svg
                width="11"
                height="11"
                viewBox="0 0 24 24"
                fill="#F7BB0E"
                stroke="#F7BB0E"
                strokeWidth="1.5"
                className="shrink-0"
                aria-hidden="true"
              >
                <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
              </svg>
              <span className="font-sans text-[11px] font-bold text-neutral-800 leading-none">
                {Number(review.rating).toFixed(1)}
              </span>
            </div>
          )}
        </div>

        {/* Comment */}
        {review.comment && (
          <p className="font-body text-[11.5px] text-neutral-700 leading-relaxed pt-2 line-clamp-4">
            "{review.comment}"
          </p>
        )}
      </div>

      {/* Review Images */}
      {reviewImages.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2.5 pt-2 border-t border-black/[0.06]">
          {reviewImages.slice(0, 4).map((imgUrl, idx) => (
            <Link
              key={idx}
              to={`/product/${productId}/reviews/images`}
              className="w-8.5 h-8.5 rounded-lg overflow-hidden border border-black/5 bg-neutral-50 shadow-3xs cursor-pointer relative group shrink-0"
            >
              <OptimizedImage
                src={imgUrl}
                alt={`Review photo ${idx + 1}`}
                containerClassName="w-full h-full"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
            </Link>
          ))}
          {reviewImages.length > 4 && (
            <Link
              to={`/product/${productId}/reviews/images`}
              className="w-8.5 h-8.5 rounded-lg overflow-hidden border border-black/5 bg-black/60 hover:bg-black/80 flex items-center justify-center text-white text-[9px] font-bold tracking-widest shrink-0 transition-colors cursor-pointer"
            >
              +{reviewImages.length - 4}
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

export function ReviewsDrawer({
  isOpen = false,
  onClose,
  productId,
  productTitle,
  initialReviews = [],
  initialAvgRating = 0,
  initialRatingCounts,
  eligibility,
  onReviewSubmitted,
}) {
  const { isAuthenticated, openAuthModal } = useAuth();

  const [reviews, setReviews] = useState(initialReviews);
  const [loading, setLoading] = useState(false);
  const [showWriteModal, setShowWriteModal] = useState(false);
  const [starFilter, setStarFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [hasBackgroundFetched, setHasBackgroundFetched] = useState(false);

  // Sync with initialReviews if provided or updated
  useEffect(() => {
    if (initialReviews && initialReviews.length > 0) {
      setReviews(initialReviews);
    }
  }, [initialReviews]);

  // Fetch full review list silently in background when drawer is opened
  const fetchAllReviews = useCallback(async () => {
    if (!productId || hasBackgroundFetched) return;
    try {
      if (!initialReviews || initialReviews.length === 0) {
        setLoading(true);
      }
      const res = await reviewService.getProductReviews(productId, { page: 1, limit: 50 });
      if (res && res.success) {
        const data = res.data;
        const list = data.items || data.data || data || [];
        setReviews(list);
        setHasBackgroundFetched(true);
      }
    } catch {
      // silently retain existing reviews
    } finally {
      setLoading(false);
    }
  }, [productId, hasBackgroundFetched, initialReviews]);

  useEffect(() => {
    if (isOpen) {
      fetchAllReviews();
    }
  }, [isOpen, fetchAllReviews]);

  // Framer Motion mobile drawer physics
  const { dragProps, sheetTransition } = useMobileDrawerEngine({
    isOpen,
    onClose,
  });

  // Support ESC key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !showWriteModal) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, showWriteModal]);

  const handleOpenWrite = () => {
    if (!isAuthenticated) {
      openAuthModal();
      return;
    }
    setShowWriteModal(true);
  };

  // Client-side filtering
  const filteredReviews = useMemo(() => {
    return reviews.filter((r) => {
      const matchStar = starFilter === 'all' || Math.round(r.rating) === parseInt(starFilter, 10);
      const matchText =
        !searchQuery ||
        (r.comment || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.customerName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.customer?.name || '').toLowerCase().includes(searchQuery.toLowerCase());
      return matchStar && matchText;
    });
  }, [reviews, starFilter, searchQuery]);

  const avgRating = useMemo(() => {
    if (reviews.length > 0) {
      return reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;
    }
    return initialAvgRating || 0;
  }, [reviews, initialAvgRating]);

  const ratingCounts = useMemo(() => {
    if (reviews.length > 0) {
      return [5, 4, 3, 2, 1].map((star) => ({
        star,
        count: reviews.filter((r) => Math.round(r.rating) === star).length,
      }));
    }
    return initialRatingCounts || [5, 4, 3, 2, 1].map((star) => ({ star, count: 0 }));
  }, [reviews, initialRatingCounts]);

  return (
    <>
      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {isOpen && (
              <div className="fixed inset-0 z-[1000] pointer-events-none">
                {/* Backdrop */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  onClick={onClose}
                  className="fixed inset-0 bg-black/40 backdrop-blur-xs pointer-events-auto"
                />

                {/* Floating Bottom Sheet Shell */}
                <motion.div
                  initial={{ y: '100%', opacity: 0.5 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: '100%', opacity: 0 }}
                  transition={sheetTransition}
                  {...dragProps}
                  className="fixed bottom-3 left-3 right-3 sm:bottom-4 sm:left-4 sm:right-4 z-10 pointer-events-auto flex flex-col max-w-[480px] sm:max-w-[500px] mx-auto"
                  style={{
                    marginBottom: 'env(safe-area-inset-bottom, 0px)',
                  }}
                >
                  <div className="relative w-full bg-white/95 backdrop-blur-2xl rounded-3xl p-4 sm:p-5 shadow-[0_12px_45px_rgba(0,0,0,0.18)] flex flex-col max-h-[85dvh] overflow-hidden border border-black/[0.08]">
                    {/* Handlebar for mobile bottom sheet feel */}
                    <DrawerDragHandle
                      onClick={onClose}
                      pillClassName="bg-neutral-300 w-10 h-1 mb-1"
                    />

                    {/* Close Button */}
                    <button
                      type="button"
                      onClick={onClose}
                      className="absolute top-3.5 right-3.5 w-8.5 h-8.5 rounded-full bg-neutral-100 hover:bg-neutral-200 active:scale-95 flex items-center justify-center text-neutral-700 hover:text-black transition-all z-10 cursor-pointer shadow-2xs"
                      aria-label="Close reviews drawer"
                    >
                      <X className="w-4 h-4 text-black" strokeWidth={2.2} />
                    </button>

                    {/* Drawer Header */}
                    <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-black/[0.06] pr-10">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h2 className="font-sans text-[17px] sm:text-[18px] font-bold text-neutral-900 leading-tight">
                            Customer Reviews
                          </h2>
                          {reviews.length > 0 && (
                            <span className="font-sans text-[11px] font-bold text-neutral-500">
                              ({reviews.length})
                            </span>
                          )}
                        </div>
                        <p className="font-sans text-[11px] text-neutral-500 font-medium truncate max-w-[280px] mt-0.5">
                          {productTitle || 'Product'}
                        </p>
                      </div>

                      {avgRating > 0 && (
                        <div className="flex items-center gap-1 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200/60 shrink-0">
                          <Star className="w-3 h-3 fill-[#F7BB0E] text-[#F7BB0E]" />
                          <span className="font-sans text-[11.5px] font-bold text-neutral-900">
                            {avgRating.toFixed(1)}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Scrollable Content Body */}
                    <div className="flex-1 overflow-y-auto overscroll-contain touch-pan-y no-scrollbar space-y-3 pt-0.5">
                      {/* Compact Rating Stats Card */}
                      {reviews.length > 0 && (
                        <div className="flex items-center gap-3 sm:gap-6 py-2.5 px-3 sm:py-3 sm:px-4 bg-white rounded-xl border border-black/10 shadow-2xs">
                          {/* Average Rating Block */}
                          <div className="flex flex-col items-center justify-center border-r border-black/10 pr-3 sm:pr-6 shrink-0 min-w-[75px] sm:min-w-[90px]">
                            <span className="font-display text-2xl sm:text-3xl font-bold text-neutral-900 leading-none">
                              {avgRating.toFixed(1)}
                            </span>
                            <div className="mt-1">
                              <StarRating value={avgRating} size={11} />
                            </div>
                            <span className="font-sans text-[9.5px] sm:text-[10px] text-neutral-500 font-semibold mt-0.5 whitespace-nowrap">
                              {reviews.length} {reviews.length === 1 ? 'review' : 'reviews'}
                            </span>
                          </div>

                          {/* Compact Bar Breakdown */}
                          <div className="flex-1 space-y-1 w-full min-w-0">
                            {ratingCounts.map(({ star, count }) => {
                              const pct = reviews.length
                                ? Math.round((count / reviews.length) * 100)
                                : 0;
                              return (
                                <div key={star} className="flex items-center gap-1.5">
                                  <div className="flex items-center gap-0.5 w-3.5 shrink-0">
                                    <span className="font-sans text-[9.5px] font-bold text-neutral-700 leading-none">
                                      {star}
                                    </span>
                                    <span className="text-[8px] text-[#F7BB0E] leading-none">
                                      ★
                                    </span>
                                  </div>
                                  <div className="flex-1 h-1 bg-neutral-100 rounded-full overflow-hidden">
                                    <div
                                      className="h-full bg-[#F7BB0E] rounded-full transition-all duration-500"
                                      style={{ width: `${pct}%` }}
                                    />
                                  </div>
                                  <span className="font-sans text-[9px] text-neutral-400 w-6 text-right font-medium shrink-0">
                                    {pct}%
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Prominent High-Visibility Search Bar & Star Filter Pills */}
                      <div className="space-y-2 pt-1">
                        <div className="relative flex items-center">
                          <Search className="absolute left-3.5 w-4 h-4 text-neutral-600 pointer-events-none" />
                          <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search in reviews..."
                            className="w-full h-10 pl-10 pr-9 rounded-full border border-neutral-300 bg-neutral-100/90 hover:border-neutral-400 focus:bg-white focus:border-[#283618] focus:ring-2 focus:ring-[#283618]/15 text-[13px] font-medium text-neutral-900 placeholder:text-neutral-500 placeholder:font-normal outline-none shadow-2xs transition-all"
                          />
                          {searchQuery && (
                            <button
                              type="button"
                              onClick={() => setSearchQuery('')}
                              className="absolute right-2.5 p-1 rounded-full text-neutral-500 hover:text-neutral-900 hover:bg-neutral-200/80 active:scale-95 transition-all cursor-pointer"
                              aria-label="Clear search"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>

                        {/* Star Filter Pills */}
                        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
                          {['all', '5', '4', '3', '2', '1'].map((star) => (
                            <button
                              key={star}
                              type="button"
                              onClick={() => setStarFilter(star)}
                              className={`px-3 py-1 rounded-full text-[11px] font-bold shrink-0 transition-all cursor-pointer ${
                                starFilter === star
                                  ? 'bg-[#283618] text-white shadow-2xs'
                                  : 'bg-neutral-100/80 hover:bg-neutral-200 text-neutral-700 border border-neutral-200/80'
                              }`}
                            >
                              {star === 'all' ? 'All' : `${star} ★`}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Reviews List */}
                      {loading && reviews.length === 0 ? (
                        <div className="space-y-2 py-4">
                          {[1, 2, 3].map((i) => (
                            <div
                              key={i}
                              className="skeleton-box bg-white rounded-xl border border-black/10 p-3.5 space-y-2"
                            >
                              <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-full bg-neutral-100 animate-pulse" />
                                <div className="space-y-1">
                                  <div className="h-2.5 w-20 bg-neutral-100 rounded animate-pulse" />
                                  <div className="h-2 w-12 bg-neutral-100 rounded animate-pulse" />
                                </div>
                              </div>
                              <div className="h-3 w-full bg-neutral-100 rounded animate-pulse" />
                            </div>
                          ))}
                        </div>
                      ) : filteredReviews.length === 0 ? (
                        <div className="py-10 text-center bg-neutral-50/60 rounded-xl border border-black/5 p-4">
                          <p className="font-sans text-[13px] font-bold text-neutral-700">
                            No reviews found
                          </p>
                          <p className="font-sans text-[11px] text-neutral-400 mt-1">
                            {searchQuery || starFilter !== 'all'
                              ? 'Try clearing filters or search term'
                              : 'Be the first to review this product!'}
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-2.5 pb-2">
                          {filteredReviews.map((review) => (
                            <DrawerReviewCard
                              key={review._id || review.id}
                              review={review}
                              productId={productId}
                            />
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Bottom Action Bar */}
                    <div className="mt-2.5 pt-2.5 border-t border-black/[0.06] shrink-0">
                      <button
                        type="button"
                        onClick={handleOpenWrite}
                        className="w-full bg-[#283618] hover:bg-[#1f2b13] text-white py-3 rounded-full font-sans text-[12px] sm:text-[13px] uppercase tracking-wider font-bold shadow-sm transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2"
                      >
                        <Pencil className="w-3.5 h-3.5 text-[#f7bb0e]" strokeWidth={2.2} />
                        <span>Write a Review</span>
                      </button>
                    </div>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>,
          document.body,
        )}

      {/* Write Review Modal */}
      <AnimatePresence>
        {showWriteModal && (
          <WriteReviewModal
            productId={productId}
            productTitle={productTitle}
            existingReview={eligibility?.alreadyReviewed ? null : undefined}
            onClose={() => setShowWriteModal(false)}
            onSuccess={() => {
              setShowWriteModal(false);
              setHasBackgroundFetched(false);
              fetchAllReviews();
              if (onReviewSubmitted) onReviewSubmitted();
            }}
          />
        )}
      </AnimatePresence>
    </>
  );
}
