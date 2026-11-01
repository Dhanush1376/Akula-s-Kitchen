import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { ProductConfigurator } from './ProductConfigurator';
import { CloudinaryImage } from '../ui/CloudinaryImage';
import { useScrollLock } from '../../hooks/useScrollLock';
import { useMediaQuery } from '../../hooks/useMediaQuery';

/**
 * ProductConfiguratorModal
 * Adapts responsively:
 * - On desktop / laptop (>= 768px): Centered pop-up modal dialog with backdrop blur.
 * - On mobile / phones (< 768px): App drawer / bottom sheet sliding up from bottom with safe-area handling.
 */
export function ProductConfiguratorModal({ isOpen, onClose, product, onAddToCart }) {
  const [quantity, setQuantity] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isMobile = useMediaQuery('(max-width: 767px)');

  // Shared, reference-counted lock: also tints the iOS Safari edge strip under the sheet
  useScrollLock(isOpen);

  useEffect(() => {
    if (!isOpen) setQuantity(1);
  }, [isOpen]);

  const handleAddToCartWrapper = async (configuredItem) => {
    setIsSubmitting(true);
    try {
      if (onAddToCart) {
        await onAddToCart(configuredItem);
      }
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const imageSrc =
    product?.imageSrc ||
    (Array.isArray(product?.images) && product.images.length > 0 ? product.images[0] : null);

  const modalContent = (
    <AnimatePresence>
      {isOpen && product && (
        <div className="fixed inset-0 z-[250] flex items-end md:items-center justify-center p-0 md:p-6">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            aria-hidden="true"
          />

          {/* Modal (Laptop Pop-up) & App Drawer (Phone Bottom Sheet) Container */}
          <motion.div
            initial={isMobile ? { y: '100%' } : { scale: 0.95, opacity: 0, y: 15 }}
            animate={isMobile ? { y: 0 } : { scale: 1, opacity: 1, y: 0 }}
            exit={isMobile ? { y: '100%' } : { scale: 0.95, opacity: 0, y: 15 }}
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
            className="relative w-full max-h-[90dvh] md:max-h-[85vh] md:max-w-[560px] bg-white rounded-t-3xl md:rounded-3xl shadow-[0_16px_50px_rgba(0,0,0,0.22)] flex flex-col z-10 overflow-hidden border border-black/10 pb-[env(safe-area-inset-bottom,0px)]"
            role="dialog"
            aria-modal="true"
            aria-labelledby="configurator-modal-title"
          >
            {/* Mobile Drag Pill */}
            <div className="md:hidden flex justify-center pt-3 pb-1">
              <div className="w-10 h-1.5 rounded-full bg-neutral-300" />
            </div>

            {/* Header */}
            <div className="flex items-start justify-between p-4 sm:p-5 border-b border-neutral-100 bg-neutral-50/60 shrink-0">
              <div className="flex items-center gap-3.5 pr-6">
                {imageSrc && (
                  <div className="w-12 h-12 rounded-xl overflow-hidden bg-neutral-100 border border-neutral-200/80 shrink-0">
                    <CloudinaryImage
                      src={imageSrc}
                      alt={product.title}
                      className="w-full h-full object-cover"
                      containerClassName="w-full h-full"
                      eager
                    />
                  </div>
                )}
                <div className="min-w-0">
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#283618] bg-[#f7bb0e]/20 px-2 py-0.5 rounded-md inline-block mb-1 border border-[#f7bb0e]/30">
                    Select Weight & Quantity
                  </span>
                  <h3
                    id="configurator-modal-title"
                    className="font-serif-heading text-[16px] sm:text-[18px] font-bold text-neutral-950 truncate leading-snug"
                    style={{ fontFamily: 'var(--font-display)' }}
                  >
                    {product.title}
                  </h3>
                </div>
              </div>

              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full flex items-center justify-center text-neutral-400 hover:text-neutral-950 hover:bg-neutral-200/60 transition-colors shrink-0 cursor-pointer"
                aria-label="Close dialog"
              >
                <X size={18} strokeWidth={2.5} />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-neutral-200">
              <ProductConfigurator
                product={product}
                quantity={quantity}
                onQuantityChange={setQuantity}
                onAddToCart={handleAddToCartWrapper}
                mode="modal"
                isSubmitting={isSubmitting}
                ctaLabel="Add to Bag"
              />
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  return createPortal(modalContent, document.body);
}
