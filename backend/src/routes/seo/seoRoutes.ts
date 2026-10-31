import { Router } from 'express';
import {
  checkSlug,
  getMerchantFeed,
  getPageSeo,
  previewProductSeo,
} from '../../controllers/seo/seoController';
import { requireAuth, requireAdmin } from '../../middleware/authMiddleware';

const router = Router();

// Public, read-only
router.get('/page', getPageSeo);
router.get('/merchant-feed.xml', getMerchantFeed);

// Admin product editor helpers
router.get('/admin/slug-check', requireAuth, requireAdmin, checkSlug);
router.post('/admin/product-preview', requireAuth, requireAdmin, previewProductSeo);

export default router;
