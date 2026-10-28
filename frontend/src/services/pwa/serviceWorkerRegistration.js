/**
 * Service Worker Registration and Update Orchestrator
 *
 * Provides safe, non-blocking registration of the Akula's Kitchen PWA service worker.
 * Features:
 * - Deferred registration after window load to prevent FCP/LCP contention.
 * - Periodic background update checks and focus-based checks.
 * - Waiting worker detection for smooth, user-controlled application updates.
 * - Safe update application with reload loop prevention.
 */

import logger from '../../utils/core/logger';
import { isPrerendering } from '../../utils/performance/prerender';

let swRegistration = null;
const RELOAD_GUARD_KEY = 'akula_pwa_reload_guard';

/**
 * Register the production service worker
 * @param {Object} [options]
 * @param {Function} [options.onUpdate] - Called when a new version is installed and waiting
 * @param {Function} [options.onSuccess] - Called when SW is successfully installed for the first time
 */
export function registerServiceWorker(options = {}) {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator) || isPrerendering()) {
    return;
  }

  const { onUpdate, onSuccess } = options;

  const doRegister = async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
      });
      swRegistration = registration;
      logger.info('[PWA] Service Worker registered with scope:', registration.scope);

      // Check if there is already a waiting worker from a previous session
      if (registration.waiting) {
        logger.info('[PWA] Found waiting service worker on initial load');
        notifyUpdate(registration, onUpdate);
      }

      // Listen for future updates
      registration.addEventListener('updatefound', () => {
        const installingWorker = registration.installing;
        if (!installingWorker) return;

        installingWorker.addEventListener('statechange', () => {
          if (installingWorker.state === 'installed') {
            if (navigator.serviceWorker.controller) {
              // At this point, the old content will have been purged and
              // the fresh content will have been added to the cache.
              logger.info('[PWA] New service worker version available and waiting.');
              notifyUpdate(registration, onUpdate);
            } else {
              // At this point, everything has been precached.
              logger.info('[PWA] Content is cached for offline use.');
              if (typeof onSuccess === 'function') {
                onSuccess(registration);
              }
            }
          }
        });
      });

      // Background update checks: periodically (every 60 mins) and on window focus
      setupUpdateChecks(registration);
    } catch (error) {
      logger.warn('[PWA] Service Worker registration failed:', error?.message || error);
    }
  };

  // Register only after page load to preserve top-tier performance
  if (document.readyState === 'complete') {
    if (typeof requestIdleCallback === 'function') {
      requestIdleCallback(doRegister, { timeout: 3000 });
    } else {
      setTimeout(doRegister, 1000);
    }
  } else {
    window.addEventListener('load', () => {
      if (typeof requestIdleCallback === 'function') {
        requestIdleCallback(doRegister, { timeout: 3000 });
      } else {
        setTimeout(doRegister, 1000);
      }
    });
  }

  // Reload guard: ensure reload happens once when controller changes
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing) return;
    refreshing = true;
    logger.info('[PWA] Controller changed — reloading application safely');
    window.location.reload();
  });
}

function notifyUpdate(registration, callback) {
  window.dispatchEvent(new CustomEvent('akula:pwa:update-available', { detail: { registration } }));
  if (typeof callback === 'function') {
    callback(registration);
  }
}

/**
 * Periodically check for service worker updates without interrupting the user.
 */
function setupUpdateChecks(registration) {
  // Check on window focus / visibility change
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      registration.update().catch(() => {});
    }
  });

  // Check every 60 minutes
  setInterval(
    () => {
      registration.update().catch(() => {});
    },
    60 * 60 * 1000,
  );
}

/**
 * Apply a pending service worker update
 * Sends SKIP_WAITING to the waiting worker and safely refreshes
 */
export function applyServiceWorkerUpdate(registration = swRegistration) {
  const waitingWorker = registration?.waiting;
  if (!waitingWorker) {
    logger.warn('[PWA] No waiting service worker found to activate');
    window.location.reload();
    return;
  }

  // Prevent reload loop
  const now = Date.now();
  const lastReload = parseInt(sessionStorage.getItem(RELOAD_GUARD_KEY) || '0', 10);
  if (now - lastReload < 5000) {
    logger.warn('[PWA] Reload guard triggered, skipping redundant reload');
    return;
  }
  sessionStorage.setItem(RELOAD_GUARD_KEY, String(now));

  waitingWorker.postMessage({ type: 'SKIP_WAITING' });
}

/**
 * Get current registered service worker instance
 */
export function getServiceWorkerRegistration() {
  return swRegistration;
}
