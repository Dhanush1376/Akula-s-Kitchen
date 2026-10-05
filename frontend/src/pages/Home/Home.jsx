import { LayoutDashboard } from 'lucide-react';
import { useEffect, useRef, useCallback, Suspense } from 'react';
import { lazyWithRetry as lazy } from '../../utils/performance/lazyWithRetry';
import { SEO } from '../../components/seo/SEO';

import { EditorialHero } from './sections/EditorialHero';
import { FreshEveryDay } from './sections/FreshEveryDay';
import { MadeFreshStrip } from './sections/MadeFreshStrip';
import { LazySection } from '../../components/ui/LazySection';

const CategoryGrid = lazy(() =>
  import('./sections/CategoryGrid').then((m) => ({ default: m.CategoryGrid })),
);
const TrendingProducts = lazy(() =>
  import('./sections/TrendingProducts').then((m) => ({ default: m.TrendingProducts })),
);
const BestSellers = lazy(() =>
  import('./sections/BestSellers').then((m) => ({ default: m.BestSellers })),
);
const RecommendedGrid = lazy(() =>
  import('./sections/RecommendedGrid').then((m) => ({ default: m.RecommendedGrid })),
);

import './home.css';
import { useWebsiteContent } from '../../hooks/useWebsiteContent';
import { useConfig } from '../../context/ConfigContext';

export function Home({ previewContent }) {
  const { storeName } = useConfig();
  const cms = useWebsiteContent({ includeDefaults: false });
  const activeCms = previewContent || cms;
  const loading = !previewContent && cms.loading;

  const isSectionVisible = useCallback(
    (id) => {
      const orderSection = activeCms?.homepageSections?.find((s) => s.id === id);
      if (orderSection && orderSection.isVisible !== undefined) {
        return orderSection.isVisible;
      }
      if (cms?.[id] && cms[id].isVisible !== undefined) {
        return cms[id].isVisible;
      }
      return true;
    },
    [cms, activeCms],
  );

  if (loading) {
    return <HomeSkeleton />;
  }

  const sections = activeCms?.homepageSections || [];

  return (
    <>
      <SEO
        title={cms?.seo?.homeTitle || cms?.siteName || storeName || "Akula's Kitchen"}
        description={cms?.seo?.homeDescription}
      />

      <div className="h1-page relative bg-surface-bright overflow-hidden">
        <div className="relative z-10">
          {sections.length === 0 && <HomepageEmptyState />}
          {sections.map((section) => {
            if (!isSectionVisible(section.id)) return null;
            const baseId = section.id.split('_')[0];

            switch (baseId) {
              case 'hero':
                return (
                  <div key={section.id}>
                    <EditorialHero previewContent={activeCms} />
                  </div>
                );
              case 'categoryGrid':
                return (
                  <RevealSection key={section.id}>
                    <Suspense fallback={<SectionFallback />}>
                      <CategoryGrid previewContent={activeCms} />
                    </Suspense>
                    <FreshEveryDay />
                  </RevealSection>
                );
              case 'trendingProducts':
                return (
                  <LazySection key={section.id} fallback={<SectionFallback />}>
                    <RevealSection>
                      <TrendingProducts previewContent={activeCms} />
                    </RevealSection>
                  </LazySection>
                );
              case 'featuredProducts':
                return (
                  <LazySection key={section.id} fallback={<SectionFallback />}>
                    <RevealSection>
                      <BestSellers previewContent={activeCms} />
                    </RevealSection>
                  </LazySection>
                );
              case 'recommendedProducts':
                return (
                  <LazySection key={section.id} fallback={<SectionFallback />}>
                    <RevealSection>
                      <MadeFreshStrip />
                      <RecommendedGrid previewContent={activeCms} />
                    </RevealSection>
                  </LazySection>
                );
              default:
                return null;
            }
          })}
        </div>
      </div>
    </>
  );
}

function HomeSkeleton() {
  return (
    <div className="h1-page relative bg-surface-bright overflow-hidden">
      {/* Hero Skeleton */}
      <div className="ak-today animate-pulse">
        <div className="ak-today__head">
          <div>
            <div className="h-3 w-32 rounded-full bg-surface-container-high mb-2" />
            <div className="h-8 w-52 rounded-lg bg-surface-container-high" />
          </div>
        </div>
        <div className="ak-today__grid">
          {[
            [260, 190],
            [200, 250],
          ].map((col, c) => (
            <div key={c} className="ak-today__col">
              {col.map((h, i) => (
                <div
                  key={i}
                  className="rounded-[18px] bg-surface-container-high"
                  style={{ height: h }}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Category Grid Skeleton */}
      <div className="ak-cats h1-container animate-pulse">
        <div className="h-7 w-52 bg-surface-container-high rounded-full mb-4" />
        <div className="ak-cats__grid">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="ak-cats__cell">
              <div className="ak-cats__tile bg-surface-container-high" />
            </div>
          ))}
        </div>
      </div>

      {/* Trending Products Skeleton */}
      <div className="max-w-[1400px] mx-auto px-6 mt-20 lg:mt-32 animate-pulse">
        <div className="flex justify-between items-end mb-8 lg:mb-10">
          <div>
            <div className="h-3 w-20 lg:w-24 bg-surface-container-high rounded-full mb-2"></div>
            <div className="h-8 lg:h-10 w-48 lg:w-64 bg-surface-container-high rounded-full"></div>
          </div>
          <div className="h-4 w-20 bg-surface-container-high rounded-full hidden lg:block"></div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-8">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex flex-col gap-4">
              <div className="w-full aspect-[3/4] bg-surface-container-high rounded-[24px] lg:rounded-[32px]"></div>
              <div className="px-1 lg:px-2">
                <div className="w-[80%] h-4 bg-surface-container-high rounded-full mb-2"></div>
                <div className="w-[60%] h-3 bg-surface-container-high rounded-full mb-3"></div>
                <div className="w-[40%] h-5 bg-surface-container-high rounded-full"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SectionFallback() {
  return (
    <div className="w-full max-w-[1400px] mx-auto px-6 py-20 animate-pulse">
      <div className="h-8 w-56 bg-surface-container-high rounded-full mb-10"></div>
      <div className="w-full h-64 bg-surface-container-high rounded-[32px]"></div>
    </div>
  );
}

function HomepageEmptyState() {
  return (
    <section className="min-h-[60vh] flex items-center justify-center px-6 text-center">
      <div className="max-w-xl rounded-2xl border border-outline-variant/30 bg-surface/80 p-8">
        <LayoutDashboard
          className="text-[40px] text-on-surface-variant/50 mb-4"
          strokeWidth={1.5}
        />
        <h1 className="font-display text-2xl text-on-surface mb-3">
          Homepage content is not published
        </h1>
        <p className="text-on-surface-variant text-sm leading-6">
          Publish the homepage layout and visible sections from Admin to render the storefront
          homepage.
        </p>
      </div>
    </section>
  );
}

/**
 * IntersectionObserver-based fade-in-up reveal wrapper.
 */
function RevealSection({ children, threshold = 0.05 }) {
  const ref = useRef(null);
  const handleIntersect = useCallback((entries, observer) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('h1-reveal--visible');
        observer.unobserve(entry.target);
      }
    });
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(handleIntersect, {
      rootMargin: '0px',
      threshold,
    });

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      el.classList.add('h1-reveal--visible');
      return;
    }

    observer.observe(el);
    return () => observer.disconnect();
  }, [handleIntersect, threshold]);

  return (
    <div ref={ref} className="h1-reveal relative z-10">
      {children}
    </div>
  );
}
