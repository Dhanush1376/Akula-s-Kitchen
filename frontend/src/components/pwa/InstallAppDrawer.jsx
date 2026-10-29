import React, { useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { m as motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Download,
  Share,
  PlusSquare,
  ExternalLink,
  CheckCircle2,
  MousePointerClick,
  Clock,
  Smartphone,
} from 'lucide-react';
import { usePwa } from '../../context/PwaContext';
import { AuthCornerLeaves } from '../auth/AuthCornerLeaves';

export function InstallAppDrawer() {
  const {
    isInstallDrawerOpen,
    closeInstallDrawer,
    promptNativeInstall,
    hasDeferredPrompt,
    isIosSafari,
    isIos,
    isInstalled,
    redirectToInstalledApp,
  } = usePwa();

  // Escape key handler
  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Escape') {
        closeInstallDrawer();
      }
    },
    [closeInstallDrawer],
  );

  useEffect(() => {
    if (!isInstallDrawerOpen) return;
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isInstallDrawerOpen, handleKeyDown]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {isInstallDrawerOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="pwa-install-title"
          className="fixed inset-0 z-[140] pointer-events-none flex items-end sm:items-center justify-center p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] sm:p-6 md:p-8"
        >
          {/* Dark blurred background overlay spanning entire viewport and safe area */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed -inset-x-0 -top-40 -bottom-40 bg-black/60 sm:bg-black/40 backdrop-blur-xs pointer-events-auto cursor-pointer"
            onClick={closeInstallDrawer}
            aria-hidden="true"
          />

          {/* Card Modal Container - styled exactly matching AuthModal shape */}
          <motion.div
            initial={{ y: 40, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 40, opacity: 0, scale: 0.98 }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="relative z-10 pointer-events-auto flex flex-col w-full max-w-[450px] md:max-w-[475px] mx-auto"
          >
            <div className="relative w-full bg-white/95 backdrop-blur-2xl rounded-2xl sm:rounded-3xl pt-2 px-5 pb-3 sm:pt-5 sm:px-7 sm:pb-4 md:pt-6 md:px-8 md:pb-4.5 shadow-[0_16px_50px_rgba(0,0,0,0.2)] border border-black/[0.08] flex flex-col overflow-hidden">
              {/* Decorative gentle corner leaves matching AuthModal */}
              <AuthCornerLeaves />

              {/* Grab handle for mobile bottom sheet */}
              <div
                className="sm:hidden w-full flex justify-center pt-0.5 pb-2 cursor-grab select-none relative z-10"
                onClick={closeInstallDrawer}
              >
                <div className="w-9 h-1 rounded-full bg-neutral-300" />
              </div>

              {/* Close Button */}
              <button
                type="button"
                onClick={closeInstallDrawer}
                aria-label="Close prompt"
                className="absolute top-3 right-3 sm:top-4 sm:right-4 w-7.5 h-7.5 sm:w-8 sm:h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 active:scale-95 flex items-center justify-center text-neutral-700 hover:text-black transition-all z-50 cursor-pointer"
              >
                <X className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-black" strokeWidth={2.2} />
              </button>

              {/* Header: Authentic installed app icon on left + AuthModal typography on right */}
              <div className="relative z-10 flex items-center gap-3.5 text-left pt-0.5 pb-2.5 pr-7 sm:pr-8">
                {/* Left Side: Authentic Installed Mobile App Icon (Squircle) */}
                <div className="relative shrink-0 select-none">
                  <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-[22%] bg-white shadow-[0_10px_24px_rgba(0,0,0,0.12),0_2px_6px_rgba(0,0,0,0.06)] ring-1 ring-black/[0.08] p-1.5 flex items-center justify-center overflow-hidden relative">
                    <img
                      src="/MainLogo.png"
                      alt="Akula's Kitchen App Icon"
                      width={72}
                      height={72}
                      className="w-full h-full object-contain filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.06)]"
                    />
                    {/* Top ambient glass gloss sheen like an iOS/Android icon */}
                    <div className="absolute inset-0 bg-gradient-to-b from-white/35 via-white/5 to-transparent pointer-events-none rounded-[22%]" />
                    {/* Subtle bottom bevel reflection */}
                    <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/[0.03] to-transparent pointer-events-none" />
                  </div>
                </div>

                {/* Right Side: Clean Brand Title */}
                <div className="flex flex-col justify-center min-w-0 flex-1">
                  <span className="text-[11px] sm:text-xs font-semibold text-neutral-400 uppercase tracking-wider leading-none mb-1">
                    {isInstalled ? 'Installed' : 'Install'}
                  </span>
                  <h2
                    id="pwa-install-title"
                    className="font-serif-heading text-[22px] sm:text-[24px] md:text-[25px] leading-tight text-neutral-950 font-bold tracking-tight"
                    style={{ fontFamily: 'var(--font-display)' }}
                  >
                    Akula's Kitchen
                  </h2>
                </div>
              </div>

              {/* Body & Actions: 3 Real Benefits of Installing vs Browser */}
              <div className="relative z-10 flex flex-col gap-1.5">
                {isInstalled ? (
                  /* State: App is already installed -> Redirect / Open App */
                  <>
                    <div className="bg-emerald-50/80 border border-emerald-200/80 rounded-xl p-3 text-xs text-neutral-800 flex items-center gap-2 text-left">
                      <CheckCircle2 className="w-4.5 h-4.5 text-emerald-600 shrink-0" />
                      <p className="text-neutral-700 font-medium truncate">
                        App installed on this device. Opening directly...
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={redirectToInstalledApp}
                      className="w-full bg-[#F7BB0E] hover:bg-[#d49e0c] active:scale-[0.99] text-neutral-950 font-bold py-3 px-5 rounded-xl sm:rounded-2xl flex items-center justify-center gap-2 shadow-sm hover:shadow-md transition-all text-sm sm:text-base cursor-pointer"
                    >
                      <ExternalLink className="w-4.5 h-4.5 stroke-[2.2]" />
                      Open Akula's Kitchen App
                    </button>

                    <button
                      type="button"
                      onClick={closeInstallDrawer}
                      className="w-full text-neutral-500 hover:text-neutral-800 text-xs sm:text-[13px] font-semibold py-1 transition-colors cursor-pointer"
                    >
                      Continue in Browser
                    </button>
                  </>
                ) : (
                  <>
                    {/* The 3 Real Benefits of Installing with strictly 1-line descriptions */}
                    <div className="space-y-1.5 my-0.5 text-left">
                      {/* Benefit 1 */}
                      <div className="flex items-center gap-2.5 p-2 rounded-xl bg-neutral-50/80 border border-neutral-200/60">
                        <div className="w-6.5 h-6.5 rounded-lg bg-amber-100 flex items-center justify-center text-amber-700 shrink-0">
                          <MousePointerClick className="w-3.5 h-3.5 stroke-[2.2]" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="text-xs sm:text-[12.5px] font-bold text-neutral-900 leading-tight">
                            1-Tap Instant Access
                          </h4>
                          <p className="text-[10.5px] sm:text-[11.5px] text-neutral-500 leading-tight mt-0.5 truncate">
                            Opens full-screen directly from your home screen.
                          </p>
                        </div>
                      </div>

                      {/* Benefit 2 */}
                      <div className="flex items-center gap-2.5 p-2 rounded-xl bg-neutral-50/80 border border-neutral-200/60">
                        <div className="w-6.5 h-6.5 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700 shrink-0">
                          <Clock className="w-3.5 h-3.5 stroke-[2.2]" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="text-xs sm:text-[12.5px] font-bold text-neutral-900 leading-tight">
                            Live Order Tracking
                          </h4>
                          <p className="text-[10.5px] sm:text-[11.5px] text-neutral-500 leading-tight mt-0.5 truncate">
                            Real-time kitchen and delivery progress updates.
                          </p>
                        </div>
                      </div>

                      {/* Benefit 3 */}
                      <div className="flex items-center gap-2.5 p-2 rounded-xl bg-neutral-50/80 border border-neutral-200/60">
                        <div className="w-6.5 h-6.5 rounded-lg bg-orange-100 flex items-center justify-center text-orange-700 shrink-0">
                          <Smartphone className="w-3.5 h-3.5 stroke-[2.2]" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="text-xs sm:text-[12.5px] font-bold text-neutral-900 leading-tight">
                            Lighter &amp; Faster
                          </h4>
                          <p className="text-[10.5px] sm:text-[11.5px] text-neutral-500 leading-tight mt-0.5 truncate">
                            Loads instantly and uses under 2MB of storage.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Action buttons or iOS Safari tip */}
                    {isIosSafari || isIos ? (
                      <div className="space-y-1.5 pt-0.5">
                        <div className="bg-amber-50/80 border border-amber-200/80 rounded-xl p-2.5 text-xs text-neutral-800 space-y-1 text-left">
                          <p className="font-bold text-[#7A5A00] flex items-center gap-1.5 text-[11px] sm:text-xs">
                            <Share className="w-3 h-3 text-sky-600 inline" />
                            To install on iOS Safari:
                          </p>
                          <p className="text-neutral-700 text-[10.5px] sm:text-[11.5px]">
                            Tap <span className="font-semibold text-neutral-900">Share</span>, then
                            select{' '}
                            <span className="font-semibold text-neutral-900">
                              Add to Home Screen
                            </span>{' '}
                            <PlusSquare className="w-3 h-3 inline text-emerald-600" />.
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={closeInstallDrawer}
                          className="w-full bg-[#F7BB0E] hover:bg-[#d49e0c] active:scale-[0.99] text-neutral-950 font-bold py-2.5 px-5 rounded-xl sm:rounded-2xl transition-all text-xs sm:text-sm cursor-pointer"
                        >
                          Got It, Continue Browsing
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-1 pt-0.5">
                        <button
                          type="button"
                          onClick={promptNativeInstall}
                          className="w-full bg-[#F7BB0E] hover:bg-[#eab30c] active:scale-[0.99] text-neutral-950 font-bold py-2.5 sm:py-3 px-5 rounded-xl sm:rounded-2xl flex items-center justify-center gap-2 shadow-xs transition-all text-sm sm:text-base cursor-pointer border border-amber-400/40"
                        >
                          <Download className="w-4 h-4 stroke-[2.5]" />
                          <span>Install App</span>
                        </button>

                        <button
                          type="button"
                          onClick={closeInstallDrawer}
                          className="w-full text-neutral-500 hover:text-neutral-800 text-xs sm:text-[13px] font-semibold py-1 transition-colors cursor-pointer"
                        >
                          Continue Browsing
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
