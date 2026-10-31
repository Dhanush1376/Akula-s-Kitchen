/**
 * Single source of truth for storefront SEO constants.
 *
 * SITE_URL must be the *preferred* public origin (the host that does not
 * redirect). Every canonical URL, sitemap <loc>, feed link and Open Graph URL
 * is built from it, so it has to match the Vercel primary domain.
 */
const trimSlash = (url: string) => url.replace(/\/+$/, '');

export const SITE_URL = trimSlash(
  process.env.SITE_URL || process.env.STOREFRONT_URL || 'https://akulas.kitchen',
);

export const BRAND_NAME = process.env.SITE_NAME || "Akula's Kitchen";

export const DEFAULT_OG_IMAGE = `${SITE_URL}/og-image.png`;
export const LOGO_URL = `${SITE_URL}/akulas-kitchen-logo.png`;

export const SEO_LIMITS = {
  titleMax: 60,
  descriptionMin: 70,
  descriptionMax: 160,
  slugMax: 80,
  keywordsMax: 8,
} as const;

/** Sitemap protocol limit is 50,000 URLs per file; stay well below it. */
export const SITEMAP_CHUNK_SIZE = 45000;

export interface CategorySeoDefaults {
  /** Visible H1 on the category landing page. */
  heading: string;
  title: string;
  description: string;
  /** Introductory copy rendered above the product grid. */
  intro: string;
  /** Word added before product names in generated titles (e.g. "Homemade"). */
  productQualifier?: string;
  /** Noun appended to product names that do not already contain it (e.g. "Pickle"). */
  productNoun?: string;
}

/**
 * Hand-written landing copy for the store's categories, keyed by category slug.
 * Claims are limited to what the business states (homemade batters, pickles,
 * chutneys; traditional podis) and what the catalogue itself shows (product
 * names, pack sizes, prices). Category documents can override any field via
 * their own seoTitle / seoDescription / seoIntro.
 */
export const CATEGORY_SEO: Record<string, CategorySeoDefaults> = {
  batters: {
    heading: 'Idli, Dosa & Appam Batters',
    title: `Idli, Dosa & Appam Batter Online | ${BRAND_NAME}`,
    description:
      "Shop fresh homemade idli, dosa, appam and vada batter at Akula's Kitchen. Choose your pack size and order online for an easy South Indian breakfast.",
    intro:
      'Batters for the South Indian breakfast table: idli, dosa, appam and vada. Every batter below lists its available pack sizes and prices, so you can order the quantity your household needs. Open a product to see its full description and any storage notes.',
    productQualifier: 'Fresh',
    productNoun: 'Batter',
  },
  pickles: {
    heading: 'Homemade Pickles',
    title: `Homemade Pickles Online: Avakaya & Gongura | ${BRAND_NAME}`,
    description:
      "Buy homemade pickles online from Akula's Kitchen, including mango avakaya, gongura, tomato and amla pickles. Compare pack sizes and prices, then order online.",
    intro:
      'Traditional Indian pickles such as avakaya (mango pickle) and gongura are an everyday companion to rice, dal and curd. Browse the collection to compare varieties, check the pack sizes and prices for each, and open any pickle for its full description.',
    productQualifier: 'Homemade',
    productNoun: 'Pickle',
  },
  chutneys: {
    heading: 'Homemade Chutneys',
    title: `Homemade Chutneys Online | ${BRAND_NAME}`,
    description:
      "Shop homemade chutneys from Akula's Kitchen, including tomato, ginger and coconut chutney. See pack sizes and prices and order online to pair with idli and dosa.",
    intro:
      'Chutneys are the everyday partner to idli, dosa and rice. This collection lists every chutney currently available, and each product page shows its pack sizes and price.',
    productQualifier: 'Homemade',
    productNoun: 'Chutney',
  },
  masala: {
    heading: 'Podis & Masala Powders',
    title: `Traditional Podis & Masala Powders | ${BRAND_NAME}`,
    description:
      "Explore traditional podis and masala powders from Akula's Kitchen, such as sambar masala. Check the available pack sizes and prices and order online.",
    intro:
      'Podis and masala powders bring familiar flavour to sambar, rice and everyday cooking. Browse the powders currently available below. Each product page lists its pack sizes and price.',
    productQualifier: 'Traditional',
  },
  namkeen: {
    heading: 'Namkeen & Murukulu',
    title: `Namkeen & Murukulu Online | ${BRAND_NAME}`,
    description:
      "Shop namkeen from Akula's Kitchen, including ragi murukulu and curry leaf murukulu. Compare pack sizes and prices and order your tea-time snacks online.",
    intro:
      'Savoury namkeen for tea time and snacking, including murukulu varieties. Pick a product to see its description, pack sizes and price.',
  },
  cashews: {
    heading: 'Cashews',
    title: `Cashews Online | ${BRAND_NAME}`,
    description:
      "Buy cashews online from Akula's Kitchen. See the available grades and pack sizes with current prices, and order directly from our store.",
    intro:
      'Cashews for snacking, sweets and cooking. Each listing shows the cashew grade in its name along with the pack sizes and prices available.',
  },
};

/** Paths that must never be indexed (served with noindex and kept out of sitemaps). */
export const PRIVATE_PATH_PREFIXES = [
  '/admin',
  '/dashboard',
  '/cart',
  '/checkout',
  '/wishlist',
  '/track',
  '/order-success',
  '/accept-invite',
  '/invoice-preview',
];
