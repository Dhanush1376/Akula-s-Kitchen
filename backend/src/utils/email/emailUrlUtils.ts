import jwt from 'jsonwebtoken';
import logger from '../../config/logger';

/**
 * Robust public website URL for all emails, SMS, and public customer communications.
 * GUARANTEED to NEVER return localhost or 127.0.0.1.
 */
export const getPublicWebsiteUrl = (): string => {
  const siteUrl = process.env.SITE_URL || process.env.VITE_SITE_URL;
  if (siteUrl && !siteUrl.includes('localhost') && !siteUrl.includes('127.0.0.1')) {
    return siteUrl.replace(/\/$/, '');
  }

  const frontendUrl = process.env.FRONTEND_URL;
  if (frontendUrl && !frontendUrl.includes('localhost') && !frontendUrl.includes('127.0.0.1')) {
    return frontendUrl.replace(/\/$/, '');
  }

  return 'https://akulas.kitchen';
};

/**
 * Sanitizes any URL to ensure localhost / 127.0.0.1 never leaks into outgoing emails.
 */
export const sanitizeEmailUrl = (url?: string): string => {
  if (!url || typeof url !== 'string') return getPublicWebsiteUrl();
  const trimmed = url.trim();
  if (trimmed.includes('localhost') || trimmed.includes('127.0.0.1')) {
    return trimmed.replace(
      /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i,
      'https://akulas.kitchen',
    );
  }
  return trimmed;
};

/**
 * Resolves a product image URL to a 100% public, HTTPS accessible URL for email clients.
 * - Resolves relative /uploads/... to https://akulas.kitchen/uploads/...
 * - Replaces localhost:5000 / localhost:5173 with https://akulas.kitchen
 * - Preserves Cloudinary & external HTTPS images
 * - Uses reliable official logo fallback for missing/empty images
 */
export const resolveEmailImageUrl = (rawUrl?: string): string => {
  const fallback = 'https://akulas.kitchen/MainLogo_bg.png';
  if (!rawUrl || typeof rawUrl !== 'string') {
    return fallback;
  }

  const trimmed = rawUrl.trim();
  if (!trimmed || trimmed === 'null' || trimmed === 'undefined') {
    return fallback;
  }

  // 1. If it's already an external public HTTPS image (e.g. Cloudinary, Unsplash, S3)
  if (
    trimmed.startsWith('https://') &&
    !trimmed.includes('localhost') &&
    !trimmed.includes('127.0.0.1')
  ) {
    return trimmed;
  }

  // 2. Strip localhost / 127.0.0.1 domain
  let cleanPath = trimmed.replace(/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i, '').trim();

  // If path is empty after stripping localhost, return fallback
  if (!cleanPath) {
    return fallback;
  }

  // 3. Upgrade http:// to https:// for non-local public URLs
  if (cleanPath.startsWith('http://')) {
    return cleanPath.replace(/^http:\/\//, 'https://');
  }

  // 4. Ensure leading slash for relative paths
  if (!cleanPath.startsWith('/')) {
    cleanPath = `/${cleanPath}`;
  }

  // 5. Prepend public storefront domain
  return `https://akulas.kitchen${cleanPath}`;
};

/**
 * Generates the public Order Tracking URL for email buttons.
 * Signs a 90-day tracking token so customers can track instantly with 1-click on any device without login.
 */
export const getPublicOrderTrackingUrl = (order: any): string => {
  const baseUrl = getPublicWebsiteUrl();
  if (!order) return `${baseUrl}/dashboard/orders`;

  const orderId = (
    order._id ||
    order.id ||
    order.orderUuid ||
    order.invoiceNumber ||
    ''
  ).toString();
  if (!orderId) return `${baseUrl}/dashboard/orders`;

  try {
    const secret = process.env.JWT_SECRET;
    if (secret) {
      const token = jwt.sign({ orderId }, secret, { expiresIn: '90d' });
      return `${baseUrl}/track/${orderId}?token=${encodeURIComponent(token)}`;
    }
  } catch (err: any) {
    logger.warn('[EMAIL URL] Failed to sign tracking token for email:', err?.message);
  }

  return `${baseUrl}/track/${orderId}`;
};

/**
 * Robustly extracts the Grand Total from an order object, checking all potential fields
 * and computing a fallback sum if necessary.
 */
export const resolveOrderGrandTotal = (order: any): number => {
  if (!order) return 0;

  if (typeof order.total === 'number' && !isNaN(order.total) && order.total > 0) {
    return order.total;
  }
  if (typeof order.totalAmount === 'number' && !isNaN(order.totalAmount) && order.totalAmount > 0) {
    return order.totalAmount;
  }
  if (
    typeof order.tax?.grandTotal === 'number' &&
    !isNaN(order.tax.grandTotal) &&
    order.tax.grandTotal > 0
  ) {
    return order.tax.grandTotal;
  }
  if (
    typeof order.invoice?.totalAmount === 'number' &&
    !isNaN(order.invoice.totalAmount) &&
    order.invoice.totalAmount > 0
  ) {
    return order.invoice.totalAmount;
  }
  if (
    typeof order.invoice?.total === 'number' &&
    !isNaN(order.invoice.total) &&
    order.invoice.total > 0
  ) {
    return order.invoice.total;
  }

  // Fallback: Compute from line items and fee components
  const itemsSubtotal = Array.isArray(order.items)
    ? order.items.reduce(
        (acc: number, it: any) => acc + Number(it.price || 0) * Number(it.quantity || 1),
        0,
      )
    : Number(order.subtotal || 0);

  const subtotal = Number(order.subtotal || itemsSubtotal || 0);
  const shippingFee = Number(order.shippingFee ?? order.courierCharges ?? 0);
  const platformFee = Number(order.platformFee || 0);
  const codFee = Number(order.codFee || 0);
  const taxAmount = Number(order.tax?.totalTax || 0);
  const discount = Number(order.discount || 0);

  const calculated = subtotal + shippingFee + platformFee + codFee + taxAmount - discount;
  return calculated > 0 ? calculated : 0;
};
