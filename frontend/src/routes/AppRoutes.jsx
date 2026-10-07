import React, { Suspense } from 'react';
import { lazyWithRetry as lazy } from '../utils/performance/lazyWithRetry';
import { Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { logRouteDiagnostic } from '../utils/core/diagnostics';
import { RouteSkeleton, getRouteSkeletonVariant } from '../components/ui/RouteSkeleton';
import { MainLayout, MinimalLayout } from '../layouts/MainLayout';
import { ProtectedRoute } from '../components/auth/ProtectedRoute';
import { ErrorBoundary } from '../components/ui/ErrorBoundary';
import { NavigationOrchestrator } from '../components/ui/NavigationOrchestrator';
import { ScrollManager } from '../components/ui/ScrollManager';
import { MaintenanceGate } from '../components/ui/MaintenanceGate';
import { MaintenanceBanner } from '../components/MaintenanceBanner';
import { GlobalToaster } from '../components/ui/GlobalToaster';

const GlobalTracker = lazy(() =>
  import('../components/ui/GlobalTracker').then((m) => ({ default: m.GlobalTracker })),
);
const PwaUpdatePrompt = lazy(() =>
  import('../components/ui/PwaUpdatePrompt').then((m) => ({ default: m.PwaUpdatePrompt })),
);

function AppRouteFallback() {
  const location = useLocation();
  const variant = getRouteSkeletonVariant(location.pathname);
  return <RouteSkeleton variant={variant} />;
}

const RouteDiagnostics = React.memo(function RouteDiagnostics() {
  const location = useLocation();
  React.useEffect(() => {
    logRouteDiagnostic(location.pathname);
  }, [location.pathname]);
  return null;
});

// Lazy load pages for performance optimization
const Home = lazy(() => import('../pages/Home/Home').then((m) => ({ default: m.Home })));
const ProductListing = lazy(() =>
  import('../pages/ProductListing').then((m) => ({ default: m.ProductListing })),
);
const ProductDetails = lazy(() =>
  import('../pages/ProductDetails').then((m) => ({ default: m.ProductDetails })),
);
const ProductAllReviews = lazy(() =>
  import('../pages/ProductAllReviews').then((m) => ({ default: m.ProductAllReviews })),
);
const ProductReviewImages = lazy(() =>
  import('../pages/ProductReviewImages').then((m) => ({ default: m.ProductReviewImages })),
);
const Cart = lazy(() => import('../pages/Cart').then((m) => ({ default: m.Cart })));
const Checkout = lazy(() => import('../pages/Checkout').then((m) => ({ default: m.Checkout })));
const OrderSuccess = lazy(() =>
  import('../pages/OrderSuccess').then((m) => ({ default: m.OrderSuccess })),
);
const Contact = lazy(() => import('../pages/Contact').then((m) => ({ default: m.Contact })));
const Wishlist = lazy(() => import('../pages/Wishlist').then((m) => ({ default: m.Wishlist })));
const CollectionDetail = lazy(() =>
  import('../pages/CollectionDetail').then((m) => ({ default: m.CollectionDetail })),
);
const Dashboard = lazy(() => import('../pages/Dashboard').then((m) => ({ default: m.Dashboard })));
const OrderTrackingPublic = lazy(() =>
  import('../pages/OrderTrackingPublic').then((m) => ({ default: m.OrderTrackingPublic })),
);

const GenericPolicyPage = lazy(() =>
  import('../pages/GenericPolicyPage').then((m) => ({ default: m.GenericPolicyPage })),
);
const AcceptInvite = lazy(() =>
  import('../pages/AcceptInvite').then((m) => ({ default: m.AcceptInvite })),
);
const NotFound = lazy(() => import('../pages/NotFound').then((m) => ({ default: m.NotFound })));
const BlogListing = lazy(() =>
  import('../pages/BlogListing').then((m) => ({ default: m.BlogListing })),
);
const BlogPost = lazy(() => import('../pages/BlogPost').then((m) => ({ default: m.BlogPost })));

// ─── Admin Portal (Lazy Loaded) ───
const AdminLayout = lazy(() =>
  import('../admin/layouts/AdminLayout').then((m) => ({ default: m.AdminLayout })),
);
const AdminDrafts = lazy(() =>
  import('../admin/pages/AdminDrafts').then((m) => ({ default: m.AdminDrafts })),
);
const AdminDashboard = lazy(() =>
  import('../admin/pages/AdminDashboard').then((m) => ({ default: m.AdminDashboard })),
);
const AdminEnterpriseSearch = lazy(() =>
  import('../admin/pages/AdminEnterpriseSearch').then((m) => ({ default: m.default })),
);
const AdminProducts = lazy(() =>
  import('../admin/pages/AdminProducts').then((m) => ({ default: m.AdminProducts })),
);
const AdminAddProduct = lazy(() =>
  import('../admin/pages/AdminAddProduct').then((m) => ({ default: m.AdminAddProduct })),
);
const AdminOrdersHub = lazy(() =>
  import('../admin/pages/AdminOrdersHub').then((m) => ({ default: m.default })),
);
const AdminOrders = lazy(() =>
  import('../admin/pages/AdminOrders').then((m) => ({ default: m.AdminOrders })),
);
const AdminOrderDetail = lazy(() =>
  import('../admin/pages/AdminOrderDetail').then((m) => ({ default: m.AdminOrderDetail })),
);

const AdminCustomers = lazy(() =>
  import('../admin/pages/AdminCustomers').then((m) => ({ default: m.AdminCustomers })),
);

const AdminCatalogRegistry = lazy(() => import('../admin/pages/AdminCatalogRegistry'));

const AdminExecutiveDashboard = lazy(() => import('../admin/pages/ExecutiveDashboard'));
// const CustomerProfile360 = lazy(() => import('../admin/pages/CustomerProfile360'));

const AdminPolicies = lazy(() =>
  import('../admin/pages/AdminPolicies').then((m) => ({ default: m.AdminPolicies })),
);
const AdminPolicyEditor = lazy(() =>
  import('../admin/pages/AdminPolicyEditor').then((m) => ({ default: m.AdminPolicyEditor })),
);
const AdminRecommendationAnalytics = lazy(() =>
  import('../admin/pages/AdminRecommendationAnalytics').then((m) => ({
    default: m.default || m.AdminRecommendationAnalytics,
  })),
);
const AdminAnalytics = lazy(() =>
  import('../admin/pages/AdminAnalytics').then((m) => ({ default: m.AdminAnalytics })),
);
const AdminInventory = lazy(() =>
  import('../admin/pages/AdminInventory').then((m) => ({ default: m.AdminInventory })),
);
const AdminPayments = lazy(() =>
  import('../admin/pages/AdminPayments').then((m) => ({ default: m.AdminPayments })),
);
const AdminNotifications = lazy(() =>
  import('../admin/pages/AdminNotifications').then((m) => ({ default: m.AdminNotifications })),
);
const AdminContent = lazy(() =>
  import('../admin/pages/AdminContent').then((m) => ({ default: m.AdminContent })),
);
const AdminTeam = lazy(() =>
  import('../admin/pages/AdminTeam').then((m) => ({ default: m.AdminTeam })),
);
const AdminSettings = lazy(() =>
  import('../admin/pages/AdminSettings').then((m) => ({ default: m.AdminSettings })),
);
const AdminCategories = lazy(() =>
  import('../admin/pages/AdminCategories').then((m) => ({ default: m.AdminCategories })),
);
const AdminAddCategory = lazy(() =>
  import('../admin/pages/AdminAddCategory').then((m) => ({ default: m.AdminAddCategory })),
);

const AdminReviews = lazy(() =>
  import('../admin/pages/AdminReviews').then((m) => ({ default: m.AdminReviews })),
);

const AdminServiceability = lazy(() => import('../admin/pages/AdminServiceability'));

const AdminSystemHub = lazy(() =>
  import('../admin/pages/AdminSystemHub').then((m) => ({ default: m.default })),
);

const BackupCenter = lazy(() => import('../admin/pages/BackupCenter/BackupCenter'));

const MaintenanceGateway = lazy(() =>
  import('../admin/pages/MaintenanceGateway').then((m) => ({ default: m.MaintenanceGateway })),
);
const MaintenanceConsole = lazy(() =>
  import('../admin/pages/MaintenanceConsole').then((m) => ({ default: m.MaintenanceConsole })),
);

const AdminRecycleBin = lazy(() =>
  import('../admin/pages/AdminRecycleBin').then((m) => ({ default: m.default })),
);

const InvoicePreviewPage = lazy(() => import('../pages/InvoicePreviewPage'));

export function AppRoutes() {
  return (
    <>
      <RouteDiagnostics />
      <NavigationOrchestrator />
      <ScrollManager />
      <MaintenanceBanner />
      <GlobalToaster />

      <Suspense fallback={null}>
        <GlobalTracker />
        <PwaUpdatePrompt />
      </Suspense>
      <ErrorBoundary>
        <Suspense fallback={<AppRouteFallback />}>
          <Routes>
            {/* Internal invoice layout preview; development builds only */}
            {import.meta.env.DEV && (
              <Route path="/invoice-preview" element={<InvoicePreviewPage />} />
            )}
            <Route element={<MaintenanceGate />}>
              <Route element={<MainLayout />}>
                <Route path="/" element={<Home />} />
                <Route path="/blog" element={<BlogListing />} />
                <Route path="/blog/:slug" element={<BlogPost />} />
                <Route path="/collections" element={<ProductListing />} />
                <Route path="/product/:id" element={<ProductDetails />} />
                <Route path="/product/:id/reviews" element={<ProductAllReviews />} />
                <Route path="/product/:id/reviews/images" element={<ProductReviewImages />} />
                <Route path="/cart" element={<Cart />} />
                <Route path="/order-success" element={<OrderSuccess />} />
                <Route path="/about" element={<Navigate to="/" replace />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="/wishlist" element={<Wishlist />} />
                <Route path="/collection/:id" element={<CollectionDetail />} />
                <Route
                  path="/dashboard/*"
                  element={
                    <ProtectedRoute>
                      <Dashboard />
                    </ProtectedRoute>
                  }
                />
                <Route path="/track/:orderId" element={<OrderTrackingPublic />} />

                <Route path="/policy/:slug" element={<GenericPolicyPage />} />
                {/* Legacy routes redirect to dynamic paths */}
                <Route
                  path="/shipping"
                  element={<Navigate to="/policy/shipping-policy" replace />}
                />

                <Route path="/refund" element={<Navigate to="/policy/refund-policy" replace />} />
                <Route
                  path="/cancellation"
                  element={<Navigate to="/policy/cancellation-policy" replace />}
                />
                <Route path="/privacy" element={<Navigate to="/policy/privacy-policy" replace />} />
                <Route
                  path="/terms"
                  element={<Navigate to="/policy/terms-and-conditions" replace />}
                />
                <Route path="/accept-invite" element={<AcceptInvite />} />
                <Route path="*" element={<NotFound />} />
              </Route>
              <Route element={<MinimalLayout />}>
                <Route path="/checkout" element={<Checkout />} />
              </Route>
            </Route>

            {/* Maintenance Gateway / Console (Unprotected by normal JWT, protected by its own session logic) */}
            <Route path="/admin/maintenance-gateway" element={<MaintenanceGateway />} />
            <Route path="/admin/maintenance-console" element={<MaintenanceConsole />} />

            <Route
              path="/admin"
              element={
                <ProtectedRoute adminOnly>
                  <AdminLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<AdminDashboard />} />
              <Route path="drafts" element={<AdminDrafts />} />
              <Route path="homepage" element={<AdminContent />} />
              <Route path="products" element={<AdminProducts />} />
              <Route path="catalog-registry" element={<AdminCatalogRegistry />} />
              <Route path="inventory" element={<AdminInventory />} />
              <Route path="settings" element={<AdminSettings />} />

              <Route path="policies" element={<AdminPolicies />} />
              <Route path="policies/add" element={<AdminPolicies />} />
              <Route path="policies/edit/:id" element={<AdminPolicies />} />
              <Route path="products/add" element={<AdminAddProduct />} />
              <Route path="products/new" element={<Navigate to="/admin/products/add" replace />} />
              <Route path="products/edit/:id" element={<AdminAddProduct />} />
              <Route path="orders/*" element={<AdminOrdersHub />} />
              <Route path="orders/:orderId" element={<AdminOrderDetail />} />

              <Route path="serviceability" element={<AdminServiceability />} />
              <Route path="customers" element={<AdminCustomers />} />
              <Route path="customers/:customerId" element={<AdminCustomers />} />
              <Route path="executive" element={<AdminExecutiveDashboard />} />
              <Route path="categories" element={<AdminCategories />} />
              <Route path="categories/add" element={<AdminCategories />} />
              <Route path="categories/edit/:id" element={<AdminCategories />} />

              <Route path="search" element={<AdminEnterpriseSearch />} />
              <Route path="analytics" element={<AdminAnalytics />} />
              <Route path="analytics/operations" element={<AdminRecommendationAnalytics />} />

              <Route
                path="maintenance"
                element={<Navigate to="/admin/maintenance-console" replace />}
              />
              <Route path="backup" element={<Navigate to="/admin/backup-center" replace />} />

              <Route path="payments" element={<AdminPayments />} />

              <Route path="notifications" element={<AdminNotifications />} />
              <Route path="content" element={<AdminContent />} />
              <Route path="team" element={<AdminTeam />} />

              <Route path="reviews" element={<AdminReviews />} />

              {/* System Routes */}
              <Route path="system" element={<AdminSystemHub />} />
              <Route path="system/users" element={<AdminSystemHub />} />
              <Route path="system/roles" element={<AdminSystemHub />} />
              <Route path="system/notifications" element={<AdminSystemHub />} />
              <Route path="system/settings" element={<AdminSystemHub />} />
              <Route
                path="system/audit"
                element={<Navigate to="/admin/analytics/operations?actor=staff" replace />}
              />

              <Route path="recycle-bin" element={<AdminRecycleBin />} />
              <Route path="trash" element={<Navigate to="/admin/recycle-bin" replace />} />
              <Route path="system/trash" element={<Navigate to="/admin/recycle-bin" replace />} />
              <Route
                path="system/recycle-bin"
                element={<Navigate to="/admin/recycle-bin" replace />}
              />

              <Route path="enterprise-search" element={<AdminEnterpriseSearch />} />

              <Route path="backup-center/*" element={<BackupCenter />} />
            </Route>
          </Routes>
        </Suspense>
      </ErrorBoundary>
    </>
  );
}
