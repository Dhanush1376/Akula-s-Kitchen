import { X, Minus, Plus, Ban, Heart, AlertTriangle } from 'lucide-react';
import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { handleImageError, getOptimizedUrl, getBlurDataUri } from '../../utils/media/imageUtils';
import { useProduct } from '../../hooks/useProductQueries';
import { useConfig } from '../../context/ConfigContext';

export const CartItemRow = React.memo(function CartItemRow({
  item,
  settings,
  removeItem,
  updateQuantity,
  handleMoveToWishlist,
  triggerNotification,
}) {
  const { maxQuantityPerItem = 10 } = useConfig();
  const itemOldPrice = item.oldPrice || item.price;
  const savingsPct =
    itemOldPrice > item.price ? Math.round(((itemOldPrice - item.price) / itemOldPrice) * 100) : 0;

  const actualProductId = item.product?._id || item.product?.id || item.id || item._id;
  const { data: realProduct, isLoading: isRealProductLoading } = useProduct(actualProductId, {
    enabled: Boolean(actualProductId),
    staleTime: 1000 * 60 * 60, // 1 hour
  });

  const isProductDataLoading = Boolean(actualProductId && isRealProductLoading && !realProduct);

  const isItemNonRefundable = Boolean(
    item.isNonRefundable ||
    realProduct?.isNonRefundable ||
    realProduct?.returnSettings?.isReturnable === false,
  );

  const displayTitle = item.title;
  const displayImage = item.imageSrc || realProduct?.images?.[0] || realProduct?.imageSrc;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, x: -50, scale: 0.9 }}
      transition={{ duration: 0.25 }}
      className={`bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-md p-3 sm:p-3.5 relative group border transition-all duration-200 ${item.stock === 0 ? 'border-red-200' : 'border-neutral-200 hover:border-neutral-300'}`}
    >
      {/* Top Right Close Icon */}
      <button
        onClick={() => {
          removeItem(item.id || item._id, item.configurationSignature);
          triggerNotification(`Removed "${item.title}"`);
        }}
        className="absolute top-3.5 right-3.5 text-neutral-400 hover:text-red-600 transition-colors cursor-pointer w-8 h-8 min-h-0 flex items-center justify-center rounded-full hover:bg-neutral-100 z-10"
        aria-label="Remove item from bag"
      >
        <X className="w-4 h-4" strokeWidth={2} />
      </button>

      <div className="flex gap-3.5 sm:gap-4">
        {/* Left Column: Food Image */}
        <div className="relative w-[85px] h-[85px] sm:w-[96px] sm:h-[96px] bg-neutral-100 rounded-md overflow-hidden flex-shrink-0 border border-neutral-200">
          {item.stock === 0 && (
            <div className="absolute inset-0 bg-white/75 backdrop-blur-xs z-10 flex items-center justify-center">
              <span className="bg-red-600 text-white text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                Out of Stock
              </span>
            </div>
          )}
          <Link
            to={`/product/${item.productId || (typeof item.id === 'string' && item.id.includes('___') ? item.id.split('___')[0] : item.id || item._id)}`}
            className="w-full h-full block"
          >
            <motion.img
              onError={handleImageError}
              whileHover={{ scale: 1.05 }}
              src={
                (displayImage ? getOptimizedUrl(displayImage, 110, 110) : '') ||
                getBlurDataUri(110, 110)
              }
              alt={displayTitle}
              className={`w-full h-full object-cover transition-transform ${item.stock === 0 ? 'grayscale' : ''} text-[10px] text-neutral-400 text-center flex items-center justify-center break-words`}
            />
          </Link>
        </div>

        {/* Right Details */}
        <div className="flex-1 min-w-0 pr-6 sm:pr-8 py-0.5">
          <Link
            to={`/product/${item.productId || (typeof item.id === 'string' && item.id.includes('___') ? item.id.split('___')[0] : item.id || item._id)}`}
          >
            <h3 className="font-semibold text-[13.5px] sm:text-[14.5px] text-neutral-900 line-clamp-2 leading-snug hover:text-black transition-colors">
              {displayTitle}
            </h3>
          </Link>

          {item.selectedOptions && item.selectedOptions.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {item.selectedOptions.map((opt, optIdx) => (
                <span
                  key={optIdx}
                  className="inline-flex items-center text-[10.5px] font-medium px-1.5 py-0.5 rounded bg-amber-50 text-amber-900 border border-amber-200/70"
                >
                  <span className="opacity-75 mr-1">{opt.groupName}:</span>
                  <span className="font-bold">{opt.optionLabel}</span>
                  {opt.priceAdjustment > 0 && (
                    <span className="ml-1 text-[9.5px] font-semibold text-amber-700">
                      (+₹{opt.priceAdjustment})
                    </span>
                  )}
                </span>
              ))}
            </div>
          )}

          {/* Size / Pack & Quantity controls */}
          <div className="flex flex-wrap items-center gap-2.5 mt-2.5">
            {item.variant && item.variant !== 'Default' && (
              <div className="bg-[#fef9e7] border border-[#fae182] rounded-md px-2 py-0.5 text-[10.5px] font-extrabold text-neutral-900 flex items-center gap-1">
                <span className="text-neutral-500 font-medium">Pack:</span> {item.variant}
              </div>
            )}

            <div
              className={`inline-flex items-center border border-neutral-200 rounded-md overflow-hidden bg-neutral-50 h-[28px] sm:h-[30px] ${item.stock === 0 ? 'opacity-50 pointer-events-none' : ''}`}
            >
              <button
                onClick={(e) => {
                  e.preventDefault();
                  updateQuantity(
                    item.id || item._id,
                    item.variant,
                    item.quantity - 1,
                    item.configurationSignature,
                  );
                }}
                className="w-8 sm:w-8.5 h-full flex items-center justify-center text-neutral-600 hover:text-black hover:bg-neutral-200/60 transition-colors cursor-pointer min-h-0"
                aria-label="Decrease quantity"
              >
                <Minus className="w-3.5 h-3.5" strokeWidth={2.2} />
              </button>
              <div className="w-7 sm:w-8 h-full flex items-center justify-center font-display text-[12px] sm:text-[13px] font-extrabold text-neutral-950 bg-white border-x border-neutral-200">
                {item.quantity}
              </div>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  if (item.quantity >= maxQuantityPerItem) {
                    return;
                  }
                  updateQuantity(
                    item.id || item._id,
                    item.variant,
                    item.quantity + 1,
                    item.configurationSignature,
                  );
                }}
                disabled={
                  item.quantity >= (item.stock || 999) || item.quantity >= maxQuantityPerItem
                }
                className={`w-8 sm:w-8.5 h-full flex items-center justify-center transition-colors min-h-0 ${
                  item.quantity >= (item.stock || 999) || item.quantity >= maxQuantityPerItem
                    ? 'text-neutral-300 cursor-not-allowed bg-neutral-100'
                    : 'text-neutral-600 hover:text-black hover:bg-neutral-200/60 cursor-pointer'
                }`}
                aria-label="Increase quantity"
              >
                <Plus className="w-3.5 h-3.5" strokeWidth={2.2} />
              </button>
            </div>
          </div>

          {item.quantity > maxQuantityPerItem && (
            <div className="flex items-center gap-2 mt-2 p-2 bg-amber-50 border border-amber-300 rounded-lg text-[11px] text-amber-900 font-medium">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Exceeds max allowed quantity of {maxQuantityPerItem}</span>
              <button
                type="button"
                onClick={() =>
                  updateQuantity(item.id || item._id, item.variant, maxQuantityPerItem)
                }
                className="underline font-bold text-amber-950 ml-auto cursor-pointer hover:text-black shrink-0"
              >
                Fix to {maxQuantityPerItem}
              </button>
            </div>
          )}

          {item.quantity === maxQuantityPerItem && (
            <span className="text-[10px] text-amber-700 font-semibold block mt-1">
              Max order limit reached ({maxQuantityPerItem} items)
            </span>
          )}

          {item.quantity >= item.stock && item.stock > 0 && item.quantity < maxQuantityPerItem && (
            <span className="text-[10px] text-red-500 font-medium block mt-1">
              Maximum stock reached
            </span>
          )}

          {/* Pricing & Policy below Quantity */}
          <div className="mt-2.5 flex flex-col gap-1.5 w-full">
            {/* Pricing Row */}
            <div className="flex items-baseline gap-2 flex-wrap">
              <span className="text-[15px] sm:text-[16px] font-bold text-neutral-950">
                ₹{item.price.toLocaleString()}
              </span>
              {itemOldPrice > item.price && (
                <span className="text-[12px] sm:text-[13px] text-neutral-400 line-through font-normal">
                  ₹{itemOldPrice.toLocaleString()}
                </span>
              )}
              {savingsPct > 0 && (
                <span className="text-[9.5px] font-extrabold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200/60">
                  {savingsPct}% Off
                </span>
              )}
            </div>

            {/* Policy strip */}
            <div className="text-[11px] text-neutral-600 w-full">
              <div className="flex flex-col gap-1">
                {isProductDataLoading ? (
                  <div className="flex items-center gap-1.5 py-0.5 opacity-60">
                    <div className="w-3 h-3 rounded-full bg-neutral-200 animate-pulse" />
                    <div className="w-24 h-2.5 rounded-sm bg-neutral-200 animate-pulse" />
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-amber-700 font-bold whitespace-nowrap text-[10px]">
                    <Ban className="w-3 h-3" strokeWidth={2} />
                    Non-Returnable (Perishable Food)
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Wishlist Button inside Card */}
      <div className="-mx-3 sm:-mx-3.5 -mb-3 sm:-mb-3.5 mt-2.5 border-t border-neutral-200 bg-neutral-50/70 hover:bg-neutral-100 transition-colors">
        <button
          onClick={() => handleMoveToWishlist(item)}
          className="text-[10px] sm:text-[10.5px] font-bold text-neutral-600 hover:text-black uppercase tracking-wider transition-colors flex items-center justify-center w-full gap-1.5 cursor-pointer py-2"
        >
          <Heart className="w-3.5 h-3.5" strokeWidth={1.8} />
          <span>Save to Wishlist</span>
        </button>
      </div>
    </motion.div>
  );
});
