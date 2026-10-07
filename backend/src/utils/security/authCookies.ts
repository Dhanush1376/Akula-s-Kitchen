import { CookieOptions, Response } from 'express';
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
