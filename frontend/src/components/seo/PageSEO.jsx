import { useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { SEO } from './SEO';
import { seoService } from '../../services/domainServices';

/**
 * Renders the server-resolved SEO for the current URL (GET /api/v1/seo/page),
 * the same descriptor api/seo-render.js injects into crawler HTML. Until it
 * loads (or if the API is unreachable) the page's own fallback props are used.
 */
export function PageSEO({ fallback = {} }) {
  const location = useLocation();
  const path = `${location.pathname}${location.search}`;
  const { data } = useQuery({
    queryKey: ['seo-page', path],
    queryFn: () => seoService.getPage(path),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
  const head = data?.status === 200 ? data.head : null;
  if (!head) return <SEO {...fallback} />;
  return (
    <SEO
      fullTitle={head.title}
      description={head.description}
      canonicalUrl={head.canonical}
      robots={head.robots}
      ogImage={head.ogImage}
      ogImageWidth={head.ogImageWidth}
      ogImageHeight={head.ogImageHeight}
      ogImageAlt={head.ogImageAlt}
      schema={data.jsonLd}
    />
  );
}
