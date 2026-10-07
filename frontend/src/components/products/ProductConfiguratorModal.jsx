import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles } from 'lucide-react';
import { ProductConfigurator } from './ProductConfigurator';
import { CloudinaryImage } from '../ui/CloudinaryImage';
import { formatPrice } from '../../utils/ecommerce/priceUtils';

/**
 * ProductConfiguratorModal
 * Adapts responsively:
 * - On desktop / laptop (>= 768px): Centered modal dialog with backdrop blur.
 * - On mobile (< 768px): Bottom drawer / sheet sliding up from bottom with safe-area handling.
 */
export function ProductConfiguratorModal({ isOpen, onClose, product, onAddToCart }) {
  const [quantity, setQuantity] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Lock background scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      setQuantity(1);
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen || !product) return null;

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
    product.imageSrc ||
    (Array.isArray(product.images) && product.images.length > 0 ? product.images[0] : null);

  const modalContent = (
    <AnimatePresence>
      <div className="fixed inset-0 z-[250] flex items-end md:items-center justify-center">
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

        {/* Modal / Sheet Container */}
        <motion.div
          initial={{ y: '100%', opacity: 0.8 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 28, stiffness: 280 }}
          className="relative w-full max-h-[90vh] md:max-h-[85vh] md:max-w-[560px] bg-white rounded-t-[28px] md:rounded-[24px] shadow-2xl flex flex-col z-10 overflow-hidden border border-black/10"
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
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md inline-block mb-1 border border-amber-200">
                  Customize & Choose Options
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
              ctaLabel="Add Configured Item"
            />
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );

  return createPortal(modalContent, document.body);
}
