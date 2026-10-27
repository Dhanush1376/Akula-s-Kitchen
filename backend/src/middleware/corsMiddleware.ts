import { isLocalDevOrTest } from '../config/runtimeEnv';
import cors from 'cors';
import { Request, Response, NextFunction } from 'express';
import { corsOptions } from '../config/corsConfig';
import logger from '../config/logger';

// Standard CORS middleware
export const corsHandler = cors(corsOptions);

// Fallback middleware for CORS errors
export const corsErrorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
  if (err.message && err.message.startsWith('Not allowed by CORS')) {
    // Make sure we don't leak stack traces
    return res.status(403).json({
      success: false,
      message: 'Request origin is not allowed by server policy.',
    });
  }
  next(err);
};

export const WHATSAPP_WEBHOOK_PATHS = ['/api/webhooks/whatsapp', '/api/v1/webhooks/whatsapp'];

// S2S webhooks and strict direct access blocker
export const strictOriginBlocker = (req: Request, res: Response, next: NextFunction) => {
  // Webhooks from trusted providers don't have an origin but need to POST
  // (each verifies its own HMAC signature in the route handler).
  if (req.path === '/api/orders/webhook' || WHATSAPP_WEBHOOK_PATHS.includes(req.path)) {
    return next();
  }

  const mutatingMethod = !['GET', 'HEAD', 'OPTIONS'].includes(req.method);

  if (!mutatingMethod || isLocalDevOrTest()) {
    return next();
  }

  const origin = req.headers.origin;

  // If no origin and trying to mutate, block it
  if (!origin) {
    logger.warn(`[CORS BLOCKED] Mutating request without origin header to ${req.path}`);
    return res.status(403).json({
      success: false,
      message: 'Direct API access for mutating methods is restricted.',
    });
  }

  next();
};

export const corsMiddleware = [corsHandler, corsErrorHandler, strictOriginBlocker];
