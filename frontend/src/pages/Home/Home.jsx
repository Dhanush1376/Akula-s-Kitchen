import { LayoutDashboard } from 'lucide-react';
import { useEffect, useRef, useCallback, Suspense } from 'react';
import { lazyWithRetry as lazy } from '../../utils/performance/lazyWithRetry';
import { SEO } from '../../components/seo/SEO';

import { EditorialHero } from './sections/EditorialHero';
import { HomeHeroLeaves } from './sections/HomeHeroLeaves';
import { FreshEveryDay } from './sections/FreshEveryDay';
import {
  HomeCategorySkeleton,
  HomeProductRowSkeleton,
  HomeProductGridSkeleton,
} from '../../components/ui/skeletons/HomeSkeleton';

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

const DEFAULT_HOMEPAGE_SECTIONS = [
  { id: 'hero_1', label: 'Hero Banner', isVisible: true },
  { id: 'categoryGrid_1', label: 'Category Grid', isVisible: true },
  { id: 'trendingProducts_1', label: 'Trending Products', isVisible: true },
  { id: 'featuredProducts_1', label: 'Featured Collection', isVisible: true },
  { id: 'recommendedProducts_1', label: 'Smart Recommendations', isVisible: true },
];

export function Home({ previewContent }) {
  const { storeName } = useConfig();
  const cms = useWebsiteContent();
  const activeCms = previewContent || cms;
  const loading = !previewContent && cms.loading;

  const isSectionVisible = useCallback(
    (id) => {
      const orderSection = activeCms?.homepageSections?.find((s) => s.id === id);
      if (orderSection && orderSection.isVisible !== undefined) {
        return orderSection.isVisible;
      }
      const baseId = id.split('_')[0];
      if (activeCms?.[baseId] && activeCms[baseId].isVisible !== undefined) {
        return activeCms[baseId].isVisible;
      }
      if (activeCms?.[id] && activeCms[id].isVisible !== undefined) {
        return activeCms[id].isVisible;
      }
      return true;
    },
    [activeCms],
  );

  const sections =
    Array.isArray(activeCms?.homepageSections) && activeCms.homepageSections.length > 0
      ? activeCms.homepageSections
      : DEFAULT_HOMEPAGE_SECTIONS;

  const visibleSections = sections.filter((s) => isSectionVisible(s.id));

  return (
    <>
      <SEO
        title={cms?.seo?.homeTitle || cms?.siteName || storeName || "Akula's Kitchen"}
        description={cms?.seo?.homeDescription}
      />

      <div className="h1-page relative bg-surface-bright overflow-hidden">
        <HomeHeroLeaves />
        <div className="relative z-10">
          {visibleSections.length === 0 && <HomepageEmptyState />}
          {visibleSections.map((section) => {
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
                  <div key={section.id}>
                    <Suspense fallback={<HomeCategorySkeleton />}>
                      <CategoryGrid previewContent={activeCms} />
                    </Suspense>
                    <div className="ak-section-divider" aria-hidden="true" />
                  </div>
                );
              case 'trendingProducts':
                return (
                  <div key={section.id}>
                    <Suspense
                      fallback={
                        <HomeProductRowSkeleton sectionClassName="h1-section !pt-4 lg:!pt-8 !pb-4 lg:!pb-8" />
                      }
                    >
                      <TrendingProducts previewContent={activeCms} />
                    </Suspense>
                    <FreshEveryDay />
                  </div>
                );
              case 'featuredProducts':
                return (
                  <div key={section.id}>
                    <Suspense fallback={<HomeProductRowSkeleton />}>
                      <BestSellers previewContent={activeCms} />
                    </Suspense>
                    <div className="ak-section-divider" aria-hidden="true" />
                  </div>
                );
              case 'recommendedProducts':
                return (
                  <div key={section.id}>
                    <Suspense fallback={<HomeProductGridSkeleton />}>
                      <RecommendedGrid previewContent={activeCms} />
                    </Suspense>
                  </div>
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

function HomepageEmptyState() {
  return (
    <section className="min-h-[60vh] flex items-center justify-center px-6 text-center">
      <div className="max-w-xl w-full rounded-2xl border border-outline-variant/30 bg-surface/80 p-8 flex flex-col items-center justify-center text-center">
        <LayoutDashboard
          className="w-10 h-10 text-on-surface-variant/50 mb-4 mx-auto"
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
