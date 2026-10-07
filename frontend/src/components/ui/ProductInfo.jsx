import {
  Award,
  Heart,
  Star,
  Ban,
  Lock,
  Zap,
  Check,
  ShoppingBag,
  Plus,
  Minus,
  ChefHat,
  Leaf,
  PackageCheck,
} from 'lucide-react';
import { m as motion } from 'framer-motion';
import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import { useWishlist } from '../../context/WishlistContext';
import { useAuth } from '../../context/AuthContext';
import { ProductNoteCard } from './ProductNoteCard';
import { useConfig } from '../../context/ConfigContext';
import { formatPrice } from '../../utils/ecommerce/priceUtils';
import toast from 'react-hot-toast';
import { ProductConfigurator } from '../products/ProductConfigurator';
import { ProductLeaf } from './ProductLeaf';

export function ProductInfo({ product, atcRef, _maxQuantity = 10 }) {
  const { isStoreClosed, estimatedDeliveryDays, freeShippingThreshold, enableFreeShipping } =
    useConfig();
  const navigate = useNavigate();
  const { attemptAddToCart } = useCart();
  const { toggleItem, isWishlisted } = useWishlist();
  const { runProtectedAction, user } = useAuth();
  const [quantity, setQuantity] = React.useState(1);
  const [added, setAdded] = React.useState(false);
  const [_startingChat, _setStartingChat] = React.useState(false);

  if (!product) return null;

  const oldPrice = product?.oldPrice || 0;
  const discount =
    oldPrice > 0 && product?.price ? Math.round(((oldPrice - product.price) / oldPrice) * 100) : 0;
  const wishlisted = isWishlisted(product?._id || product?.id);

  const handleWishlist = () => {
    if (!product) return;
    runProtectedAction(() => {
      toggleItem({
        id: product._id || product.id,
        title: product.title,
        price: product.price,
        imageSrc: product.imageSrc || product.image,
      });
    });
  };

  const handleAddToCart = () => {
    attemptAddToCart({
      id: product._id || product.id,
      title: product.title,
      price: product.price,
      imageSrc: product.imageSrc || product.image,
      formattedPrice: `Rs. ${product.price?.toLocaleString()}`,
      quantity: quantity,
      isNonRefundable: product.isNonRefundable,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  return (
    <div className="flex flex-col gap-5 lg:gap-6 lg:sticky lg:top-28 relative isolate lg:self-start">
      {/* Quiet decorative leaf behind the details (phones only) */}
      <ProductLeaf />
      {/* Category, Badges & Title Block */}
      <div className="space-y-2 sm:space-y-2.5">
        {/* Category & Badge Header */}
        <div className="flex flex-wrap items-center justify-between gap-1.5 sm:gap-2">
          <div className="flex items-center gap-1.5">
            <Link
              to={`/collections?category=${encodeURIComponent(product.primaryCategory?.name || product.category || '')}`}
              className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-white/95 backdrop-blur-xs text-neutral-950 font-extrabold text-[10.5px] uppercase tracking-wider border border-black/10 shadow-2xs hover:bg-[#f7bb0e]/20 hover:border-black/20 transition-all"
            >
              {product.primaryCategory?.name || product.category || "Akula's Kitchen"}
            </Link>
            {(product.collection || product.subcategory) && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-600 font-bold text-[9.5px] uppercase tracking-wider">
                {product.collection || product.subcategory}
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5 items-center">
            {(product.isBestseller || product.isFeatured) && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50/80 text-neutral-950 font-extrabold text-[10px] uppercase tracking-wider border border-[#f7bb0e]/30 shadow-2xs">
                <Award className="w-3 h-3 text-[#f7bb0e]" strokeWidth={2.5} />
                <span>Bestseller</span>
              </span>
            )}
            {(product.reviewCount || product.reviews || 0) > 0 && (
              <button
                type="button"
                onClick={() => {
                  const el = document.getElementById('reviews-section');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }}
                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white/95 backdrop-blur-xs text-neutral-950 font-bold text-[10.5px] border border-black/10 shadow-2xs hover:bg-neutral-50 active:scale-95 transition-all cursor-pointer"
                title={`${product.reviewCount || product.reviews} Verified Review${(product.reviewCount || product.reviews) > 1 ? 's' : ''}`}
              >
                <Star className="w-3 h-3 fill-[#f7bb0e] text-[#f7bb0e] shrink-0" />
                <span className="font-extrabold">{Number(product.rating || 5.0).toFixed(1)}</span>
                <span className="text-neutral-400">({product.reviewCount || product.reviews})</span>
              </button>
            )}
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-900 font-bold text-[10px] border border-amber-200/80 shadow-2xs">
              <Ban className="w-3 h-3 text-amber-700 shrink-0" strokeWidth={2} />
              <span>Non-Returnable (Perishable Food)</span>
            </span>
          </div>
        </div>

        {/* Product Title & Metadata */}
        <div className="space-y-1">
          <h1
            className="font-serif-heading font-extrabold text-[26px] sm:text-[32px] lg:text-[38px] text-[#283618] leading-[1.15] tracking-tight"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            {product.title}
          </h1>
          {(product.teluguTitle || product.nameTE || product.teluguName) && (
            <p
              className="font-serif-heading text-[16px] sm:text-[19px] text-neutral-600 font-medium leading-none"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              {product.teluguTitle || product.nameTE || product.teluguName}
            </p>
          )}
          {product.isFeatured && (
            <div className="pt-0.5">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-[10.5px] font-bold border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Trending this week
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Complimentary Gifts Section */}
      <ProductNoteCard complimentaryGift={product.complimentaryGift} />

      {/* Pricing & Shipping */}
      <div className="py-3 border-b border-black/[0.08]">
        <div className="flex flex-wrap items-baseline gap-3 mb-3">
          <span
            className="font-serif-heading lining-nums text-[30px] sm:text-[38px] text-neutral-950 font-extrabold leading-none"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            ₹{formatPrice(product.price)}
          </span>
          {oldPrice > 0 && oldPrice > product.price && (
            <span
              className="font-serif-heading lining-nums text-neutral-400 line-through text-[16px] sm:text-[18px] font-medium leading-none"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              ₹{formatPrice(oldPrice)}
            </span>
          )}
          {discount > 0 && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-white/95 backdrop-blur-xs text-neutral-950 font-extrabold text-[11.5px] tracking-tight shadow-xs border border-black/10 select-none">
              {discount}% OFF
            </span>
          )}
          {discount > 0 && (
            <span className="text-emerald-700 dark:text-emerald-500 font-extrabold text-[12.5px] leading-none">
              Save ₹{formatPrice(oldPrice - product.price)}
            </span>
          )}
        </div>

        <div className="flex items-start gap-3 mt-4 p-3.5 bg-[#fffbeb] rounded-xl border border-[#fde68a]">
          <Ban className="text-[18px] text-[#d97706] mt-0.5 shrink-0" strokeWidth={1.5} />
          <div className="flex flex-col">
            <span className="text-[12px] font-bold text-[#b45309] uppercase tracking-wider">
              Non-Returnable Item
            </span>
            <span className="text-[12px] text-[#92400e] font-medium leading-relaxed">
              Due to food safety and the perishable nature of fresh traditional food, returns and
              exchanges are not accepted.
            </span>
          </div>
        </div>
      </div>

      {/* Action CTA Stack: Weight & Configuration Selection */}
      <div className="space-y-4 mt-2">
        {(Array.isArray(product?.optionGroups) && product.optionGroups.length > 0) ||
        (Array.isArray(product?.variants) && product.variants.length > 0) ||
        (product?.weight && typeof product.weight === 'string' && product.weight.trim()) ? (
          <div className="flex flex-col gap-4">
            <ProductConfigurator
              product={product}
              quantity={quantity}
              onQuantityChange={setQuantity}
              onAddToCart={(configuredItem) => {
                attemptAddToCart(configuredItem);
                setAdded(true);
                setTimeout(() => setAdded(false), 2000);
              }}
              mode="inline"
              ctaLabel={added ? 'Added to Bag' : 'Add to Bag'}
              ctaRef={atcRef}
              secondaryAction={
                <button
                  type="button"
                  onClick={handleWishlist}
                  className="w-full h-[48px] sm:h-[52px] rounded-full bg-white text-neutral-950 border-[1.5px] border-black/15 hover:border-black/40 shadow-[0_1.5px_0_0_rgba(0,0,0,0.06),0_2px_4px_rgba(0,0,0,0.04)] active:scale-98 transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer font-extrabold text-[12px] sm:text-[13px] uppercase tracking-wider px-3 sm:px-4"
                >
                  <motion.span
                    animate={{
                      scale: wishlisted ? [1, 1.25, 1] : 1,
                      color: wishlisted ? '#ff2d55' : '#000000',
                    }}
                    whileTap={{ scale: 0.8 }}
                    transition={{ duration: 0.3, type: 'spring', stiffness: 300 }}
                    className="inline-flex items-center justify-center shrink-0"
                  >
                    <Heart size={16} strokeWidth={2.2} fill={wishlisted ? '#ff2d55' : 'none'} />
                  </motion.span>
                  <span className="truncate">{wishlisted ? 'Saved' : 'Save for Later'}</span>
                </button>
              }
            />
          </div>
        ) : (
          <>
            {/* Quantity Selector & Low Stock Warning */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <div className="flex items-center gap-3">
                <span className="text-[11px] uppercase tracking-wider font-extrabold text-neutral-500">
                  Quantity
                </span>
                <div className="inline-flex items-center h-9 sm:h-10 rounded-full border-[1.5px] border-[#f7bb0e] bg-[#fffdf0] shadow-xs px-1">
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    disabled={quantity <= 1 || added}
                    className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-neutral-950 hover:bg-[#f7bb0e] disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
                    aria-label="Decrease quantity"
                  >
                    <Minus size={13} strokeWidth={2.5} />
                  </button>
                  <span className="w-8 text-center font-display font-extrabold text-[13px] sm:text-[14px] text-neutral-950">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.min(product.stock || 10, q + 1))}
                    disabled={(product.stock != null && quantity >= product.stock) || added}
                    className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-neutral-950 hover:bg-[#f7bb0e] disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
                    aria-label="Increase quantity"
                  >
                    <Plus size={13} strokeWidth={2.5} />
                  </button>
                </div>
              </div>

              {product.stock != null && product.stock <= 5 && product.stock > 0 && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-bold">
                  <Zap className="w-3 h-3 text-amber-600 animate-pulse" />
                  <span>
                    {product.stock === 1
                      ? 'Only 1 left in stock'
                      : `Only ${product.stock} left in stock`}
                  </span>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-3">
              <button
                ref={atcRef}
                onClick={
                  isStoreClosed
                    ? () =>
                        toast(
                          'Online ordering is temporarily paused while the store is in catalog-only mode.',
                        )
                    : product.stock <= 0 || added
                      ? undefined
                      : handleAddToCart
                }
                disabled={!isStoreClosed && (product.stock <= 0 || added)}
                className={`w-full h-[48px] sm:h-[52px] rounded-full flex items-center justify-center gap-2.5 font-extrabold text-[12px] sm:text-[13px] uppercase tracking-wider transition-all duration-200 active:scale-98 cursor-pointer px-4 ${
                  isStoreClosed
                    ? 'bg-[#fef2c0] text-[#8a6800] border border-[#fae182] cursor-not-allowed'
                    : product.stock <= 0
                      ? 'bg-[#fef2c0] text-[#8a6800] border border-[#fae182] cursor-not-allowed'
                      : added
                        ? 'bg-black text-[#f7bb0e] border-[1.5px] border-black shadow-sm'
                        : 'bg-[#f7bb0e] text-neutral-950 hover:bg-[#eab00d] border-[1.5px] border-[#f7bb0e] shadow-[0_1.5px_0_0_#d99b00,0_2px_4px_rgba(0,0,0,0.06)]'
                }`}
              >
                {isStoreClosed ? (
                  <>
                    <Lock className="w-3.5 h-3.5 text-[#8a6800] shrink-0" strokeWidth={2} />
                    <span>Orders Paused</span>
                  </>
                ) : added ? (
                  <>
                    <Check className="w-4 h-4 text-[#f7bb0e] shrink-0" strokeWidth={2.5} />
                    <span>Added</span>
                  </>
                ) : (
                  <>
                    <ShoppingBag
                      className="w-4 h-4 shrink-0 transition-transform group-hover:scale-110"
                      strokeWidth={2.2}
                    />
                    <span>{product.stock <= 0 ? 'Out of Stock' : 'Add to Bag'}</span>
                  </>
                )}
              </button>

              <button
                onClick={handleWishlist}
                className="w-full h-[48px] sm:h-[52px] rounded-full bg-white text-neutral-950 border-[1.5px] border-black/15 hover:border-black/40 shadow-[0_1.5px_0_0_rgba(0,0,0,0.06),0_2px_4px_rgba(0,0,0,0.04)] active:scale-98 transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer font-extrabold text-[12px] sm:text-[13px] uppercase tracking-wider px-4"
              >
                <motion.span
                  animate={{
                    scale: wishlisted ? [1, 1.25, 1] : 1,
                    color: wishlisted ? '#ff2d55' : '#000000',
                  }}
                  whileTap={{ scale: 0.8 }}
                  transition={{ duration: 0.3, type: 'spring', stiffness: 300 }}
                  className="inline-flex items-center justify-center shrink-0"
                >
                  <Heart size={16} strokeWidth={2.2} fill={wishlisted ? '#ff2d55' : 'none'} />
                </motion.span>
                <span>{wishlisted ? 'Saved' : 'Save'}</span>
              </button>
            </div>
          </>
        )}
      </div>

      {/* Description Section */}
      <div className="space-y-3 mt-3 pt-3 border-t border-black/[0.08]">
        <div className="space-y-1">
          <h3 className="font-bold text-[14px] text-on-surface/90">About this Item</h3>
          <p className="font-body-md text-on-surface/80 font-normal leading-relaxed text-[14px] sm:text-[15px]">
            {product.description || "Freshly made by Akula's Kitchen."}
          </p>
        </div>
      </div>

      {/* Food Trust Signifiers Grid */}
      <div className="grid grid-cols-4 gap-1.5 sm:gap-2.5 pt-4 sm:pt-5 border-t border-black/10">
        <FeatureItem IconComponent={ChefHat} label="Fresh" />
        <FeatureItem IconComponent={Leaf} label="Pure" />
        <FeatureItem IconComponent={PackageCheck} label="Hygienic" />
        <FeatureItem IconComponent={Heart} label="Homestyle" />
      </div>
    </div>
  );
}

export function FeatureItem({ IconComponent, label }) {
  return (
    <div className="flex flex-col items-center text-center gap-1 sm:gap-1.5 py-2 px-1 sm:py-2.5 sm:px-2 rounded-xl sm:rounded-2xl bg-white border border-black/[0.08] shadow-2xs group cursor-default">
      <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-950 group-hover:bg-[#f7bb0e]/20 transition-colors shrink-0">
        <IconComponent size={14} strokeWidth={2} />
      </div>
      <span className="text-[9px] sm:text-[10px] text-neutral-700 uppercase tracking-wider font-extrabold truncate max-w-full">
        {label}
      </span>
    </div>
  );
}

export function CustomThemeCard() {
  return null;
}
