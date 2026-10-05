import { motion, AnimatePresence } from 'framer-motion';
import React from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useDashboard } from '../../context/DashboardContext';
import { SEO } from '../../components/seo/SEO';
import { useConfig } from '../../context/ConfigContext';
import { DashboardHeader } from '../../components/dashboard/DashboardHeader';
import { Sidebar } from '../../components/dashboard/Sidebar';
import { AddressModal } from '../../components/dashboard/AddressModal';
import { WriteReviewModal } from '../../components/sections/ProductReviews';
import { Skeleton, AppDrawer } from '../../components/ui';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { ProfileSection } from './ProfileSection';
import { AddressesSection } from './AddressesSection';
import { User, MapPin } from 'lucide-react';

const InvoiceTemplate = React.lazy(() =>
  import('../../components/ui').then((m) => ({ default: m.InvoiceTemplate })),
);

export function DashboardLayout() {
  const { storeName } = useConfig();
  const {
    mobileShowContent,
    setMobileShowContent,
    reviewingProduct,
    setReviewingProduct,
    selectedInvoiceOrder,
    setSelectedInvoiceOrder,
    user,
  } = useDashboard();

  const isMobile = useMediaQuery('(max-width: 1023px)');
  const location = useLocation();
  const navigate = useNavigate();

  const isProfileRoute = location.pathname.includes('/dashboard/profile');
  const isAddressesRoute = location.pathname.includes('/dashboard/addresses');

  const handleCloseDrawer = () => {
    setMobileShowContent(false);
    navigate('/dashboard');
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="bg-white min-h-screen pt-[calc(var(--ak-header-h,115px)+16px)] pb-24 lg:pb-12 font-sans text-neutral-900"
    >
      <SEO
        title={`Your ${storeName || "Akula's Kitchen"} Account`}
        description={`Manage your ${storeName || "Akula's Kitchen"} profile parameters, live orders, dynamic shipping addresses, wishlist collections, and personalized newsletter configurations.`}
        noindex
      />

      <div className="max-w-max-width mx-auto px-margin-mobile lg:px-margin-desktop">
        {/* HEADER */}
        <DashboardHeader />

        <div className="grid grid-cols-1 lg:grid-cols-6 lg:grid-cols-12 gap-6">
          {/* LEFT SIDEBAR NAVIGATION PANEL */}
          <Sidebar />

          {/* MAIN DYNAMIC CONTENT PORTAL PANELS */}
          <div
            className={`col-span-1 lg:col-span-4 lg:col-span-9 space-y-4 ${
              mobileShowContent && (!isMobile || (!isProfileRoute && !isAddressesRoute))
                ? 'block'
                : 'hidden lg:block'
            }`}
          >
            <Outlet />
          </div>
        </div>
      </div>

      {/* MOBILE APP DRAWERS FOR PROFILE & ADDRESSES */}
      {isMobile && (
        <>
          {/* Profile App Drawer */}
          <AppDrawer
            isOpen={isProfileRoute}
            onClose={handleCloseDrawer}
            title="My Profile"
            subtitle="Account & Personal Details"
            headerIcon={User}
            maxWidth="max-w-[480px]"
          >
            <ProfileSection />
          </AppDrawer>

          {/* Addresses App Drawer */}
          <AppDrawer
            isOpen={isAddressesRoute}
            onClose={handleCloseDrawer}
            title="Saved Addresses"
            subtitle="Delivery Destinations"
            headerIcon={MapPin}
            maxWidth="max-w-[480px]"
          >
            <AddressesSection />
          </AppDrawer>
        </>
      )}

      {/* RETAINED MODALS */}
      <AddressModal />

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
            <motion.div
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 28, stiffness: 250 }}
              onClick={(e) => e.stopPropagation()}
              className="invoice-modal-container fixed bottom-0 left-0 right-0 lg:top-0 lg:bottom-0 lg:my-auto lg:h-fit lg:rounded-[18px] mx-auto w-full max-w-[580px] max-h-[92vh] bg-surface rounded-t-[18px] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] border border-outline-variant/30 z-[101] overflow-y-auto no-scrollbar pt-2.5 pb-2 px-3 sm:pt-3 sm:pb-2.5 sm:px-4 print:static print:translate-x-0 print:translate-y-0 print:h-auto print:max-w-none print:shadow-none print:bg-white print:p-0 print:border-none"
            >
              <React.Suspense
                fallback={
                  <div className="p-8">
                    <Skeleton className="h-80 w-full rounded-lg" />
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
          </>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
