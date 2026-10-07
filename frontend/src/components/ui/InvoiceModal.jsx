import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { m as motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { InvoiceTemplate } from './InvoiceTemplate';
import { AuthCornerLeaves } from '../auth/AuthCornerLeaves';
import { useMobileDrawerEngine } from '../../hooks/useMobileDrawerEngine';

/**
 * InvoiceModal
 * Redesigned according to the AuthModal and FilterPanel drawer design system:
 * - Floating bottom sheet on mobile (<640px) with drag-to-dismiss gesture engine
 * - Floating centered card modal on desktop
 * - Signature Akula's Kitchen organic corner leaves decoration
 * - Frosted glassmorphism background (bg-white/95 backdrop-blur-2xl)
 * - Rounded-3xl corners with subtle border & depth shadow
 * - Sleek circular close button and pill grab handle
 * - Bottom action bar with primary "Download PDF" and "Print (A4)" actions
 */
export function InvoiceModal({
  isOpen = false,
  onClose,
  order = null,
  user = {},
  isAdmin = false,
}) {
  const [mounted, setMounted] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const invoiceRef = useRef(null);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  const { isMobile, dragProps, sheetTransition } = useMobileDrawerEngine({
    isOpen,
    onClose,
  });

  // Listen to Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen && onClose) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

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

  const handleDownload = async () => {
    if (invoiceRef.current?.handleDownload) {
      setIsDownloading(true);
      try {
        await invoiceRef.current.handleDownload();
      } finally {
        setIsDownloading(false);
      }
    }
  };

  const handlePrint = () => {
    if (invoiceRef.current?.handlePrint) {
      invoiceRef.current.handlePrint();
    } else {
      window.print();
    }
  };

  if (!mounted || !order) return null;

  const invoiceNumber =
    order.invoice?.number ||
    order.invoiceNumber ||
    (order._id ? `INV-${order._id.slice(-8).toUpperCase()}` : 'INVOICE');

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-[9999] pointer-events-none flex items-end sm:items-center justify-center p-3 sm:p-5 md:p-6 no-print"
          role="dialog"
          aria-modal="true"
          aria-labelledby="invoice-modal-title"
        >
          {/* Backdrop */}
          <motion.div
            key="invoice-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-xs pointer-events-auto cursor-pointer"
          />

          {/* Floating Card Modal / Bottom Sheet */}
          <motion.div
            key="invoice-card"
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            {...(isMobile ? dragProps : {})}
            className="relative z-10 pointer-events-auto flex flex-col w-full max-w-[500px] md:max-w-[530px] mx-auto"
            style={{
              marginBottom: isMobile ? 'env(safe-area-inset-bottom, 0px)' : undefined,
            }}
          >
            <div className="relative w-full bg-white/95 backdrop-blur-2xl rounded-3xl p-3 sm:p-4.5 shadow-[0_16px_50px_rgba(0,0,0,0.18)] border border-black/[0.08] flex flex-col max-h-[90dvh] sm:max-h-[92vh] overflow-hidden">
              {/* Decorative signature corner leaves */}
              <AuthCornerLeaves />

              {/* Grab handle for mobile bottom sheet */}
              <div
                className="sm:hidden w-full flex justify-center pt-0 pb-2 cursor-grab select-none z-20"
                onClick={onClose}
              >
                <div className="w-10 h-1 rounded-full bg-neutral-300" />
              </div>

              {/* Top Header Row with Title & Invoice Number Badge */}
              <div className="relative z-10 flex items-center justify-between pb-2 mb-1.5 border-b border-black/[0.06] pr-10">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-7 h-7 rounded-full bg-[#283618]/10 text-[#283618] flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[16px]">receipt_long</span>
                  </div>
                  <h3
                    id="invoice-modal-title"
                    className="font-serif-heading text-[15px] sm:text-[17px] font-bold text-neutral-900 tracking-tight truncate"
                    style={{ fontFamily: 'var(--font-display)' }}
                  >
                    Tax Invoice
                  </h3>
                  <span className="text-[10px] font-mono font-bold bg-neutral-100 text-neutral-700 px-2 py-0.5 rounded-full border border-neutral-200/80 truncate">
                    {invoiceNumber}
                  </span>
                </div>
              </div>

              {/* Close Button matching AuthModal & FilterPanel */}
              <button
                onClick={onClose}
                className="absolute top-3 right-3 sm:top-4 sm:right-4 w-8 h-8 sm:w-8.5 sm:h-8.5 rounded-full bg-neutral-100 hover:bg-neutral-200 active:scale-95 flex items-center justify-center text-neutral-700 hover:text-black transition-all z-30 cursor-pointer shadow-2xs"
                aria-label="Close invoice"
              >
                <X className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-black" strokeWidth={2.2} />
              </button>

              {/* Scrollable Document Area containing the authentic A4 Invoice Sheet */}
              <div className="relative z-10 flex-1 overflow-y-auto overscroll-contain touch-pan-y no-scrollbar pt-1 flex justify-center">
                <InvoiceTemplate
                  ref={invoiceRef}
                  order={order}
                  user={user}
                  isAdmin={isAdmin}
                  isEmbedded={true}
                />
              </div>

              {/* Bottom Action Bar matching FilterPanel & AuthModal */}
              <div className="relative z-10 mt-2.5 pt-2.5 border-t border-black/[0.06] flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDownload}
                  disabled={isDownloading}
                  className="flex-1 bg-[#283618] hover:bg-[#1f2b13] active:scale-[0.98] text-white py-3 px-4 rounded-full font-sans text-[12px] sm:text-[12.5px] uppercase tracking-wider font-bold shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70"
                >
                  <span className="material-symbols-outlined text-[17px]">
                    {isDownloading ? 'hourglass_top' : 'download'}
                  </span>
                  <span>{isDownloading ? 'Generating PDF...' : 'Download PDF'}</span>
                </button>

                <button
                  type="button"
                  onClick={handlePrint}
                  className="w-11 h-11 shrink-0 rounded-full border border-black/[0.1] bg-white hover:bg-neutral-50 active:scale-95 flex items-center justify-center transition-all cursor-pointer shadow-2xs text-neutral-800 hover:text-black"
                  title="Print Invoice (A4)"
                  aria-label="Print Invoice"
                >
                  <span className="material-symbols-outlined text-[19px]">print</span>
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
