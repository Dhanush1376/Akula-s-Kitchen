/**
 * Invoice view-model: every value the invoice shows, computed from an order.
 *
 * Pure (no React, no DOM) so the exact same numbers and labels can be checked
 * against the server-side PDF renderer (backend/src/services/invoice/invoiceModel.ts,
 * a line-for-line port kept in parity by backend/tests/unit/invoice/invoiceParity.test.ts).
 * If you change a rule here, change it there too; the parity test will fail otherwise.
 */
export function buildInvoiceModel(
  order,
  { user = {}, storeName = '', storeSettings = {}, brand = {}, origin = '' } = {},
) {
  const rawItems = Array.isArray(order?.items) ? order.items : [];
  const invoiceSnap = order?.invoice || {};
  const storeSnap = order?.store || {};
  const taxSnap =
    typeof order?.tax === 'object' && order?.tax !== null ? order.tax : order?.taxSnapshot || {};

  const invoiceFooter = taxSnap.invoiceFooter || storeSettings?.taxes?.invoiceFooter || '';

  // ─── Invoice metadata ─────────────────────────────────────────────
  const orderId = String(order?.orderId || order?._id || order?.id || 'N/A');
  const invoiceNumber =
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
  const businessName = storeSnap.displayName || storeName || brand.name || "Akula's Kitchen";
  const legalName =
    storeSnap.legalCompanyName ||
    storeSettings?.legal?.legalCompanyName ||
    storeSettings?.legal?.companyName ||
    brand.legalCompanyName ||
    '';
  const baseAddress =
    storeSnap.addressLine1 ||
    storeSettings?.contact?.address ||
    storeSettings?.legal?.registeredAddress ||
    brand.address ||
    '';

  const storeAddressLines = [];
  if (baseAddress) storeAddressLines.push(baseAddress);
  const lowerBase = baseAddress.toLowerCase();
  if (storeSnap.addressLine2 && !lowerBase.includes(storeSnap.addressLine2.toLowerCase())) {
    storeAddressLines.push(storeSnap.addressLine2);
  }
  const cityState = [storeSnap.city, storeSnap.state].filter(Boolean).join(', ');
  if (cityState && !lowerBase.includes(cityState.toLowerCase())) storeAddressLines.push(cityState);
  if (storeSnap.postalCode && !baseAddress.includes(storeSnap.postalCode)) {
    storeAddressLines.push(storeSnap.postalCode);
  }

  // ─── Payment & customer ───────────────────────────────────────────
  const paymentMode = order?.paymentMethod || order?.paymentMode || 'COD';
  const addr = order?.shippingAddress || order?.deliveryAddress || null;
  const customerName = addr?.name || order?.customer || user?.name || 'Customer';
  const customerEmail = order?.email || order?.shippingAddress?.email || user?.email || '';
  const customerPhone = addr?.phone || order?.phone || user?.phone || '';

  const addressLine1 =
    order?.shippingAddress?.address ||
    order?.deliveryAddress?.addressString ||
    order?.address ||
    '';
  const addressLine2 = addr
    ? [addr.locality, addr.city, addr.state].filter(Boolean).join(', ')
    : '';
  const pin = addr?.pincode || '';
  const shippingAddressText = `${addressLine1}${addressLine2 ? `, ${addressLine2}` : ''}`;

  // ─── Items ────────────────────────────────────────────────────────
  const items = rawItems.map((item) => {
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
  const subtotal = taxSnap.subtotal ?? order?.subtotal ?? itemsSubtotal;
  const discount = taxSnap.discount ?? order?.discount ?? 0;
  const deliveryCharge = order?.shippingFee ?? order?.deliveryCharge ?? 0;
  const platformFee = Number(order?.platformFee ?? taxSnap.platformFee ?? 0);
  const rawGrandTotal =
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

  const currency = taxSnap.currencySymbol || '₹';

  // ─── Tracking ─────────────────────────────────────────────────────
  const trackingNumber = order?.trackingNumber || invoiceNumber;
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

/** Same thousands formatting the on-screen invoice uses (Number#toLocaleString). */
export const formatInvoiceAmount = (n) => Number(n || 0).toLocaleString('en-IN');
