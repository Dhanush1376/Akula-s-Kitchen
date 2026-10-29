import { useEffect, useRef } from 'react';
import { useNetwork } from '../../context/NetworkContext';
import toast from 'react-hot-toast';

const SLOW_NOTIFICATION_COOLDOWN_MS = 15 * 60 * 1000; // 15 minutes minimum between slow network warnings

/**
 * Non-blocking banner when the API is slow or offline — integrated with global toaster.
 */
export function SlowConnectionBanner() {
  const { networkState, connectionQuality } = useNetwork();
  const lastState = useRef({ networkState: 'online', connectionQuality: 'good' });
  const lastSlowToastTimeRef = useRef(0);

  useEffect(() => {
    if (import.meta.env.DEV) return;
    const prevState = lastState.current;
    const stateChanged =
      prevState.networkState !== networkState || prevState.connectionQuality !== connectionQuality;

    if (!stateChanged) return;
    lastState.current = { networkState, connectionQuality };

    if (networkState === 'offline') {
      toast.error('You are offline.', {
        id: 'network-toast',
        duration: 2500,
      });
    } else if (networkState === 'reconnecting') {
      toast.loading('Reconnecting…', {
        id: 'network-toast',
        duration: 2000,
      });
    } else if (networkState === 'online' && connectionQuality === 'poor') {
      const now = Date.now();
      let lastSlowSession = 0;
      try {
        lastSlowSession = Number(sessionStorage.getItem('akula_last_slow_toast') || '0');
      } catch {
        lastSlowSession = 0;
      }
      const timeSinceLast = Math.max(now - lastSlowSession, now - lastSlowToastTimeRef.current);

      if (timeSinceLast >= SLOW_NOTIFICATION_COOLDOWN_MS) {
        lastSlowToastTimeRef.current = now;
        try {
          sessionStorage.setItem('akula_last_slow_toast', String(now));
        } catch {
          // ignore storage quota/security errors
        }
        toast.error('Slow connection detected.', {
          id: 'network-toast',
          duration: 2500,
        });
      }
    } else if (networkState === 'online' && prevState.networkState !== 'online') {
      toast.success('Back online!', {
        id: 'network-toast',
        duration: 2000,
      });
    }
  }, [networkState, connectionQuality]);

  return null;
}
