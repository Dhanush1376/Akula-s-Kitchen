import {
  buildOrderConfirmationCustomerEmail,
  buildOrderConfirmationAdminEmail,
  buildOrderStatusChangeEmail,
} from '../../src/utils/email/transactionalEmailTemplates';
import { getOrderConfirmationTemplate } from '../../src/utils/email/emailTemplates';
import { compileTemplate } from '../../src/utils/email/templateEngine';
import {
  resolveEmailImageUrl,
  getPublicOrderTrackingUrl,
  resolveOrderGrandTotal,
} from '../../src/utils/email/emailUrlUtils';

console.log('=== STARTING EMAIL FIXES VERIFICATION ===\n');

let failedTests = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`✅ PASS: ${testName}`);
  } else {
    console.error(`❌ FAIL: ${testName}${detail ? ` -> ${detail}` : ''}`);
    failedTests++;
  }
}

// 1. TEST PRODUCT IMAGE RESOLUTION
console.log('--- 1. Testing Product Image URL Resolution ---');
const localImage =
  'http://localhost:5000/uploads/akulas-kitchen/products/rustic-south-indian-appam-breakfast-jpg-2e62_9sifw.webp';
const relativeImage =
  '/uploads/akulas-kitchen/products/traditional-dosa-batter-preparation-jpg-f10f_wipa3.webp';
const cloudinaryImage = 'https://res.cloudinary.com/jn2i9onr/image/upload/v1234/sample.jpg';
const emptyImage = '';

const resolvedLocal = resolveEmailImageUrl(localImage);
const resolvedRelative = resolveEmailImageUrl(relativeImage);
const resolvedCloudinary = resolveEmailImageUrl(cloudinaryImage);
const resolvedEmpty = resolveEmailImageUrl(emptyImage);

assert(
  resolvedLocal ===
    'https://akulas.kitchen/uploads/akulas-kitchen/products/rustic-south-indian-appam-breakfast-jpg-2e62_9sifw.webp',
  'Localhost image URL converted to public HTTPS domain',
  resolvedLocal,
);
assert(
  resolvedRelative ===
    'https://akulas.kitchen/uploads/akulas-kitchen/products/traditional-dosa-batter-preparation-jpg-f10f_wipa3.webp',
  'Relative /uploads image converted to public HTTPS domain',
  resolvedRelative,
);
assert(
  resolvedCloudinary === cloudinaryImage,
  'Cloudinary HTTPS image preserved untouched',
  resolvedCloudinary,
);
assert(
  resolvedEmpty === 'https://akulas.kitchen/MainLogo_bg.png',
  'Empty image falls back to official brand logo',
  resolvedEmpty,
);
assert(
  !resolvedLocal.includes('localhost') && !resolvedLocal.includes('placehold.co'),
  'Resolved local image has NO localhost and NO placehold.co',
);

// 2. TEST MOCK ORDER DATA
console.log('\n--- 2. Testing Transactional Email Templates ---');
const mockOrder = {
  _id: '672e8f12a4b3c2d1e0f9a8b7',
  orderUuid: 'ORD-202610-1234',
  invoiceNumber: 'INV-AK-2026-0099',
  createdAt: new Date().toISOString(),
  paymentMethod: 'cod',
  paymentStatus: 'Pending COD',
  subtotal: 1000,
  shippingFee: 50,
  platformFee: 5,
  codFee: 25,
  discount: 100,
  total: 980,
  items: [
    {
      title: 'Heritage South Indian Appam Mix',
      price: 500,
      quantity: 2,
      variant: '1kg Pack',
      imageSrc:
        'http://localhost:5000/uploads/akulas-kitchen/products/rustic-south-indian-appam-breakfast-jpg-2e62_9sifw.webp',
    },
  ],
  shippingAddress: {
    name: 'Ramesh Kumar',
    address: 'Plot 42, Jubilee Hills',
    city: 'Hyderabad',
    state: 'Telangana',
    pincode: '500033',
    phone: '9876543210',
    email: 'ramesh.kumar@example.com',
  },
};

const mockUser = {
  name: 'Ramesh Kumar',
  email: 'ramesh.kumar@example.com',
};

// Customer Confirmation Email
const customerEmail = buildOrderConfirmationCustomerEmail(mockOrder, mockUser);
assert(
  !customerEmail.html.includes('localhost') && !customerEmail.html.includes('127.0.0.1'),
  'Customer Confirmation Email contains ZERO localhost URLs',
);
assert(
  customerEmail.html.includes('Track Your Order'),
  'Customer Confirmation Email has Track Your Order button',
);
assert(
  customerEmail.html.includes('/track/672e8f12a4b3c2d1e0f9a8b7?token='),
  'Customer Confirmation Email has signed public tracking link',
);
assert(
  customerEmail.html.includes(
    'https://akulas.kitchen/uploads/akulas-kitchen/products/rustic-south-indian-appam-breakfast',
  ),
  'Customer Confirmation Email resolves product image to public HTTPS URL',
);
assert(
  !customerEmail.html.includes('placehold.co'),
  'Customer Confirmation Email does NOT use placehold.co',
);

// Admin New Order Alert Email
console.log('\n--- 3. Testing [New Order] Admin Email Template ---');
const adminEmail = buildOrderConfirmationAdminEmail(mockOrder);

assert(
  adminEmail.subject.startsWith('[New Order]'),
  'Admin email subject starts with [New Order]',
  adminEmail.subject,
);
assert(
  adminEmail.subject.includes('₹980'),
  'Admin email subject contains Grand Total amount (₹980)',
  adminEmail.subject,
);
assert(
  adminEmail.html.includes('Grand Total Amount') && adminEmail.html.includes('₹980'),
  'Admin email contains prominent Grand Total banner with ₹980',
);
assert(
  adminEmail.html.includes('Grand Total') && adminEmail.html.includes('₹980'),
  'Admin email contains Grand Total row in data table',
);
assert(
  adminEmail.html.includes('Ordered Products') && adminEmail.html.includes('Subtotal:'),
  'Admin email contains items table and totals summary breakdown',
);
assert(
  adminEmail.html.includes('COD Handling Fee:') && adminEmail.html.includes('Platform Fee:'),
  'Admin email includes full fee breakdown (COD Fee, Platform Fee)',
);
assert(
  !adminEmail.html.includes('localhost') && !adminEmail.html.includes('127.0.0.1'),
  'Admin email contains ZERO localhost URLs',
);
assert(
  adminEmail.html.includes('/admin/orders/672e8f12a4b3c2d1e0f9a8b7'),
  'Admin email contains direct link to admin orders panel',
);

// Status Change Email
console.log('\n--- 4. Testing Order Status Change Email ---');
const statusEmail = buildOrderStatusChangeEmail(mockOrder, 'Confirmed', 'Shipped');
assert(
  !statusEmail.html.includes('localhost') && !statusEmail.html.includes('127.0.0.1'),
  'Status Change Email contains ZERO localhost URLs',
);
assert(
  statusEmail.html.includes('Track Your Order'),
  'Status Change Email has Track Your Order button',
);
assert(
  statusEmail.html.includes('/track/672e8f12a4b3c2d1e0f9a8b7?token='),
  'Status Change Email links to public order tracking with token',
);

// Handlebars order-confirmation.hbs
console.log('\n--- 5. Testing Handlebars order-confirmation.hbs ---');
const hbsHtml = compileTemplate('order-confirmation', {
  customerName: 'Ramesh Kumar',
  orderId: 'INV-AK-2026-0099',
  rawOrderId: '672e8f12a4b3c2d1e0f9a8b7',
  paymentMethod: 'Cash on Delivery',
  subtotal: 1000,
  shipping: 50,
  total: 980,
  shippingAddress: 'Plot 42, Jubilee Hills, Hyderabad',
  items: [
    {
      name: 'Heritage South Indian Appam Mix',
      price: 500,
      quantity: 2,
      variant: '1kg Pack',
      image:
        '/uploads/akulas-kitchen/products/rustic-south-indian-appam-breakfast-jpg-2e62_9sifw.webp',
    },
  ],
});

assert(
  !hbsHtml.includes('localhost') && !hbsHtml.includes('127.0.0.1'),
  'order-confirmation.hbs contains ZERO localhost URLs',
);
assert(hbsHtml.includes('Grand Total:'), 'order-confirmation.hbs labels total as Grand Total:');
assert(
  hbsHtml.includes('Track Your Order'),
  'order-confirmation.hbs contains Track Your Order button',
);
assert(
  hbsHtml.includes(
    'https://akulas.kitchen/uploads/akulas-kitchen/products/rustic-south-indian-appam-breakfast',
  ),
  'order-confirmation.hbs resolves product image to public HTTPS URL',
);

// Simple template getOrderConfirmationTemplate
console.log('\n--- 6. Testing getOrderConfirmationTemplate ---');
const simpleTemplate = getOrderConfirmationTemplate({
  orderId: 'ORD-1234',
  totalAmount: 980,
  paymentStatus: 'Paid',
  orderLink: 'http://localhost:5173/track/ORD-1234',
});
assert(
  !simpleTemplate.includes('localhost'),
  'getOrderConfirmationTemplate sanitizes localhost orderLink',
);
assert(
  simpleTemplate.includes('Grand Total:'),
  'getOrderConfirmationTemplate displays Grand Total',
);

console.log(
  `\n=== VERIFICATION FINISHED: ${failedTests === 0 ? 'ALL TESTS PASSED ✅' : `${failedTests} TESTS FAILED ❌`} ===`,
);
if (failedTests > 0) {
  process.exit(1);
}
