import axios from 'axios';
import logger from '../utils/core/logger';
import { logCartTrace } from '../utils/forensic/cartTrace';
import { getCachedGet, setCachedGet, clearApiCache } from '../utils/api/apiCache';
import {
  hasSessionMarker,
  setSessionMarker,
  clearAuthStorage,
  getFallbackRefreshToken,
  setFallbackRefreshToken,
  clearFallbackRefreshToken,
} from '../utils/auth/authStorage';
import { clearCachedProfile } from '../utils/auth/authSessionCache';
import { createRequestInterceptor } from './interceptors/requestInterceptor';
import { createResponseInterceptor } from './interceptors/responseInterceptor';
const api = axios.create({
  timeout: 15000, // 15s timeout to prevent hanging connections and give early feedback
  withCredentials: true,
});

let accessToken = null;
let refreshPromise = null;
let refreshPostPromise = null;
let csrfToken = null;
let csrfInitPromise = null;
let authBootstrapActive = false;

export const setAuthBootstrapActive = (active) => {
  authBootstrapActive = !!active;
};

export const ensureCsrfToken = async () => {
  if (csrfToken) return csrfToken;
  if (!csrfInitPromise) {
    csrfInitPromise = (async () => {
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          const res = await api.get('/csrf-token', { _bypassOfflineQueue: true });
          csrfToken = res.data?.csrfToken || csrfToken;
          return csrfToken;
        } catch (_err) {
          if (attempt < 2) {
            await new Promise((r) => setTimeout(r, 500));
          } else {
            // Allow request to proceed — backend will enforce CSRF and return
            // a clear 403 "Invalid or missing CSRF token" instead of silently blocking
            logger.warn('[API] CSRF token fetch failed after retries. Proceeding without token.');
            csrfInitPromise = null;
            return null;
          }
        }
      }
    })();
  }
  return csrfInitPromise;
};

export const setAccessToken = (token) => {
  accessToken = token || null;
};

export const getAccessToken = () => accessToken;
export const getRefreshPromise = () => refreshPromise;

const applyRefreshPayload = (payload) => {
  const token = payload?.accessToken || payload?.token;
  const refreshToken = payload?.refreshToken;

  if (token) {
    setAccessToken(token);
    setSessionMarker();
    if (refreshToken) {
      // Server only echoes a refresh token when the request was not
      // authenticated via the HttpOnly cookie (cookie-blocked browsers).
      setFallbackRefreshToken(refreshToken);
    }
  }
  return token;
};

const buildRefreshBody = () => {
  const fallbackToken = getFallbackRefreshToken();
  return fallbackToken ? { refreshToken: fallbackToken } : {};
};

const hasLocalAuthMarker = () => hasSessionMarker();

const dispatchUnauthorized = () => {
  if (authBootstrapActive) {
    logger.dev('[API] Suppressed auth-unauthorized during session bootstrap');
    return;
  }
  if (!hasLocalAuthMarker()) {
    // Already unauthorized, avoid redundant notifications
    return;
  }
  logger.warn('[API] 401/403 received — session expired. Clearing credentials and notifying app.');
  setAccessToken(null);
  clearAuthStorage();
  clearCachedProfile();
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('auth-unauthorized'));
  }
};

export const refreshAccessToken = async () => {
  if (!hasLocalAuthMarker()) {
    return null;
  }

  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    for (let attempt = 0; attempt < 3; attempt++) {
      // Check if another tab or request already provided an access token
      const currentToken = getAccessToken();
      if (currentToken && attempt > 0) {
        return currentToken;
      }

      try {
        const res = await api.post('/auth/refresh', buildRefreshBody(), {
          _skipAuthRetry: true,
          _disableRetry: true,
        });
        const payload = res.data?.data || res.data;
        const newToken = applyRefreshPayload(payload);
        return newToken;
      } catch (err) {
        const status = err.response?.status;
        if (status === 409) {
          logger.warn(
            `[API] 409 Conflict (concurrent refresh). Retrying attempt ${attempt + 1}/3...`,
          );
          // The old fallback token was already used by another tab/request; clear it so retry uses cookie
          clearFallbackRefreshToken();
          await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));

          const tokenNow = getAccessToken();
          if (tokenNow) {
            return tokenNow;
          }
          continue;
        }

        if (status === 401 || status === 403) {
          clearFallbackRefreshToken();
          dispatchUnauthorized();
          throw err;
        }

        // On transient network errors, brief pause and retry
        if (attempt < 2) {
          await new Promise((r) => setTimeout(r, 500));
          continue;
        }

        throw err;
      }
    }

    return getAccessToken() || null;
  })().finally(() => {
    refreshPromise = null;
  });

  return refreshPromise;
};

const setCsrfTokenState = (token) => {
  if (token === null) {
    csrfToken = null;
    csrfInitPromise = null;
  } else {
    csrfToken = token;
    csrfInitPromise = Promise.resolve(token);
  }
};

api.interceptors.request.use(
  createRequestInterceptor({
    getAccessToken,
    hasLocalAuthMarker,
    refreshAccessToken,
    ensureCsrfToken,
    getRefreshPromise,
  }),
  (error) => Promise.reject(error),
);

const [onResponse, onError] = createResponseInterceptor({
  api,
  dispatchUnauthorized,
  refreshAccessToken,
  ensureCsrfToken,
  hasLocalAuthMarker,
  getAccessToken,
  setCsrfTokenState,
});

api.interceptors.response.use(onResponse, onError);

// Custom GET wrapper to handle cart tracing and API response caching
const originalGet = api.get;

let cartGetSequenceCounter = 0;

api.get = function (url, config) {
  const isCart = url.includes('/users/cart');
  let currentSeq = null;

  if (isCart) {
    cartGetSequenceCounter++;
    currentSeq = cartGetSequenceCounter;
    logCartTrace('API_GET_ENTER', {
      cartGetSeq: currentSeq,
      url,
      hasSignal: !!config?.signal,
      signalAborted: config?.signal?.aborted,
      source: 'api.get',
    });
  }

  const cached = getCachedGet(url, config);
  if (cached && !cached.stale) {
    return Promise.resolve({
      data: cached.data,
      status: 200,
      statusText: 'OK',
      headers: {},
      config: config || {},
      fromCache: true,
    });
  }

  if (isCart) {
    logCartTrace('API_GET_NETWORK_START', {
      cartGetSeq: currentSeq,
      source: 'api.get',
    });
  }

  return originalGet
    .call(this, url, config)
    .then((response) => {
      if (response?.data !== undefined) {
        setCachedGet(url, config, response.data);
      }

      if (isCart) {
        logCartTrace('API_GET_NETWORK_RESOLVE', {
          cartGetSeq: currentSeq,
          cartData: response.data?.data || response.data,
          source: 'api.get',
        });
      }
      return response;
    })
    .catch((error) => {
      if (isCart) {
        logCartTrace('API_GET_NETWORK_REJECT', {
          cartGetSeq: currentSeq,
          error: error?.message,
          isCancel: axios.isCancel(error),
          source: 'api.get',
        });
      }

      if (cached?.data) {
        return {
          data: cached.data,
          status: 200,
          statusText: 'OK',
          headers: {},
          config: config || {},
          fromCache: true,
          stale: true,
        };
      }
      throw error;
    });
};

// High-performance POST request de-duplication wrapper for token refresh to avoid concurrent replay race conditions
const originalPost = api.post;
api.post = function (url, data, config) {
  clearApiCache();
  if (url === '/auth/refresh' || url?.includes('/auth/refresh')) {
    const body = data && Object.keys(data).length ? data : buildRefreshBody();
    if (!refreshPostPromise) {
      refreshPostPromise = originalPost.call(this, url, body, config).finally(() => {
        refreshPostPromise = null;
      });
    }
    return refreshPostPromise;
  }
  return originalPost.call(this, url, data, config);
};

const originalPut = api.put;
api.put = function (url, data, config) {
  clearApiCache();
  return originalPut.call(this, url, data, config);
};

const originalPatch = api.patch;
api.patch = function (url, data, config) {
  clearApiCache();
  return originalPatch.call(this, url, data, config);
};

const originalDelete = api.delete;
api.delete = function (url, config) {
  clearApiCache();
  return originalDelete.call(this, url, config);
};

export default api;

if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    // Suppress specific harmless third-party or network errors from polluting logs
    const reason = event.reason;
    if (reason && reason.isNetwork) {
      logger.dev('[API] Suppressing unhandled network rejection:', reason.message);
      event.preventDefault();
    }
  });
}
