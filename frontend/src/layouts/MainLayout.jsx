import { useEffect, Suspense } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useConfig } from '../context/ConfigContext';
import { TopNavbar } from '../components/layout/TopNavbar';
import { GlobalAnnouncementBanner } from '../components/layout/GlobalAnnouncementBanner';
import { Footer } from '../components/layout/Footer';
import { BottomNav } from '../components/layout/BottomNav';
import { CheckoutNavbar } from '../components/layout/CheckoutNavbar';
import { SEO } from '../components/seo/SEO';
import { ErrorBoundary } from '../components/ui/ErrorBoundary';
import { getRouteSkeletonVariant, RouteSkeleton } from '../components/ui/RouteSkeleton';
import { AuthGate } from '../components/auth/AuthGate';
import { ScrollToTopButton } from '../components/ui';
import { lazyWithRetry as lazy } from '../utils/performance/lazyWithRetry';

const CartDrawer = lazy(() =>
  import('../components/layout/CartDrawer').then((m) => ({ default: m.CartDrawer })),
);
const ConsentPopup = lazy(() =>
  import('../components/layout/ConsentPopup').then((m) => ({ default: m.ConsentPopup })),
);
const WhatsAppWidget = lazy(() =>
  import('../components/ui/WhatsAppWidget').then((m) => ({ default: m.WhatsAppWidget })),
);

const AdminInviteModal = lazy(() =>
  import('../components/auth/AdminInviteModal').then((m) => ({ default: m.AdminInviteModal })),
);

export function MainLayout() {
  const { pathname } = useLocation();
  const { isStoreClosed } = useConfig();
  const {
    isCartOpen,
    setIsCartOpen,
    _purchaseCartCount = 0,
    _rentalCartCount = 0,
    _activeCartMode,
  } = useCart();

  // Scroll to top on route change with a slight delay to allow exit animations if any
  useEffect(() => {
    const originalScrollBehavior = document.documentElement.style.scrollBehavior;
    document.documentElement.style.scrollBehavior = 'auto';

    const timer = setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'instant' });
      // Restore after a short delay
      setTimeout(() => {
        document.documentElement.style.scrollBehavior = originalScrollBehavior;
      }, 50);
    }, 10);

    return () => {
      clearTimeout(timer);
      document.documentElement.style.scrollBehavior = originalScrollBehavior;
    };
  }, [pathname]);

  const isHighDensityPage = pathname === '/auth' || pathname === '/checkout';

  const fallbackVariant = getRouteSkeletonVariant(pathname);

  return (
    <div className="bg-white text-on-surface min-h-screen flex flex-col relative overflow-x-clip">
      <SEO />

      <GlobalAnnouncementBanner />
      <TopNavbar />
      {isCartOpen && location.pathname !== '/cart' && (
        <Suspense fallback={null}>
          <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
        </Suspense>
      )}
      <main id="main-content" className="flex-1 relative" tabIndex={-1}>
        <ErrorBoundary>
          <AuthGate>
            <Suspense fallback={<RouteSkeleton variant={fallbackVariant} />}>
              {/* Page transition: animate-page-enter on route change */}
              <div className="animate-content-reveal">
                <Outlet />
              </div>
            </Suspense>
          </AuthGate>
        </ErrorBoundary>
      </main>
      {pathname !== '/cart' && !pathname.startsWith('/dashboard') && <Footer />}
      <BottomNav />

      <div
        className={`fixed ${
          isStoreClosed
            ? 'bottom-[calc(118px+var(--safe-area-bottom,env(safe-area-inset-bottom,0px)))]'
            : 'bottom-[calc(80px+var(--safe-area-bottom,env(safe-area-inset-bottom,0px)))]'
        } lg:bottom-8 right-4 lg:right-10 z-[40] flex flex-col gap-4 items-center pointer-events-none transition-all duration-300`}
      >
        <ScrollToTopButton />
        <Suspense fallback={null}>
          <WhatsAppWidget />
        </Suspense>
      </div>
      <Suspense fallback={null}>
        <ConsentPopup />
      </Suspense>
      <Suspense fallback={null}>
        <AdminInviteModal />
      </Suspense>
    </div>
  );
}

/**
 * Minimal layout for checkout — no bottom nav, shared secure header
 */
export function MinimalLayout() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [pathname]);

  return (
    <div className="bg-white text-on-surface min-h-screen flex flex-col relative overflow-hidden">
      <CheckoutNavbar />
      <main id="main-content" className="flex-1" tabIndex={-1}>
        <ErrorBoundary>
          <Suspense fallback={<RouteSkeleton variant={getRouteSkeletonVariant(pathname)} />}>
            <Outlet />
          </Suspense>
        </ErrorBoundary>
      </main>
    </div>
  );
}
