import { StrictMode } from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import './styles/globals.css';
import App from './App.jsx';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import { runAppBootstrap } from './utils/core/bootstrap';
import { logStartupDiagnostics } from './utils/core/diagnostics';
import { isPrerendering } from './utils/performance/prerender';

import logger from './utils/core/logger';
import { patchToastError } from './utils/core/errorHelpers';
import { handleImageError } from './utils/media/imageUtils';

patchToastError();

// Defer non-critical monitoring and analytics until after first paint
const deferNonCriticalInit = () => {
  if (isPrerendering()) return; // skip analytics when pre-rendering
  import('./utils/core/observability')
    .then(({ initObservability }) => initObservability())
    .catch(() => {});
  import('./utils/core/analytics').then(({ initAnalytics }) => initAnalytics()).catch(() => {});
};

if (typeof requestIdleCallback === 'function') {
  requestIdleCallback(deferNonCriticalInit, { timeout: 4000 });
} else {
  setTimeout(deferNonCriticalInit, 1);
}

if (!isPrerendering()) {
  performance.mark('app-startup');
  runAppBootstrap();
  logStartupDiagnostics();
}

// Global Error Handler for Outdated Bundles (Chunk Loading Errors) & Broken Images
window.addEventListener(
  'error',
  (event) => {
    // Intercept broken images site-wide and apply clean Image Unavailable fallback
    const target = event.target;
    if (target && target.tagName === 'IMG') {
      // Never intercept Leaflet map tiles
      if (
        target.classList?.contains('leaflet-tile') ||
        target.closest?.('.leaflet-container') ||
        target.closest?.('.leaflet-tile-container')
      ) {
        return;
      }
      handleImageError(event);
      return;
    }

    const isChunkError =
      event.message?.includes('Loading chunk') ||
      event.message?.includes('Failed to fetch dynamically imported module');

    if (isChunkError) {
      logger.warn('[Observability] Detected chunk loading error. Attempting automatic reload...');
      const lastReload = sessionStorage.getItem('akula_chunk_reload_time');
      const now = Date.now();
      if (!lastReload || now - parseInt(lastReload, 10) > 10000) {
        sessionStorage.setItem('akula_chunk_reload_time', String(now));

        // Invalidate stale caches to bypass corrupted/outdated chunk cache
        if ('caches' in window) {
          caches.keys().then((names) => {
            names.forEach((name) => caches.delete(name));
          });
        }

        const currentUrl = new URL(window.location.href);
        currentUrl.searchParams.set('v', Date.now().toString());
        window.location.href = currentUrl.toString();
      }
    }
  },
  true,
); // Use capture phase to catch resource load errors

const rootEl = document.getElementById('root');

// The raw index.html ships an empty #root, so any markup inside it came from pre-rendering.
const isPrerendered = rootEl.hasChildNodes();

if (isPrerendered) {
  hydrateRoot(
    rootEl,
    <StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </StrictMode>,
  );
} else {
  createRoot(rootEl).render(
    <StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </StrictMode>,
  );
}

requestAnimationFrame(() => performance.measure('app-startup-duration', 'app-startup'));
