/**
 * Pure helpers for the server-side SEO renderer (api/seo-render.js).
 * Files under api/_lib are not deployed as functions by Vercel.
 */

export const HEAD_START = '<!--seo:head-->';
export const HEAD_END = '<!--/seo:head-->';

/** Paths that must never be indexed; served with an X-Robots-Tag header. */
export const PRIVATE_PATH_PREFIXES = [
  '/admin',
  '/dashboard',
  '/cart',
  '/checkout',
  '/wishlist',
  '/track',
  '/order-success',
  '/accept-invite',
  '/invoice-preview',
];

export const isPrivatePath = (pathname) =>
  PRIVATE_PATH_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));

export const escapeAttr = (value) =>
  String(value ?? '').replace(/[&<>"']/g, (c) =>
    c === '&' ? '&amp;' : c === '<' ? '&lt;' : c === '>' ? '&gt;' : c === '"' ? '&quot;' : '&#39;',
  );

/** JSON-LD safe for inline <script>: neutralise "</script>" and HTML comment openers. */
export const serializeJsonLd = (obj) =>
  JSON.stringify(obj).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026');

const meta = (attr, key, content) =>
  content === undefined || content === null || content === ''
    ? ''
    : `<meta ${attr}="${escapeAttr(key)}" content="${escapeAttr(content)}" data-seo-ssr>`;

/**
 * Head markup for a page descriptor from GET /api/v1/seo/page.
 * Every tag carries data-seo-ssr so the SPA can drop them before
 * react-helmet-async takes over (avoids duplicate tags after hydration).
 */
export function renderHead(descriptor, { siteName = "Akula's Kitchen", verification } = {}) {
  const h = descriptor.head;
  const tags = [
    `<title data-seo-ssr>${escapeAttr(h.title)}</title>`,
    meta('name', 'description', h.description),
    meta('name', 'keywords', h.keywords),
    meta('name', 'robots', h.robots),
    h.canonical ? `<link rel="canonical" href="${escapeAttr(h.canonical)}" data-seo-ssr>` : '',
    meta('property', 'og:type', h.ogType),
    meta('property', 'og:site_name', siteName),
    meta('property', 'og:locale', 'en_IN'),
    meta('property', 'og:title', h.ogTitle),
    meta('property', 'og:description', h.ogDescription),
    meta('property', 'og:url', h.ogUrl),
    meta('property', 'og:image', h.ogImage),
    meta('property', 'og:image:secure_url', h.ogImage?.startsWith('https://') ? h.ogImage : ''),
    meta('property', 'og:image:type', h.ogImageType),
    meta('property', 'og:image:width', h.ogImageWidth),
    meta('property', 'og:image:height', h.ogImageHeight),
    meta('property', 'og:image:alt', h.ogImageAlt),
    meta('property', 'product:price:amount', h.productPrice),
    meta('property', 'product:price:currency', h.productPrice ? 'INR' : ''),
    meta('property', 'product:availability', h.productAvailability),
    meta('name', 'twitter:card', 'summary_large_image'),
    meta('name', 'twitter:title', h.ogTitle),
    meta('name', 'twitter:description', h.ogDescription),
    meta('name', 'twitter:image', h.ogImage),
    meta('name', 'twitter:image:alt', h.ogImageAlt),
    verification ? meta('name', 'google-site-verification', verification) : '',
    ...(descriptor.jsonLd || []).map(
      (ld) => `<script type="application/ld+json" data-seo-ssr>${serializeJsonLd(ld)}</script>`,
    ),
  ];
  return tags.filter(Boolean).join('\n    ');
}

/** Replace the marked default head block and seed #root with the crawlable shell. */
export function injectIntoTemplate(template, descriptor, options = {}) {
  let html = template;
  const start = html.indexOf(HEAD_START);
  const end = html.indexOf(HEAD_END);
  const head = renderHead(descriptor, options);
  if (start !== -1 && end > start) {
    html = `${html.slice(0, start + HEAD_START.length)}\n    ${head}\n    ${html.slice(end)}`;
  } else {
    html = html.replace('</head>', `    ${head}\n  </head>`);
  }
  if (descriptor.bodyHtml) {
    html = html.replace(
      /<div id="root">\s*<\/div>/,
      `<div id="root"><div data-seo-shell>${descriptor.bodyHtml}</div></div>`,
    );
  }
  return html;
}

/** Only the site-verification tag, for pages rendered from the plain template. */
export function injectVerification(template, verification) {
  if (!verification || template.includes('google-site-verification')) return template;
  return template.replace(
    '</head>',
    `    ${meta('name', 'google-site-verification', verification)}\n  </head>`,
  );
}

/** Rebuild the original request path from the rewrite's __path param + remaining query. */
export function originalPathFromRequest(reqUrl) {
  const url = new URL(reqUrl || '/', 'http://local');
  const raw = url.searchParams.get('__path') || url.pathname || '/';
  url.searchParams.delete('__path');
  const path = `/${raw.replace(/^\/+/, '')}`;
  const qs = url.searchParams.toString();
  return { pathname: path, path: qs ? `${path}?${qs}` : path };
}
