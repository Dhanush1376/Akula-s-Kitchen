import { m as motion } from 'framer-motion';
import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

import { useAdmin } from '../context/AdminContext';
import { useConfig } from '../../context/ConfigContext';
import storeSettingsService from '../../services/api/storeSettingsService';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import {
  PageHeader,
  AdminDashboardSkeleton,
  getRelativeTime,
  stagger,
  CHART_COLORS,
} from '../components/AdminUIKit';
import { AdminDashboardRecents } from '../components/dashboard/AdminDashboardRecents';
import { AdminDashboardActivity } from '../components/dashboard/AdminDashboardActivity';
import { AdminDashboardCharts } from '../components/dashboard/AdminDashboardCharts';
import { AdminDashboardStats } from '../components/dashboard/AdminDashboardStats';

export function AdminDashboard() {
  const {
    orders,
    products,
    dashboardStats,
    customers,
    auditLogs,
    lastDataRefresh,
    refreshDashboard,
    refreshOrders,
    dataLoading,
    safetyLock,
    activeRole,
    logAdminAction,
  } = useAdmin();
  const { isStoreClosed } = useConfig();
  const navigate = useNavigate();
  const [chartPeriod, setChartPeriod] = useState('all-time');
  const [isTogglingStore, setIsTogglingStore] = useState(false);
  const isMobile = useMediaQuery('(max-width: 768px)');

  // Auto-refresh dashboard data every 60 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      refreshDashboard();
      refreshOrders();
    }, 60000);
    return () => clearInterval(interval);
  }, [refreshDashboard, refreshOrders]);

  // Toggle Store Status (Open / Close Store)
  const handleToggleStore = async () => {
    if (safetyLock) {
      toast.error('Safety Lock Active: Modifying store status is blocked!');
      return;
    }
    if (activeRole === 'viewer') {
      toast.error('Viewer Role: Modifying store status is restricted!');
      return;
    }

    const nextStoreEnabled = isStoreClosed; // If closed, next state is open (storeEnabled: true)
    setIsTogglingStore(true);
    try {
      await storeSettingsService.updateSection('general', {
        storeEnabled: nextStoreEnabled,
      });
      if (nextStoreEnabled) {
        toast.success('Store is now OPEN — Customers can place orders');
      } else {
        toast.success('Store is now CLOSED — Online ordering paused');
      }
      if (typeof logAdminAction === 'function') {
        logAdminAction(
          'UPDATE_STORE_STATUS',
          nextStoreEnabled
            ? 'Opened storefront for customer orders'
            : 'Closed storefront and paused orders',
        );
      }
    } catch (err) {
      toast.error(err?.message || 'Failed to update store status');
    } finally {
      setIsTogglingStore(false);
    }
  };

  // Filter orders by selected timeframe
  const periodOrders = useMemo(() => {
    if (chartPeriod === 'all-time') return orders;
    const now = new Date();
    return orders.filter((o) => {
      const dateVal = o.rawOrder?.createdAt || o.timestamp || o.date;
      if (!dateVal) return false;
      const orderDate = new Date(dateVal);
      if (isNaN(orderDate.getTime())) return false;
      if (chartPeriod === 'today') {
        return (
          orderDate.getDate() === now.getDate() &&
          orderDate.getMonth() === now.getMonth() &&
          orderDate.getFullYear() === now.getFullYear()
        );
      }
      if (chartPeriod === 'weekly') {
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return orderDate >= sevenDaysAgo;
      }
      if (chartPeriod === 'monthly') {
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        return orderDate >= thirtyDaysAgo;
      }
      return true;
    });
  }, [orders, chartPeriod]);

  const pendingOrders = periodOrders.filter((o) => o.status === 'Pending').length;

  const periodSales = useMemo(() => {
    if (chartPeriod === 'all-time') {
      return dashboardStats?.stats?.totalSales !== undefined
        ? dashboardStats.stats.totalSales
        : orders.reduce((sum, o) => sum + (o.total || 0), 0);
    }
    return periodOrders.reduce((sum, o) => sum + (o.total || 0), 0);
  }, [chartPeriod, dashboardStats, orders, periodOrders]);

  // Check if store has no data
  const hasNoStoreData = useMemo(() => {
    const hasOrders = orders && orders.length > 0;
    const hasSales = Boolean(
      dashboardStats?.stats?.totalSales && dashboardStats.stats.totalSales > 0,
    );
    const hasActivity = Boolean(
      dashboardStats?.recentActivity && dashboardStats.recentActivity.length > 0,
    );
    return !hasOrders && !hasSales && !hasActivity;
  }, [orders, dashboardStats]);

  // Prepare Revenue Overview data from backend
  const revenueChartData = useMemo(() => {
    if (dashboardStats?.monthlyRevenue && dashboardStats.monthlyRevenue.length > 0) {
      return [...dashboardStats.monthlyRevenue].reverse();
    }
    return [];
  }, [dashboardStats]);

  // Use top categories from backend dynamically
  const categoryChartData = useMemo(() => {
    if (dashboardStats?.categoryPerformance && dashboardStats.categoryPerformance.length > 0) {
      const total = dashboardStats.categoryPerformance.reduce(
        (sum, item) => sum + (item.value || 0),
        0,
      );
      return dashboardStats.categoryPerformance.map((item, idx) => ({
        name: item.name,
        value: total > 0 ? Math.round((item.value / total) * 100) : 0,
        fill: CHART_COLORS[idx % CHART_COLORS.length],
      }));
    }
    return [];
  }, [dashboardStats]);

  // Use real-time activity stream from backend
  const dynamicRecentActivity = useMemo(() => {
    if (!dashboardStats?.recentActivity) return [];

    return dashboardStats.recentActivity.map((item) => {
      let icon = 'notifications';
      if (item.type === 'order') icon = 'shopping_bag';
      else if (item.type === 'system') icon = 'shield';
      else if (item.type === 'user') icon = 'person';

      return {
        ...item,
        icon,
        text: `[${item.user}] ${item.action}`,
        time: getRelativeTime(new Date(item.timestamp)),
      };
    });
  }, [dashboardStats]);

  // Compute weekly metrics
  const weeklyOrderStats = useMemo(() => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dailyMap = {};
    days.forEach((day) => {
      dailyMap[day] = { day, ordersCount: 0, itemsCount: 0 };
    });

    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    orders.forEach((o) => {
      if (!o.rawOrder?.createdAt) return;
      const date = new Date(o.rawOrder.createdAt);
      if (date >= oneWeekAgo) {
        const dayName = days[date.getDay()];
        dailyMap[dayName].ordersCount += 1;
        const itemsSold = Array.isArray(o.rawOrder.items)
          ? o.rawOrder.items.reduce((sum, item) => sum + (item.quantity || 0), 0)
          : 1;
        dailyMap[dayName].itemsCount += itemsSold;
      }
    });
    return days.map((day) => dailyMap[day]);
  }, [orders]);

  const [isRefreshing, setIsRefreshing] = useState(false);

  // Trending products
  const trendingProducts = useMemo(() => {
    if (!products || products.length === 0) return [];
    return [...products].sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 4);
  }, [products]);

  const quickActions = [
    {
      icon: 'shopping_bag',
      label: 'All Orders',
      path: '/admin/orders',
      color: '#5a7d9a',
    },
    {
      icon: 'inventory_2',
      label: 'Catalog',
      path: '/admin/products',
      color: '#D4A41C',
    },
    {
      icon: 'stream',
      label: 'Live Activity',
      path: '/admin/analytics/operations',
      color: '#58856b',
    },
  ];

  const handleManualSync = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([refreshDashboard(), refreshOrders()]);
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  if (dataLoading) {
    return <AdminDashboardSkeleton />;
  }

  return (
    <motion.div initial="hidden" animate="show" variants={stagger} className="space-y-6 pb-8">
      {/* Header */}
      <PageHeader
        title="Dashboard"
        subtitle={
          <div className="flex flex-wrap items-center gap-2 text-[12.5px] mt-0.5">
            <span className="font-semibold text-[var(--admin-text-primary)]">
              Business Overview
            </span>
            <span className="text-[var(--admin-border-strong)]">•</span>
            <span className="text-[var(--admin-text-secondary)]">{orders.length} orders total</span>
            <span className="text-[var(--admin-border-strong)]">•</span>
            <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 dark:text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              {lastDataRefresh
                ? `Synced ${lastDataRefresh.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                : 'Live operational stream'}
            </span>
          </div>
        }
        headerAction={
          <div className="flex items-center justify-end gap-1.5 sm:gap-2 w-full sm:w-auto overflow-x-auto custom-scrollbar pb-1 sm:pb-0 shrink-0 ml-auto">
            {/* Store Status Toggle Button (Close Store / Open Store) (42px locked height) */}
            <button
              type="button"
              onClick={handleToggleStore}
              disabled={isTogglingStore}
              className={`h-[42px] min-h-[42px] max-h-[42px] px-2.5 sm:px-3 rounded-[4px] border shadow-2xs flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95 disabled:opacity-60 shrink-0 select-none ${
                isStoreClosed
                  ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-900 dark:text-amber-200 border-amber-500/30'
                  : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-900 dark:text-emerald-200 border-emerald-500/30'
              }`}
              title={
                isStoreClosed
                  ? 'Store is currently CLOSED to online orders. Click to open store.'
                  : 'Store is currently OPEN to online orders. Click to close store.'
              }
            >
              {/* Status Dot */}
              <span className="relative flex h-2 w-2 shrink-0">
                {!isStoreClosed && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                )}
                <span
                  className={`relative inline-flex rounded-full h-2 w-2 ${
                    isStoreClosed ? 'bg-amber-500' : 'bg-emerald-500'
                  }`}
                />
              </span>

              {/* Status Label */}
              <span className="text-[11.5px] font-bold whitespace-nowrap">
                <span className="hidden sm:inline">Store </span>
                {isStoreClosed ? 'Closed' : 'Open'}
              </span>

              {/* Visual Toggle Pill Switch */}
              <div
                className={`w-7 h-3.5 rounded-full p-0.5 transition-colors relative flex items-center shrink-0 ${
                  isStoreClosed ? 'bg-stone-300 dark:bg-stone-600' : 'bg-emerald-600'
                }`}
                aria-hidden="true"
              >
                <span
                  className={`w-2.5 h-2.5 rounded-full bg-white shadow-xs transition-transform transform ${
                    isStoreClosed ? 'translate-x-0' : 'translate-x-3.5'
                  } ${isTogglingStore ? 'animate-pulse' : ''}`}
                />
              </div>
            </button>

            {/* Period Switcher (42px locked height) */}
            <div className="bg-[var(--admin-surface-muted)] p-1 rounded-[4px] border border-[var(--admin-border)] flex items-center gap-1 h-[42px] min-h-[42px] max-h-[42px] box-border shadow-2xs shrink-0">
              {[
                { id: 'today', label: 'Today' },
                { id: 'weekly', label: '7D' },
                { id: 'monthly', label: 'Month' },
                { id: 'all-time', label: 'All' },
              ].map((p) => {
                const isSelected = chartPeriod === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setChartPeriod(p.id)}
                    className={`h-[32px] min-h-[32px] max-h-[32px] px-2.5 sm:px-3.5 rounded-[3px] text-[11.5px] sm:text-[12px] font-bold transition-all flex items-center justify-center cursor-pointer whitespace-nowrap box-border leading-none ${
                      isSelected
                        ? 'bg-white dark:bg-stone-800 text-[var(--admin-accent)] shadow-xs font-bold'
                        : 'text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)] hover:bg-white/40 dark:hover:bg-stone-800/40'
                    }`}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>

            {/* Sync Now Button (42px locked height) */}
            <button
              type="button"
              onClick={handleManualSync}
              disabled={isRefreshing}
              className="h-[42px] min-h-[42px] max-h-[42px] px-2.5 sm:px-3 bg-[var(--admin-surface)] hover:bg-[var(--admin-surface-hover)] text-[var(--admin-text-primary)] rounded-[4px] border border-[var(--admin-border)] shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-95 disabled:opacity-60 shrink-0"
              title="Click to sync live dashboard data"
            >
              <span
                className={`material-symbols-outlined text-[17px] text-[var(--admin-accent)] ${
                  isRefreshing ? 'animate-spin' : ''
                }`}
              >
                sync
              </span>
              <span className="text-[11.5px] font-bold whitespace-nowrap hidden sm:inline">
                Sync Now
              </span>
            </button>
          </div>
        }
      />

      {/* ─── Store Closed Notice Banner ─── */}
      {isStoreClosed && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-amber-500/10 border border-amber-500/30 rounded-[4px] p-3 sm:px-4 flex flex-wrap items-center justify-between gap-3 text-amber-900 dark:text-amber-200"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="material-symbols-outlined text-[20px] text-amber-600 dark:text-amber-400 shrink-0">
              storefront
            </span>
            <div className="text-[12px] min-w-0">
              <span className="font-bold">Storefront is currently closed.</span>{' '}
              <span className="text-amber-800/80 dark:text-amber-300/80 hidden sm:inline">
                Customer checkout and online orders are temporarily paused.
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={handleToggleStore}
            disabled={isTogglingStore}
            className="h-[30px] px-3 bg-amber-600 hover:bg-amber-700 text-white rounded-[3px] text-[11px] font-bold transition-all flex items-center gap-1.5 cursor-pointer ml-auto shrink-0 shadow-xs active:scale-95 disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-[15px]">lock_open</span>
            Open Store Now
          </button>
        </motion.div>
      )}

      {/* ─── No Store Data Available Banner ─── */}
      {hasNoStoreData && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[var(--admin-surface)] border border-dashed border-[var(--admin-border-strong)] rounded-[4px] p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-2xs"
        >
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-10 h-10 rounded-[4px] bg-[var(--admin-surface-muted)] border border-[var(--admin-border)] flex items-center justify-center text-[var(--admin-accent)] shrink-0">
              <span className="material-symbols-outlined text-[22px]">bar_chart</span>
            </div>
            <div>
              <p className="text-[13px] font-bold text-[var(--admin-text-primary)]">
                No Store Data Available Yet
              </p>
              <p className="text-[11.5px] text-[var(--admin-text-secondary)] mt-0.5">
                There are no orders or sales recorded yet. Once customer orders are placed, live
                telemetry and revenue analytics will appear automatically.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => navigate('/admin/products/add')}
              className="h-[34px] px-3.5 bg-[var(--admin-accent)] hover:opacity-90 text-white text-[11.5px] font-bold rounded-[3px] flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-xs w-full sm:w-auto"
            >
              <span className="material-symbols-outlined text-[16px]">add</span>
              Add Product
            </button>
          </div>
        </motion.div>
      )}

      {/* ─── 3-Column Connected Financial & Operational Telemetry Ledger ─── */}
      <AdminDashboardStats
        dashboardStats={dashboardStats}
        pendingOrders={pendingOrders}
        customers={customers}
        periodSales={periodSales}
      />

      {/* ─── Charts & Trends Row ─── */}
      <AdminDashboardCharts
        orders={periodOrders}
        revenueChartData={revenueChartData}
        categoryChartData={categoryChartData}
        weeklyOrderStats={weeklyOrderStats}
        isMobile={isMobile}
      />

      {/* ─── Operations & Activity Row ─── */}
      <AdminDashboardActivity
        quickActions={quickActions}
        dynamicRecentActivity={dynamicRecentActivity}
        products={products}
      />

      {/* ─── Recents & Catalog Row ─── */}
      <AdminDashboardRecents orders={periodOrders} trendingProducts={trendingProducts} />
    </motion.div>
  );
}
