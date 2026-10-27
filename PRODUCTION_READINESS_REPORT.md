# Akula's Kitchen — Production Readiness Report

Date: 2026-10-27.

- **Live:** commit `c3ef351f`, deployed via CI on push to `main`.
- **This pass:** uncommitted working-tree changes on top of it.
- **History:** earlier audit passes are in `docs/LAUNCH_READINESS_AUDIT_2026-10-27.md`.

Companion documents:

- `PRODUCTION_LAUNCH_CHECKLIST.md` — gates, commands, owners, status
- `PRODUCTION_SCORECARD.md` — code and live scores
- `PRODUCTION_COST_AND_OPERATIONS_REPORT.md` — hosting, costs, operations

## 1. Launch decision

**NOT READY TO LAUNCH.**

The code is in good shape. The live system still has P0 failures that only the owner can resolve:

1. **Production mode is not enabled.** The live cookie is `akula_csrf; HttpOnly; SameSite=Lax`, with no
   `Secure` and no `__Secure-` prefix. _Code fix ready on branch `release/cookie-hardening` (§9); setting
   `NODE_ENV=production` is still recommended for the remaining production-only behaviour._
2. **Product images are not durable.** Cloudinary credentials are rejected, 14/14 product references are
   local paths, and `9607c278…` still returns 404 live.
3. **Database backups and restore are unverified.**
4. ~~The live code can still oversell stock.~~ **Resolved in production:** deployed in V2 (`38614ea`);
   see §9.
5. **The admin 2FA bypass fix is deployed but unverified live.** An automated probe of the production
   admin endpoint was not permitted in this session. The checklist (E4) has the exact one-line check.
6. **No sandbox payment, real-device login or production-like load test has been run.**

When the P0 rows of the checklist pass, this becomes **READY AFTER EXPLICIT ACTIONS**. It becomes
**READY TO LAUNCH** once the P1 rows pass or are explicitly deferred.

## 2. What was verified on the live site this pass (2026-10-27)

| Check                            | Result            | Evidence                                                      |
| -------------------------------- | ----------------- | ------------------------------------------------------------- |
| Stack traces hidden              | PASS              | `POST /api/v1/auth/refresh` error body has no `stack`         |
| Rate limiting active             | PASS              | `RateLimit-Limit: 10`, `RateLimit-Policy: 10;w=900`           |
| Metrics private                  | PASS              | `business-metrics` and `health/metrics` → 404                 |
| WhatsApp webhook deployed        | PASS (route only) | wrong verify token → 403                                      |
| Startup script inlined           | PASS              | live HTML no longer references `sw-cleanup.js`                |
| Layout shift                     | PASS              | CLS 0 on home and shop (earlier today 0.541 / 0.564)          |
| Duplicate startup requests       | PASS              | 0 on home (earlier 3)                                         |
| Back button                      | PASS              | product → shop in 180 ms, first press (earlier: did not work) |
| Production mode / secure cookies | **FAIL**          | cookie without `Secure`                                       |
| Product images                   | **FAIL**          | 404 for `9607c278…`                                           |
| Redis                            | **FAIL**          | `/api/readiness` → `redis: not_configured`                    |
| Database latency                 | **FAIL**          | Render → Atlas ping 213 ms                                    |
| Admin 2FA bypass closed          | NOT VERIFIED      | probe not permitted; checklist E4                             |

## 3. Defects found and fixed in this pass

| ID   | Severity        | Defect                                                                                                                                                                                                                                                                                                                       | Evidence                                                             | Fix                                                                                                                                                                           | Regression test                                                                                                                                                                                                         |
| ---- | --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D-21 | **P0**          | **Overselling.** `InventoryService.reserveInventory` incremented `reservedStock` with no availability condition. Checkout never re-checked stock (the only check was in the client-skippable "validate totals" call). A single order for more units than exist succeeded; stock went negative and was silently clamped to 0. | Code review; all 14 live products have stock 49–50 (read-only query) | Availability check and reservation are now **one atomic `findOneAndUpdate`** with `$expr: stock − reservedStock ≥ qty`; clear 409 when stock is short; integer quantity guard | `tests/integration/inventoryConcurrency.test.ts` (5): 20 concurrent buyers / 5 units → exactly 5; over-sized order rejected; existing reservations counted; transactional path holds the invariant through confirmation |
| D-22 | P1              | Concurrent checkouts on the same product: MongoDB aborts one transaction with a transient write conflict, which surfaced as a 500                                                                                                                                                                                            | Reasoning + concurrency test                                         | Mapped to a clear, retryable **409** (no automatic retry, so duplicate-order protection is untouched)                                                                         | Covered by the concurrency test (rejections are 409 or a transient abort, never an oversell)                                                                                                                            |
| D-23 | **P0 (latent)** | **MongoDB driver configured for `zstd`/`snappy` compression, but neither package is installed.** Any server that negotiates zstd fails _every_ query (`MongoMissingDependencyError`). Atlas currently doesn't negotiate it, which hid the defect; a stock MongoDB 8 staging server did.                                      | Reproduced: isolated staging backend could not run a single query    | `MONGO_COMPRESSORS = ['zlib']` (built into Node; verified read-only against the live Atlas cluster)                                                                           | `tests/unit/mongoCompressors.test.ts`                                                                                                                                                                                   |
| D-24 | P1              | Readiness reported "ready" even when a required Redis was down, so multi-instance deployments could start without shared rate limits or queues                                                                                                                                                                               | Live `/api/readiness`                                                | Readiness fails (503) when `REQUIRE_REDIS=true` and Redis is not connected; response includes `redisRequired`                                                                 | `tests/integration/readiness.test.ts` (2)                                                                                                                                                                               |
| D-25 | P2              | CI dependency audit only failed on **critical**, so the 4 high advisories fixed earlier would have passed CI                                                                                                                                                                                                                 | `.github/workflows/ci.yml`                                           | `npm audit --omit=dev --audit-level=high` for backend and frontend                                                                                                            | CI                                                                                                                                                                                                                      |

## 4. Isolated staging and load test (new capability)

There is no hosted staging environment, so this pass built an isolated, repeatable equivalent:

- `backend/ops/testing/staging-db.cjs` starts an in-memory MongoDB 8 replica set and **reads** the live
  catalog into it: products, categories, settings, CMS sections, catalog values, policies, serviceability.
  No users, orders, addresses, sessions, payments or logs are copied, and nothing is written to the live
  database.
- `.claude/launch.json` → `staging-backend` runs the compiled backend against it. All external
  credentials (email, Redis, Cloudinary, Razorpay, Sentry, alert webhook, GitHub backup, WhatsApp) are
  blank or dummy; background jobs and workers are disabled.
- `backend/ops/testing/loadtest.cjs` is a stepped closed-loop load test. It refuses any non-local target.

**Result (2026-10-27, this Windows PC, one Node process, local DB ≈ 8 ms, 20 s per stage)**

Traffic mix: 40% product list, 25% product detail, 15% categories, 10% settings, 10% CMS.

| Virtual users | Req/s | p50    | p95    | p99    | Errors | Non-2xx |
| ------------- | ----- | ------ | ------ | ------ | ------ | ------- |
| 5             | 369   | 12 ms  | 24 ms  | 49 ms  | 0      | 0       |
| 10            | 401   | 24 ms  | 45 ms  | 66 ms  | 0      | 0       |
| 25            | 495   | 47 ms  | 74 ms  | 103 ms | 0      | 0       |
| 50            | 518   | 91 ms  | 124 ms | 234 ms | 0      | 0       |
| 100           | 524   | 176 ms | 240 ms | 733 ms | 0      | 0       |

About 46,000 requests (sum of req/s × 20 s per stage), zero errors. Per-process throughput saturates around **520 req/s**; beyond ~50
concurrent users the extra load becomes latency.

**What this does and doesn't show:**

- It shows the code has no errors or crashes under sustained concurrent catalog load, and it bounds
  per-process CPU throughput on a desktop machine.
- It does **not** measure production. Production pays ~213 ms per database round trip, runs on an
  unverified Render instance size, and has no Redis. See the capacity section of the cost report.

## 5. Things deliberately not changed (with reasons)

| Item                                                        | Why not now                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Admin server-side pagination                                | Measured volume is tiny: 1 order, 14 products, 2 reviews, 179 audit logs (~69 KB) (read-only count). The admin is built around one shared context holding full arrays used by dashboard, kanban, tables, search and drawers. Rewriting it days before launch without an admin login to verify visually is riskier than the issue. **Trigger:** schedule it before orders pass ~2,000 or the admin dashboard's initial payload passes ~1 MB. |
| Order lifecycle (BEING BAKED / DISPATCHED / delivery agent) | Product decision D-08: keep the tested lifecycle for launch; follow-up plan recorded.                                                                                                                                                                                                                                                                                                                                                       |
| Consolidating the three frontend data layers                | Large refactor; the measured duplicate-request problem was fixed with in-flight sharing instead.                                                                                                                                                                                                                                                                                                                                            |
| Automatic retry of conflicted checkout transactions         | Could interact with idempotency locks; a clear 409 is safer.                                                                                                                                                                                                                                                                                                                                                                                |

## 6. Verification gate (this pass)

Run after all changes in this pass:

| Check                            | Command                                                 | Result                                                                               |
| -------------------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Backend typecheck / lint / build | `npx tsc --noEmit` · `npx eslint src` · `npm run build` | pass / pass / pass                                                                   |
| Backend tests                    | `npx vitest run`                                        | **31 files, 248/248 pass** (240 before + 5 concurrency + 2 readiness + 1 compressor) |
| Backend audit                    | `npm audit --omit=dev --audit-level=high`               | 0 vulnerabilities                                                                    |
| Frontend lint                    | `npm run lint`                                          | 0 errors, 2 pre-existing warnings                                                    |
| Frontend tests                   | `npx vitest run`                                        | 4 files, **31/31 pass**                                                              |
| Frontend build                   | `npm run build` (+ budgets, performance guards)         | pass                                                                                 |
| Frontend audit                   | `npm audit --omit=dev --audit-level=high`               | 0 vulnerabilities                                                                    |
| Isolated staging load test       | `ops/testing/loadtest.cjs`                              | ≈46k requests, 0 errors (§4)                                                         |
| Concurrency stability            | `inventoryConcurrency.test.ts` run 3×                   | 3/3 pass                                                                             |

Not run (blocked, see checklist): production-like load test, Razorpay sandbox, real devices, WhatsApp end to
end, restore drill.

No commits, pushes or deployments were made in this pass.

## 7. Remaining blockers and owner actions (summary)

See `PRODUCTION_LAUNCH_CHECKLIST.md` for exact commands.

1. **Deploy this pass** (oversell fix, compressor fix, readiness, CI audit).
2. **B1** `NODE_ENV=production`, after running `npm run check-env`.
3. **B2–B4** Cloudinary credentials → migration dry run → apply → re-upload 3 images.
4. **B6–B7** Confirm Atlas backups and run a restore drill into a separate cluster.
5. **E4** Run the one-line admin 2FA probe.
6. **B5** Redis; then `REQUIRE_REDIS=true`.
7. **B9** Recreate the API in Render Singapore.
8. **E9/E10** Real-device logins; Razorpay test-mode order on a non-production database.
9. **B10–B12** WhatsApp, monitoring alerts, email delivery check.

## 8. What Akula's Kitchen can realistically handle

- **Measured:** about 520 catalog req/s per process with 0 errors on a desktop machine against a local
  database. This is not a production figure.
- **Production estimate [ESTIMATE]:** the 213 ms database round trip and the unverified instance size
  dominate. Plan for **≤ 100 concurrent active shoppers and ≤ 5 simultaneous checkouts** until a
  production-like staging test (same region, same instance, real Atlas tier) says otherwise.
- **Not claimed:** any figure for 500 or 1,000 simultaneous shoppers.

## 9. Next phase — V2 live verification and cookie hardening (2026-10-27, evening)

**V2 (`38614ea`) is deployed.** Evidence: `/api/readiness` now includes the new `redisRequired` field, and
the server uptime had reset to 209 s at the time of checking. Live as a result:

- The atomic stock check (oversell fix, D-21).
- The 409 for conflicting checkouts (D-22).
- The `zlib` MongoDB compressor (D-23); the database stays connected at a 197 ms ping.
- Readiness that honours `REQUIRE_REDIS` (D-24). It is currently `false` in production, so the site
  reports ready.

**New fix on branch `release/cookie-hardening` (not deployed until merged into `main`):**

| ID   | Severity | Defect                                                                                                                                                                         | Fix                                                                                                                                                                  | Regression test                                                          |
| ---- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| D-26 | P1       | Live auth and CSRF cookies lack `Secure` and the `__Secure-` prefix because `NODE_ENV` is not `production` on Render                                                           | Any hosted deployment gets production cookie hardening (`Secure`, `__Secure-`, `SameSite=None`), as already done for error masking                                   | `tests/integration/cookieHardening.test.ts`                              |
| D-27 | P1       | Renaming cookies would have left a pre-deploy session alive after logout: logout revoked only the token under the current cookie name, while refresh also accepts the old name | Logout, logout-all and admin logout revoke **every** refresh token the browser holds (both naming styles, plus a body token) and clear all four refresh cookie names | Same file: a session under the old name cannot be refreshed after logout |

Gate on the branch: backend **252/252** (32 files), typecheck, lint and build pass; frontend 31/31.

**Expected behaviour after merging:** nobody is logged out. The first refresh reads the old cookie and
issues the new `__Secure-` one. Verify with checklist B1/E6:

```
curl -sI https://www.akulas.kitchen/api/v1/csrf-token
```

It must show `__Secure-akula_csrf` and `Secure`.

## 10. Product image migration to Cloudinary (2026-10-27, 23:12 IST)

The owner corrected `CLOUDINARY_API_SECRET` in `backend/.env.local`; the Cloudinary ping returned `200 ok`.

| Step                                                                        | Result                                                                                                                                                      |
| --------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Dry run                                                                     | 14 products with local paths: 11 recoverable, 3 files lost                                                                                                  |
| `--apply`                                                                   | **11 files uploaded, 11 product fields updated, 0 errors.** Old → new mapping saved in `backend/ops/recovery/image-migration-2026-10-27.log` (for rollback) |
| Direct check of each Cloudinary URL                                         | 11/11 HTTP 200; every file is byte-identical in size to its original                                                                                        |
| Database (read-only count)                                                  | 11 Cloudinary, 3 local                                                                                                                                      |
| Live API `GET /api/v1/products?page=1&limit=50&sort=newest`                 | 14 products: 11 Cloudinary, 3 local                                                                                                                         |
| **Live storefront** (Chromium, 375 px, `/collections`, scrolled to the end) | **11 unique Cloudinary images rendered, 11 requests, 0 failed, 0 broken**                                                                                   |

**Still to do**

- **Re-upload photos** in Admin → Products for the 3 products whose files were permanently lost:
  - **Coconut Chutney** (`6ad92300fbb82e5f798e5d80`)
  - **Ginger Chutney** (`6ad923a3fbb82e5f798e5da5`)
  - **Tomato Chutney** (`6ad92523fbb82e5f798e5df6`)
- **Put the same corrected secret on Render** (backend service → Environment). Admin uploads on the live site use Render's copy, not `.env.local`.
- **Responsive delivery is not yet active.** The storefront requests the original files (about 180–290 KB each, no Cloudinary width/format transformation in the URL). A follow-up should make product cards request a width-limited `f_auto,q_auto` variant.
- **Returning visitors may briefly see an old image** from the saved catalog cache in their browser (`akula_query_cache_v4`) before fresh data replaces it on the same visit.

## 11. Responsive product images (branch `release/cookie-hardening`)

**Cause:** `ProductCard` passed `quality="original"` to `CloudinaryImage`. That made `getOptimizedUrl`
strip every transformation and made every `srcset` candidate the same raw file. Separately, `getSrcSet`
labelled each candidate with the requested width rather than the width actually served (for example, a
"320w" entry pointed to a 400 px file) and listed some URLs twice.

**Fix:** product cards use the default delivery: width-limited (`c_limit`), `f_auto`, `q_auto:good`,
metadata stripped, immutable caching. `srcset` labels now match the served width and contain no duplicates.
Product images that are not on Cloudinary are unaffected.

**Measured on the live catalog** (production build served against the live API, Chromium, 375 px phone
viewport at 2× density, whole `/collections` page scrolled, encoded bytes of all Cloudinary images):

|                 | Live today                    | With this change                                      |
| --------------- | ----------------------------- | ----------------------------------------------------- |
| Images rendered | 11                            | 11                                                    |
| Broken images   | 0                             | 0                                                     |
| Image bytes     | **2,498 KB** (original files) | **349 KB** (`w_400`, WebP or JPEG chosen by `f_auto`) |
| Saving          | —                             | **86%**                                               |

A direct CDN check of all 11 photos at 640 px (what a 3× phone selects) gives 782 KB, 69% less than the
originals.

**Tests:** `frontend/src/utils/__tests__/imageUtils.test.js` (4). Frontend 35/35, lint 0 errors, build and
bundle budgets pass.
