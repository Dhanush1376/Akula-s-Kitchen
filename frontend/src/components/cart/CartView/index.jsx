import {
  CheckCircle2,
  Trash2,
  BadgeCheck,
  Heart,
  Lock,
  AlertTriangle,
  ArrowRight,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import React, { useState, useEffect, Profiler } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';

import { useConfig } from '../../../context/ConfigContext';
import toast from 'react-hot-toast';

import { logRenderMetrics } from '../../../utils/performance/profilerLogger';
import { useCart } from '../../../context/CartContext';
import { useWishlist } from '../../../context/WishlistContext';
import { useAuth } from '../../../context/AuthContext';
import { useRecommendationTracker } from '../../../hooks/useRecommendationTracker';
import { useUserAddresses, useAddressMutations } from '../../../hooks/useUserQueries';

import { Skeleton, CartSkeleton } from '../../ui';
import { SEO } from '../../seo/SEO';
import { CheckoutSteps } from '../../ui/CheckoutSteps';
import { CartItemRow } from '../CartItemRow';

// Subcomponents
import { CartEmptyState } from './CartEmptyState';
import { CartSummary } from './CartSummary';
import { CartAddressBar } from './CartAddressBar';

const RecommendationSystem = React.lazy(() =>
  import('../../sections/RecommendationSystem').then((m) => ({
    default: m.RecommendationSystem,
  })),
);

export function CartView({ isEmbedded = false }) {
  const { items, removeItem, updateQuantity, cartCount, summary, totalMRP, loading } = useCart();
  const { addItem: addToWishlist } = useWishlist();
  const { runProtectedAction, isAuthenticated, user } = useAuth();
  const { isStoreClosed, orderLimits, shippingSettings, storeSettings, estimatedDeliveryDays } =
    useConfig();
  const maxItemsPerOrder = orderLimits?.maxItemsPerOrder ?? 20;
  const maxQuantityPerItem = orderLimits?.maxQuantityPerItem ?? 50;
  const minOrderValue = orderLimits?.minOrderValue ?? 0;
  const maxOrderValue = orderLimits?.maxOrderValue ?? 1000000;
  const navigate = useNavigate();

  const { data: addresses = [] } = useUserAddresses();
  const { setDefaultAddress } = useAddressMutations();
  const [isAddressDropdownOpen, setIsAddressDropdownOpen] = useState(false);
  const [isClearCartDialogOpen, setIsClearCartDialogOpen] = useState(false);
  const [notification, setNotification] = useState('');

  const activeAddress = React.useMemo(() => {
    if (!addresses || addresses.length === 0) return null;
    return addresses.find((a) => a.isDefault) || addresses[0];
  }, [addresses]);

  useRecommendationTracker({
    targetType: 'page',
    targetId: 'cart',
    source: 'cart',
  });

  const settings = storeSettings || {};

  useEffect(() => {
    try {
      sessionStorage.removeItem('akula_checkout_step');
    } catch (_e) {}
  }, []);

  const triggerNotification = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(''), 3000);
  };

  const actualSubtotal = summary?.subtotal || 0;
  const discountOnMRP = Math.max(0, (totalMRP || 0) - actualSubtotal);

  const freeShippingThreshold = shippingSettings?.freeShippingThreshold ?? 2000;
  const enableFreeShipping = shippingSettings?.enableFreeShipping ?? true;
  const deliveryCharge = shippingSettings?.deliveryCharge ?? 99;
  // Delivery fee is excluded from online order totals as per store billing policy
  const shippingFee = 0;

  // Live store-configured platform fee: always respects current store settings
  const configuredPlatformFee =
    orderLimits?.platformFee !== undefined
      ? Number(orderLimits.platformFee)
      : summary?.platformFee !== undefined
        ? Number(summary.platformFee)
        : 0;
  const platformFee = items.length > 0 ? Math.max(0, configuredPlatformFee) : 0;

  const basePayableAmount = actualSubtotal + platformFee + shippingFee;

  const finalPayableAmount = items.length > 0 ? basePayableAmount : 0;

  // Real-time order limits violations evaluation
  const itemsExceedingQty = React.useMemo(() => {
    return items.filter((item) => Number(item.quantity) > maxQuantityPerItem);
  }, [items, maxQuantityPerItem]);

  const hasQuantityViolation = itemsExceedingQty.length > 0;
  const hasDistinctItemsViolation = items.length > maxItemsPerOrder;
  const hasMinOrderViolation = minOrderValue > 0 && actualSubtotal < minOrderValue;
  const hasMaxOrderViolation = maxOrderValue > 0 && actualSubtotal > maxOrderValue;

  const orderLimitError = React.useMemo(() => {
    if (hasQuantityViolation) {
      const names = itemsExceedingQty.map((i) => `"${i.title}" (Qty: ${i.quantity})`).join(', ');
      return `Product quantity limit exceeded: Maximum allowed is ${maxQuantityPerItem} per product. Items affected: ${names}.`;
    }
    if (hasDistinctItemsViolation) {
      return `Your cart has ${items.length} different items, but the maximum allowed per order is ${maxItemsPerOrder}. Please remove some items to proceed.`;
    }
    if (hasMinOrderViolation) {
      return `Minimum order amount of ₹${minOrderValue.toLocaleString('en-IN')} is required to checkout. Your current subtotal is ₹${actualSubtotal.toLocaleString('en-IN')}.`;
    }
    if (hasMaxOrderViolation) {
      return `Maximum order amount is ₹${maxOrderValue.toLocaleString('en-IN')}. Your current subtotal is ₹${actualSubtotal.toLocaleString('en-IN')}.`;
    }
    return null;
  }, [
    hasQuantityViolation,
    hasDistinctItemsViolation,
    hasMinOrderViolation,
    hasMaxOrderViolation,
    itemsExceedingQty,
    maxQuantityPerItem,
    items.length,
    maxItemsPerOrder,
    minOrderValue,
    actualSubtotal,
    maxOrderValue,
  ]);

  const orderLimitButtonText = React.useMemo(() => {
    if (hasQuantityViolation) return `Max Qty ${maxQuantityPerItem} Exceeded`;
    if (hasDistinctItemsViolation) return `Max ${maxItemsPerOrder} Items Exceeded`;
    if (hasMinOrderViolation) return `Min Order ₹${minOrderValue.toLocaleString('en-IN')} Required`;
    if (hasMaxOrderViolation) return `Max Order ₹${maxOrderValue.toLocaleString('en-IN')} Exceeded`;
    return null;
  }, [
    hasQuantityViolation,
    hasDistinctItemsViolation,
    hasMinOrderViolation,
    hasMaxOrderViolation,
    maxQuantityPerItem,
    maxItemsPerOrder,
    minOrderValue,
    maxOrderValue,
  ]);

  const handleFixOverLimitQuantities = () => {
    itemsExceedingQty.forEach((item) => {
      updateQuantity(item.id || item._id, item.variant, maxQuantityPerItem, item.type);
    });
    triggerNotification(
      `Adjusted ${itemsExceedingQty.length} item(s) to max allowed quantity of ${maxQuantityPerItem}`,
    );
  };

  const handleMoveToWishlist = (item) => {
    addToWishlist({
      id: item.id || item._id,
      title: item.title,
      price: item.price,
      imageSrc: item.imageSrc,
    });
    removeItem(item.id || item._id, item.variant, item.type);
    triggerNotification(`Moved "${item.title}" to Wishlist`);
  };

  const handleMoveAllToWishlist = () => {
    items.forEach((item) => {
      addToWishlist({
        id: item.id || item._id,
        title: item.title,
        price: item.price,
        imageSrc: item.imageSrc,
      });
      removeItem(item.id || item._id, item.variant, item.type);
    });
    triggerNotification(`Moved all items to Wishlist`);
  };

  const handleClearCart = () => {
    setIsClearCartDialogOpen(true);
  };

  const confirmClearCart = () => {
    items.forEach((item) => {
      removeItem(item.id || item._id, item.variant, item.type);
    });
    triggerNotification(`Bag cleared`);
    setIsClearCartDialogOpen(false);
  };

  if (loading && items.length === 0) {
    return <CartSkeleton />;
  }

  const innerContent = (
    <>
      {!isEmbedded && <SEO title="Your Bag" description="Review your selected items." />}

      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed top-28 left-1/2 -translate-x-1/2 z-[100] bg-white/40 backdrop-blur-2xl border border-white/60 text-black px-6 py-3 rounded-full shadow-[0_20px_40px_rgba(0,0,0,0.08),_inset_0_1px_0_rgba(255,255,255,0.4)] text-[12px] font-bold tracking-wide flex items-center gap-2.5 whitespace-nowrap"
          >
            <CheckCircle2 className="text-[18px] text-green-600 font-fill" strokeWidth={1.5} />
            {notification}
          </motion.div>
        )}

        {isClearCartDialogOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="bg-white rounded-xl p-6 max-w-[340px] w-full shadow-2xl border border-black/10 text-center"
            >
              <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4 text-red-600">
                <Trash2 className="w-6 h-6" strokeWidth={1.8} />
              </div>
              <h3 className="text-[15px] font-bold text-neutral-900 mb-1">Clear entire bag?</h3>
              <p className="text-[12.5px] text-neutral-500 mb-6">
                Are you sure you want to remove all items from your bag? This cannot be undone.
              </p>
              <div className="flex gap-2.5">
                <button
                  onClick={() => setIsClearCartDialogOpen(false)}
                  className="flex-1 py-2.5 rounded-full border border-black/15 text-neutral-700 font-bold text-[11px] uppercase tracking-wider hover:bg-neutral-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmClearCart}
                  className="flex-1 py-2.5 rounded-full bg-red-600 text-white font-bold text-[11px] uppercase tracking-wider hover:bg-red-700 transition-colors shadow-xs cursor-pointer"
                >
                  Clear Bag
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Checkout Steps - Sits directly beneath CheckoutNavbar */}
      {!isEmbedded && (
        <CheckoutSteps
          steps={['BAG', 'ADDRESS', 'PAYMENT']}
          currentStep={0}
          onStepClick={(stepIndex) => {
            if (stepIndex > 0 && items.length > 0) {
              navigate('/checkout');
            }
          }}
        />
      )}

      {/* Address Bar */}
      {!isEmbedded && (
        <div className="mb-3 lg:mb-4">
          <CartAddressBar
            isAddressDropdownOpen={isAddressDropdownOpen}
            setIsAddressDropdownOpen={setIsAddressDropdownOpen}
            activeAddress={activeAddress}
            addresses={addresses}
            setDefaultAddress={setDefaultAddress}
          />
        </div>
      )}

      <div className="max-w-[1240px] mx-auto px-3 sm:px-6">
        {items.length === 0 ? (
          <CartEmptyState />
        ) : (
          <>
            {/* Page Header */}
            <div className="pt-2 pb-4 flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
              <div>
                <h1 className="text-[18px] sm:text-[20px] font-bold text-neutral-900 tracking-tight leading-none">
                  Shopping Bag
                </h1>
              </div>
              <p className="text-[12px] text-neutral-500 font-medium">
                Fresh homestyle delicacies, prepared with care
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6">
              {/* Left Content List: Cart Entities */}
              <div className="lg:col-span-7 xl:col-span-8 space-y-3">
                {discountOnMRP > 0 && (
                  <div className="bg-[#fef9e7] border border-[#fae182] text-neutral-950 text-[12px] font-bold rounded-lg flex items-center justify-between p-3 gap-2 shadow-sm mb-3">
                    <div className="flex items-center gap-2">
                      <BadgeCheck className="w-4 h-4 text-[#d99b00]" strokeWidth={2.2} />
                      <span>Total Savings on MRP</span>
                    </div>
                    <span className="font-extrabold text-emerald-700 text-[13px]">
                      − ₹{discountOnMRP.toLocaleString()}
                    </span>
                  </div>
                )}

                <div className="bg-white rounded-lg p-3 sm:p-3.5 flex items-center justify-between font-bold text-[11px] uppercase tracking-wider shadow-sm border border-neutral-200 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-neutral-950 font-extrabold">
                      {cartCount} {cartCount === 1 ? 'Item' : 'Items'} in Bag
                    </span>
                    <span className="text-neutral-300">·</span>
                    <span className="text-neutral-600 font-bold">
                      ₹{actualSubtotal.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-neutral-500">
                    <button
                      onClick={handleMoveAllToWishlist}
                      className="hover:text-black transition-colors flex items-center gap-1.5 text-[10.5px] font-extrabold cursor-pointer"
                      title="Move All to Wishlist"
                    >
                      <Heart className="w-3.5 h-3.5" strokeWidth={2} />
                      <span className="hidden sm:inline">Save All</span>
                    </button>
                    <span className="text-neutral-200">|</span>
                    <button
                      onClick={handleClearCart}
                      className="hover:text-red-600 transition-colors flex items-center gap-1.5 text-[10.5px] font-extrabold cursor-pointer"
                      title="Delete All"
                    >
                      <Trash2 className="w-3.5 h-3.5" strokeWidth={2} />
                      <span className="hidden sm:inline">Clear</span>
                    </button>
                  </div>
                </div>

                {/* Order Limits Warning Banner */}
                {orderLimitError && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-amber-900 shadow-xs mb-3"
                  >
                    <div className="flex items-start gap-2.5">
                      <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-[12px] font-bold text-amber-900 leading-tight">
                          Order Requirement Notice
                        </p>
                        <p className="text-[11px] text-amber-800/90 mt-0.5 leading-snug">
                          {orderLimitError}
                        </p>
                      </div>
                    </div>
                    {hasQuantityViolation && (
                      <button
                        type="button"
                        onClick={handleFixOverLimitQuantities}
                        className="shrink-0 px-3.5 py-1.5 rounded-full bg-amber-600 hover:bg-amber-700 active:scale-95 text-white font-bold text-[11px] uppercase tracking-wider transition-all cursor-pointer shadow-xs"
                      >
                        Fix Quantities to {maxQuantityPerItem}
                      </button>
                    )}
                  </motion.div>
                )}

                <motion.div layout className="space-y-3">
                  <AnimatePresence>
                    {items.map((item) => {
                      const uniqueKey = `${item.id || item._id}-${item.variant}`;
                      return (
                        <CartItemRow
                          key={uniqueKey}
                          item={item}
                          settings={settings}
                          removeItem={removeItem}
                          updateQuantity={updateQuantity}
                          handleMoveToWishlist={handleMoveToWishlist}
                          triggerNotification={triggerNotification}
                        />
                      );
                    })}
                  </AnimatePresence>
                </motion.div>

                <div className="mt-2 lg:mt-6">
                  <React.Suspense fallback={<Skeleton className="h-52 w-full rounded-2xl" />}>
                    <RecommendationSystem
                      category={
                        items.length > 0
                          ? items[0].product?.category || items[0].category
                          : undefined
                      }
                      currentProductId={
                        items.length > 0
                          ? items[0].product?._id ||
                            items[0].product?.id ||
                            String(items[0].id || items[0]._id).split('___')[0]
                          : undefined
                      }
                      hideHeader={false}
                      horizontalScroll={true}
                      compact={true}
                    />
                  </React.Suspense>
                </div>
              </div>

              {/* Right Column Pane */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: 0.1 }}
                className="lg:col-span-5 xl:col-span-4 space-y-3"
              >
                <CartSummary
                  loading={loading}
                  cartCount={cartCount}
                  totalMRP={totalMRP}
                  actualSubtotal={actualSubtotal}
                  discountOnMRP={discountOnMRP}
                  platformFee={platformFee}
                  shippingFee={shippingFee}
                  finalPayableAmount={finalPayableAmount}
                  runProtectedAction={runProtectedAction}
                  navigate={navigate}
                  orderLimitError={orderLimitError}
                  orderLimitButtonText={orderLimitButtonText}
                />
              </motion.div>
            </div>
          </>
        )}
      </div>
    </>
  );

  return (
    <Profiler id="CartView" onRender={logRenderMetrics}>
      <>
        {isEmbedded ? (
          <div className="w-full text-neutral-950">{innerContent}</div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
            className="bg-white min-h-screen pb-24 lg:pb-16 font-body text-neutral-950 modern-sans-headings"
          >
            {innerContent}
          </motion.div>
        )}

        {/* Sticky Footer for Mobile */}
        {items.length > 0 &&
          createPortal(
            <motion.div
              initial={{ y: 100 }}
              animate={{ y: 0 }}
              className="fixed bottom-0 left-0 w-full h-[calc(68px+var(--safe-area-bottom,_env(safe-area-inset-bottom,_0px)))] lg:hidden z-[100] bg-white/95 backdrop-blur-xl border-t border-black/[0.08] px-4 sm:px-6 pb-[var(--safe-area-bottom,_env(safe-area-inset-bottom,_0px))] flex items-center justify-between gap-3 shadow-[0_-8px_30px_rgba(0,0,0,0.06)] select-none"
            >
              <div className="flex flex-col justify-center truncate">
                <span className="font-sans text-[10px] uppercase tracking-wider text-neutral-500 font-bold leading-none">
                  {cartCount} item{cartCount !== 1 ? 's' : ''} in Bag
                </span>
                <div className="flex items-baseline gap-1.5 mt-1">
                  <span className="text-[18px] text-neutral-950 font-bold leading-none">
                    ₹{finalPayableAmount.toLocaleString('en-IN')}
                  </span>
                  {totalMRP > finalPayableAmount && (
                    <span className="text-[11px] text-neutral-400 line-through">
                      ₹{totalMRP.toLocaleString('en-IN')}
                    </span>
                  )}
                </div>
              </div>
              <button
                disabled={Boolean(isStoreClosed || orderLimitError)}
                onClick={() => {
                  if (isStoreClosed) {
                    toast(
                      'Online checkout is currently paused while the store is in catalog-only mode.',
                    );
                    return;
                  }
                  if (orderLimitError) {
                    toast.error(orderLimitError);
                    return;
                  }
                  runProtectedAction(() => {
                    sessionStorage.removeItem('akula_checkout_step');
                    navigate('/checkout');
                  });
                }}
                className={`h-11 pl-4 pr-1.5 py-1 rounded-full font-sans text-xs uppercase tracking-wider font-extrabold shadow-sm active:scale-[0.98] transition-all flex items-center justify-between gap-2.5 border shrink-0 group ${
                  isStoreClosed || orderLimitError
                    ? 'bg-neutral-100 text-neutral-400 border-neutral-200 cursor-not-allowed'
                    : 'bg-[#f7bb0e] text-neutral-950 border-[#f7bb0e] hover:bg-[#eab00d] shadow-[0_2px_0_0_#d99b00,0_4px_12px_rgba(247,187,14,0.3)] cursor-pointer'
                }`}
              >
                {isStoreClosed ? (
                  <div className="flex items-center gap-1.5 px-2">
                    <Lock className="w-3.5 h-3.5 text-neutral-500" />
                    <span>Paused</span>
                  </div>
                ) : orderLimitError ? (
                  <div className="flex items-center gap-1.5 px-2">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-700" />
                    <span>{orderLimitButtonText || 'Limits Not Met'}</span>
                  </div>
                ) : (
                  <>
                    <span className="font-extrabold text-[12px] uppercase tracking-wider text-neutral-950">
                      Checkout
                    </span>
                    <span className="w-8 h-8 rounded-full bg-white text-neutral-950 flex items-center justify-center shrink-0 shadow-xs transition-transform duration-200 group-hover:scale-105">
                      <ArrowRight
                        className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5"
                        strokeWidth={2.5}
                        aria-hidden="true"
                      />
                    </span>
                  </>
                )}
              </button>
            </motion.div>,
            document.body,
          )}
      </>
    </Profiler>
  );
}
