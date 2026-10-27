import { Router } from 'express';
import {
  getBlogs,
  getBlogBySlug,
  createBlog,
  updateBlog,
  deleteBlog,
} from '../../controllers/cms/blogController';
import { requireAuth, requireAdmin } from '../../middleware/authMiddleware';

const router = Router();

router.route('/').get(getBlogs).post(requireAuth, requireAdmin, createBlog);

router
  .route('/:id')
  .put(requireAuth, requireAdmin, updateBlog)
  .delete(requireAuth, requireAdmin, deleteBlog);

router.route('/slug/:slug').get(getBlogBySlug);

export default router;
