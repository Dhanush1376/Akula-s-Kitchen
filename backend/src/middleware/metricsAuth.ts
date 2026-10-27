import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { isHostedDeployment } from '../config/runtimeEnv';

/**
 * Guards metrics endpoints (business counts, failure rates). Scrapers send
 * `x-metrics-api-key`. Fails closed on production/hosted deployments when no key is
 * configured, so a missing env var can never make business data public.
 */
export const requireMetricsKey = (req: Request, res: Response, next: NextFunction) => {
  const expected = process.env.METRICS_API_KEY;

  if (!expected) {
    if (process.env.NODE_ENV === 'production' || isHostedDeployment()) {
      res.status(404).json({ success: false, message: 'Not found' });
      return;
    }
    return next();
  }

  const provided = String(req.headers['x-metrics-api-key'] || '');
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    res.status(403).json({ success: false, message: 'Forbidden' });
    return;
  }
  next();
};

export default requireMetricsKey;
