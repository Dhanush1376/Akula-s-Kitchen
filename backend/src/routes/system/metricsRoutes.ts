import { Router, Request, Response } from 'express';
import { MetricsService } from '../../services/MetricsService';
import { requireMetricsKey } from '../../middleware/metricsAuth';

const router = Router();

router.get('/', requireMetricsKey, async (_req: Request, res: Response): Promise<void> => {
  try {
    const metrics = await MetricsService.reportHourlyMetrics();
    res.status(200).json(metrics);
  } catch {
    res.status(500).json({ error: 'Failed to generate metrics' });
  }
});

export default router;
