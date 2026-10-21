import { m as motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ShieldCheck, ArrowRight, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { adminInviteService } from '../../services/domainServices';
import { refreshAccessToken } from '../../services/api';
import { useScrollLock } from '../../hooks/useScrollLock';
import { useMobileDrawerEngine } from '../../hooks/useMobileDrawerEngine';
import { AuthCornerLeaves } from './AuthCornerLeaves';
import toast from 'react-hot-toast';
import logger from '../../utils/core/logger';

export function AdminInviteModal() {
  const { user, isAuthenticated, isAuthInitialized, checkAuth } = useAuth();
  const [invite, setInvite] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useScrollLock(isOpen);

  const { isMobile, dragProps, sheetTransition } = useMobileDrawerEngine({
    isOpen,
    onClose: () => {
      setIsOpen(false);
    },
  });

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

  useEffect(() => {
    let active = true;

    const checkPendingInvitation = async () => {
      if (!isAuthenticated || !user || !isAuthInitialized) return;
      try {
        const res = await adminInviteService.getMyPendingInvite();
        if (active && res?.success && res?.data) {
          setInvite(res.data);
          setIsOpen(true);
        }
      } catch (err) {
        if (err?.response?.status !== 401 && err?.code !== 'ERR_NO_SESSION') {
          logger.error('Failed to check pending admin invitations:', err);
        }
      }
    };

    checkPendingInvitation();

    // Poll every 30 seconds to show new invitations instantly
    const intervalId = setInterval(checkPendingInvitation, 30000);

    return () => {
      active = false;
      clearInterval(intervalId);
    };
  }, [isAuthenticated, isAuthInitialized, user]);

  const handleResponse = async (action) => {
    if (!invite || submitting) return;
    setSubmitting(true);
    const loadingToast = toast.loading('Processing invitation...');

    try {
      const res = await adminInviteService.respondToInvite(invite._id, action);
      if (res?.success) {
        toast.dismiss(loadingToast);
        if (action === 'accept') {
          toast.success('Welcome to the Admin Portal! Upgrading your access privileges...');

          const token = await refreshAccessToken();
          if (token) {
            await checkAuth();
          }

          setTimeout(() => {
            window.location.href = '/admin';
          }, 1000);
        } else {
          toast.success('Invitation declined successfully.');
        }
        setIsOpen(false);
        setInvite(null);
      }
    } catch (err) {
      toast.dismiss(loadingToast);
      toast.error(err.response?.data?.message || 'Failed to respond to invitation.');
    } finally {
      setSubmitting(false);
    }
  };

  const formattedRole = invite?.roleAssigned?.replace(/_/g, ' ') || 'Admin';

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && invite && (
        <div className="fixed inset-0 z-[9999] pointer-events-none flex items-end sm:items-center justify-center p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] sm:p-6 md:p-8">
          {/* Dark blurred background overlay spanning entire viewport and safe area */}
          <motion.div
            key="invite-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="fixed -inset-x-0 -top-40 -bottom-40 bg-black/60 sm:bg-black/40 backdrop-blur-xs pointer-events-auto"
          />

          {/* Bottom Sheet on Mobile / Centered Card on Desktop */}
          <motion.div
            key="invite-modal"
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            {...(isMobile ? dragProps : {})}
            className="relative z-10 pointer-events-auto flex flex-col w-full max-w-full sm:max-w-[440px] md:max-w-[460px] mx-auto"
          >
            <div className="relative w-full bg-white/95 backdrop-blur-2xl rounded-2xl sm:rounded-3xl pt-3 px-5 pb-4 sm:pt-6 sm:px-7 sm:pb-7 md:pt-7 md:px-8 md:pb-8 shadow-[0_16px_50px_rgba(0,0,0,0.22)] border border-black/[0.08] flex flex-col max-h-[calc(100dvh-24px)] sm:max-h-[88dvh] overflow-hidden">
              {/* Falling leaves ambient breeze */}
              <AuthCornerLeaves />

              {/* Grab handle for mobile bottom sheet */}
              <div
                className="sm:hidden w-full flex justify-center pt-0.5 pb-2.5 cursor-grab select-none"
                onClick={() => setIsOpen(false)}
              >
                <div className="w-9 h-1 rounded-full bg-neutral-300" />
              </div>

              {/* Close button */}
              <button
                onClick={() => setIsOpen(false)}
                className="absolute top-3.5 right-3.5 sm:top-4.5 sm:right-4.5 w-8 h-8 sm:w-8.5 sm:h-8.5 rounded-full bg-neutral-100 hover:bg-neutral-200 active:scale-95 flex items-center justify-center text-neutral-700 hover:text-black transition-all z-50 cursor-pointer"
                aria-label="Close invitation modal"
              >
                <X className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-black" strokeWidth={2.2} />
              </button>

              {/* Core Content Layout */}
              <div className="relative z-10 flex-1 overflow-y-auto overscroll-contain touch-pan-y no-scrollbar pt-1 space-y-4">
                {/* 1-Line Header: Shield icon + Title */}
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-[#283618]/10 text-[#283618] flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-5 h-5 text-[#283618]" strokeWidth={2.2} />
                  </div>
                  <div>
                    <h2
                      className="font-serif-heading text-[20px] sm:text-[22px] leading-tight text-neutral-950 font-bold tracking-tight"
                      style={{ fontFamily: 'var(--font-display)' }}
                    >
                      Admin Team Invitation
                    </h2>
                    <p className="text-[11.5px] sm:text-[12px] text-neutral-400 font-medium tracking-wide">
                      Workspace Access Request
                    </p>
                  </div>
                </div>

                {/* Combined Clean Details Card */}
                <div className="bg-neutral-50/95 border border-neutral-200/80 rounded-2xl p-4 space-y-3 shadow-xs">
                  {/* Who invited & Role */}
                  <div className="flex items-start justify-between gap-3 pb-3 border-b border-neutral-200/70">
                    <div className="space-y-0.5">
                      <span className="text-[10px] sm:text-[10.5px] uppercase font-bold tracking-wider text-neutral-400 block">
                        Invited By
                      </span>
                      <p className="text-[13px] sm:text-[13.5px] font-semibold text-neutral-900 leading-snug">
                        {invite.invitedBy?.name || invite.invitedBy?.email}
                      </p>
                    </div>

                    <div className="text-right space-y-0.5 shrink-0">
                      <span className="text-[10px] sm:text-[10.5px] uppercase font-bold tracking-wider text-neutral-400 block">
                        Role
                      </span>
                      <span className="inline-block px-2.5 py-0.5 bg-[#283618] text-white text-[11px] font-bold rounded-full capitalize shadow-xs">
                        {formattedRole}
                      </span>
                    </div>
                  </div>

                  {/* Permissions & Scope */}
                  <div className="space-y-1">
                    <span className="text-[10px] sm:text-[10.5px] uppercase font-bold tracking-wider text-neutral-400 block">
                      Scope & Permissions
                    </span>
                    <p className="text-[12.5px] sm:text-[13px] text-neutral-700 italic bg-white/80 rounded-xl px-3 py-2 border border-neutral-200/60 leading-relaxed font-medium">
                      "{invite.permissionsSummary || 'Full Admin Portal & Operations Access'}"
                    </p>
                  </div>
                </div>

                {/* Side-by-side action buttons with generous spacing */}
                <div className="flex items-center gap-3 pt-1">
                  {/* Red Decline Button */}
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => handleResponse('reject')}
                    className="flex-1 h-11.5 sm:h-12 rounded-full border border-red-200 hover:border-red-300 bg-red-50/80 hover:bg-red-100 text-red-600 hover:text-red-700 font-bold text-[11.5px] sm:text-[12px] uppercase tracking-wider transition-all active:scale-[0.98] disabled:opacity-40 cursor-pointer select-none flex items-center justify-center"
                  >
                    <span>Decline</span>
                  </button>

                  {/* Accept Button */}
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => handleResponse('accept')}
                    className="flex-[1.3] h-11.5 sm:h-12 bg-[#283618] hover:bg-[#1f2b13] active:scale-[0.98] text-white pl-4.5 pr-1.5 py-1 rounded-full shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-between group disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer select-none"
                  >
                    <span className="font-bold text-[12px] uppercase tracking-wider text-white truncate">
                      {submitting ? 'Accepting…' : 'Accept Access'}
                    </span>
                    <span className="w-8 h-8 rounded-full bg-white text-[#283618] flex items-center justify-center shrink-0 shadow-xs transition-transform duration-200 group-hover:scale-105 ml-1.5">
                      <ArrowRight
                        className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5"
                        strokeWidth={2.5}
                        aria-hidden="true"
                      />
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
