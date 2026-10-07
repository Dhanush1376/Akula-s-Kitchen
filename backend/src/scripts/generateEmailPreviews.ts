import '../config/loadEnv';
import fs from 'fs';
import path from 'path';
import {
  getOtpEmailTemplate,
  getCodOtpEmailTemplate,
  getWelcomeEmailTemplate,
} from '../utils/email/emailTemplates';
import {
  buildOrderConfirmationCustomerEmail,
  buildOrderStatusChangeEmail,
} from '../utils/email/transactionalEmailTemplates';

async function generatePreviews() {
  const outDir = path.resolve(__dirname, '../../email-previews');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  // 1. OTP Email
  const otp = getOtpEmailTemplate('482915', 5);
  fs.writeFileSync(path.join(outDir, 'otp.html'), otp);

  // 2. COD OTP Email
  const codOtp = getCodOtpEmailTemplate('739104', 5);
  fs.writeFileSync(path.join(outDir, 'cod-otp.html'), codOtp);

  // 3. Welcome Email
  const welcome = getWelcomeEmailTemplate('Dhanush', 'https://akulas.kitchen');
  fs.writeFileSync(path.join(outDir, 'welcome.html'), welcome);

  // 4. Order Confirmation Customer Email
  const mockOrder = {
    _id: '67a892b1c4e9f1a2380d55e1',
    invoiceNumber: 'INV-2026-0042',
    items: [
      {
        title: 'Traditional Idli Batter (1kg)',
        quantity: 2,
        price: 90,
        variant: '1kg Pouch',
      },
      {
        title: 'Guntur Karam Podi (250g)',
        quantity: 1,
        price: 180,
        variant: 'Glass Jar',
      },
    ],
    subtotal: 360,
    shippingFee: 50,
    tax: { totalTax: 18 },
    discount: 30,
    total: 398,
    paymentMethod: 'UPI / Razorpay',
    paymentStatus: 'PAID',
    shippingAddress: {
      name: 'Dhanush Akula',
      address: 'Plot 42, Green Heritage Enclave',
      locality: 'Jubilee Hills',
      city: 'Hyderabad',
      state: 'Telangana',
      pincode: '500033',
      country: 'India',
      phone: '+91 98660 06648',
    },
  };

  const orderCustomer = buildOrderConfirmationCustomerEmail(mockOrder, { name: 'Dhanush Akula' });
  fs.writeFileSync(path.join(outDir, 'order-confirmation.html'), orderCustomer.html);

  // 5. Order Status Change Email
  const statusChange = buildOrderStatusChangeEmail(mockOrder, 'PROCESSING', 'DISPATCHED');
  fs.writeFileSync(path.join(outDir, 'status-change.html'), statusChange.html);

  console.log(`Previews generated successfully in ${outDir}`);
}

generatePreviews().catch(console.error);
