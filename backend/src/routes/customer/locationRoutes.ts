import { Router } from 'express';
import {
  getLocations,
  getLocationBySlug,
  createLocation,
  updateLocation,
  deleteLocation,
} from '../../controllers/customer/locationController';
import { requireAuth, requireAdmin } from '../../middleware/authMiddleware';

const router = Router();

router.route('/').get(getLocations).post(requireAuth, requireAdmin, createLocation);

router
  .route('/:id')
  .put(requireAuth, requireAdmin, updateLocation)
  .delete(requireAuth, requireAdmin, deleteLocation);

router.route('/slug/:slug').get(getLocationBySlug);

export default router;
