import {
  getLuxuryEmailWrapper,
  formatCurrency,
  escapeHtml,
  dataTable,
  button,
  getPrimaryEntityName,
} from './emailTemplates';
import { getBackendUrl } from '../getBackendUrl';
import { getFrontendUrl } from '../getFrontendUrl';

const resolveImageUrl = (url: string) => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;

  const backend = getBackendUrl();
  const isLocal = backend.includes('localhost');
  // For local testing, use a placeholder so the layout isn't broken with a blank box,
  // since Gmail proxies can't access localhost.
  if (isLocal) {
    return 'https://placehold.co/100x100/f3f4f6/374151?text=Product';
  }

  return url.startsWith('/') ? `${backend}${url}` : `${backend}/${url}`;
};

const itemsTable = (items: any[]) => {
  const itemsHtml = items
    .map((item) => {
      const itemImage = item.imageSrc
        ? `<img src="${escapeHtml(resolveImageUrl(item.imageSrc))}" alt="${escapeHtml(item.title || item.name)}" style="width: 48px; height: 48px; object-fit: cover; border-radius: 4px; border: 1px solid #e5e7eb;" />`
        : `<div style="width: 48px; height: 48px; background-color: #f3f4f6; border-radius: 4px; border: 1px solid #e5e7eb;"></div>`;

      return `
    <tr style="border-bottom: 1px solid #e5e7eb;">
      <td style="padding: 12px 0; width: 60px;">
        ${itemImage}
      </td>
      <td style="padding: 12px 0; font-size: 14px; color: #374151;">
        <strong style="color: #111827;">${escapeHtml(item.title || item.name || 'Item')}</strong><br/>
        <span style="color: #6b7280; font-size: 12px;">Qty: ${item.quantity || 1} × ${formatCurrency(item.price)}</span>
        ${item.variant ? `<br/><span style="color: #6b7280; font-size: 12px;">Variant: ${escapeHtml(item.variant)}</span>` : ''}
      </td>
      <td style="padding: 12px 0; font-size: 14px; text-align: right; color: #111827; font-family: monospace; font-weight: 500;">
        ${formatCurrency(item.price * (item.quantity || 1))}
      </td>
    </tr>
  `;
    })
    .join('');

  return `
    <div style="margin-bottom: 24px;">
      <table style="width: 100%; border-collapse: collapse;">
        <thead>
          <tr style="border-bottom: 2px solid #e5e7eb; text-align: left;">
            <th colspan="2" style="padding-bottom: 8px; font-size: 12px; color: #6b7280; text-transform: uppercase;">Item Description</th>
            <th style="padding-bottom: 8px; font-size: 12px; color: #6b7280; text-transform: uppercase; text-align: right;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
      </table>
    </div>
  `;
};

const totalsSummary = (
  subtotal: number,
  shipping: number,
  tax: number,
  total: number,
  discount: number = 0,
) => `
  <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
    <tr>
      <td style="padding: 6px 0; font-size: 14px; color: #6b7280; text-align: right; width: 65%;">Subtotal:</td>
      <td style="padding: 6px 0; font-size: 14px; color: #111827; text-align: right; font-family: monospace; width: 35%;">${formatCurrency(subtotal)}</td>
    </tr>
    ${
      discount > 0
        ? `
    <tr>
      <td style="padding: 6px 0; font-size: 14px; color: #059669; text-align: right; width: 65%;">Discount:</td>
      <td style="padding: 6px 0; font-size: 14px; color: #059669; text-align: right; font-family: monospace; width: 35%;">-${formatCurrency(discount)}</td>
    </tr>
    `
        : ''
    }
    <tr>
      <td style="padding: 6px 0; font-size: 14px; color: #6b7280; text-align: right; width: 65%;">Shipping:</td>
      <td style="padding: 6px 0; font-size: 14px; color: #111827; text-align: right; font-family: monospace; width: 35%;">${formatCurrency(shipping)}</td>
    </tr>
    ${
      tax > 0
        ? `
    <tr>
      <td style="padding: 6px 0; font-size: 14px; color: #6b7280; text-align: right; width: 65%;">Tax:</td>
      <td style="padding: 6px 0; font-size: 14px; color: #111827; text-align: right; font-family: monospace; width: 35%;">${formatCurrency(tax)}</td>
    </tr>
    `
        : ''
    }
    <tr style="border-top: 2px solid #e5e7eb;">
      <td style="padding: 12px 0 0 0; font-size: 16px; font-weight: 700; color: #111827; text-align: right; width: 65%;">Grand Total:</td>
      <td style="padding: 12px 0 0 0; font-size: 18px; font-weight: 700; color: #111827; text-align: right; font-family: monospace; width: 35%;">${formatCurrency(total)}</td>
    </tr>
  </table>
`;

const addressBlock = (title: string, address: any) => {
  if (!address) return '';
  return `
    <div style="margin-bottom: 24px;">
      <h3 style="color: #111827; font-size: 16px; margin-bottom: 12px;">${title}</h3>
      <p style="color: #374151; font-size: 14px; line-height: 1.5; margin: 0;">
        ${escapeHtml(address.name)}<br/>
        ${escapeHtml(address.address)}<br/>
        ${address.locality ? escapeHtml(address.locality) + '<br/>' : ''}
        ${escapeHtml(address.city)}, ${escapeHtml(address.state)} ${escapeHtml(address.pincode)}<br/>
        ${escapeHtml(address.country)}<br/>
        Phone: ${escapeHtml(address.phone)}
      </p>
    </div>
  `;
};

export const buildNextStepsSection = (stepsHtml: string) => `
  <div style="background-color: #f8fafc; border-left: 4px solid #3b82f6; padding: 16px; margin-top: 32px; margin-bottom: 32px;">
    <h3 style="color: #1e3a8a; margin: 0 0 8px 0; font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em;">What Happens Next</h3>
    <div style="color: #334155; font-size: 14px; line-height: 1.5; margin: 0;">
      ${stepsHtml}
    </div>
  </div>
`;

export const buildSupportSection = (contactInfo?: { phone?: string; alternatePhone?: string }) => {
  const phone = contactInfo?.phone || '';
  const altPhone = contactInfo?.alternatePhone || '';
  let phoneText = '';
  if (phone && altPhone) {
    phoneText = ` or call us at <strong>${escapeHtml(phone)}</strong> / <strong>${escapeHtml(altPhone)}</strong>`;
  } else if (phone) {
    phoneText = ` or call us at <strong>${escapeHtml(phone)}</strong>`;
  }
  return `
  <div style="margin-top: 40px; padding-top: 24px; border-top: 1px solid #e5e7eb;">
    <h3 style="color: #111827; margin: 0 0 12px 0; font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em;">Need Help?</h3>
    <p style="color: #4b5563; font-size: 14px; line-height: 1.5; margin: 0;">
      If you have any questions or need to make changes to your booking, please reply directly to this email${phoneText}.
    </p>
  </div>
`;
};

// --- Order Templates ---

export const buildOrderConfirmationCustomerEmail = (order: any, user: any) => {
  const displayId =
    order.invoice?.number ||
    order.invoiceNumber ||
    (order._id ? `INV-${String(order._id).slice(-8).toUpperCase()}` : 'N/A');
  const primaryItem = getPrimaryEntityName(order.items);
  const headingText = primaryItem
    ? `Your ${escapeHtml(primaryItem)} Order Is Confirmed`
    : 'Your Order Is Confirmed';
  const preheader = primaryItem
    ? `We've received your order for ${primaryItem}.`
    : `We've received your order.`;

  const body = `
    <h2>${headingText}</h2>
    <p>Dear ${escapeHtml(user?.name || order.shippingAddress?.name || 'Customer')},</p>
    <p>We've received your order and are getting it ready for shipment.</p>
    
    <h3 style="margin-top: 32px; color: #111827;">Order Summary</h3>
    ${itemsTable(order.items)}
    ${totalsSummary(order.subtotal, order.shippingFee || order.courierCharges || 0, order.tax?.totalTax || 0, order.total, order.discount || 0)}
    
    <div style="display: flex; flex-wrap: wrap; gap: 24px; margin-bottom: 32px;">
      <div style="flex: 1; min-width: 250px;">
        ${addressBlock('Shipping Address', order.shippingAddress)}
      </div>
      <div style="flex: 1; min-width: 250px;">
        <h3 style="color: #111827; font-size: 16px; margin-bottom: 12px;">Payment Details</h3>
        <p style="color: #374151; font-size: 14px; line-height: 1.5; margin: 0;">
          Method: ${escapeHtml(order.paymentMethod || 'Razorpay')}<br/>
          Status: <strong>${escapeHtml(order.paymentStatus || 'Pending')}</strong><br/>
          Invoice Reference: <strong>${escapeHtml(displayId)}</strong>
        </p>
      </div>
    </div>
  `;
  return {
    subject: primaryItem
      ? displayId && displayId !== 'N/A'
        ? `Order Confirmed: ${primaryItem} (${displayId})`
        : `Order Confirmed: ${primaryItem}`
      : `Order Confirmed — ${displayId}`,
    html: getLuxuryEmailWrapper('Order Confirmed', body, undefined, preheader),
  };
};

export const buildOrderConfirmationAdminEmail = (order: any) => {
  const itemTitle =
    order.items && order.items.length > 0
      ? order.items[0].title ||
        order.items[0].name ||
        order.items[0].showcaseTitle ||
        order.items[0].productTitle ||
        'Product'
      : 'Order';
  const moreCount =
    order.items && order.items.length > 1 ? ` (+${order.items.length - 1} more)` : '';
  const productName = `${itemTitle}${moreCount}`;
  const customerName = order.shippingAddress?.name || order.user?.name || 'A customer';
  const invoiceNumber =
    order.invoice?.number ||
    order.invoiceNumber ||
    (order._id ? `INV-${String(order._id).slice(-8).toUpperCase()}` : 'Pending');

  const body = `
    <h2>New Order: ${escapeHtml(productName)}</h2>
    <p style="color: #4b5563; font-size: 14px; margin-top: -8px; margin-bottom: 20px;">
      Invoice Reference: <strong style="color: #111827;">${escapeHtml(invoiceNumber)}</strong>
    </p>
    <p>A new order has been placed on the store.</p>
    
    ${dataTable([
      { label: 'Product / Item', value: `<strong>${escapeHtml(productName)}</strong>` },
      { label: 'Customer', value: escapeHtml(customerName) },
      {
        label: 'Email',
        value: escapeHtml(order.shippingAddress?.email || order.user?.email || 'Unknown'),
      },
      {
        label: 'Phone',
        value: escapeHtml(order.shippingAddress?.phone || order.user?.phone || 'Unknown'),
      },
      { label: 'Total Value', value: formatCurrency(order.total) },
      {
        label: 'Payment',
        value: `${escapeHtml(order.paymentMethod || 'N/A')} (${escapeHtml(order.paymentStatus || 'Pending')})`,
      },
      { label: 'Invoice No', value: escapeHtml(invoiceNumber) },
    ])}
    
    <h3 style="color: #111827;">Items Ordered</h3>
    ${itemsTable(order.items)}
    
    ${addressBlock('Shipping Address', order.shippingAddress)}
    
  `;

  return {
    subject: `[New Order] ${productName} placed by ${customerName}`,
    html: getLuxuryEmailWrapper('Admin Alert', body),
  };
};

export const buildOrderStatusChangeEmail = (order: any, oldStatus: string, newStatus: string) => {
  const primaryItem = getPrimaryEntityName(order.items) || 'Order';
  const invoiceNumber = order.invoiceNumber || order.invoice?.number;

  const preheader = `The status of your ${primaryItem} has been updated to ${newStatus}.`;
  const headingText = `Your ${escapeHtml(primaryItem)} is now ${escapeHtml(newStatus)}`;

  const body = `
    <h2>${headingText}</h2>
    <p>Dear ${escapeHtml(order.shippingAddress?.name || 'Customer')},</p>
    <p>The status of your order has been updated to <strong>${escapeHtml(newStatus)}</strong>.</p>
    
    ${dataTable([
      { label: 'Product / Item', value: `<strong>${escapeHtml(primaryItem)}</strong>` },
      { label: 'Previous Status', value: escapeHtml(oldStatus) },
      { label: 'New Status', value: `<strong>${escapeHtml(newStatus)}</strong>` },
      ...(invoiceNumber ? [{ label: 'Invoice No', value: escapeHtml(invoiceNumber) }] : []),
    ])}
    
    <h3 style="margin-top: 32px; color: #111827;">Order Summary</h3>
    ${itemsTable(order.items)}
    ${totalsSummary(order.subtotal, order.shippingFee || order.courierCharges || 0, order.tax?.totalTax || 0, order.total, order.discount || 0)}
  `;
  return {
    subject: `Your ${primaryItem} is now ${newStatus}`,
    html: getLuxuryEmailWrapper('Order Status Update', body, undefined, preheader),
  };
};

export const buildPaymentFailedEmail = (order: any, reason: string) => {
  const primaryItem = getPrimaryEntityName(order.items) || 'Order';
  const displayRef =
    order.invoice?.number ||
    order.invoiceNumber ||
    order.orderUuid ||
    (order._id ? `ORD-${String(order._id).slice(-8).toUpperCase()}` : '');

  const preheader = `Payment failed for your ${primaryItem}`;
  const headingText = `Payment Failed for Your ${escapeHtml(primaryItem)}`;

  const body = `
    <h2 style="color: #dc2626;">${headingText}</h2>
    <p>Dear ${escapeHtml(order.shippingAddress?.name || 'Customer')},</p>
    <p>We were unable to process the payment for your order.</p>
    
    ${dataTable([
      { label: 'Product / Item', value: `<strong>${escapeHtml(primaryItem)}</strong>` },
      { label: 'Reason', value: escapeHtml(reason) },
      { label: 'Order Value', value: formatCurrency(order.total || 0) },
      ...(displayRef ? [{ label: 'Reference No', value: escapeHtml(displayRef) }] : []),
    ])}
    
    <p>Please try completing the payment again or contact support if the issue persists.</p>
    
  `;
  return {
    subject: `Payment Failed: ${primaryItem}`,
    html: getLuxuryEmailWrapper('Payment Alert', body, undefined, preheader),
  };
};

// --- Inquiry Templates ---

export const buildInquiryCustomerEmail = (inquiry: any) => {
  const body = `
    <h2>We Received Your Inquiry</h2>
    <p>Dear ${escapeHtml(inquiry.name)},</p>
    <p>Thank you for reaching out to Akula's Kitchen regarding "${escapeHtml(inquiry.subject)}". We have received your message and our team will get back to you within 24-48 hours.</p>
    <p>For urgent matters, you can reach us via our support line.</p>
  `;
  return {
    subject: `We Received Your Inquiry - Akula's Kitchen`,
    html: getLuxuryEmailWrapper('Inquiry Acknowledgment', body),
  };
};

export const buildInquiryAdminEmail = (inquiry: any) => {
  const body = `
    <h2>New Inquiry Received</h2>
    ${dataTable([
      { label: 'Name', value: escapeHtml(inquiry.name) },
      { label: 'Email', value: escapeHtml(inquiry.email) },
      { label: 'Subject', value: escapeHtml(inquiry.subject) },
    ])}
    <div style="background-color: #f9fafb; padding: 16px; border-radius: 8px; margin-top: 16px;">
      <p style="margin: 0; white-space: pre-wrap; font-size: 14px;">${escapeHtml(inquiry.message)}</p>
    </div>
  `;
  return {
    subject: `[INQUIRY] ${escapeHtml(inquiry.subject)}`,
    html: getLuxuryEmailWrapper('Admin Alert', body),
  };
};

// --- Rental Order Templates ---

const rentalItemCard = (rentalOrder: any) => {
  const itemImage = rentalOrder.productImage
    ? `<img src="${escapeHtml(resolveImageUrl(rentalOrder.productImage))}" alt="${escapeHtml(rentalOrder.productTitle)}" style="width: 48px; height: 48px; object-fit: cover; border-radius: 4px; border: 1px solid #e5e7eb;" />`
    : `<div style="width: 48px; height: 48px; background-color: #f3f4f6; border-radius: 4px; border: 1px solid #e5e7eb;"></div>`;

  const qty = rentalOrder.quantity || 1;
  const rentalPrice = rentalOrder.rentalRate?.rentalPrice || rentalOrder.rentalCharge || 0;
  const rentalDurationDays =
    rentalOrder.rentalRate?.rentalDurationDays || rentalOrder.durationDays || 0;

  return `
    <div style="margin-bottom: 24px;">
      <table style="width: 100%; border-collapse: collapse;">
        <thead>
          <tr style="border-bottom: 2px solid #e5e7eb; text-align: left;">
            <th colspan="2" style="padding-bottom: 8px; font-size: 12px; color: #6b7280; text-transform: uppercase;">Rental Item</th>
            <th style="padding-bottom: 8px; font-size: 12px; color: #6b7280; text-transform: uppercase; text-align: right;">Rental Charge</th>
          </tr>
        </thead>
        <tbody>
          <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 12px 0; width: 60px;">
              ${itemImage}
            </td>
            <td style="padding: 12px 0; font-size: 14px; color: #374151;">
              <strong style="color: #111827;">${escapeHtml(rentalOrder.productTitle || 'Rental Item')}</strong><br/>
              <span style="color: #6b7280; font-size: 12px;">Qty: ${qty}</span><br/>
              <span style="color: #6b7280; font-size: 12px;">${formatCurrency(rentalPrice)} for ${rentalDurationDays} day${rentalDurationDays !== 1 ? 's' : ''}</span>
            </td>
            <td style="padding: 12px 0; font-size: 14px; text-align: right; color: #111827; font-family: monospace; font-weight: 500;">
              ${formatCurrency(rentalOrder.rentalCharge)}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  `;
};

const rentalPeriodSection = (rentalOrder: any) => {
  const startDate = rentalOrder.rentalStartDate
    ? new Date(rentalOrder.rentalStartDate).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : 'Not Set';
  const endDate = rentalOrder.rentalEndDate
    ? new Date(rentalOrder.rentalEndDate).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : 'Not Set';
  const duration = rentalOrder.durationDays || 0;

  return `
    <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
      <h3 style="color: #111827; font-size: 14px; margin: 0 0 12px 0; text-transform: uppercase; letter-spacing: 0.05em;">Rental Period</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 6px 0; color: #6b7280; font-size: 14px; width: 40%;">Rental Start</td>
          <td style="padding: 6px 0; color: #111827; font-size: 14px; font-weight: 500;">${escapeHtml(startDate)}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #6b7280; font-size: 14px;">Rental End</td>
          <td style="padding: 6px 0; color: #111827; font-size: 14px; font-weight: 500;">${escapeHtml(endDate)}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #6b7280; font-size: 14px;">Duration</td>
          <td style="padding: 6px 0; color: #111827; font-size: 14px; font-weight: 500;">${duration} Day${duration !== 1 ? 's' : ''}</td>
        </tr>
      </table>
    </div>
  `;
};

const rentalTotalsSummary = (rentalOrder: any) => {
  const rentalCharge = rentalOrder.rentalCharge || 0;
  const securityDeposit = rentalOrder.securityDeposit || 0;
  const deliveryCharge = rentalOrder.deliveryCharge || 0;
  const tax = rentalOrder.tax || 0;
  const walletDeduction = rentalOrder.walletDeduction || 0;
  const totalAmount = rentalOrder.totalAmount || 0;

  return `
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 32px;">
      <tr>
        <td style="padding: 6px 0; font-size: 14px; color: #6b7280; text-align: right; width: 70%;">Rental Charge:</td>
        <td style="padding: 6px 0; font-size: 14px; color: #111827; text-align: right; font-family: monospace;">${formatCurrency(rentalCharge)}</td>
      </tr>
      <tr>
        <td style="padding: 6px 0; font-size: 14px; color: #6b7280; text-align: right;">Security Deposit <span style="font-size: 11px; color: #059669;">(Refundable)</span>:</td>
        <td style="padding: 6px 0; font-size: 14px; color: #111827; text-align: right; font-family: monospace;">${formatCurrency(securityDeposit)}</td>
      </tr>
      ${
        deliveryCharge > 0
          ? `
      <tr>
        <td style="padding: 6px 0; font-size: 14px; color: #6b7280; text-align: right;">Delivery Charge:</td>
        <td style="padding: 6px 0; font-size: 14px; color: #111827; text-align: right; font-family: monospace;">${formatCurrency(deliveryCharge)}</td>
      </tr>
      `
          : ''
      }
      ${
        tax > 0
          ? `
      <tr>
        <td style="padding: 6px 0; font-size: 14px; color: #6b7280; text-align: right;">Tax:</td>
        <td style="padding: 6px 0; font-size: 14px; color: #111827; text-align: right; font-family: monospace;">${formatCurrency(tax)}</td>
      </tr>
      `
          : ''
      }
      ${
        walletDeduction > 0
          ? `
      <tr>
        <td style="padding: 6px 0; font-size: 14px; color: #059669; text-align: right;">Wallet Deduction:</td>
        <td style="padding: 6px 0; font-size: 14px; color: #059669; text-align: right; font-family: monospace;">-${formatCurrency(walletDeduction)}</td>
      </tr>
      `
          : ''
      }
      <tr style="border-top: 2px solid #e5e7eb;">
        <td style="padding: 12px 0 0 0; font-size: 16px; font-weight: 700; color: #111827; text-align: right;">Grand Total:</td>
        <td style="padding: 12px 0 0 0; font-size: 18px; font-weight: 700; color: #111827; text-align: right; font-family: monospace;">${formatCurrency(totalAmount)}</td>
      </tr>
    </table>
  `;
};

export const buildRentalOrderCustomerEmail = (rentalOrder: any, user: any) => {
  const rentalTitle =
    rentalOrder.productTitle ||
    rentalOrder.showcaseTitle ||
    rentalOrder.title ||
    rentalOrder.name ||
    'Rental Item';
  const orderId =
    rentalOrder.rentalOrderId ||
    (rentalOrder._id ? `RNT-${String(rentalOrder._id).slice(-8).toUpperCase()}` : 'N/A');
  const preheader = `Your rental order for ${rentalTitle} is confirmed.`;

  const headingText = `Your ${escapeHtml(rentalTitle)} Rental Is Confirmed`;

  const customerName = escapeHtml(user?.name || rentalOrder.shippingAddress?.name || 'Customer');
  const frontendUrl = getFrontendUrl();

  const body = `
    <h2>${headingText}</h2>
    <p>Dear ${customerName},</p>
    <p>Your rental order has been confirmed. Here are the details of your rental.</p>

    <h3 style="margin-top: 32px; color: #111827;">Rental Summary</h3>
    ${rentalItemCard(rentalOrder)}
    ${rentalPeriodSection(rentalOrder)}
    ${rentalTotalsSummary(rentalOrder)}

    <div style="display: flex; flex-wrap: wrap; gap: 24px; margin-bottom: 32px;">
      <div style="flex: 1; min-width: 250px;">
        ${addressBlock('Delivery Address', rentalOrder.shippingAddress)}
      </div>
      <div style="flex: 1; min-width: 250px;">
        <h3 style="color: #111827; font-size: 16px; margin-bottom: 12px;">Payment Details</h3>
        <p style="color: #374151; font-size: 14px; line-height: 1.5; margin: 0;">
          Method: ${escapeHtml(rentalOrder.paymentMethod || 'Razorpay')}<br/>
          Status: <strong>${escapeHtml(rentalOrder.paymentStatus || 'Pending')}</strong><br/>
          Rental Reference: <strong>${escapeHtml(orderId)}</strong>
        </p>
      </div>
    </div>

    ${buildNextStepsSection(`
      <ol style="margin: 0; padding-left: 20px;">
        <li style="margin-bottom: 6px;">Your rental order has been confirmed and is being prepared.</li>
        <li style="margin-bottom: 6px;">The product will be delivered to your address before the rental start date.</li>
        <li style="margin-bottom: 6px;">Please keep the product in good condition during the rental period.</li>
        <li style="margin-bottom: 6px;">Return the product by the rental end date.</li>
        <li style="margin-bottom: 6px;">Your security deposit will be processed after inspection upon return.</li>
      </ol>
    `)}

    ${button('View My Rental Order', `${frontendUrl}/dashboard/rentals`)}

    ${buildSupportSection()}
  `;

  return {
    subject: `Rental Confirmed: ${rentalTitle}`,
    html: getLuxuryEmailWrapper('Rental Confirmed', body, undefined, preheader),
  };
};

export const buildRentalOrderAdminEmail = (rentalOrder: any) => {
  const productTitle =
    rentalOrder.productTitle ||
    rentalOrder.showcaseTitle ||
    rentalOrder.title ||
    rentalOrder.name ||
    'Rental Item';
  const customerName = rentalOrder.shippingAddress?.name || rentalOrder.user?.name || 'Customer';
  const rentalRef =
    rentalOrder.rentalOrderId ||
    (rentalOrder._id ? `RNT-${String(rentalOrder._id).slice(-8).toUpperCase()}` : 'N/A');

  const startDate = rentalOrder.startDate
    ? new Date(rentalOrder.startDate).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : 'N/A';
  const endDate = rentalOrder.endDate
    ? new Date(rentalOrder.endDate).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : 'N/A';

  const body = `
    <h2>New Rental Order: ${escapeHtml(productTitle)}</h2>
    <p style="color: #4b5563; font-size: 14px; margin-top: -8px; margin-bottom: 20px;">
      Rental Reference: <strong style="color: #111827;">${escapeHtml(rentalRef)}</strong>
    </p>
    <p>A new rental order has been placed on the store.</p>

    ${dataTable([
      { label: 'Product / Item', value: `<strong>${escapeHtml(productTitle)}</strong>` },
      { label: 'Customer', value: escapeHtml(customerName) },
      {
        label: 'Email',
        value: escapeHtml(
          rentalOrder.shippingAddress?.email || rentalOrder.user?.email || 'Unknown',
        ),
      },
      {
        label: 'Phone',
        value: escapeHtml(
          rentalOrder.shippingAddress?.phone || rentalOrder.user?.phone || 'Unknown',
        ),
      },
      { label: 'Total Value', value: formatCurrency(rentalOrder.totalAmount) },
      {
        label: 'Payment',
        value: `${escapeHtml(rentalOrder.paymentMethod || 'N/A')} (${escapeHtml(rentalOrder.paymentStatus || 'N/A')})`,
      },
      { label: 'Rental Reference', value: escapeHtml(rentalRef) },
    ])}

    <h3 style="color: #111827;">Rented Product</h3>
    ${rentalItemCard(rentalOrder)}

    <h3 style="color: #111827;">Rental Details</h3>
    ${dataTable([
      { label: 'Rental Start', value: escapeHtml(startDate) },
      { label: 'Rental End', value: escapeHtml(endDate) },
      {
        label: 'Duration',
        value: `${rentalOrder.durationDays || 0} Day${(rentalOrder.durationDays || 0) !== 1 ? 's' : ''}`,
      },
      { label: 'Rental Charge', value: formatCurrency(rentalOrder.rentalCharge) },
      { label: 'Security Deposit', value: formatCurrency(rentalOrder.securityDeposit) },
      { label: 'Deposit Status', value: escapeHtml(rentalOrder.depositStatus || 'held') },
      { label: 'Delivery Charge', value: formatCurrency(rentalOrder.deliveryCharge || 0) },
      { label: 'Tax', value: formatCurrency(rentalOrder.tax || 0) },
      {
        label: 'Grand Total',
        value: `<strong>${formatCurrency(rentalOrder.totalAmount)}</strong>`,
      },
    ])}

    ${addressBlock('Delivery Address', rentalOrder.shippingAddress)}
    ${button('View Rental Order', `${getFrontendUrl()}/admin/rentals/detail/${rentalOrder._id}`)}
  `;

  return {
    subject: `[New Rental] ${escapeHtml(rentalOrder.productTitle || 'Rental Item')} rented by ${escapeHtml(customerName)}`,
    html: getLuxuryEmailWrapper('Admin Alert', body),
  };
};

export const buildRentalStatusChangeEmail = (
  rentalOrder: any,
  oldStatus: string,
  newStatus: string,
) => {
  const rentalTitle =
    rentalOrder.productTitle ||
    rentalOrder.showcaseTitle ||
    rentalOrder.title ||
    rentalOrder.name ||
    'Rental Item';
  const orderId =
    rentalOrder.rentalOrderId ||
    (rentalOrder._id ? `RNT-${String(rentalOrder._id).slice(-8).toUpperCase()}` : 'N/A');
  const customerName = escapeHtml(rentalOrder.shippingAddress?.name || 'Customer');
  const frontendUrl = getFrontendUrl();
  const title = escapeHtml(rentalTitle);

  const formattedStatus = newStatus.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase());

  const body = `
    <h2>Your ${title} is now ${formattedStatus}</h2>
    <p>Dear ${customerName},</p>
    <p>The status of your rental for <strong>${title}</strong> has been updated to <strong>${formattedStatus}</strong>.</p>
    
    ${dataTable([
      { label: 'Rental Item', value: `<strong>${title}</strong>` },
      { label: 'New Status', value: `<strong>${formattedStatus}</strong>` },
      { label: 'Reference No', value: escapeHtml(orderId) },
    ])}

    ${rentalPeriodSection(rentalOrder)}

    ${button('View My Rental', `${frontendUrl}/dashboard/rentals`)}
    ${buildSupportSection()}
  `;

  return {
    subject: `Your ${rentalTitle} Rental is now ${formattedStatus}`,
    html: getLuxuryEmailWrapper(
      'Rental Update',
      body,
      undefined,
      `Your rental for ${rentalTitle} is now ${formattedStatus}`,
    ),
  };
};

export const buildRentalDepositRefundedEmail = (rentalOrder: any, refundData: any) => {
  const rentalTitle =
    rentalOrder.productTitle ||
    rentalOrder.showcaseTitle ||
    rentalOrder.title ||
    rentalOrder.name ||
    'Rental Item';
  const orderId =
    rentalOrder.rentalOrderId ||
    (rentalOrder._id ? `RNT-${String(rentalOrder._id).slice(-8).toUpperCase()}` : 'N/A');
  const customerName = escapeHtml(rentalOrder.shippingAddress?.name || 'Customer');
  const title = escapeHtml(rentalTitle);

  const refundAmount = refundData.refundAmount || 0;
  const isForfeited = refundAmount === 0;

  const methodText =
    refundData.method === 'cash' ? 'Cash' : 'Razorpay — refunded to your original payment method';

  const body = `
    <h2>${isForfeited ? 'Security Deposit Update' : 'Security Deposit Refunded'}</h2>
    <p>Dear ${customerName},</p>
    <p>Your security deposit for <strong>${title}</strong> has been processed after inspection.</p>
    
    <h3 style="color: #111827; margin-top: 24px;">Refund Details</h3>
    ${dataTable([
      { label: 'Rental Item', value: `<strong>${title}</strong>` },
      { label: 'Deposit Held', value: formatCurrency(rentalOrder.securityDeposit) },
      { label: 'Deductions', value: formatCurrency(rentalOrder.securityDeposit - refundAmount) },
      { label: 'Refund Amount', value: `<strong>${formatCurrency(refundAmount)}</strong>` },
      ...(refundAmount > 0 ? [{ label: 'Refund Method', value: methodText }] : []),
      { label: 'Reference No', value: escapeHtml(orderId) },
    ])}
    
    ${buildSupportSection()}
  `;

  return {
    subject: `Security Deposit ${isForfeited ? 'Update' : 'Refunded'} for ${rentalTitle}`,
    html: getLuxuryEmailWrapper('Deposit Processed', body),
  };
};

export const buildRentalPaymentReceivedEmail = (rentalOrder: any, paymentData: any) => {
  const rentalTitle =
    rentalOrder.productTitle ||
    rentalOrder.showcaseTitle ||
    rentalOrder.title ||
    rentalOrder.name ||
    'Rental Item';
  const orderId =
    rentalOrder.rentalOrderId ||
    (rentalOrder._id ? `RNT-${String(rentalOrder._id).slice(-8).toUpperCase()}` : 'N/A');
  const customerName = escapeHtml(rentalOrder.shippingAddress?.name || 'Customer');
  const frontendUrl = getFrontendUrl();
  const title = escapeHtml(rentalTitle);

  const amountReceived = paymentData.amount || 0;
  const isPaid = rentalOrder.paymentStatus === 'paid';

  const body = `
    <h2>Payment Received for ${title}</h2>
    <p>Dear ${customerName},</p>
    <p>We have successfully received a payment of <strong>${formatCurrency(amountReceived)}</strong> toward your rental for ${title}.</p>
    
    ${isPaid ? `<p><strong>Your rental payment is now complete.</strong></p>` : ''}
    
    <h3 style="color: #111827; margin-top: 24px;">Payment Summary</h3>
    ${dataTable([
      { label: 'Rental Item', value: `<strong>${title}</strong>` },
      { label: 'Total Amount', value: formatCurrency(rentalOrder.totalAmount) },
      {
        label: 'Total Paid',
        value: formatCurrency(rentalOrder.amountPaid || rentalOrder.totalAmount),
      },
      {
        label: 'Remaining Due',
        value: `<strong>${formatCurrency(Math.max(0, rentalOrder.totalAmount - (rentalOrder.amountPaid || rentalOrder.totalAmount)))}</strong>`,
      },
      { label: 'Reference No', value: escapeHtml(orderId) },
    ])}

    ${button('View My Rental', `${frontendUrl}/dashboard/rentals`)}
    ${buildSupportSection()}
  `;

  return {
    subject: `${isPaid ? 'Rental Payment Complete' : 'Payment Received'} for ${rentalTitle}`,
    html: getLuxuryEmailWrapper('Payment Confirmation', body),
  };
};
