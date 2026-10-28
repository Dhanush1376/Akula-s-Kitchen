/**
 * PWA & Platform Detection Utilities
 * Pure functions with zero UI dependencies for maximum performance and portability.
 */

/**
 * Checks if the application is currently running in standalone display mode (installed PWA)
 * @param {Window} [win]
 * @returns {boolean}
 */
export function checkIsStandalone(win = typeof window !== 'undefined' ? window : null) {
  if (!win) return false;
  return Boolean(
    (win.matchMedia &&
      (win.matchMedia('(display-mode: standalone)').matches ||
        win.matchMedia('(display-mode: window-controls-overlay)').matches)) ||
    win.navigator?.standalone === true ||
    (win.document?.referrer && win.document.referrer.includes('android-app://')),
  );
}

/**
 * Checks if the platform is iOS (iPhone, iPad, iPod) or iPadOS with desktop Safari UA
 * @param {Navigator} [nav]
 * @returns {boolean}
 */
export function checkIsIos(nav = typeof navigator !== 'undefined' ? navigator : null) {
  if (!nav) return false;
  const ua = nav.userAgent || '';
  const isIosDevice = /iPad|iPhone|iPod/.test(ua);
  const isIpadOs = nav.platform === 'MacIntel' && (nav.maxTouchPoints || 0) > 1;
  return isIosDevice || isIpadOs;
}

/**
 * Checks if the browser is native Safari on iOS/iPadOS
 * (Where Add to Home Screen must be triggered via the Safari Share menu)
 * @param {Navigator} [nav]
 * @returns {boolean}
 */
export function checkIsIosSafari(nav = typeof navigator !== 'undefined' ? navigator : null) {
  if (!checkIsIos(nav)) return false;
  const ua = nav?.userAgent || '';
  const isWebkit = /WebKit/i.test(ua);
  const isChrome = /CriOS/i.test(ua);
  const isFirefox = /FxiOS/i.test(ua);
  const isEdge = /EdgiOS/i.test(ua);
  return isWebkit && !isChrome && !isFirefox && !isEdge;
}
