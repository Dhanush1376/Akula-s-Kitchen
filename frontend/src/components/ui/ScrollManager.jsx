import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Global ScrollManager:
 * Enforces immediate, reliable scroll reset to the initial point (top: 0, left: 0)
 * on any page navigation across the entire application.
 *
 * Prevents native browser scrollRestoration from restoring stale scroll offsets.
 * Disables session scroll restoration so opening any page always starts fresh at the top.
 * Accommodates async layout shifts, Suspense boundaries, and skeleton loaders.
 */
export function ScrollManager() {
  const location = useLocation();
  const prevPathnameRef = useRef(location.pathname);

  // Set browser scroll restoration to manual to prevent native position caching
  useEffect(() => {
    if (typeof window !== 'undefined' && 'scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
  }, []);

  // Reset scroll to initial point (0, 0) whenever route changes
  useEffect(() => {
    const isPathnameChange = prevPathnameRef.current !== location.pathname;
    prevPathnameRef.current = location.pathname;

    // If only an in-page hash changes on the exact same pathname, do not hijack hash scroll
    if (!isPathnameChange && location.hash) {
      return;
    }

    const scrollToTop = () => {
      const docEl = document.documentElement;
      const body = document.body;

      // Temporarily disable smooth scrolling to jump immediately without lagging
      const originalScrollBehavior = docEl ? docEl.style.scrollBehavior : '';
      if (docEl) docEl.style.scrollBehavior = 'auto';

      try {
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      } catch {
        window.scrollTo(0, 0);
      }

      if (docEl && docEl.scrollTop !== 0) docEl.scrollTop = 0;
      if (body && body.scrollTop !== 0) body.scrollTop = 0;

      // Re-enable original scroll behavior after immediate paint
      if (docEl) {
        setTimeout(() => {
          docEl.style.scrollBehavior = originalScrollBehavior;
        }, 40);
      }
    };

    // 1. Synchronous execution
    scrollToTop();

    // 2. Next animation frame (DOM render)
    const rafId = requestAnimationFrame(() => {
      scrollToTop();
    });

    // 3. Short timeouts to handle async lazy chunk loading and Suspense transitions
    const t1 = setTimeout(scrollToTop, 50);
    const t2 = setTimeout(scrollToTop, 150);

    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [location.pathname, location.key, location.hash]);

  return null;
}
