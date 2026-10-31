/**
 * Dependency-free invalidation signal for cached SEO output (sitemap, feed,
 * page descriptors). Kept free of model imports so Mongoose model files can
 * call it from hooks without creating import cycles.
 */
let version = 0;

export function bumpSeoCacheVersion(): void {
  version += 1;
}

export function getSeoCacheVersion(): number {
  return version;
}
