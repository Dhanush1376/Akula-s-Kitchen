import { CookieOptions, Request, Response } from 'express';
import SessionAuthService from '../../services/SessionAuthService';
import { getAuthCookieOptions, getAuthCookieName } from '../../config/cookieConfig';

export const CUSTOMER_REFRESH_COOKIE = getAuthCookieName('akula_refresh_token');
export const ADMIN_REFRESH_COOKIE = getAuthCookieName('akula_admin_refresh_token');

/**
 * Cookie options for refresh tokens.
 * path=/ ensures the cookie is sent for all routes, proxies, and API versions.
 */
export const getRefreshCookieOptions = (): CookieOptions => {
  return getAuthCookieOptions(SessionAuthService.getRefreshTokenTtlMs(), '/');
};

export const setCustomerRefreshCookie = (res: Response, refreshToken: string) => {
  res.cookie(CUSTOMER_REFRESH_COOKIE, refreshToken, getRefreshCookieOptions());
};

export const clearCustomerRefreshCookie = (res: Response) => {
  res.clearCookie(CUSTOMER_REFRESH_COOKIE, getRefreshCookieOptions());
};

export const getAdminRefreshCookieOptions = (): CookieOptions => {
  return getAuthCookieOptions(SessionAuthService.getRefreshTokenTtlMs(), '/');
};

export const setAdminRefreshCookie = (res: Response, refreshToken: string) => {
  res.cookie(ADMIN_REFRESH_COOKIE, refreshToken, getAdminRefreshCookieOptions());
};

export const clearAdminRefreshCookie = (res: Response) => {
  res.clearCookie(ADMIN_REFRESH_COOKIE, getAdminRefreshCookieOptions());
};

/**
 * Every name a refresh token may have been issued under: the current names plus the
 * other naming style (plain vs __Secure-). Browsers that predate a cookie-hardening
 * deploy still hold the plain names, and refresh accepts both, so logout must revoke
 * and clear both or a pre-deploy session would survive logout.
 */
const REFRESH_COOKIE_BASE_NAMES = ['akula_refresh_token', 'akula_admin_refresh_token'];
export const ALL_REFRESH_COOKIE_NAMES = REFRESH_COOKIE_BASE_NAMES.flatMap((n) => [
  n,
  `__Secure-${n}`,
]);

/** All distinct refresh tokens the request carries, under any cookie name. */
export const collectRefreshTokensFromCookies = (req: Request): string[] => [
  ...new Set(
    ALL_REFRESH_COOKIE_NAMES.map((name) => String(req.cookies?.[name] || '').trim()).filter(
      Boolean,
    ),
  ),
];

/** Clears refresh cookies under every name (path and domain match how they were set). */
export const clearAllRefreshCookies = (res: Response) => {
  const { domain, path } = getRefreshCookieOptions();
  for (const name of ALL_REFRESH_COOKIE_NAMES) {
    const secure = name.startsWith('__Secure-');
    res.clearCookie(name, {
      domain,
      path,
      httpOnly: true,
      secure,
      sameSite: secure ? 'none' : 'lax',
    });
  }
};

const COOKIE_PROBE_NAMES = [
  'akula_csrf',
  '__Secure-akula_csrf',
  'akula_refresh_token',
  '__Secure-akula_refresh_token',
  'akula_admin_refresh_token',
  '__Secure-akula_admin_refresh_token',
];

/**
 * True when the browser demonstrably round-trips our cookies (the SPA fetches the
 * CSRF cookie before every mutating request, including login).
 */
export const requestCarriesAuthCookies = (req: Request): boolean =>
  COOKIE_PROBE_NAMES.some((name) => Boolean(req.cookies?.[name]));

/**
 * The refresh token is only echoed in a JSON body for clients that cannot use
 * cookies. Cookie-capable clients rotate via Set-Cookie alone, so the long-lived
 * credential never becomes readable by page JavaScript.
 */
export const refreshTokenForResponseBody = (
  req: Request,
  refreshToken: string,
  usedCookie = requestCarriesAuthCookies(req),
): string | undefined => (usedCookie ? undefined : refreshToken);
