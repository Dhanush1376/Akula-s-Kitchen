import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Package, CreditCard, Settings, Clock, ArrowRight, CheckCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { notificationService } from '../../services/domainServices';
import { useDashboard } from '../../context/DashboardContext';
import { toast } from 'react-hot-toast';

const getIconForType = (type) => {
  switch (type) {
    case 'order':
      return <Package className="w-4 h-4" strokeWidth={2} />;
    case 'payment':
      return <CreditCard className="w-4 h-4" strokeWidth={2} />;
    case 'system':
      return <Settings className="w-4 h-4" strokeWidth={2} />;
    default:
      return <Bell className="w-4 h-4" strokeWidth={2} />;
  }
};

const resolveImageUrl = (path) => {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  const devUrl = `http://${atob('bG9jYWxob3N0')}:5000`;
  const backend = import.meta.env.VITE_BACKEND_URL || devUrl;
  return `${backend}${path.startsWith('/') ? path : `/${path}`}`;
};

const formatTimeAgo = (dateString) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);

  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;

  return date.toLocaleDateString();
};

const parseNotificationContent = (notification) => {
  let { title, message } = notification;

  // Generic ID extractor (supports RET-, EXC-, ORD-, and raw #hex Mongo IDs)
  const idMatch = message.match(/(RET|EXC|ORD)-[0-9]+/i) || message.match(/#[0-9a-fA-F]{10,24}/i);
  if (idMatch) {
    const id = idMatch[0];
    notification.metadata = {
      ...(notification.metadata || {}),
      entityId: notification.metadata?.entityId || id.replace('#', ''),
    };
    message = message
      .replace(id, '')
      .replace(/\s+/g, ' ')
      .replace('request is', 'is')
      .replace('order is', 'is')
      .trim();
  }

  // Clean raw IDs from message text if present
  message = message
    .replace(/\b(exchange|return)\s+request\s+[A-Za-z0-9_-]+\s+/gi, '$1 request ')
    .replace(/\border\s+(#[A-Za-z0-9_-]+|[A-Za-z0-9_-]{8,})\s+/gi, 'order ')
    .replace(/#[0-9a-fA-F]{10,24}/gi, '')
    .trim();

  // Format snake_case statuses if present
  if (title.includes('Status Update') || title.includes('Status Updated')) {
    const statusMatch =
      message.match(/is now ([a-z_]+)/i) || message.match(/updated to:? ([a-z_]+)/i);
    if (statusMatch) {
      const rawStatus = statusMatch[1];
      const statusMap = {
        inspection_started: 'undergoing quality inspection',
        inspection_passed: 'approved after inspection',
        inspection_failed: 'rejected after inspection',
        return_received: 'received at our warehouse',
        return_picked_up: 'picked up by our courier partner',
        refund_initiated: 'processing for a refund',
        refund_completed: 'refunded successfully',
        refund_failed: 'experiencing an issue with the refund',
      };

      const readableStatus = statusMap[rawStatus] || rawStatus.replace(/_/g, ' ');
      message = message.replace(rawStatus, readableStatus);
    }
  }

  return { ...notification, parsedMessage: message };
};

export function NotificationsSection({ isDrawer = false }) {
  const navigate = useNavigate();
  const { setMobileShowContent, setSelectedOrderId } = useDashboard();

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('All');

  const tabs = ['All', 'Unread', 'Orders', 'Payments'];

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const res = await notificationService.getMyNotifications({ limit: 50 });
      setNotifications((res.data || []).map(parseNotificationContent));
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
      toast.error('Could not load notifications');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    if (!isDrawer) {
      setMobileShowContent(true);
    }
  }, [fetchNotifications, setMobileShowContent, isDrawer]);

  const handleMarkAsRead = async (id, e) => {
    if (e) e.stopPropagation();
    try {
      await notificationService.markNotificationRead(id);
      setNotifications((prev) => prev.map((n) => (n._id === id ? { ...n, read: true } : n)));
      window.dispatchEvent(
        new CustomEvent('notifications_status_changed', {
          detail: { hasUnread: notifications.some((n) => n._id !== id && !n.read) },
        }),
      );
    } catch (err) {
      console.error('Failed to mark read:', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationService.markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      window.dispatchEvent(
        new CustomEvent('notifications_status_changed', { detail: { hasUnread: false } }),
      );
      toast.success('All notifications marked as read');
    } catch (err) {
      toast.error('Failed to update notifications');
    }
  };

  const handleNotificationClick = (notification) => {
    if (!notification.read) {
      handleMarkAsRead(notification._id);
    }
    if (notification.actionUrl) {
      const url = notification.actionUrl;
      if (url.startsWith('/dashboard/orders/')) {
        const orderId = url.split('/').pop();
        if (orderId) {
          setSelectedOrderId(orderId);
          navigate('/dashboard/orders');
          return;
        }
      }
      navigate(url);
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  const filteredNotifications = notifications.filter((n) => {
    if (activeTab === 'All') return true;
    if (activeTab === 'Unread') return !n.read;
    if (activeTab === 'Orders') return n.type === 'order';
    if (activeTab === 'Payments') return n.type === 'payment';
    return true;
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.25 }}
      className={`space-y-3.5 text-left font-sans ${isDrawer ? 'pb-2' : 'pb-8'}`}
    >
      {/* Modern Filter Pills + Optional Mark All Read action */}
      <div className="flex items-center justify-between gap-2 pb-1 mb-2.5">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {tabs.map((tab) => {
            const isActive = activeTab === tab;
            const count =
              tab === 'All'
                ? notifications.length
                : tab === 'Unread'
                  ? unreadCount
                  : tab === 'Orders'
                    ? notifications.filter((n) => n.type === 'order').length
                    : notifications.filter((n) => n.type === 'payment').length;

            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all cursor-pointer shrink-0 ${
                  isActive
                    ? 'bg-[#283618] text-white shadow-2xs'
                    : 'bg-neutral-100/90 text-neutral-600 hover:bg-neutral-200/80 hover:text-neutral-900 border border-neutral-200/40'
                }`}
              >
                <span>{tab}</span>
                {count > 0 && (
                  <span
                    className={`text-[9.5px] px-1.5 py-0.2 rounded-full font-bold ${
                      isActive ? 'bg-white/25 text-white' : 'bg-neutral-200/90 text-neutral-700'
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllAsRead}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10.5px] font-semibold text-[#283618] hover:bg-[#283618]/10 transition-all cursor-pointer shrink-0"
            title="Mark all notifications as read"
          >
            <CheckCheck size={12} strokeWidth={2.2} />
            <span className="hidden sm:inline">Mark all read</span>
          </button>
        )}
      </div>

      {/* Notifications List */}
      <div className="min-h-[200px]">
        {loading ? (
          <div className="space-y-2.5">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="animate-pulse bg-white/70 rounded-xl h-20 w-full border border-neutral-200/50"
              />
            ))}
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="bg-white/60 backdrop-blur-md rounded-2xl p-8 text-center border border-neutral-200/60 shadow-2xs flex flex-col items-center justify-center min-h-[220px]">
            <div className="w-12 h-12 rounded-full bg-[#283618]/10 text-[#283618] flex items-center justify-center mb-3">
              <Bell className="w-5 h-5" strokeWidth={1.8} />
            </div>
            <h3 className="font-sans font-bold text-[14px] text-neutral-900 mb-1">
              All caught up!
            </h3>
            <p className="text-[11.5px] text-neutral-500 max-w-[260px] leading-relaxed">
              No new notifications right now. We'll alert you as updates arrive.
            </p>
          </div>
        ) : (
          <AnimatePresence>
            <div className="space-y-2.5">
              {filteredNotifications.map((notification) => {
                const isUnread = !notification.read;
                return (
                  <motion.div
                    key={notification._id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    onClick={() => handleNotificationClick(notification)}
                    className={`relative overflow-hidden p-3.5 rounded-xl border transition-all cursor-pointer flex gap-3 items-start group font-sans ${
                      isUnread
                        ? 'bg-emerald-500/[0.04] border-emerald-500/25 hover:border-emerald-500/40 shadow-2xs ring-1 ring-emerald-500/10'
                        : 'bg-white/80 hover:bg-white border-neutral-200/70 hover:border-neutral-300 shadow-2xs'
                    }`}
                  >
                    {/* Unread Accent Dot */}
                    {isUnread && (
                      <div className="absolute top-3.5 right-3.5 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-emerald-200 animate-pulse" />
                    )}

                    {/* Icon or Thumbnail */}
                    {notification.metadata?.imageSrc ? (
                      <div className="w-11 h-11 rounded-lg shrink-0 flex items-center justify-center overflow-hidden bg-white shadow-2xs border border-neutral-200/60">
                        <img
                          src={resolveImageUrl(notification.metadata.imageSrc)}
                          alt="Product"
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.target.style.display = 'none';
                          }}
                        />
                      </div>
                    ) : (
                      <div
                        className={`w-9 h-9 rounded-xl shrink-0 flex items-center justify-center ${
                          notification.type === 'order'
                            ? 'bg-[#283618]/10 text-[#283618]'
                            : notification.type === 'payment'
                              ? 'bg-emerald-500/10 text-emerald-700'
                              : 'bg-amber-500/10 text-amber-700'
                        }`}
                      >
                        {getIconForType(notification.type)}
                      </div>
                    )}

                    {/* Details */}
                    <div className="flex-1 min-w-0 pr-3">
                      <div className="flex items-center justify-between gap-2 mb-0.5">
                        <h4
                          className={`text-[12.5px] truncate font-sans ${
                            isUnread
                              ? 'font-bold text-neutral-950'
                              : 'font-semibold text-neutral-800'
                          }`}
                          title={notification.title}
                        >
                          {notification.title}
                        </h4>
                      </div>
                      <p className="text-[11px] text-neutral-600 leading-snug line-clamp-2 mb-1.5 font-sans">
                        {notification.parsedMessage}
                      </p>
                      <div className="flex items-center gap-2 text-[10px] text-neutral-400 font-medium">
                        <span className="flex items-center gap-1">
                          <Clock className="w-2.8 h-2.8" strokeWidth={1.8} />
                          {formatTimeAgo(notification.createdAt)}
                        </span>
                        {notification.metadata?.entityId && (
                          <span className="font-mono bg-neutral-100 text-neutral-600 px-1.5 py-0.2 rounded text-[9.5px]">
                            #{notification.metadata.entityId}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Action indicator arrow */}
                    {notification.actionUrl && (
                      <div className="shrink-0 self-center opacity-0 group-hover:opacity-100 transition-all group-hover:translate-x-0.5 text-[#283618]">
                        <ArrowRight className="w-3.5 h-3.5" strokeWidth={2.2} />
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </AnimatePresence>
        )}
      </div>
    </motion.div>
  );
}
