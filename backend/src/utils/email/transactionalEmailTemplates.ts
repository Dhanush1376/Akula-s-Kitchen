import {
  getLuxuryEmailWrapper,
  formatCurrency,
  escapeHtml,
  dataTable,
  getPrimaryEntityName,
} from './emailTemplates';
import { getStoreConfigSync } from '../../config/storeConfig';
import {
  resolveEmailImageUrl,
  getPublicOrderTrackingUrl,
  getPublicWebsiteUrl,
  resolveOrderGrandTotal,
} from './emailUrlUtils';

const itemsTable = (items: any[]) => {
  if (!items || !Array.isArray(items) || items.length === 0) {
    return `
      <div style="margin-bottom: 20px; border-radius: 8px; padding: 16px; background-color: #faf7f0; border: 1px solid #e5dcce; text-align: center; color: #606c38; font-size: 13px;">
        No itemized products available.
      </div>
    `;
  }

  const itemsHtml = items
    .map((item) => {
      const imgUrl = resolveEmailImageUrl(
        item.imageSrc ||
          item.image ||
          item.imageUrl ||
          (Array.isArray(item.images) ? item.images[0] : ''),
      );
      const itemName = escapeHtml(item.title || item.name || item.productTitle || 'Heritage Item');
      const itemPrice = Number(item.price || 0);
      const itemQty = Number(item.quantity || 1);
      const rowTotal = itemPrice * itemQty;

      const itemImage = `
        <img src="${escapeHtml(imgUrl)}" alt="${itemName}" width="48" height="48" style="width: 48px; height: 48px; object-fit: cover; border-radius: 6px; border: 1px solid #e2dac7; display: block;" />
      `;

      return `
    <tr style="border-bottom: 1px solid #ede5d4;">
      <td style="padding: 12px 10px 12px 14px; width: 56px; vertical-align: middle;">
        ${itemImage}
      </td>
      <td style="padding: 12px 10px; font-size: 13.5px; color: #2d3725; vertical-align: middle;">
        <strong style="color: #283618; font-size: 14px; display: block; margin-bottom: 2px;">${itemName}</strong>
        <span style="color: #606c38; font-size: 12px;">Qty: ${itemQty} × ${formatCurrency(itemPrice)}</span>
        ${item.variant ? `<span style="color: #606c38; font-size: 12px;"> • ${escapeHtml(item.variant)}</span>` : ''}
      </td>
      <td style="padding: 12px 14px 12px 10px; font-size: 13.5px; text-align: right; color: #283618; font-family: monospace; font-weight: 700; vertical-align: middle; white-space: nowrap;">
        ${formatCurrency(rowTotal)}
      </td>
    </tr>
  `;
    })
    .join('');

  return `
    <div style="margin-bottom: 22px; border-radius: 8px; overflow: hidden; border: 1px solid #e5dcce; background-color: #ffffff;">
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="width: 100%; border-collapse: collapse;">
        <thead>
          <tr style="background-color: #f5f0e3; border-bottom: 2px solid #283618; text-align: left;">
            <th colspan="2" style="padding: 10px 14px; font-size: 11px; font-weight: 800; color: #283618; text-transform: uppercase; letter-spacing: 0.06em;">Item Details</th>
            <th style="padding: 10px 14px; font-size: 11px; font-weight: 800; color: #283618; text-transform: uppercase; letter-spacing: 0.06em; text-align: right;">Total</th>
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
  platformFee: number = 0,
  codFee: number = 0,
) => `
  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="width: 100%; border-collapse: collapse; margin-bottom: 22px;">
    <tr>
      <td style="padding: 6px 14px; font-size: 13.5px; color: #606c38; text-align: right; width: 62%;">Subtotal:</td>
      <td style="padding: 6px 14px; font-size: 13.5px; color: #283618; text-align: right; font-family: monospace; font-weight: 600; width: 38%; white-space: nowrap;">${formatCurrency(subtotal)}</td>
    </tr>
    ${
      discount > 0
        ? `
    <tr>
      <td style="padding: 6px 14px; font-size: 13.5px; color: #2e7d32; text-align: right; width: 62%; font-weight: 600;">Discount:</td>
      <td style="padding: 6px 14px; font-size: 13.5px; color: #2e7d32; text-align: right; font-family: monospace; font-weight: 700; width: 38%; white-space: nowrap;">-${formatCurrency(discount)}</td>
    </tr>
    `
        : ''
    }
    <tr>
      <td style="padding: 6px 14px; font-size: 13.5px; color: #606c38; text-align: right; width: 62%;">Shipping Fee:</td>
      <td style="padding: 6px 14px; font-size: 13.5px; color: #283618; text-align: right; font-family: monospace; font-weight: 600; width: 38%; white-space: nowrap;">${shipping === 0 ? '<span style="color: #2e7d32; font-weight: 700;">FREE</span>' : formatCurrency(shipping)}</td>
    </tr>
    ${
      platformFee > 0
        ? `
    <tr>
      <td style="padding: 6px 14px; font-size: 13.5px; color: #606c38; text-align: right; width: 62%;">Platform Fee:</td>
      <td style="padding: 6px 14px; font-size: 13.5px; color: #283618; text-align: right; font-family: monospace; font-weight: 600; width: 38%; white-space: nowrap;">${formatCurrency(platformFee)}</td>
    </tr>
    `
        : ''
    }
    ${
      codFee > 0
        ? `
    <tr>
      <td style="padding: 6px 14px; font-size: 13.5px; color: #606c38; text-align: right; width: 62%;">COD Handling Fee:</td>
      <td style="padding: 6px 14px; font-size: 13.5px; color: #283618; text-align: right; font-family: monospace; font-weight: 600; width: 38%; white-space: nowrap;">${formatCurrency(codFee)}</td>
    </tr>
    `
        : ''
    }
    ${
      tax > 0
        ? `
    <tr>
      <td style="padding: 6px 14px; font-size: 13.5px; color: #606c38; text-align: right; width: 62%;">Taxes (GST):</td>
      <td style="padding: 6px 14px; font-size: 13.5px; color: #283618; text-align: right; font-family: monospace; font-weight: 600; width: 38%; white-space: nowrap;">${formatCurrency(tax)}</td>
    </tr>
    `
        : ''
    }
    <tr style="border-top: 2px solid #283618; background-color: #faf5e6;">
      <td style="padding: 12px 14px; font-size: 14px; font-weight: 800; color: #283618; text-align: right; width: 62%; text-transform: uppercase; letter-spacing: 0.04em;">Grand Total:</td>
      <td style="padding: 12px 14px; font-size: 18px; font-weight: 900; color: #283618; text-align: right; font-family: monospace; width: 38%; white-space: nowrap;">${formatCurrency(total)}</td>
    </tr>
  </table>
`;

const addressBlock = (title: string, address: any) => {
  if (!address) return '';
  const addrText = typeof address === 'string' ? address : address.address || '';
  const name = address.name || 'Customer';
  const phone = address.phone || '';
  const cityState = [address.city, address.state, address.pincode].filter(Boolean).join(', ');

  return `
    <div style="background-color: #faf7f0; border: 1px solid #e5dcce; border-radius: 8px; padding: 14px 16px; margin-bottom: 16px;">
      <h3 style="color: #283618; font-size: 12.5px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 6px 0;">${title}</h3>
      <p style="color: #2d3725; font-size: 13px; line-height: 1.5; margin: 0;">
        <strong>${escapeHtml(name)}</strong><br/>
        ${escapeHtml(addrText)}<br/>
        ${address.locality ? escapeHtml(address.locality) + '<br/>' : ''}
        ${cityState ? escapeHtml(cityState) + '<br/>' : ''}
        ${phone ? `Phone: ${escapeHtml(phone)}` : ''}
      </p>
    </div>
  `;
};

// --- Order Templates ---

export const buildOrderConfirmationCustomerEmail = (order: any, user: any) => {
  const store = getStoreConfigSync();
  const domain = store.websiteDomain || 'akulas.kitchen';
  const grandTotal = resolveOrderGrandTotal(order);
  const displayId =
    order.invoice?.number ||
    order.invoiceNumber ||
    (order._id ? `INV-${String(order._id).slice(-8).toUpperCase()}` : 'N/A');
  const primaryItem = getPrimaryEntityName(order.items);
  const headingText = primaryItem
    ? `Your ${escapeHtml(primaryItem)} Order is Confirmed`
    : 'Order Confirmed';
  const preheader = `Your order #${displayId} on ${domain} is confirmed — Grand Total: ${formatCurrency(grandTotal)}`;
  const trackUrl = getPublicOrderTrackingUrl(order);

  const subtotal =
    order.subtotal ||
    (order.items || []).reduce(
      (acc: number, it: any) => acc + Number(it.price || 0) * Number(it.quantity || 1),
      0,
    );
  const shippingFee = order.shippingFee ?? order.courierCharges ?? 0;
  const tax = order.tax?.totalTax || 0;
  const discount = order.discount || 0;
  const platformFee = order.platformFee || 0;
  const codFee = order.codFee || 0;

  const paymentDetailsBlock = `
    <div style="background-color: #faf7f0; border: 1px solid #e5dcce; border-radius: 8px; padding: 14px 16px; margin-bottom: 16px;">
      <h3 style="color: #283618; font-size: 12.5px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 6px 0;">Payment Details</h3>
      <p style="color: #2d3725; font-size: 13px; line-height: 1.5; margin: 0;">
        Method: <strong>${escapeHtml(order.paymentMethod === 'cod' ? 'Cash on Delivery' : order.paymentMethod || 'Online')}</strong><br/>
        Status: <strong style="color: #2e7d32;">${escapeHtml(order.paymentStatus || 'Paid')}</strong><br/>
        Invoice: <strong>${escapeHtml(displayId)}</strong><br/>
        Grand Total: <strong>${formatCurrency(grandTotal)}</strong>
      </p>
    </div>
  `;

  const body = `
    <h2>${headingText}</h2>
    <p>Hi ${escapeHtml(user?.name || order.shippingAddress?.name || 'Customer')}, thank you for your order! We are preparing it fresh with heritage recipes.</p>
    
    <h3 style="color: #283618; margin-top: 22px; margin-bottom: 10px;">Order Summary</h3>
    ${itemsTable(order.items)}
    ${totalsSummary(subtotal, shippingFee, tax, grandTotal, discount, platformFee, codFee)}
    
    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 20px; border-collapse: separate; border-spacing: 0;">
      <tr>
        <td width="48%" valign="top" style="vertical-align: top; padding-right: 8px;">
          ${addressBlock('Shipping Address', order.shippingAddress)}
        </td>
        <td width="48%" valign="top" style="vertical-align: top; padding-left: 8px;">
          ${paymentDetailsBlock}
        </td>
      </tr>
    </table>

    <div style="margin: 32px 0 20px; text-align: center;">
      <a href="${trackUrl}" target="_blank" style="background-color: #283618; color: #ffffff !important; border: 2px solid #283618; padding: 14px 34px; text-decoration: none; font-size: 14px; font-weight: 700; border-radius: 999px; display: inline-block; box-shadow: 0 4px 14px rgba(40, 54, 24, 0.22); letter-spacing: 0.02em;">
        Track Your Order
      </a>
    </div>
    <p style="text-align: center; margin: 0 0 10px 0; font-size: 12px; color: #606c38;">
      Instant live tracking • No login required
    </p>
  `;

  return {
    subject: `Order Confirmed: #${displayId} | Akula's Kitchen`,
    html: getLuxuryEmailWrapper('Order Confirmed', body, undefined, preheader),
  };
};

export const buildOrderConfirmationAdminEmail = (order: any) => {
  const store = getStoreConfigSync();
  const domain = store.websiteDomain || 'akulas.kitchen';
  const publicBaseUrl = getPublicWebsiteUrl();
  const grandTotal = resolveOrderGrandTotal(order);

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

  const subtotal =
    order.subtotal ||
    (order.items || []).reduce(
      (acc: number, it: any) => acc + Number(it.price || 0) * Number(it.quantity || 1),
      0,
    );
  const shippingFee = order.shippingFee ?? order.courierCharges ?? 0;
  const tax = order.tax?.totalTax || 0;
  const discount = order.discount || 0;
  const platformFee = order.platformFee || 0;
  const codFee = order.codFee || 0;
  const orderAdminLink = `${publicBaseUrl}/admin/orders/${order._id || ''}`;

  const body = `
    <h2>New Order: ${escapeHtml(productName)}</h2>
    <p style="color: #606c38; font-size: 13.5px; margin-top: -6px; margin-bottom: 18px;">
      Invoice: <strong style="color: #283618;">${escapeHtml(invoiceNumber)}</strong> • Customer: <strong>${escapeHtml(customerName)}</strong>
    </p>
    
    <!-- Prominent Grand Total Banner -->
    <div style="background-color: #faf5e6; border: 2px solid #283618; border-radius: 10px; padding: 16px 20px; margin-bottom: 22px;">
      <table border="0" cellpadding="0" cellspacing="0" width="100%">
        <tr>
          <td align="left" valign="middle">
            <span style="font-size: 11px; font-weight: 800; color: #606c38; text-transform: uppercase; letter-spacing: 0.08em; display: block; margin-bottom: 4px;">Grand Total Amount</span>
            <strong style="font-size: 26px; font-weight: 900; color: #283618; font-family: monospace; display: block; line-height: 1.1;">${formatCurrency(grandTotal)}</strong>
          </td>
          <td align="right" valign="middle">
            <span style="background-color: #283618; color: #ffffff; font-size: 12px; font-weight: 800; padding: 6px 14px; border-radius: 999px; text-transform: uppercase; letter-spacing: 0.05em; display: inline-block;">
              ${escapeHtml(order.paymentStatus || 'PAID')}
            </span>
            <span style="display: block; font-size: 11.5px; color: #606c38; margin-top: 5px; font-weight: 600;">
              via ${escapeHtml(order.paymentMethod === 'cod' ? 'Cash on Delivery' : order.paymentMethod || 'Online')}
            </span>
          </td>
        </tr>
      </table>
    </div>

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
      {
        label: 'Grand Total',
        value: `<strong style="color: #283618; font-size: 15px; font-family: monospace;">${formatCurrency(grandTotal)}</strong>`,
      },
      {
        label: 'Payment Method',
        value: `${escapeHtml(order.paymentMethod || 'N/A')} (${escapeHtml(order.paymentStatus || 'Pending')})`,
      },
      {
        label: 'Invoice Ref',
        value: `<code>${escapeHtml(invoiceNumber)}</code>`,
      },
    ])}
    
    <h3 style="color: #283618; margin-top: 24px; margin-bottom: 10px;">Ordered Products</h3>
    ${itemsTable(order.items)}
    ${totalsSummary(subtotal, shippingFee, tax, grandTotal, discount, platformFee, codFee)}
    
    ${addressBlock('Delivery Address', order.shippingAddress)}

    <div style="margin: 28px 0 12px 0; text-align: center;">
      <a href="${orderAdminLink}" target="_blank" style="background-color: #283618; color: #ffffff !important; border: 2px solid #283618; padding: 13px 30px; text-decoration: none; font-size: 14px; font-weight: 700; border-radius: 999px; display: inline-block; box-shadow: 0 4px 12px rgba(40, 54, 24, 0.2);">
        Manage Order in Admin Panel
      </a>
    </div>
  `;

  return {
    subject: `[New Order] ${productName} by ${customerName} (${formatCurrency(grandTotal)})`,
    html: getLuxuryEmailWrapper('Admin Alert', body),
  };
};

export const buildOrderStatusChangeEmail = (order: any, oldStatus: string, newStatus: string) => {
  const store = getStoreConfigSync();
  const domain = store.websiteDomain || 'akulas.kitchen';
  const primaryItem = getPrimaryEntityName(order.items) || 'Order';
  const invoiceNumber = order.invoiceNumber || order.invoice?.number;
  const grandTotal = resolveOrderGrandTotal(order);
  const trackUrl = getPublicOrderTrackingUrl(order);

  const preheader = `Your order status is now ${newStatus}`;

  const subtotal =
    order.subtotal ||
    (order.items || []).reduce(
      (acc: number, it: any) => acc + Number(it.price || 0) * Number(it.quantity || 1),
      0,
    );
  const shippingFee = order.shippingFee ?? order.courierCharges ?? 0;
  const tax = order.tax?.totalTax || 0;
  const discount = order.discount || 0;

  const body = `
    <h2>Order Status Updated</h2>
    <p>Hi ${escapeHtml(order.shippingAddress?.name || 'Customer')}, your order is now <span style="background-color: #f7bb0e; color: #283618; font-weight: 800; padding: 2px 10px; border-radius: 999px; font-size: 12.5px; display: inline-block;">${escapeHtml(newStatus)}</span>.</p>
    
    ${dataTable([
      { label: 'Order Item', value: `<strong>${escapeHtml(primaryItem)}</strong>` },
      { label: 'Status', value: `<strong>${escapeHtml(newStatus)}</strong>` },
      ...(invoiceNumber ? [{ label: 'Invoice No', value: escapeHtml(invoiceNumber) }] : []),
      {
        label: 'Grand Total',
        value: `<strong style="font-family: monospace;">${formatCurrency(grandTotal)}</strong>`,
      },
    ])}
    
    <h3 style="color: #283618; margin-top: 22px; margin-bottom: 10px;">Order Summary</h3>
    ${itemsTable(order.items)}
    ${totalsSummary(subtotal, shippingFee, tax, grandTotal, discount)}

    <div style="margin: 30px 0 20px; text-align: center;">
      <a href="${trackUrl}" target="_blank" style="background-color: #283618; color: #ffffff !important; border: 2px solid #283618; padding: 14px 34px; text-decoration: none; font-size: 14px; font-weight: 700; border-radius: 999px; display: inline-block; box-shadow: 0 4px 14px rgba(40, 54, 24, 0.22);">
        Track Your Order
      </a>
    </div>
    <p style="text-align: center; margin: 0; font-size: 12px; color: #606c38;">
      Instant live tracking • No login required
    </p>
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
  const grandTotal = resolveOrderGrandTotal(order);
  const checkoutUrl = `${getPublicWebsiteUrl()}/checkout`;

  const preheader = `Payment issue with your ${primaryItem} order`;

  const body = `
    <h2 style="color: #b91c1c;">Payment Incomplete</h2>
    <p>Hi ${escapeHtml(order.shippingAddress?.name || 'Customer')}, we could not process the payment for your order.</p>
    
    ${dataTable([
      { label: 'Item', value: `<strong>${escapeHtml(primaryItem)}</strong>` },
      { label: 'Reason', value: escapeHtml(reason) },
      {
        label: 'Amount',
        value: `<strong style="font-family: monospace;">${formatCurrency(grandTotal)}</strong>`,
      },
      ...(displayRef ? [{ label: 'Ref', value: escapeHtml(displayRef) }] : []),
    ])}
    
    <div style="margin: 28px 0; text-align: center;">
      <a href="${checkoutUrl}" target="_blank" style="background-color: #283618; color: #ffffff !important; border: 2px solid #283618; padding: 13px 32px; text-decoration: none; font-size: 14px; font-weight: 700; border-radius: 999px; display: inline-block; box-shadow: 0 4px 12px rgba(40, 54, 24, 0.18);">
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
