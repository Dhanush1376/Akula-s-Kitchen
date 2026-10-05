import { SlidersHorizontal } from 'lucide-react';
import React, { useRef, useEffect } from 'react';
import { CategoryTabs } from '../../components/ui';

export const ProductListingSortBar = ({
  isMobile,
  searchParam,
  localSearch,
  setLocalSearch,
  commitSearch,
  setIsFilterOpen,
  categories,
  categoryParam,
  handleCategorySelect,
  sortBy,
  setSortBy,
  isNavbarHidden,
  navbarHeight,
  setNavbarHeight,
  isStuck,
  setIsStuck,
}) => {
  const navRef = useRef(null);

  useEffect(() => {
    let ticking = false;
    const measure = () => {
      const topNav = document.querySelector('.top-navbar');
      if (topNav) {
        setNavbarHeight((prev) => {
          const current = topNav.getBoundingClientRect().height;
          return prev === current ? prev : current;
        });
      }

      if (navRef.current) {
        const rect = navRef.current.getBoundingClientRect();
        // Use the maximum sticky top value as a stable threshold to prevent background flashing during navbar transitions
        const maxThreshold = (navbarHeight || 68) + 2;
        setIsStuck(rect.top <= maxThreshold);
      }
    };

    const onScrollOrResize = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          measure();
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', onScrollOrResize, { passive: true });
    window.addEventListener('resize', onScrollOrResize, { passive: true });
    measure();
    return () => {
      window.removeEventListener('scroll', onScrollOrResize);
      window.removeEventListener('resize', onScrollOrResize);
    };
  }, [setNavbarHeight, setIsStuck, navbarHeight, isNavbarHidden]);

  return (
    <nav
      ref={navRef}
      id="product-listing-sort-bar"
      className="relative mt-0 mb-4 lg:mb-6 transition-all duration-300 ease-out px-3 lg:px-margin-desktop"
    >
      <div className="flex items-center justify-between gap-2 lg:gap-4 pointer-events-auto mx-auto bg-transparent border-none shadow-none px-2 py-1 w-full max-w-max-width">
        {/* Category Tabs: now visible across all viewports */}
        <div className="flex-1 overflow-hidden flex justify-start min-w-0">
          <CategoryTabs
            categories={categories}
            activeCategory={categoryParam}
            onCategoryChange={handleCategorySelect}
          />
        </div>

        {/* Right side controls: Filter icon button in olive green */}
        <div className="flex items-center shrink-0">
          <button
            onClick={() => setIsFilterOpen(true)}
            aria-label="Open filters"
            title="Filters"
            className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-[#283618] hover:bg-[#1f2b13] text-white flex items-center justify-center shadow-xs transition-transform active:scale-95 shrink-0 cursor-pointer"
          >
            <SlidersHorizontal size={18} strokeWidth={2.2} />
          </button>
        </div>
      </div>
    </nav>
  );
};
