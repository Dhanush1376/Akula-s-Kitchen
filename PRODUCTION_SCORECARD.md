# Akula's Kitchen — Production Scorecard (2026-10-27)

Two separate scorecards, as required:

- **A — Code quality:** the repository as it stands after this pass, from tests, builds and code review.
- **B — Live production quality:** what `www.akulas.kitchen` actually does today, from requests sent to it
  on 2026-10-27. The live site runs commit `c3ef351f`. This pass's fixes (oversell, MongoDB
  compressor, readiness, CI audit) are **not deployed**.

Rules applied:

- A code review or a passing test suite cannot earn a high live score.
- Anything not observed on the live site is **NOT VERIFIED**. NOT VERIFIED is not a pass and not a number.
- Scores are not raised because builds pass.

Evidence source codes: **T** = automated test, **S** = isolated local staging, **L** = live production
request, **R** = code review, **D** = read-only database query.

## The honest headline

**The goal of 10/10, or even > 8/10, across live categories is not met and cannot be met from code alone.**
Thirteen of the 32 live categories cannot be verified without your actions: deploy, Render/Atlas/Cloudinary/Meta
configuration, real phones, a staging database with Razorpay test keys, and a backup restore. Of the
categories that _can_ be observed live, several are failing: images, deployment config, Redis/scalability,
database latency. Code quality is meaningfully higher than live quality.

|                | Scorecard A (code) | Scorecard B (live)                        |
| -------------- | ------------------ | ----------------------------------------- |
| Categories ≥ 8 | 5 of 32            | 2 of 32 (navigation, dependency security) |
| NOT VERIFIED   | —                  | 13 of 32                                  |
| Overall        | **6.5 / 10**       | **4 / 10**                                |

---

## Scorecard A — Code quality

| #   | Category                        | Score   | Conf. | Evidence                                                                                                                          | To reach 9+                                 |
| --- | ------------------------------- | ------- | ----- | --------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| 1   | Frontend architecture           | 6       | M     | R: three overlapping data layers (custom GET cache, React Query, context fetches); duplicate fetches fixed with in-flight sharing | Consolidate on React Query; route loaders   |
| 2   | Visual design consistency       | 7       | L     | R: shared tokens; drawers unified                                                                                                 | Visual regression snapshots                 |
| 3   | UX                              | 7       | M     | T/S: Back-button and drawer-history defects fixed                                                                                 | Usability test on phones                    |
| 4   | Initial loading                 | 6       | M     | Lab: CLS 0.54 → 0; startup stall removed. Images still full-size until the Cloudinary migration                                   | Responsive images live; LCP measured        |
| 5   | Navigation                      | 8       | H     | Lab: 59–123 ms client navigation, cached revisits                                                                                 | Field INP                                   |
| 6   | Catalog reliability             | 7       | M     | S: catalog served under load with 0 errors; CMS→product two-step waterfall remains                                                | Single home-page payload                    |
| 7   | Image delivery (code)           | 7       | H     | T: no fake success, no ephemeral disk in production; migration tool                                                               | Migration executed (live)                   |
| 8   | Authentication reliability      | 6       | M     | T: token families, session pruning, real-IP buckets; cross-region login cost remains                                              | Device tests; region move                   |
| 9   | Authentication security         | 8       | H     | T: 2FA fail-closed, OTP not logged, hosted guards, refresh token kept out of JS                                                   | External pen test                           |
| 10  | Authorization                   | 8       | H     | T: IDOR tests for orders, timeline, public-track; route-guard scan                                                                | Per-route authz test matrix                 |
| 11  | Database integrity              | 7       | M     | T: transactions, unique keys, **atomic stock check (new)**; mixed-case enums remain                                               | Enum normalisation migration                |
| 12  | Database performance (code)     | 5       | M     | R: ~11 sequential queries on login, ~15 at checkout; admin loads whole collections                                                | Fewer round trips; admin pagination         |
| 13  | Cart correctness                | 6       | L     | R/T: server-priced totals                                                                                                         | Cart E2E tests                              |
| 14  | Checkout reliability            | 7       | M     | T: idempotency, outbox, write conflicts now a clean 409 (new)                                                                     | HTTP-level checkout load test               |
| 15  | Payment integrity               | 7       | M     | T: HMAC signatures, webhook idempotency, adversarial payment tests                                                                | Sandbox E2E                                 |
| 16  | Order lifecycle                 | 7       | M     | T/R: transactional state machine; lifecycle decision recorded (D-08)                                                              | Dispatch-agent follow-up with tests         |
| 17  | Inventory concurrency           | **8**   | H     | T: 20 buyers / 5 units → exactly 5; transactional path holds the invariant; was oversellable before this pass                     | HTTP-level concurrent checkout test         |
| 18  | Customer profiles               | 6       | L     | R only                                                                                                                            | E2E coverage                                |
| 19  | Admin dashboard                 | 5       | M     | R: full-collection loads (fine at today's 1 order / 14 products / 179 audit logs, D)                                              | Server-side pagination                      |
| 20  | Mobile compatibility            | 7       | M     | Chromium 375 px checks; drawers unified                                                                                           | Real-device pass                            |
| 21  | Accessibility                   | 5       | L     | R: skip link, aria labels; no audit                                                                                               | axe audit + keyboard pass                   |
| 22  | API reliability                 | 7       | M     | S: 0 errors in ≈46k requests; readiness reflects dependencies (new)                                                               | Contract tests                              |
| 23  | Backend architecture            | 7       | M     | R: modular monolith + outbox; 42 dead modules removed; latent driver-compressor defect fixed                                      | Fewer duplicate mechanisms                  |
| 24  | Scalability                     | 6       | M     | S: ≈520 req/s per process, 0 errors to 100 VUs. Shared state still needs Redis for >1 instance                                    | Multi-instance test with Redis              |
| 25  | External integrations           | 6       | M     | T: WhatsApp idempotent, bounded, fail-safe; Cloudinary fails loudly                                                               | Live end-to-end checks                      |
| 26  | Monitoring                      | 5       | L     | R: Sentry hooks, structured logs, one-time diagnostics                                                                            | Alert rules defined in code/docs and tested |
| 27  | Backup & recovery (code)        | 5       | L     | R: backup services exist; nothing verifies restores                                                                               | Scheduled restore check                     |
| 28  | Deployment configuration (code) | 7       | M     | T: hosted guards, fail-closed startup, CI audit at `high` (new)                                                                   | Infra-as-code for Render                    |
| 29  | Automated testing               | 7       | H     | T: backend suite (see report §6) incl. concurrency; frontend 31; no browser E2E                                                   | Playwright E2E in CI                        |
| 30  | Maintainability                 | 6       | M     | R: dead code removed; overlapping caches remain                                                                                   | Consolidation                               |
| 31  | Dependency security             | 9       | H     | 0 advisories; CI now fails on high                                                                                                | Automated update bot                        |
| 32  | **Overall (code)**              | **6.5** | M     |                                                                                                                                   |                                             |

## Scorecard B — Live production quality

| #   | Category                   | Score        | Conf. | Live evidence (2026-10-27)                                                                                                                                  | What is required               |
| --- | -------------------------- | ------------ | ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------ |
| 1   | Frontend architecture      | 6            | M     | L: same as code (deployed)                                                                                                                                  | —                              |
| 2   | Visual design consistency  | NOT VERIFIED | —     | No visual pass on live pages                                                                                                                                | Owner review                   |
| 3   | UX                         | 7            | M     | L (Chromium, 375 px): Back from product → shop works first time (180 ms; earlier today it did not work at all)                                              | E12 on real phones             |
| 4   | Initial loading            | 6            | M     | L: CLS **0** on home and shop (earlier today 0.541 / 0.564); 0 duplicate API calls on home; images still ~980 KB full-size; LCP not measurable in this tool | Migrate images (B3); field LCP |
| 5   | Navigation                 | 8            | H     | L: shop → product 62 ms, Back 180 ms, client-side only                                                                                                      | Field INP data                 |
| 6   | Catalog reliability        | 6            | M     | L: 28 product cards render; 3 images 404                                                                                                                    | B3/B4                          |
| 7   | Image delivery             | **2**        | H     | L: `9607c278…` still 404; 14/14 references local (D)                                                                                                        | B2–B4                          |
| 8   | Authentication reliability | NOT VERIFIED | —     | No real logins performed                                                                                                                                    | E9                             |
| 9   | Authentication security    | 5            | M     | L: rate limits ON, stack traces OFF, metrics closed; cookies not `Secure`; 2FA fix live-unverified                                                          | B1, E4                         |
| 10  | Authorization              | NOT VERIFIED | —     | Needs two customer accounts                                                                                                                                 | E8                             |
| 11  | Database integrity         | 5            | M     | D: consistent data; **oversell fix not deployed**                                                                                                           | Deploy this pass               |
| 12  | Database performance       | **3**        | H     | L: 213 ms Render→Atlas ping; catalog p50 0.72 s                                                                                                             | B9                             |
| 13  | Cart correctness           | NOT VERIFIED | —     |                                                                                                                                                             | E2E on live                    |
| 14  | Checkout reliability       | NOT VERIFIED | —     |                                                                                                                                                             | E10                            |
| 15  | Payment integrity          | NOT VERIFIED | —     | No sandbox transaction                                                                                                                                      | E10                            |
| 16  | Order lifecycle            | NOT VERIFIED | —     | 1 order in the database                                                                                                                                     | Test order through statuses    |
| 17  | Inventory concurrency      | **3**        | H     | Live code can oversell (fix not deployed)                                                                                                                   | Deploy                         |
| 18  | Customer profiles          | NOT VERIFIED | —     |                                                                                                                                                             | E9                             |
| 19  | Admin dashboard            | NOT VERIFIED | —     | No admin login performed                                                                                                                                    | Owner check                    |
| 20  | Mobile compatibility       | NOT VERIFIED | —     | No device                                                                                                                                                   | E9/E12                         |
| 21  | Accessibility              | NOT VERIFIED | —     |                                                                                                                                                             | Audit                          |
| 22  | API reliability            | 6            | M     | L: health/readiness OK; 10/10 catalog requests OK                                                                                                           | Monitoring data                |
| 23  | Backend architecture       | 6            | M     | L: single instance, no Redis                                                                                                                                | B5                             |
| 24  | Scalability                | **2**        | H     | L: `redis: not_configured`; single instance; no production-like load test                                                                                   | B5, F1                         |
| 25  | External integrations      | **2**        | H     | L: Cloudinary broken; WhatsApp unconfigured; email unverified                                                                                               | B2, B10, B12                   |
| 26  | Monitoring                 | NOT VERIFIED | —     | No access to Sentry/uptime                                                                                                                                  | B11                            |
| 27  | Backup & recovery          | NOT VERIFIED | —     | No access to Atlas; restore never performed                                                                                                                 | B6, B7                         |
| 28  | Deployment configuration   | **3**        | H     | L: `NODE_ENV` ≠ production (cookie evidence); cross-region                                                                                                  | B1, B9                         |
| 29  | Automated testing          | 7            | H     | CI runs the suite on every push to `main`                                                                                                                   | —                              |
| 30  | Maintainability            | 6            | M     | same as code                                                                                                                                                | —                              |
| 31  | Dependency security        | 8            | H     | `c3ef351f` had 0 advisories at audit time                                                                                                                   | —                              |
| 32  | **Overall (live)**         | **4**        | M     |                                                                                                                                                             | Checklist P0 rows              |

## Why "10/10 in all aspects" is not a target I can honestly report

A 10 needs comprehensive verification against explicit criteria in the live system: field Web Vitals at
p75, restore drills, production-like load tests, device matrices and sandbox payments. Most of those need
your accounts, devices or time with real users. Inflating these scores would make the document useless
exactly when you need it. The realistic path to **≥ 8 on every live category** is the P0/P1 rows of
`PRODUCTION_LAUNCH_CHECKLIST.md`, followed by a re-score.
