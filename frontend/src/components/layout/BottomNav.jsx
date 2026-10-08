import { Link, useLocation } from 'react-router-dom';
import { m as motion } from 'framer-motion';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { useWishlist } from '../../context/WishlistContext';
import { prefetchManager } from '../../utils/performance/prefetchManager';
import { useDashboardData } from '../../hooks/useDashboardData';
import { useMemo, useState, useEffect } from 'react';
import { Home, Store, Heart, ReceiptText, User, LogIn } from 'lucide-react';

const ICONS = {
  home: Home,
  storefront: Store,
  heart: Heart,
  receipt_long: ReceiptText,
  person: User,
  login: LogIn,
};

export function BottomNav() {
  const location = useLocation();
  const { cartCount, setIsCartOpen, isCartOpen } = useCart();
  const { isAuthenticated, openAuthModal, isAuthModalOpen, user } = useAuth();

  let wishlistCount = 0;
  try {
    const wishlist = useWishlist();
    wishlistCount = wishlist?.items?.length || 0;
  } catch (_e) {
    // Outside WishlistProvider fallback
  }

  const userId = user?._id || user?.id;

  const { orders } = useDashboardData(userId);

  const [orderViewsUpdated, setOrderViewsUpdated] = useState(0);
  useEffect(() => {
    const handleUpdate = () => setOrderViewsUpdated((prev) => prev + 1);
    window.addEventListener('akula_order_views_updated', handleUpdate);
    return () => window.removeEventListener('akula_order_views_updated', handleUpdate);
  }, []);

  const hasRecentOrderUpdates = useMemo(() => {
    const allOrders = orders || [];
    if (!allOrders.length) return false;

    const now = Date.now();
    let views = {};
    try {
      views = JSON.parse(localStorage.getItem('akula_order_views') || '{}');
    } catch (e) {}

    return allOrders.some((order) => {
      if (!order.statusHistory || !order.statusHistory.length) return false;
      const lastUpdate = new Date(
        order.statusHistory[order.statusHistory.length - 1].timestamp,
      ).getTime();
      const lastViewTime = views[order._id || order.id] || 0;
      return now - lastUpdate < 24 * 60 * 60 * 1000 && lastUpdate > lastViewTime;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orders, orderViewsUpdated]);

  const navItems = [
    { label: 'Home', icon: 'home', path: '/' },
    { label: 'Shop', icon: 'storefront', path: '/collections' },
    {
      label: 'Wishlist',
      icon: 'heart',
      path: '/wishlist',
      badgeCount: wishlistCount,
    },
    isAuthenticated
      ? {
          label: 'Orders',
          icon: 'receipt_long',
          path: '/dashboard/orders',
          showBadge: hasRecentOrderUpdates,
        }
      : { label: 'Orders', icon: 'receipt_long', onClick: openAuthModal },
    isAuthenticated
      ? { label: 'Account', icon: 'person', path: '/dashboard', exact: true }
      : { label: 'Sign In', icon: 'login', onClick: openAuthModal },
  ];

  const isActive = (path, exact) => {
    if (!path) return false;
    if (path === '/' || exact) return location.pathname === path;
    return location.pathname === path || location.pathname.startsWith(`${path}/`);
  };

  if (
    isCartOpen ||
    location.pathname === '/cart' ||
    location.pathname.startsWith('/cart') ||
    location.pathname === '/checkout' ||
    location.pathname.startsWith('/checkout')
  ) {
    return null;
  }

  return (
    <motion.nav
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      aria-label="Primary"
      className="bottom-nav lg:hidden fixed bottom-3 sm:bottom-3.5 left-3 right-3 max-w-[390px] mx-auto z-[var(--z-overlay)] bg-white/70 backdrop-blur-2xl backdrop-saturate-180 border border-white/80 rounded-full shadow-[0_10px_35px_rgba(0,0,0,0.12),inset_0_1px_1.5px_rgba(255,255,255,0.95),0_1px_3px_rgba(0,0,0,0.05)] px-2 py-1 select-none"
      style={{
        marginBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      <div className="flex items-center justify-around w-full">
        {navItems.map((item) => {
          const active = item.isCart
            ? isCartOpen || location.pathname === '/cart'
            : item.label === 'Sign In' && isAuthModalOpen
              ? true
              : isActive(item.path, item.exact);

          return (
            <div
              key={item.label || item.path}
              className="relative flex items-center justify-center flex-1"
            >
              {item.isCart ? (
                <button
                  onMouseEnter={() => prefetchManager.prefetchRoute('/cart', { kind: 'hover' })}
                  onClick={() => setIsCartOpen(true)}
                  aria-label="Open shopping bag"
                  className="flex items-center justify-center w-full focus:outline-none"
                >
                  <NavIcon
                    active={active}
                    icon={item.icon}
                    label={item.label}
                    badgeCount={cartCount}
                  />
                </button>
              ) : item.onClick ? (
                <button
                  onClick={item.onClick}
                  aria-label={`Open ${item.label}`}
                  className="flex items-center justify-center w-full focus:outline-none"
                >
                  <NavIcon
                    active={false}
                    icon={item.icon}
                    label={item.label}
                    showBadge={item.showBadge}
                  />
                </button>
              ) : (
                <Link
                  to={item.path}
                  onMouseEnter={() => prefetchManager.prefetchRoute(item.path, { kind: 'hover' })}
                  aria-label={`Navigate to ${item.label}`}
                  aria-current={active ? 'page' : undefined}
                  className="flex items-center justify-center w-full focus:outline-none"
                >
                  <NavIcon
                    active={active}
                    icon={item.icon}
                    label={item.label}
                    showBadge={item.showBadge}
                    badgeCount={item.badgeCount}
                  />
                </Link>
              )}
            </div>
          );
        })}
      </div>
    </motion.nav>
  );
}

function NavIcon({ active, icon, label, badgeCount, showBadge }) {
  const Icon = ICONS[icon] || Home;

  return (
    <div className="flex flex-col items-center justify-center group py-0.5 cursor-pointer relative">
      {/* Circular icon container */}
      <div
        className={`relative w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200 ${
          active
            ? 'bg-white/90 text-black shadow-[0_2px_8px_rgba(0,0,0,0.06),inset_0_1px_1px_rgba(255,255,255,0.95)] border border-white/80'
            : 'bg-transparent text-neutral-600 group-hover:bg-white/50 group-hover:text-black'
        }`}
      >
        <Icon
          size={19}
          strokeWidth={active ? 2.2 : 1.8}
          className={`transition-colors ${active ? 'text-black' : 'text-neutral-700 group-hover:text-black'}`}
          aria-hidden="true"
        />

        {/* Wishlist / Cart badge or notification dot */}
        {badgeCount > 0 ? (
          <span className="absolute top-0 right-0 w-2 h-2 rounded-full bg-[#ff4d4f] ring-2 ring-white shadow-xs" />
        ) : showBadge ? (
          <span className="absolute top-0 right-0 w-2 h-2 rounded-full bg-[#ff4d4f] ring-2 ring-white shadow-xs" />
        ) : null}
      </div>

      <span
        className={`text-[9.5px] leading-tight mt-0.5 transition-colors ${
          active ? 'font-bold text-black' : 'font-medium text-neutral-500 group-hover:text-black'
        }`}
      >
        {label}
      </span>

      {/* Active Dot Indicator */}
      {active && <span className="w-1.5 h-1.5 rounded-full bg-[#f7bb0e] mt-0.5 shadow-xs" />}
    </div>
  );
}
