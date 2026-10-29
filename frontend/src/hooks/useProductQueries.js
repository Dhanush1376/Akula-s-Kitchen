import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { productService } from '../services/domainServices';

export function useProducts(params, options = {}) {
  return useQuery({
    queryKey: ['products', params],
    queryFn: async () => {
      const res = await productService.getAll(params);
      return res.success ? res.data : res;
    },
    placeholderData: keepPreviousData,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    ...options,
  });
}

export function useDynamicFilters(params, options = {}) {
  return useQuery({
    queryKey: ['products-filters', params],
    queryFn: async () => {
      const res = await productService.getDynamicFilters(params);
      return res.success ? res.data : res;
    },
    placeholderData: keepPreviousData,
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    ...options,
  });
}

export function useProduct(id, options = {}) {
  const {
    enabled = true,
    staleTime = 5 * 60 * 1000,
    gcTime = 30 * 60 * 1000,
    ...restOptions
  } = options;
  return useQuery({
    queryKey: ['product', id],
    queryFn: async () => {
      const res = await productService.getById(id);
      return res.success ? res.data : res;
    },
    enabled: Boolean(id) && enabled,
    staleTime,
    gcTime,
    ...restOptions,
  });
}

export function useCategories(options = {}) {
  const {
    enabled = true,
    staleTime = 10 * 60 * 1000,
    gcTime = 60 * 60 * 1000,
    ...restOptions
  } = options;
  return useQuery({
    queryKey: ['product_categories'],
    queryFn: async () => {
      try {
        const res = await productService.getCategories();
        const raw = res?.success && res.data ? res.data : Array.isArray(res) ? res : [];
        const list = Array.isArray(raw)
          ? raw.map((c) => (typeof c === 'string' ? c : c?.name)).filter(Boolean)
          : [];
        if (list.length > 0) return list;
      } catch (err) {
        // Fallback to active categories endpoint
      }

      try {
        const activeRes = await productService.getActiveCategories();
        const raw = activeRes?.data || activeRes;
        if (Array.isArray(raw)) {
          return raw.map((c) => (typeof c === 'string' ? c : c?.name)).filter(Boolean);
        }
      } catch (err) {
        // Ignore fallback error
      }
      return [];
    },
    enabled,
    staleTime,
    gcTime,
    ...restOptions,
  });
}

const CATEGORIES_CACHE_KEY = 'akula_active_categories_v2';

const getStoredCategories = () => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const saved = window.localStorage.getItem(CATEGORIES_CACHE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    }
  } catch {}
  return [];
};

export function useActiveCategories(options = {}) {
  const {
    enabled = true,
    staleTime = 10 * 60 * 1000,
    gcTime = 60 * 60 * 1000,
    ...restOptions
  } = options;
  return useQuery({
    queryKey: ['active_database_categories'],
    queryFn: async () => {
      try {
        const res = await productService.getActiveCategories();
        const raw = res?.data || res;
        if (Array.isArray(raw)) {
          const valid = raw.filter((c) => c && c.isActive !== false && !c.isDeleted);
          if (valid.length > 0) {
            try {
              if (typeof window !== 'undefined' && window.localStorage) {
                window.localStorage.setItem(CATEGORIES_CACHE_KEY, JSON.stringify(valid));
              }
            } catch {}
            return valid;
          }
        }
      } catch {
        // Fallback to stored categories on network error
      }
      return getStoredCategories();
    },
    placeholderData: (previousData) => previousData || getStoredCategories(),
    enabled,
    staleTime,
    gcTime,
    ...restOptions,
  });
}

export function useProductMutations() {
  const queryClient = useQueryClient();

  const toggleFeaturedMutation = useMutation({
    mutationFn: async (id) => productService.toggleFeatured(id),
    onSuccess: (data, id) => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['product', id] });
    },
  });

  return {
    toggleFeatured: toggleFeaturedMutation.mutateAsync,
    isTogglingFeatured: toggleFeaturedMutation.isPending,
  };
}
