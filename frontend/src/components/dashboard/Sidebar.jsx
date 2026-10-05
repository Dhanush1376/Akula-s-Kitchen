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
  let activeTab = null;
  if (path.includes('/orders')) activeTab = 'orders';
  else if (path.includes('/addresses')) activeTab = 'addresses';
  else if (path.includes('/settings')) activeTab = 'preferences';
  else if (path.includes('/collections')) activeTab = 'collections';
  else if (path.includes('/shopping-bag')) activeTab = 'shopping-bag';
  else if (path.includes('/notifications')) activeTab = 'notifications';
  else if (path.includes('/security')) activeTab = 'security';
  else if (path.includes('/profile')) activeTab = 'profile';

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
    `w-full text-left px-4 py-2.5 text-[12px] flex items-center justify-between transition-all cursor-pointer outline-none ${
      isActive
        ? 'text-[#283618] font-bold bg-[#283618]/10 border-l-2 border-[#283618]'
        : 'text-neutral-700 font-medium hover:bg-neutral-50 hover:text-neutral-900'
    }`;

  return (
    <div
      className={`col-span-1 lg:col-span-2 lg:col-span-3 space-y-3 ${mobileShowContent ? 'hidden lg:block' : 'block'}`}
    >
      {/* Profile Card */}
      <div className="bg-white border border-neutral-200 rounded-lg shadow-sm overflow-hidden">
        <div className="p-4 flex flex-col items-center text-center">
          {/* Avatar */}
          <div
            onClick={handleAvatarClick}
            className="w-16 h-16 rounded-full border border-neutral-200 relative overflow-hidden bg-neutral-100 flex items-center justify-center cursor-pointer shadow-sm group/avatar hover:border-neutral-400 transition-colors"
          >
            {isUploadingAvatar && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-10">
                <div className="w-5 h-5 border-2 border-white/60 border-t-white rounded-full animate-spin" />
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
                    <User className="w-7 h-7" strokeWidth={1.5} />
                  </div>
                }
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center bg-neutral-100 text-neutral-400">
                <User className="w-7 h-7" strokeWidth={1.5} />
              </div>
            )}

            {/* Edit Camera Overlay */}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/avatar:opacity-100 flex items-center justify-center text-white transition-opacity duration-300">
              <Camera className="w-4 h-4" strokeWidth={1.5} />
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

          <div className="mt-2.5 w-full">
            {!user ? (
              <>
                <span className="text-[12px] text-neutral-600 font-medium block">
                  Welcome, Guest
                </span>
                <button
                  onClick={openAuthModal}
                  className="text-[12px] font-semibold text-[#283618] hover:underline mt-1 block w-full text-center cursor-pointer bg-transparent border-none outline-none"
                >
                  Login
                </button>
              </>
            ) : (
              <>
                <strong className="text-[13px] text-neutral-900 block truncate font-bold">
                  {user.name}
                </strong>
                <span className="text-[11px] text-neutral-600 font-medium block truncate mb-1.5">
                  {user.email || user.phone || ''}
                </span>

                {user.isVerified && (
                  <span className="inline-flex items-center gap-1 text-[9px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300 font-semibold">
                    Verified
                  </span>
                )}

                {user.createdAt && (
                  <span className="text-[10px] text-neutral-500 font-medium block mt-1">
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

      {/* Navigation */}
      <div
        role="tablist"
        aria-label="Account Navigation"
        className="bg-white border border-neutral-200 rounded-lg shadow-sm overflow-hidden"
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
            {hasRecentOrderUpdates && (
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
            )}
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-neutral-400" strokeWidth={1.5} />
        </motion.button>

        <div className="border-t border-neutral-100" />

        {/* Profile */}
        <motion.button
          role="tab"
          aria-selected={activeTab === 'profile'}
          whileHover={{ x: 2 }}
          onClick={() => handleTabClick('profile', '/dashboard/profile')}
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

        <div className="border-t border-neutral-100" />

        {/* Notifications */}
        <motion.button
          role="tab"
          aria-selected={activeTab === 'notifications'}
          whileHover={{ x: 2 }}
          onClick={() => handleTabClick('notifications', '/dashboard/notifications')}
          className={tabClass(activeTab === 'notifications')}
        >
          <div className="flex items-center gap-2.5">
            <Bell
              className={`w-4 h-4 ${activeTab === 'notifications' ? 'text-[#283618]' : 'text-neutral-700'}`}
              strokeWidth={1.8}
            />
            <span>Notifications</span>
            {hasUnreadNotifications && (
              <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse"></span>
            )}
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-neutral-400" strokeWidth={1.5} />
        </motion.button>

        <div className="border-t border-neutral-100" />

        {/* Addresses */}
        <motion.button
          role="tab"
          aria-selected={activeTab === 'addresses'}
          whileHover={{ x: 2 }}
          onClick={() => handleTabClick('addresses', '/dashboard/addresses')}
          className={tabClass(activeTab === 'addresses')}
        >
          <div className="flex items-center gap-2.5">
            <MapPin
              className={`w-4 h-4 ${activeTab === 'addresses' ? 'text-[#283618]' : 'text-neutral-700'}`}
              strokeWidth={1.8}
            />
            <span>Addresses</span>
            <span className="text-[11px] font-semibold text-neutral-500 bg-neutral-100 px-1.5 py-0.5 rounded-md">
              {addresses ? addresses.length : 0}
            </span>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-neutral-400" strokeWidth={1.5} />
        </motion.button>

        <div className="border-t border-neutral-100" />

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
            <span className="text-[11px] font-semibold text-neutral-500 bg-neutral-100 px-1.5 py-0.5 rounded-md">
              {wishlistItems ? wishlistItems.length : 0}
            </span>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-neutral-400" strokeWidth={1.5} />
        </motion.button>

        <div className="border-t border-neutral-100" />

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
            <span className="text-[11px] font-semibold text-neutral-500 bg-neutral-100 px-1.5 py-0.5 rounded-md">
              {cartCount}
            </span>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-neutral-400" strokeWidth={1.5} />
        </motion.button>

        <div className="border-t border-neutral-100" />

        {/* Logout */}
        <button
          onClick={() => {
            logout();
            setTimeout(() => navigate('/'), 400);
          }}
          className="w-full text-left px-4 py-2.5 text-[12px] text-red-600 font-medium flex items-center gap-2 hover:bg-red-50/60 transition-colors cursor-pointer outline-none"
        >
          <LogOut className="w-3.5 h-3.5" strokeWidth={1.8} />
          Logout
        </button>
      </div>

      {/* Footer info */}
      {(addressText || phoneText) && (
        <div className="px-3.5 py-3 rounded-lg bg-neutral-50/80 border border-neutral-200/80 text-[11px] text-neutral-700 space-y-1.5">
          {addressText && (
            <div className="flex items-start gap-2">
              <MapPin className="w-3.5 h-3.5 text-[#283618] shrink-0 mt-0.5" strokeWidth={2} />
              <span className="line-clamp-2 font-medium leading-tight text-neutral-800">
                {addressText}
              </span>
            </div>
          )}
          {phoneText && (
            <div className="flex items-center gap-2">
              <Phone className="w-3.5 h-3.5 text-[#283618] shrink-0" strokeWidth={2} />
              <span className="font-semibold text-neutral-800 tracking-wide">
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
