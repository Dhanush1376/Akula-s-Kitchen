import { ArrowLeft, UtensilsCrossed, X, Heart } from 'lucide-react';
import { OptimizedImage } from './OptimizedImage';
import { ShareButton } from './ShareButton';
import { m as motion, AnimatePresence } from 'framer-motion';
import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useWishlist } from '../../context/WishlistContext';
import { useScrollLock } from '../../hooks/useScrollLock';
import { DrawerDragHandle, useMobileDrawerEngine } from './drawer';

const RecommendationSystem = React.lazy(() =>
  import('../sections/RecommendationSystem').then((m) => ({ default: m.RecommendationSystem })),
);

export function ProductGallery({ images = [], product }) {
  const { toggleItem, isWishlisted } = useWishlist();
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [isSimilarOpen, setIsSimilarOpen] = useState(false);

  const { dragProps, sheetTransition } = useMobileDrawerEngine({
    isOpen: isSimilarOpen,
    onClose: () => setIsSimilarOpen(false),
  });

  const oldPrice =
    product?.strikingPrice || product?.oldPrice || product?.originalPrice || product?.mrp || 0;
  const discount =
    oldPrice > 0 && product?.price ? Math.round(((oldPrice - product.price) / oldPrice) * 100) : 0;
  const wishlisted = Boolean(product && isWishlisted(product._id || product.id));
  const scrollRef = useRef(null);
  const lightboxScrollRef = useRef(null);
  const navigate = useNavigate();

  useScrollLock(isLightboxOpen || isSimilarOpen);

  useEffect(() => {
    if (isLightboxOpen) {
      document.body.classList.add('slideshow-active');
    } else {
      document.body.classList.remove('slideshow-active');
    }
    return () => {
      document.body.classList.remove('slideshow-active');
    };
  }, [isLightboxOpen]);

  const openLightbox = (idx) => {
    setSelectedIdx(idx);
    setIsLightboxOpen(true);
    setTimeout(() => {
      if (lightboxScrollRef.current) {
        lightboxScrollRef.current.scrollTo({
          left: idx * lightboxScrollRef.current.clientWidth,
          behavior: 'instant',
        });
      }
    }, 10);
  };

  const handleBack = (e) => {
    e.preventDefault();
    e.stopPropagation();

    // Animate the entire page sliding off to the right
    const rootEl = document.getElementById('root');
    if (rootEl) {
      rootEl.style.transition =
        'transform 0.35s cubic-bezier(0.32, 0.72, 0, 1), opacity 0.35s ease';
      rootEl.style.transform = 'translateX(100vw)';
      rootEl.style.opacity = '0';
    }

    // Wait for the slide out animation to finish before routing
    setTimeout(() => {
      // Clean up styles so the next page renders normally
      if (rootEl) {
        rootEl.style.transition = '';
        rootEl.style.transform = '';
        rootEl.style.opacity = '';
      }

      if (window.history.state && window.history.state.idx > 0) {
        navigate(-1);
      } else {
        navigate('/collections');
        // Force scroll reset on fallback
        window.scrollTo(0, 0);
      }
    }, 350);
  };

  const handleThumbnailClick = (idx) => {
    setSelectedIdx(idx);
    if (scrollRef.current) {
      const width = scrollRef.current.clientWidth;
      scrollRef.current.scrollTo({
        left: idx * width,
        behavior: 'smooth',
      });
    }
  };

  const handleScroll = (e) => {
    const scrollLeft = e.currentTarget.scrollLeft;
    const width = e.currentTarget.clientWidth;
    if (!width) return;
    const currentSlide = Math.round(scrollLeft / width);
    if (currentSlide !== selectedIdx && currentSlide >= 0 && currentSlide < images.length) {
      setSelectedIdx(currentSlide);
    }
  };

  return (
    <div className="flex flex-col-reverse lg:flex-row gap-4 lg:gap-6 items-start w-full select-none relative">
      {/* Thumbnail Strip */}
      <div
        className="w-full lg:w-[85px] flex lg:flex-col gap-3 sm:gap-4 overflow-x-auto lg:overflow-y-auto no-scrollbar py-2 sm:py-3 px-1 md:px-2 lg:px-3 items-center"
        style={{ scrollbarWidth: 'none' }}
      >
        {images.map((img, idx) => (
          <button
            key={idx}
            onClick={() => handleThumbnailClick(idx)}
            className={`shrink-0 w-12 sm:w-14 lg:w-16 lg:w-[60px] aspect-square rounded-[14px] sm:rounded-[16px] overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] relative group cursor-pointer ${
              selectedIdx === idx
                ? 'scale-[1.12] z-10 opacity-100'
                : 'scale-[0.92] opacity-50 hover:opacity-85 hover:scale-100'
            }`}
          >
            <OptimizedImage
              src={img}
              alt={`Thumbnail ${idx + 1}`}
              containerClassName="w-full h-full"
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 pointer-events-none rounded-[14px] sm:rounded-[16px]"
              width={100}
              height={100}
            />
          </button>
        ))}
      </div>

      {/* Main Image Viewport - Native continuous horizontal scroll enabled */}
      <div className="flex-1 w-full relative aspect-square max-h-[580px] rounded-2xl sm:rounded-3xl overflow-hidden bg-[#fafafa] group border-0 shadow-none">
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="w-full h-full flex overflow-x-auto snap-x snap-mandatory relative"
          style={{ scrollbarWidth: 'none' }}
        >
          {images.map((img, idx) => (
            <div
              key={idx}
              onClick={() => openLightbox(idx)}
              className="w-full h-full shrink-0 snap-center relative overflow-hidden bg-white flex items-center justify-center cursor-zoom-in"
            >
              <OptimizedImage
                src={img}
                alt={`Product Primary View ${idx + 1}`}
                containerClassName="w-full h-full"
                className="w-full h-full object-cover origin-center select-none transition-transform duration-500"
                width={800}
                height={800}
              />
            </div>
          ))}
        </div>

        {/* Gallery Interaction Overlays */}

        {/* Mobile Back Arrow Overlay */}
        <button
          onClick={handleBack}
          className="flex lg:hidden absolute top-3.5 left-3.5 z-20 items-center justify-center w-9 h-9 min-h-0 min-w-0 p-0 aspect-square rounded-full bg-white/95 backdrop-blur-xs shadow-sm border border-black/10 active:scale-90 transition-all text-black outline-none focus:outline-none cursor-pointer"
          aria-label="Go back"
        >
          <ArrowLeft className="w-4 h-4 text-black" strokeWidth={2.2} />
        </button>

        {/* Floating Discount Badge (Desktop) */}
        {discount > 0 && (
          <span className="hidden lg:inline-flex absolute top-3.5 left-3.5 z-20 items-center px-3 py-1 rounded-full bg-white/95 backdrop-blur-xs text-neutral-950 font-extrabold text-[11px] border border-black/10 shadow-xs select-none">
            {discount}% OFF
          </span>
        )}

        {/* Floating Action Buttons (Wishlist & Share) */}
        {product && (
          <div className="absolute top-3.5 right-3.5 z-20 flex items-center gap-2 pointer-events-auto">
            <button
              onClick={() =>
                toggleItem({
                  id: product._id || product.id,
                  title: product.title,
                  price: product.price,
                  imageSrc: product.imageSrc || product.image,
                })
              }
              className="flex items-center justify-center w-9 h-9 min-h-0 min-w-0 p-0 aspect-square rounded-full bg-white/95 backdrop-blur-xs shadow-sm border border-black/10 active:scale-90 hover:scale-110 transition-all text-black cursor-pointer"
              aria-label={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
            >
              <motion.span
                animate={{
                  scale: wishlisted ? [1, 1.3, 1] : 1,
                  color: wishlisted ? '#ff2d55' : '#000000',
                }}
                className="inline-flex items-center justify-center"
              >
                <Heart size={16} strokeWidth={2.2} fill={wishlisted ? '#ff2d55' : 'none'} />
              </motion.span>
            </button>
            <ShareButton
              url={
                typeof window !== 'undefined'
                  ? `${window.location.origin}/product/${product.slug || product._id || product.id}`
                  : ''
              }
              title={product.title}
              variant="custom"
              size="custom"
              iconOnly={true}
              className="w-9 h-9 min-h-0 min-w-0 p-0 aspect-square rounded-full bg-white/95 backdrop-blur-xs shadow-sm border border-black/10 flex items-center justify-center active:scale-90 hover:scale-110 transition-all text-black cursor-pointer"
            />
          </div>
        )}

        {/* View Similar Button */}
        {product && (
          <button
            onClick={() => setIsSimilarOpen(true)}
            className="absolute bottom-3.5 left-3.5 z-20 flex items-center justify-center w-9 h-9 min-h-0 min-w-0 p-0 aspect-square rounded-full bg-white/95 backdrop-blur-xs shadow-sm border border-black/10 active:scale-90 hover:scale-110 transition-all text-black pointer-events-auto cursor-pointer"
            title="View Similar Delights"
          >
            <UtensilsCrossed className="w-4 h-4 text-black" strokeWidth={1.8} />
          </button>
        )}

        {/* Shimmer Effect on hover */}
        <div className="absolute inset-0 bg-gradient-to-tr from-white/10 via-transparent to-white/5 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
      </div>

      {/* Fullscreen Lightbox - Clean White Design */}
      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {isLightboxOpen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="fixed inset-0 z-[99999] flex flex-col touch-none bg-white"
                onClick={() => setIsLightboxOpen(false)}
              >
                {/* Top Controls Bar */}
                <div
                  className="flex justify-between items-center px-5 py-4 z-10 shrink-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  <span className="text-neutral-500 font-label-sm text-[11px] lg:text-[13px] uppercase tracking-[0.4em] font-bold select-none">
                    {selectedIdx + 1} / {images.length}
                  </span>
                  <button
                    onClick={() => setIsLightboxOpen(false)}
                    className="w-10 h-10 rounded-full bg-black/5 text-black hover:bg-black/10 flex items-center justify-center transition-all duration-200 cursor-pointer"
                    aria-label="Close lightbox"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <line x1="18" y1="6" x2="6" y2="18"></line>
                      <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                  </button>
                </div>

                {/* Image Viewport - Centered with whitespace */}
                <div
                  ref={lightboxScrollRef}
                  onScroll={handleScroll}
                  className="flex-1 w-full flex overflow-x-auto snap-x snap-mandatory items-center min-h-0"
                  style={{ scrollbarWidth: 'none' }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {images.map((img, idx) => (
                    <div
                      key={idx}
                      className="w-full h-full shrink-0 snap-center flex items-center justify-center p-2 sm:p-4 lg:p-6"
                    >
                      <OptimizedImage
                        src={img}
                        alt={`Lightbox view ${idx + 1}`}
                        className="max-w-full max-h-full object-contain rounded-2xl sm:rounded-3xl overflow-hidden shadow-sm"
                        containerClassName="w-full h-full flex items-center justify-center overflow-hidden rounded-2xl sm:rounded-3xl"
                        aspectRatio="auto"
                        width={1600}
                        height={1600}
                      />
                    </div>
                  ))}
                </div>

                {/* Bottom Thumbnail Strip */}
                <div
                  className="w-full pb-[max(16px,var(--safe-area-bottom,_env(safe-area-inset-bottom)))] pt-3 px-4 flex gap-3 overflow-x-auto no-scrollbar justify-center items-center shrink-0 z-10"
                  onClick={(e) => e.stopPropagation()}
                >
                  {images.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setSelectedIdx(idx);
                        if (lightboxScrollRef.current) {
                          lightboxScrollRef.current.scrollTo({
                            left: idx * lightboxScrollRef.current.clientWidth,
                            behavior: 'smooth',
                          });
                        }
                      }}
                      className={`shrink-0 w-12 sm:w-14 lg:w-16 lg:w-[60px] aspect-square rounded-[14px] sm:rounded-[16px] overflow-hidden relative transition-all duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] snap-center outline-none group cursor-pointer ${
                        selectedIdx === idx
                          ? 'scale-[1.12] z-10 opacity-100'
                          : 'scale-[0.92] opacity-50 hover:opacity-85 hover:scale-100'
                      }`}
                    >
                      <OptimizedImage
                        src={img}
                        alt={`Thumbnail ${idx + 1}`}
                        containerClassName="w-full h-full"
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 pointer-events-none rounded-[14px] sm:rounded-[16px]"
                        width={100}
                        height={100}
                      />
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body,
        )}

      {/* Global Similar Items Bottom Drawer Overlay */}
      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {isSimilarOpen && (
              <div className="fixed inset-0 z-[100000] pointer-events-none">
                {/* Backdrop */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setIsSimilarOpen(false)}
                  className="fixed inset-0 bg-black/40 backdrop-blur-xs pointer-events-auto"
                />

                {/* Bottom Sheet Floating Shell */}
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
                  <div className="relative w-full bg-white/95 backdrop-blur-2xl rounded-3xl pt-2 px-5 pb-5 shadow-[0_12px_45px_rgba(0,0,0,0.18)] flex flex-col max-h-[82dvh] overflow-hidden border border-black/[0.08]">
                    {/* Handlebar for bottom sheet feel - moved right to the top rim */}
                    <div
                      className="w-full flex justify-center pt-1 pb-2 cursor-grab select-none"
                      onClick={() => setIsSimilarOpen(false)}
                    >
                      <div className="w-9 h-1 rounded-full bg-neutral-300" />
                    </div>

                    {/* Circular close button */}
                    <button
                      onClick={() => setIsSimilarOpen(false)}
                      className="absolute top-3.5 right-3.5 w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 active:scale-95 flex items-center justify-center text-neutral-700 hover:text-black transition-all z-10 cursor-pointer"
                      aria-label="Close similar delights"
                    >
                      <X className="w-3.5 h-3.5 text-black" strokeWidth={2} />
                    </button>

                    {/* Header */}
                    <div className="flex items-center justify-between pb-3 pr-10 border-b border-black/[0.06]">
                      <h3 className="font-sans text-[13px] font-bold uppercase tracking-wider text-neutral-900">
                        Similar Delights
                      </h3>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto overscroll-contain touch-pan-y no-scrollbar pt-3">
                      <React.Suspense
                        fallback={
                          <div className="h-44 flex items-center justify-center text-sm text-neutral-500">
                            Discovering...
                          </div>
                        }
                      >
                        <RecommendationSystem
                          category={product.category}
                          currentProductId={product._id || product.id}
                          compact={true}
                          horizontalScroll={true}
                          hideHeader={true}
                        />
                      </React.Suspense>
                    </div>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </div>
  );
}
