/**
 * Akula's Kitchen — Production Service Worker
 * Version: 1.0.0
 *
 * Designed with a strict safety-first architecture:
 * - Never caches authentication, cart, checkout, payments, OTPs, or admin data.
 * - Cache-first only for immutable, hashed static assets (/assets/*).
 * - Network-first for HTML navigations to guarantee zero stale bundle lock-ins.
 * - Network-first for public read-only catalog with offline resilience.
 * - Instant update activation via SKIP_WAITING with safe client claiming.
 */

const SW_VERSION = '1.0.0';
const CACHE_PREFIX = 'akula';
const SHELL_CACHE = `${CACHE_PREFIX}-shell-${SW_VERSION}`;
const STATIC_CACHE = `${CACHE_PREFIX}-static-${SW_VERSION}`;
const RUNTIME_CACHE = `${CACHE_PREFIX}-runtime-${SW_VERSION}`;

const CURRENT_CACHES = [SHELL_CACHE, STATIC_CACHE, RUNTIME_CACHE];

/**
 * Essential shell assets to pre-cache on install.
 * Pre-cached defensively so a single missing asset never fails installation.
 */
const PRECACHE_SHELL_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico',
  '/favicon-192x192.png',
  '/pwa-icon-192.png',
  '/pwa-icon-512.png',
  '/pwa-maskable-192.png',
  '/pwa-maskable-512.png',
  '/apple-touch-icon.png',
  '/MainLogo.png',
];

/**
 * Strict exclusion list — these paths are NEVER intercepted or cached under any circumstances.
 */
const NEVER_CACHE_PATTERNS = [
  '/api/auth',
  '/api/csrf-token',
  '/api/users/cart',
  '/api/users/wishlist',
  '/api/orders',
  '/api/checkout',
  '/api/payment',
  '/api/razorpay',
  '/api/admin',
  '/api/notifications',
  '/api/customers',
  '/api/health',
  '/api/marketing',
  '/api/customer-intelligence',
  '/socket.io',
  '/auth',
  '/checkout',
  '/order-success',
];

/**
 * Safe public read-only catalog prefixes (Network-First ONLY).
 */
const SAFE_CATALOG_PREFIXES = [
  '/api/products',
  '/api/v1/products',
  '/api/categories',
  '/api/v1/categories',
  '/api/cms',
  '/api/v1/cms',
  '/api/store-settings',
  '/api/v1/store-settings',
  '/api/policies',
  '/api/v1/policies',
  '/api/reviews',
  '/api/v1/reviews',
  '/api/recommendations',
  '/api/v1/recommendations',
];

// ─── INSTALL EVENT ─────────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then(async (cache) => {
      // Defensive caching: fetch assets individually so one failure does not abort install
      await Promise.allSettled(
        PRECACHE_SHELL_ASSETS.map(async (url) => {
          try {
            const response = await fetch(url, { cache: 'no-cache' });
            if (response && response.ok) {
              await cache.put(url, response);
            }
          } catch (err) {
            // Silently ignore individual non-fatal precache misses
          }
        }),
      );
    }),
  );
});

// ─── ACTIVATE EVENT ───────────────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // 1. Purge all obsolete cache versions
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map((name) => {
          if (name.startsWith(CACHE_PREFIX) && !CURRENT_CACHES.includes(name)) {
            return caches.delete(name);
          }
          return Promise.resolve();
        }),
      );

      // 2. Take immediate control of all open clients
      await self.clients.claim();
    })(),
  );
});

// ─── MESSAGE EVENT ────────────────────────────────────────────────────────────
self.addEventListener('message', (event) => {
  if (!event.data) return;

  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  } else if (event.data.type === 'GET_VERSION') {
    event.ports?.[0]?.postMessage({ version: SW_VERSION });
  }
});

// ─── FETCH EVENT ──────────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // 1. Only intercept GET requests
  if (request.method !== 'GET') {
    return;
  }

  // 2. Ignore non-HTTP/HTTPS schemes (e.g. chrome-extension://)
  if (!request.url.startsWith('http://') && !request.url.startsWith('https://')) {
    return;
  }

  const url = new URL(request.url);
  const isSameOrigin = url.origin === self.location.origin;

  // 3. Strict exclusion check: never touch private/sensitive/auth/checkout paths
  for (const pattern of NEVER_CACHE_PATTERNS) {
    if (url.pathname.includes(pattern)) {
      return; // Hand over directly to standard network
    }
  }

  // 4. HTML Navigation Requests (mode === 'navigate')
  // STRATEGY: Network-First with safe cached offline fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          // Always attempt fresh network fetch first
          const networkResponse = await fetch(request);
          if (networkResponse && networkResponse.ok) {
            // Optionally update cached index.html in background
            const cache = await caches.open(SHELL_CACHE);
            cache.put('/index.html', networkResponse.clone()).catch(() => {});
            return networkResponse;
          }
        } catch (_err) {
          // Network failed — fallback to cached application shell
        }

        const cachedHtml = (await caches.match('/index.html')) || (await caches.match('/'));
        if (cachedHtml) {
          return cachedHtml;
        }

        // Final fallback: attempt standard offline response
        return new Response(
          '<!doctype html><html lang="en"><head><meta charset="utf-8"/><title>Akula\'s Kitchen — Offline</title><meta name="viewport" content="width=device-width,initial-scale=1"/><style>body{font-family:system-ui,-apple-system,sans-serif;padding:2rem;text-align:center;color:#283618;background:#fff;}h1{color:#F7BB0E;}p{color:#525252;margin-top:1rem;}</style></head><body><h1>Akula\'s Kitchen</h1><p>You are currently offline. Please check your internet connection to continue browsing our authentic menu.</p><button onclick="window.location.reload()" style="margin-top:1.5rem;padding:0.75rem 1.5rem;background:#F7BB0E;color:#000;border:none;border-radius:12px;font-weight:600;cursor:pointer;">Retry Connection</button></body></html>',
          {
            status: 200,
            headers: { 'Content-Type': 'text/html; charset=utf-8' },
          },
        );
      })(),
    );
    return;
  }

  // 5. Immutable, Hashed Static Bundles (/assets/*)
  // STRATEGY: Safe Cache-First (Vite bundle chunks contain content hashes)
  if (isSameOrigin && url.pathname.startsWith('/assets/')) {
    event.respondWith(
      (async () => {
        const cached = await caches.match(request);
        if (cached) {
          return cached;
        }

        try {
          const networkResponse = await fetch(request);
          if (networkResponse && networkResponse.ok) {
            const cache = await caches.open(STATIC_CACHE);
            cache.put(request, networkResponse.clone()).catch(() => {});
          }
          return networkResponse;
        } catch (err) {
          // If offline and not in cache, let caller handle
          throw err;
        }
      })(),
    );
    return;
  }

  // 6. External Web Fonts (Google Fonts, Gstatic)
  // STRATEGY: Stale-While-Revalidate with caching
  if (url.origin === 'https://fonts.googleapis.com' || url.origin === 'https://fonts.gstatic.com') {
    event.respondWith(
      (async () => {
        const cached = await caches.match(request);
        const fetchPromise = fetch(request)
          .then(async (networkResponse) => {
            if (networkResponse && networkResponse.ok) {
              const cache = await caches.open(STATIC_CACHE);
              cache.put(request, networkResponse.clone()).catch(() => {});
            }
            return networkResponse;
          })
          .catch(() => cached);

        return cached || fetchPromise;
      })(),
    );
    return;
  }

  // 7. Static Public Media, Logos & PWA Icons
  // STRATEGY: Stale-While-Revalidate
  const isStaticImage =
    isSameOrigin &&
    (url.pathname.startsWith('/pwa-') ||
      url.pathname.startsWith('/favicon') ||
      url.pathname.endsWith('.png') ||
      url.pathname.endsWith('.webp') ||
      url.pathname.endsWith('.ico') ||
      url.pathname.endsWith('.svg'));

  if (isStaticImage) {
    event.respondWith(
      (async () => {
        const cached = await caches.match(request);
        const fetchPromise = fetch(request)
          .then(async (networkResponse) => {
            if (networkResponse && networkResponse.ok) {
              const cache = await caches.open(SHELL_CACHE);
              cache.put(request, networkResponse.clone()).catch(() => {});
            }
            return networkResponse;
          })
          .catch(() => cached);

        return cached || fetchPromise;
      })(),
    );
    return;
  }

  // 8. Public Read-Only Catalog Endpoints (/api/products, /api/categories, /api/cms, etc.)
  // STRATEGY: Strictly Network-First! Always fetch authoritative fresh data.
  // Cache is used ONLY if network is completely unreachable (offline support).
  const isSafeCatalogRead =
    isSameOrigin && SAFE_CATALOG_PREFIXES.some((prefix) => url.pathname.startsWith(prefix));

  if (isSafeCatalogRead) {
    event.respondWith(
      (async () => {
        try {
          const networkResponse = await fetch(request);
          if (networkResponse && networkResponse.ok) {
            const cache = await caches.open(RUNTIME_CACHE);
            cache.put(request, networkResponse.clone()).catch(() => {});
          }
          return networkResponse;
        } catch (_err) {
          // Network failed — fallback to cached catalog if available
          const cached = await caches.match(request);
          if (cached) {
            return cached;
          }
          throw _err;
        }
      })(),
    );
    return;
  }

  // Default: bypass service worker and fetch from network
});
