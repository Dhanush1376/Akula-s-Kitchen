import { useState, useMemo, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useProducts, useCategories, useDynamicFilters } from '../../hooks/useProductQueries';
import { persistentStorage } from '../../utils/storage/persistentStorage';
import { scrollToShopAnchor } from './shopScrollAnchor';

export function useProductListingState() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const categoryParam = searchParams.get('category') || 'All';
  const collectionParam = searchParams.get('collection') || undefined;
  const searchParam = searchParams.get('search') || '';
  const pageParam = parseInt(searchParams.get('page') || '1', 10);
  const idsParam = searchParams.get('ids') || undefined;

  const [localSearch, setLocalSearch] = useState(searchParam);
  const [sortBy, setSortBy] = useState(() => {
    return persistentStorage.getItem('akula_sort_preference', { fallback: 'New Arrivals' });
  });
  const [filters, setFilters] = useState(() => {
    const saved = persistentStorage.getItem('akula_product_filters');
    if (saved && typeof saved === 'object') {
      return saved;
    }
    return {};
  });

  useEffect(() => {
    persistentStorage.setItem('akula_sort_preference', sortBy);
  }, [sortBy]);

  useEffect(() => {
    persistentStorage.setItem('akula_product_filters', filters);
  }, [filters]);

  // Sync external searchParam into localSearch
  useEffect(() => {
    setLocalSearch(searchParam);
  }, [searchParam]);

  // Fast debounce (180ms) for typing into URL searchParams
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localSearch !== searchParam) {
        setSearchParams(
          (prev) => {
            const next = new URLSearchParams(prev);
            if (localSearch) next.set('search', localSearch);
            else next.delete('search');
            next.delete('page');
            return next;
          },
          { replace: true },
        );
      }
    }, 180);
    return () => clearTimeout(timer);
  }, [localSearch, searchParam, setSearchParams]);

  // Immediate commit for explicit submissions
  const commitSearch = useCallback(
    (query) => {
      setLocalSearch(query);
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (query) next.set('search', query);
          else next.delete('search');
          next.delete('page');
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  // Prepare Query Params for Product Query Hook
  const queryParams = useMemo(() => {
    const params = {
      page: pageParam,
      limit: 12,
    };

    if (categoryParam !== 'All') {
      params.category = categoryParam;
    }
    if (collectionParam) {
      params.collection = collectionParam;
    }
    if (searchParam) {
      params.search = searchParam;
    }
    if (idsParam) {
      params.ids = idsParam;
    }

    // Sort Mapping
    switch (sortBy) {
      case 'Price: Low to High':
        params.sort = 'price_asc';
        break;
      case 'Price: High to Low':
        params.sort = 'price_desc';
        break;
      case 'Customer Rating':
        params.sort = 'rating';
        break;
      case 'Featured':
        params.sort = 'featured';
        break;
      case 'New Arrivals':
      default:
        params.sort = 'newest';
        break;
    }

    // Filter Mappings
    Object.entries(filters).forEach(([key, values]) => {
      if (Array.isArray(values) && values.length > 0) {
        params[key] = values.join(',');
      }
    });

    return params;
  }, [categoryParam, collectionParam, searchParam, pageParam, sortBy, filters, idsParam]);

  const { data: productsData, isLoading: loading, isFetching, isError } = useProducts(queryParams);
  const { data: filterGroups = [] } = useDynamicFilters(queryParams);
  const { data: categoriesData = [] } = useCategories();

  const categories = useMemo(() => {
    return ['All', ...categoriesData];
  }, [categoriesData]);

  const products = useMemo(() => {
    return productsData?.data || productsData?.products || [];
  }, [productsData]);

  const totalPages = productsData?.totalPages || 1;
  const totalCount = productsData?.totalCount || 0;

  const handleCategorySelect = useCallback(
    (cat) => {
      setSearchParams(
        (prev) => {
          const params = new URLSearchParams(prev);
          if (cat === 'All') {
            params.delete('category');
          } else {
            params.set('category', cat);
          }
          params.delete('page');
          return params;
        },
        { replace: true },
      );

      setTimeout(() => {
        scrollToShopAnchor({ smooth: true });
      }, 50);
    },
    [setSearchParams],
  );

  const toggleFilter = useCallback((type, value) => {
    setFilters((prev) => {
      const current = prev[type] || [];
      const updated = current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value];

      if (updated.length === 0) {
        const next = { ...prev };
        delete next[type];
        return next;
      }
      return { ...prev, [type]: updated };
    });
  }, []);

  const setFilterValue = useCallback((type, value) => {
    setFilters((prev) => {
      if (value === null || value === undefined || value === '') {
        const newFilters = { ...prev };
        delete newFilters[type];
        return newFilters;
      }
      return { ...prev, [type]: Array.isArray(value) ? value : [value] };
    });
  }, []);

  const clearAllFilters = useCallback(() => {
    setFilters({});
    setSearchParams({});
  }, [setSearchParams]);

  return useMemo(
    () => ({
      searchParams,
      setSearchParams,
      navigate,
      categoryParam,
      searchParam,
      pageParam,
      localSearch,
      setLocalSearch,
      sortBy,
      setSortBy,
      filters,
      toggleFilter,
      setFilterValue,
      clearAllFilters,
      productsData,
      loading,
      isFetching,
      isError,
      filterGroups,
      categories,
      products,
      totalPages,
      totalCount,
      handleCategorySelect,
      commitSearch,
    }),
    [
      searchParams,
      setSearchParams,
      navigate,
      categoryParam,
      searchParam,
      pageParam,
      localSearch,
      setLocalSearch,
      commitSearch,
      sortBy,
      setSortBy,
      filters,
      toggleFilter,
      setFilterValue,
      clearAllFilters,
      productsData,
      loading,
      isFetching,
      isError,
      filterGroups,
      categories,
      products,
      totalPages,
      totalCount,
      handleCategorySelect,
    ],
  );
}
