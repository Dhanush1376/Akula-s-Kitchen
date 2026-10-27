# Akula's Kitchen — Production Cost & Operations Report

Generated 2026-10-27 from the production-readiness audit. Every figure is labelled:

- **[VERIFIED]** — measured in this audit or read from an official provider page on 2026-10-27.
- **[ESTIMATE]** — derived from verified inputs; the assumptions are stated.
- **[UNKNOWN]** — needs the provider dashboard or an account; no number is invented.

Currency: **₹88 = US$1** is an **assumption** for conversion. Check the rate on the day you pay.
Most foreign SaaS invoices to Indian businesses attract **18% GST** (reverse charge or IGST). Totals
below show the pre-GST figure and a "+18%" figure.

---

## A. Executive summary

**Current architecture [VERIFIED by probing]**

| Layer                              | Provider                                                                                      | Evidence                                        |
| ---------------------------------- | --------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| Storefront (React SPA)             | Vercel (`www.akulas.kitchen`, edge `bom1` Mumbai)                                             | `X-Vercel-Id: bom1::…` response headers         |
| API (Node/Express, single process) | Render web service (`akula-s-kitchen-23m5.onrender.com`), Cloudflare in front                 | `x-render-origin-server: Render` header         |
| Database                           | MongoDB Atlas, **AWS `ap-south-1` (Mumbai)**, 3-node replica set, MongoDB 8.0.34, 2.7 MB data | Atlas `hello` replica tags                      |
| Images                             | Cloudinary (intended); in practice local disk + git-committed files                           | Audit D-02                                      |
| Email                              | Brevo / SMTP (configured in code)                                                             | Code; delivery not verifiable without dashboard |
| OTP SMS                            | Fast2SMS                                                                                      | Code                                            |
| Payments                           | Razorpay                                                                                      | Code                                            |
| Cache / queues                     | **No Redis in production** (`/api/readiness` → `redis: not_configured`)                       | Live endpoint                                   |

**The single most important hosting finding:** the database is in **Mumbai**, but a database ping
from the Render backend takes **206 ms** [VERIFIED, `/api/readiness`]. From an ordinary PC in India the same
ping takes 33–104 ms [VERIFIED]. So the backend runs far from its data, most likely in Render's default US
region. Every request that makes several sequential queries (login ~11, checkout ~15+) pays that 206 ms each
time. That is the main reason login and checkout feel slow.

**Recommendation: optimise the current hosting first ("hybrid, same providers").**

1. Recreate the Render backend in **Singapore** (Render offers it [VERIFIED]; regions cannot be changed in
   place, so it is a new service [VERIFIED]) on the **Standard** instance (the app is configured for an
   800 MB memory ceiling, which a 512 MB Starter instance cannot hold).
2. Add a managed **Redis** (fixed price) and move Atlas off the free tier to a tier **with backups**.
3. Make sure Vercel is on **Pro**: the Hobby plan is "for personal, non-commercial use" [VERIFIED].

Do **not** move to a VPS for launch. It would give the lowest latency (AWS Lightsail Mumbai sits in the
same region as Atlas), but it adds OS patching, TLS, a process supervisor, a self-run Redis, firewalling and
backups. That operational load is a poor trade a few days before launch with no ops person. Revisit it at
the growth stage (section D).

**Lowest-cost viable launch:** about **₹4,660/month before GST** plus Redis (price not verified) and
usage-based fees. See section G.

**Main operational risks**

1. Production currently runs with `NODE_ENV ≠ production` (see the launch audit, D-01). This is a config fix,
   but startup will **exit** if production-required variables are missing.
2. No verified database backups. If the cluster is on the free M0 tier, **backups do not exist** (M0 has
   none [VERIFIED]).
3. 3 product images are lost and 11 more only survive because they were committed to git (audit D-02).
4. There is no staging environment, so nothing can be load-tested safely.

---

## B. Existing hosting costs

| Service                 | Plan in use                                                                                               | Recurring cost                                                               | Status                                                          |
| ----------------------- | --------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | --------------------------------------------------------------- |
| Vercel                  | Unknown                                                                                                   | $0 (Hobby) or $20/mo (Pro) [VERIFIED prices]                                 | **[UNKNOWN] plan**. Hobby is not allowed for a commercial shop. |
| Render API              | Unknown. Uptime of 431,979 s (5 days) without sleeping suggests a paid instance or an external keep-alive | Starter $7, Standard $25 per service/month (Render's own comparison article) | **[UNKNOWN] plan and region** (latency points to the US)        |
| MongoDB Atlas           | Unknown tier; 2.7 MB of data                                                                              | M0 free (no backups), Flex $8–30/mo, M10 from $56.94/mo [VERIFIED]           | **[UNKNOWN] tier**                                              |
| Cloudinary              | Unknown; **credentials currently rejected** (401)                                                         | Free: 25 credits/mo; Plus: $99/mo, or $89/mo billed yearly [VERIFIED]        | Fix credentials first                                           |
| Brevo                   | Unknown                                                                                                   | **[UNKNOWN]** (pricing page did not render)                                  | Check dashboard                                                 |
| Fast2SMS                | Unknown                                                                                                   | **[UNKNOWN]** per-SMS price                                                  | Check dashboard                                                 |
| Razorpay                | Unknown                                                                                                   | Per-transaction fee **[UNKNOWN]** for your account                           | Check dashboard                                                 |
| Domain `akulas.kitchen` | Registrar unknown                                                                                         | **[UNKNOWN]** renewal                                                        | Check registrar                                                 |
| Sentry / LogRocket      | SDKs present in code                                                                                      | Free tiers likely                                                            | **[UNKNOWN]**                                                   |

---

## C. Recommended hosting (launch)

| Component             | Recommendation                                                                                                          | Monthly (USD)    | Monthly (₹, pre-GST) |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------- | ---------------- | -------------------- |
| Frontend              | Vercel **Pro** (1 TB transfer, 10M CDN requests included [VERIFIED])                                                    | $20              | ₹1,760               |
| API                   | Render **Standard** (1 vCPU / 2 GB), **Singapore**                                                                      | $25              | ₹2,200               |
| Database              | Atlas **Flex** in Mumbai (5 GB, backups to confirm) — base tier                                                         | $8 (0–100 ops/s) | ₹704                 |
| Redis                 | Render Key Value (same region), smallest **persistent** plan                                                            | **[UNKNOWN]**    | **[UNKNOWN]**        |
| Images                | Cloudinary **Free** (25 credits: 1 credit = 1 GB storage **or** 1 GB bandwidth **or** 1,000 transformations [VERIFIED]) | $0               | ₹0                   |
| Email                 | Brevo (current plan)                                                                                                    | **[UNKNOWN]**    | —                    |
| WhatsApp admin alerts | Meta Cloud API, utility template                                                                                        | usage            | see E                |
| **Fixed subtotal**    |                                                                                                                         | **$53 + Redis**  | **₹4,664 + Redis**   |
| **With 18% GST**      |                                                                                                                         |                  | **≈ ₹5,504 + Redis** |

**Why this fits the actual workload:** the catalog is 14 products and the database is 2.7 MB. The real
bottleneck is latency (region), not compute or storage. Moving the API next to the database fixes the
measured problem. Standard is the smallest Render tier that fits the configured 800 MB process.

**Upgrade triggers**

- Atlas Flex → M10 ($56.94/mo [VERIFIED]): sustained > 100 ops/s (Flex base tier ceiling [VERIFIED pricing
  tiers]), need for dedicated performance, or point-in-time restore requirements.
- Cloudinary Free → Plus ($99/mo): monthly credits consistently over ~20 of 25.
- Render: add a second instance only **after** Redis is in place (rate limits, sockets and locks need shared
  state), and when p95 API latency or CPU stays high at peak.

**Operational responsibilities (managed stack):** env-var hygiene, dependency updates, monitoring alerts,
restore drills. No OS patching.

---

## D. Alternative hosting comparison

| Option                                                                                        | Monthly (₹, pre-GST)             | DB latency                                         | Ops effort | Notes                                                                                                         |
| --------------------------------------------------------------------------------------------- | -------------------------------- | -------------------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------- |
| **Current (as found)**                                                                        | Unknown; likely ₹0–2,800         | **206 ms** per query [VERIFIED]                    | Low        | Slow; Hobby plan legality and backups are open questions                                                      |
| **Recommended: Render Singapore + Atlas Flex + Vercel Pro**                                   | ≈ ₹4,664 + Redis                 | ~50–70 ms [ESTIMATE: typical Singapore↔Mumbai RTT] | Low        | No OS work; region move needs a new service                                                                   |
| **Render Singapore + Atlas M10**                                                              | ≈ ₹8,971 + Redis                 | ~50–70 ms [ESTIMATE]                               | Low        | Dedicated database; growth-stage choice                                                                       |
| **AWS Lightsail Mumbai VPS ($12: 2 GB / 2 vCPU / 3 TB [VERIFIED]) + Atlas Flex + Vercel Pro** | ≈ ₹3,520 (Redis self-hosted, ₹0) | ~1–3 ms [ESTIMATE: same AWS region]                | **High**   | You own OS patches, firewall, TLS, PM2/systemd, Redis, log rotation, intrusion monitoring, backups of the VPS |
| **Lightsail $24 (4 GB)**                                                                      | ≈ ₹4,576                         | ~1–3 ms                                            | High       | Headroom for more workers                                                                                     |

Kubernetes or microservices are **not** recommended: there is no measured need, and they would add cost
and failure modes.

**When a VPS becomes worth it:** when there is someone to own patching and on-call, and latency or cost
at the growth stage justify it. Render Singapore should already remove most of the latency gap.

---

## E. WhatsApp notification costs

**Provider/API:** Meta WhatsApp Business Platform, Cloud API (official). The code sends an approved
**utility template** to the admin number(s).

**Pricing model [VERIFIED, Meta developer docs]:** charged **per delivered template message** (since
1 July 2025). Utility templates are charged, including those inside an open service window from
1 October 2026. India customers must move to INR billing by 31 December 2026.

**India utility rate:** **[UNVERIFIED]**. Meta publishes it only in a downloadable rate card that could not
be fetched. Several Meta Business Solution Provider rate tables list **₹0.115 per message + 18% GST**; one
lists ₹0.138. Treat both as estimates until you see the rate card in WhatsApp Manager.

| Orders / month | Alerts (1 admin) | Est. cost @ ₹0.115 | + 18% GST | @ ₹0.138 + GST |
| -------------- | ---------------- | ------------------ | --------- | -------------- |
| 300            | 300              | ₹34.50             | ₹40.71    | ₹48.87         |
| 1,000          | 1,000            | ₹115               | ₹135.70   | ₹162.84        |
| 3,000          | 3,000            | ₹345               | ₹407.10   | ₹488.52        |

Double these figures for two admin numbers. No fixed platform or phone-number fee was found in Meta's
docs for direct Cloud API use **[ESTIMATE; confirm in WhatsApp Manager]**. A BSP would add its own markup.

**Comparison**

1. Email only: ₹0 extra (within the current Brevo plan), but alerts can sit unseen in an inbox.
2. WhatsApp only: not recommended, because there is no fallback if Meta or the template fails.
3. **Email + WhatsApp (recommended):** under ₹200/month at 1,000 orders. The code sends both
   independently; a WhatsApp outage never affects orders or email.

**Setup still required (cannot be done from code)**

1. Meta Business account and WhatsApp Business Account (WABA); business verification as Meta requires.
2. A dedicated business phone number registered to the Cloud API (not a personal WhatsApp number).
3. A **permanent system-user access token** with `whatsapp_business_messaging` permission.
4. Create and get approval for this **UTILITY** template (name `new_order_alert`, language `en`), 7 body
   variables:

   ```
   New order {{1}} received at {{2}}.
   Total: {{3}} | Payment: {{4}}
   Items: {{5}}
   Deliver to: {{6}}
   Open in admin: {{7}}
   ```

5. Webhook: callback URL `https://www.akulas.kitchen/api/v1/webhooks/whatsapp` (or the Render URL), verify
   token = `WHATSAPP_WEBHOOK_VERIFY_TOKEN`, subscribe to `messages`; set `WHATSAPP_APP_SECRET`.
6. Set `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_ADMIN_NUMBERS` on Render.
7. Place one real COD test order and confirm the message arrives. **Until then the integration is NOT
   verified end to end.**

---

## F. Other production service costs

| Service              | Used?                 | Cost basis        | Figure                                          |
| -------------------- | --------------------- | ----------------- | ----------------------------------------------- |
| Database             | Yes                   | Atlas tier        | Section C                                       |
| Object storage / CDN | Yes (Cloudinary)      | Credits           | Free tier while under 25 credits/mo             |
| Email delivery       | Yes (Brevo/SMTP)      | Plan              | [UNKNOWN]                                       |
| OTP / SMS            | Yes (Fast2SMS)        | Per SMS           | [UNKNOWN]                                       |
| Payments             | Yes (Razorpay)        | % per transaction | [UNKNOWN for your account]                      |
| Error monitoring     | Sentry SDK present    | Free tier likely  | [UNKNOWN]                                       |
| Session replay       | LogRocket SDK present | Free tier likely  | [UNKNOWN]; also a privacy review item           |
| Backups              | Atlas                 | Tier-dependent    | M0: none [VERIFIED]; Flex/M10: confirm in Atlas |
| Background jobs      | BullMQ (needs Redis)  | Redis plan        | Redis is not configured today                   |
| Domain / DNS         | Yes                   | Annual            | [UNKNOWN]                                       |

No costs are listed for services the code does not use.

---

## G. Monthly budget scenarios (₹, assumption ₹88/US$)

|                                   | 1. Minimum viable launch          | 2. Recommended reliable launch         | 3. Growth stage                              |
| --------------------------------- | --------------------------------- | -------------------------------------- | -------------------------------------------- |
| Vercel                            | Pro ₹1,760                        | Pro ₹1,760                             | Pro ₹1,760 (+ usage over 1 TB)               |
| API                               | Render Standard, Singapore ₹2,200 | Render Standard, Singapore ₹2,200      | 2 × Standard ₹4,400                          |
| Database                          | Atlas Flex base ₹704              | Atlas Flex, up to ₹2,640 at higher ops | Atlas M10 ₹5,011                             |
| Redis                             | [UNKNOWN]                         | [UNKNOWN]                              | [UNKNOWN]                                    |
| Cloudinary                        | Free ₹0                           | Free ₹0                                | Plus ₹8,712 only if credits are exceeded     |
| WhatsApp (1,000 orders)           | ₹115                              | ₹115                                   | ₹345 (3,000 orders)                          |
| **Fixed + listed usage, pre-GST** | **₹4,779 + Redis**                | **₹4,779–6,715 + Redis**               | **₹11,516 + Redis (+ Cloudinary if needed)** |
| **With 18% GST**                  | **≈ ₹5,639**                      | **≈ ₹5,639–7,924**                     | **≈ ₹13,589**                                |

Usage-based items not included: Razorpay fees, SMS, email above plan, Vercel overages, Cloudinary
overages.

**Assumptions:** 1 admin WhatsApp number; 1,000 orders/month in scenarios 1–2; no paid monitoring.

---

## H. Security and maintenance responsibilities

- **Backups:** confirm the Atlas tier has backups; run **one restore test** into a scratch cluster and record
  the date. Product images must live in Cloudinary (not git) before the git copies are retired.
- **OS patching:** none on Render/Vercel. A VPS would need monthly patching and reboot windows.
- **Secrets:** Render/Vercel environment variables only. Rotate any secret ever committed or shared. The
  local Cloudinary secret is already invalid and must be replaced.
- **Monitoring:** turn on Sentry alerts for the backend; add an uptime check on `/api/health`; watch the
  `[CRITICAL CONFIG]` and `[CLIENT_IP]` startup log lines after deploy.
- **Incident response:** roll back with Render's "redeploy previous", and on Vercel promote the previous
  deployment. Neither needs a database change for this release.
- **Database changes in this release:** new collections `twofactorpendings` and `whatsappnotifications`,
  and an optional `familyId` field on refresh tokens. All are additive with no destructive migration, and
  rollback is safe.

---

## I. Capacity assumptions

No hosted staging environment exists and load-testing production was not authorised. A **local isolated
staging** test was run on 2026-10-27: in-memory MongoDB 8 with a read-only copy of the live catalog, the
compiled backend, one Node process on a Windows desktop, all external services disconnected.
Traffic mix: 40% product list, 25% product detail, 15% categories, 10% settings, 10% CMS.

| Virtual users | Req/s | p50    | p95    | p99    | Errors |
| ------------- | ----- | ------ | ------ | ------ | ------ |
| 5             | 369   | 12 ms  | 24 ms  | 49 ms  | 0      |
| 25            | 495   | 47 ms  | 74 ms  | 103 ms | 0      |
| 50            | 518   | 91 ms  | 124 ms | 234 ms | 0      |
| 100           | 524   | 176 ms | 240 ms | 733 ms | 0      |

Re-run it with `backend/ops/testing/staging-db.cjs` and `backend/ops/testing/loadtest.cjs` (see the
launch checklist, C2).

1. **Measured safe operating level:**
   - **Local isolated staging only:** 50 concurrent virtual users at about 518 req/s, p95 124 ms, 0 errors,
     for catalog reads.
   - **Production: none measured.** The local database answers in about 8 ms versus 213 ms from Render to
     Atlas, and the Render instance size is unverified, so the local figure is a per-process code ceiling,
     not production capacity.
2. **Estimated practical capacity [ESTIMATE].** Inputs:
   - Uncached catalog request: p50 0.72 s, of which ~0.24 s is server/DB time [VERIFIED, n=10].
   - Single Node process; DB pool up to 50 connections (code); DB round trip 206 ms today.
   - Atlas Flex base tier is priced for 0–100 ops/s [VERIFIED].
   - Reasoning: the database tier and the region round trip are the binding constraints, not CPU. At
     roughly 2–4 database operations per uncached page view, ~100 ops/s is about 25–50 uncached page views
     per second. With HTTP and in-app caching and 10–20 s of browsing time per page, that is a few hundred
     people browsing at once.
   - Checkout is far tighter: ~15+ sequential DB operations × 206 ms ≈ 3 s each, contending on inventory
     documents.
   - **Recommended initial operating limit: plan for ≤ 100 concurrently active shoppers and ≤ 5
     simultaneous checkouts** until a staging load test says otherwise.
3. **Untested theoretical capacity: not stated.** The evidence does not support a defensible number.

**Upgrade when:** p95 API latency > 1.5 s at peak, Atlas ops/s near the tier ceiling, CPU > 70% sustained,
or checkout errors from contention appear.

---

## J. Implementation status

**Completed in code (committed as `c3ef351f` and deployed)**

- Performance:
  - Footer layout shift removed (CLS 0.541 → 0).
  - Parser-blocking `sw-cleanup.js` inlined.
  - In-flight GET de-duplication.
  - Telemetry POSTs no longer wipe the API cache.
  - Config fetches made parallel and failure-isolated.
  - One tracking session per page.
- Navigation:
  - Product cards no longer push duplicate history entries (Back now works first time).
  - Reviews and photos drawers no longer leave dangling history entries.
- WhatsApp admin alerts:
  - Service, idempotent delivery records, bounded retries.
  - Signed webhook for delivery status.
  - Outbox hook; 10 tests.
- Cleanup: 67 verified-orphan source files removed; dependency and `.gitignore` audits found nothing else
  to change.

**External configuration required.** Secrets are named here by variable only:

- Render:
  - `NODE_ENV=production`
  - `REDIS_URL`
  - Correct `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET`
  - `METRICS_API_KEY` (optional)
  - `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_ADMIN_NUMBERS`,
    `WHATSAPP_WEBHOOK_VERIFY_TOKEN`, `WHATSAPP_APP_SECRET`
  - Every variable `npm run check-env` reports missing under `NODE_ENV=production`
- Meta: WABA, phone number, approved `new_order_alert` template, webhook subscription.
- Atlas: confirm tier and backups.
- Vercel: confirm Pro.

**Outstanding approvals**

- Recreating the Render service in Singapore (infrastructure change).
- Retiring `frontend/public/uploads` from git after the image migration is verified.

**Done since:** isolated local staging load test (section I); inventory concurrency tests (20 racing buyers
for 5 units → exactly 5); oversell fix; MongoDB compressor fix; readiness that honours `REQUIRE_REDIS`;
CI audit at `high`. See `PRODUCTION_READINESS_REPORT.md` §3.

**Tests that remain blocked:** load test on production-like staging (same region, instance size and Atlas
tier); real-device iOS/Android login; Razorpay test-mode order on a non-production database; WhatsApp end
to end; Atlas restore drill.

---

## K. Sources (accessed 2026-10-27)

- Meta, WhatsApp Business Platform pricing: https://developers.facebook.com/docs/whatsapp/pricing
- Meta, pricing (documentation mirror): https://developers.facebook.com/documentation/business-messaging/whatsapp/pricing
- Meta, template fundamentals: https://developers.facebook.com/documentation/business-messaging/whatsapp/templates/overview.md
- Meta, create a webhook endpoint (verification and `X-Hub-Signature-256`): https://developers.facebook.com/documentation/business-messaging/whatsapp/webhooks/create-webhook-endpoint.md
- Meta, message status webhook reference: https://developers.facebook.com/documentation/business-messaging/whatsapp/webhooks/reference/messages/status.md
- Third-party India utility rate tables (estimates only): https://chatmitra.com/blog/whatsapp-business-cost-per-message/ ,
  https://chatmaxima.com/whatsapp-api-pricing/india/ , https://splashifypro.com/doi/blog/whatsapp-service-message-pricing-india-rate-card
- Vercel pricing: https://vercel.com/pricing
- Render regions: https://render.com/docs/regions
- Render instance prices (Render article): https://render.com/articles/how-much-does-cloud-application-hosting-cost-for-small-businesses
- MongoDB Atlas pricing: https://www.mongodb.com/pricing
- Cloudinary pricing: https://cloudinary.com/pricing
- AWS Lightsail pricing: https://aws.amazon.com/lightsail/pricing/
- Upstash Redis pricing: https://upstash.com/pricing/redis
- Brevo pricing (did not render; figures not used): https://www.brevo.com/pricing/
