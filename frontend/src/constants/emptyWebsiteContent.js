/**
 * Minimal CMS shape for loading states — no marketing copy or stock imagery.
 * Admin editor defaults remain in admin/data/websiteContentData.js.
 */
export const emptyWebsiteContent = {
  hero: {
    title: '',
    subtitle: '',
    ctaPrimary: { text: '', link: '/' },
    ctaSecondary: { text: '', link: '/' },
    backgroundImage: '',
    mobileBackgroundImage: '',
    isVisible: true,
    status: 'published',
  },
  homepageSections: [
    { id: 'hero_1', isVisible: true },
    { id: 'categoryGrid_1', isVisible: true },
    { id: 'trendingProducts_1', isVisible: true },
    { id: 'featuredProducts_1', isVisible: true },
    { id: 'recommendedProducts_1', isVisible: true },
  ],
  heroNavigationCards: { items: [], isVisible: true, status: 'published' },
  featuredCollections: {
    sectionTitle: '',
    sectionSubtitle: '',
    items: [],
    isVisible: true,
    status: 'published',
  },
  featuredProducts: {
    sectionTitle: '',
    sectionSubtitle: '',
    productIds: [],
    maxDisplay: 4,
    isVisible: true,
    status: 'published',
  },
  testimonials: { sectionTitle: '', items: [], isVisible: true, status: 'published' },
  contact: { email: '', phone: '', whatsapp: '', address: '' },
};
