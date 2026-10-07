import { motion, AnimatePresence } from 'framer-motion';
import React from 'react';
import { Outlet, useSearchParams, useLocation, useNavigate } from 'react-router-dom';
import { User, MapPin, Bell } from 'lucide-react';
import { useDashboard } from '../../context/DashboardContext';
import { SEO } from '../../components/seo/SEO';
import { useConfig } from '../../context/ConfigContext';
import { DashboardHeader } from '../../components/dashboard/DashboardHeader';
import { Sidebar } from '../../components/dashboard/Sidebar';
import { AccountLeaves, AccountTopLeaf } from '../../components/dashboard/AccountLeaves';
import { AddressModal } from '../../components/dashboard/AddressModal';
import { WriteReviewModal } from '../../components/sections/ProductReviews';
import { AppDrawer } from '../../components/ui/AppDrawer';
import { Skeleton } from '../../components/ui';
import { ProfileSection } from './ProfileSection';
import { AddressesSection } from './AddressesSection';
import { NotificationsSection } from './NotificationsSection';

const InvoiceTemplate = React.lazy(() =>
  import('../../components/ui').then((m) => ({ default: m.InvoiceTemplate })),
);

export function DashboardLayout() {
  const { storeName } = useConfig();
  const {
    mobileShowContent,
    reviewingProduct,
    setReviewingProduct,
    selectedInvoiceOrder,
    setSelectedInvoiceOrder,
    user,
  } = useDashboard();

  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();

  const drawerParam = searchParams.get('drawer');
  const tabParam = searchParams.get('tab');
  const isProfileDrawerOpen = drawerParam === 'profile' || tabParam === 'profile';
  const isAddressesDrawerOpen = drawerParam === 'addresses' || tabParam === 'addresses';
  const isNotificationsDrawerOpen = drawerParam === 'notifications' || tabParam === 'notifications';

  const handleCloseDrawer = () => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('drawer');
    if (
      nextParams.get('tab') === 'profile' ||
      nextParams.get('tab') === 'addresses' ||
      nextParams.get('tab') === 'notifications'
    ) {
      nextParams.delete('tab');
    }
    const searchString = nextParams.toString();
    navigate(searchString ? `${location.pathname}?${searchString}` : location.pathname, {
      replace: true,
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="relative bg-white min-h-screen pt-[calc(var(--ak-header-h,115px)+16px)] pb-24 lg:pb-12 font-sans text-neutral-900"
    >
      <SEO
        title={`Your ${storeName || "Akula's Kitchen"} Account`}
        description={`Manage your ${storeName || "Akula's Kitchen"} profile parameters, live orders, dynamic shipping addresses, wishlist collections, and personalized newsletter configurations.`}
        noindex
      />

      {/* Decorative banana leaves along the bottom edge, behind the content */}
      <AccountLeaves />
      <AccountTopLeaf />

      <div className="relative z-10 max-w-max-width mx-auto px-margin-mobile lg:px-margin-desktop">
        {/* HEADER */}
        <DashboardHeader />

        <div className="grid grid-cols-1 lg:grid-cols-6 lg:grid-cols-12 gap-6">
          {/* LEFT SIDEBAR NAVIGATION PANEL */}
          <Sidebar />

          {/* MAIN DYNAMIC CONTENT PORTAL PANELS */}
          <div
            className={`col-span-1 lg:col-span-4 lg:col-span-9 space-y-4 ${
              mobileShowContent ? 'block' : 'hidden lg:block'
            }`}
          >
            <Outlet />
          </div>
        </div>
      </div>

      {/* RETAINED MODALS */}
      <AddressModal />

      {/* APP DRAWERS: Profile & Addresses */}
      <AppDrawer
        isOpen={isProfileDrawerOpen}
        onClose={handleCloseDrawer}
        title="My Profile"
        subtitle="Account & Personal Details"
        headerIcon={User}
        maxWidth="max-w-[540px]"
      >
        <ProfileSection isDrawer />
      </AppDrawer>

      <AppDrawer
        isOpen={isAddressesDrawerOpen}
        onClose={handleCloseDrawer}
        title="Saved Addresses"
        subtitle="Delivery Destinations"
        headerIcon={MapPin}
        maxWidth="max-w-[540px]"
      >
        <AddressesSection isDrawer />
      </AppDrawer>

      <AppDrawer
        isOpen={isNotificationsDrawerOpen}
        onClose={handleCloseDrawer}
        title="Notifications"
        subtitle="Updates & Alerts"
        headerIcon={Bell}
        maxWidth="max-w-[540px]"
      >
        <NotificationsSection isDrawer />
      </AppDrawer>

      <AnimatePresence>
        {reviewingProduct && (
          <WriteReviewModal
            productId={reviewingProduct.productId}
            productTitle={reviewingProduct.productTitle}
            onClose={() => setReviewingProduct(null)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedInvoiceOrder && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm no-print"
              onClick={() => setSelectedInvoiceOrder(null)}
            />
            {/* Modal Container */}
            <div className="fixed inset-0 z-[101] flex items-center justify-center p-2 sm:p-4 pointer-events-none no-print">
              <motion.div
                initial={{ scale: 0.94, opacity: 0, y: 15 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.94, opacity: 0, y: 15 }}
                transition={{ type: 'spring', damping: 28, stiffness: 280 }}
                onClick={(e) => e.stopPropagation()}
                className="invoice-modal-container pointer-events-auto w-full max-w-[500px] h-fit max-h-[96vh] bg-surface rounded-[16px] shadow-[0_25px_65px_-15px_rgba(0,0,0,0.35)] border border-outline-variant/30 overflow-y-auto no-scrollbar p-2 sm:p-2.5 print:static print:h-auto print:max-w-none print:shadow-none print:bg-white print:p-0 print:border-none"
              >
                <React.Suspense
                  fallback={
                    <div className="p-6">
                      <Skeleton className="h-72 w-full rounded-lg" />
                    </div>
                  }
                >
                  <InvoiceTemplate
                    order={selectedInvoiceOrder}
                    user={user}
                    onClose={() => setSelectedInvoiceOrder(null)}
                  />
                </React.Suspense>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
