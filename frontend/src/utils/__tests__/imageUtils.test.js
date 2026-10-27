import { describe, it, expect } from 'vitest';
import { getOptimizedUrl, getSrcSet } from '../media/imageUtils';

const CLD =
  'https://res.cloudinary.com/demo/image/upload/v1793123121/akulas-kitchen/products/abc123.jpg';

const parseSrcSet = (srcSet) =>
  srcSet.split(', ').map((entry) => {
    const [url, descriptor] = entry.split(' ');
    return { url, width: Number(descriptor.replace('w', '')) };
  });

describe('Product card image delivery', () => {
  it('requests a width-limited, auto-format, auto-quality Cloudinary variant by default', () => {
    const url = getOptimizedUrl(CLD, 800, 1000);
    expect(url).toContain('/upload/w_800,c_limit');
    expect(url).toContain('f_auto');
    expect(url).toMatch(/q_auto/);
    expect(url).toContain('/v1793123121/akulas-kitchen/products/abc123.jpg');
  });

  it('builds a srcset whose labels match the width actually served, without duplicates', () => {
    const entries = parseSrcSet(getSrcSet(CLD, 800));
    const urls = entries.map((e) => e.url);
    expect(new Set(urls).size).toBe(urls.length);
    for (const { url, width } of entries) {
      expect(url).toContain(`/upload/w_${width},c_limit`);
      expect(url).toContain('f_auto');
    }
    // A phone (375 px wide, DPR 3, card = 50vw) needs ~562 px: a 640 px candidate must exist.
    expect(entries.some((e) => e.width === 640)).toBe(true);
  });

  it("still serves the raw file only when 'original' is explicitly requested", () => {
    expect(getOptimizedUrl(CLD, 800, 1000, 'original')).toBe(CLD);
  });

  it('leaves non-Cloudinary images untouched and adds no srcset', () => {
    const local = '/uploads/akulas-kitchen/products/x.webp';
    expect(getOptimizedUrl(local, 800, 1000)).toBe(local);
    expect(getSrcSet(local, 800)).toBeNull();
  });
});
