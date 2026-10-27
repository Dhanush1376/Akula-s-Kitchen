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
