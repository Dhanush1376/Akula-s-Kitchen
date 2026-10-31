import { Link, Navigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { SEO } from '../components/seo/SEO';
import { ProductCard } from '../components/shared/ProductCard';
import { useProducts, useCategories } from '../hooks/useProductQueries';
import { seoService } from '../services/domainServices';
import { getCategoryRoute } from '../utils/ecommerce/productRouteUtils';
import { NotFound } from './NotFound';

const getList = (data) =>
  data?.data || data?.products || data?.items || (Array.isArray(data) ? data : []);

/**
 * Category landing page (/category/:slug). Heading, intro copy, title,
 * description, canonical and JSON-LD come from the backend page descriptor —
 * the same data the server renderer puts in the crawler HTML — so the two
 * can never disagree.
 */
export function CategoryPage() {
  const { slug = '' } = useParams();
  const path = `/category/${slug}`;

  const { data: descriptor, isPending } = useQuery({
    queryKey: ['seo-page', path],
    queryFn: () => seoService.getPage(path),
    staleTime: 5 * 60 * 1000,
  });

  const category = descriptor?.page?.category;
  const { data: productData, isPending: productsPending } = useProducts(
    { category: category?.name, limit: 60, sort: 'newest' },
    { enabled: Boolean(category?.name) },
  );
  const { data: categoryNames = [] } = useCategories();

  if (descriptor?.status === 301 && descriptor.redirect) {
    return <Navigate to={descriptor.redirect} replace />;
  }
  if (!isPending && (!descriptor || descriptor.status >= 400)) {
    return <NotFound />;
  }

  const products = getList(productData).filter((p) => p && p.isActive !== false);
  const heading = descriptor?.page?.heading || category?.name || '';
  const otherCategories = (Array.isArray(categoryNames) ? categoryNames : [])
    .map((c) => (typeof c === 'string' ? c : c?.name))
    .filter((name) => name && name.toLowerCase() !== category?.name?.toLowerCase());

  return (
    <div className="bg-surface min-h-screen pt-[calc(var(--ak-header-h,120px)+20px)] pb-[calc(var(--bottom-nav-height,65px)+3rem)] lg:pb-24">
      {descriptor?.head && (
        <SEO
          fullTitle={descriptor.head.title}
          description={descriptor.head.description}
          canonicalUrl={descriptor.head.canonical}
          robots={descriptor.head.robots}
          ogImage={descriptor.head.ogImage}
          ogImageWidth={descriptor.head.ogImageWidth}
          ogImageHeight={descriptor.head.ogImageHeight}
          ogImageAlt={descriptor.head.ogImageAlt}
          schema={descriptor.jsonLd}
        />
      )}

      <div className="max-w-max-width mx-auto px-margin-mobile lg:px-margin-desktop">
        <nav
          aria-label="Breadcrumb"
          className="flex items-center gap-2 text-[10.5px] uppercase tracking-[0.18em] text-neutral-400 font-bold mb-5"
        >
          <Link to="/" className="hover:text-neutral-950 transition-colors">
            Home
          </Link>
          <span className="text-neutral-300">/</span>
          <Link to="/collections" className="hover:text-neutral-950 transition-colors">
            Shop
          </Link>
          <span className="text-neutral-300">/</span>
          <span className="text-neutral-950 font-extrabold">{category?.name || '…'}</span>
        </nav>

        <header className="max-w-3xl mb-8 lg:mb-12">
          <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-[#283618] mb-3">
            {heading || <span className="inline-block h-10 w-64 rounded-lg bg-neutral-100" />}
          </h1>
          {descriptor?.page?.intro && (
            <p className="text-[15px] leading-relaxed text-[#4b5563]">{descriptor.page.intro}</p>
          )}
        </header>

        {isPending || (category && productsPending) ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-x-2 sm:gap-x-4 lg:gap-x-8 gap-y-6 sm:gap-y-8 lg:gap-y-12">
            {[...Array(6)].map((_, i) => (
              <ProductCard key={i} loading />
            ))}
          </div>
        ) : products.length > 0 ? (
          <section aria-label={`${category?.name} products`}>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-x-2 sm:gap-x-4 lg:gap-x-8 gap-y-6 sm:gap-y-8 lg:gap-y-12">
              {products.map((product, index) => (
                <ProductCard key={product._id || product.id} {...product} eager={index < 4} />
              ))}
            </div>
          </section>
        ) : (
          <p className="py-12 text-[#4b5563]">
            Nothing is available in this category right now.{' '}
            <Link to="/collections" className="underline font-semibold">
              Browse all products
            </Link>
            .
          </p>
        )}

        {otherCategories.length > 0 && (
          <nav aria-label="Other categories" className="mt-14 border-t border-neutral-200 pt-8">
            <h2 className="text-[11px] font-bold uppercase tracking-[0.18em] text-neutral-500 mb-4">
              More categories
            </h2>
            <ul className="flex flex-wrap gap-2">
              {otherCategories.map((name) => (
                <li key={name}>
                  <Link
                    to={getCategoryRoute(name)}
                    className="inline-flex items-center rounded-full border border-neutral-200 px-4 py-2 text-[13px] font-semibold text-[#283618] hover:border-[#283618] transition-colors"
                  >
                    {name}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        )}
      </div>
    </div>
  );
}
