import { LayoutDashboard, ShoppingBag, User, MapPin, Settings } from 'lucide-react';
import { Routes, Route, Navigate, useSearchParams, Link } from 'react-router-dom';
import { DashboardProvider } from '../context/DashboardContext';
import { DashboardLayout } from './Dashboard/DashboardLayout';
import { OrdersSection } from './Dashboard/OrdersSection';
import { SettingsSection } from './Dashboard/SettingsSection';
function DashboardIndex() {
  const [searchParams] = useSearchParams();
  const tab = searchParams.get('tab');

  if (tab === 'orders') return <Navigate to="orders" replace />;
  if (tab === 'addresses') return <Navigate to="/dashboard?drawer=addresses" replace />;
  if (tab === 'preferences') return <Navigate to="settings" replace />;
  if (tab === 'wishlist') return <Navigate to="/wishlist" replace />;
  if (tab === 'loyalty' || tab === 'wallet' || tab === 'profile')
    return <Navigate to="/dashboard?drawer=profile" replace />;
  if (tab === 'notifications') return <Navigate to="/dashboard?drawer=notifications" replace />;

  return (
    <div className="bg-white/70 backdrop-blur-xl border border-white/80 rounded-2xl p-8 sm:p-10 text-center shadow-[0_8px_30px_rgb(0,0,0,0.04),inset_0_1px_1px_rgba(255,255,255,0.9)] flex flex-col items-center justify-center min-h-[50vh] hidden lg:flex">
      <div className="w-16 h-16 rounded-full bg-white/80 border border-white/90 shadow-xs flex items-center justify-center mb-4 text-[#283618] backdrop-blur-xs">
        <LayoutDashboard className="text-[30px]" strokeWidth={1.8} />
      </div>
      <h2 className="font-display text-2xl lg:text-3xl font-bold text-neutral-950 mb-2 tracking-tight">
        Welcome to your Dashboard
      </h2>
      <p className="text-neutral-700 font-medium text-[13px] lg:text-[14px] max-w-md mx-auto leading-relaxed mb-6">
        Select an option from the sidebar to manage your profile, view orders, and customize account
        preferences.
      </p>

      {/* Quick Action Tiles */}
      <div className="grid grid-cols-3 gap-3 w-full max-w-lg mt-2">
        <Link
          to="/dashboard/orders"
          className="flex flex-col items-center p-3.5 rounded-xl bg-white/80 hover:bg-white border border-neutral-200/70 hover:border-[#283618]/30 transition-all shadow-2xs group"
        >
          <div className="w-9 h-9 rounded-lg bg-[#283618]/10 text-[#283618] flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
            <ShoppingBag className="w-4.5 h-4.5" strokeWidth={1.8} />
          </div>
          <span className="text-[12px] font-bold text-neutral-900">My Orders</span>
          <span className="text-[10px] text-neutral-500 font-medium mt-0.5">Track & History</span>
        </Link>
        <Link
          to="/dashboard?drawer=profile"
          className="flex flex-col items-center p-3.5 rounded-xl bg-white/80 hover:bg-white border border-neutral-200/70 hover:border-[#283618]/30 transition-all shadow-2xs group"
        >
          <div className="w-9 h-9 rounded-lg bg-[#283618]/10 text-[#283618] flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
            <User className="w-4.5 h-4.5" strokeWidth={1.8} />
          </div>
          <span className="text-[12px] font-bold text-neutral-900">My Profile</span>
          <span className="text-[10px] text-neutral-500 font-medium mt-0.5">Quick Drawer</span>
        </Link>
        <Link
          to="/dashboard?drawer=addresses"
          className="flex flex-col items-center p-3.5 rounded-xl bg-white/80 hover:bg-white border border-neutral-200/70 hover:border-[#283618]/30 transition-all shadow-2xs group"
        >
          <div className="w-9 h-9 rounded-lg bg-[#283618]/10 text-[#283618] flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
            <MapPin className="w-4.5 h-4.5" strokeWidth={1.8} />
          </div>
          <span className="text-[12px] font-bold text-neutral-900">Addresses</span>
          <span className="text-[10px] text-neutral-500 font-medium mt-0.5">Quick Drawer</span>
        </Link>
      </div>
    </div>
  );
}

export function Dashboard() {
  return (
    <DashboardProvider>
      <Routes>
        <Route element={<DashboardLayout />}>
          <Route index element={<DashboardIndex />} />
          <Route path="orders" element={<OrdersSection />} />
          <Route path="settings" element={<SettingsSection />} />

          {/* Legacy / Direct URL redirects: Profile, Addresses, and Notifications now open cleanly as AppDrawers */}
          <Route path="profile" element={<Navigate to="/dashboard?drawer=profile" replace />} />
          <Route path="addresses" element={<Navigate to="/dashboard?drawer=addresses" replace />} />
          <Route
            path="notifications"
            element={<Navigate to="/dashboard?drawer=notifications" replace />}
          />
          <Route path="wallet" element={<Navigate to="/dashboard?drawer=profile" replace />} />

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Routes>
    </DashboardProvider>
  );
}
