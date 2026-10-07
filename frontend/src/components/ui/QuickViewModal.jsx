import { Star, ChevronLeft, ChevronRight, ArrowRight, X } from 'lucide-react';
import { m as motion, AnimatePresence } from 'framer-motion';
import { CloudinaryImage } from './CloudinaryImage';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWishlist } from '../../context/WishlistContext';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { createPortal } from 'react-dom';
import { useMobileDrawerEngine } from '../../hooks/useMobileDrawerEngine';
import { AuthCornerLeaves } from '../auth/AuthCornerLeaves';
import toast from 'react-hot-toast';

/**
 * QuickViewModal
 * Redesigned according to the AuthModal and FilterPanel drawer design system:
 * - Floating bottom sheet on mobile (<640px) with safe margin & gestures
 * - Floating centered modal card on desktop
 * - Signature Akula's Kitchen organic corner leaves decoration
 * - Frosted glassmorphism background (bg-white/95 backdrop-blur-2xl)
 * - Rounded-3xl corners with subtle black/[0.08] border and elevation shadow
 * - Mobile grab handle pill and top-right circular close button
 * - Balanced responsive image aspect ratio (no vertical cutoff on mobile)
 * - Bottom action bar with primary "Add to Bag", Wishlist heart & View Details
 */
export const QuickViewModal = ({ isOpen, onClose, product, onNext, onPrev, hasNext, hasPrev }) => {
  const [mounted, setMounted] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setIsConverting(false);
    setActiveIndex(0);
  }, [isOpen, product?._id, product?.id]);

  const productId = product?._id || product?.id;

  const handleConvertToDetails = useCallback(
    (e) => {
      e?.stopPropagation?.();
      if (isConverting || !product) return;
      setIsConverting(true);
      const targetRoute = `/product/${productId}`;

      setTimeout(() => {
        onClose();
        navigate(targetRoute, { state: { product, fromQuickView: true } });
      }, 220);
    },
    [isConverting, product, productId, onClose, navigate],
  );

  const { isMobile, dragProps, sheetTransition } = useMobileDrawerEngine({
    isOpen,
    onClose: isConverting ? undefined : onClose,
    onExpand: handleConvertToDetails,
    expandThreshold: -40,
  });

  const modalRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const detailsScrollRef = useRef(null);
  const touchStartPos = useRef({ x: null, y: null });
  const touchEndPos = useRef({ x: null, y: null });
  const touchStartTarget = useRef(null);

  const { toggleItem, isWishlisted } = useWishlist();
  const { addItem } = useCart();
  const { runProtectedAction } = useAuth();

  const wishlisted = isWishlisted(productId);

  const handleWishlist = (e) => {
    e?.stopPropagation();
    if (!product) return;
    runProtectedAction(() => {
      toggleItem(product);
    });
  };

  const handleAddToCart = (e) => {
    e?.stopPropagation();
    if (!product) return;
    if (product.optionGroups && product.optionGroups.length > 0) {
      handleConvertToDetails(e);
      return;
    }
    addItem({
      id: product._id || product.id,
      title: product.title,
      price: product.price,
      imageSrc: product.imageSrc,
      quantity: 1,
      variant: 'Default',
    });
    onClose();
    toast.success('Added to Bag!');
  };

  const handleViewDetails = (e) => {
    handleConvertToDetails(e);
  };

  const onTouchStart = (e) => {
    const t = e.targetTouches[0];
    touchStartPos.current = { x: t.clientX, y: t.clientY };
    touchEndPos.current = { x: t.clientX, y: t.clientY };
    touchStartTarget.current = e.target;
  };

  const onTouchMove = (e) => {
    const t = e.targetTouches[0];
    touchEndPos.current = { x: t.clientX, y: t.clientY };
  };

  const onTouchEndHandler = () => {
    const start = touchStartPos.current;
    const end = touchEndPos.current;
    if (start.x === null || end.y === null) return;

    const deltaX = start.x - end.x;
    const deltaY = start.y - end.y;

    // Detect prominent swipe UP (scrolling up / pulling up on touch screen)
    if (deltaY > 45 && Math.abs(deltaY) > Math.abs(deltaX) * 1.1) {
      const el = detailsScrollRef.current;
      if (el && touchStartTarget.current && el.contains(touchStartTarget.current)) {
        const canScrollDown = el.scrollTop + el.clientHeight < el.scrollHeight - 15;
        if (canScrollDown) return;
      }
      handleConvertToDetails();
      return;
    }

    // Horizontal swipe for next / prev products
    const isLeftSwipe = deltaX > 50 && Math.abs(deltaX) > Math.abs(deltaY);
    const isRightSwipe = deltaX < -50 && Math.abs(deltaX) > Math.abs(deltaY);

    if (isLeftSwipe && onNext) {
      onNext();
    }
    if (isRightSwipe && onPrev) {
      onPrev();
    }
  };

  const handleWheel = (e) => {
    if (isConverting) return;
    const el = detailsScrollRef.current;
    if (el && el.contains(e.target)) {
      const canScrollDown = el.scrollTop + el.clientHeight < el.scrollHeight - 15;
      if (canScrollDown) return;
    }
    if (e.deltaY > 35) {
      handleConvertToDetails(e);
    }
  };

  const handleScroll = (e) => {
    if (!e.target) return;
    const scrollLeft = e.target.scrollLeft;
    const width = e.target.offsetWidth;
    if (width > 0) {
      const newIndex = Math.round(scrollLeft / width);
      if (newIndex !== activeIndex) {
        setActiveIndex(newIndex);
      }
    }
  };

  // Keyboard accessibility
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen) return;
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowRight' && onNext && hasNext !== false) {
        onNext();
      } else if (e.key === 'ArrowLeft' && onPrev && hasPrev !== false) {
        onPrev();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, onClose, onNext, onPrev, hasNext, hasPrev]);

  if (!mounted || !product) return null;

  const images =
    product.images && product.images.length > 0
      ? product.images
      : [product.imageSrc].filter(Boolean);

  const discountPercent =
    product.oldPrice && product.oldPrice > product.price
      ? Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100)
      : 0;

  const modalVariants = {
    hidden: isMobile ? { y: '100%', opacity: 0.5 } : { opacity: 0, scale: 0.95, y: 15 },
    visible: {
      y: 0,
      opacity: 1,
      scale: 1,
      transition: isMobile ? sheetTransition : { duration: 0.35, ease: [0.16, 1, 0.3, 1] },
    },
    exit: isMobile
      ? {
          y: '100%',
          opacity: 0,
          transition: sheetTransition,
        }
      : { opacity: 0, scale: 0.95, y: 10, transition: { duration: 0.25 } },
  };

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-[9999] pointer-events-none flex items-end sm:items-center justify-center p-3 sm:p-5 md:p-6 lg:p-8"
          role="dialog"
          aria-modal="true"
          aria-labelledby="quickview-title"
        >
          {/* Backdrop matching AuthModal & FilterPanel */}
          <motion.div
            key="quickview-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={isConverting ? undefined : onClose}
            className={`fixed inset-0 pointer-events-auto transition-colors duration-200 ${
              isConverting ? 'bg-surface' : 'bg-black/40 backdrop-blur-xs cursor-pointer'
            }`}
          />

          {/* Floating Card Modal / Bottom Sheet */}
          <motion.div
            ref={modalRef}
            key="quickview-card"
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            {...(!isConverting && isMobile ? dragProps : {})}
            onClick={(e) => e.stopPropagation()}
            onWheel={handleWheel}
            className={`relative z-10 pointer-events-auto flex flex-col w-full max-w-[460px] sm:max-w-[500px] lg:max-w-4xl mx-auto transition-all duration-200 ${
              isConverting
                ? '!fixed !inset-0 !z-[10000] !max-w-none !max-h-none !h-screen !rounded-none !m-0 !p-0 shadow-none'
                : ''
            }`}
            style={{
              marginBottom:
                isMobile && !isConverting ? 'env(safe-area-inset-bottom, 0px)' : undefined,
            }}
          >
            <div className="relative w-full bg-white/95 backdrop-blur-2xl rounded-3xl p-3.5 sm:p-5 lg:p-7 shadow-[0_16px_50px_rgba(0,0,0,0.18)] border border-black/[0.08] flex flex-col max-h-[88dvh] sm:max-h-[90vh] overflow-hidden">
              {/* Atmospheric Corner Leaves matching AuthModal */}
              <AuthCornerLeaves />

              {/* Top conversion progress bar */}
              {isConverting && (
                <div className="absolute inset-x-0 top-0 z-[100] h-1 bg-[#283618]/20 overflow-hidden">
                  <motion.div
                    initial={{ x: '-100%' }}
                    animate={{ x: '0%' }}
                    transition={{ duration: 0.22, ease: 'easeOut' }}
                    className="h-full w-full bg-[#283618]"
                  />
                </div>
              )}

              {/* Grab handle for mobile bottom sheet */}
              <div
                className="sm:hidden w-full flex justify-center pt-0 pb-2 cursor-grab select-none z-20"
                onClick={onClose}
              >
                <div className="w-10 h-1 rounded-full bg-neutral-300" />
              </div>

              {/* Close Button matching AuthModal & FilterPanel */}
              <button
                onClick={onClose}
                className="absolute top-3 right-3 sm:top-4 sm:right-4 lg:top-5 lg:right-5 w-8.5 h-8.5 rounded-full bg-neutral-100 hover:bg-neutral-200 active:scale-95 flex items-center justify-center text-neutral-700 hover:text-black transition-all z-40 cursor-pointer shadow-2xs"
                aria-label="Close product quick view"
              >
                <X className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-black" strokeWidth={2.2} />
              </button>

              {/* Scrollable Core Content Area */}
              <div
                ref={detailsScrollRef}
                className="relative z-10 flex-1 overflow-y-auto overscroll-contain touch-pan-y no-scrollbar flex flex-col lg:flex-row gap-4 lg:gap-7"
                onTouchStart={onTouchStart}
                onTouchMove={onTouchMove}
                onTouchEnd={onTouchEndHandler}
              >
                {/* ── Left Column: Media Presentation ────────────────── */}
                <div className="w-full lg:w-1/2 shrink-0 flex flex-col gap-2.5">
                  <div className="relative bg-neutral-100 rounded-2xl overflow-hidden aspect-[16/11] sm:aspect-[4/3] lg:aspect-square w-full border border-black/[0.06] shadow-2xs shrink-0 group">
                    {/* Carousel Container */}
                    <div
                      ref={scrollContainerRef}
                      onScroll={handleScroll}
                      className="flex w-full h-full overflow-x-auto snap-x snap-mandatory no-scrollbar scroll-smooth"
                    >
                      {images.map((img, idx) => (
                        <div key={idx} className="w-full h-full flex-shrink-0 snap-center relative">
                          <CloudinaryImage
                            src={img}
                            alt={`${product.title} - view ${idx + 1}`}
                            className="w-full h-full object-cover"
                            containerClassName="w-full h-full"
                            loading={idx === 0 ? 'eager' : 'lazy'}
                            width={600}
                            height={600}
                            sizes="(max-width: 768px) 100vw, 50vw"
                          />
                        </div>
                      ))}
                    </div>

                    {/* Rating Badge top-left of image */}
                    {(product.reviews > 0 || product.rating > 0) && (
                      <div className="absolute top-2.5 left-2.5 z-20 flex items-center gap-1 bg-white/90 backdrop-blur-md px-2.5 py-1 rounded-full shadow-xs border border-black/5">
                        <Star className="w-3 h-3 text-amber-500 fill-amber-400" />
                        <span className="font-sans text-[11px] font-bold text-neutral-900">
                          {Number(product.rating || 0).toFixed(1)}
                        </span>
                        <span className="text-neutral-400 text-[10px]">·</span>
                        <span className="text-neutral-500 text-[10px] font-medium">
                          {product.reviews || 0}
                        </span>
                      </div>
                    )}

                    {/* Navigation Buttons for Carousel */}
                    {images.length > 1 && (
                      <>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (scrollContainerRef.current) {
                              const newIdx = Math.max(0, activeIndex - 1);
                              scrollContainerRef.current.scrollTo({
                                left: newIdx * scrollContainerRef.current.clientWidth,
                                behavior: 'smooth',
                              });
                            }
                          }}
                          className={`absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/85 backdrop-blur-md flex items-center justify-center text-neutral-800 shadow-sm border border-black/5 hover:bg-white transition-all z-20 cursor-pointer ${
                            activeIndex === 0
                              ? 'opacity-40 pointer-events-none'
                              : 'opacity-90 hover:opacity-100'
                          }`}
                          aria-label="Previous image"
                        >
                          <ChevronLeft className="w-4 h-4" strokeWidth={2} />
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (scrollContainerRef.current) {
                              const newIdx = Math.min(images.length - 1, activeIndex + 1);
                              scrollContainerRef.current.scrollTo({
                                left: newIdx * scrollContainerRef.current.clientWidth,
                                behavior: 'smooth',
                              });
                            }
                          }}
                          className={`absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/85 backdrop-blur-md flex items-center justify-center text-neutral-800 shadow-sm border border-black/5 hover:bg-white transition-all z-20 cursor-pointer ${
                            activeIndex === images.length - 1
                              ? 'opacity-40 pointer-events-none'
                              : 'opacity-90 hover:opacity-100'
                          }`}
                          aria-label="Next image"
                        >
                          <ChevronRight className="w-4 h-4" strokeWidth={2} />
                        </button>
                      </>
                    )}

                    {/* Pagination Dots */}
                    {images.length > 1 && (
                      <div className="absolute bottom-2.5 inset-x-0 flex justify-center gap-1.5 z-20 pointer-events-none">
                        {images.map((_, idx) => (
                          <div
                            key={idx}
                            className={`rounded-full transition-all duration-300 shadow-xs ${
                              idx === activeIndex ? 'w-4 h-1.5 bg-white' : 'w-1.5 h-1.5 bg-white/60'
                            }`}
                          />
                        ))}
                      </div>
                    )}

                    {/* Wishlist toggle heart button on image bottom-right */}
                    <button
                      type="button"
                      onClick={handleWishlist}
                      className="absolute bottom-2.5 right-2.5 w-8 h-8 rounded-full bg-white/90 backdrop-blur-md flex items-center justify-center shadow-sm border border-black/5 hover:scale-110 active:scale-95 transition-all z-20 cursor-pointer"
                      aria-label={wishlisted ? 'Saved' : 'Save to Wishlist'}
                      title={wishlisted ? 'Saved' : 'Save'}
                    >
                      <motion.span
                        animate={{
                          scale: wishlisted ? [1, 1.3, 1] : 1,
                          color: wishlisted ? '#dc2626' : '#262626',
                        }}
                        className="material-symbols-outlined text-[17px]"
                        style={{ fontVariationSettings: wishlisted ? "'FILL' 1" : "'FILL' 0" }}
                      >
                        favorite
                      </motion.span>
                    </button>
                  </div>

                  {/* Thumbnail Strip (Desktop) */}
                  {images.length > 1 && (
                    <div className="hidden lg:flex gap-2 overflow-x-auto no-scrollbar py-0.5">
                      {images.map((img, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            if (scrollContainerRef.current) {
                              scrollContainerRef.current.scrollTo({
                                left: idx * scrollContainerRef.current.clientWidth,
                                behavior: 'smooth',
                              });
                            }
                          }}
                          className={`w-12 h-12 rounded-xl overflow-hidden border transition-all cursor-pointer shrink-0 ${
                            idx === activeIndex
                              ? 'border-[#283618] ring-2 ring-[#283618]/20 shadow-xs'
                              : 'border-black/10 opacity-70 hover:opacity-100'
                          }`}
                        >
                          <CloudinaryImage
                            src={img}
                            alt=""
                            className="w-full h-full object-cover"
                            containerClassName="w-full h-full"
                            width={100}
                            height={100}
                          />
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* ── Right Column: Information & Details ────────────── */}
                <div className="w-full lg:w-1/2 flex flex-col justify-between min-w-0">
                  <div className="space-y-2.5">
                    {/* Telugu Title Subtitle */}
                    {(product.teluguTitle || product.nameTE || product.teluguName) && (
                      <span className="block font-label text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-neutral-400 leading-tight">
                        {product.teluguTitle || product.nameTE || product.teluguName}
                      </span>
                    )}

                    {/* Main Title */}
                    <h2
                      id="quickview-title"
                      onClick={handleViewDetails}
                      className="font-serif-heading text-[18px] sm:text-[21px] lg:text-[24px] font-bold text-neutral-950 leading-snug tracking-tight hover:text-[#283618] transition-colors cursor-pointer"
                      style={{ fontFamily: 'var(--font-display)' }}
                      title="Click to view full product details"
                    >
                      {product.title}
                    </h2>

                    {/* Price Block */}
                    <div className="flex items-baseline gap-2.5 flex-wrap">
                      <span className="text-[22px] sm:text-[25px] font-bold text-neutral-950 lining-nums">
                        ₹{product.price?.toLocaleString('en-IN') || '0'}
                      </span>
                      {product.oldPrice && product.oldPrice > product.price && (
                        <>
                          <span className="text-[14px] sm:text-[15px] text-neutral-400 line-through lining-nums">
                            ₹{product.oldPrice.toLocaleString('en-IN')}
                          </span>
                          <span className="text-[10.5px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200/60">
                            {discountPercent}% OFF
                          </span>
                        </>
                      )}
                    </div>

                    {/* Trust Badges */}
                    <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                      <span className="inline-flex items-center gap-1 bg-neutral-100/90 border border-neutral-200/60 text-neutral-700 px-2.5 py-1 rounded-full text-[10.5px] font-semibold">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        Fresh Daily
                      </span>
                      <span className="inline-flex items-center gap-1 bg-neutral-100/90 border border-neutral-200/60 text-neutral-700 px-2.5 py-1 rounded-full text-[10.5px] font-semibold">
                        100% Homemade
                      </span>
                      <span className="inline-flex items-center gap-1 bg-neutral-100/90 border border-neutral-200/60 text-neutral-700 px-2.5 py-1 rounded-full text-[10.5px] font-semibold">
                        Pure Ingredients
                      </span>
                    </div>

                    {/* Affordance bar for full details */}
                    <div
                      onClick={handleConvertToDetails}
                      className="w-full my-2 p-2.5 sm:p-3 rounded-2xl bg-neutral-50/80 hover:bg-neutral-100/80 border border-black/[0.06] flex items-center justify-between transition-all cursor-pointer group shadow-2xs select-none"
                      title="Tap for full product details and reviews"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-7 h-7 rounded-full bg-[#283618]/10 text-[#283618] flex items-center justify-center shrink-0">
                          <motion.span
                            animate={{ y: [0, -2, 0] }}
                            transition={{ repeat: Infinity, duration: 1.4, ease: 'easeInOut' }}
                            className="material-symbols-outlined text-[16px]"
                          >
                            keyboard_double_arrow_up
                          </motion.span>
                        </div>
                        <div className="flex flex-col text-left min-w-0">
                          <span className="font-sans text-[11px] sm:text-[11.5px] font-bold text-neutral-900 tracking-wide uppercase truncate">
                            View Complete Details
                          </span>
                          <span className="text-[10px] text-neutral-500 font-normal truncate">
                            Nutritional specs, reviews & options
                          </span>
                        </div>
                      </div>
                      <ArrowRight
                        className="w-3.5 h-3.5 text-neutral-400 group-hover:translate-x-1 group-hover:text-[#283618] transition-all shrink-0 ml-2"
                        strokeWidth={2}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Bottom Action Bar matching FilterPanel & AuthModal ── */}
              <div className="relative z-20 mt-3 pt-3 border-t border-black/[0.06] flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={handleAddToCart}
                  className="flex-1 bg-[#283618] hover:bg-[#1f2b13] active:scale-[0.98] text-white py-3.5 px-4 rounded-full font-sans text-[12px] sm:text-[12.5px] uppercase tracking-wider font-bold shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {product?.optionGroups?.length > 0 ? 'tune' : 'shopping_bag'}
                  </span>
                  <span>
                    {product?.optionGroups?.length > 0
                      ? 'Choose Options'
                      : `Add to Bag • ₹${product.price?.toLocaleString('en-IN') || 0}`}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={handleWishlist}
                  className="w-11 h-11 shrink-0 rounded-full border border-black/[0.1] bg-white hover:bg-neutral-50 active:scale-95 flex items-center justify-center transition-all cursor-pointer shadow-2xs"
                  aria-label={wishlisted ? 'Saved to Wishlist' : 'Save to Wishlist'}
                  title={wishlisted ? 'Saved' : 'Save'}
                >
                  <motion.span
                    animate={{
                      scale: wishlisted ? [1, 1.25, 1] : 1,
                      color: wishlisted ? '#dc2626' : '#262626',
                    }}
                    className="material-symbols-outlined text-[20px]"
                    style={{ fontVariationSettings: wishlisted ? "'FILL' 1" : "'FILL' 0" }}
                  >
                    favorite
                  </motion.span>
                </button>

                <button
                  type="button"
                  onClick={handleViewDetails}
                  className="w-11 h-11 shrink-0 rounded-full border border-black/[0.1] bg-white hover:bg-neutral-50 active:scale-95 flex items-center justify-center transition-all cursor-pointer shadow-2xs text-neutral-800 hover:text-black"
                  aria-label="View Full Details"
                  title="Full Details"
                >
                  <ArrowRight className="w-4 h-4" strokeWidth={2.2} />
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
};
