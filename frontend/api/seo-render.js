/* global process */
import fs from 'fs';
import path from 'path';
import {
  injectIntoTemplate,
  injectVerification,
  isPrivatePath,
  originalPathFromRequest,
} from './_lib/seoHtml.js';

/**
 * Server-side SEO renderer for the SPA (Vercel serverless function).
 *
 * Every HTML navigation is rewritten here (see vercel.json). For public pages
 * it asks the backend for a page descriptor (GET /api/v1/seo/page) and injects
 * the page's title, meta, canonical, Open Graph/Twitter tags, JSON-LD and a
 * small crawlable content shell into the built index.html, so crawlers and
 * link-preview bots get real per-page metadata without running JavaScript.
 * All user agents receive the same HTML; React replaces the shell on mount.
 *
 * It also emits real HTTP semantics: 301 for moved URLs (ObjectId or retired
 * product slugs, legacy routes), 404/410 for missing or deleted products.
 *
 * Failure mode: if the backend is slow or down, the plain SPA shell is served
 * (status 200, not CDN-cached), exactly as before this function existed.
 */

const BACKEND_ORIGIN = (
  process.env.SEO_API_ORIGIN || 'https://akula-s-kitchen-23m5.onrender.com'
).replace(/\/+$/, '');
const SITE_NAME = process.env.VITE_SITE_NAME || "Akula's Kitchen";
const VERIFICATION = process.env.GOOGLE_SITE_VERIFICATION || '';
const DESCRIPTOR_TIMEOUT_MS = Number(process.env.SEO_RENDER_TIMEOUT_MS || 2500);

let cachedTemplate = null;

async function loadTemplate(req) {
  if (cachedTemplate) return cachedTemplate;
  try {
    // Written at build time by scripts/write-seo-template.mjs (bundled with the function).
    const mod = await import('./_lib/template.generated.js');
    if (mod?.default) return (cachedTemplate = mod.default);
  } catch {
    /* fall through */
  }
  for (const candidate of [
    path.join(process.cwd(), 'dist', 'index.html'),
    path.join(process.cwd(), 'index.html'),
  ]) {
    try {
      const html = fs.readFileSync(candidate, 'utf8');
      if (html.includes('id="root"') && html.includes('/assets/')) return (cachedTemplate = html);
    } catch {
      /* try next */
    }
  }
  // Last resort: the static file from this same deployment (served before rewrites).
  const proto = req.headers['x-forwarded-proto'] || 'https';
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const res = await fetch(`${proto}://${host}/index.html`);
  if (!res.ok) throw new Error(`template fetch failed: ${res.status}`);
  return (cachedTemplate = await res.text());
}

async function fetchDescriptor(pagePath) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DESCRIPTOR_TIMEOUT_MS);
  try {
    const res = await fetch(
      `${BACKEND_ORIGIN}/api/v1/seo/page?path=${encodeURIComponent(pagePath)}`,
      { signal: controller.signal, headers: { accept: 'application/json' } },
    );
    if (!res.ok) return { ok: false };
    const body = await res.json();
    return { ok: true, descriptor: body?.data ?? null };
  } catch {
    return { ok: false };
  } finally {
    clearTimeout(timer);
  }
}

function send(res, status, html, { cdnCache, noindex } = {}) {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  // Browsers always revalidate (new deployments must load new asset hashes);
  // Vercel's edge may briefly cache successful renders (purged on deploy).
  res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
  if (cdnCache) {
    res.setHeader('Vercel-CDN-Cache-Control', 'max-age=300, stale-while-revalidate=86400');
  }
  if (noindex) res.setHeader('X-Robots-Tag', 'noindex, follow');
  res.status(status).send(html);
}

export default async function handler(req, res) {
  const { pathname, path: pagePath } = originalPathFromRequest(req.url);
  let template;
  try {
    template = await loadTemplate(req);
  } catch (err) {
    console.error('[seo-render] template unavailable', err);
    return send(
      res,
      200,
      '<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Akula\'s Kitchen</title></head><body><div id="root"></div></body></html>',
    );
  }

  if (isPrivatePath(pathname)) {
    return send(res, 200, injectVerification(template, VERIFICATION), { noindex: true });
  }

  const { ok, descriptor } = await fetchDescriptor(pagePath);
  if (!ok) return send(res, 200, injectVerification(template, VERIFICATION));
  if (!descriptor) {
    return send(res, 200, injectVerification(template, VERIFICATION), { cdnCache: true });
  }

  if (descriptor.status === 301 && descriptor.redirect) {
    res.setHeader('Location', descriptor.redirect);
    res.setHeader('Vercel-CDN-Cache-Control', 'max-age=3600');
    return res.status(301).send('');
  }

  const html = injectIntoTemplate(template, descriptor, {
    siteName: SITE_NAME,
    verification: VERIFICATION,
  });
  return send(res, descriptor.status || 200, html, {
    cdnCache: true,
    noindex: descriptor.status >= 400,
  });
}
