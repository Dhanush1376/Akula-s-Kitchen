/**
 * Canonical storefront URL for a product. Prefers the SEO slug
 * (/product/mango-avakaaya); falls back to the id, which the storefront and
 * the server renderer redirect to the slug URL.
 *
 * Accepts a product object or a bare id/slug string.
 */
export const getProductRoute = (productOrId) => {
  if (productOrId && typeof productOrId === 'object') {
    const key = productOrId.slug || productOrId._id || productOrId.id || productOrId.productId;
    return `/product/${encodeURIComponent(String(key))}`;
  }
  return `/product/${encodeURIComponent(String(productOrId))}`;
};

/** Category landing page URL from a category object, slug or display name. */
export const getCategoryRoute = (category) => {
  const value =
    category && typeof category === 'object' ? category.slug || category.name : category || '';
  const slug = String(value)
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug ? `/category/${slug}` : '/shop';
};
