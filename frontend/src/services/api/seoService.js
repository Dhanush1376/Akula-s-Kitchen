import api from '../api';

export const seoService = {
  /** Server-resolved page metadata/copy (same data the crawler HTML is built from). */
  getPage: async (path) => {
    const response = await api.get('/seo/page', { params: { path } });
    return response.data?.data ?? null;
  },
  /** Admin: check a product slug; returns availability and a free suggestion. */
  checkSlug: async (slug, excludeId) => {
    const response = await api.get('/seo/admin/slug-check', { params: { slug, excludeId } });
    return response.data?.data;
  },
  /** Admin: generated defaults + resolved SEO + JSON-LD for a draft product. */
  previewProduct: async (product) => {
    const response = await api.post('/seo/admin/product-preview', { product });
    return response.data?.data;
  },
};

export default seoService;
