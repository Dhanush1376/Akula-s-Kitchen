import { Check, ImageOff, Heart, Plus, Ban, SlidersHorizontal } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { CloudinaryImage } from '../ui/CloudinaryImage';
import { useLongPress } from '../../hooks/useLongPress';
import React, { useState } from 'react';
import { useWishlistState, useWishlistDispatch } from '../../context/WishlistContext';
import { useCartDispatch } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { prefetchManager } from '../../utils/performance/prefetchManager';
import { parseNumericPrice, formatPrice } from '../../utils/ecommerce/priceUtils';
import { getProductRoute } from '../../utils/ecommerce/productRouteUtils';
import { DynamicRatingBadge } from '../ui/DynamicRatingBadge';
import { useQuickView } from '../../context/QuickViewContext';
import { ProductConfiguratorModal } from '../products/ProductConfiguratorModal';

const isValidMediaUrl = (url) => {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (!trimmed || trimmed === 'undefined' || trimmed === 'null') return false;
  return true;
};

const resolveCategoryName = (primaryCat, cat) => {
  const p = typeof primaryCat === 'object' && primaryCat !== null ? primaryCat?.name : primaryCat;
  const c = typeof cat === 'object' && cat !== null ? cat?.name : cat;
  const res = p || c;
  if (
    !res ||
    (typeof res === 'string' && (res.toLowerCase() === 'category' || /^[a-fA-F0-9]{24}$/.test(res)))
  ) {
    return 'General';
  }
  return typeof res === 'string' ? res.replace(/-/g, ' ') : res;
};

export const ProductCard = React.memo(function ProductCard({
  id,
  _id,
  title,
  teluguTitle,
  nameTE,
  teluguName,
  price,
  oldPrice,
  rating = 0,
  reviews = 0,
  imageSrc,
  hoverImage,
  gallery,
  images, // Backend returns 'images', fallback to gallery
  category,
  primaryCategory,
  secondaryCategories,
  badges = [],
  onQuickView,
  hideDetails = false,
  loading = false,
  eager = false,
  sizes = '(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 320px',
  compact = false,
  isNonRefundable = false,
  strikingPrice,
  stock,
  optionGroups = [],
  selectionMode = false,
  isSelected = false,
  isRectangular = false,
}) {
  const navigate = useNavigate();
  const { isWishlisted } = useWishlistState();
  const { toggleItem } = useWishlistDispatch();
  const { attemptAddToCart } = useCartDispatch();
  const { runProtectedAction } = useAuth();
  const { openQuickView } = useQuickView();

  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const hasConfigurableOptions = Array.isArray(optionGroups) && optionGroups.length > 0;

  const handleQuickViewAction = (e, data) => {
    if (onQuickView) {
      onQuickView(e, data);
    } else if (openQuickView) {
      openQuickView(e, data);
    }
  };
  const [added, setAdded] = useState(false);
  const [isRippling, setIsRippling] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollContainerRef = React.useRef(null);

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

  const availableImages = React.useMemo(() => {
    const imgs = [];
    if (isValidMediaUrl(imageSrc)) imgs.push(imageSrc);
    const imageList = images || gallery || [];
    if (imageList.length > 0) {
      imageList.forEach((img) => {
        if (isValidMediaUrl(img) && !imgs.includes(img)) imgs.push(img);
      });
    } else if (isValidMediaUrl(hoverImage) && hoverImage !== imageSrc) {
      imgs.push(hoverImage);
    }
    return imgs;
  }, [imageSrc, hoverImage, gallery, images]);

  const {
    longPressTriggered,
    isPressing,
    handlers: longPressHandlers,
  } = useLongPress(
    (e) => {
      if (navigator.vibrate) navigator.vibrate(50);
      handleQuickViewAction(e, {
        id,
        _id,
        title,
        teluguTitle,
        nameTE,
        teluguName,
        price,
        oldPrice,
        rating,
        imageSrc,
        hoverImage,
        images: availableImages,
        category: resolveCategoryName(primaryCategory, category),
        primaryCategory,
        secondaryCategories,
        badges,
      });
    },
    { delay: 1000 },
  );

  if (loading) {
    return (
      <div className="flex flex-col gap-4 animate-pulse">
        <div
          className={`aspect-[4/5] w-full bg-surface-container-high overflow-hidden ${isRectangular ? 'rounded-md' : 'rounded-2xl'}`}
        />
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <div className="h-3 w-1/4 bg-surface-container rounded-full" />
            <div className="h-3 w-1/6 bg-surface-container rounded-full" />
          </div>
          <div className="h-6 w-3/4 bg-surface-container rounded-lg" />
          <div className="flex gap-2">
            <div className="h-8 w-1/3 bg-surface-container rounded-lg" />
            <div className="h-8 w-1/4 bg-surface-container rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  const productId = id || _id;
  const wishlisted = isWishlisted(productId);

  const numericPrice = parseNumericPrice(price);
  const parsedOldPrice = oldPrice
    ? parseNumericPrice(oldPrice)
    : strikingPrice
      ? parseNumericPrice(strikingPrice)
      : 0;
  const numericOldPrice = parsedOldPrice > numericPrice ? parsedOldPrice : 0;

  const discount =
    numericOldPrice > numericPrice
      ? Math.round(((numericOldPrice - numericPrice) / numericOldPrice) * 100)
      : null;

  const isOutOfStock = stock <= 0;
  const productRoute = getProductRoute(productId);

  const handleCardClick = (e) => {
    if (longPressTriggered) return;
    // If the user clicked a button or any interactive element inside a button, don't trigger the card link
    if (e.target.closest('button')) return;
    navigate(productRoute);
  };

  const handleWishlist = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsRippling(true);
    setTimeout(() => setIsRippling(false), 500);

    runProtectedAction(() => {
      toggleItem({
        id: productId,
        title,
        price,
        imageSrc,
      });
    });
  };

  const handleAddToCart = (e) => {
    e.preventDefault();
    e.stopPropagation();

    attemptAddToCart({
      id: productId,
      title,
      price,
      imageSrc,
      quantity: 1,
      variant: 'Default',
      isNonRefundable: true,
      optionGroups,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      navigate(productRoute);
    }
  };

  return (
    <>
      <motion.div
        animate={{ scale: isPressing ? 0.96 : 1 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        onMouseEnter={() => {
          prefetchManager.prefetchRoute(productRoute, { kind: 'hover', productId });
        }}
        onClick={handleCardClick}
        onKeyDown={handleKeyDown}
        {...longPressHandlers}
        tabIndex={0}
        role="link"
        aria-label={`View details of ${title}`}
        onContextMenu={(e) => {
          // Prevent native context menu on touch devices during long press
          if (window.innerWidth < 1024) e.preventDefault();
        }}
        className={`group relative flex flex-col cursor-pointer focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-4 focus-visible:ring-offset-surface z-10 hover:z-40 focus-within:z-40 select-none touch-pan-y ${isRectangular ? 'rounded-md' : 'rounded-[12px]'}`}
        style={{ WebkitTouchCallout: 'none' }}
      >
        {/* 1. VISUAL CANVAS */}
        <div className="relative">
          <div
            className={`relative aspect-[4/5] overflow-hidden bg-[#f7f7f7] border border-black/[0.08] hover:border-black/[0.16] shadow-xs lg:group-hover:shadow-md transition-all duration-300 ease-out group/canvas ${isRectangular ? 'rounded-md' : 'rounded-[14px]'}`}
          >
            <div
              ref={scrollContainerRef}
              onScroll={handleScroll}
              className="flex w-full h-full overflow-x-auto snap-x snap-mandatory no-scrollbar scroll-smooth"
            >
              {availableImages.length > 0 ? (
                availableImages.map((img, idx) => (
                  <div key={idx} className="w-full h-full flex-shrink-0 snap-center relative">
                    <Link to={productRoute} className="block h-full w-full" draggable="false">
                      <CloudinaryImage
                        src={img}
                        alt={`${title || 'Product'} - view ${idx + 1}`}
                        className="transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-105 will-change-transform transform-gpu [backface-visibility:hidden] object-cover w-full h-full"
                        loading={eager && idx === 0 ? 'eager' : 'lazy'}
                        fetchPriority={eager && idx === 0 ? 'high' : 'auto'}
                        width={800}
                        height={1000}
                        sizes={sizes}
                        quality="original"
                      />
                    </Link>
                  </div>
                ))
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center bg-[#f7f7f7] dark:bg-[#000000] text-[#737373] dark:text-[#8a8a8a] gap-1.5 select-none p-4">
                  <div className="w-10 h-10 rounded-full bg-black/[0.04] dark:bg-white/[0.06] flex items-center justify-center mb-0.5">
                    <ImageOff className="w-5 h-5 opacity-70" strokeWidth={1.75} />
                  </div>
                  <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider font-label opacity-80">
                    Image Unavailable
                  </span>
                </div>
              )}
            </div>

            {availableImages.length > 1 && (
              <>
                {/* Dots Indicator */}
                <div className="absolute bottom-3 left-3 lg:bottom-4 lg:left-4 flex items-center gap-1.5 z-20 bg-black/20 backdrop-blur-md px-2 py-1.5 rounded-full border border-white/10 shadow-sm pointer-events-auto">
                  {availableImages.map((_, i) => (
                    <div
                      key={i}
                      role="button"
                      tabIndex={0}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (scrollContainerRef.current) {
                          scrollContainerRef.current.scrollTo({
                            left: i * scrollContainerRef.current.clientWidth,
                            behavior: 'smooth',
                          });
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          e.stopPropagation();
                          if (scrollContainerRef.current) {
                            scrollContainerRef.current.scrollTo({
                              left: i * scrollContainerRef.current.clientWidth,
                              behavior: 'smooth',
                            });
                          }
                        }
                      }}
                      className={`transition-all duration-300 rounded-full shadow-md border border-black/10 outline-none cursor-pointer hover:scale-125 flex-shrink-0 p-0 m-0 ${
                        i === activeIndex
                          ? 'w-2 h-2 lg:w-2.5 lg:h-2.5 bg-white'
                          : 'w-1.5 h-1.5 lg:w-2 lg:h-2 bg-white/60 hover:bg-white/80'
                      }`}
                      style={{ minHeight: 'auto', minWidth: 'auto' }}
                      aria-label={`Go to image ${i + 1}`}
                    />
                  ))}
                </div>
              </>
            )}
            {/* Top Header Row: Badges on left, Wishlist on right */}
            <div className="absolute top-2 left-2 right-2 sm:top-2.5 sm:left-2.5 sm:right-2.5 z-20 flex items-start justify-end gap-1.5 pointer-events-none">
              {/* Wishlist Button */}

              {/* Floating Utility Actions: Wishlist */}
              {!selectionMode && (
                <div className="shrink-0 pointer-events-auto">
                  <button
                    onClick={handleWishlist}
                    className="w-7 h-7 sm:w-8 sm:h-8 relative min-h-0 shrink-0 aspect-square p-0 bg-white/95 backdrop-blur-xs rounded-full flex items-center justify-center border border-[#ede8e1] shadow-xs transition-transform duration-200 hover:scale-110 active:scale-95 cursor-pointer overflow-hidden"
                    aria-label={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
                  >
                    <AnimatePresence>
                      {isRippling && (
                        <motion.div
                          initial={{ scale: 0, opacity: 0.5 }}
                          animate={{ scale: 2.5, opacity: 0 }}
                          transition={{ duration: 0.4, ease: 'easeOut' }}
                          className={`absolute inset-0 rounded-full origin-center pointer-events-none ${wishlisted ? 'bg-black/10' : 'bg-[#ff2d55]/20'}`}
                        />
                      )}
                    </AnimatePresence>
                    <motion.span
                      animate={{
                        scale: wishlisted ? [1, 1.4, 1] : 1,
                        color: wishlisted ? '#ff2d55' : '#000000',
                      }}
                      whileTap={{ scale: 0.8 }}
                      transition={{ duration: 0.3, type: 'spring', stiffness: 300 }}
                      className="inline-flex items-center justify-center"
                    >
                      <Heart
                        size={compact ? 14 : 17}
                        strokeWidth={2.25}
                        fill={wishlisted ? 'currentColor' : 'none'}
                      />
                    </motion.span>
                  </button>
                </div>
              )}
            </div>

            {/* Selection Overlay */}
            {selectionMode && isSelected && (
              <div className="absolute inset-0 bg-black/5 ring-4 ring-inset ring-black rounded-2xl z-30 pointer-events-none flex items-center justify-center transition-all">
                <div className="w-10 h-10 bg-black text-white rounded-full flex items-center justify-center shadow-lg animate-scale-in">
                  <Check className="text-[24px]" strokeWidth={1.5} />
                </div>
              </div>
            )}
          </div>

          {/* Quick Add Button — straddling the dividing line ("+ Add") */}
          {!selectionMode && (
            <div className="absolute -bottom-3.5 right-2.5 sm:right-3 z-30 pointer-events-auto">
              {
                <button
                  onClick={isOutOfStock || added ? undefined : handleAddToCart}
                  disabled={isOutOfStock || added}
                  className={`${compact ? 'h-6 px-2.5 text-[10.5px]' : 'h-7 sm:h-8 px-3 sm:px-3.5 text-[11.5px] sm:text-[12.5px]'} ${isRectangular ? 'rounded-md' : 'rounded-[14px]'} flex items-center justify-center gap-1.5 active:translate-y-0.5 active:shadow-none transition-all font-extrabold tracking-tight select-none ${
                    isOutOfStock
                      ? 'bg-neutral-100 text-neutral-400 cursor-not-allowed border-[1.5px] border-neutral-300'
                      : added
                        ? 'bg-black text-[#f7bb0e] border-[1.5px] border-black cursor-pointer'
                        : 'bg-white text-neutral-950 hover:bg-[#fffdf5] border-[1.5px] border-[#f7bb0e] shadow-[0_1.5px_0_0_#d99b00,0_2px_4px_rgba(0,0,0,0.06)] cursor-pointer'
                  }`}
                  aria-label={added ? 'Added to bag' : 'Add to bag'}
                >
                  <AnimatePresence mode="wait">
                    {added ? (
                      <motion.span
                        key="check"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        transition={{ duration: 0.15 }}
                        className="inline-flex items-center gap-1"
                      >
                        <Check size={compact ? 12 : 14} strokeWidth={3} />
                        <span>Added</span>
                      </motion.span>
                    ) : (
                      <motion.span
                        key="add"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        transition={{ duration: 0.15 }}
                        className="inline-flex items-center gap-1"
                      >
                        {isOutOfStock ? (
                          <>
                            <Ban size={compact ? 11 : 12} strokeWidth={2.5} />
                            <span>Sold</span>
                          </>
                        ) : (
                          <>
                            <Plus
                              size={compact ? 13 : 15}
                              strokeWidth={3}
                              className="text-[#d99b00]"
                            />
                            <span>Add</span>
                          </>
                        )}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </button>
              }
            </div>
          )}
        </div>

        <div
          className={`${compact ? 'pt-2 pb-1 px-1.5' : 'pt-3 pb-2 px-3.5 lg:px-4'} flex flex-col flex-1 transition-opacity duration-500 ${hideDetails ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
        >
          <div
            className={`flex items-center gap-2 h-4 lg:h-5 ${compact ? 'mb-0.5' : 'mb-1 sm:mb-1.5'} max-w-[62%]`}
          >
            <span
              className={`text-[#525252] ${compact ? 'text-[10px]' : 'text-[11px] lg:text-[12px]'} font-semibold truncate leading-none`}
            >
              {resolveCategoryName(primaryCategory, category)}
            </span>

            <div className="flex items-center gap-0.5 shrink-0">
              <DynamicRatingBadge
                itemId={productId}
                initialRating={rating}
                initialReviews={reviews}
                compact={compact}
              />
            </div>
          </div>

          <Link to={productRoute} className={`group/link block ${compact ? 'mb-0' : 'mb-0.5'}`}>
            <h3
              className={`text-[#283618] leading-snug font-bold truncate font-serif-heading ${
                compact ? 'text-[12px] lg:text-[13px]' : 'text-[14px] lg:text-[15.5px]'
              }`}
              style={{ fontFamily: 'var(--font-display)' }}
              title={title}
            >
              {title}
            </h3>
          </Link>

          <div className={`${compact ? 'mt-1' : 'mt-1.5'} flex flex-col justify-end`}>
            <div className="flex items-baseline gap-2 flex-wrap">
              <span
                className={`font-serif-heading lining-nums font-extrabold text-neutral-950 leading-none inline-flex items-baseline ${compact ? 'text-[13px] lg:text-[14px]' : 'text-[15px] sm:text-[16px] lg:text-[17px]'}`}
                style={{ fontFamily: 'var(--font-display)' }}
              >
                {'₹'}
                {formatPrice(price)}
              </span>
              {numericOldPrice > numericPrice && (
                <span
                  className={`font-serif-heading lining-nums text-neutral-400 line-through font-medium leading-none ${compact ? 'text-[10.5px] lg:text-[11px]' : 'text-[12px] lg:text-[13px]'}`}
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  ₹{formatPrice(numericOldPrice)}
                </span>
              )}
              {discount && (
                <span className="text-emerald-700 dark:text-emerald-500 font-bold text-[11px] lg:text-[12px] leading-none">
                  {discount}% off
                </span>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      {hasConfigurableOptions && (
        <ProductConfiguratorModal
          isOpen={isConfigModalOpen}
          onClose={() => setIsConfigModalOpen(false)}
          product={{
            id: productId,
            _id: productId,
            title,
            price,
            imageSrc,
            images,
            stock,
            isNonRefundable,
            optionGroups,
          }}
          onAddToCart={(configuredItem) => {
            attemptAddToCart(configuredItem);
            setAdded(true);
            setTimeout(() => setAdded(false), 2000);
          }}
        />
      )}
    </>
  );
});
