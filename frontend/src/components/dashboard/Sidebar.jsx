import {
  Camera,
  ShoppingBag,
  ChevronRight,
  User,
  LogOut,
  Bell,
  MapPin,
  Heart,
  Package,
  Phone,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { useDashboard } from '../../context/DashboardContext';
import { OptimizedImage } from '../ui';
import { useState, useEffect } from 'react';

export function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    user,
    logout,
    openAuthModal,
    fileInputRef,
    handleAvatarClick,
    handleAvatarChange,
    isUploadingAvatar,
    wishlistItems,
    cartCount,
    addresses,
    addressText,
    phoneText,
    mobileShowContent,
    setMobileShowContent,
    hasRecentOrderUpdates,
  } = useDashboard();

  const path = location.pathname;
  const searchParams = new URLSearchParams(location.search);
  const drawerParam = searchParams.get('drawer') || searchParams.get('tab');

  let activeTab = null;
  if (drawerParam === 'profile') activeTab = 'profile';
  else if (drawerParam === 'addresses') activeTab = 'addresses';
  else if (drawerParam === 'notifications') activeTab = 'notifications';
  else if (path.includes('/orders')) activeTab = 'orders';
  else if (path.includes('/settings')) activeTab = 'preferences';
  else if (path.includes('/collections')) activeTab = 'collections';
  else if (path.includes('/shopping-bag')) activeTab = 'shopping-bag';
  else if (path.includes('/notifications')) activeTab = 'notifications';
  else if (path.includes('/security')) activeTab = 'security';

  const handleOpenDrawer = (drawerName) => {
    const params = new URLSearchParams(location.search);
    params.set('drawer', drawerName);
    params.delete('tab');
    if (!location.pathname.startsWith('/dashboard')) {
      navigate(`/dashboard?${params.toString()}`);
    } else {
      navigate(`${location.pathname}?${params.toString()}`);
    }
  };

  const handleTabClick = (tabName, route) => {
    navigate(route);
    setMobileShowContent(true);
  };

  const [hasUnreadNotifications, setHasUnreadNotifications] = useState(false);

  useEffect(() => {
    const handler = (e) => {
      if (e.detail?.hasUnread !== undefined) {
        setHasUnreadNotifications(e.detail.hasUnread);
      }
    };
    window.addEventListener('notifications_status_changed', handler);
    return () => window.removeEventListener('notifications_status_changed', handler);
  }, []);

  const tabClass = (isActive) =>
    `w-full text-left px-4 py-3 text-[12.5px] flex items-center justify-between transition-all cursor-pointer outline-none ${
      isActive
        ? 'text-[#283618] font-bold bg-[#283618]/12 border-l-3 border-[#283618] backdrop-blur-xs'
        : 'text-neutral-800 font-semibold hover:bg-white/60 hover:text-neutral-950 backdrop-blur-xs'
    }`;

  return (
    <div
      className={`col-span-1 lg:col-span-2 lg:col-span-3 space-y-3.5 ${mobileShowContent ? 'hidden lg:block' : 'block'}`}
    >
      {/* Profile Card - Glassmorphism Side by Side */}
      <div className="glass-panel relative rounded-2xl overflow-hidden">
        <div className="p-3.5 sm:p-4 flex items-center gap-3.5 text-left">
          {/* Avatar */}
          <div
            onClick={handleAvatarClick}
            className="w-13 h-13 sm:w-14 sm:h-14 rounded-full border-2 border-white/90 ring-1 ring-neutral-200/60 shadow-xs relative overflow-hidden bg-neutral-100/60 backdrop-blur-xs flex items-center justify-center shrink-0 cursor-pointer group/avatar hover:border-[#283618]/30 transition-all"
          >
            {isUploadingAvatar && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-10">
                <div className="w-4 h-4 border-2 border-white/60 border-t-white rounded-full animate-spin" />
              </div>
            )}

            {user?.avatar ? (
              <OptimizedImage
                src={user.avatar}
                alt={user.name || 'Avatar'}
                className="w-full h-full object-cover"
                priority={true}
                fallback={
                  <div className="absolute inset-0 flex items-center justify-center bg-neutral-100 text-neutral-400">
                    <User className="w-6 h-6" strokeWidth={1.5} />
                  </div>
                }
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center bg-neutral-100 text-neutral-400">
                <User className="w-6 h-6" strokeWidth={1.5} />
              </div>
            )}

            {/* Edit Camera Overlay */}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/avatar:opacity-100 flex items-center justify-center text-white transition-opacity duration-300">
              <Camera className="w-3.5 h-3.5" strokeWidth={1.5} />
            </div>
          </div>

          {/* Secret input for upload */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleAvatarChange}
            accept="image/*"
            className="hidden"
          />

          <div
            onClick={() => (user ? handleOpenDrawer('profile') : null)}
            className={`min-w-0 flex-1 ${user ? 'cursor-pointer group/prof' : ''}`}
            title={user ? 'Open Profile Drawer' : undefined}
          >
            {!user ? (
              <>
                <span className="text-[12px] text-neutral-600 font-medium block">
                  Welcome, Guest
                </span>
                <button
                  onClick={openAuthModal}
                  className="text-[12px] font-semibold text-[#283618] hover:underline mt-0.5 block cursor-pointer bg-transparent border-none outline-none text-left"
                >
                  Login
                </button>
              </>
            ) : (
              <>
                <div className="flex items-center gap-1.5 min-w-0">
                  <strong className="text-[13.5px] text-neutral-950 font-bold truncate group-hover/prof:text-[#283618] transition-colors">
                    {user.name}
                  </strong>
                  {user.isVerified && (
                    <span className="inline-flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-800 border border-emerald-500/20 font-bold shrink-0">
                      Verified
                    </span>
                  )}
                </div>
                <span className="text-[11.5px] text-neutral-700 font-medium block truncate mt-0.5">
                  {user.email || user.phone || ''}
                </span>

                {user.createdAt && (
                  <span className="text-[10px] text-neutral-500 font-medium block mt-0.5">
                    Joined{' '}
                    {new Date(user.createdAt).toLocaleString('default', {
                      month: 'long',
                      year: 'numeric',
                    })}
                  </span>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Navigation Card - Glassmorphism */}
      <div
        role="tablist"
        aria-label="Account Navigation"
        className="glass-panel relative rounded-2xl overflow-hidden"
      >
        {/* Orders Section */}
        <motion.button
          role="tab"
          aria-selected={activeTab === 'orders'}
          whileHover={{ x: 2 }}
          onClick={() => handleTabClick('orders', '/dashboard/orders')}
          className={tabClass(activeTab === 'orders')}
        >
          <div className="flex items-center gap-2.5">
            <ShoppingBag
              className={`w-4 h-4 ${activeTab === 'orders' ? 'text-[#283618]' : 'text-neutral-700'}`}
              strokeWidth={1.8}
            />
            <span>My Orders</span>
          </div>
          <div className="flex items-center gap-2">
            {hasRecentOrderUpdates && (
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
            )}
            <ChevronRight className="w-3.5 h-3.5 text-neutral-400" strokeWidth={1.5} />
          </div>
        </motion.button>

        <div className="border-t border-neutral-200/60" />

        {/* Profile */}
        <motion.button
          role="tab"
          aria-selected={activeTab === 'profile'}
          whileHover={{ x: 2 }}
          onClick={() => handleOpenDrawer('profile')}
          className={tabClass(activeTab === 'profile')}
        >
          <div className="flex items-center gap-2.5">
            <User
              className={`w-4 h-4 ${activeTab === 'profile' ? 'text-[#283618]' : 'text-neutral-700'}`}
              strokeWidth={1.8}
            />
            <span>Profile</span>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-neutral-400" strokeWidth={1.5} />
        </motion.button>

        <div className="border-t border-neutral-200/60" />

        {/* Notifications */}
        <motion.button
          role="tab"
          aria-selected={activeTab === 'notifications'}
          whileHover={{ x: 2 }}
          onClick={() => handleOpenDrawer('notifications')}
          className={tabClass(activeTab === 'notifications')}
        >
          <div className="flex items-center gap-2.5">
            <Bell
              className={`w-4 h-4 ${activeTab === 'notifications' ? 'text-[#283618]' : 'text-neutral-700'}`}
              strokeWidth={1.8}
            />
            <span>Notifications</span>
          </div>
          <div className="flex items-center gap-2">
            {hasUnreadNotifications && (
              <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse"></span>
            )}
            <ChevronRight className="w-3.5 h-3.5 text-neutral-400" strokeWidth={1.5} />
          </div>
        </motion.button>

        <div className="border-t border-neutral-200/60" />

        {/* Addresses */}
        <motion.button
          role="tab"
          aria-selected={activeTab === 'addresses'}
          whileHover={{ x: 2 }}
          onClick={() => handleOpenDrawer('addresses')}
          className={tabClass(activeTab === 'addresses')}
        >
          <div className="flex items-center gap-2.5">
            <MapPin
              className={`w-4 h-4 ${activeTab === 'addresses' ? 'text-[#283618]' : 'text-neutral-700'}`}
              strokeWidth={1.8}
            />
            <span>Addresses</span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={
                activeTab === 'addresses'
                  ? 'text-[11px] font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center bg-[#283618]/15 text-[#283618] border border-[#283618]/25'
                  : 'glass-badge text-[11px] font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center text-neutral-800'
              }
            >
              {addresses ? addresses.length : 0}
            </span>
            <ChevronRight className="w-3.5 h-3.5 text-neutral-400" strokeWidth={1.5} />
          </div>
        </motion.button>

        <div className="border-t border-neutral-200/60" />

        {/* Wishlist */}
        <motion.button
          role="tab"
          aria-selected={activeTab === 'collections'}
          whileHover={{ x: 2 }}
          onClick={() => handleTabClick('collections', '/wishlist')}
          className={tabClass(activeTab === 'collections')}
        >
          <div className="flex items-center gap-2.5">
            <Heart
              className={`w-4 h-4 ${activeTab === 'collections' ? 'text-[#283618]' : 'text-neutral-700'}`}
              strokeWidth={1.8}
            />
            <span>Wishlist</span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={
                activeTab === 'collections'
                  ? 'text-[11px] font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center bg-[#283618]/15 text-[#283618] border border-[#283618]/25'
                  : 'glass-badge text-[11px] font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center text-neutral-800'
              }
            >
              {wishlistItems ? wishlistItems.length : 0}
            </span>
            <ChevronRight className="w-3.5 h-3.5 text-neutral-400" strokeWidth={1.5} />
          </div>
        </motion.button>

        <div className="border-t border-neutral-200/60" />

        {/* Shopping Bag */}
        <motion.button
          role="tab"
          aria-selected={activeTab === 'shopping-bag'}
          whileHover={{ x: 2 }}
          onClick={() => handleTabClick('shopping-bag', '/cart')}
          className={tabClass(activeTab === 'shopping-bag')}
        >
          <div className="flex items-center gap-2.5">
            <Package
              className={`w-4 h-4 ${activeTab === 'shopping-bag' ? 'text-[#283618]' : 'text-neutral-700'}`}
              strokeWidth={1.8}
            />
            <span>Shopping Bag</span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={
                activeTab === 'shopping-bag'
                  ? 'text-[11px] font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center bg-[#283618]/15 text-[#283618] border border-[#283618]/25'
                  : 'glass-badge text-[11px] font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center text-neutral-800'
              }
            >
              {cartCount}
            </span>
            <ChevronRight className="w-3.5 h-3.5 text-neutral-400" strokeWidth={1.5} />
          </div>
        </motion.button>

        <div className="border-t border-neutral-200/60" />

        {/* Logout */}
        <button
          onClick={() => {
            logout();
            setTimeout(() => navigate('/'), 400);
          }}
          className="w-full text-left px-4 py-3 text-[12.5px] text-red-600 font-semibold flex items-center gap-2 hover:bg-red-500/10 transition-colors cursor-pointer outline-none"
        >
          <LogOut className="w-3.5 h-3.5" strokeWidth={2} />
          Logout
        </button>
      </div>

      {/* Footer info - Glassmorphism */}
      {(addressText || phoneText) && (
        <div className="glass-panel-subtle px-3.5 py-3 rounded-xl text-[11px] text-neutral-700 space-y-1.5">
          {addressText && (
            <div className="flex items-start gap-2">
              <MapPin className="w-3.5 h-3.5 text-[#283618] shrink-0 mt-0.5" strokeWidth={2} />
              <span className="line-clamp-2 font-semibold leading-tight text-neutral-800">
                {addressText}
              </span>
            </div>
          )}
          {phoneText && (
            <div className="flex items-center gap-2">
              <Phone className="w-3.5 h-3.5 text-[#283618] shrink-0" strokeWidth={2} />
              <span className="font-bold text-neutral-900 tracking-wide">
                {phoneText.startsWith('+91')
                  ? phoneText
                  : `+91 ${phoneText.replace(/^\+?91\s*/, '')}`}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
