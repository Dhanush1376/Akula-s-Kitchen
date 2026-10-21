import { useEffect, useId } from 'react';

/**
 * Centralized scroll lock for overlays, drawers, and modals.
 *
 * WHY reference counting:
 *   The application has overlays that can stack (e.g. CartDrawer → ConfirmModal,
 *   AuthModal → PhoneCollectionModal). When the inner overlay closes, the body
 *   must remain locked because the outer overlay is still open. A simple
 *   boolean toggle would unlock prematurely.
 *
 * WHY NOT position:fixed on body:
 *   The viewport meta uses interactive-widget=resizes-content, and the body
 *   already has overscroll-behavior-y:none. overflow:hidden on body+html is
 *   sufficient to prevent background scrolling without the scroll-position
 *   and iOS-toolbar side effects of position:fixed.
 *
 * USAGE:
 *   useScrollLock(isOpen)          — lock while isOpen is true
 *   useScrollLock(isOpen && cond)  — conditional lock
 *
 * CLEANUP:
 *   Automatically unlocks when the component unmounts or isActive becomes false.
 *   If lockCount somehow goes negative (double-release), it clamps to zero.
 */

// Module-level state shared across all hook instances.
// This is intentionally NOT React state — it must survive re-renders
// and be shared across the entire component tree.
const activeLocks = new Set();
let savedHtmlBg = '';
let savedHtmlOverflow = '';
let savedHtmlOverscroll = '';
let savedBodyOverflow = '';
let savedBodyOverscroll = '';
let savedBodyTouchAction = '';

function applyLock() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  savedHtmlBg = document.documentElement.style.backgroundColor;
  savedHtmlOverflow = document.documentElement.style.overflow;
  savedHtmlOverscroll = document.documentElement.style.overscrollBehavior;
  savedBodyOverflow = document.body.style.overflow;
  savedBodyOverscroll = document.body.style.overscrollBehavior;
  savedBodyTouchAction = document.body.style.touchAction;

  // Prevent background scrolling and bouncing
  document.documentElement.style.overflow = 'hidden';
  document.documentElement.style.overscrollBehavior = 'none';
  // Ensure the underlying canvas is dark so overscroll bounce reveals dark backdrop, NEVER white canvas
  document.documentElement.style.backgroundColor = '#121212';

  document.body.style.overflow = 'hidden';
  document.body.style.overscrollBehavior = 'none';
  document.body.style.touchAction = 'none';
}

function releaseLock() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  document.documentElement.style.backgroundColor = savedHtmlBg;
  document.documentElement.style.overflow = savedHtmlOverflow;
  document.documentElement.style.overscrollBehavior = savedHtmlOverscroll;

  document.body.style.overflow = savedBodyOverflow;
  document.body.style.overscrollBehavior = savedBodyOverscroll;
  document.body.style.touchAction = savedBodyTouchAction;
}

/**
 * @param {boolean} isActive — true when the overlay/drawer is visible and
 *   should prevent background scrolling.
 */
export function useScrollLock(isActive) {
  const id = useId();

  useEffect(() => {
    if (!isActive) return;

    if (activeLocks.size === 0) {
      applyLock();
    }
    activeLocks.add(id);

    return () => {
      activeLocks.delete(id);
      if (activeLocks.size === 0) {
        releaseLock();
      }
    };
  }, [isActive, id]);
}
