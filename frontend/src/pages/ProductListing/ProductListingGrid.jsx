import React from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { FilterPanel, Pagination, EmptyState, ErrorState } from '../../components/ui';
import { ProductCard } from '../../components/shared/ProductCard';
import { scrollToShopAnchor } from './shopScrollAnchor';

export const ProductListingGrid = React.memo(
  ({
    filterGroups,
    filters,
    toggleFilter,
    setFilterValue,
    clearAllFilters,
    isFilterOpen,
    setIsFilterOpen,
    sortBy,
    setSortBy,
    totalCount,
    categories,
    categoryParam,
    handleCategorySelect,
    productsData,
    searchParam,
    loading,
    products,
    isFetching,
    isError,
    totalPages,
    pageParam,
    setSearchParams,
    searchParams,
    commitSearch,
    setLocalSearch,
    openQuickView,
    isNavbarHidden,
    navbarHeight,
  }) => {
    return (
      <main
        id="artisan-collection"
        className="max-w-max-width mx-auto px-margin-mobile lg:px-margin-desktop relative pb-8 lg:pb-24"
      >
        <div className="flex flex-col lg:flex-row gap-0 lg:gap-8 xl:gap-12">
          <aside className="w-full lg:w-64 xl:w-72 flex-shrink-0 lg:sticky lg:top-32 lg:max-h-[calc(100vh-140px)] lg:overflow-y-auto no-scrollbar pb-4">
            <FilterPanel
              filterGroups={filterGroups}
              currentFilters={filters}
              onToggleFilter={toggleFilter}
              onSetFilterValue={setFilterValue}
              onClearAll={clearAllFilters}
              isOpen={isFilterOpen}
              onClose={() => setIsFilterOpen(false)}
              sortBy={sortBy}
              onSortChange={setSortBy}
            />
          </aside>

          <div className="flex-1 min-w-0">
            <div className="hidden lg:flex items-center justify-between mb-6 pb-4 border-b border-outline-variant/15">
              <div>
                <h1 className="font-display text-[26px] xl:text-[30px] font-extrabold text-[#283618]">
                  {searchParam ? (
                    <>
                      Results for <span>"{searchParam}"</span>
                    </>
                  ) : categoryParam === 'All' ? (
                    'Shop'
                  ) : (
                    categoryParam
                  )}
                </h1>
                <div className="flex items-center gap-2 mt-0.5 text-on-surface-variant/70 font-medium text-body-sm flex-wrap">
                  <span>
                    <span className="font-semibold text-on-surface">{totalCount}</span>{' '}
                    {totalCount === 1 ? 'item' : 'items'}{' '}
                    {categoryParam !== 'All' && !searchParam
                      ? `in ${categoryParam}`
                      : searchParam
                        ? categoryParam !== 'All'
                          ? `found in ${categoryParam}`
                          : 'found'
                        : 'in the kitchen'}
                  </span>
                </div>
              </div>
              {searchParam && (
                <button
                  type="button"
                  onClick={() => {
                    if (commitSearch) commitSearch('');
                    else if (setLocalSearch) setLocalSearch('');
                  }}
                  className="text-[12px] text-primary hover:underline font-semibold cursor-pointer"
                >
                  Clear search
                </button>
              )}
            </div>

            {/* Unified Results & Search State Indicator */}
            <div className="lg:hidden mb-4 px-1 flex items-center justify-between text-[12px] font-medium text-on-surface-variant/80 animate-fade-in gap-2">
              <div className="flex items-center gap-2 flex-wrap min-w-0">
                <span className="inline-flex items-center justify-center font-bold text-black bg-[#f7bb0e] px-2.5 h-[24px] rounded-full text-[12px] leading-none shadow-xs shrink-0">
                  {totalCount} {totalCount === 1 ? 'item' : 'items'}
                </span>

                {searchParam ? (
                  <span className="truncate max-w-[210px]">
                    for <strong className="text-on-surface font-semibold">"{searchParam}"</strong>
                    {categoryParam !== 'All' && (
                      <>
                        {' '}
                        in <strong className="text-primary font-semibold">{categoryParam}</strong>
                      </>
                    )}
                  </span>
                ) : categoryParam !== 'All' ? (
                  <span>
                    in <strong className="text-on-surface font-semibold">{categoryParam}</strong>
                  </span>
                ) : (
                  <span>in the kitchen</span>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0 ml-auto">
                {searchParam && (
                  <button
                    type="button"
                    onClick={() => {
                      if (commitSearch) commitSearch('');
                      else if (setLocalSearch) setLocalSearch('');
                    }}
                    className="text-[11px] text-primary underline font-semibold cursor-pointer"
                  >
                    Clear search
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setIsFilterOpen(true)}
                  aria-label="Open filters"
                  title="Filters"
                  className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-[#283618] hover:bg-[#1f2b13] text-white flex items-center justify-center shadow-xs transition-transform active:scale-95 shrink-0 cursor-pointer"
                >
                  <SlidersHorizontal size={18} strokeWidth={2.2} />
                </button>
              </div>
            </div>

            <div id="product-results-wrapper" className="min-h-[60vh]">
              {isError ? (
                <ErrorState
                  title="Failed to load products"
                  description="We encountered a network error while fetching products. If you use an adblocker or VPN, it might be blocking the request."
                  onRetry={() => window.location.reload()}
                />
              ) : loading ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-3 gap-x-2 sm:gap-x-4 lg:gap-x-8 gap-y-6 sm:gap-y-8 lg:gap-y-12">
                  {[...Array(6)].map((_, i) => (
                    <ProductCard key={i} loading={true} />
                  ))}
                </div>
              ) : products.length > 0 ? (
                <>
                  <div
                    className={`grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-3 gap-x-2 sm:gap-x-4 lg:gap-x-8 gap-y-6 sm:gap-y-8 lg:gap-y-12 transition-opacity duration-300 ${isFetching ? 'opacity-40 pointer-events-none' : 'opacity-100'}`}
                  >
                    {products.map((product, index) => (
                      <ProductCard
                        key={product.id || product._id}
                        {...product}
                        eager={index < 4}
                        onQuickView={openQuickView}
                      />
                    ))}
                  </div>

                  {totalPages > 1 && (
                    <div className="mt-16 text-center">
                      <span className="font-label-sm text-[11px] text-on-surface uppercase tracking-[0.3em] font-bold block mb-4">
                        Showing Page {pageParam} of {totalPages}
                      </span>
                      <Pagination
                        currentPage={pageParam}
                        totalPages={totalPages}
                        onPageChange={(page) => {
                          setSearchParams((prev) => {
                            const params = new URLSearchParams(prev);
                            if (page === 1) {
                              params.delete('page');
                            } else {
                              params.set('page', String(page));
                            }
                            return params;
                          });
                          setTimeout(() => {
                            scrollToShopAnchor({ smooth: true });
                          }, 50);
                        }}
                      />
                    </div>
                  )}
                </>
              ) : (
                <EmptyState
                  title="No products found"
                  description="Nothing matches these filters right now. Try another category or clear the filters."
                  icon="filter_list_off"
                  actionLabel="Clear All Filters"
                  onAction={clearAllFilters}
                />
              )}
            </div>
          </div>
        </div>
      </main>
    );
  },
);
