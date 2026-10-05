import express, { Application, Router, Request, Response, NextFunction } from 'express';
import { attachApiVersion, ApiVersionTag } from '../middleware/apiVersion';
import { noCacheMiddleware } from '../middleware/noCacheMiddleware';

/**
 * Lazy Router wrapper that defers importing route files
 * until the first HTTP request hits the route prefix using CommonJS require.
 */
const lazyRouter = (modulePath: string) => {
  let routerInstance: Router | null = null;
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!routerInstance) {
        const module = require(modulePath);
        routerInstance = module.default || module;
      }
      if (routerInstance) {
        routerInstance(req, res, next);
      } else {
        next(new Error(`Failed to load route module at ${modulePath}`));
      }
    } catch (err) {
      next(err);
    }
  };
};

/**
 * Mount all API routers under a prefix.
 * @param apiVersion — `v1` for `/api/v1` (stable contract); `legacy` for deprecated `/api` alias.
 */
export const registerApiRoutes = (
  app: Application,
  prefix: string,
  apiVersion: ApiVersionTag = 'v1',
): void => {
  const apiRouter = express.Router();
  apiRouter.use(attachApiVersion(apiVersion));

  apiRouter.use('/products', lazyRouter('./products/productRoutes'));
  apiRouter.use('/ai', lazyRouter('./ai/aiRoutes'));
  apiRouter.use('/upload', lazyRouter('./media/uploadRoutes'));
  apiRouter.use('/auth', noCacheMiddleware, lazyRouter('./auth/authRoutes'));
  apiRouter.use('/orders', noCacheMiddleware, lazyRouter('./commerce/orderRoutes'));
  apiRouter.use('/cms', lazyRouter('./cms/cmsRoutes'));
  apiRouter.use('/analytics', noCacheMiddleware, lazyRouter('./system/analyticsRoutes'));
  apiRouter.use('/reviews', lazyRouter('./products/reviewRoutes'));
  apiRouter.use('/users', noCacheMiddleware, lazyRouter('./users/userRoutes'));
  apiRouter.use('/inquiries', lazyRouter('./customer/inquiryRoutes'));
  apiRouter.use('/notifications', lazyRouter('./notifications/notificationRoutes'));
  apiRouter.use('/notification-center', lazyRouter('./notifications/notificationCenterRoutes'));
  apiRouter.use('/policies', lazyRouter('./customer/policyRoutes'));
  apiRouter.use('/loyalty', lazyRouter('./users/loyaltyRoutes'));
  apiRouter.use('/admin', noCacheMiddleware, lazyRouter('./system/adminSystemRoutes'));
  apiRouter.use('/admin/invites', noCacheMiddleware, lazyRouter('./auth/adminInviteRoutes'));
  apiRouter.use('/admin/catalog', noCacheMiddleware, lazyRouter('./products/catalogHealthRoutes'));
  apiRouter.use('/admin/search', noCacheMiddleware, lazyRouter('./admin/synonymRoutes'));
  apiRouter.use('/recommendations', lazyRouter('./discovery/recommendationRoutes'));
  apiRouter.use('/tracking', lazyRouter('./system/trackingRoutes'));
  apiRouter.use(
    '/analytics/recommendations',
    noCacheMiddleware,
    lazyRouter('./discovery/recommendationAnalyticsRoutes'),
  );
  apiRouter.use(
    '/customer-intelligence',
    noCacheMiddleware,
    lazyRouter('./system/customerIntelligenceRoutes'),
  );

  apiRouter.use('/contact', noCacheMiddleware, lazyRouter('./commerce/contactRoutes'));
  apiRouter.use('/refunds', noCacheMiddleware, lazyRouter('./commerce/refundRoutes'));

  // Aggregated endpoints

  // Dynamic Configuration & Architecture Routes

  apiRouter.use('/settings', lazyRouter('./system/storeSettingsRoutes'));
  apiRouter.use('/categories', lazyRouter('./products/categoryRoutes'));
  apiRouter.use('/location', lazyRouter('./system/locationRoutes'));

  apiRouter.use('/search/analytics', lazyRouter('./discovery/searchAnalyticsRoutes'));
  apiRouter.use('/search', lazyRouter('./discovery/searchRoutes'));
  apiRouter.use('/media', lazyRouter('./media/mediaRoutes'));

  // Social Preview Metadata
  apiRouter.use('/social', lazyRouter('./customer/socialRoutes'));

  // CMS/Content Routes
  apiRouter.use('/blogs', lazyRouter('./cms/blogRoutes'));
  apiRouter.use('/locations', lazyRouter('./customer/locationRoutes'));

  // Maintenance System Routes
  apiRouter.use('/maintenance', noCacheMiddleware, lazyRouter('./system/maintenanceRoutes'));

  // Enterprise Recycle Bin Routes
  apiRouter.use('/admin/recycle-bin', noCacheMiddleware, lazyRouter('./admin/recycleBinRoutes'));

  // Enterprise Backup & DR Routes
  apiRouter.use('/admin/backup', noCacheMiddleware, lazyRouter('./system/backupRoutes'));

  app.use(prefix, apiRouter);
};
