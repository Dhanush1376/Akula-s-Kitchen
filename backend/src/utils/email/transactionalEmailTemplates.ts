import {
  getLuxuryEmailWrapper,
  formatCurrency,
  escapeHtml,
  dataTable,
  getPrimaryEntityName,
} from './emailTemplates';
import { getBackendUrl } from '../getBackendUrl';
import { getStoreConfigSync } from '../../config/storeConfig';

const resolveImageUrl = (url: string) => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;

  const backend = getBackendUrl();
  const isLocal = backend.includes('localhost');
  if (isLocal) {
    return 'https://placehold.co/100x100/283618/ffffff?text=Item';
  }

  return url.startsWith('/') ? `${backend}${url}` : `${backend}/${url}`;
};

const itemsTable = (items: any[]) => {
  const itemsHtml = items
    .map((item) => {
      const itemImage = item.imageSrc
        ? `<img src="${escapeHtml(resolveImageUrl(item.imageSrc))}" alt="${escapeHtml(item.title || item.name)}" style="width: 48px; height: 48px; object-fit: cover; border-radius: 6px; border: 1px solid #e2dac7;" />`
        : `<div style="width: 48px; height: 48px; background-color: #f4efe2; border-radius: 6px; border: 1px solid #e2dac7; display: flex; align-items: center; justify-content: center; font-size: 11px; color: #606c38; font-weight: 700;">AK</div>`;

      return `
    <tr style="border-bottom: 1px solid #ede5d4;">
      <td style="padding: 10px 0; width: 58px; vertical-align: middle;">
        ${itemImage}
      </td>
      <td style="padding: 10px 6px; font-size: 13.5px; color: #2d3725; vertical-align: middle;">
        <strong style="color: #283618; font-size: 14px;">${escapeHtml(item.title || item.name || 'Item')}</strong><br/>
        <span style="color: #606c38; font-size: 12px;">Qty: ${item.quantity || 1} × ${formatCurrency(item.price)}</span>
        ${item.variant ? `<span style="color: #606c38; font-size: 12px;"> • ${escapeHtml(item.variant)}</span>` : ''}
      </td>
      <td style="padding: 10px 0; font-size: 13.5px; text-align: right; color: #283618; font-family: monospace; font-weight: 700; vertical-align: middle;">
        ${formatCurrency(item.price * (item.quantity || 1))}
      </td>
    </tr>
  `;
    })
    .join('');

  return `
    <div style="margin-bottom: 20px; border-radius: 8px; overflow: hidden; border: 1px solid #e5dcce;">
      <table style="width: 100%; border-collapse: collapse;">
        <thead>
          <tr style="background-color: #f5f0e3; border-bottom: 2px solid #283618; text-align: left;">
            <th colspan="2" style="padding: 8px 10px; font-size: 11px; font-weight: 800; color: #283618; text-transform: uppercase; letter-spacing: 0.05em;">Item</th>
            <th style="padding: 8px 10px; font-size: 11px; font-weight: 800; color: #283618; text-transform: uppercase; letter-spacing: 0.05em; text-align: right;">Total</th>
          </tr>
        </thead>
        <tbody style="background-color: #ffffff;">
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
  <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
    <tr>
      <td style="padding: 4px 0; font-size: 13.5px; color: #606c38; text-align: right; width: 65%;">Subtotal:</td>
      <td style="padding: 4px 0; font-size: 13.5px; color: #283618; text-align: right; font-family: monospace; font-weight: 600; width: 35%;">${formatCurrency(subtotal)}</td>
    </tr>
    ${
      discount > 0
        ? `
    <tr>
      <td style="padding: 4px 0; font-size: 13.5px; color: #2e7d32; text-align: right; width: 65%; font-weight: 600;">Discount:</td>
      <td style="padding: 4px 0; font-size: 13.5px; color: #2e7d32; text-align: right; font-family: monospace; font-weight: 700; width: 35%;">-${formatCurrency(discount)}</td>
    </tr>
    `
        : ''
    }
    <tr>
      <td style="padding: 4px 0; font-size: 13.5px; color: #606c38; text-align: right; width: 65%;">Shipping:</td>
      <td style="padding: 4px 0; font-size: 13.5px; color: #283618; text-align: right; font-family: monospace; font-weight: 600; width: 35%;">${formatCurrency(shipping)}</td>
    </tr>
    ${
      tax > 0
        ? `
    <tr>
      <td style="padding: 4px 0; font-size: 13.5px; color: #606c38; text-align: right; width: 65%;">Tax:</td>
      <td style="padding: 4px 0; font-size: 13.5px; color: #283618; text-align: right; font-family: monospace; font-weight: 600; width: 35%;">${formatCurrency(tax)}</td>
    </tr>
    `
        : ''
    }
    <tr style="border-top: 2px solid #283618;">
      <td style="padding: 10px 8px; font-size: 14px; font-weight: 800; color: #283618; text-align: right; width: 65%; text-transform: uppercase;">Grand Total:</td>
      <td style="padding: 10px 8px; font-size: 17px; font-weight: 800; color: #283618; text-align: right; font-family: monospace; width: 35%; background-color: #faf5e6; border-radius: 6px;">${formatCurrency(total)}</td>
    </tr>
  </table>
`;

const addressBlock = (title: string, address: any) => {
  if (!address) return '';
  return `
    <div style="background-color: #faf7f0; border: 1px solid #e5dcce; border-radius: 8px; padding: 14px 16px; margin-bottom: 16px;">
      <h3 style="color: #283618; font-size: 12.5px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 6px 0;">${title}</h3>
      <p style="color: #2d3725; font-size: 13px; line-height: 1.5; margin: 0;">
        <strong>${escapeHtml(address.name)}</strong><br/>
        ${escapeHtml(address.address)}<br/>
        ${address.locality ? escapeHtml(address.locality) + '<br/>' : ''}
        ${escapeHtml(address.city)}, ${escapeHtml(address.state)} ${escapeHtml(address.pincode)}<br/>
        Phone: ${escapeHtml(address.phone)}
      </p>
    </div>
  `;
};

// --- Order Templates ---

export const buildOrderConfirmationCustomerEmail = (order: any, user: any) => {
  const store = getStoreConfigSync();
  const domain = store.websiteDomain || 'akulas.kitchen';
  const displayId =
    order.invoice?.number ||
    order.invoiceNumber ||
    (order._id ? `INV-${String(order._id).slice(-8).toUpperCase()}` : 'N/A');
  const primaryItem = getPrimaryEntityName(order.items);
  const headingText = primaryItem
    ? `Your ${escapeHtml(primaryItem)} Order is Confirmed`
    : 'Order Confirmed';
  const preheader = `Your order #${displayId} on ${domain} is confirmed`;

  const body = `
    <h2>${headingText}</h2>
    <p>Hi ${escapeHtml(user?.name || order.shippingAddress?.name || 'Customer')}, thank you for your order! We are preparing it fresh.</p>
    
    <h3 style="color: #283618; margin-top: 20px;">Order Summary</h3>
    ${itemsTable(order.items)}
    ${totalsSummary(order.subtotal, order.shippingFee || order.courierCharges || 0, order.tax?.totalTax || 0, order.total, order.discount || 0)}
    
    <div style="display: flex; flex-wrap: wrap; gap: 16px; margin-bottom: 20px;">
      <div style="flex: 1; min-width: 220px;">
        ${addressBlock('Shipping Address', order.shippingAddress)}
      </div>
      <div style="flex: 1; min-width: 220px;">
        <div style="background-color: #faf7f0; border: 1px solid #e5dcce; border-radius: 8px; padding: 14px 16px; margin-bottom: 16px;">
          <h3 style="color: #283618; font-size: 12.5px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 6px 0;">Payment Details</h3>
          <p style="color: #2d3725; font-size: 13px; line-height: 1.5; margin: 0;">
            Method: <strong>${escapeHtml(order.paymentMethod || 'Online')}</strong><br/>
            Status: <strong style="color: #2e7d32;">${escapeHtml(order.paymentStatus || 'Paid')}</strong><br/>
            Invoice: <strong>${escapeHtml(displayId)}</strong>
          </p>
        </div>
      </div>
    </div>

    <div style="margin: 24px 0; text-align: center;">
      <a href="${store.websiteUrl}/dashboard/orders" target="_blank" style="background-color: #283618; color: #ffffff !important; border: 2px solid #283618; padding: 12px 28px; text-decoration: none; font-size: 13.5px; font-weight: 700; border-radius: 999px; display: inline-block; box-shadow: 0 3px 10px rgba(40, 54, 24, 0.18);">
        Track Order on ${domain}
      </a>
    </div>
  `;

  return {
    subject: `Order Confirmed: #${displayId} | Akula's Kitchen`,
    html: getLuxuryEmailWrapper('Order Confirmed', body, undefined, preheader),
  };
};

export const buildOrderConfirmationAdminEmail = (order: any) => {
  const store = getStoreConfigSync();
  const domain = store.websiteDomain || 'akulas.kitchen';
  const itemTitle =
    order.items && order.items.length > 0
      ? order.items[0].title || order.items[0].name || order.items[0].productTitle || 'Product'
      : 'Order';
  const moreCount =
    order.items && order.items.length > 1 ? ` (+${order.items.length - 1} more)` : '';
  const productName = `${itemTitle}${moreCount}`;
  const customerName = order.shippingAddress?.name || order.user?.name || 'Customer';
  const invoiceNumber =
    order.invoice?.number ||
    order.invoiceNumber ||
    (order._id ? `INV-${String(order._id).slice(-8).toUpperCase()}` : 'Pending');

  const body = `
    <h2>New Order: ${escapeHtml(productName)}</h2>
    <p style="color: #606c38; font-size: 13.5px; margin-top: -6px; margin-bottom: 16px;">
      Invoice: <strong style="color: #283618;">${escapeHtml(invoiceNumber)}</strong> • Customer: <strong>${escapeHtml(customerName)}</strong>
    </p>
    
    ${dataTable([
      { label: 'Item', value: `<strong>${escapeHtml(productName)}</strong>` },
      { label: 'Customer', value: escapeHtml(customerName) },
      {
        label: 'Email',
        value: escapeHtml(order.shippingAddress?.email || order.user?.email || 'N/A'),
      },
      {
        label: 'Phone',
        value: escapeHtml(order.shippingAddress?.phone || order.user?.phone || 'N/A'),
      },
      { label: 'Total', value: formatCurrency(order.total) },
      {
        label: 'Payment',
        value: `${escapeHtml(order.paymentMethod || 'N/A')} (${escapeHtml(order.paymentStatus || 'Pending')})`,
      },
    ])}
    
    <h3 style="color: #283618;">Items</h3>
    ${itemsTable(order.items)}
    
    ${addressBlock('Shipping Address', order.shippingAddress)}
  `;

  return {
    subject: `[New Order] ${productName} by ${customerName}`,
    html: getLuxuryEmailWrapper('Admin Alert', body),
  };
};

export const buildOrderStatusChangeEmail = (order: any, oldStatus: string, newStatus: string) => {
  const store = getStoreConfigSync();
  const domain = store.websiteDomain || 'akulas.kitchen';
  const primaryItem = getPrimaryEntityName(order.items) || 'Order';
  const invoiceNumber = order.invoiceNumber || order.invoice?.number;

  const preheader = `Your order status is now ${newStatus}`;

  const body = `
    <h2>Order Status Updated</h2>
    <p>Hi ${escapeHtml(order.shippingAddress?.name || 'Customer')}, your order is now <span style="background-color: #f7bb0e; color: #283618; font-weight: 800; padding: 2px 10px; border-radius: 999px; font-size: 12.5px; display: inline-block;">${escapeHtml(newStatus)}</span>.</p>
    
    ${dataTable([
      { label: 'Order Item', value: `<strong>${escapeHtml(primaryItem)}</strong>` },
      { label: 'Status', value: `<strong>${escapeHtml(newStatus)}</strong>` },
      ...(invoiceNumber ? [{ label: 'Invoice No', value: escapeHtml(invoiceNumber) }] : []),
    ])}
    
    <h3 style="color: #283618; margin-top: 20px;">Order Summary</h3>
    ${itemsTable(order.items)}
    ${totalsSummary(order.subtotal, order.shippingFee || order.courierCharges || 0, order.tax?.totalTax || 0, order.total, order.discount || 0)}

    <div style="margin: 24px 0; text-align: center;">
      <a href="${store.websiteUrl}/dashboard/orders" target="_blank" style="background-color: #283618; color: #ffffff !important; border: 2px solid #283618; padding: 12px 28px; text-decoration: none; font-size: 13.5px; font-weight: 700; border-radius: 999px; display: inline-block; box-shadow: 0 3px 10px rgba(40, 54, 24, 0.18);">
        View Order on ${domain}
      </a>
    </div>
  `;

  return {
    subject: `Order Update: ${primaryItem} is now ${newStatus} | Akula's Kitchen`,
    html: getLuxuryEmailWrapper('Order Update', body, undefined, preheader),
  };
};

export const buildPaymentFailedEmail = (order: any, reason: string) => {
  const store = getStoreConfigSync();
  const domain = store.websiteDomain || 'akulas.kitchen';
  const primaryItem = getPrimaryEntityName(order.items) || 'Order';
  const displayRef =
    order.invoice?.number ||
    order.invoiceNumber ||
    order.orderUuid ||
    (order._id ? `ORD-${String(order._id).slice(-8).toUpperCase()}` : '');

  const preheader = `Payment issue with your ${primaryItem} order`;

  const body = `
    <h2 style="color: #b91c1c;">Payment Incomplete</h2>
    <p>Hi ${escapeHtml(order.shippingAddress?.name || 'Customer')}, we could not process the payment for your order.</p>
    
    ${dataTable([
      { label: 'Item', value: `<strong>${escapeHtml(primaryItem)}</strong>` },
      { label: 'Reason', value: escapeHtml(reason) },
      { label: 'Amount', value: formatCurrency(order.total || 0) },
      ...(displayRef ? [{ label: 'Ref', value: escapeHtml(displayRef) }] : []),
    ])}
    
    <div style="margin: 24px 0; text-align: center;">
      <a href="${store.websiteUrl}/checkout" target="_blank" style="background-color: #283618; color: #ffffff !important; border: 2px solid #283618; padding: 12px 28px; text-decoration: none; font-size: 13.5px; font-weight: 700; border-radius: 999px; display: inline-block; box-shadow: 0 3px 10px rgba(40, 54, 24, 0.18);">
        Retry Payment on ${domain}
      </a>
    </div>
  `;

  return {
    subject: `Payment Issue: ${primaryItem} | Akula's Kitchen`,
    html: getLuxuryEmailWrapper('Payment Issue', body, undefined, preheader),
  };
};

// --- Inquiry Templates ---

export const buildInquiryCustomerEmail = (inquiry: any) => {
  const store = getStoreConfigSync();
  const domain = store.websiteDomain || 'akulas.kitchen';
  const body = `
    <h2>We Received Your Inquiry</h2>
    <p>Hi ${escapeHtml(inquiry.name)}, thank you for reaching out regarding <em>"${escapeHtml(inquiry.subject)}"</em>. Our team will get back to you shortly.</p>
  `;
  return {
    subject: `Inquiry Received | Akula's Kitchen (${domain})`,
    html: getLuxuryEmailWrapper('Inquiry Received', body),
  };
};

export const buildInquiryAdminEmail = (inquiry: any) => {
  const store = getStoreConfigSync();
  const domain = store.websiteDomain || 'akulas.kitchen';
  const body = `
    <h2>New Inquiry (${domain})</h2>
    ${dataTable([
      { label: 'Name', value: escapeHtml(inquiry.name) },
      { label: 'Email', value: escapeHtml(inquiry.email) },
      { label: 'Subject', value: escapeHtml(inquiry.subject) },
    ])}
    <div style="background-color: #faf7f0; border: 1px solid #e5dcce; border-left: 3px solid #f7bb0e; padding: 14px 16px; border-radius: 8px; margin-top: 14px;">
      <strong style="color: #283618; font-size: 12px; text-transform: uppercase; display: block; margin-bottom: 6px;">Message:</strong>
      <p style="margin: 0; white-space: pre-wrap; font-size: 13.5px; color: #2d3725; line-height: 1.5;">${escapeHtml(inquiry.message)}</p>
    </div>
  `;
  return {
    subject: `[INQUIRY] ${escapeHtml(inquiry.subject)}`,
    html: getLuxuryEmailWrapper('Customer Inquiry', body),
  };
};
