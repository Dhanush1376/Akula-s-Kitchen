# Akula's Kitchen — SEO Validation Report

Date: 2026-10-31. All commands were run locally on Windows (Node 22.19). There was no deployment, and no production data was modified. The live site was only **read**, through public GET endpoints.

## 1. Backend tests: 294/294 pass

```bash
cd backend && npx vitest run
```

```
Test Files  37 passed (37)
     Tests  294 passed (294)
```

New SEO specs:

- `tests/unit/seo/productSeo.test.ts`: 14 tests
- `tests/unit/seo/sitemapAndPages.test.ts`: 10 tests
- `tests/integration/productSeoLifecycle.test.ts`: 9 tests (real `ProductService` against an in-memory MongoDB replica set)

Lifecycle scenarios required by the brief (§17), all passing:

| #   | Scenario                  | Assertion                                                                                                                                                     |
| --- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1–2 | Create product → auto SEO | slug `mango-avakaaya`, title `Homemade Mango Avakaaya Pickle \| Akula's Kitchen`, description lists `250g and 1kg`; a duplicate title gets `mango-avakaaya-2` |
| 3   | Manual SEO edit           | `seoTitle` recorded in `seoOverrides` and unchanged by a later description edit, while the description regenerates                                            |
| 4   | Price update              | Offer prices go from 500.00 to 450.00 / 650.00                                                                                                                |
| 5   | Stock to 0                | every variant becomes `OutOfStock`, and `product:availability` becomes `out of stock`                                                                         |
| 6   | Unpublish / republish     | URL removed from sitemap and feed and answers 404, then restored                                                                                              |
| 7   | Delete                    | 410 Gone, removed from sitemap, slug not reused                                                                                                               |
| 8   | Image update              | OG image becomes the new 1200×630 derivative                                                                                                                  |
| 9   | Sitemap                   | slug URL and `/category/pickles` present, no ObjectId URLs                                                                                                    |
| 10  | Metadata                  | correct title and canonical; ObjectId URL and renamed slug both 301; API resolves the retired slug                                                            |

Two notes on the test harness (not product defects):

- `ProductService.deleteProduct` loads the User model through a CommonJS `require('../models/User')`, which vitest cannot resolve for `.ts` sources. The test therefore performs that method's soft delete directly. The compiled production build is unaffected.
- `CategoryService.intelligentMatch` keeps a static name→id memo, so the spec pins the category `_id` across tests whose collections are wiped.

`npx tsc --noEmit` is clean. `eslint` on all new and changed backend SEO files is clean.

## 2. Frontend tests and build

```bash
cd frontend && npx vitest run
```

```
Test Files  9 passed (9)
     Tests  66 passed (66)
```

The new file `src/utils/__tests__/seoRender.test.js` (10 tests) checks the template markers, verifies there is exactly one title, description and canonical after injection, confirms JSON-LD cannot break out of `<script>`, and covers shell seeding, the verification tag, rewrite path parsing, private routes and the slug/category route builders. The existing `AdminAddProduct.test.jsx` still passes with the new wizard step.

```bash
cd frontend && npm run build
```

Exit code 0:

- `vite build`, then `write-seo-template.mjs` (`[seo] wrote api\_lib\template.generated.js (7772 bytes)`)
- `[budget-check] Bundle size budgets passed.`
- `[performance-guards] Import, legacy URL, and sourcemap guards passed.`

ESLint on every changed or new frontend file: 0 errors. One warning remains in `ProductVariantsStep.jsx:111`; it was there before this work.

## 3. Live-catalogue validation: 0 errors

```bash
cd backend && npm run seo:validate
```

This fetches the real catalogue read-only from `https://www.akulas.kitchen` (18 products, 8 categories, public settings). It runs the production builders and renders the final crawler HTML through `frontend/api/_lib/seoHtml.js`.

```
Pages checked: 30 (28 indexable), rendered HTML checked: 30
Sitemap URLs: 28 (6945 bytes), Merchant feed items: 43
  /                                      Akula's Kitchen | Homemade Batters, Pickles & Traditional Foods
  /collections                           Shop Homemade Pickles, Batters & Podis Online | Akula's Kitchen
  /menu                                  Menu & Price List: Batters, Pickles, Podis | Akula's Kitchen
  /contact                               Contact Akula's Kitchen | Orders & Customer Support
  /category/batters                      Idli, Dosa & Appam Batter Online | Akula's Kitchen
  /category/pickles                      Homemade Pickles Online: Avakaya & Gongura | Akula's Kitchen
  /product/idli-batter                   Fresh Idli Batter | Akula's Kitchen
  /product/cashews-w240                  Cashews W240 | Akula's Kitchen
  /product/mango-avakaaya                Homemade Mango Avakaaya Pickle | Akula's Kitchen
  … (30 pages listed in full by the script)
warn  /category/snacks: noindex: category has no products (intended)
warn  /category/sweets: noindex: category has no products (intended)
warn  /product/dosa-batter: aggregateRating from 1 approved review(s): ensure reviews are visible on the page
warn  /product/tomato-pickle: aggregateRating from 1 approved review(s): ensure reviews are visible on the page
0 error(s), 4 warning(s)
```

The checks implemented (brief §17) and their results:

| Check                                                                      | Result                           |
| -------------------------------------------------------------------------- | -------------------------------- |
| Missing title tags                                                         | 0                                |
| Duplicate title tags                                                       | 0                                |
| Missing descriptions                                                       | 0                                |
| Duplicate descriptions                                                     | 0                                |
| Truncated descriptions ending in an ellipsis (the old `"...."` values)     | 0                                |
| Missing canonical URLs, or canonicals off-host                             | 0                                |
| Broken product URLs (sitemap `<loc>` with no page, or a noindex page)      | 0                                |
| Invalid sitemap URLs, or sitemap URL ≠ canonical                           | 0                                |
| Missing product structured data                                            | 0                                |
| Invalid JSON-LD (raw and as rendered in HTML)                              | 0                                |
| Unverified schema fields (`priceValidUntil`, `Review`, geo, opening hours) | 0                                |
| Missing image alt text                                                     | 0                                |
| Duplicate or malformed product slugs                                       | 0                                |
| Unintentionally noindexed public pages                                     | 0 (2 intended: empty categories) |
| Offers marked InStock with zero sellable stock                             | 0                                |
| Offer URL not canonical                                                    | 0                                |
| Orphaned products (not linked from shop or any category)                   | 0                                |
| Pages with ≠1 `<title>`/description or >1 canonical in final HTML          | 0                                |
| Duplicate feed IDs or malformed feed prices                                | 0                                |

The two rating warnings are accurate: those products each have one approved review, and the reviews section is rendered on the product page.

## 4. Renderer smoke test (real `api/seo-render.js`)

The real Vercel function was invoked with fake requests against a local mock backend that served descriptors built from the live catalogue. The script is in this session's scratchpad (it is not a project file).

| Request                   | Status  | Key headers                                        | Result                                                                                                        |
| ------------------------- | ------- | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `/product/mango-avakaaya` | 200     | `Vercel-CDN-Cache-Control: max-age=300, swr=86400` | product title, canonical, `["ProductGroup","BreadcrumbList"]`, shell, verification tag, hashed assets present |
| `/category/pickles`       | 200     | CDN cached                                         | category title, canonical, `["CollectionPage","BreadcrumbList"]`                                              |
| `/product/<ObjectId>`     | **301** | `Location: /product/mango-avakaaya`                | n/a                                                                                                           |
| deleted product           | **410** | `X-Robots-Tag: noindex, follow`                    | "Product No Longer Available"                                                                                 |
| `/policy/privacy-policy`  | 200     | n/a                                                | plain SPA shell (client-rendered page)                                                                        |
| `/checkout`               | 200     | `X-Robots-Tag: noindex, follow`, not CDN cached    | plain shell                                                                                                   |
| backend unreachable       | 200     | not CDN cached                                     | plain shell, so the site keeps working                                                                        |

## 5. What was not verified (requires deployment)

- Vercel-specific behaviour: rewrite ordering with the new catch-all, bundling of `api/_lib/template.generated.js`, and edge caching headers. These were exercised locally with the same code paths but not on Vercel itself.
- Google tools: Rich Results Test, URL Inspection, Merchant Center feed ingestion, and Search Console sitemap processing. These need the deployed URLs.
- Real social previews on WhatsApp, Facebook and X.
- Any change in indexing or rankings. That has to be measured in Search Console after launch and is not claimed here.
