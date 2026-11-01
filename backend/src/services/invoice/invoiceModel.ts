/**
 * Invoice view-model — line-for-line port of
 * frontend/src/components/ui/invoiceModel.js (the data behind the invoice the
 * customer sees on the website). Kept in parity by
 * tests/unit/invoice/invoiceParity.test.ts: change both files together.
 */

export interface InvoiceItem {
  title: string;
  quantity: number;
  price: number;
  lineTotal: number;
  details: string;
}

export interface InvoiceModel {
  orderId: string;
  orderRef: string;
  invoiceNumber: string;
  invoiceDate: string;
  businessName: string;
  legalName: string;
  storeAddressLines: string[];
  paymentMode: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shippingAddressText: string;
  pin: string;
  items: InvoiceItem[];
  subtotal: number;
  discount: number;
  platformFee: number;
  codFee: number;
  grandTotal: number;
  currency: string;
  barcodeValue: string;
  trackingUrl: string;
  footer: string;
  filename: string;
}

export interface InvoiceModelOptions {
  user?: any;
  storeName?: string;
  storeSettings?: any;
  brand?: { name?: string; legalCompanyName?: string; address?: string };
  origin?: string;
}

export function buildInvoiceModel(order: any, opts: InvoiceModelOptions = {}): InvoiceModel {
  const { user = {}, storeName = '', storeSettings = {}, brand = {}, origin = '' } = opts;
  const rawItems: any[] = Array.isArray(order?.items) ? order.items : [];
  const invoiceSnap = order?.invoice || {};
  const storeSnap = order?.store || {};
  const taxSnap =
    typeof order?.tax === 'object' && order?.tax !== null ? order.tax : order?.taxSnapshot || {};

  const invoiceFooter = taxSnap.invoiceFooter || storeSettings?.taxes?.invoiceFooter || '';

  // ─── Invoice metadata ─────────────────────────────────────────────
  const orderId = String(order?.orderId || order?._id || order?.id || 'N/A');
  const invoiceNumber: string =
    invoiceSnap.number ||
    order?.invoiceNumber ||
    (order?._id ? `INV-${String(order._id).slice(-8).toUpperCase()}` : 'Not Generated');

  const rawDate = invoiceSnap.issuedAt || order?.createdAt || order?.date;
  const invoiceDate = rawDate
    ? new Date(rawDate).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        timeZone: 'Asia/Kolkata',
      })
    : 'N/A';
  const orderRef = orderId.length > 8 ? orderId.slice(-8).toUpperCase() : orderId;

  // ─── Store identity (snapshot first, then live settings) ───────────
  const businessName: string =
    storeSnap.displayName || storeName || brand.name || "Akula's Kitchen";
  const legalName: string =
    storeSnap.legalCompanyName ||
    storeSettings?.legal?.legalCompanyName ||
    storeSettings?.legal?.companyName ||
    brand.legalCompanyName ||
    '';
  const baseAddress: string =
    storeSnap.addressLine1 ||
    storeSettings?.contact?.address ||
    storeSettings?.legal?.registeredAddress ||
    brand.address ||
    '';

  const storeAddressLines: string[] = [];
  if (baseAddress) storeAddressLines.push(baseAddress);
  const lowerBase = baseAddress.toLowerCase();
  if (storeSnap.addressLine2 && !lowerBase.includes(String(storeSnap.addressLine2).toLowerCase())) {
    storeAddressLines.push(storeSnap.addressLine2);
  }
  const cityState = [storeSnap.city, storeSnap.state].filter(Boolean).join(', ');
  if (cityState && !lowerBase.includes(cityState.toLowerCase())) storeAddressLines.push(cityState);
  if (storeSnap.postalCode && !baseAddress.includes(storeSnap.postalCode)) {
    storeAddressLines.push(storeSnap.postalCode);
  }

  // ─── Payment & customer ───────────────────────────────────────────
  const paymentMode: string = order?.paymentMethod || order?.paymentMode || 'COD';
  const addr = order?.shippingAddress || order?.deliveryAddress || null;
  const customerName: string = addr?.name || order?.customer || user?.name || 'Customer';
  const customerEmail: string = order?.email || order?.shippingAddress?.email || user?.email || '';
  const customerPhone: string = addr?.phone || order?.phone || user?.phone || '';

  const addressLine1: string =
    order?.shippingAddress?.address ||
    order?.deliveryAddress?.addressString ||
    order?.address ||
    '';
  const addressLine2 = addr
    ? [addr.locality, addr.city, addr.state].filter(Boolean).join(', ')
    : '';
  const pin: string = addr?.pincode || '';
  const shippingAddressText = `${addressLine1}${addressLine2 ? `, ${addressLine2}` : ''}`;

  // ─── Items ────────────────────────────────────────────────────────
  const items: InvoiceItem[] = rawItems.map((item) => {
    const quantity = item.quantity || item.qty || 1;
    const price = Number(item.price) || Number(item.unitPrice) || 0;
    return {
      title: item.title || item.name || 'Product',
      quantity,
      price,
      lineTotal: price * quantity,
      details: [
        item.variant && item.variant !== 'Default' ? item.variant : null,
        item.weight || null,
      ]
        .filter(Boolean)
        .join(' • '),
    };
  });

  // ─── Totals (authoritative snapshot values first) ─────────────────
  const itemsSubtotal = items.reduce((acc, i) => acc + i.price * (Number(i.quantity) || 1), 0);
  const subtotal: number = taxSnap.subtotal ?? order?.subtotal ?? itemsSubtotal;
  const discount: number = taxSnap.discount ?? order?.discount ?? 0;
  const deliveryCharge: number = order?.shippingFee ?? order?.deliveryCharge ?? 0;
  const platformFee = Number(order?.platformFee ?? taxSnap.platformFee ?? 0);
  const rawGrandTotal: number =
    taxSnap.grandTotal ??
    order?.totalAmount ??
    order?.total ??
    subtotal + deliveryCharge + (order?.codFee ?? 0) + platformFee - discount;

  let codFee = Number(order?.codFee ?? taxSnap.codFee ?? 0);
  const lowerMode = String(paymentMode).toLowerCase();
  const isCodOrder = lowerMode.includes('cod') || lowerMode.includes('cash');
  if (
    codFee === 0 &&
    isCodOrder &&
    rawGrandTotal > subtotal + deliveryCharge + platformFee - discount
  ) {
    codFee = rawGrandTotal - (subtotal + deliveryCharge + platformFee - discount);
  }

  // The invoice deliberately excludes shipping charges from its commercial total.
  const grandTotal = Math.max(
    0,
    rawGrandTotal != null && rawGrandTotal > 0
      ? rawGrandTotal - deliveryCharge
      : subtotal + codFee + platformFee - discount,
  );

  const currency: string = taxSnap.currencySymbol || '₹';

  // ─── Tracking ─────────────────────────────────────────────────────
  const trackingNumber: string = order?.trackingNumber || invoiceNumber;
  const barcodeValue =
    trackingNumber !== 'Pending' && trackingNumber !== 'Not Generated'
      ? trackingNumber
      : orderId.slice(-10);
  const trackingUrl = `${origin}/track/${orderId}`;

  return {
    orderId,
    orderRef,
    invoiceNumber,
    invoiceDate,
    businessName,
    legalName: legalName && legalName !== businessName ? legalName : '',
    storeAddressLines,
    paymentMode,
    customerName,
    customerEmail,
    customerPhone,
    shippingAddressText,
    pin,
    items,
    subtotal,
    discount,
    platformFee,
    codFee,
    grandTotal,
    currency,
    barcodeValue,
    trackingUrl,
    footer:
      invoiceFooter ||
      `E. & O.E. • Computer-generated commercial invoice issued under ${businessName} regulations.`,
    filename: `Invoice_${(invoiceNumber !== 'Not Generated'
      ? invoiceNumber
      : order?._id
        ? String(order._id).slice(-8).toUpperCase()
        : 'DOC'
    ).replace(/[^a-zA-Z0-9-_]/g, '_')}.pdf`,
  };
}

/** Same thousands formatting the on-screen invoice uses. */
export const formatInvoiceAmount = (n: number) => Number(n || 0).toLocaleString('en-IN');
