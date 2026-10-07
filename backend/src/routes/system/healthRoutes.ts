import { Router, Request, Response } from 'express';
import { HealthController } from '../../controllers/system/healthController';
import { requireAuth, requireAdmin } from '../../middleware/authMiddleware';

const router = Router();

// Public probes — no auth required (used by load balancers / k8s)
router.get('/', HealthController.liveness);
router.get('/ready', HealthController.readiness);

// Deep health — admin only
router.get('/deep', requireAuth, requireAdmin, HealthController.deepHealth);

// Prometheus Metrics
router.get('/metrics', HealthController.metrics);

// Sentry Debug
router.get('/sentry-debug', requireAuth, requireAdmin, (_req: Request, _res: Response) => {
  throw new Error("Sentry Debug Exception from Akula's Kitchen Backend");
});

export default router;
