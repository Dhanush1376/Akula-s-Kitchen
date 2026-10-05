import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

export function AppDrawer({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = 'max-w-[500px]',
  headerIcon: HeaderIcon,
}) {
  // Prevent body scrolling when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[1050] pointer-events-none">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-xs pointer-events-auto"
          />

          {/* Floating Drawer Island */}
          <motion.div
            initial={{ y: '100%', opacity: 0.5 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 260, mass: 0.8 }}
            className={`fixed bottom-3 left-3 right-3 sm:bottom-4 sm:left-4 sm:right-4 z-10 pointer-events-auto flex flex-col ${maxWidth} mx-auto`}
            style={{
              marginBottom: 'env(safe-area-inset-bottom, 0px)',
            }}
          >
            <div className="relative w-full bg-white/95 backdrop-blur-2xl rounded-3xl p-5 sm:p-6 shadow-[0_12px_45px_rgba(0,0,0,0.18)] flex flex-col max-h-[85dvh] overflow-hidden border border-black/[0.08]">
              {/* Handlebar */}
              <div
                onClick={onClose}
                className="w-full flex justify-center items-center pb-2 shrink-0 cursor-grab active:cursor-grabbing select-none"
              >
                <div className="w-10 h-1 rounded-full bg-neutral-300" />
              </div>

              {/* Close Button */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 w-9 h-9 rounded-full bg-neutral-100 hover:bg-neutral-200 active:scale-95 flex items-center justify-center text-neutral-700 hover:text-black transition-all z-10 cursor-pointer"
                aria-label="Close drawer"
              >
                <X className="w-4 h-4 text-black" strokeWidth={2} />
              </button>

              {/* Header */}
              {(title || subtitle) && (
                <div className="flex items-center justify-between pb-3.5 mb-3 border-b border-black/[0.06] pr-10">
                  <div className="flex items-center gap-2.5">
                    {HeaderIcon && (
                      <div className="w-8 h-8 rounded-full bg-[#283618]/10 text-[#283618] flex items-center justify-center shrink-0">
                        <HeaderIcon className="w-4 h-4" strokeWidth={2} />
                      </div>
                    )}
                    <div>
                      {title && (
                        <h2 className="font-sans text-[16px] sm:text-[18px] font-bold text-neutral-900 leading-tight">
                          {title}
                        </h2>
                      )}
                      {subtitle && (
                        <p className="font-sans text-[10.5px] uppercase tracking-wider text-neutral-500 font-semibold mt-0.5">
                          {subtitle}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Content Body */}
              <div className="flex-1 overflow-y-auto overscroll-contain touch-pan-y no-scrollbar pt-1">
                {children}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
