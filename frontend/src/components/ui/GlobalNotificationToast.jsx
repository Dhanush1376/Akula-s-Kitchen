import React, { useEffect, useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { m as motion, AnimatePresence } from 'framer-motion';
import { Bell, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { notificationService, orderService } from '../../services/domainServices';
import { useAuth } from '../../context/AuthContext';
import { useUserSocket } from '../../context/UserSocketProvider';

const STORAGE_KEY = 'lastSeenNotificationId';

const getNotificationImage = (notif) => {
  if (!notif) return null;
  return (
    notif.metadata?.imageSrc ||
    notif.metadata?.image ||
    notif.metadata?.thumbnail ||
    notif.metadata?.productImage ||
    notif.imageSrc ||
    notif.image ||
    null
  );
};

const simplifyNotificationText = (title, message) => {
  const raw = `${title || ''} ${message || ''}`.toLowerCase();

  // Plain-English status mapping for instant understanding
  if (raw.includes('delivered')) return 'Order delivered';
  if (raw.includes('out_for_delivery') || raw.includes('out for delivery'))
    return 'Out for delivery';
  if (raw.includes('shipped') || raw.includes('dispatched')) return 'Order shipped';
  if (
    raw.includes('setup_in_progress') ||
    raw.includes('in progress') ||
    raw.includes('processing')
  ) {
    return 'Order in progress';
  }
  if (
    raw.includes('order created') ||
    raw.includes('order confirmed') ||
    raw.includes('placed successfully')
  ) {
    return 'Order confirmed';
  }
  if (raw.includes('cancelled') || raw.includes('canceled')) return 'Order cancelled';
  if (raw.includes('refund')) return 'Refund processed';
  if (raw.includes('payment failed')) return 'Payment failed';
  if (raw.includes('payment captured') || raw.includes('payment successful')) {
    return 'Payment successful';
  }
  if (raw.includes('new order')) return 'New order received';

  // Fallback: clean up raw title into simple readable format
  let clean = (title || message || 'Notification')
    .replace(/status is now ([a-z_]+)/gi, (m, p) => `Status: ${p.replace(/_/g, ' ')}`)
    .replace(/is now ([a-z_]+)/gi, (m, p) => `${p.replace(/_/g, ' ')}`)
    .replace(/\b[a-z0-9_-]{16,}\b/gi, '') // remove long hashes or mongo IDs
    .replace(/\(\+\d+\s+more\)/gi, '')
    .replace(/_/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();

  if (clean.length > 32) {
    clean = clean.slice(0, 32).trim() + '…';
  }
  return clean;
};

const formatNotificationMessage = (msg) => {
  if (!msg) return '';
  return msg
    .replace(/\b(exchange|return)\s+request\s+[A-Za-z0-9_-]+\s+/gi, '$1 request ')
    .replace(/\border\s+(#[A-Za-z0-9_-]+|[A-Za-z0-9_-]{8,})\s+/gi, 'order ')
    .replace(/status is now ([a-z_]+)/gi, (match, p1) => `status is now ${p1.replace(/_/g, ' ')}`)
    .replace(/\s{2,}/g, ' ')
    .trim();
};

export function GlobalNotificationToast() {
  const [latestNotification, setLatestNotification] = useState(null);
  const [showToast, setShowToast] = useState(false);
  const [resolvedImage, setResolvedImage] = useState(null);
  const [imageError, setImageError] = useState(false);
  const navigate = useNavigate();
  const { isAuthenticated, isAuthInitialized } = useAuth();
  const socket = useUserSocket();

  const pollingIntervalRef = useRef(null);
  const hideTimeoutRef = useRef(null);
  const seenNotificationIdsRef = useRef(new Set([localStorage.getItem(STORAGE_KEY)]));
  const lastTriggerTimeRef = useRef(0);
  const lastTriggerContentRef = useRef('');

  const triggerToast = useCallback((notif) => {
    if (!notif) return;
    const notifId = notif._id || notif.id;
    const contentKey = `${notif.title || ''}:${notif.message || ''}`;
    const now = Date.now();

    // Prevent popping up twice:
    // 1. By ID check against seen set or localStorage
    if (notifId) {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === notifId || seenNotificationIdsRef.current.has(notifId)) {
        return;
      }
      seenNotificationIdsRef.current.add(notifId);
      localStorage.setItem(STORAGE_KEY, notifId);
    }

    // 2. By content key check within 5 seconds (guards against duplicate socket + polling without IDs)
    if (now - lastTriggerTimeRef.current < 5000 && lastTriggerContentRef.current === contentKey) {
      return;
    }

    lastTriggerTimeRef.current = now;
    lastTriggerContentRef.current = contentKey;

    setLatestNotification(notif);
    setShowToast(true);

    // Broadcast unread status change to update badges across the app
    window.dispatchEvent(
      new CustomEvent('notifications_status_changed', {
        detail: { hasUnread: true },
      }),
    );

    // Auto-dismiss after 4.5 seconds
    if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    hideTimeoutRef.current = setTimeout(() => {
      setShowToast(false);
    }, 4500);
  }, []);

  const fetchLatestNotification = useCallback(async () => {
    if (!isAuthenticated || !isAuthInitialized) return;

    try {
      const res = await notificationService.getMyNotifications({ limit: 1 });
      const notifications = res?.data || [];
      if (notifications.length > 0) {
        const notif = notifications[0];
        const notifId = notif._id || notif.id;
        const storedId = localStorage.getItem(STORAGE_KEY);

        // Update sidebar/navbar unread badge
        window.dispatchEvent(
          new CustomEvent('notifications_status_changed', {
            detail: { hasUnread: !notif.read },
          }),
        );

        // Only show toast if unread, not previously toasted, and recent (last 10 minutes)
        const isRecent = notif.createdAt
          ? Date.now() - new Date(notif.createdAt).getTime() < 10 * 60 * 1000
          : false;

        if (
          !notif.read &&
          storedId !== notifId &&
          !seenNotificationIdsRef.current.has(notifId) &&
          isRecent
        ) {
          triggerToast(notif);
        }
      }
    } catch {
      // Silently fail background fetch
    }
  }, [isAuthenticated, isAuthInitialized, triggerToast]);

  // Handle socket events for real-time updates across the app
  useEffect(() => {
    if (!socket) return;

    const handleNewNotif = (notif) => {
      if (notif) {
        triggerToast(notif);
      }
    };

    const handleUpdateEvent = () => {
      // Small timeout to allow backend jobs/outbox to commit the notification
      setTimeout(() => {
        fetchLatestNotification();
      }, 700);
    };

    socket.on('notification:new', handleNewNotif);
    socket.on('order_status_updated', handleUpdateEvent);
    socket.on('order_status_update', handleUpdateEvent);
    socket.on('refund:status_updated', handleUpdateEvent);

    return () => {
      socket.off('notification:new', handleNewNotif);
      socket.off('order_status_updated', handleUpdateEvent);
      socket.off('order_status_update', handleUpdateEvent);
      socket.off('refund:status_updated', handleUpdateEvent);
    };
  }, [socket, triggerToast, fetchLatestNotification]);

  // Listen for programmatic notification events
  useEffect(() => {
    const handleCustomToast = (e) => {
      if (e.detail) {
        triggerToast(e.detail);
      }
    };

    window.addEventListener('show_notification_toast', handleCustomToast);
    return () => {
      window.removeEventListener('show_notification_toast', handleCustomToast);
    };
  }, [triggerToast]);

  // Initial fetch and 15-second polling interval
  useEffect(() => {
    if (isAuthenticated && isAuthInitialized) {
      fetchLatestNotification();
      pollingIntervalRef.current = setInterval(fetchLatestNotification, 15000);
    } else {
      if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
    }

    return () => {
      if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    };
  }, [isAuthenticated, isAuthInitialized, fetchLatestNotification]);

  useEffect(() => {
    if (!latestNotification) {
      setResolvedImage(null);
      setImageError(false);
      return;
    }

    setImageError(false);
    const directImage = getNotificationImage(latestNotification);
    if (directImage) {
      setResolvedImage(directImage);
      return;
    }

    // Dynamic resolution if notification image isn't directly on metadata
    let isMounted = true;
    const resolveAsyncImage = async () => {
      try {
        const metadata = latestNotification.metadata || {};
        if (
          latestNotification.type === 'order' ||
          metadata.orderId ||
          latestNotification.title?.toLowerCase().includes('order')
        ) {
          if (metadata.orderId) {
            const orderRes = await orderService.getById(metadata.orderId);
            const order = orderRes?.data || orderRes;
            const img = order?.items?.[0]?.imageSrc || order?.items?.[0]?.image;
            if (img && isMounted) {
              setResolvedImage(img);
              return;
            }
          }
        }
      } catch {
        // Silently fallback to bell icon
      }
    };

    resolveAsyncImage();

    return () => {
      isMounted = false;
    };
  }, [latestNotification]);

  const handleToastClick = () => {
    if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    setShowToast(false);

    // Mark as read in background
    if (latestNotification?._id) {
      notificationService.markNotificationRead(latestNotification._id).catch(() => {});

      if (latestNotification.actionUrl) {
        if (latestNotification.actionUrl.startsWith('/dashboard/orders/')) {
          navigate('/dashboard/orders');
        } else {
          navigate(latestNotification.actionUrl);
        }
      } else {
        navigate('/dashboard?drawer=notifications');
      }
    }
  };

  const getTimeAgo = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) return `${diffDays}d ago`;
    if (diffHours > 0) return `${diffHours}h ago`;
    if (diffMins > 0) return `${diffMins}m ago`;
    return 'Just now';
  };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {showToast && latestNotification && (
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0, transition: { duration: 0.3 } }}
          className="fixed top-20 sm:top-6 left-0 right-0 z-[9999999] flex justify-center pointer-events-none px-4"
        >
          <div
            onClick={handleToastClick}
            className="pointer-events-auto cursor-pointer bg-white dark:bg-zinc-900 shadow-[0_10px_25px_-4px_rgba(0,0,0,0.16),0_3px_8px_-2px_rgba(0,0,0,0.06)] border border-neutral-200/90 dark:border-white/10 rounded-full sm:rounded-[18px] w-auto max-w-[min(348px,calc(100vw-32px))] sm:w-[420px] sm:max-w-md h-[46px] sm:h-[80px] px-3.5 py-1 sm:p-3.5 sm:pr-6 flex items-center gap-2.5 sm:gap-3.5 transition-all hover:scale-[1.02] group box-border overflow-hidden select-none"
          >
            {/* Image or Icon Container */}
            <div className="w-[30px] h-[30px] sm:w-[76px] sm:h-[76px] rounded-full sm:rounded-[18px] overflow-hidden bg-neutral-100 dark:bg-zinc-800 flex-shrink-0 flex items-center justify-center border border-black/5 dark:border-white/10 shadow-2xs relative">
              {resolvedImage && !imageError ? (
                <img
                  src={resolvedImage}
                  alt={latestNotification.title || 'Notification Thumbnail'}
                  className="w-full h-full object-cover rounded-full sm:rounded-[18px] transition-transform duration-300 group-hover:scale-105"
                  onError={() => setImageError(true)}
                  loading="eager"
                />
              ) : (
                <div className="w-full h-full sm:w-12 sm:h-12 rounded-full sm:rounded-[18px] bg-primary/10 flex items-center justify-center">
                  <Bell className="w-3.5 h-3.5 sm:w-6 sm:h-6 text-primary" strokeWidth={1.8} />
                </div>
              )}
            </div>

            {/* Content Column: Clean, simple, easy-to-understand message with smaller font */}
            <div className="flex-1 min-w-0 flex flex-col justify-center gap-0.5 overflow-hidden">
              <span className="font-medium text-[11.5px] sm:text-[13px] text-on-surface truncate whitespace-nowrap overflow-hidden text-ellipsis leading-none tracking-normal">
                {simplifyNotificationText(latestNotification.title, latestNotification.message)}
              </span>
              <p className="hidden sm:block text-[11px] text-secondary/70 dark:text-white/60 truncate whitespace-nowrap leading-relaxed">
                {formatNotificationMessage(latestNotification.message)}
              </p>
            </div>

            {/* Right Meta Column: Timestamp on top, small arrow below */}
            <div className="flex items-center gap-1.5 sm:flex-col sm:items-end sm:justify-between sm:self-stretch sm:py-0.5 flex-shrink-0">
              <span className="text-[11px] text-secondary/60 dark:text-white/50 font-medium whitespace-nowrap leading-none">
                {getTimeAgo(latestNotification.createdAt)}
              </span>
              <ArrowRight
                size={13}
                strokeWidth={2.2}
                className="text-secondary/40 group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0 hidden sm:block"
              />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
