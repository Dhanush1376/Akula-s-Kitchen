import { Helmet } from 'react-helmet-async';
import { useLocation } from 'react-router-dom';
import { useConfig } from '../../context/ConfigContext';
import { useWebsiteContent } from '../../hooks/useWebsiteContent';
import {
  SITE_URL,
  SITE_NAME,
  OG_IMAGE_URL,
  CONTACT_PHONE,
  buildSameAsLinks,
  TWITTER_HANDLE,
} from '../../constants/brandEnv';
import { getOptimizedUrl } from '../../utils/media/imageUtils';

const DEFAULT_DESCRIPTION =
  "Authentic flavors, premium quality, and exquisite culinary experiences by Akula's Kitchen.";
const DEFAULT_TITLE = "Akula's Kitchen — Authentic Flavors & Premium Culinary Experiences";
const priceValidUntilDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
  .toISOString()
  .split('T')[0];

/**
 * Normalize a URL path: strip trailing slashes (except root "/")
 */
function normalizeUrl(url) {
  if (!url || url === '/') return url;
  return url.replace(/\/+$/, '');
}

/**
 * Enterprise-grade SEO component with full Open Graph, Twitter Cards,
 * JSON-LD structured data, canonical URLs, and rich snippet support.
 */
export function SEO({
  title,
  description,
  keywords,
  ogImage,
  preloadImage,
  canonicalUrl,
  schema,
  ogType = 'website',
  noindex = false,
  article,
  product,
  breadcrumbs,
  faq,
}) {
  const location = useLocation();
  const { footer, contact, seo } = useWebsiteContent();
  const { storeSettings } = useConfig();

  const sameAs = buildSameAsLinks(footer?.socialLinks);
  const siteName = storeSettings?.general?.storeName?.trim() || SITE_NAME || "Akula's Kitchen";
  const siteUrl = SITE_URL || (typeof window !== 'undefined' ? window.location.origin : '');

  const locality = storeSettings?.contact?.city || '';
  const region = storeSettings?.contact?.state || 'Andhra Pradesh';
  const postalCode = storeSettings?.contact?.postalCode || '';
  const country = storeSettings?.contact?.country || 'India';
  const street = storeSettings?.contact?.address || contact?.address || '';
  const supportHoursStr = storeSettings?.contact?.supportHours || 'Mon - Sat, 10 AM to 6 PM';

  const parseOpeningHours = (hours) => {
    if (!hours) return 'Mo-Sa 10:00-18:00';
    if (/^[A-Za-z]{2}-[A-Za-z]{2}\s+\d{2}:\d{2}-\d{2}:\d{2}$/.test(hours.trim())) {
      return hours.trim();
    }
    const lower = hours.toLowerCase();
    let days = 'Mo-Sa';
    if (lower.includes('mon - sun') || lower.includes('mon-sun') || lower.includes('everyday')) {
      days = 'Mo-Su';
    } else if (lower.includes('mon - fri') || lower.includes('mon-fri')) {
      days = 'Mo-Fr';
    }
    return `${days} 10:00-18:00`;
  };

  const tagline = storeSettings?.general?.tagline?.trim();
  const defaultDesc = tagline
    ? `${tagline}. Experience authentic recipes, premium quality, and culinary excellence at ${siteName}.`
    : `Authentic flavors, premium quality, and exquisite culinary experiences by ${siteName}.`;
  const defaultTitle = tagline
    ? `${siteName} — ${tagline}`
    : `${siteName} — Authentic Flavors & Premium Culinary Experiences`;

  const settingsPhone = storeSettings?.contact?.phone || contact?.phone;
  const contactPhone = settingsPhone
    ? `+91-${String(settingsPhone).replace(/^\+91-?/, '')}`
    : CONTACT_PHONE;

  const globalSeoTitle = storeSettings?.storefront?.seoTitle || seo?.globalTitle;
  const globalSeoDesc = storeSettings?.storefront?.seoDescription || seo?.globalDescription;
  const globalSeoKeywords = seo?.globalKeywords;
  const globalSeoOgImage = seo?.ogImage;

  // Clean title to avoid a duplicated "| <store name>" suffix
  const escapedSiteName = String(siteName).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const cleanTitle = title
    ? title
        .replace(new RegExp(`\\s*\\|?\\s*${escapedSiteName}$`, 'i'), '')
        .replace(/\s*\|\s*Akula's Kitchen$/i, '')
        .trim()
    : '';

  const fullTitle = cleanTitle ? `${cleanTitle} | ${siteName}` : globalSeoTitle || defaultTitle;

  const metaDescription = description || globalSeoDesc || defaultDesc;
  const metaKeywords = keywords || globalSeoKeywords || '';
  const normalizedPath = normalizeUrl(location.pathname);
  const currentUrl = canonicalUrl || (siteUrl ? `${siteUrl}${normalizedPath}` : normalizedPath);
  const metaImage = ogImage || globalSeoOgImage || OG_IMAGE_URL;
  const metaImageType = metaImage.endsWith('.png')
    ? 'image/png'
    : metaImage.endsWith('.webp')
      ? 'image/webp'
      : 'image/jpeg';
  const organizationSchema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: siteName,
    url: siteUrl,
    logo: siteUrl ? `${siteUrl}/favicon.png` : undefined,
    description:
      tagline || 'Authentic flavors, premium recipes, and exquisite culinary experiences.',
    address: {
      '@type': 'PostalAddress',
      ...(street && { streetAddress: street }),
      addressLocality: locality,
      addressRegion: region,
      postalCode: postalCode,
      addressCountry: country === 'India' ? 'IN' : country,
    },
    ...(contactPhone && {
      contactPoint: {
        '@type': 'ContactPoint',
        telephone: contactPhone,
        contactType: 'customer service',
        availableLanguage: ['English', 'Telugu', 'Hindi'],
      },
    }),
    ...(sameAs.length > 0 && { sameAs }),
  };

  const localBusinessSchema = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: siteName,
    image: OG_IMAGE_URL || metaImage,
    url: siteUrl,
    telephone: contactPhone,
    description:
      tagline ||
      "Authentic flavors, premium quality, and exquisite culinary experiences by Akula's Kitchen.",
    address: {
      '@type': 'PostalAddress',
      ...(street && { streetAddress: street }),
      addressLocality: locality,
      addressRegion: region,
      postalCode: postalCode,
      addressCountry: country === 'India' ? 'IN' : country,
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: 15.5057,
      longitude: 80.0499,
    },
    priceRange: '₹₹',
    openingHours: parseOpeningHours(supportHoursStr),
    ...(sameAs.length > 0 && { sameAs }),
  };

  const breadcrumbSchema = breadcrumbs
    ? {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: breadcrumbs.map((item, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          name: item.name,
          item: item.url && siteUrl ? `${siteUrl}${item.url}` : undefined,
        })),
      }
    : null;

  const priceValidUntil = priceValidUntilDate;

  const productSchema = product
    ? {
        '@context': 'https://schema.org/',
        '@type': 'Product',
        name: product.name,
        image: product.images || [product.image],
        description: product.description,
        sku: product.sku,
        brand: {
          '@type': 'Brand',
          name: siteName,
        },
        offers: {
          '@type': 'Offer',
          url: currentUrl,
          priceCurrency: 'INR',
          price: product.price,
          priceValidUntil: priceValidUntil,
          itemCondition: 'https://schema.org/NewCondition',
          availability: product.inStock
            ? 'https://schema.org/InStock'
            : 'https://schema.org/OutOfStock',
          seller: {
            '@type': 'Organization',
            name: siteName,
          },
          shippingDetails: {
            '@type': 'OfferShippingDetails',
            shippingDestination: {
              '@type': 'DefinedRegion',
              addressCountry: 'IN',
            },
          },
        },
        ...(product.rating && {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: product.rating,
            reviewCount: product.reviewCount || 1,
            bestRating: 5,
            worstRating: 1,
          },
        }),
      }
    : null;

  const faqSchema = faq
    ? {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: faq.map((item) => ({
          '@type': 'Question',
          name: item.question,
          acceptedAnswer: {
            '@type': 'Answer',
            text: item.answer,
          },
        })),
      }
    : null;

  const websiteSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: siteName,
    url: siteUrl,
    ...(siteUrl && {
      potentialAction: {
        '@type': 'SearchAction',
        target: {
          '@type': 'EntryPoint',
          urlTemplate: `${siteUrl}/collections?search={search_term_string}`,
        },
        'query-input': 'required name=search_term_string',
      },
    }),
  };

  const isHomePage = normalizedPath === '' || normalizedPath === '/';

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={metaDescription} />
      {metaKeywords && <meta name="keywords" content={metaKeywords} />}
      {currentUrl && <link rel="canonical" href={currentUrl} />}
      <meta name="author" content={siteName} />

      {noindex ? (
        <meta name="robots" content="noindex, follow" />
      ) : (
        <meta
          name="robots"
          content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1"
        />
      )}

      <meta property="og:type" content={ogType} />
      {currentUrl && <meta property="og:url" content={currentUrl} />}
      <meta property="og:site_name" content={siteName} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={metaDescription} />
      {metaImage && <meta property="og:image" content={metaImage} />}
      {metaImage && <meta property="og:image:type" content={metaImageType} />}
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta
        property="og:image:alt"
        content={
          title
            ? `${title} — ${siteName}`
            : `${siteName} — Authentic Flavors & Premium Culinary Experiences`
        }
      />
      <meta property="og:locale" content="en_IN" />

      <meta name="twitter:card" content="summary_large_image" />
      {TWITTER_HANDLE && <meta name="twitter:site" content={TWITTER_HANDLE} />}
      {TWITTER_HANDLE && <meta name="twitter:creator" content={TWITTER_HANDLE} />}
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={metaDescription} />
      {metaImage && <meta name="twitter:image" content={metaImage} />}
      <meta
        name="twitter:image:alt"
        content={
          title
            ? `${title} — ${siteName}`
            : `${siteName} — Authentic Flavors & Premium Culinary Experiences`
        }
      />

      {article && (
        <>
          <meta property="article:published_time" content={article.publishedTime} />
          <meta property="article:modified_time" content={article.modifiedTime} />
          <meta property="article:author" content={article.author || siteName} />
        </>
      )}

      <meta name="theme-color" content="#F7BB0E" />
      <meta name="msapplication-TileColor" content="#F7BB0E" />

      {currentUrl && <link rel="alternate" hrefLang="en-in" href={currentUrl} />}
      {currentUrl && <link rel="alternate" hrefLang="x-default" href={currentUrl} />}
      {preloadImage && <link rel="preload" as="image" href={getOptimizedUrl(preloadImage)} />}

      <script type="application/ld+json">{JSON.stringify(organizationSchema)}</script>
      <script type="application/ld+json">{JSON.stringify(websiteSchema)}</script>
      {isHomePage && (
        <>
          <script type="application/ld+json">{JSON.stringify(localBusinessSchema)}</script>
          <script type="application/ld+json">
            {JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'ItemList',
              itemListElement: [
                {
                  '@type': 'SiteNavigationElement',
                  position: 1,
                  name: 'Shop',
                  url: `${siteUrl}/collections`,
                },
                {
                  '@type': 'SiteNavigationElement',
                  position: 2,
                  name: 'Contact',
                  url: `${siteUrl}/contact`,
                },
              ],
            })}
          </script>
        </>
      )}
      {schema && <script type="application/ld+json">{JSON.stringify(schema)}</script>}
      {breadcrumbSchema && (
        <script type="application/ld+json">{JSON.stringify(breadcrumbSchema)}</script>
      )}
      {productSchema && <script type="application/ld+json">{JSON.stringify(productSchema)}</script>}
      {faqSchema && <script type="application/ld+json">{JSON.stringify(faqSchema)}</script>}
    </Helmet>
  );
}
