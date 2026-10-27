/**
 * Runtime environment guards.
 *
 * Several security controls (rate limits, OTP lockouts, CORS/CSRF origin checks,
 * stack-trace suppression) are relaxed for local development. Keying those
 * relaxations on NODE_ENV alone means a single missing/wrong env var on the
 * hosting platform silently disables them in production. These helpers make the
 * relaxations depend on *both* NODE_ENV and the absence of a hosting platform.
 */

/** True when running on a managed hosting platform (never a developer machine). */
export const isHostedDeployment = (): boolean =>
  process.env.RENDER === 'true' ||
  Boolean(process.env.RAILWAY_ENVIRONMENT) ||
  Boolean(process.env.FLY_APP_NAME) ||
  Boolean(process.env.K_SERVICE);

/** Local development only — never true on a hosted deployment. */
export const isLocalDevelopment = (): boolean =>
  process.env.NODE_ENV === 'development' && !isHostedDeployment();

/** Local development or the automated test runner — never true on a hosted deployment. */
export const isLocalDevOrTest = (): boolean =>
  (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') &&
  !isHostedDeployment();

/** NODE_ENV is not production while running on a hosting platform: a misconfiguration. */
export const isMisconfiguredHostedEnv = (): boolean =>
  isHostedDeployment() && process.env.NODE_ENV !== 'production';
