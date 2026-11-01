import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { ProductConfigurator } from './ProductConfigurator';
import { CloudinaryImage } from '../ui/CloudinaryImage';
import { AuthCornerLeaves } from '../auth/AuthCornerLeaves';
import { useMobileDrawerEngine } from '../../hooks/useMobileDrawerEngine';

/**
 * ProductConfiguratorModal
 * Styled according to the FilterPanel and InvoiceModal design system:
 * - Floating bottom sheet on mobile (<640px) with drag-to-dismiss gesture engine
 * - Floating centered card modal on desktop
 * - Signature Akula's Kitchen organic corner leaves decoration
 * - Frosted glassmorphism background (bg-white/95 backdrop-blur-2xl)
 * - Rounded-3xl corners with subtle border & depth shadow
 * - Sleek circular close button and pill grab handle
 * - Brand Forest Olive Green (#283618) action styling
 */
export function ProductConfiguratorModal({ isOpen, onClose, product, onAddToCart }) {
  const [quantity, setQuantity] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { isMobile, dragProps, sheetTransition } = useMobileDrawerEngine({
    isOpen,
    onClose,
  });

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

  const modalContent = (
    <AnimatePresence>
      {isOpen && product && (
        <div
          className="fixed inset-0 z-[9999] pointer-events-none flex items-end sm:items-center justify-center p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] sm:p-5 md:p-6 no-print"
          role="dialog"
          aria-modal="true"
          aria-labelledby="configurator-modal-title"
        >
          {/* Backdrop */}
          <motion.div
            key="config-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed -inset-x-0 -top-40 -bottom-40 bg-black/60 sm:bg-black/40 backdrop-blur-xs pointer-events-auto cursor-pointer"
            aria-hidden="true"
          />

          {/* Floating Sheet on Mobile / Centered Card on Desktop */}
          <motion.div
            key="config-card"
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            {...(isMobile ? dragProps : {})}
            className="relative z-10 pointer-events-auto flex flex-col w-full max-w-[480px] sm:max-w-[520px] mx-auto"
          >
            <div className="relative w-full bg-white/95 backdrop-blur-2xl rounded-2xl sm:rounded-3xl p-4 sm:p-5 pb-5 sm:pb-5 shadow-[0_16px_50px_rgba(0,0,0,0.22)] border border-black/[0.08] flex flex-col max-h-[85dvh] sm:max-h-[88vh] overflow-hidden">
              {/* Decorative signature corner leaves */}
              <AuthCornerLeaves />

              {/* Grab handle for mobile bottom sheet */}
              <div
                className="sm:hidden w-full flex justify-center pt-0 pb-2 cursor-grab select-none z-20"
                onClick={onClose}
              >
                <div className="w-10 h-1 rounded-full bg-neutral-300" />
              </div>

              {/* Top Header Row */}
              <div className="relative z-10 flex items-center justify-between pb-3 mb-2 border-b border-black/[0.06] pr-10">
                <div className="flex items-center gap-3 min-w-0">
                  {imageSrc && (
                    <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl overflow-hidden bg-neutral-100 border border-black/[0.08] shrink-0 shadow-2xs">
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
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#283618] bg-[#283618]/10 px-2 py-0.5 rounded-full inline-block mb-1">
                      Select Weight & Quantity
                    </span>
                    <h3
                      id="configurator-modal-title"
                      className="font-serif-heading text-[16px] sm:text-[18px] font-bold text-neutral-900 truncate leading-snug"
                      style={{ fontFamily: 'var(--font-display)' }}
                    >
                      {product.title}
                    </h3>
                  </div>
                </div>

                {/* Circular close button matching Filter & Invoice panel */}
                <button
                  onClick={onClose}
                  className="absolute top-0 right-0 w-8.5 h-8.5 rounded-full bg-neutral-100 hover:bg-neutral-200 active:scale-95 flex items-center justify-center text-neutral-700 hover:text-black transition-all z-20 cursor-pointer"
                  aria-label="Close dialog"
                >
                  <X className="w-4 h-4 text-black" strokeWidth={2.2} />
                </button>
              </div>

              {/* Scrollable Body */}
              <div className="relative z-10 flex-1 overflow-y-auto overscroll-contain touch-pan-y no-scrollbar pt-1">
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
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  return createPortal(modalContent, document.body);
}
