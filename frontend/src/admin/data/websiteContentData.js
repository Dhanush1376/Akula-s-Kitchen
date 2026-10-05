// ─── Akula's Kitchen — Website Content Data Store ───
// Every field here maps directly to a visible frontend element.
// The admin can edit these values and see exactly where they appear on the live site.

export const initialWebsiteContent = {
  // ═══════════════════════════════════════════════════════
  // HOMEPAGE — Home Page Controller
  // ═══════════════════════════════════════════════════════
  homePageController: {
    status: 'published',
  },

  // ═══════════════════════════════════════════════════════
  // PROMOTIONAL BANNERS
  // ═══════════════════════════════════════════════════════
  banners: [
    {
      id: 1,
      text: 'Free Delivery on Eligible Orders',
      icon: 'local_shipping',
      isActive: true,
      position: 'top',
    },
  ],

  // ═══════════════════════════════════════════════════════
  // SHOP PAGE
  // ═══════════════════════════════════════════════════════
  shopPage: {
    hero: {
      title: 'Shop',
      subtitle: 'Fresh • Tasty • Healthy',
      description:
        "Batters, chutneys, pickles, podis & masalas, namkeen and cashews from Akula's Kitchen.",
    },
    status: 'published',
  },

  // ═══════════════════════════════════════════════════════
  // NAVIGATION & FOOTER
  // ═══════════════════════════════════════════════════════
  navigation: {
    logo: { text: "AKULA'S KITCHEN", tagline: '', image: '/akulas-kitchen-logo.png' },
    mainLinks: [{ label: 'Shop', href: '/collections', isVisible: true }],
  },

  footer: {
    description: 'Fresh, tasty and healthy homemade foods.',
    exploreLinks: [{ label: 'Collections', href: '/collections' }],
    studioLinks: [{ label: 'Contact', href: '/contact' }],
    phone: '',
    alternatePhone: '',
    email: '',
    socialLinks: {
      instagram: '',
      pinterest: '',
      facebook: '',
    },
    copyright: "© {year} Akula's Kitchen.",
    status: 'published',
  },

  // ═══════════════════════════════════════════════════════
  // CONTACT INFORMATION
  // ═══════════════════════════════════════════════════════
  contact: {
    phone: '',
    alternatePhone: '',
    email: '',
    whatsapp: '',
    address: '',
    mapEmbed: '',
    businessHours: 'Mon - Sat: 10 AM - 7 PM',
    contactMethods: [
      {
        icon: 'call',
        title: 'Call Us',
        value: '',
        link: '',
      },
      {
        icon: 'smartphone',
        title: 'Alternate Line',
        value: '',
        link: '',
      },
      {
        icon: 'mail',
        title: 'Email Us',
        value: '',
        link: '',
      },
      {
        icon: 'alternate_email',
        title: 'Write to Us',
        value: '',
        link: '',
      },
      {
        icon: 'location_on',
        title: 'Visit Us',
        value: '',
        link: '',
      },
    ],
    studioHours: [
      { days: 'Monday — Friday', hours: '10:00 AM — 07:00 PM' },
      { days: 'Saturday', hours: '11:00 AM — 04:00 PM' },
    ],
    status: 'published',
  },

  // ═══════════════════════════════════════════════════════
  // POLICIES (Moved to dynamic Database Model - Policy.ts)
  // ═══════════════════════════════════════════════════════
  policies: {},

  // ═══════════════════════════════════════════════════════
  // SEO SETTINGS
  // ═══════════════════════════════════════════════════════
  seo: {
    globalTitle: "Akula's Kitchen — Authentic Flavors & Premium Culinary Experiences",
    globalDescription:
      "Authentic culinary experiences, exquisite recipes, and premium catering by Akula's Kitchen.",
    globalKeywords: "Akula's Kitchen, gourmet, authentic recipes, kitchen, catering, food",
    ogImage: '/og-image.png',
    pages: {
      home: {
        title: "Akula's Kitchen — Authentic Flavors",
        description:
          "Authentic culinary experiences, exquisite recipes, and premium catering by Akula's Kitchen.",
      },
      shop: {
        title: "Shop Menu — Akula's Kitchen",
        description: 'Explore our curated culinary creations and gourmet offerings.',
      },
      contact: {
        title: "Contact Us — Akula's Kitchen",
        description: 'Get in touch for orders, bulk enquiries and questions.',
      },
    },
    status: 'published',
  },

  // ═══════════════════════════════════════════════════════
  // THEME SETTINGS
  // ═══════════════════════════════════════════════════════
  theme: {
    showAnimations: true,
    showFloatingElements: true,
    enableSplashScreen: true,
    enableSmoothScroll: true,
    darkMode: false,
    status: 'published',
  },
};
