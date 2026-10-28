import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { m as motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, X } from 'lucide-react';
import { usePwa } from '../../context/PwaContext';

export function PwaUpdatePrompt() {
  const { isUpdateAvailable, applyUpdate, isStandalone, isInstalled } = usePwa();
  const [isDismissed, setIsDismissed] = useState(false);
  const location = useLocation();

  // Show update prompt ONLY for users who actually downloaded / installed the app
  const hasAppDownloaded = isStandalone || isInstalled;

  // Never interrupt active checkout or payment flows
  const isCheckoutRoute =
    location.pathname === '/checkout' ||
    location.pathname.startsWith('/checkout') ||
    location.pathname === '/order-success' ||
    location.pathname.startsWith('/order-success');

  if (!isUpdateAvailable || isDismissed || isCheckoutRoute || !hasAppDownloaded) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        role="alert"
        aria-live="polite"
        initial={{ y: 50, opacity: 0, scale: 0.95 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 50, opacity: 0, scale: 0.95 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="fixed bottom-[calc(76px+var(--safe-area-bottom,env(safe-area-inset-bottom,0px)))] sm:bottom-6 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-[130] pointer-events-auto"
      >
        <div className="relative overflow-hidden bg-gradient-to-r from-[#1b2510]/95 via-[#233215]/95 to-[#1b2510]/95 backdrop-blur-md text-white p-3 sm:px-4 sm:py-3.5 rounded-2xl sm:rounded-3xl shadow-[0_16px_40px_rgba(0,0,0,0.45)] border border-[#283618] ring-1 ring-[#F7BB0E]/20 flex items-center justify-between gap-3">
          {/* Left: App Logo Squircle & Info */}
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="relative shrink-0">
              <div className="w-10 h-10 rounded-[22%] bg-white shadow-md ring-1 ring-black/10 p-0.5 flex items-center justify-center overflow-hidden">
                <img
                  src="/MainLogo.png"
                  alt="Akula's Kitchen"
                  width={40}
                  height={40}
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-[#F7BB0E] text-neutral-950 flex items-center justify-center ring-2 ring-[#1b2510] shadow-xs">
                <RefreshCw className="w-2.5 h-2.5 stroke-[2.5]" />
              </div>
            </div>

            <div className="min-w-0">
              <p className="text-[12.5px] sm:text-[13px] font-sans font-extrabold text-white tracking-tight leading-tight">
                App Update Available
              </p>
              <p className="text-[10.5px] sm:text-[11px] text-neutral-300/85 leading-tight truncate mt-0.5">
                New features are ready to install
              </p>
            </div>
          </div>

          {/* Right: Golden Action Button & Close */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              type="button"
              onClick={applyUpdate}
              className="relative overflow-hidden bg-gradient-to-r from-[#F7BB0E] via-[#FFCB36] to-[#F7BB0E] hover:brightness-105 active:scale-95 text-neutral-950 font-extrabold text-xs px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-full shadow-[0_2px_10px_rgba(247,187,14,0.35)] flex items-center gap-1.5 transition-all cursor-pointer border border-amber-300/50"
            >
              {/* Continuous Reflection Sheen */}
              <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-full z-0">
                <div className="absolute top-0 left-0 w-1/2 h-full bg-gradient-to-r from-transparent via-white/55 to-transparent -skew-x-25 animate-reflection-sheen" />
              </div>
              <RefreshCw className="w-3.5 h-3.5 stroke-[2.5] relative z-10" />
              <span className="relative z-10">Update</span>
            </button>

            <button
              type="button"
              onClick={() => setIsDismissed(true)}
              aria-label="Dismiss update notification"
              className="w-7 h-7 rounded-full text-neutral-400 hover:text-white hover:bg-white/10 flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
