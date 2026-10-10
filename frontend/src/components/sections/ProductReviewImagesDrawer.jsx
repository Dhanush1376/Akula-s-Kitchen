import {
  ChevronLeft,
  ChevronRight,
  X,
  BadgeCheck,
  Quote,
  ArrowRight,
  Camera,
  Star,
  LayoutGrid,
  Maximize2,
} from 'lucide-react';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { reviewService } from '../../services/domainServices';
import { OptimizedImage } from '../ui/OptimizedImage';
import { m as motion, AnimatePresence } from 'framer-motion';
import { useMobileDrawerEngine, DrawerDragHandle } from '../ui/drawer';
import { getPremiumReviewerName } from './ProductReviews';

// Helper Star Component
function StarRating({ value = 0, size = 12 }) {
  return (
    <div
      className="flex items-center gap-0.5 select-none"
      aria-label={`Rating: ${value} out of 5 stars`}
    >
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

export function ProductReviewImagesDrawer({
  isOpen = false,
  onClose,
  productId,
  productTitle = 'Product',
  productImageSrc,
  initialPhotoIndex = 0,
  reviews: initialReviews = [],
}) {
  const [reviews, setReviews] = useState(initialReviews);
  const [loading, setLoading] = useState(false);
  const [activePhotoIndex, setActivePhotoIndex] = useState(initialPhotoIndex);
  const [desktopViewMode, setDesktopViewMode] = useState('focus'); // 'focus' | 'grid'

  // Sync reviews when parent updates
  useEffect(() => {
    if (initialReviews && initialReviews.length > 0) {
      setReviews(initialReviews);
    }
  }, [initialReviews]);

  // Sync active photo index when opening or changing target photo
  useEffect(() => {
    if (isOpen) {
      setActivePhotoIndex(initialPhotoIndex >= 0 ? initialPhotoIndex : 0);
    }
  }, [isOpen, initialPhotoIndex]);

  // If no reviews passed, fetch in background silently
  useEffect(() => {
    let isMounted = true;
    if (isOpen && productId && (!reviews || reviews.length === 0)) {
      setLoading(true);
      reviewService
        .getProductReviews(productId, { page: 1, limit: 100 })
        .then((res) => {
          if (isMounted && res && res.success) {
            const list = res.data.items || res.data.data || res.data || [];
            setReviews(list);
          }
        })
        .catch(() => {})
        .finally(() => {
          if (isMounted) setLoading(false);
        });
    }
    return () => {
      isMounted = false;
    };
  }, [isOpen, productId, reviews]);

  // Framer Motion mobile bottom sheet interaction engine
  const { isMobile, dragProps, sheetTransition } = useMobileDrawerEngine({
    isOpen,
    onClose,
  });

  // Flatten review photos
  const photos = useMemo(() => {
    const list = [];
    (reviews || []).forEach((review) => {
      const rawImages = review.images || review.reviewImages || [];
      if (Array.isArray(rawImages)) {
        rawImages.forEach((img) => {
          const imgUrl = typeof img === 'string' ? img : img?.secureUrl || img?.url;
          if (imgUrl) {
            list.push({
              imgUrl,
              review,
            });
          }
        });
      }
    });
    return list;
  }, [reviews]);

  // Current active photo
  const activePhoto = useMemo(() => {
    if (activePhotoIndex === null || activePhotoIndex < 0 || activePhotoIndex >= photos.length) {
      return photos[0] || null;
    }
    return photos[activePhotoIndex];
  }, [activePhotoIndex, photos]);

  const handleNext = useCallback(() => {
    if (photos.length <= 1) return;
    setActivePhotoIndex((prev) => (prev < photos.length - 1 ? prev + 1 : 0));
  }, [photos.length]);

  const handlePrev = useCallback(() => {
    if (photos.length <= 1) return;
    setActivePhotoIndex((prev) => (prev > 0 ? prev - 1 : photos.length - 1));
  }, [photos.length]);

  // Keyboard navigation: Escape to close, Arrows to switch photo
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, handleNext, handlePrev]);

  // Touch swipe support for photo viewing
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const minSwipeDistance = 45;

  const onTouchStart = (e) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    if (Math.abs(distance) > minSwipeDistance) {
      if (distance > 0) {
        handleNext();
      } else {
        handlePrev();
      }
    }
  };

  // Reviewer details helper
  const activeReview = activePhoto?.review;
  const customerName = activeReview ? getPremiumReviewerName(activeReview) : 'Customer';
  const customerInitials =
    customerName
      .split(' ')
      .filter(Boolean)
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || 'C';

  const reviewDate = activeReview?.createdAt
    ? new Date(activeReview.createdAt).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : '';

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[1050] pointer-events-none">
          {/* Backdrop Blur Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs pointer-events-auto cursor-pointer"
            aria-label="Close photos dialog"
          />

          <AnimatePresence mode="wait">
            {isMobile ? (
              /* ─── Mobile: App Drawer Kind ─── */
              <motion.div
                key="mobile-drawer"
                initial={{ y: '100%', opacity: 0.5 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: '100%', opacity: 0 }}
                transition={sheetTransition}
                {...dragProps}
                className="fixed bottom-3 left-3 right-3 sm:bottom-4 sm:left-4 sm:right-4 z-[1060] pointer-events-auto flex flex-col max-w-[500px] mx-auto"
                style={{
                  marginBottom: 'env(safe-area-inset-bottom, 0px)',
                }}
              >
                <div className="relative w-full bg-white/95 backdrop-blur-2xl rounded-2xl p-4 sm:p-5 shadow-[0_12px_45px_rgba(0,0,0,0.22)] flex flex-col max-h-[88dvh] overflow-hidden border border-black/[0.08]">
                  {/* Native mobile drag handle */}
                  <DrawerDragHandle
                    onClick={onClose}
                    pillClassName="bg-neutral-300 w-10 h-1 mb-1"
                  />

                  {/* Circular Close Button */}
                  <button
                    type="button"
                    onClick={onClose}
                    className="absolute top-3.5 right-3.5 w-8.5 h-8.5 rounded-full bg-neutral-100 hover:bg-neutral-200 active:scale-95 flex items-center justify-center text-neutral-700 hover:text-black transition-all z-10 cursor-pointer shadow-2xs"
                    aria-label="Close photos drawer"
                  >
                    <X className="w-4 h-4 text-black" strokeWidth={2.2} />
                  </button>

                  {/* Drawer Header */}
                  <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-black/[0.06] pr-10">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-[#283618]/10 text-[#283618] flex items-center justify-center shrink-0">
                        <Camera className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h2 className="font-sans text-[16px] sm:text-[17px] font-bold text-neutral-900 leading-tight">
                            Customer Gallery
                          </h2>
                          {photos.length > 0 && (
                            <span className="font-sans text-[11px] font-bold text-[#283618] bg-[#283618]/10 px-2 py-0.5 rounded-full">
                              {photos.length}
                            </span>
                          )}
                        </div>
                        <p className="font-sans text-[11px] text-neutral-500 font-medium truncate max-w-[220px] mt-0.5">
                          {productTitle}
                        </p>
                      </div>
                    </div>

                    {/* View Mode Toggle Button on Mobile */}
                    {photos.length > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          if (activePhotoIndex !== null) {
                            setActivePhotoIndex(null);
                          } else {
                            setActivePhotoIndex(0);
                          }
                        }}
                        className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-neutral-100 text-neutral-700 hover:bg-neutral-200 active:scale-95 transition-all shrink-0 cursor-pointer"
                      >
                        {activePhotoIndex !== null ? (
                          <>
                            <LayoutGrid className="w-3.5 h-3.5 text-neutral-600" />
                            <span>Grid</span>
                          </>
                        ) : (
                          <>
                            <Maximize2 className="w-3.5 h-3.5 text-neutral-600" />
                            <span>Focus</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>

                  {/* Scrollable Content Body */}
                  <div className="flex-1 overflow-y-auto overscroll-contain touch-pan-y no-scrollbar space-y-3 pt-0.5">
                    {loading && photos.length === 0 ? (
                      <div className="py-12 flex flex-col items-center justify-center space-y-3">
                        <div className="w-12 h-12 rounded-full border-2 border-[#283618] border-t-transparent animate-spin" />
                        <p className="font-sans text-xs text-neutral-500 font-medium">
                          Loading customer photos...
                        </p>
                      </div>
                    ) : photos.length === 0 ? (
                      <div className="py-12 text-center bg-neutral-50/70 rounded-2xl border border-black/5 p-5">
                        <div className="w-12 h-12 rounded-full bg-neutral-100 flex items-center justify-center mx-auto mb-3 text-neutral-400">
                          <Camera className="w-6 h-6" />
                        </div>
                        <p className="font-sans text-[14px] font-bold text-neutral-800">
                          No customer photos yet
                        </p>
                        <p className="font-sans text-[11px] text-neutral-500 mt-1">
                          Be the first to share your real meal setup photo!
                        </p>
                        <button
                          type="button"
                          onClick={onClose}
                          className="mt-4 px-4 py-2 rounded-full bg-[#283618] text-white text-xs font-bold shadow-sm"
                        >
                          Close
                        </button>
                      </div>
                    ) : activePhotoIndex !== null && activePhoto ? (
                      /* Single Photo Focus View in Mobile Drawer */
                      <div className="space-y-3">
                        {/* Image Stage */}
                        <div
                          className="relative aspect-square w-full rounded-2xl overflow-hidden bg-neutral-950 flex items-center justify-center border border-black/5 shadow-inner touch-pan-y"
                          onTouchStart={onTouchStart}
                          onTouchMove={onTouchMove}
                          onTouchEnd={onTouchEnd}
                        >
                          <OptimizedImage
                            src={activePhoto.imgUrl}
                            alt={`Customer setup ${activePhotoIndex + 1}`}
                            containerClassName="w-full h-full flex items-center justify-center"
                            className="w-full h-full object-contain"
                          />

                          {/* Counter badge */}
                          <div className="absolute top-2.5 left-2.5 bg-black/60 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-0.5 rounded-full select-none">
                            {activePhotoIndex + 1} / {photos.length}
                          </div>

                          {/* Navigation Chevrons */}
                          {photos.length > 1 && (
                            <>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handlePrev();
                                }}
                                className="absolute left-2.5 w-8.5 h-8.5 rounded-full bg-black/45 hover:bg-black/70 text-white flex items-center justify-center transition-all cursor-pointer shadow-md"
                                aria-label="Previous photo"
                              >
                                <ChevronLeft className="w-4.5 h-4.5" />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleNext();
                                }}
                                className="absolute right-2.5 w-8.5 h-8.5 rounded-full bg-black/45 hover:bg-black/70 text-white flex items-center justify-center transition-all cursor-pointer shadow-md"
                                aria-label="Next photo"
                              >
                                <ChevronRight className="w-4.5 h-4.5" />
                              </button>
                            </>
                          )}
                        </div>

                        {/* Thumbnail Strip if multiple photos */}
                        {photos.length > 1 && (
                          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
                            {photos.map((p, idx) => (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => setActivePhotoIndex(idx)}
                                className={`w-11 h-11 rounded-xl overflow-hidden shrink-0 border-2 transition-all cursor-pointer ${
                                  idx === activePhotoIndex
                                    ? 'border-[#283618] ring-2 ring-[#283618]/30 scale-105 shadow-xs'
                                    : 'border-transparent opacity-60 hover:opacity-100'
                                }`}
                                aria-label={`Go to photo ${idx + 1}`}
                              >
                                <img
                                  src={p.imgUrl}
                                  alt={`Thumb ${idx + 1}`}
                                  className="w-full h-full object-cover"
                                />
                              </button>
                            ))}
                          </div>
                        )}

                        {/* Review Context Card */}
                        <div className="bg-white rounded-2xl border border-black/10 shadow-2xs p-3.5 space-y-2">
                          <div className="flex items-center justify-between gap-2 border-b border-black/[0.06] pb-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="w-7 h-7 rounded-full bg-[#283618]/10 border border-[#283618]/15 flex items-center justify-center shrink-0">
                                <span className="font-display text-[#283618] text-[11px] font-bold">
                                  {customerInitials}
                                </span>
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-1 min-w-0">
                                  <span className="font-body text-[12px] font-bold text-neutral-900 truncate">
                                    {customerName}
                                  </span>
                                  {activeReview?.verified && (
                                    <span
                                      title="Verified Purchase"
                                      className="shrink-0 text-emerald-600 inline-flex items-center"
                                    >
                                      <BadgeCheck className="w-3.5 h-3.5" strokeWidth={2.2} />
                                    </span>
                                  )}
                                </div>
                                {reviewDate && (
                                  <span className="font-sans text-[9.5px] text-neutral-400 block leading-tight">
                                    {reviewDate}
                                  </span>
                                )}
                              </div>
                            </div>

                            {activeReview?.rating > 0 && (
                              <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200/60 shrink-0">
                                <Star className="w-3 h-3 fill-[#F7BB0E] text-[#F7BB0E]" />
                                <span className="font-sans text-[11px] font-bold text-neutral-800">
                                  {Number(activeReview.rating).toFixed(1)}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Comment */}
                          {activeReview?.comment && (
                            <div className="relative pt-1">
                              <Quote className="absolute -top-1 -left-1 text-neutral-200 w-4 h-4 -z-10 select-none pointer-events-none" />
                              <p className="font-body text-[12px] text-neutral-700 leading-relaxed italic pl-3">
                                "{activeReview.comment}"
                              </p>
                            </div>
                          )}

                          {/* Product Link Chip */}
                          {productId && (
                            <Link
                              to={`/product/${productId}`}
                              onClick={onClose}
                              className="mt-2 p-2 bg-neutral-50 hover:bg-neutral-100/90 rounded-xl border border-neutral-200/60 flex items-center gap-2.5 transition-all group"
                            >
                              {productImageSrc && (
                                <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0 border border-neutral-200/60">
                                  <OptimizedImage
                                    src={productImageSrc}
                                    alt={productTitle}
                                    containerClassName="w-full h-full"
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                  />
                                </div>
                              )}
                              <div className="min-w-0 flex-1">
                                <p className="text-[9px] uppercase tracking-wider text-neutral-400 font-bold">
                                  Product
                                </p>
                                <p className="text-[11.5px] font-bold text-neutral-800 truncate group-hover:text-[#283618] transition-colors">
                                  {productTitle}
                                </p>
                              </div>
                              <ArrowRight className="w-3.5 h-3.5 text-neutral-400 group-hover:text-black group-hover:translate-x-0.5 transition-all shrink-0" />
                            </Link>
                          )}
                        </div>
                      </div>
                    ) : (
                      /* Grid View in Mobile Drawer */
                      <div className="grid grid-cols-2 gap-2.5 pb-2">
                        {photos.map((item, idx) => (
                          <div
                            key={idx}
                            onClick={() => setActivePhotoIndex(idx)}
                            className="aspect-square rounded-2xl overflow-hidden border border-black/5 bg-neutral-50 shadow-3xs cursor-pointer relative group active:scale-[0.98] transition-transform"
                          >
                            <OptimizedImage
                              src={item.imgUrl}
                              alt={`Customer setup ${idx + 1}`}
                              containerClassName="w-full h-full"
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-transparent flex flex-col justify-between p-2">
                              <div className="self-end bg-black/50 backdrop-blur-xs text-white text-[9.5px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                                <Star className="w-2.5 h-2.5 fill-[#F7BB0E] text-[#F7BB0E]" />
                                <span>{item.review?.rating || 5}</span>
                              </div>
                              <div className="text-white text-[10px] font-bold truncate">
                                {item.review?.customer?.name ||
                                  item.review?.customerName ||
                                  'Customer'}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ) : (
              /* ─── Laptop / Desktop: Pop-up Modal Kind ─── */
              <motion.div
                key="desktop-modal"
                initial={{ opacity: 0, scale: 0.95, y: '-48%', x: '-50%' }}
                animate={{ opacity: 1, scale: 1, y: '-50%', x: '-50%' }}
                exit={{ opacity: 0, scale: 0.95, y: '-48%', x: '-50%' }}
                transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                className="fixed top-1/2 left-1/2 z-[1060] pointer-events-auto w-[92vw] max-w-4xl lg:max-w-5xl max-h-[86vh] flex flex-col bg-white/95 backdrop-blur-2xl rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.24)] border border-black/[0.08] overflow-hidden"
              >
                {/* Desktop Modal Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-black/[0.06] shrink-0">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-[#283618]/10 text-[#283618] flex items-center justify-center shrink-0">
                      <Camera className="w-4.5 h-4.5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h2 className="font-sans text-lg font-bold text-neutral-900 leading-tight">
                          Customer Gallery
                        </h2>
                        {photos.length > 0 && (
                          <span className="font-sans text-xs font-bold text-[#283618] bg-[#283618]/10 px-2.5 py-0.5 rounded-full">
                            {photos.length} {photos.length === 1 ? 'photo' : 'photos'}
                          </span>
                        )}
                      </div>
                      <p className="font-sans text-xs text-neutral-500 font-medium truncate max-w-md mt-0.5">
                        Real setup photos of{' '}
                        <span className="font-bold text-neutral-800">{productTitle}</span>
                      </p>
                    </div>
                  </div>

                  {/* Desktop Header Actions */}
                  <div className="flex items-center gap-3 shrink-0">
                    {photos.length > 1 && (
                      <div className="flex items-center p-0.5 bg-neutral-100 rounded-full border border-neutral-200/80">
                        <button
                          type="button"
                          onClick={() => setDesktopViewMode('focus')}
                          className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                            desktopViewMode === 'focus'
                              ? 'bg-[#283618] text-white shadow-2xs'
                              : 'text-neutral-600 hover:text-black'
                          }`}
                        >
                          <Maximize2 className="w-3.5 h-3.5" />
                          <span>Photo View</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setDesktopViewMode('grid')}
                          className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                            desktopViewMode === 'grid'
                              ? 'bg-[#283618] text-white shadow-2xs'
                              : 'text-neutral-600 hover:text-black'
                          }`}
                        >
                          <LayoutGrid className="w-3.5 h-3.5" />
                          <span>Grid View</span>
                        </button>
                      </div>
                    )}

                    {/* Close Button */}
                    <button
                      type="button"
                      onClick={onClose}
                      className="w-9 h-9 rounded-full bg-neutral-100 hover:bg-neutral-800 hover:text-white transition-all flex items-center justify-center text-neutral-700 cursor-pointer shadow-2xs"
                      aria-label="Close dialog"
                    >
                      <X className="w-4.5 h-4.5" strokeWidth={2.2} />
                    </button>
                  </div>
                </div>

                {/* Desktop Modal Content */}
                <div className="flex-1 overflow-hidden min-h-0">
                  {loading && photos.length === 0 ? (
                    <div className="h-[450px] flex flex-col items-center justify-center space-y-3">
                      <div className="w-12 h-12 rounded-full border-2 border-[#283618] border-t-transparent animate-spin" />
                      <p className="font-sans text-sm text-neutral-500 font-medium">
                        Loading gallery photos...
                      </p>
                    </div>
                  ) : photos.length === 0 ? (
                    <div className="py-20 text-center flex flex-col items-center justify-center">
                      <div className="w-16 h-16 rounded-full bg-neutral-100 flex items-center justify-center mb-4 text-neutral-400">
                        <Camera className="w-8 h-8" />
                      </div>
                      <h3 className="font-sans text-lg font-bold text-neutral-800">
                        No customer photos yet
                      </h3>
                      <p className="font-sans text-sm text-neutral-500 mt-1 max-w-sm">
                        Check back later or be the first to share your milestone setup photo!
                      </p>
                      <button
                        type="button"
                        onClick={onClose}
                        className="mt-5 px-6 py-2.5 rounded-full bg-[#283618] text-white text-xs uppercase tracking-wider font-bold shadow-sm hover:bg-[#1e2a12] transition-colors"
                      >
                        Close
                      </button>
                    </div>
                  ) : desktopViewMode === 'focus' && activePhoto ? (
                    /* Split View on Laptop/Desktop */
                    <div className="flex flex-col lg:flex-row h-full min-h-0">
                      {/* Left Column: Image Stage & Carousel */}
                      <div className="flex-1 bg-neutral-950 p-6 flex flex-col items-center justify-center relative min-h-0 overflow-hidden">
                        {/* Image Box */}
                        <div className="relative w-full flex-1 flex items-center justify-center min-h-0">
                          <OptimizedImage
                            src={activePhoto.imgUrl}
                            alt="Customer setup photo"
                            containerClassName="w-full h-full flex items-center justify-center"
                            className="max-h-[50vh] max-w-full object-contain rounded-xl"
                          />

                          {/* Counter badge */}
                          <div className="absolute top-0 left-0 bg-black/60 backdrop-blur-xs text-white text-xs font-bold px-3 py-1 rounded-full select-none">
                            Photo {activePhotoIndex + 1} of {photos.length}
                          </div>

                          {/* Chevron Nav Controls */}
                          {photos.length > 1 && (
                            <>
                              <button
                                type="button"
                                onClick={handlePrev}
                                className="absolute left-1 w-11 h-11 rounded-full bg-black/50 hover:bg-black/80 text-white flex items-center justify-center transition-all cursor-pointer shadow-lg"
                                aria-label="Previous photo"
                              >
                                <ChevronLeft className="w-6 h-6" />
                              </button>
                              <button
                                type="button"
                                onClick={handleNext}
                                className="absolute right-1 w-11 h-11 rounded-full bg-black/50 hover:bg-black/80 text-white flex items-center justify-center transition-all cursor-pointer shadow-lg"
                                aria-label="Next photo"
                              >
                                <ChevronRight className="w-6 h-6" />
                              </button>
                            </>
                          )}
                        </div>

                        {/* Desktop Thumbnail Strip */}
                        {photos.length > 1 && (
                          <div className="w-full pt-4 flex items-center justify-center gap-2 overflow-x-auto no-scrollbar shrink-0">
                            {photos.map((p, idx) => (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => setActivePhotoIndex(idx)}
                                className={`w-13 h-13 rounded-xl overflow-hidden shrink-0 border-2 transition-all cursor-pointer ${
                                  idx === activePhotoIndex
                                    ? 'border-[#283618] ring-2 ring-[#283618]/50 scale-105 shadow-md'
                                    : 'border-transparent opacity-50 hover:opacity-100'
                                }`}
                                aria-label={`Select photo ${idx + 1}`}
                              >
                                <img
                                  src={p.imgUrl}
                                  alt={`Thumb ${idx + 1}`}
                                  className="w-full h-full object-cover"
                                />
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Right Column: Review Details Sidebar */}
                      <div className="w-full lg:w-[380px] xl:w-[420px] bg-white p-6 overflow-y-auto space-y-4 shrink-0 border-t lg:border-t-0 lg:border-l border-black/[0.08]">
                        {/* Reviewer Meta Header */}
                        <div className="flex items-center justify-between pb-3 border-b border-black/[0.06]">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-9 h-9 rounded-full bg-[#283618]/10 border border-[#283618]/20 flex items-center justify-center shrink-0 shadow-inner">
                              <span className="font-display text-[#283618] text-xs font-bold">
                                {customerInitials}
                              </span>
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <h4 className="font-body text-sm font-bold text-neutral-900 truncate">
                                  {customerName}
                                </h4>
                                {activeReview?.verified && (
                                  <span
                                    title="Verified Purchase"
                                    className="inline-flex items-center gap-0.5 text-emerald-600 bg-emerald-50 text-[10px] font-bold px-1.5 py-0.2 rounded-full border border-emerald-200/50 shrink-0"
                                  >
                                    <BadgeCheck className="w-3 h-3" strokeWidth={2} />
                                    Verified
                                  </span>
                                )}
                              </div>
                              {reviewDate && (
                                <span className="font-sans text-[11px] text-neutral-400 font-medium block mt-0.5">
                                  {reviewDate}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Star Rating Badge */}
                          {activeReview?.rating > 0 && (
                            <div className="flex flex-col items-end gap-1 shrink-0">
                              <div className="flex items-center gap-1 px-2.5 py-1 bg-amber-50 rounded-full border border-amber-200/60">
                                <Star className="w-3.5 h-3.5 fill-[#F7BB0E] text-[#F7BB0E]" />
                                <span className="font-sans text-xs font-bold text-neutral-900">
                                  {Number(activeReview.rating).toFixed(1)}
                                </span>
                              </div>
                              <StarRating value={activeReview.rating} size={11} />
                            </div>
                          )}
                        </div>

                        {/* Review Title */}
                        {activeReview?.title && (
                          <h5 className="font-display text-base font-bold text-neutral-800 leading-snug">
                            {activeReview.title}
                          </h5>
                        )}

                        {/* Comment Quote */}
                        {activeReview?.comment && (
                          <div className="relative bg-neutral-50/70 p-4 rounded-2xl border border-black/5">
                            <Quote className="absolute top-2 left-2 text-neutral-200 w-5 h-5 -z-10 select-none pointer-events-none" />
                            <p className="font-body text-xs sm:text-[13px] text-neutral-700 leading-relaxed italic z-10 relative">
                              "{activeReview.comment}"
                            </p>
                          </div>
                        )}

                        {/* Associated Product Card */}
                        {productId && (
                          <div className="pt-2">
                            <p className="text-[10px] uppercase tracking-wider font-bold text-neutral-400 mb-2 font-label">
                              Reviewed Product
                            </p>
                            <Link
                              to={`/product/${productId}`}
                              onClick={onClose}
                              className="p-3 bg-neutral-50/80 hover:bg-neutral-100 rounded-2xl border border-neutral-200/70 flex items-center gap-3 transition-all group"
                            >
                              {productImageSrc && (
                                <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 border border-neutral-200/60">
                                  <OptimizedImage
                                    src={productImageSrc}
                                    alt={productTitle}
                                    containerClassName="w-full h-full"
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                  />
                                </div>
                              )}
                              <div className="min-w-0 flex-1">
                                <h6 className="text-xs font-bold text-neutral-800 truncate group-hover:text-[#283618] transition-colors">
                                  {productTitle}
                                </h6>
                              </div>
                              <div className="w-7 h-7 rounded-full bg-white shadow-2xs flex items-center justify-center group-hover:bg-[#283618] group-hover:text-white transition-colors shrink-0">
                                <ArrowRight className="w-3.5 h-3.5" strokeWidth={2} />
                              </div>
                            </Link>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    /* Grid View on Laptop/Desktop */
                    <div className="p-6 overflow-y-auto max-h-[72vh] no-scrollbar">
                      <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                        {photos.map((item, index) => (
                          <motion.div
                            key={index}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            whileHover={{ scale: 1.02, y: -2 }}
                            transition={{ duration: 0.18 }}
                            onClick={() => {
                              setActivePhotoIndex(index);
                              setDesktopViewMode('focus');
                            }}
                            className="aspect-square rounded-2xl overflow-hidden border border-black/5 bg-neutral-50 shadow-3xs cursor-pointer relative group"
                          >
                            <OptimizedImage
                              src={item.imgUrl}
                              alt={`Customer setup ${index + 1}`}
                              containerClassName="w-full h-full"
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            />
                            <div className="absolute inset-0 bg-black/35 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2.5">
                              <div className="self-end bg-black/60 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                                <Star className="w-3 h-3 fill-[#F7BB0E] text-[#F7BB0E]" />
                                <span>{item.review?.rating || 5}</span>
                              </div>
                              <div className="text-white text-[11px] font-bold truncate">
                                By{' '}
                                {item.review?.customer?.name ||
                                  item.review?.customerName ||
                                  'Customer'}
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
