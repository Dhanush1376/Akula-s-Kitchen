import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import logger from '../utils/core/logger';
import {
  registerServiceWorker,
  applyServiceWorkerUpdate,
} from '../services/pwa/serviceWorkerRegistration';

const PwaContext = createContext(null);

const COOLDOWN_KEY = 'akula_pwa_install_dismissed_until';
const DISMISS_COUNT_KEY = 'akula_pwa_install_dismiss_count';
const INSTALLED_KEY = 'akula_pwa_installed';
const DISMISS_COOLDOWN_MS = 14 * 24 * 60 * 60 * 1000; // 14 days cooldown
const MAX_AUTO_DISMISSALS = 2; // Stop auto-nagging after 2 dismissals

const EXCLUDED_ROUTES = ['/checkout', '/cart', '/auth', '/order-success', '/admin'];

import { checkIsStandalone, checkIsIos, checkIsIosSafari } from '../utils/pwa/pwaDetection';

export { checkIsStandalone, checkIsIos, checkIsIosSafari };

export function PwaProvider({ children }) {
  const location = useLocation();
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isStandalone, setIsStandalone] = useState(checkIsStandalone);
  const [isInstalled, setIsInstalled] = useState(() => {
    return (
      checkIsStandalone() ||
      (typeof window !== 'undefined' && localStorage.getItem(INSTALLED_KEY) === 'true')
    );
  });
  const [isInstallDrawerOpen, setIsInstallDrawerOpen] = useState(false);
  const [isUpdateAvailable, setIsUpdateAvailable] = useState(false);
  const waitingRegistrationRef = useRef(null);
  const sessionDismissedRef = useRef(false);

  const isIos = checkIsIos();
  const isIosSafari = checkIsIosSafari();

  // Redirect to the installed app
  const redirectToInstalledApp = useCallback(() => {
    logger.info('[PWA] Launching redirect to installed app');
    try {
      window.location.href = 'web+akula://open';
    } catch (err) {
      logger.info('[PWA] Protocol scheme redirect attempted', err);
    }
    setTimeout(() => {
      window.open('/?source=pwa', '_blank');
    }, 350);
  }, []);

  // Installable condition
  const isInstallable = !isStandalone && !isInstalled && (!!deferredPrompt || isIosSafari);

  // 1. Register service worker once on mount
  useEffect(() => {
    registerServiceWorker({
      onUpdate: (registration) => {
        waitingRegistrationRef.current = registration;
        setIsUpdateAvailable(true);
      },
    });

    const handleUpdateEvent = (event) => {
      waitingRegistrationRef.current = event.detail?.registration;
      setIsUpdateAvailable(true);
    };

    window.addEventListener('akula:pwa:update-available', handleUpdateEvent);
    return () => {
      window.removeEventListener('akula:pwa:update-available', handleUpdateEvent);
    };
  }, []);

  // 2. Check getInstalledRelatedApps if supported
  useEffect(() => {
    if (typeof navigator !== 'undefined' && 'getInstalledRelatedApps' in navigator) {
      navigator
        .getInstalledRelatedApps()
        .then((apps) => {
          if (apps && apps.length > 0) {
            setIsInstalled(true);
            localStorage.setItem(INSTALLED_KEY, 'true');
          }
        })
        .catch(() => {});
    }
  }, []);

  // 3. Monitor display-mode changes
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const handleChange = (e) => {
      const active = e.matches;
      setIsStandalone(active);
      if (active) {
        setIsInstalled(true);
        localStorage.setItem(INSTALLED_KEY, 'true');
        setIsInstallDrawerOpen(false);
        document.documentElement.classList.add('is-standalone');
      }
    };

    if (mediaQuery.matches) {
      document.documentElement.classList.add('is-standalone');
    }

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, []);

  // 4. Listen for beforeinstallprompt & appinstalled
  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      logger.info('[PWA] Captured beforeinstallprompt event');
      setDeferredPrompt(e);
    };

    const handleAppInstalled = () => {
      logger.info('[PWA] App successfully installed by user');
      setIsInstalled(true);
      setIsStandalone(true);
      setDeferredPrompt(null);
      localStorage.setItem(INSTALLED_KEY, 'true');
      toast.success("Akula's Kitchen installed successfully! Opening app...", {
        icon: '🎉',
        duration: 4000,
      });
      // Automatically redirect to the installed app
      redirectToInstalledApp();
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [redirectToInstalledApp]);

  // 5. Open prompt EVERY TIME the website is opened if not installed, or redirect if installed
  useEffect(() => {
    if (checkIsStandalone()) return;

    // Check sensitive routes
    const isExcludedRoute = EXCLUDED_ROUTES.some((route) => location.pathname.startsWith(route));
    if (isExcludedRoute) return;

    // If dismissed during this active session, do not re-trigger on internal route changes
    if (sessionDismissedRef.current) return;

    const alreadyInstalled =
      checkIsStandalone() ||
      (typeof window !== 'undefined' && localStorage.getItem(INSTALLED_KEY) === 'true');

    if (alreadyInstalled) {
      // User has installed the app, but opened regular website in browser:
      // Redirect to the app directly
      const timer = setTimeout(() => {
        setIsInstallDrawerOpen(true);
        redirectToInstalledApp();
      }, 900);
      return () => clearTimeout(timer);
    }

    // User has NOT installed the app:
    // "if the user did not install shooow this pop up one everytime when he opens the website is that clear"
    const timer = setTimeout(() => {
      if (!checkIsStandalone() && localStorage.getItem(INSTALLED_KEY) !== 'true') {
        setIsInstallDrawerOpen(true);
      }
    }, 750);

    return () => clearTimeout(timer);
  }, [location.pathname, redirectToInstalledApp]);

  // Open install drawer manually
  const openInstallDrawer = useCallback(() => {
    sessionDismissedRef.current = false;
    setIsInstallDrawerOpen(true);
  }, []);

  // Close install drawer
  const closeInstallDrawer = useCallback(() => {
    setIsInstallDrawerOpen(false);
    sessionDismissedRef.current = true;
  }, []);

  // Trigger installation via browser prompt or guide
  const promptNativeInstall = useCallback(async () => {
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        logger.info('[PWA] User choice outcome:', choice.outcome);
        if (choice.outcome === 'accepted') {
          setIsInstalled(true);
          localStorage.setItem(INSTALLED_KEY, 'true');
          toast.success("Akula's Kitchen installed successfully! Opening app...", {
            icon: '🎉',
            duration: 4000,
          });
          redirectToInstalledApp();
        }
        setDeferredPrompt(null);
      } catch (err) {
        logger.warn('[PWA] Error prompting installation:', err);
      }
    } else if (isIosSafari) {
      // Drawer stays open to display iOS Share instructions
    } else {
      toast("Please use your browser's menu to install Akula's Kitchen.", {
        icon: 'ℹ️',
      });
      setIsInstallDrawerOpen(false);
    }
  }, [deferredPrompt, isIosSafari, redirectToInstalledApp]);

  // Apply service worker update
  const applyUpdate = useCallback(() => {
    if (waitingRegistrationRef.current) {
      applyServiceWorkerUpdate(waitingRegistrationRef.current);
    } else {
      window.location.reload();
    }
  }, []);

  const value = {
    isInstallable,
    isInstalled,
    isStandalone,
    isIos,
    isIosSafari,
    hasDeferredPrompt: !!deferredPrompt,
    isInstallDrawerOpen,
    isUpdateAvailable,
    openInstallDrawer,
    closeInstallDrawer,
    promptNativeInstall,
    redirectToInstalledApp,
    applyUpdate,
  };

  return <PwaContext.Provider value={value}>{children}</PwaContext.Provider>;
}

export function usePwa() {
  const context = useContext(PwaContext);
  if (!context) {
    throw new Error('usePwa must be used within a PwaProvider');
  }
  return context;
}
