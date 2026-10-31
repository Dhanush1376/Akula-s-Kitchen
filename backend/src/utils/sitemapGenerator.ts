import { bumpSeoCacheVersion } from '../services/seo/seoCache';

/**
 * Sitemap generation lives in services/seo/sitemapService.ts and is served
 * dynamically at /sitemap.xml. Product/category writes call this to drop the
 * cached sitemap, merchant feed and page descriptors so new, edited,
 * unpublished or deleted products are reflected on the next request.
 *
 * (The previous implementation wrote frontend/public/sitemap.xml to disk, which
 * only worked on a local monorepo checkout and left production stale.)
 */
export function triggerSitemapUpdate(): void {
  bumpSeoCacheVersion();
}
