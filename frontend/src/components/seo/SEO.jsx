import { Helmet } from 'react-helmet-async';
import { useLocation } from 'react-router-dom';
import { useConfig } from '../../context/ConfigContext';
import { useWebsiteContent } from '../../hooks/useWebsiteContent';
import { SITE_URL, SITE_NAME, OG_IMAGE_URL, TWITTER_HANDLE } from '../../constants/brandEnv';
import { getOptimizedUrl } from '../../utils/media/imageUtils';

export const DEFAULT_TITLE = "Akula's Kitchen | Fresh • Tasty • Healthy";
export const DEFAULT_DESCRIPTION =
  'Fresh, homemade idli & dosa batters, authentic traditional pickles, and delicious podis delivered fresh to your doorstep. Fresh • Tasty • Healthy.';
export const DEFAULT_KEYWORDS =
  "dosa batter, idli batter, fresh batter, homemade pickles, tomato pickle, gongura pickle, podi, karam podi, south indian food, breakfast batter, akula's kitchen";

const INDEX_ROBOTS = 'index, follow, max-image-preview:large';
const NOINDEX_ROBOTS = 'noindex, follow';

/** Strip trailing slashes (except root) so every page has one canonical form. */
function normalizePath(path) {
  if (!path || path === '/') return '/';
  return path.replace(/\/+$/, '');
}

const imageTypeOf = (url = '') =>
  /\.png($|\?)/i.test(url)
    ? 'image/png'
    : /\.webp($|\?)/i.test(url)
      ? 'image/webp'
      : /f_jpg|\.jpe?g($|\?)/i.test(url)
        ? 'image/jpeg'
        : undefined;

function buildSiteSchemas({ siteName, siteUrl, contact }) {
  const hasAddress = Boolean(contact.city || contact.address);
  const organization = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${siteUrl}/#organization`,
    name: siteName,
    url: `${siteUrl}/`,
    logo: `${siteUrl}/akulas-kitchen-logo.png`,
    ...(contact.email && { email: contact.email }),
    ...(contact.phone && { telephone: contact.phone }),
    // Address comes only from the store's own admin settings — never defaulted.
    ...(hasAddress && {
      address: {
        '@type': 'PostalAddress',
        ...(contact.address && { streetAddress: contact.address }),
        ...(contact.city && { addressLocality: contact.city }),
        ...(contact.state && { addressRegion: contact.state }),
        ...(contact.postalCode && { postalCode: contact.postalCode }),
        ...(contact.country && {
          addressCountry: contact.country === 'India' ? 'IN' : contact.country,
        }),
      },
    }),
    ...((contact.phone || contact.email) && {
      contactPoint: [
        {
          '@type': 'ContactPoint',
          contactType: 'customer service',
          ...(contact.phone && { telephone: contact.phone }),
          ...(contact.email && { email: contact.email }),
          areaServed: 'IN',
        },
      ],
    }),
    ...(contact.sameAs.length > 0 && { sameAs: contact.sameAs }),
  };
  const website = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${siteUrl}/#website`,
    name: siteName,
    url: `${siteUrl}/`,
    inLanguage: 'en-IN',
    publisher: { '@id': `${siteUrl}/#organization` },
  };
  return [organization, website];
}

/**
 * Page-level SEO: title, description, canonical, robots, Open Graph, Twitter
 * and JSON-LD. Pages pass their own values; `defaultsOnly` (used by layouts)
 * emits just site-wide fallbacks so no route ends up with duplicate canonicals
 * or JSON-LD. On Vercel the same tags are also server-rendered by
 * api/seo-render.js for crawlers that do not run JavaScript.
 */
export function SEO({
  title,
  fullTitle: fullTitleProp,
  description,
  keywords,
  ogImage,
  ogImageWidth,
  ogImageHeight,
  ogImageAlt,
  preloadImage,
  canonicalUrl,
  schema,
  ogType = 'website',
  noindex = false,
  robots,
  article,
  breadcrumbs,
  faq,
  defaultsOnly = false,
}) {
  const location = useLocation();
  const { seo } = useWebsiteContent();
  const { storeSettings } = useConfig();

  const siteName = storeSettings?.general?.storeName?.trim() || SITE_NAME || "Akula's Kitchen";
  const siteUrl = (
    SITE_URL || (typeof window !== 'undefined' ? window.location.origin : '')
  ).replace(/\/+$/, '');
  const path = normalizePath(location.pathname);
  const isHomePage = path === '/';

  const globalTitle = storeSettings?.storefront?.seoTitle || seo?.globalTitle;
  const globalDescription = storeSettings?.storefront?.seoDescription || seo?.globalDescription;

  // Avoid "Name | Akula's Kitchen | Akula's Kitchen" when callers include the brand.
  const escapedSiteName = String(siteName).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const cleanTitle = title
    ? String(title)
        .replace(new RegExp(`\\s*[|–-]\\s*${escapedSiteName}$`, 'i'), '')
        .trim()
    : '';
  const isBareBrand = cleanTitle.toLowerCase() === String(siteName).toLowerCase();
  const fullTitle =
    fullTitleProp ||
    (cleanTitle && !isBareBrand ? `${cleanTitle} | ${siteName}` : globalTitle || DEFAULT_TITLE);
  const metaDescription = description || globalDescription || DEFAULT_DESCRIPTION;
  const metaKeywords =
    keywords || storeSettings?.storefront?.seoKeywords || seo?.globalKeywords || DEFAULT_KEYWORDS;

  const canonical = canonicalUrl
    ? /^https?:\/\//i.test(canonicalUrl)
      ? canonicalUrl
      : `${siteUrl}${normalizePath(canonicalUrl)}`
    : `${siteUrl}${path === '/' ? '/' : path}`;
  const robotsContent = robots || (noindex ? NOINDEX_ROBOTS : INDEX_ROBOTS);

  const metaImage = ogImage || seo?.ogImage || OG_IMAGE_URL;
  const metaImageType = imageTypeOf(metaImage);
  const isDefaultImage = !ogImage;
  const imageAlt = ogImageAlt || (cleanTitle ? `${cleanTitle} — ${siteName}` : siteName);

  if (defaultsOnly) {
    return (
      <Helmet>
        <html lang="en-IN" />
        <title>{fullTitle}</title>
        <meta name="description" content={metaDescription} />
        <meta property="og:site_name" content={siteName} />
        <meta property="og:locale" content="en_IN" />
        <meta name="twitter:card" content="summary_large_image" />
        {TWITTER_HANDLE && <meta name="twitter:site" content={TWITTER_HANDLE} />}
      </Helmet>
    );
  }

  const contact = storeSettings?.contact || {};
  const siteSchemas = isHomePage
    ? buildSiteSchemas({
        siteName,
        siteUrl,
        contact: {
          phone: contact.phone || storeSettings?.general?.phone || '',
          email: contact.email || storeSettings?.general?.supportEmail || '',
          address: contact.address || '',
          city: contact.city || '',
          state: contact.state || '',
          postalCode: contact.postalCode || '',
          country: contact.country || '',
          sameAs: [contact.instagram, contact.facebook, contact.pinterest, contact.youtube].filter(
            (u) => typeof u === 'string' && /^https?:\/\//.test(u),
          ),
        },
      })
    : [];

  const breadcrumbSchema = breadcrumbs?.length
    ? {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: breadcrumbs.map((item, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          name: item.name,
          item: /^https?:\/\//.test(item.url || item.path || '')
            ? item.url || item.path
            : `${siteUrl}${item.url || item.path || ''}`,
        })),
      }
    : null;

  const faqSchema = faq?.length
    ? {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: faq.map((item) => ({
          '@type': 'Question',
          name: item.question,
          acceptedAnswer: { '@type': 'Answer', text: item.answer },
        })),
      }
    : null;

  const schemas = [
    ...siteSchemas,
    ...(Array.isArray(schema) ? schema : schema ? [schema] : []),
    ...(breadcrumbSchema ? [breadcrumbSchema] : []),
    ...(faqSchema ? [faqSchema] : []),
  ];

  return (
    <Helmet>
      <html lang="en-IN" />
      <title>{fullTitle}</title>
      <meta name="description" content={metaDescription} />
      <meta name="keywords" content={metaKeywords} />
      <meta name="robots" content={robotsContent} />
      <link rel="canonical" href={canonical} />

      <meta property="og:type" content={ogType} />
      <meta property="og:url" content={canonical} />
      <meta property="og:site_name" content={siteName} />
      <meta property="og:locale" content="en_IN" />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={metaDescription} />
      {metaImage && <meta property="og:image" content={metaImage} />}
      {metaImageType && <meta property="og:image:type" content={metaImageType} />}
      {(ogImageWidth || isDefaultImage) && (
        <meta property="og:image:width" content={String(ogImageWidth || 1200)} />
      )}
      {(ogImageHeight || isDefaultImage) && (
        <meta property="og:image:height" content={String(ogImageHeight || 630)} />
      )}
      <meta property="og:image:alt" content={imageAlt} />

      <meta name="twitter:card" content="summary_large_image" />
      {TWITTER_HANDLE && <meta name="twitter:site" content={TWITTER_HANDLE} />}
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={metaDescription} />
      {metaImage && <meta name="twitter:image" content={metaImage} />}
      <meta name="twitter:image:alt" content={imageAlt} />

      {article?.publishedTime && (
        <meta property="article:published_time" content={article.publishedTime} />
      )}
      {article?.modifiedTime && (
        <meta property="article:modified_time" content={article.modifiedTime} />
      )}

      {preloadImage && <link rel="preload" as="image" href={getOptimizedUrl(preloadImage)} />}

      {schemas.map((s, i) => (
        <script key={`ld-${i}`} type="application/ld+json">
          {JSON.stringify(s)}
        </script>
      ))}
    </Helmet>
  );
}
