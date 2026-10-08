/**
 * Default & Fallback Policy Definitions for Akula's Kitchen
 * Compliant with FSSAI, Consumer Protection (E-Commerce) Rules 2020,
 * Information Technology Act 2000, and Digital Personal Data Protection Act 2023.
 */

import {
  Truck,
  FileText,
  RotateCcw,
  RefreshCw,
  PackageCheck,
  XCircle,
  ShieldCheck,
  ScrollText,
} from 'lucide-react';

export const POLICY_METADATA_MAP = {
  'shipping-policy': {
    title: 'Shipping & Delivery Policy',
    shortTitle: 'Shipping',
    tagline: 'Reliable, temperature-conscious transit across India',
    icon: Truck,
    badge: 'Express Courier',
    readTime: '3 min read',
    description:
      "Learn about Akula's Kitchen shipping timelines, flat ₹100 delivery, free shipping over ₹2,000, and fresh batch dispatch standards.",
  },
  'terms-and-conditions': {
    title: 'Terms & Conditions',
    shortTitle: 'Terms',
    tagline: 'Transparent guidelines governing our services and orders',
    icon: FileText,
    badge: 'Legal Agreement',
    readTime: '4 min read',
    description:
      "Official Terms and Conditions governing purchases, website access, intellectual property, and culinary orders at Akula's Kitchen.",
  },
  'refund-policy': {
    title: 'Refund Policy',
    shortTitle: 'Refunds',
    tagline: 'Transparent evaluations and hassle-free resolutions',
    icon: RotateCcw,
    badge: '7-Day Window',
    readTime: '3 min read',
    description:
      "Our refund guidelines, bank credit timelines (5-7 days), store credit options, and quality claim pathways at Akula's Kitchen.",
  },
  'return-policy': {
    title: 'Return Policy',
    shortTitle: 'Returns',
    tagline: 'Food hygiene standards and damaged parcel procedures',
    icon: PackageCheck,
    badge: 'Food Safety First',
    readTime: '2 min read',
    description:
      "Guidelines on perishable returns, unboxing photo verification, and complimentary resolutions for compromised items at Akula's Kitchen.",
  },
  'exchange-policy': {
    title: 'Exchange & Replacement Policy',
    shortTitle: 'Exchanges',
    tagline: '100% complimentary fresh replacement guarantee',
    icon: RefreshCw,
    badge: 'Free Replacement',
    readTime: '2 min read',
    description:
      'Our priority replacement guarantee for damaged or leaked parcels dispatched within 24-48 hours.',
  },
  'cancellation-policy': {
    title: 'Cancellation Policy',
    shortTitle: 'Cancellation',
    tagline: 'Pre-dispatch order cancellations and prompt refunds',
    icon: XCircle,
    badge: 'Instant Request',
    readTime: '2 min read',
    description:
      'Guidelines on cancelling orders before kitchen packaging and courier dispatch, with 100% refund.',
  },
  'privacy-policy': {
    title: 'Privacy Policy',
    shortTitle: 'Privacy',
    tagline: 'Bank-grade security, DPDP Act compliance, and zero data selling',
    icon: ShieldCheck,
    badge: 'DPDP & IT Act',
    readTime: '3 min read',
    description:
      "How Akula's Kitchen safeguards your personal information, processes payments securely via Razorpay, and complies with DPDP Act 2023.",
  },
};

export const DEFAULT_POLICIES = [
  {
    title: 'Shipping & Delivery Policy',
    slug: 'shipping-policy',
    status: 'published',
    version: 1,
    updatedAt: '2026-03-15T00:00:00.000Z',
    seoMetadata: {
      title: "Shipping & Delivery Policy | Akula's Kitchen",
      description:
        "Learn about Akula's Kitchen shipping timelines, delivery charges, free shipping threshold, and packaging standards across India.",
    },
    sections: [
      {
        heading: '1. Shipping Coverage & Logistics Network',
        paragraph:
          "Akula's Kitchen delivers authentic, freshly prepared South Indian batters, spice powders, pickles, and traditional culinary items to serviceable PIN codes across India. We partner with tier-1 national courier aggregators and express logistics networks to ensure dependable, temperature-conscious, and prompt transit.",
        highlight:
          'PAN-India delivery across serviceable pin codes with verified courier tracking.',
      },
      {
        heading: '2. Order Processing & Fresh Batch Preparation',
        paragraph:
          'To ensure peak authentic flavor and natural freshness without chemical preservatives, our fresh batters and homemade delicacies are prepared in small, hygienic batches. Standard orders are freshly prepared and packed within 24 to 48 hours of order confirmation. Orders placed on Sundays or gazetted public holidays are dispatched on the next operational business day.',
        highlight:
          'Prepared fresh in hygienic small batches — never stored stale on warehouse shelves.',
      },
      {
        heading: '3. Delivery Charges & Free Shipping Threshold',
        paragraph:
          '• Standard Delivery: A flat shipping fee of ₹100 applies to standard domestic orders.\n• Free Shipping Offer: Complimentary free delivery is automatically applied to all orders of ₹2,000 and above.\n• Cash on Delivery (COD): COD is available on eligible orders between ₹500 and ₹50,000 with a nominal verification and handling fee of ₹90.',
        highlight: 'Enjoy FREE shipping automatically when your cart reaches ₹2,000 or more!',
      },
      {
        heading: '4. Estimated Delivery Timelines',
        paragraph:
          '• Metro & Urban Hubs: Estimated delivery within 3 to 5 business days from dispatch.\n• Rest of India: Standard delivery within 5 to 7 business days from dispatch.\n• Remote & Hill Regions: May require 7 to 9 business days depending on terrain and courier reach.\n\nPlease note: Transit timelines may vary slightly during peak festive surges, national holidays, or unexpected weather disruptions.',
      },
      {
        heading: '5. Real-Time Order Tracking',
        paragraph:
          'As soon as your package is dispatched from our kitchen, an automated notification containing your live courier Tracking ID and direct tracking URL is sent via SMS, WhatsApp, and registered email. You can also view live status updates anytime in your account dashboard under "My Orders" or through the "Track Order" page on our website.',
      },
      {
        heading: '6. Food-Grade Tamper-Evident Packaging',
        paragraph:
          'Every order is sealed in certified food-grade, multi-layer, leak-resistant, tamper-evident packaging designed to protect against temperature variations. If your parcel arrives visibly crushed, punctured, leaking, or with broken exterior security tape, please refuse delivery and immediately notify us via WhatsApp (+91 8800775528) or email (mahesh.akula@gmail.com).',
        highlight:
          'If the outer seal is broken or leaking upon arrival, please refuse delivery and contact us immediately.',
      },
    ],
  },
  {
    title: 'Terms & Conditions',
    slug: 'terms-and-conditions',
    status: 'published',
    version: 1,
    updatedAt: '2026-03-15T00:00:00.000Z',
    seoMetadata: {
      title: "Terms & Conditions | Akula's Kitchen",
      description:
        "Official Terms and Conditions governing purchases, website access, and customer service at Akula's Kitchen.",
    },
    sections: [
      {
        heading: '1. Agreement to Terms',
        paragraph:
          "Welcome to Akula's Kitchen (https://akulas.kitchen). By accessing our website, creating an account, or placing an order, you acknowledge that you have read, understood, and agreed to be bound by these Terms & Conditions, along with our Privacy Policy and all applicable laws and regulations of India.",
      },
      {
        heading: '2. Store Operator & Legal Identity',
        paragraph:
          "This platform is owned and operated by Akula's Kitchen, registered at Plot No. 93/1, Purvanchal Silver City, Block-9-B204, Sector 93, Noida, Uttar Pradesh, India - 201304. Customers transacting on this website confirm that they are at least 18 years of age or accessing under the supervision of a parent or legal guardian.",
      },
      {
        heading: '3. Product Information, Shelf Life & Proper Storage',
        paragraph:
          "We take utmost care to accurately display ingredients, net weights, nutritional information, and allergen notices for all items. Because our batters and culinary products are naturally fermented and free of artificial chemical stabilizers, customers are strictly advised to refrigerate fresh batters (between 1°C and 4°C) immediately upon delivery. Akula's Kitchen cannot be held responsible for premature spoilage caused by improper storage after delivery.",
        highlight:
          'Store fresh batters refrigerated (1°C - 4°C) immediately upon arrival to preserve freshness.',
      },
      {
        heading: '4. Pricing, Invoicing & Digital Payments',
        paragraph:
          "All product prices are displayed in Indian National Rupees (INR) and are inclusive of applicable Goods and Services Tax (GST). Payments can be completed securely via authorized digital payment gateways (UPI, Credit/Debit Cards, Net Banking) powered by Razorpay, or via Cash on Delivery where serviceable. Akula's Kitchen reserves the right to adjust catalog prices or modify promotional campaigns without prior notice.",
      },
      {
        heading: '5. Intellectual Property Rights',
        paragraph:
          "All logos, trademarks, brand names, product photography, culinary recipes, design layouts, and website text are the exclusive intellectual property of Akula's Kitchen and protected under Indian Copyright and Trademark legislation. Any unauthorized reproduction, scraping, or commercial duplication is strictly prohibited.",
      },
      {
        heading: '6. Limitation of Liability',
        paragraph:
          "Akula's Kitchen shall not be held liable for any indirect, incidental, or consequential damages resulting from delayed transit caused by third-party logistics partners, adverse weather events, inaccurate delivery addresses provided by the buyer, or improper storage after delivery.",
      },
      {
        heading: '7. Governing Law & Jurisdiction',
        paragraph:
          'These Terms & Conditions shall be governed by and interpreted in accordance with the laws of the Republic of India. Any disputes or claims arising from transactions on this platform shall fall under the exclusive jurisdiction of the competent courts in Noida / Gautam Buddha Nagar, Uttar Pradesh.',
      },
    ],
  },
  {
    title: 'Refund Policy',
    slug: 'refund-policy',
    status: 'published',
    version: 1,
    updatedAt: '2026-03-15T00:00:00.000Z',
    seoMetadata: {
      title: "Refund Policy | Akula's Kitchen",
      description:
        "Our refund guidelines, processing timelines, and resolution pathways for orders at Akula's Kitchen.",
    },
    sections: [
      {
        heading: '1. Refund Eligibility Criteria',
        paragraph:
          'Due to strict food hygiene, FSSAI regulations, and the perishable nature of consumable food products, items cannot be returned or refunded solely for subjective taste preference or change of mind. Refunds are approved exclusively under the following verified conditions:\n• Transit damage, visible pouch puncture, or leaked containers upon delivery.\n• Prematurely spoiled or compromised items reported within the reporting window.\n• Dispatch of an incorrect variant, size, or missing items from our fulfillment center.\n• Prepaid orders successfully cancelled prior to kitchen packaging and courier handover.',
        highlight:
          'Refunds are fully guaranteed for damaged, leaked, expired, or incorrect shipments.',
      },
      {
        heading: '2. Mandatory 7-Day Reporting Window',
        paragraph:
          'To file a refund or replacement claim, please reach out to us within 7 calendar days of delivery. Contact customer support via email at mahesh.akula@gmail.com or via WhatsApp at +91 8800775528 with your Order ID, clear photos of the affected items, and photos of the courier shipping label.',
        highlight:
          'Please report any issues within 7 days of delivery with your Order ID and package photos.',
      },
      {
        heading: '3. Rapid Verification & Claim Processing',
        paragraph:
          'Our customer support and quality control team evaluates all claims within 24 to 48 business hours. Upon photo verification, your refund will be authorized and initiated immediately without unnecessary paperwork.',
      },
      {
        heading: '4. Refund Modes & Bank Credit Timelines',
        paragraph:
          '• Original Payment Method: For prepaid orders (UPI, Debit/Credit Card, Net Banking), refunds credit to the source bank account within 5 to 7 business days, depending on bank processing cycles.\n• Cash on Delivery (COD) Orders: Refunds are processed via instant NEFT/IMPS bank transfer or instant Store Wallet Credit upon providing verified account details.\n• Store Credit Option: You can opt for immediate Store Credit added to your account for quick reordering without waiting for bank clearance.',
      },
    ],
  },
  {
    title: 'Return Policy',
    slug: 'return-policy',
    status: 'published',
    version: 1,
    updatedAt: '2026-03-15T00:00:00.000Z',
    seoMetadata: {
      title: "Return Policy | Akula's Kitchen",
      description:
        "Guidelines on returns, replacements, and reporting issues with food items at Akula's Kitchen.",
    },
    sections: [
      {
        heading: '1. Perishable Food Safety Standards',
        paragraph:
          "Because Akula's Kitchen specializes in fresh culinary batters, homemade spice mixes, and freshly ground condiments, we cannot accept physical returns of opened or perishable food items. This policy upholds strict FSSAI hygiene standards and prevents cross-contamination.",
      },
      {
        heading: '2. Damaged, Defective or Incorrect Items',
        paragraph:
          'If your parcel is delivered damaged, unsealed, spoiled, or contains the wrong products, you are entitled to a 100% complimentary fresh replacement or full refund. You do NOT have to return the compromised perishable item back to us.',
        highlight:
          'Zero hassle: We resolve compromised food shipments without asking you to ship perishable items back.',
      },
      {
        heading: '3. Photographic Verification Procedure',
        paragraph:
          'Simply share your Order ID along with clear unboxing photos or a short video clip showing the outer box, courier shipping label, and the affected item to mahesh.akula@gmail.com or via WhatsApp at +91 8800775528 within 7 days of receipt.',
      },
      {
        heading: '4. Reverse Courier Pickups for Non-Perishables',
        paragraph:
          'In rare cases involving non-perishable hardware or special merchandise, reverse pickup will be scheduled through our courier partner at zero cost to you. If reverse pickup is unavailable at your PIN code, we issue resolution immediately based on digital photo proof.',
      },
    ],
  },
  {
    title: 'Exchange & Replacement Policy',
    slug: 'exchange-policy',
    status: 'published',
    version: 1,
    updatedAt: '2026-03-15T00:00:00.000Z',
    seoMetadata: {
      title: "Exchange Policy | Akula's Kitchen",
      description: "Replacements and exchanges policy for culinary essentials at Akula's Kitchen.",
    },
    sections: [
      {
        heading: '1. 100% Complimentary Replacement Guarantee',
        paragraph:
          'If any item in your order arrives damaged, leaking, expired, or incorrect, we provide a 100% free fresh replacement dispatched with priority kitchen processing and express courier delivery.',
        highlight:
          'Your satisfaction is guaranteed: Compromised orders receive free fresh replacements.',
      },
      {
        heading: '2. Replacement Claim Window',
        paragraph:
          'Replacement requests must be submitted within 7 calendar days of order delivery. Reach out via email (mahesh.akula@gmail.com) or WhatsApp (+91 8800775528) with your Order ID and photo proof.',
      },
      {
        heading: '3. Fast Replacement Dispatch Timeline',
        paragraph:
          'Once confirmed by our support team, your fresh batch replacement will be prepared and handed over to express courier within 24 to 48 hours. A fresh tracking link will be provided immediately.',
      },
      {
        heading: '4. Product Substitutions',
        paragraph:
          'Direct physical exchanges for different catalog items are not feasible due to batch shelf life and dynamic pricing. In such instances, store credit or a full refund is issued so you may reorder your desired item instantly.',
      },
    ],
  },
  {
    title: 'Cancellation Policy',
    slug: 'cancellation-policy',
    status: 'published',
    version: 1,
    updatedAt: '2026-03-15T00:00:00.000Z',
    seoMetadata: {
      title: "Cancellation Policy | Akula's Kitchen",
      description: "Order cancellation guidelines and refund timelines at Akula's Kitchen.",
    },
    sections: [
      {
        heading: '1. Pre-Dispatch Order Cancellations',
        paragraph:
          'You may cancel your order at any time before it enters the kitchen packaging and courier dispatch stage (typically within 2 to 4 hours of placing the order).',
        highlight:
          'Easy self-cancellation available via your Account Dashboard prior to kitchen packaging.',
      },
      {
        heading: '2. How to Request Cancellation',
        paragraph:
          '• Account Dashboard: Log in to Akula\'s Kitchen, navigate to Dashboard > My Orders, and click "Cancel Order" on eligible pending orders.\n• Support Helpdesk: Alternatively, send a quick message on WhatsApp at +91 8800775528 or email mahesh.akula@gmail.com with your Order ID and the subject "URGENT: Cancel Order".',
      },
      {
        heading: '3. Post-Dispatch Cancellations',
        paragraph:
          'Once an order has been picked up by the courier partner and entered the transit stream, it cannot be cancelled due to the perishable, time-sensitive nature of fresh batters and homemade delicacies.',
      },
      {
        heading: '4. Prompt Refund for Cancelled Orders',
        paragraph:
          'For prepaid orders cancelled before dispatch, a full 100% refund is initiated immediately to your original payment method, reflecting in your bank account within 5 to 7 business days.',
      },
    ],
  },
  {
    title: 'Privacy Policy',
    slug: 'privacy-policy',
    status: 'published',
    version: 1,
    updatedAt: '2026-03-15T00:00:00.000Z',
    seoMetadata: {
      title: "Privacy Policy | Akula's Kitchen",
      description:
        "How Akula's Kitchen protects and respects your personal data under the IT Act and DPDP Act.",
    },
    sections: [
      {
        heading: '1. Commitment to Privacy & Regulatory Compliance',
        paragraph:
          "Akula's Kitchen is deeply dedicated to safeguarding customer privacy. We process personal data strictly in accordance with the Information Technology Act, 2000, the Information Technology (Reasonable Security Practices) Rules, 2011, and the Digital Personal Data Protection (DPDP) Act, 2023 of India.",
        highlight:
          'Compliant with the Digital Personal Data Protection (DPDP) Act, 2023 and IT Act, 2000.',
      },
      {
        heading: '2. Information We Collect',
        paragraph:
          'To fulfill your culinary orders and deliver outstanding service, we collect necessary personal information including:\n• Full Name, Delivery Address, PIN Code, and Landmark.\n• Contact Phone Number, WhatsApp Number, and Email Address.\n• Order history, delivery preferences, and transactional timestamps.\n• Technical device metadata (IP address, browser type) used for security and fraud prevention.',
      },
      {
        heading: '3. Bank-Grade Payment Security (PCI-DSS Level 1)',
        paragraph:
          "All digital transactions are encrypted and processed through India's leading PCI-DSS Level 1 certified payment gateways (Razorpay). Akula's Kitchen does not view, collect, or store sensitive credit card numbers, CVVs, debit card PINs, or net banking passwords on our servers.",
        highlight:
          'We never store card CVVs, debit card PINs, or banking passwords on our servers.',
      },
      {
        heading: '4. How We Use Your Data',
        paragraph:
          'Your personal data is used solely to:\n• Process, pack, and deliver your food orders to your doorstep.\n• Send automated SMS, WhatsApp, and email tracking notifications.\n• Provide dedicated customer support regarding queries or claims.\n• With your explicit consent, share seasonal festival offers and authentic culinary recipes.',
      },
      {
        heading: '5. Zero Data Brokering & Strict Confidentiality',
        paragraph:
          "We strictly maintain a zero data brokering stance: Akula's Kitchen NEVER sells, rents, monetizes, or shares your personal details with third-party marketing brokers or advertisers. Data is shared exclusively with verified delivery partners (courier companies) and cloud messaging channels strictly required to deliver your parcel.",
        highlight:
          'Zero Data Brokering: We never sell or rent your personal information to third parties.',
      },
      {
        heading: '6. Grievance Redressal Officer Contact Details',
        paragraph:
          'In compliance with the Information Technology Act and Consumer Protection Rules, please contact our designated Grievance Officer for data rights, access requests, or privacy inquiries:\nName: Mahesh Akula\nDesignation: Grievance Redressal Officer\nAddress: Plot No. 93/1, Purvanchal Silver City, Block-9-B204, Sector 93, Noida, UP, India - 201304\nEmail: mahesh.akula@gmail.com | Phone: +91 8800775528',
        highlight: 'Designated Grievance Officer: Mahesh Akula, Noida (mahesh.akula@gmail.com)',
      },
    ],
  },
];

/**
 * Helper to get default policy by slug
 */
export function getDefaultPolicy(slug) {
  if (!slug) return null;
  const normalized = slug.toLowerCase().trim();
  const match = DEFAULT_POLICIES.find((p) => p.slug === normalized);
  if (match) return match;

  // Lookup metadata if not fully found
  const meta = POLICY_METADATA_MAP[normalized];
  if (meta) {
    return {
      title: meta.title,
      slug: normalized,
      status: 'published',
      version: 1,
      updatedAt: new Date().toISOString(),
      seoMetadata: {
        title: `${meta.title} | Akula's Kitchen`,
        description: meta.description,
      },
      sections: [
        {
          heading: meta.title,
          paragraph: meta.description,
        },
      ],
    };
  }
  return null;
}

/**
 * Helper to get metadata for any policy
 */
export function getPolicyMeta(slug, fallbackTitle = '') {
  const normalized = (slug || '').toLowerCase().trim();
  if (POLICY_METADATA_MAP[normalized]) {
    return POLICY_METADATA_MAP[normalized];
  }
  return {
    title: fallbackTitle || 'Store Policy',
    shortTitle: fallbackTitle || 'Policy',
    tagline: 'Akula’s Kitchen official customer policy',
    icon: ScrollText,
    badge: 'Policy',
    readTime: '3 min read',
    description: `Official policy information for ${fallbackTitle || "Akula's Kitchen"}.`,
  };
}
