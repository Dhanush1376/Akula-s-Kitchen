import { ShoppingBag, Trash2, ArrowLeft, Plus, Minus, Image, ArrowRight, X } from 'lucide-react';
import { m as motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { EmptyState } from '../ui';
import { CloudinaryImage } from '../ui/CloudinaryImage';
import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useCart } from '../../context/CartContext';
import { prefetchManager } from '../../utils/performance/prefetchManager';

import { useScrollLock } from '../../hooks/useScrollLock';
import { useConfig } from '../../context/ConfigContext';

const getItemImage = (item) => {
  const candidate =
    item.imageSrc ||
    item.image ||
    item.product?.imageSrc ||
    (Array.isArray(item.product?.images) && item.product.images[0]) ||
    item.product?.image ||
    (Array.isArray(item.images) && item.images[0]);
  if (!candidate) return '';
  if (typeof candidate === 'string') return candidate;
  if (typeof candidate === 'object')
    return candidate.url || candidate.secure_url || candidate.src || '';
  return '';
};

export function CartDrawer({ isOpen, onClose }) {
  const { items, removeItem, updateQuantity, subtotal, cartCount, loading } = useCart();

  const {
    maxQuantityPerItem = 10,
    maxItemsPerOrder = 5,
    minOrderValue = 0,
    maxOrderValue = 100000,
  } = useConfig();

  const navigate = useNavigate();

  const [confirmingRemove, setConfirmingRemove] = React.useState(null);

  const drawerRef = React.useRef(null);
  const triggerElementRef = React.useRef(null);

  useScrollLock(isOpen);

  useEffect(() => {
    if (isOpen) {
      triggerElementRef.current = document.activeElement;

      const focusableElements = drawerRef.current?.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (focusableElements && focusableElements.length > 0) {
        focusableElements[0].focus();
      }

      const handleKeyDown = (e) => {
        if (e.key === 'Escape') onClose();
        if (e.key === 'Tab' && focusableElements) {
          const first = focusableElements[0];
          const last = focusableElements[focusableElements.length - 1];
          if (e.shiftKey && document.activeElement === first) {
            last.focus();
            e.preventDefault();
          } else if (!e.shiftKey && document.activeElement === last) {
            first.focus();
            e.preventDefault();
          }
        }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        window.removeEventListener('keydown', handleKeyDown);
        if (triggerElementRef.current) {
          triggerElementRef.current.focus();
        }
      };
    }
  }, [isOpen, onClose]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-xs z-[200]"
          />

          {/* Drawer Panel */}
          <motion.div
            ref={drawerRef}
            initial={{ x: '100%', opacity: 0.5 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0.5 }}
            transition={{ type: 'spring', damping: 28, stiffness: 250, mass: 0.8 }}
            drag="x"
            dragDirectionLock
            dragConstraints={{ left: 0, right: 100 }}
            dragElastic={0.1}
            onDragEnd={(e, { offset, velocity }) => {
              if (offset.x > 80 || velocity.x > 400) {
                onClose();
              }
            }}
            className="fixed right-3 top-3 bottom-3 sm:right-4 sm:top-4 sm:bottom-4 w-[calc(100vw-24px)] max-w-[390px] sm:max-w-[430px] h-[calc(100dvh-24px)] sm:h-[calc(100dvh-32px)] bg-white/95 backdrop-blur-2xl z-[210] flex flex-col shadow-[0_16px_50px_rgba(0,0,0,0.18),inset_0_1px_1px_rgba(255,255,255,0.9)] touch-pan-y overscroll-contain rounded-3xl border border-black/[0.08] modern-sans-headings font-body overflow-hidden"
            style={{
              marginTop: 'env(safe-area-inset-top, 0px)',
              marginBottom: 'env(safe-area-inset-bottom, 0px)',
            }}
          >
            {/* Header */}
            <div className="flex justify-between items-center px-5 py-4 border-b border-black/[0.06] bg-white/80 sticky top-0 z-10 backdrop-blur-md">
              <div className="flex items-center gap-2.5">
                <span
                  className="font-label text-[13px] font-extrabold uppercase tracking-[0.18em] text-neutral-900 leading-none"
                  style={{ fontFamily: 'var(--font-label)' }}
                >
                  Cart
                </span>
                {cartCount > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="bg-[#f7bb0e] text-neutral-950 text-[11px] font-extrabold px-2.5 py-0.5 rounded-full shadow-xs"
                  >
                    {cartCount}
                  </motion.span>
                )}
              </div>
              <button
                onClick={onClose}
                className="w-9 h-9 rounded-full bg-neutral-100/80 hover:bg-neutral-200 active:scale-95 flex items-center justify-center text-neutral-700 hover:text-black transition-all cursor-pointer"
                aria-label="Close cart"
              >
                <X className="w-4 h-4 text-neutral-800" strokeWidth={2} />
              </button>
            </div>

            {/* Items List */}
            <div className="flex-1 overflow-y-auto overscroll-contain touch-pan-y px-5 pt-3.5 pb-6 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-black/10 hover:scrollbar-thumb-black/20">
              {loading && items.length === 0 ? (
                <div className="space-y-4">
                  {Array.from({ length: Math.max(1, cartCount || 3) }).map((_, i) => (
                    <div
                      key={i}
                      className="flex gap-4 p-3.5 rounded-2xl border border-black/[0.03] bg-white/50 animate-pulse shadow-sm"
                    >
                      <div className="w-[82px] h-[100px] rounded-[14px] bg-black/5" />
                      <div className="flex-1 py-1.5 space-y-3">
                        <div className="h-4 bg-black/5 rounded w-3/4" />
                        <div className="h-3 bg-black/5 rounded w-1/2" />
                        <div className="h-5 bg-black/5 rounded w-1/3 mt-4" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : items.length === 0 ? (
                <div className="h-full flex items-center justify-center">
                  <EmptyState
                    title="Your bag is empty"
                    description="Batters, chutneys, pickles, podis and more, made fresh in our kitchen."
                    icon="shopping_bag"
                    actionLabel="Explore Collections"
                    onAction={() => {
                      onClose();
                      navigate('/collections');
                    }}
                  />
                </div>
              ) : (
                <div className="flex flex-col gap-5">
                  {items.length > 0 && (
                    <div className="space-y-3">
                      <div
                        className="font-label text-[11px] font-bold uppercase tracking-[0.18em] text-[#000000] flex items-center gap-2 ml-0.5"
                        style={{ fontFamily: 'var(--font-label)' }}
                      >
                        <ShoppingBag className="text-[14px] text-primary" strokeWidth={1.8} />
                        <span>In Your Bag</span>
                      </div>
                      <div className="space-y-3">
                        <AnimatePresence mode="popLayout">
                          {items.map((item) => {
                            const itemImage = getItemImage(item);
                            return (
                              <motion.div
                                layout
                                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{
                                  opacity: 0,
                                  scale: 0.95,
                                  x: -30,
                                  transition: { duration: 0.2 },
                                }}
                                key={`${item.id || item._id}-${item.variant || ''}`}
                                className="relative flex gap-4 p-3.5 rounded-2xl bg-gradient-to-br from-white to-[#fafafa] border border-black/[0.05] shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)] hover:-translate-y-0.5 transition-all duration-300 group"
                              >
                                <div className="w-[82px] h-[100px] rounded-[14px] overflow-hidden flex-shrink-0 bg-[#f5f5f5] relative shadow-inner border border-black/[0.03]">
                                  {itemImage ? (
                                    <CloudinaryImage
                                      src={itemImage}
                                      alt={item.title}
                                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                      containerClassName="w-full h-full"
                                      eager
                                      skipObserver
                                      loading="eager"
                                      width={164}
                                      height={200}
                                      sizes="82px"
                                      quality="auto:good"
                                      fallback={
                                        <div className="w-full h-full flex items-center justify-center opacity-30 bg-black/5">
                                          <Image className="text-[26px]" strokeWidth={1.5} />
                                        </div>
                                      }
                                    />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center opacity-20 bg-black/5">
                                      <Image className="text-[26px]" strokeWidth={1.5} />
                                    </div>
                                  )}
                                </div>
                                <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                                  <div>
                                    <p
                                      className="font-serif-heading text-[15px] font-medium leading-snug text-[#000000] truncate group-hover:text-primary transition-colors"
                                      style={{ fontFamily: 'var(--font-display)' }}
                                    >
                                      {item.title}
                                    </p>
                                    {item.variant && item.variant !== 'Default' && (
                                      <p className="font-body text-[10px] text-black/40 mt-1 uppercase tracking-wider font-bold">
                                        {item.variant}
                                      </p>
                                    )}
                                    {item.selectedOptions && item.selectedOptions.length > 0 && (
                                      <div className="flex flex-wrap gap-1 mt-1.5">
                                        {item.selectedOptions.map((opt, optIdx) => (
                                          <span
                                            key={optIdx}
                                            className="inline-flex items-center text-[10.5px] font-medium px-1.5 py-0.5 rounded bg-amber-50 text-amber-900 border border-amber-200/70"
                                          >
                                            <span className="opacity-75 mr-1">
                                              {opt.groupName}:
                                            </span>
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
                                    <p
                                      className="font-serif-heading text-[15px] text-[#000000] mt-1.5 font-bold lining-nums"
                                      style={{ fontFamily: 'var(--font-display)' }}
                                    >
                                      ₹{item.price?.toLocaleString()}
                                    </p>
                                  </div>
                                  <div className="flex items-center justify-between mt-3">
                                    <div className="flex items-center gap-1.5 bg-white shadow-sm border border-black/[0.04] px-1.5 py-1 rounded-full h-9">
                                      {item.quantity > 1 ? (
                                        <button
                                          onClick={() =>
                                            updateQuantity(
                                              item.id || item._id,
                                              item.variant,
                                              item.quantity - 1,
                                              item.configurationSignature,
                                            )
                                          }
                                          className="w-7 h-7 min-h-0 rounded-full flex items-center justify-center text-black/50 hover:bg-black/5 hover:text-[#000000] transition-all cursor-pointer active:scale-95"
                                          aria-label="Decrease quantity"
                                        >
                                          <Minus className="text-[16px]" strokeWidth={1.5} />
                                        </button>
                                      ) : (
                                        <div className="relative">
                                          <button
                                            onClick={() =>
                                              setConfirmingRemove({
                                                id: item.id || item._id,
                                                variant: item.variant,
                                                signature: item.configurationSignature,
                                              })
                                            }
                                            className={`w-7 h-7 min-h-0 rounded-full flex items-center justify-center transition-all cursor-pointer active:scale-95 ${confirmingRemove?.id === (item.id || item._id) && confirmingRemove?.signature === item.configurationSignature ? 'bg-[#ff3b30] text-white shadow-md' : 'text-black/30 hover:bg-[#ff3b30]/10 hover:text-[#ff3b30]'}`}
                                            aria-label="Confirm remove"
                                          >
                                            <span className="material-symbols-outlined text-[15px]">
                                              {confirmingRemove?.id === (item.id || item._id) &&
                                              confirmingRemove?.signature ===
                                                item.configurationSignature
                                                ? 'check'
                                                : 'delete'}
                                            </span>
                                          </button>
                                        </div>
                                      )}
                                      <span className="font-body text-[13px] w-6 text-center font-semibold text-[#000000]">
                                        {item.quantity}
                                      </span>
                                      <button
                                        onClick={() => {
                                          if (item.quantity >= maxQuantityPerItem) return;
                                          updateQuantity(
                                            item.id || item._id,
                                            item.variant,
                                            item.quantity + 1,
                                            item.configurationSignature,
                                          );
                                        }}
                                        disabled={
                                          item.quantity >= maxQuantityPerItem ||
                                          item.quantity >= (item.stock || 999)
                                        }
                                        className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                                          item.quantity >= maxQuantityPerItem ||
                                          item.quantity >= (item.stock || 999)
                                        }`}
                                        aria-label="Increase quantity"
                                      >
                                        <Plus className="text-[16px]" strokeWidth={1.5} />
                                      </button>
                                    </div>
                                  </div>
                                  {item.quantity > maxQuantityPerItem && (
                                    <div className="flex items-center justify-between text-[10px] text-amber-900 bg-amber-50 border border-amber-300 rounded px-2 py-1 mt-2">
                                      <span>Max limit is {maxQuantityPerItem}</span>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          updateQuantity(
                                            item.id || item._id,
                                            item.variant,
                                            maxQuantityPerItem,
                                            item.configurationSignature,
                                          )
                                        }
                                        className="underline font-bold text-amber-950 ml-2 cursor-pointer"
                                      >
                                        Set to {maxQuantityPerItem}
                                      </button>
                                    </div>
                                  )}
                                </div>
                                {confirmingRemove?.id === (item.id || item._id) &&
                                  confirmingRemove?.signature === item.configurationSignature && (
                                    <motion.button
                                      initial={{ opacity: 0 }}
                                      animate={{ opacity: 1 }}
                                      onClick={() => {
                                        removeItem(
                                          item.id || item._id,
                                          item.configurationSignature,
                                        );
                                        setConfirmingRemove(null);
                                      }}
                                      className="absolute inset-0 z-20 bg-[#ff3b30]/95 backdrop-blur-sm text-white flex flex-col items-center justify-center gap-1.5 rounded-3xl font-label text-[10px] uppercase tracking-widest font-bold shadow-inner transition-colors hover:bg-[#ff3b30]"
                                    >
                                      <Trash2 className="text-[24px] mb-1" strokeWidth={1.5} />
                                      Tap to remove
                                    </motion.button>
                                  )}
                              </motion.div>
                            );
                          })}
                        </AnimatePresence>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer with Totals & Promotions */}
            {items.length > 0 && (
              <div
                className="p-4 pt-3 border-t border-black/[0.04] space-y-2 bg-white/90 backdrop-blur-xl relative flex-shrink-0"
                style={{
                  paddingBottom: `calc(12px + var(--safe-area-bottom, env(safe-area-inset-bottom, 0px)))`,
                }}
              >
                {/* Subtotal */}
                <div className="flex justify-between items-center text-[12px]">
                  <span className="font-body text-black/50 font-medium">Subtotal</span>
                  <span
                    className="font-serif-heading font-bold text-[#000000] lining-nums text-[13px]"
                    style={{ fontFamily: 'var(--font-display)' }}
                  >
                    ₹{subtotal.toLocaleString()}
                  </span>
                </div>

                <div className="h-[1px] bg-gradient-to-r from-transparent via-black/[0.06] to-transparent my-1.5" />

                <div className="flex justify-between items-end">
                  <div className="space-y-0.5">
                    <span
                      className="font-serif-heading text-[14px] font-bold text-[#000000]"
                      style={{ fontFamily: 'var(--font-display)' }}
                    >
                      Estimated Total
                    </span>
                    <p className="font-body text-[9px] text-black/40 uppercase tracking-[0.1em] font-bold">
                      Shipping calculated at checkout
                    </p>
                  </div>
                  <span
                    className="font-serif-heading text-[19px] leading-none font-bold text-[#000000] lining-nums"
                    style={{ fontFamily: 'var(--font-display)' }}
                  >
                    ₹{subtotal.toLocaleString()}
                  </span>
                </div>

                <div className="pt-2 pb-1 flex items-center gap-2.5">
                  <Link
                    to="/cart"
                    onClick={onClose}
                    className="flex-1 flex items-center justify-center text-center h-12 rounded-full font-sans text-[11px] sm:text-[12px] uppercase tracking-wider text-neutral-900 bg-white hover:bg-neutral-50 border border-neutral-200 active:scale-[0.98] transition-all font-extrabold shadow-2xs group"
                  >
                    View Bag
                  </Link>
                  <Link
                    to="/checkout"
                    onMouseEnter={() =>
                      prefetchManager.prefetchRoute('/checkout', { kind: 'hover' })
                    }
                    onClick={onClose}
                    className="flex-[1.5] h-12 relative overflow-hidden bg-[#f7bb0e] hover:bg-[#eab00d] text-neutral-950 pl-5 pr-1.5 py-1 rounded-full font-sans text-[12px] uppercase tracking-wider active:scale-[0.98] transition-all shadow-sm font-extrabold group flex items-center justify-between border border-[#f7bb0e]"
                  >
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
                  </Link>
                </div>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
}
