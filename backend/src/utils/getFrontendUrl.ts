import logger from '../config/logger';

/**
 * Robust utility to resolve the canonical frontend URL across environments.
 * Prevents "localhost" from leaking into production emails, redirects, and callbacks.
 */
export const getFrontendUrl = (): string => {
  // 1. Explicit canonical URL
  if (process.env.FRONTEND_URL) {
    return process.env.FRONTEND_URL.replace(/\/$/, '');
  }

  // 2. First URL in the allowed CORS list
  if (process.env.FRONTEND_URLS) {
    const urls = process.env.FRONTEND_URLS.split(',')
      .map((u) => u.trim())
      .filter(Boolean);
    if (urls.length > 0) {
      return urls[0].replace(/\/$/, '');
    }
  }

  // 3. Admin-specific URL override (sometimes used for backend-only apps)
  if (process.env.ADMIN_FRONTEND_URL) {
    return process.env.ADMIN_FRONTEND_URL.replace(/\/$/, '');
  }

  // 4. Production hardcoded fallback (never return localhost in prod)
  if (process.env.NODE_ENV === 'production') {
    logger.warn(
      '[URL RESOLUTION] Missing FRONTEND_URL or FRONTEND_URLS in production. Using hardcoded fallback.',
    );
    return 'https://akulas.kitchen';
  }

  // 5. Local development fallback
  return 'http://localhost:5173';
};

/**
 * Resolves the public, Internet-accessible website URL for emails, SMS, and public customer links.
 * GUARANTEED to NEVER return localhost or 127.0.0.1.
 */
export const getPublicWebsiteUrl = (): string => {
  const siteUrl = process.env.SITE_URL || process.env.VITE_SITE_URL;
  if (siteUrl && !siteUrl.includes('localhost') && !siteUrl.includes('127.0.0.1')) {
    return siteUrl.replace(/\/$/, '');
  }

  const frontendUrl = process.env.FRONTEND_URL;
  if (frontendUrl && !frontendUrl.includes('localhost') && !frontendUrl.includes('127.0.0.1')) {
    return frontendUrl.replace(/\/$/, '');
  }

  return 'https://akulas.kitchen';
};

/**
 * Sanitizes any URL to ensure localhost / 127.0.0.1 never leaks into outgoing emails.
 */
export const sanitizePublicUrl = (url?: string): string => {
  if (!url || typeof url !== 'string') return getPublicWebsiteUrl();
  const trimmed = url.trim();
  if (trimmed.includes('localhost') || trimmed.includes('127.0.0.1')) {
    return trimmed.replace(
      /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i,
      'https://akulas.kitchen',
    );
  }
  return trimmed;
};
