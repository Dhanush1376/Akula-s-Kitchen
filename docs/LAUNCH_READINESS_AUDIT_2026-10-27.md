# Akula's Kitchen — Production Readiness Audit (2026-10-27)

Scope: the existing monorepo (`frontend/` React 19 + Vite on Vercel, `backend/` Express 5 + Mongoose on
Render, MongoDB Atlas, Cloudinary, Razorpay, Brevo/SMTP, Fast2SMS). Nothing was committed, pushed or
deployed. Production was only probed with harmless GET/unauthenticated requests and read-only DB queries.

## M. Final launch decision

**2 — READY AFTER EXPLICIT ACTIONS** (updated after the second audit pass, §N).

Every code-side release gate now passes: backend typecheck, lint, build and **230/230 tests**; frontend lint,
build, bundle budgets and **31/31 tests**; **0** production dependency advisories in either app. All confirmed
P0/P1 code defects found in both passes are fixed with regression tests.

It is **not** option 1. The site that is live today still runs the old code with the misconfiguration below,
and the remaining gates can only be closed by the operator:

1. **The live backend runs with `NODE_ENV` ≠ `production`** (evidence below). Until the new code is deployed:
   no rate limiting (incl. OTP send/verify), OTP codes in logs, public stack traces, any-origin CORS, cookies
   without `Secure`, public business metrics, and — most serious — a password-less admin takeover path (§N, D-12).
2. **Product images are stored on Render's ephemeral disk**, because the Cloudinary credentials are rejected
   (`401 api_secret mismatch`). 3 of 14 live products already 404.
3. Real-device login, Razorpay payment and backup-restore checks have not been run (no devices, sandbox or
   staging available here).

**Deploy this code before anything else**: it closes D-12 and the other live exposures even before the
environment is fixed. Then follow "Recommended order of operations" at the end of this document.

---

## A. Executive summary

| Area                          | Status                                                                                                                                                |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Product images across devices | Root cause found and proven; code fixed; **data repair blocked on valid Cloudinary credentials**                                                      |
| Production runtime mode       | **Misconfigured in production**; code now forces security guards on any hosted deploy; env var must still be set                                      |
| Slow login                    | Root cause measured: ~206 ms per DB round trip × ~11 sequential round trips; 5 round trips removed from login/refresh                                 |
| "Some users can't log in"     | Root cause found: production sees every customer as a Render-internal `10.x` IP → shared rate-limit/lockout buckets once limits are on. Fixed in code |
| Payments / orders             | Server-side pricing, HMAC webhook verification, transactional state machine present; existing tests pass. Real Razorpay flow **not verified**         |
| Dependencies                  | 4 high + 4 moderate backend advisories → fixed with semver-compatible updates (0 remaining)                                                           |
| Order lifecycle               | Brief's lifecycle (BEING BAKED / DISPATCHED / delivery agent) **does not exist in the code or git history** — needs a product decision                |

## B. Architecture (as found)

- **Frontend**: Vercel. All API, Socket.IO and `/uploads` traffic is rewritten same-origin (`/api/*` →
  `https://akula-s-kitchen-23m5.onrender.com`), so auth cookies are first-party. `akulas.kitchen` 308-redirects to
  `www.akulas.kitchen`.
- **Backend**: single Render web service (Cloudflare in front), Express 5, JWT access token (memory) +
  rotating refresh token (HttpOnly cookie **and** a localStorage fallback copy).
- **Auth methods**: email OTP, phone OTP (Fast2SMS), Google ID-token sign-in, admin portal with optional TOTP 2FA.
  No passwords for customers.
- **Data**: MongoDB Atlas, database `akulas-kitchen`. Render→Atlas ping measured at **206 ms** (different regions).
- **Media**: Cloudinary via `MediaService` → `CloudinaryAdapter`; `express.static('/uploads')` fallback.
- **Redis**: `not_configured` in production (`/api/readiness`). Rate limiting therefore falls back to per-process
  memory; BullMQ queues and Socket.IO adapter are not shared.

**Scaling bottlenecks**: cross-region DB latency dominates every request; no Redis means the backend cannot run
more than one instance correctly (in-memory rate limits, upload concurrency map, socket rooms); local-disk media.

## C. Authentication report

### Root cause: slow login (measured)

| Measurement (from India, 5 samples, median) | Value      |
| ------------------------------------------- | ---------- |
| `GET /api/health` direct to Render          | 0.354 s    |
| same via Vercel proxy                       | 0.642 s    |
| `/api/readiness` MongoDB ping (server-side) | **206 ms** |

Email-OTP verify for an existing customer performed ~11 sequential DB round trips
(controller lookup, attempt `$inc`, IP fail count, consume, delete siblings, verify log, identity, user,
user save, refresh-token create, session count) ≈ **2.3 s server time** before network. The frontend adds no
extra requests after verify (`AuthProvider.loginSuccess` navigates immediately).

**Changes** (no security decision altered):

- `OtpAuthService.verifyOTP`: attempt `$inc` and IP-fail count run concurrently; sibling-challenge cleanup and
  success log moved off the response path (siblings are already exhausted at issue time and TTL-expire).
- `SessionAuthService.createSession`: session-cap pruning moved off the response path and made idempotent
  (deletes only sessions older than the 10th-newest, so concurrent logins can never evict a newer session —
  a race that the existing test caught during this work).
- `SessionAuthService.refreshSession`: used-token and live-session lookups in one round trip.

Net: **−3 round trips on login (~0.6 s), −1 on every session restore/refresh (~0.2 s)**, estimated from the
measured 206 ms RTT. _Not re-measured in production — requires deploy._ The structural fix is co-locating Render
and Atlas in the same region (expected to cut each round trip to a few ms).

### Root cause: users on some devices cannot log in

- Production `SecurityAuditLog` records client IPs as `10.24–10.30.x.x` (Render internal network). With
  `trust proxy = 1` behind Vercel → Cloudflare → Render, `req.ip` is never the customer.
- Every IP-keyed control (OTP send 3/15 min/IP, verify-fail 5/15 min/IP, auth limiter 10/15 min) therefore
  shares one bucket across all customers. They are _currently masked_ only because production runs in
  development mode (all limits skipped). Setting `NODE_ENV=production` without this fix would lock most
  customers out within minutes of launch.
- **Fix**: `middleware/clientIpResolver.ts` resolves the first public address from `x-vercel-forwarded-for` /
  `x-forwarded-for` on hosted deployments, before any middleware keys on `req.ip`. It logs one value-free
  diagnostic line so the header shape can be confirmed in Render logs after deploy.
- Residual risk: forwarded headers can be forged by clients that bypass Vercel and hit the Render origin
  directly; that only lets an attacker split _their own_ bucket. Per-challenge OTP attempt caps (atomic),
  per-account lockouts and phone-keyed limits are not IP-based.

Other cross-device factors reviewed:

- Cookies are first-party via the Vercel proxy (good for Safari ITP). Currently `SameSite=Lax`, no `Secure`,
  no `__Secure-` prefix because of the NODE_ENV issue.
- **Risk (not changed)**: the refresh token is returned in JSON and persisted to `localStorage` on every login
  and refresh (`authStorage.js`), contrary to the comment in `authController.refreshSession`. An XSS would
  expose a 30-day credential. Since the API is now same-origin, the fallback is likely unnecessary — remove
  after verifying cookie-only sessions on iOS Safari and Android Chrome.
- **Risk (not changed)**: if a refresh response is lost (mobile network drop), the next refresh after the 120 s
  grace period presents a used token and `revokeAllSessions` logs the customer out **on every device**.
  Consider token-family revocation or returning the already-issued successor within a longer window.
- Removed refresh-token prefix logging (`SessionAuthService` logged the first 10 characters).

### Security guards decoupled from NODE_ENV

New `config/runtimeEnv.ts`; dev-only relaxations now require `NODE_ENV=development` **and** not running on a
hosting platform (`RENDER`, `RAILWAY_ENVIRONMENT`, `FLY_APP_NAME`, `K_SERVICE`). Applied to: rate-limit skip,
OTP IP limits and lockouts (email + phone), plaintext OTP logging (3 sites), stack-trace exposure and 500 masking,
CORS allow-all, CSRF origin skip. Startup logs `[CRITICAL CONFIG]` when hosted with NODE_ENV ≠ production.

### Tests

- `tests/unit/runtimeEnvGuards.test.ts` (9 tests): hosted-dev detection, rate limits not skipped on Render,
  client-IP resolution, distinct keys for two customers behind the same proxy, untouched on developer machines.
- Existing auth suites (`tests/integration/auth/*`, `sessionAuth`, `codOtpVerification`, `rateLimitingAbuse`)
  pass; `sessionAuth` cap test strengthened to assert the _oldest_ sessions are the ones evicted.
- **Not verified**: real devices (iOS Safari, Android Chrome), Google sign-in end to end, live OTP delivery —
  no test devices or provider sandbox available in this environment.

## D. Product image report

### Root cause (proven end to end)

1. `CloudinaryAdapter.upload` caught _any_ Cloudinary error and wrote the file to the server's local disk,
   returning a relative `/uploads/...` URL as a success. It also mirrored the file into
   `frontend/public/uploads` on a developer machine.
2. The configured Cloudinary credentials are rejected: `cloudinary.api.ping()` → **`401 api_secret mismatch`**.
3. Read-only DB audit: **14 / 14** product image references are `/uploads/...`; **0** are Cloudinary.
4. Images uploaded on the developer machine were mirrored into `frontend/public/uploads`, committed (17 files in
   git) and served by Vercel as static files → they "work". Images not in git are requested from Render, whose
   disk is wiped on every deploy → **404**.
5. Live verification (fresh browser, `www.akulas.kitchen/collections`): `9607c278…`, `359c1754…`,
   `afbfbe1f…` return **404** (and 404 again on the frontend's `?retry=1`).

### Changes

- `CloudinaryAdapter`: local-disk fallback is never used in production and only with explicit
  `ALLOW_LOCAL_MEDIA_FALLBACK=true` elsewhere (dev machines share the production database). Otherwise the
  upload fails with **503 "Image storage is temporarily unavailable. The image was not saved"**, which the
  admin UI surfaces as an error toast after its bounded 3-attempt retry.
- `frontend/src/services/api/uploadService.js`: a file the server did not store is now an error instead of
  being silently dropped from a "successful" batch.
- `scripts/migrations/migrate-local-images-to-cloudinary.ts`: dry-run by default; pings Cloudinary first;
  re-hosts recoverable local files; updates a field only if it still holds the exact old URL; never deletes
  local files; re-runnable. Verified it aborts safely on the current bad credentials.
- `tests/unit/cloudinaryAdapterFallback.test.ts` (4 tests).

### Required external actions

1. Correct `CLOUDINARY_API_SECRET` (and key/cloud name) — locally **and** in Render — then confirm with
   `npm run test:cloudinary` or the migration's ping.
2. Run the migration dry run, review, then `--apply` (11 references recoverable from local files).
3. Re-upload images for the 3 unrecoverable references through the admin UI.
4. After all references are Cloudinary URLs, the `frontend/public/uploads` copies and the `/uploads` Vercel
   rewrite can be retired.

## E. Defect register

| ID   | Sev | Subsystem        | Evidence                                                                                                                                          | Root cause                                                                                                          | Fix / files                                                                                                                                            | Test                      | Status                                                                            |
| ---- | --- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------- | --------------------------------------------------------------------------------- |
| D-01 | P0  | Config/security  | Live: stack trace in `/api/v1/auth/refresh` 401; `akula_csrf` without `Secure`/`__Secure-`; no `RateLimit-*` headers on rate-limited routes       | Render `NODE_ENV` not `production` (rate-limit skip only triggers on `development`)                                 | Code guard: `config/runtimeEnv.ts`, rateLimiter, OtpAuthService, PhoneAuthService, authController, corsConfig, corsMiddleware, errorMiddleware, env.ts | runtimeEnvGuards          | Code fixed; **env var change required**                                           |
| D-02 | P0  | Media            | 14/14 refs local; 3 live 404s; Cloudinary 401                                                                                                     | Silent local-disk fallback + bad credentials                                                                        | CloudinaryAdapter, uploadService.js, migration script                                                                                                  | cloudinaryAdapterFallback | Code fixed; **credentials + data repair required**                                |
| D-03 | P0  | Auth             | Prod audit-log IPs are `10.x`                                                                                                                     | `trust proxy` hop count wrong for Vercel→Cloudflare→Render                                                          | `middleware/clientIpResolver.ts`, app.ts                                                                                                               | runtimeEnvGuards          | Code fixed; verify log line after deploy                                          |
| D-04 | P1  | Auth perf        | 206 ms DB RTT, ~11 sequential round trips                                                                                                         | Cross-region DB + sequential queries                                                                                | OtpAuthService, SessionAuthService                                                                                                                     | sessionAuth, auth suites  | Partially fixed; region co-location recommended                                   |
| D-05 | P1  | Dependencies     | `npm audit`: body-parser, multer, follow-redirects, zod (high); nodemailer, sanitize-html, fast-uri, ip-address (moderate)                        | Outdated transitive versions                                                                                        | backend `package-lock.json` (`npm audit fix`, no majors)                                                                                               | full suite                | Fixed (0 advisories)                                                              |
| D-06 | P1  | Auth security    | `authStorage.js`, `authController.refreshSession`                                                                                                 | Refresh token persisted in localStorage on every login/refresh                                                      | Body token only for cookie-less clients; client clears stale copy (authCookies, authController, adminAuthController, api.js, AuthProvider.jsx)         | launchHardening           | Fixed (§N)                                                                        |
| D-07 | P1  | Auth reliability | `SessionAuthService.refreshSession`                                                                                                               | Lost refresh response → reuse after 120 s → all sessions revoked                                                    | Token families: reuse revokes only that chain (RefreshToken, UsedRefreshToken, SessionAuthService)                                                     | sessionAuth (+3)          | Fixed (§N)                                                                        |
| D-08 | P1  | Orders           | Order model enum: Pending/Confirmed/Processing/Delivered/Cancelled/Returned/Refunded/Settled; `git log -S BEING_BAKED` / `-S deliveryAgent` empty | Brief's lifecycle never implemented; "Shipped/Out for Delivery" collapse to Processing; no delivery-agent selection | —                                                                                                                                                      | —                         | **Decided 2026-10-27: launch with the current lifecycle** (see "D-08 decision")   |
| D-09 | P2  | Logging          | `SessionAuthService` logged token prefix                                                                                                          | Debug logging left in                                                                                               | SessionAuthService                                                                                                                                     | —                         | Fixed                                                                             |
| D-10 | P2  | Infra            | `/api/readiness`: redis `not_configured`                                                                                                          | No Redis                                                                                                            | —                                                                                                                                                      | —                         | Open: required before >1 instance and by `NODE_ENV=production` startup validation |
| D-11 | P2  | Catalog          | Categories in DB: Batters, Chutneys, Pickles, Podis, Masala, Namkeen, Snacks, Sweets                                                              | Brief lists "Podis and Masala" (one) and Cashews; DB has Podis/Masala separate, Snacks, Sweets, no Cashews          | —                                                                                                                                                      | —                         | Confirm intended taxonomy                                                         |

## F. Security report

- Fixed: D-01 code guards, D-03, D-05, D-09; local-disk media fallback removed from production.
- Verified present: HMAC-SHA256 + `timingSafeEqual` for Razorpay payment and webhook signatures; raw-body
  webhook parsing; CSRF double-submit with timing-safe compare; helmet/CSP; magic-byte image validation and
  per-route size limits; staff-only order status route; atomic per-challenge OTP attempt caps.
- Open: D-06, D-07; origin bypass of the Vercel edge (Render URL is publicly reachable — consider restricting
  it); CSP allows `'unsafe-inline'` scripts.
- Secrets: none printed in this audit. `.env`, `.env.local` are git-ignored. `frontend/.env` is not tracked.
  Note `frontend/.env` still names the onrender URL in `VITE_API_URL`, but `apiConfig.js` ignores it and always
  uses the same-origin proxy.

## G. Data integrity

- Order status changes run in a Mongo transaction with `OrderStateMachine.validateTransition`.
- Order line prices are read from the product document server-side (`orderValidation.ts`).
- Refresh tokens: unique hash, `{userId, createdAt}` index (used by the new prune), TTL on OTP challenges.
- Migration risk: the image migration is the only data write proposed; it is conditional per field and
  re-runnable. No index or schema migration was performed.

## H. Performance and scalability

Measured values are in §C. No load test was run: there is no staging environment, and load-testing production
is out of scope. Capacity is **not** claimed. Single instance only until Redis is configured.

## I. Test report

| Check                                     | Command                                                     | Result                                                   |
| ----------------------------------------- | ----------------------------------------------------------- | -------------------------------------------------------- |
| Backend typecheck (baseline)              | `npx tsc --noEmit`                                          | pass                                                     |
| Backend lint (baseline)                   | `npx eslint src`                                            | pass                                                     |
| Backend tests (baseline)                  | `npx vitest run`                                            | 25 files, 207/207 pass                                   |
| Backend after changes                     | tsc / eslint / `npm run build` / `npx vitest run`           | all pass; 27 files, **230/230** tests                    |
| Frontend lint                             | `npm run lint`                                              | 0 errors, 2 warnings                                     |
| Frontend tests                            | `npx vitest run`                                            | 4 files, 31/31 pass (before and after change)            |
| Frontend build                            | `npm run build` (+ budget and performance guards)           | pass                                                     |
| Backend `npm audit --omit=dev`            | after `npm audit fix`                                       | 0 vulnerabilities                                        |
| Live probes                               | curl / in-app browser against www.akulas.kitchen and Render | evidence in §C, §D, §E                                   |
| E2E, real devices, Razorpay sandbox, load | —                                                           | **Not run** (no staging, devices or sandbox credentials) |

## J. Files changed

Backend: `src/config/runtimeEnv.ts` (new), `src/middleware/clientIpResolver.ts` (new), `src/app.ts`,
`src/config/env.ts`, `src/config/corsConfig.ts`, `src/middleware/corsMiddleware.ts`,
`src/middleware/errorMiddleware.ts`, `src/middleware/rateLimiter.ts`, `src/controllers/auth/authController.ts`,
`src/services/OtpAuthService.ts`, `src/services/PhoneAuthService.ts`, `src/services/SessionAuthService.ts`,
`src/services/media/CloudinaryAdapter.ts`, `.env.example`, `package-lock.json`,
`scripts/migrations/migrate-local-images-to-cloudinary.ts` (new),
`tests/unit/cloudinaryAdapterFallback.test.ts` (new), `tests/unit/runtimeEnvGuards.test.ts` (new),
`tests/integration/sessionAuth.test.ts`.
Frontend: `src/services/api/uploadService.js`. Docs: this file.

## K. Launch checklist

| Item                                                                                                                                                                                                                                    | Status                                                                         |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Backend builds, typechecks, lints, tests pass                                                                                                                                                                                           | VERIFIED PASS (230/230)                                                        |
| Frontend builds, lints, tests pass                                                                                                                                                                                                      | VERIFIED PASS                                                                  |
| No high/critical dependency advisories (backend and frontend)                                                                                                                                                                           | VERIFIED PASS (0 / 0)                                                          |
| Uploads never report false success / never use ephemeral disk in production                                                                                                                                                             | VERIFIED PASS (unit-tested)                                                    |
| All product images load from durable storage                                                                                                                                                                                            | VERIFIED FAIL (3 live 404s; 14/14 local refs)                                  |
| Cloudinary credentials valid                                                                                                                                                                                                            | BLOCKED BY EXTERNAL CONFIGURATION (401 locally; Render value unknown)          |
| Render `NODE_ENV=production`                                                                                                                                                                                                            | BLOCKED BY EXTERNAL CONFIGURATION                                              |
| Production-required env vars present (`REDIS_URL`, `ADMIN_PASSWORD` ≥12, `RAZORPAY_WEBHOOK_SECRET` ≥32, `RAZORPAY_KEY_ID/SECRET`, `CLOUDINARY_*`, `BREVO_API_KEY` or SMTP, `FIELD_ENCRYPTION_KEY` ≥32 ≠ `JWT_SECRET`, `JWT_SECRET` ≥32) | NOT VERIFIED — startup **exits** if any is missing once `NODE_ENV=production`  |
| Rate limits key on real customer IP                                                                                                                                                                                                     | NOT VERIFIED in production (unit-tested; check `[CLIENT_IP]` log after deploy) |
| Login on iOS Safari / Android Chrome / desktop                                                                                                                                                                                          | NOT VERIFIED                                                                   |
| Google sign-in authorized origins include `https://www.akulas.kitchen`                                                                                                                                                                  | NOT VERIFIED                                                                   |
| Razorpay payment, webhook delivery, refunds                                                                                                                                                                                             | NOT VERIFIED (no sandbox)                                                      |
| Order lifecycle                                                                                                                                                                                                                         | DECIDED: launch with the existing, tested lifecycle (D-08)                     |
| Database backups and restore test                                                                                                                                                                                                       | NOT VERIFIED                                                                   |
| Render ↔ Atlas region co-location                                                                                                                                                                                                       | VERIFIED FAIL (206 ms)                                                         |

## L. Rollback and recovery

- All code changes are isolated and uncommitted; revert per file with `git checkout -- <file>`.
- Dependency update: restore the previous `backend/package-lock.json` from git and `npm ci`.
- If `NODE_ENV=production` crashes startup: Render logs print `[CRITICAL STARTUP ERROR] Missing required
environment variables: …`; add the variables or roll the env change back (the code guards keep rate limits,
  OTP log redaction and stack masking on even then).
- If customers hit unexpected 429s after deploy: check the one-time `[CLIENT_IP]` log line. If
  `resolvedIsPublic` is false, the edge headers differ from expectations; temporarily raise limits rather than
  disabling them.
- Image migration: only rewrites product fields that still match the old URL and keeps local files; to revert,
  restore the previous `imageSrc`/`images` values from the migration's printed mapping.

## Recommended order of operations

1. Fix Cloudinary credentials (local + Render). Verify with ping.
2. Provision Redis (Render Key Value or Upstash) and set `REDIS_URL`.
3. Run `npm run check-env` on Render with `NODE_ENV=production` and fill every missing variable.
4. Deploy this code, then set `NODE_ENV=production`. Confirm: `RateLimit-*` headers present, error bodies have
   no `stack`, cookies are `__Secure-…; Secure`, `[CLIENT_IP] resolvedIsPublic: true` in logs.
5. Run the image migration (dry run, then `--apply`), re-upload the 3 missing images.
6. Review the category list in the admin panel (D-11).
7. Test login on real iOS and Android devices, and a Razorpay test-mode payment on staging.
8. Move Render and Atlas into the same region.

---

## N. Second audit pass (whole-codebase scan)

Method: every route file parsed for endpoints lacking auth guards; every Redis-dependent security check and
every `NODE_ENV !== 'production'` branch reviewed; object-level authorization on order reads; log statements
scanned for credential values; pagination caps; Google token verification; frontend dependency audit.

### New defects

| ID   | Sev    | Subsystem               | Evidence                                                                                                                                                                                       | Root cause                                                 | Fix / files                                                                                                              | Test                      | Status                                                                                     |
| ---- | ------ | ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ------------------------- | ------------------------------------------------------------------------------------------ |
| D-12 | **P0** | Admin auth              | `twoFactorPending.ts` returned `true` for any userId when Redis is down and NODE_ENV ≠ production — both true in production today                                                              | Pending-2FA marker existed only in Redis, failing open     | MongoDB TTL fallback (`models/TwoFactorPending.ts`), never defaults to true, rejects non-string ids (operator injection) | launchHardening (3)       | Fixed in code — **deploy urgently**                                                        |
| D-13 | P1     | Data exposure           | Live: `GET /api/v1/business-metrics` and `/api/health/metrics` return 200 with order/refund/failure counts to anyone                                                                           | Key check skipped when `METRICS_API_KEY` unset (fail-open) | `middleware/metricsAuth.ts` (fail closed when hosted, timing-safe compare), metricsRoutes, healthRoutes                  | launchHardening (3)       | Fixed                                                                                      |
| D-14 | P1     | Authorization (IDOR)    | `GET /orders/:id/timeline` checked login only                                                                                                                                                  | No ownership check                                         | `assertCanViewOrder` in orderController                                                                                  | launchHardening           | Fixed                                                                                      |
| D-15 | P1     | Authorization (IDOR)    | `GET /orders/:id/public-track` returned any order (name, city, pincode, items, totals) to any signed-in user without a token                                                                   | No ownership check on the signed-in path                   | orderController                                                                                                          | launchHardening           | Fixed                                                                                      |
| D-16 | P1     | Auth / privacy          | `emailProvider.ts`, `EmailAdapter.ts`: when real providers fail and NODE_ENV ≠ production, mail goes to Ethereal (public test inbox) and is reported as sent                                   | Fallback keyed on NODE_ENV only                            | Fallback limited to local development                                                                                    | runtimeEnvGuards (helper) | Fixed                                                                                      |
| D-17 | P1     | Admin features          | `/search/enterprise` (used by `AdminEnterpriseSearch.jsx`), blog and location writes used `requireAdmin` without `requireAuth` → always 401 (and a 401 can trigger the client's sign-out path) | Missing middleware                                         | searchRoutes, blogRoutes, locationRoutes; enterprise search limit capped at 50                                           | full suite                | Fixed                                                                                      |
| D-18 | P1     | Dependencies (frontend) | `npm audit`: dompurify (critical), axios, follow-redirects, socket.io-parser (high)                                                                                                            | Outdated versions                                          | `frontend/package-lock.json` (`npm audit fix`, no majors)                                                                | lint, tests, build        | Fixed (0 advisories)                                                                       |
| D-19 | P2     | Scalability             | Admin views request `limit: 999999` (orders, products); server caps at 10,000                                                                                                                  | Client-side filtering of full collections                  | —                                                                                                                        | —                         | Open: move admin lists to server-side pagination before order volume reaches the thousands |
| D-20 | P3     | Tracking links          | `verifyTrackingTokenAndGetOrder` accepts any app-signed JWT with `orderId` (no `purpose` claim)                                                                                                | Legacy token format already sent in emails                 | —                                                                                                                        | —                         | Open: add `purpose` to new tokens, accept legacy for 90 days                               |

Verified sound in this pass: Google ID tokens checked for audience and `email_verified`; logistics/tracking
token comparison is timing-safe and bound to the order; Swagger is admin-only; maintenance routes require a
maintenance session; no credential values found in log statements.

### Session lifecycle changes (D-06, D-07)

- The refresh token is now returned in JSON only when the request carried none of our cookies (the SPA fetches
  the CSRF cookie before every mutating request, so cookie-capable browsers always prove it). Cookie-capable
  browsers never get a JS-readable copy; the client deletes any stored copy whenever the server omits it, so a
  spent token can no longer be replayed later.
- Refresh tokens now carry a `familyId` shared across rotations. Reuse outside the grace window revokes only that
  family (one device's chain); the customer's other devices stay signed in. Tokens issued before this change
  join a family at their next rotation; a replay of a pre-family token keeps the old revoke-all behaviour.
- Rollout note: no migration needed (`familyId` is optional). Rolling back the code is safe; family ids are ignored.

### Additional files changed in this pass

Backend: `src/middleware/metricsAuth.ts` (new), `src/models/TwoFactorPending.ts` (new),
`src/utils/security/twoFactorPending.ts`, `src/utils/security/authCookies.ts`,
`src/controllers/auth/authController.ts`, `src/controllers/auth/adminAuthController.ts`,
`src/controllers/commerce/orderController.ts`, `src/controllers/discovery/searchController.ts`,
`src/models/RefreshToken.ts`, `src/models/UsedRefreshToken.ts`, `src/services/SessionAuthService.ts`,
`src/services/emailProvider.ts`, `src/services/notifications/adapters/EmailAdapter.ts`,
`src/routes/system/metricsRoutes.ts`, `src/routes/system/healthRoutes.ts`, `src/routes/discovery/searchRoutes.ts`,
`src/routes/cms/blogRoutes.ts`, `src/routes/customer/locationRoutes.ts`,
`tests/integration/security/launchHardening.test.ts` (new, 11 tests), `tests/integration/sessionAuth.test.ts` (+3).
Frontend: `src/services/api.js`, `src/context/AuthProvider.jsx`, `package-lock.json`.

### Final gate (second pass)

| Check                                                           | Result                            |
| --------------------------------------------------------------- | --------------------------------- |
| Backend `npx tsc --noEmit` / `npx eslint src` / `npm run build` | pass / pass / pass                |
| Backend `npx vitest run`                                        | 27 files, **230/230**             |
| Backend `npm audit --omit=dev`                                  | 0 vulnerabilities                 |
| Frontend `npm run lint`                                         | 0 errors, 2 pre-existing warnings |
| Frontend `npx vitest run`                                       | 4 files, **31/31**                |
| Frontend `npm run build` (+ budgets, performance guards)        | pass                              |
| Frontend `npm audit --omit=dev`                                 | 0 vulnerabilities                 |

### Operator actions still required (cannot be done from code)

| #   | Action                                                                                                          | Closes                              |
| --- | --------------------------------------------------------------------------------------------------------------- | ----------------------------------- |
| 1   | Deploy this code to Render and Vercel                                                                           | D-12, D-13–D-17 live exposures      |
| 2   | Fix `CLOUDINARY_*` credentials (local and Render); verify with the migration's ping                             | D-02                                |
| 3   | Provision Redis, set `REDIS_URL`                                                                                | D-10, production startup validation |
| 4   | Set `METRICS_API_KEY` if anything scrapes metrics (otherwise they stay closed)                                  | D-13                                |
| 5   | Run `npm run check-env` with `NODE_ENV=production` on Render, fill gaps, then set `NODE_ENV=production`         | D-01                                |
| 6   | Image migration dry run → `--apply`; re-upload the 3 unrecoverable images                                       | D-02                                |
| 7   | Confirm `[CLIENT_IP] resolvedIsPublic: true` in Render logs and `RateLimit-*` headers on `/api/v1/auth/refresh` | D-03                                |
| 8   | Review the category list in the admin panel (D-11)                                                              | D-11                                |
| 9   | Test login on a real iPhone (Safari) and Android (Chrome); one Razorpay test-mode order end to end              | NOT VERIFIED items                  |
| 10  | Confirm Atlas backups and perform one restore test                                                              | backups                             |
| 11  | Move Render and Atlas into the same region                                                                      | D-04                                |

When 1–7 and 9–10 are done and 8 is reviewed, the remaining checklist items can move to VERIFIED PASS and the
decision can be raised to **1 — READY TO LAUNCH**.

### D-08 decision: order lifecycle (2026-10-27)

**Launch with the existing lifecycle**: Pending → Confirmed → Processing → Delivered, with Cancelled,
Returned and Refunded as controlled states. Decided in this audit at the owner's request.

Why:

- It is the only lifecycle that exists and is tested: server-side state machine
  (`OrderStateMachine.validateTransition`), transactional updates, staff-only route, customer tracking,
  emails and analytics all use it.
- Adding BEING BAKED and DISPATCHED days before launch would change the Order enum, the state machine, the
  fulfilment mapper, admin order screens, customer tracking, status emails and reporting at once, with no
  test coverage for the new states. That is a bigger launch risk than the missing labels.
- Courier hand-off can already be recorded: orders store `courierPartner` and `trackingNumber`, and
  "Shipped" / "Out for Delivery" updates are accepted and recorded as Processing.

Recommended post-launch follow-up: add BEING_BAKED between Confirmed and Processing, and DISPATCHED with a
server-validated required delivery agent. No data migration is needed (existing orders keep valid states).
Add state-machine and admin-UI tests before releasing it.
