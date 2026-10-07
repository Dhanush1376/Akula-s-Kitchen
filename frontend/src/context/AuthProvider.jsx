import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';
import { authService } from '../services/domainServices';
import {
  setAccessToken,
  getAccessToken,
  refreshAccessToken,
  setAuthBootstrapActive,
} from '../services/api';
import {
  loadCachedProfile,
  saveCachedProfile,
  clearCachedProfile,
} from '../utils/auth/authSessionCache';
import {
  hasSessionMarker,
  setSessionMarker,
  clearAuthStorage,
  setFallbackRefreshToken,
} from '../utils/auth/authStorage';
import { AuthContext } from './AuthContext';
import { CACHE_KEY } from '../utils/performance/queryPersister';
import logger from '../utils/core/logger';
import { ADMIN_ROLES } from '../constants/roles';
import { logCartTrace, forensicHashId } from '../utils/forensic/cartTrace';

export function AuthProvider({ children }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  // Use lazy initialization to avoid synchronous exceptions during render body
  const getInitialState = () => {
    try {
      const cp = loadCachedProfile();
      const hs = hasSessionMarker();
      // If cached profile exists, ensure session marker is set and persist user across refreshes
      if (cp) {
        if (!hs) {
          setSessionMarker();
        }
        return { cachedProfile: cp, hasStoredSession: true };
      }
      return { cachedProfile: null, hasStoredSession: hs };
    } catch {
      return { cachedProfile: null, hasStoredSession: false };
    }
  };

  const [initialState] = useState(getInitialState);
  const { cachedProfile, hasStoredSession } = initialState;

  const [user, setUser] = useState(cachedProfile);
  const [loading, setLoading] = useState(hasStoredSession && !cachedProfile);
  const [isAuthenticated, setIsAuthenticated] = useState(!!cachedProfile || hasStoredSession);

  // FORENSIC LOGGING
  useEffect(() => {
    logCartTrace('AUTH_STATE_CHANGE', {
      isAuthenticated,
      hasUser: !!user,
      hashedUserId: forensicHashId(user?._id || user?.id),
      source: 'AuthProvider',
    });
  }, [isAuthenticated, user]);
  const [isAuthInitialized, setIsAuthInitialized] = useState(
    !!cachedProfile || (!hasStoredSession && !cachedProfile),
  );

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [intendedAction, setIntendedAction] = useState(null);

  const initStarted = useRef(false);

  const logout = useCallback(
    async (silent = false) => {
      // Clear specific user-related React Query cache on logout to prevent state leakage,
      // but avoid queryClient.clear() so we don't break public pages (like ProductDetails)
      logCartTrace('QUERY_CLIENT_CLEAR', { source: 'AuthProvider.logout' });
      queryClient.removeQueries({
        predicate: (query) => {
          const key = query.queryKey[0];
          return [
            'user',
            'cart',
            'wishlist',
            'orders',
            'addresses',
            'dashboard',
            'recommendations',
          ].includes(key);
        },
      });
      try {
        logCartTrace('CACHE_REMOVE', { source: 'AuthProvider.logout' });
        localStorage.removeItem(CACHE_KEY);
      } catch (__) {}

      setAccessToken(null);
      clearCachedProfile();
      clearAuthStorage();
      if (!silent) {
        authService.logout().catch(() => {});
      }
      setUser(null);
      setIsAuthenticated(false);
      setIntendedAction(null);

      if (!silent) {
        toast.success('Logged out successfully');
      }
    },
    [queryClient],
  );

  const restoreSession = useCallback(
    async (signal) => {
      setAuthBootstrapActive(true);
      try {
        if (!getAccessToken()) {
          await refreshAccessToken();
        }

        const response = await authService.getProfile({ signal });
        if (response.success) {
          setUser(response.data);
          setIsAuthenticated(true);
          saveCachedProfile(response.data);
          setSessionMarker();
          return true;
        }
      } catch (err) {
        if (err.name === 'CanceledError' || err.code === 'ERR_NO_SESSION') {
          return false;
        }

        const isNetwork = !err.response;
        if (isNetwork && (cachedProfile || user)) {
          logger.warn('[Auth] Profile fetch failed (network) — keeping cached session');
          setIsAuthenticated(true);
          return true;
        }

        try {
          const token = await refreshAccessToken();
          if (token) {
            try {
              const retry = await authService.getProfile({ signal });
              if (retry.success) {
                setUser(retry.data);
                setIsAuthenticated(true);
                saveCachedProfile(retry.data);
                setSessionMarker();
                return true;
              }
            } catch (retryErr) {
              logger.warn('[Auth] Retry getProfile failed — keeping current session', retryErr);
              if (cachedProfile || user) {
                setIsAuthenticated(true);
                return true;
              }
            }
          } else {
            // No valid token obtained
            clearAuthStorage();
            clearCachedProfile();
            setUser(null);
            setIsAuthenticated(false);
            return false;
          }
        } catch (refreshErr) {
          const isExplicitAuthReject =
            refreshErr?.response?.status === 401 ||
            refreshErr?.response?.status === 403 ||
            refreshErr?.code === 'ERR_NO_SESSION';

          if (isExplicitAuthReject) {
            logger.warn('[Auth] Token refresh rejected by server — clearing expired session');
            clearAuthStorage();
            clearCachedProfile();
            setUser(null);
            setIsAuthenticated(false);
            return false;
          }

          logger.warn(
            '[Auth] Token refresh attempt failed due to network/transient error — preserving session for offline retry',
            refreshErr,
          );
          if (cachedProfile || user) {
            setIsAuthenticated(true);
            return true;
          }
        }

        if (cachedProfile || user) {
          setIsAuthenticated(true);
          return true;
        }
        return false;
      } finally {
        setAuthBootstrapActive(false);
      }
      return false;
    },
    [logout, cachedProfile, user],
  );

  useEffect(() => {
    if (initStarted.current) return;
    initStarted.current = true;

    if (!hasStoredSession && !cachedProfile) {
      console.warn('[AUTH_DEBUG] No stored session and no cached profile on mount.');
      setLoading(false);
      setIsAuthInitialized(true);
      return;
    }

    if (cachedProfile) {
      setUser(cachedProfile);
      setIsAuthenticated(true);
    }

    const controller = new AbortController();

    const safetyTimeout = setTimeout(() => {
      logger.warn('[Auth] Session restoration timeout reached — forcing loader to turn off');
      if (hasStoredSession && !cachedProfile) {
        setLoading(false);
        setIsAuthInitialized(true);
      }
    }, 8000);

    (async () => {
      try {
        await restoreSession(controller.signal);
      } catch (restoreErr) {
        logger.error('[Auth] Critical error during session restoration', restoreErr);
      } finally {
        clearTimeout(safetyTimeout);
        setLoading(false);
        setIsAuthInitialized(true);
      }
    })();

    return () => {
      controller.abort();
      clearTimeout(safetyTimeout);
    };
  }, [restoreSession, cachedProfile, hasStoredSession]);

  useEffect(() => {
    const handleUnauthorized = () => {
      logout(true);
    };
    window.addEventListener('auth-unauthorized', handleUnauthorized);
    return () => {
      window.removeEventListener('auth-unauthorized', handleUnauthorized);
    };
  }, [logout]);

  // Proactive background silent refresh (every 12 minutes, before 15-minute access token expiry)
  useEffect(() => {
    if (!isAuthenticated) return;

    const PROACTIVE_REFRESH_MS = 12 * 60 * 1000;
    const timer = setInterval(async () => {
      try {
        await refreshAccessToken();
      } catch (err) {
        logger.warn(
          '[Auth] Proactive token refresh failed (will auto-retry on next API call):',
          err,
        );
      }
    }, PROACTIVE_REFRESH_MS);

    return () => clearInterval(timer);
  }, [isAuthenticated]);

  useEffect(() => {
    import('../utils/core/observability')
      .then(({ setUserContext }) => {
        setUserContext(user);
      })
      .catch((err) => logger.error('Failed to load observability context:', err));
  }, [user]);

  const openAuthModal = () => setIsAuthModalOpen(true);
  const closeAuthModal = () => {
    setIsAuthModalOpen(false);
    setIntendedAction(null);
  };

  const runProtectedAction = useCallback(
    (actionCallback) => {
      if (isAuthenticated) {
        actionCallback();
        return true;
      }
      setIntendedAction(() => actionCallback);
      setIsAuthModalOpen(true);
      toast.error('Authentication required to access this feature');
      return false;
    },
    [isAuthenticated],
  );

  const loginSuccess = useCallback(
    async (userData, token, refreshToken, options = {}) => {
      const accessToken = token || null;
      if (!accessToken) {
        logger.error('[Auth] loginSuccess called without access token');
        toast.error('Sign-in incomplete. Please try again.');
        return;
      }

      setAccessToken(accessToken);
      setSessionMarker();
      setFallbackRefreshToken(refreshToken);

      setUser(userData);
      setIsAuthenticated(true);
      setIsAuthInitialized(true);
      setLoading(false);
      saveCachedProfile(userData);

      if (options?.keepModalOpen) {
        return;
      }

      setIsAuthModalOpen(false);

      toast.success('Welcome back!');

      const searchParams = new URLSearchParams(window.location.search);
      const redirectUrl = searchParams.get('redirect');

      if (redirectUrl) {
        if (redirectUrl.startsWith('/') && !redirectUrl.startsWith('//')) {
          if (redirectUrl.startsWith('/admin') && !ADMIN_ROLES.includes(userData?.role)) {
            navigate('/');
          } else {
            navigate(redirectUrl);
          }
          return;
        }
      }

      if (ADMIN_ROLES.includes(userData?.role)) {
        navigate('/admin');
        return;
      }

      if (intendedAction) {
        try {
          await intendedAction();
        } catch (err) {
          logger.error('Failed to auto-execute intended action after login:', err);
        }
        setIntendedAction(null);
      }
    },
    [intendedAction, navigate],
  );

  const updateUser = useCallback((userData) => {
    setUser((prev) => {
      const next = typeof userData === 'function' ? userData(prev) : { ...prev, ...userData };
      saveCachedProfile(next);
      return next;
    });
  }, []);

  const contextValue = useMemo(
    () => ({
      user,
      setUser,
      updateUser,
      loading,
      isAuthenticated,
      logout,
      restoreSession,
      checkAuth: restoreSession,
      isAuthModalOpen,
      openAuthModal,
      closeAuthModal,
      runProtectedAction,
      loginSuccess,
      isAuthInitialized,
    }),
    [
      user,
      updateUser,
      loading,
      isAuthenticated,
      logout,
      restoreSession,
      isAuthModalOpen,
      isAuthInitialized,
      runProtectedAction,
      loginSuccess,
    ],
  );

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
}
