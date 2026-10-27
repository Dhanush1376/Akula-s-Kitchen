import { Request, Response, NextFunction } from 'express';
import net from 'net';
import logger from '../config/logger';
import { isHostedDeployment } from '../config/runtimeEnv';

/**
 * Resolves the real customer IP behind the production edge chain
 * (Browser → Vercel rewrite → Cloudflare → Render proxy → app).
 *
 * With a fixed `trust proxy` hop count, req.ip resolves to a Render-internal
 * 10.x address (observed in SecurityAuditLog), so every IP-keyed rate limit and
 * OTP lockout would be shared by all customers. This middleware overrides
 * req.ip with the first public address reported by the edge.
 *
 * Note: forwarded headers can be forged by clients that bypass the edge and call
 * the origin directly; that only lets an attacker split their own rate-limit
 * bucket. Per-challenge OTP attempt caps and per-account lockouts are not IP-based.
 */

const isPrivateOrReserved = (ip: string): boolean => {
  const v4 = ip.startsWith('::ffff:') ? ip.slice(7) : ip;
  if (net.isIPv4(v4)) {
    const [a, b] = v4.split('.').map(Number);
    return (
      a === 10 ||
      a === 127 ||
      a === 0 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168)
    );
  }
  if (net.isIPv6(ip)) {
    const lower = ip.toLowerCase();
    return (
      lower === '::1' ||
      lower === '::' ||
      lower.startsWith('fc') ||
      lower.startsWith('fd') ||
      lower.startsWith('fe80')
    );
  }
  return true;
};

const firstPublicIp = (header: string | string[] | undefined): string | null => {
  const raw = Array.isArray(header) ? header.join(',') : header;
  if (!raw) return null;
  for (const part of raw.split(',')) {
    const candidate = part.trim();
    if (net.isIP(candidate) && !isPrivateOrReserved(candidate)) return candidate;
  }
  return null;
};

export const resolveClientIp = (req: Request): string | undefined => {
  return (
    firstPublicIp(req.headers['x-vercel-forwarded-for']) ||
    firstPublicIp(req.headers['x-forwarded-for']) ||
    req.ip
  );
};

let sourceLogged = false;

export const clientIpResolver = (req: Request, _res: Response, next: NextFunction) => {
  if (!isHostedDeployment() && process.env.RESOLVE_EDGE_CLIENT_IP !== 'true') {
    return next();
  }

  const resolved = resolveClientIp(req);
  if (resolved && resolved !== req.ip) {
    Object.defineProperty(req, 'ip', { value: resolved, configurable: true, enumerable: true });
  }

  if (!sourceLogged) {
    sourceLogged = true;
    // One-time, value-free diagnostic so the edge header shape can be verified in logs.
    logger.info('[CLIENT_IP] Edge client IP resolution active', {
      hasVercelForwardedFor: Boolean(req.headers['x-vercel-forwarded-for']),
      forwardedForEntries: String(req.headers['x-forwarded-for'] || '')
        .split(',')
        .filter(Boolean).length,
      resolvedIsPublic: Boolean(resolved && !isPrivateOrReserved(resolved)),
    });
  }

  next();
};

export default clientIpResolver;
