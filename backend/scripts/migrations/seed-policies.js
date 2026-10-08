/**
 * Migration Script: Seed comprehensive, compliant e-commerce policies for Akula's Kitchen.
 * Sets up Shipping Policy, Terms & Conditions, Refund Policy, Return Policy,
 * Exchange Policy, Cancellation Policy, and Privacy Policy in MongoDB.
 */

const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env.local') });

const policiesData = [
  {
    title: 'Shipping & Delivery Policy',
    slug: 'shipping-policy',
    status: 'published',
    version: 1,
    seoMetadata: {
      title: "Shipping & Delivery Policy | Akula's Kitchen",
      description:
        "Learn about Akula's Kitchen shipping timelines, delivery charges, free shipping threshold, and packaging standards across India.",
    },
    content: JSON.stringify([
      {
        heading: '1. Shipping Coverage & Logistics Network',
        paragraph:
          "Akula's Kitchen ships freshly prepared, authentic South Indian batters, powders, pickles, and culinary specialties across most postal PIN codes throughout India. We partner with reputed, verified national courier aggregators to ensure dependable and temperature-conscious transit.",
      },
      {
        heading: '2. Order Processing & Fresh Batch Preparation',
        paragraph:
          'Because our fresh batters and homemade delicacies are prepared in small, hygienic batches to maintain authentic taste and peak freshness, orders are processed and prepared within 24 to 48 hours of confirmation. Orders placed on Sundays or gazetted public holidays are dispatched on the next operational business day.',
      },
      {
        heading: '3. Delivery Charges & Free Shipping',
        paragraph:
          '• Standard Delivery: A flat shipping fee of ₹100 is charged on standard orders.\n• Free Shipping: Complimentary free delivery is automatically applied to all orders of ₹2,000 and above.\n• Cash on Delivery (COD): COD is supported for order values between ₹500 and ₹50,000, with a convenience and verification fee of ₹90.',
      },
      {
        heading: '4. Estimated Delivery Timelines',
        paragraph:
          'Standard orders are generally delivered within 5 to 7 business days from dispatch. Delivery schedules may vary slightly for remote geographic regions, during peak festive surges, or due to unforeseen logistics conditions beyond our direct control.',
      },
      {
        heading: '5. Real-Time Order Tracking',
        paragraph:
          'Upon dispatch, an automated notification containing your courier tracking ID and live tracking link will be sent to your registered email address and mobile number. You can also view real-time tracking updates directly in your account dashboard under "My Orders" or through the "Track Order" portal.',
      },
      {
        heading: '6. Tamper-Evident Packaging & Delivery Acceptance',
        paragraph:
          'Every order is packed in food-grade, multi-layer, tamper-evident packaging. If the outer parcel seal appears punctured, opened, leaking, or visibly damaged at the time of delivery, please refuse delivery and immediately contact customer care at mahesh.akula@gmail.com or +91 8800775528.',
      },
    ]),
  },
  {
    title: 'Terms & Conditions',
    slug: 'terms-and-conditions',
    status: 'published',
    version: 1,
    seoMetadata: {
      title: "Terms & Conditions | Akula's Kitchen",
      description:
        "Official Terms and Conditions governing purchases, website access, and customer service at Akula's Kitchen.",
    },
    content: JSON.stringify([
      {
        heading: '1. Agreement to Terms',
        paragraph:
          "Welcome to Akula's Kitchen (https://akulas.kitchen). By browsing, registering an account, or placing an order on this platform, you agree to comply with and be bound by these Terms and Conditions, our Privacy Policy, and any supplemental guidelines posted on the service.",
      },
      {
        heading: '2. Store Operator & Eligibility',
        paragraph:
          "This platform is operated by Akula's Kitchen from Plot No. 93/1, Purvanchal Silver City, Block-9-B204, Sector 93, Noida, Uttar Pradesh, India - 201304. By transacting on our website, you confirm that you are at least 18 years of age or accessing under the supervision of a parent or legal guardian.",
      },
      {
        heading: '3. Product Information, Shelf Life & Storage',
        paragraph:
          'We take great care to accurately describe ingredients, weights, usage directions, and allergen details for all our culinary offerings. Due to the natural, preservative-free nature of our batters, powders, and food items, customers are strictly advised to follow storage guidelines (e.g., immediate refrigeration between 1°C to 4°C for fresh batters) upon delivery.',
      },
      {
        heading: '4. Pricing, Invoicing & Payments',
        paragraph:
          "All product prices are quoted in Indian Rupees (INR) and are inclusive of applicable taxes (GST) unless stated otherwise. Payments can be completed securely via authorized digital channels (UPI, Debit/Credit Cards, Net Banking) powered by Razorpay or via Cash on Delivery where serviceable. Akula's Kitchen reserves the right to revise catalog prices or promotional offers without prior notice.",
      },
      {
        heading: '5. Intellectual Property Rights',
        paragraph:
          "All logos, product nomenclature, culinary photography, recipe presentations, website designs, and textual content are the exclusive intellectual property of Akula's Kitchen and protected under Indian copyright and trademark regulations. Unauthorized reproduction or commercial use is strictly prohibited.",
      },
      {
        heading: '6. Limitation of Liability',
        paragraph:
          "Akula's Kitchen shall not be held liable for any indirect, incidental, or consequential damages resulting from improper storage, delayed consumption past expiration, or unauthorized delivery instructions given directly by the customer to courier personnel.",
      },
      {
        heading: '7. Governing Law & Jurisdiction',
        paragraph:
          'These Terms shall be governed by and interpreted in accordance with the laws of the Republic of India. Any legal disputes or claims arising out of or related to our platform shall be subject to the exclusive jurisdiction of the competent courts in Noida / Gautam Buddha Nagar, Uttar Pradesh.',
      },
    ]),
  },
  {
    title: 'Refund Policy',
    slug: 'refund-policy',
    status: 'published',
    version: 1,
    seoMetadata: {
      title: "Refund Policy | Akula's Kitchen",
      description:
        "Our refund guidelines, processing timelines, and resolution pathways for orders at Akula's Kitchen.",
    },
    content: JSON.stringify([
      {
        heading: '1. Refund Eligibility Criteria',
        paragraph:
          'Due to strict hygiene, food safety, and FSSAI standards, consumable food products cannot be refunded for general taste preference or change of mind. Refunds are issued exclusively under verified conditions:\n• Transit damage, leakage, or unsealed containers upon arrival.\n• Spoiled, prematurely fermented, or compromised items reported within the return window.\n• Incorrect variant or missing items dispatched by our packaging facility.\n• Prepaid orders successfully cancelled before packaging and dispatch.',
      },
      {
        heading: '2. Mandatory Reporting Window',
        paragraph:
          'To request a refund, please notify us within 7 days of receiving your package by emailing mahesh.akula@gmail.com or messaging via WhatsApp at +91 8800775528 with your Order ID, clear photographs of the defect/damage, and packaging batch label.',
      },
      {
        heading: '3. Refund Processing Timeline',
        paragraph:
          'Once your claim is evaluated and approved by our quality control team (typically within 24 to 48 hours), the refund will be initiated immediately.',
      },
      {
        heading: '4. Mode of Refund & Credit Reflection',
        paragraph:
          '• Original Payment Source: For prepaid orders (UPI, Card, Net Banking), the refund amount will credit to your source account within 5 to 7 business days, depending on your banking institution.\n• Cash on Delivery (COD) Orders: Refunds for COD orders are processed via direct NEFT/IMPS bank transfer or instant Store Wallet Credit upon providing verified beneficiary account details.\n• Store Credit Option: Customers may opt for immediate Store Credit / Wallet balance for seamless instant reordering.',
      },
    ]),
  },
  {
    title: 'Return Policy',
    slug: 'return-policy',
    status: 'published',
    version: 1,
    seoMetadata: {
      title: "Return Policy | Akula's Kitchen",
      description:
        "Guidelines on returns, replacements, and reporting issues with food items at Akula's Kitchen.",
    },
    content: JSON.stringify([
      {
        heading: '1. Perishable & Food Item Return Policy',
        paragraph:
          "Because Akula's Kitchen specializes in fresh culinary batters, homemade condiments, and consumable pantry goods, we cannot accept physical returns of opened or consumable food packages for food hygiene and cross-contamination prevention reasons.",
      },
      {
        heading: '2. Damaged, Defective or Incorrect Items',
        paragraph:
          'If your shipment arrives damaged, unsealed, spoiled, or contains incorrect items, you are entitled to a full replacement or refund. Please report the issue within 7 days of delivery.',
      },
      {
        heading: '3. Verification & Proof Required',
        paragraph:
          'Please share your Order ID along with clear unboxing photographs or a short video clip showing the outer carton, courier shipping label, and the affected item to mahesh.akula@gmail.com or WhatsApp +91 8800775528.',
      },
      {
        heading: '4. Reverse Pickups & Hassle-Free Resolutions',
        paragraph:
          'Where applicable and serviceable by our courier network, reverse pickup of damaged non-perishable goods or jars will be scheduled at no extra charge. If reverse pickup is unserviceable in your PIN code, we will issue a replacement or refund directly upon digital photographic verification.',
      },
    ]),
  },
  {
    title: 'Exchange Policy',
    slug: 'exchange-policy',
    status: 'published',
    version: 1,
    seoMetadata: {
      title: "Exchange Policy | Akula's Kitchen",
      description: "Replacements and exchanges policy for culinary essentials at Akula's Kitchen.",
    },
    content: JSON.stringify([
      {
        heading: '1. Complimentary Replacement Guarantee',
        paragraph:
          'If any item in your order is delivered damaged, leaked, expired, or incorrect, we provide a 100% free fresh replacement dispatched with priority handling.',
      },
      {
        heading: '2. Exchange Request Window',
        paragraph:
          'Exchange requests must be submitted within 7 days of order delivery. Contact our support team via email (mahesh.akula@gmail.com) or WhatsApp (+91 8800775528) with relevant photos of the package.',
      },
      {
        heading: '3. Replacement Dispatch Timeline',
        paragraph:
          'Once verified, your replacement batch will be freshly prepared and dispatched within 24 to 48 hours. A fresh tracking link will be shared with you immediately upon dispatch.',
      },
      {
        heading: '4. Exchanges for Different Products',
        paragraph:
          'Direct exchanges for different catalog items are not supported due to variable batch pricing and food categorization. In such cases, store credit or a refund is issued so you may reorder your preferred items.',
      },
    ]),
  },
  {
    title: 'Cancellation Policy',
    slug: 'cancellation-policy',
    status: 'published',
    version: 1,
    seoMetadata: {
      title: "Cancellation Policy | Akula's Kitchen",
      description: "Order cancellation guidelines and refund timelines at Akula's Kitchen.",
    },
    content: JSON.stringify([
      {
        heading: '1. Pre-Dispatch Order Cancellations',
        paragraph:
          'You may cancel your order at any time before it enters the packing and courier dispatch stage (typically within 2 to 4 hours of placing the order).',
      },
      {
        heading: '2. How to Cancel Your Order',
        paragraph:
          '• Log in to your Akula\'s Kitchen account, navigate to Dashboard > My Orders, and select "Cancel Order" on eligible pending orders.\n• Alternatively, contact our support team immediately at +91 8800775528 or email mahesh.akula@gmail.com with your Order ID and subject "URGENT: Cancel Order".',
      },
      {
        heading: '3. Post-Dispatch Cancellations',
        paragraph:
          'Once an order has been picked up by the courier partner, it cannot be cancelled due to the time-sensitive nature of fresh batters and food batches.',
      },
      {
        heading: '4. Refund for Cancelled Orders',
        paragraph:
          'For prepaid orders cancelled before dispatch, a full 100% refund will be processed back to your original payment method within 5 to 7 business days.',
      },
    ]),
  },
  {
    title: 'Privacy Policy',
    slug: 'privacy-policy',
    status: 'published',
    version: 1,
    seoMetadata: {
      title: "Privacy Policy | Akula's Kitchen",
      description:
        "How Akula's Kitchen protects and respects your personal data under the IT Act and DPDP Act.",
    },
    content: JSON.stringify([
      {
        heading: '1. Our Commitment to Your Privacy',
        paragraph:
          "Akula's Kitchen values your trust and is committed to protecting your personal information in compliance with the Information Technology Act, 2000 and the Digital Personal Data Protection (DPDP) Act, 2023.",
      },
      {
        heading: '2. Information We Collect',
        paragraph:
          'We collect personal details essential to fulfill your orders, including your name, delivery address, phone number, WhatsApp number, email address, and order transaction history.',
      },
      {
        heading: '3. Secure Payments & PCI-DSS Compliance',
        paragraph:
          "All online payments are securely processed through PCI-DSS Level 1 certified payment gateways (Razorpay). Akula's Kitchen does not collect, view, or store sensitive credit card CVVs, debit card PINs, or net banking passwords on our servers.",
      },
      {
        heading: '4. How We Use Your Data',
        paragraph:
          'Your data is used exclusively to process and deliver orders, transmit transactional tracking updates and OTPs, provide customer support, and, with your consent, share occasional seasonal discounts and culinary recipes.',
      },
      {
        heading: '5. Zero Data Brokering',
        paragraph:
          'We do not sell, rent, or trade your personal information to third-party marketing companies. Information is shared solely with trusted logistics providers and cloud messaging services strictly necessary for order fulfillment.',
      },
      {
        heading: '6. Grievance Redressal Officer',
        paragraph:
          'If you have any questions, feedback, or wish to exercise your data rights, please contact our designated Grievance Officer:\nMahesh Akula\nPlot No. 93/1, Purvanchal Silver City, Block-9-B204, Sector 93, Noida, Uttar Pradesh, India - 201304\nEmail: mahesh.akula@gmail.com | Phone: +91 8800775528',
      },
    ]),
  },
];

async function seedPolicies() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error('MONGO_URI is missing from environment variables.');
    process.exit(1);
  }

  console.log('Connecting to MongoDB...');
  await mongoose.connect(uri);

  const collection = mongoose.connection.db.collection('policies');

  console.log(`Seeding ${policiesData.length} policies...`);
  for (const policy of policiesData) {
    const existing = await collection.findOne({ slug: policy.slug });
    if (existing) {
      await collection.updateOne(
        { slug: policy.slug },
        {
          $set: {
            title: policy.title,
            content: policy.content,
            status: policy.status,
            seoMetadata: policy.seoMetadata,
            updatedAt: new Date(),
          },
          $inc: { version: 1 },
        },
      );
      console.log(`✓ Updated policy: ${policy.title} (/policy/${policy.slug})`);
    } else {
      await collection.insertOne({
        ...policy,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      console.log(`+ Created policy: ${policy.title} (/policy/${policy.slug})`);
    }
  }

  console.log('\nAll policies successfully seeded and published!');
  await mongoose.disconnect();
  process.exit(0);
}

seedPolicies().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
