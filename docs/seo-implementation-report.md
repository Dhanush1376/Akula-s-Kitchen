# Akula's Kitchen — SEO Implementation Report

Date: 2026-10-31. Scope: the full SEO infrastructure requested in the master brief, built inside the existing Vite SPA + Express/Mongoose + Vercel architecture. **Nothing is committed, pushed or deployed.** Nothing in this report claims any change in Google indexing or rankings: that can only be measured after deployment, in Search Console.

Companion documents: [seo-audit.md](seo-audit.md) (findings before the work) and [seo-validation-report.md](seo-validation-report.md) (test and build evidence).

---

## 1. Existing SEO architecture (before)

A client-only SPA. Every URL returned the same static `index.html` head (homepage title, a canonical pointing at the homepage, and the generic OG image). `react-helmet-async` updated tags only after JavaScript ran, and it duplicated the static tags instead of replacing them. Product JSON-LD was built in the browser with hardcoded `InStock`, a fake SKU and a made-up `priceValidUntil`. The sitemap was a static file committed to git, so Vercel served it ahead of the dynamic route, and it listed `/product/<ObjectId>` URLs. Full detail: [seo-audit.md](seo-audit.md).

## 2. Root causes

| Root cause                                                                                                                           | Effect                                                             | Fixed by                                                            |
| ------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------ | ------------------------------------------------------------------- |
| No server rendering of per-page metadata                                                                                             | Shared links preview as the homepage; non-JS crawlers see one page | `frontend/api/seo-render.js`                                        |
| Static `public/sitemap.xml` overrides the Vercel rewrite; the generator wrote to a local disk path that does not exist in production | Sitemap never updates in production                                | Dynamic `/sitemap.xml` from the database, static file removed       |
| Links built from ObjectIds                                                                                                           | Two URLs per product; sitemap and canonical disagree               | Slug URLs everywhere plus 301s                                      |
| Metadata assembled in several places (index.html, layout, page)                                                                      | Duplicate tags and JSON-LD                                         | One server source (`services/seo/*`); SPA drops server tags on boot |
| No SEO model for products                                                                                                            | No admin control; stale `"...."` descriptions                      | SEO fields, override tracking, admin step                           |
| Hardcoded "verified-looking" data (geo, hours, region, stock)                                                                        | Inaccurate structured data                                         | Only stored data is used                                            |

## 3. Pages optimised

Each page has a unique title, description, canonical, robots directive, OG/Twitter tags and an H1. All of them come from `backend/src/services/seo/pageSeoService.ts` and are rendered both server-side and in the SPA.

| URL                     | Title (live catalogue)                                             | Structured data                                         | Notes                                                                                                                                                                                     |
| ----------------------- | ------------------------------------------------------------------ | ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/`                     | Akula's Kitchen \| Homemade Batters, Pickles & Traditional Foods   | Organization, WebSite                                   | Organization data comes only from admin store settings (Noida address, phone, email). No geo, hours or price range.                                                                       |
| `/collections` (shop)   | Shop Homemade Pickles, Batters & Podis Online \| Akula's Kitchen   | CollectionPage + ItemList, BreadcrumbList               | `?search=`/sort/price views are noindex. `?category=X` canonicalises to `/category/x`. `/shop` 301s here.                                                                                 |
| `/menu`                 | Menu & Price List: Batters, Pickles, Podis \| Akula's Kitchen      | CollectionPage (ItemList of categories), BreadcrumbList | It is a price list, so **no** Restaurant/Menu schema is used. "Shop X" links now go to category pages.                                                                                    |
| `/contact`              | Contact Akula's Kitchen \| Orders & Customer Support               | ContactPage (about: Organization), BreadcrumbList       | `tel:`/`mailto:` links come from settings (the page already had them).                                                                                                                    |
| `/category/:slug` (new) | e.g. Homemade Pickles Online: Avakaya & Gongura \| Akula's Kitchen | CollectionPage + ItemList, BreadcrumbList               | New landing page with H1, intro copy, product grid and links to other categories. Empty categories (snacks, sweets) are noindex and kept out of the sitemap. `/collection/:id` 301s here. |
| `/product/:slug`        | e.g. Homemade Mango Avakaaya Pickle \| Akula's Kitchen             | ProductGroup/Product + Offer(s), BreadcrumbList         | See §4–5.                                                                                                                                                                                 |
| 404 / 410               | Page Not Found / Product No Longer Available                       | none                                                    | Real HTTP status, noindex. The SPA `NotFound` noindex is fixed too (the `robots` prop now works).                                                                                         |
| Private routes          | n/a                                                                | none                                                    | `X-Robots-Tag: noindex, follow` from the renderer and from `vercel.json`, and Helmet `noindex` remains.                                                                                   |

Category copy lives in `backend/src/config/seoConfig.ts` (`CATEGORY_SEO`). It is limited to claims the business makes (homemade batters, pickles and chutneys; traditional podis) and to what the catalogue shows. Category documents can override it through the new `seoTitle`, `seoDescription` and `seoIntro` fields.

## 4. Product SEO implementation

**Model** (`backend/src/models/Product.ts`): new fields `seoFocusKeyword`, `seoKeywords`, `seoOgTitle`, `seoOgDescription`, `seoOgImage`, `seoImageAlt`, `seoCanonicalUrl`, `seoContent`, `seoIndexable` (default `true`), `seoOverrides`, `previousSlugs`, plus an index on `previousSlugs`. The existing `slug`, `seoTitle` and `seoDescription` fields are reused.

**Generator** (`backend/src/services/seo/productSeo.ts`, pure functions):

- **Slug.** Lowercase and hyphenated, at most 80 characters, unique across live _and_ soft-deleted products and retired slugs (`productSlugService.ts`). Duplicate titles get `-2`, `-3`, and so on instead of failing with a database error.
- **Title.** `<Qualifier> <Name> <Noun> | Akula's Kitchen`, at most 60 characters. Qualifier and noun come from the category config. For example, Mango Avakaaya in Pickles becomes "Homemade Mango Avakaaya Pickle". Cashews get no qualifier.
- **Description.** A lead sentence, the product's **own** first description sentence, and its **real** pack sizes, at most 160 characters with no ellipsis.
- **Keywords.** The focus phrase, then alternate names taken from the product's existing tags (weight tokens are skipped).
- **Alt text.** Primary: "Homemade Mango Avakaaya Pickle from Akula's Kitchen". Additional images: "…, photo 2 of 3" (each image gets distinct text).
- **OG image.** A Cloudinary `c_fill,g_auto,w_1200,h_630,q_auto,f_jpg` derivative of the product's own image. Width, height and type are emitted only when they are known.
- **Canonical.** `https://akulas.kitchen/product/<slug>`. An admin override is accepted only for same-site URLs.

**Override model.** `applyProductSeo()` runs on every create and update in `ProductService`:

- A field sent with a value that differs from the generated one is recorded in `seoOverrides` and kept.
- A field sent empty returns to automatic.
- A field not sent keeps its current state. Automatic fields regenerate, so a title, description, price or image change flows through. Custom values are never overwritten by ordinary updates.
- The client cannot set `seoOverrides` directly.

**Read-time resolution.** `resolveProductSeo()` regenerates every non-custom field from current data at read time. So **all 18 existing products got correct SEO immediately, with no data migration**, and legacy stored values such as `"Tangy and spicy… meals...."` are ignored unless an admin customises them.

**Slug changes.** Changing a slug pushes the old one into `previousSlugs`. `/product/<old>` and `/product/<ObjectId>` answer `301` to the current slug (server-side), and the SPA replaces the URL client-side. The product API resolves retired slugs, so old links never break.

**API.** `GET /api/v1/products/:idOrSlug` now includes a `seo` object (title, description, canonical, robots, OG, alt texts, breadcrumbs, JSON-LD), which the product page renders.

## 5. Admin SEO functionality

The new wizard step **"SEO & Search"** sits between Pricing and Review, in `frontend/src/admin/pages/steps/ProductSeoStep.jsx`. That file was previously unmounted and read-only. It follows the existing admin tokens and classes.

- Inputs: SEO title, meta description, URL slug, focus keyword, secondary keywords, primary image alt, OG title, OG description, OG image, indexing toggle, plus an advanced section with SEO content and a canonical override.
- Every field shows **Auto** or **Custom · Reset to auto**. Editing makes a field custom. Reset returns it to generated.
- Character counters with limits (title 60, description 70–160, alt 125).
- A live server preview (`POST /api/v1/seo/admin/product-preview`, debounced) shows exactly what the storefront will emit.
- A **Google search preview** including the price range and stock line taken from the generated JSON-LD.
- An **OG/social card preview** with the real 1200×630 image.
- **Duplicate slug detection** (`GET /api/v1/seo/admin/slug-check`) with a one-click free suggestion. The wizard blocks Next while the slug is taken or invalid (`useProductValidation.js`). On edit, it warns that the old URL will 301.
- Warnings for a short product description, missing image, title or description length, focus keyword missing from the title, indexing off, and draft products.
- The payload (`useProductSubmission.js`) sends custom values and sends automatic ones empty.

Admin endpoints use the existing `requireAuth` + `requireAdmin` middleware.

## 6. Structured data

- **ProductGroup** (products with two or more pack sizes, which covers 17 of the 18 live products): `productGroupID` = real SKU, `variesBy: size`, and one `Product` per pack in `hasVariant`, each with `sku`, `size`, `image`, `inProductGroupWithID` and an `Offer` (`price` = base + the option's real `priceAdjustment`, `INR`, `NewCondition`, canonical `url`).
- **Product + single Offer** for products with zero or one option.
- **Availability** mirrors checkout. `InStock` only when the product is active and `stock − reservedStock > 0` (the same rule `orderValidation.ts` enforces), and only when that option is `available`. Otherwise `OutOfStock`.
- **aggregateRating** only when the product has real approved reviews (`rating`/`reviews` are maintained by `reviewController`). Currently two products have one review each. No `Review` items, no invented counts.
- **Removed:** `priceValidUntil`, the incomplete `shippingDetails`, the `reviewCount || 1` fallback, LocalBusiness geo/hours/region, SiteNavigationElement ItemList, and SearchAction.
- **BreadcrumbList** on shop, menu, contact, category and product pages (Home › Shop › Category › Product). Breadcrumbs are visible in the UI and link to category pages.
- Product JSON-LD is in the **initial HTML** (server-injected) and re-emitted by Helmet after hydration. Server copies are removed on boot, so there are never two copies at once.

## 7. URL architecture

| Pattern                                                | Status                                                                                     |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------ |
| `/product/<slug>`                                      | Canonical. All product links use it (`getProductRoute(product)`: cards, menu, quick view). |
| `/product/<ObjectId>`, `/product/<retired-slug>`       | 301 to the slug (server), `replace` navigation (SPA)                                       |
| `/category/<slug>`                                     | New canonical category URL                                                                 |
| `/collection/<x>`                                      | 301 to `/category/<x>`                                                                     |
| `/collections`                                         | Kept as the shop URL (already indexed, so no migration)                                    |
| `/shop`, `/about`, `/shipping`, `/refund`, `/terms`, … | 301 to their targets (previously client-only `<Navigate>`)                                 |
| Trailing slash or upper case                           | 301 to the lower-case path without the trailing slash                                      |
| Unknown first path segment                             | Real 404 (previously a soft 404 with 200)                                                  |

Redirects are single-hop. Canonicals, internal links and sitemap `<loc>` values all use the same URL form (verified by the validator).

## 8. Sitemap

- `GET /sitemap.xml` is rendered from MongoDB by `backend/src/services/seo/sitemapService.ts` and proxied by a Vercel rewrite. The stale `frontend/public/sitemap.xml` and the broken `frontend/api/sitemap.js` are removed, and the backend no longer writes to `frontend/public`.
- **Included:** `/`, `/collections`, `/menu`, `/contact`, categories that list products, active indexable products (with image entries), published policies, and blog posts when any exist.
- **Excluded:** drafts, soft-deleted products, `seoIndexable: false` products, empty categories, and every private route and API path.
- `lastmod` is only set from real `updatedAt` timestamps. Menu and contact have no lastmod. `changefreq` and `priority` are dropped (Google ignores them).
- It switches automatically to a sitemap index plus `/sitemap-<n>.xml` chunks above 45,000 URLs.
- **Freshness.** Product and category `save`/`findOneAndUpdate` hooks bump an in-process cache version (`seoCache.ts`), so create, edit, unpublish and delete show up on the next request. The cache TTL is 10 minutes and CDN caching is 15 minutes.

## 9. robots.txt

`frontend/public/robots.txt`: `Allow: /`, disallow only the two unauthenticated maintenance consoles, and `Sitemap:`.

- Cart, checkout, account and admin are deliberately **not** blocked. They answer with `X-Robots-Tag: noindex`, which crawlers can only see if they are allowed to fetch the page.
- `/api/` is **not** blocked. Googlebot needs the same-origin product API to render pages. API responses now carry `X-Robots-Tag: noindex` (`registerApiRoutes.ts`).

## 10. Image SEO

- Product images get distinct, descriptive alt text on the product page gallery (thumbnails are labelled buttons). Cards already used "<title> - view N".
- OG images are 1200×630 product derivatives with declared dimensions.
- The sitemap carries `<image:image>` entries for every product image.
- Cloudinary `f_auto,q_auto` delivery (existing) handles WebP/AVIF and compression.
- Image filenames: the existing Cloudinary public IDs are kept, because renaming would break stored references. See recommendations.
- Decorative leaf images already used `alt=""`.

## 11. Internal linking

Home → categories, Shop → categories + products, Menu → categories + products, Category → products + other categories, Product → category (breadcrumb) + related products. All are real `<a href>` links in both the SPA and the server shell. The validator found **0 orphaned products**.

## 12. Search Console readiness

- Verification: set the Vercel env var `GOOGLE_SITE_VERIFICATION=<token>` and the renderer adds the meta tag to every HTML response. No token exists in the repo and none was invented. DNS verification is equally valid.
- Submit `https://akulas.kitchen/sitemap.xml` after deployment.
- Real 301/404/410 statuses and consistent canonicals reduce "Duplicate without user-selected canonical" and soft-404 reports.

## 13. Merchant Center readiness

`GET /merchant-feed.xml` (Vercel rewrite → `/api/v1/seo/merchant-feed.xml`) is an RSS 2.0 `g:` feed built from the database. It has one item per pack size: `id`, `item_group_id`, `title`, `description`, `link`, `image_link`, `additional_image_link`, `availability`, `price` (`NNN.00 INR`), `condition=new`, `brand`, `identifier_exists=no`, `size`, `product_type`. The live catalogue produces 43 items. Shipping and returns are **not** invented in the feed and should be configured in Merchant Center itself.

## 14. Automated SEO tests

| File                                                                                                         | What it covers                                                                                                                                                                                                                                                         |
| ------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `backend/tests/unit/seo/productSeo.test.ts` (14 tests)                                                       | Slugs; generation from real data with no invented claims; override persistence, reset and legacy values; canonical safety; ProductGroup/Offer prices; availability vs stock and options; rating only when real; noindex rules; distinct alt text                       |
| `backend/tests/unit/seo/sitemapAndPages.test.ts` (10 tests)                                                  | Sitemap inclusion and exclusion, lastmod honesty, XML escaping and index; feed items; unique titles, descriptions and canonicals across pages; no invented Organization data; no orphans; noindex for empty categories and filtered shop views; HTML escaping          |
| `backend/tests/integration/productSeoLifecycle.test.ts` (9 tests, real `ProductService` + in-memory MongoDB) | 1 create, 2 auto SEO + unique slug, 3 manual edit survives updates, 4 price update, 5 stock → OutOfStock, 6 unpublish/republish, 7 delete → 410, 8 image update → OG, 9 sitemap, 10 metadata + 301s for ObjectId and renamed slug; category, legacy and unknown routes |
| `frontend/src/utils/__tests__/seoRender.test.js` (10 tests)                                                  | Template markers; single title, description and canonical after injection; safe JSON-LD serialisation; shell seeding; verification tag; rewrite path parsing; private route detection; slug and category route builders                                                |
| `backend/scripts/seo/validateSeo.ts` (`npm run seo:validate`)                                                | Live-catalogue validator covering every check in brief §17                                                                                                                                                                                                             |

## 15. Build and test results

See [seo-validation-report.md](seo-validation-report.md). Summary:

- Backend: 37 files, **294/294 tests** pass, and `tsc` is clean.
- Frontend: 9 files, **66/66 tests** pass. The production build succeeds and the bundle budgets and performance guards pass.
- Live-catalogue validation: **0 errors** across 30 pages, the 28-URL sitemap and the 43-item feed.
- Renderer smoke test: correct 200/301/410/noindex behaviour, and a safe fallback when the backend is down.

## 16. Remaining issues and recommendations

1. **Canonical host: apex chosen (`https://akulas.kitchen`).** The code already uses the apex everywhere (backend `SITE_URL`, frontend `VITE_SITE_URL`, robots.txt `Sitemap:`, the feed, the sitemap). **One manual step remains:** in Vercel → Project → Settings → Domains, make `akulas.kitchen` the primary domain and set `www.akulas.kitchen` to permanently redirect to it. Today the redirect runs the other way (apex 308 → www), so canonicals point at a redirecting URL until that is flipped. The CORS allow-list keeps both hosts.
2. **Deployment order.** Deploy the backend first. If the frontend goes first, the renderer falls back safely to the plain shell, but `/sitemap.xml` and `/merchant-feed.xml` would 404 until the backend routes exist. Optional Vercel env vars: `SEO_API_ORIGIN` (default: the Render URL), `GOOGLE_SITE_VERIFICATION`, `SEO_RENDER_TIMEOUT_MS` (default 2500).
3. **Render cold starts.** If the Render instance sleeps, the first crawler hit may exceed the 2.5 s renderer timeout and receive the plain shell (still correct for users and JS-rendering crawlers). An always-on instance or an uptime ping avoids this.
4. **The storefront ignores stock in its UI.** `ProductCard.jsx` hardcodes `isOutOfStock = false`, while checkout enforces stock. Structured data now reports real availability. Showing "Out of stock" in the UI would keep the page consistent with it.
5. **Cashews category data.** Its stored `description` reads "Crispy, artisanal handmade savory snacks." (copied from Snacks). It is not used for SEO, but it should be corrected in admin.
6. **Files edited concurrently by someone else** during this session, and left untouched by me: `frontend/src/pages/Home/**`, `ConfigContext.jsx`, `MaintenanceGate.jsx`, `RouteSkeleton.jsx`, `SkeletonBase.jsx`, `HomeSkeleton.jsx`, `serviceWorkerRegistration.js`, `styles/globals/components.css`, `public/MainLogo.png`. Two links there could be improved once that work lands:
   - `EditorialHero.jsx` uses `/product/${item.id}` (it redirects to the slug, but `getProductRoute(item)` avoids the hop);
   - `CategoryGrid.jsx` uses `/collections?category=` (it canonicalises correctly, but `getCategoryRoute()` links straight to the landing page).
     `CartItemRow`, `DynamicRatingBadge` and the review drawers still use ids. They redirect, and they are not crawl paths.
7. **AI autofill SEO.** AI-suggested `seoTitle`/`seoDescription` values are now treated as automatic (regenerated) unless an admin edits the field. This avoids the old `substring(0,155) + '...'` output and any unverified AI claims.
8. **Category SEO in admin.** The model supports `seoTitle`, `seoDescription` and `seoIntro`, but the category drawer has no inputs for them yet.
9. `frontend/api/social-proxy.js` is now redundant (nothing routes to it). It can be deleted together with the backend `/api/v1/social/*` route once the new renderer is confirmed in production.
10. Merchant Center: add shipping and returns settings in Merchant Center, and consider `hasMerchantReturnPolicy`/`shippingDetails` only once the policies are finalised.
11. After deploying, check a few URLs in Search Console URL Inspection and the Rich Results Test, and watch the Pages and Merchant listings reports. No ranking or indexing change should be assumed before then.
