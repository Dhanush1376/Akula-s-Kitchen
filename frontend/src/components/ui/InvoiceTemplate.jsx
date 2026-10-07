import { X } from 'lucide-react';
import { useState, useRef, Suspense, lazy } from 'react';
import toast from 'react-hot-toast';
import { CANONICAL_INVOICE } from './invoiceTokens';
import { useConfig } from '../../context/ConfigContext';
import { BRAND } from '../../config/brand';

const QRCodeCanvas = lazy(() => import('qrcode.react').then((m) => ({ default: m.QRCodeCanvas })));
const Barcode = lazy(() => import('react-barcode'));

/**
 * Authentic Commercial Business Invoice
 *
 * Designed with:
 * - Sharp, crisp, professional borders (strictly ZERO soft/rounded corners)
 * - Formal corporate typography and monochrome structured layout
 * - Tabular 2-column Billed To / Shipped To box with dividing rule
 * - 5-column commercial items table (#, Description, Price, Qty, Total)
 * - Complete mathematical price breakdown with exact labels
 * - Formal Terms & Conditions / Non-Returnable Policy section
 * - Order Tracking verification barcode & QR code
 * - High-DPI Lossless PDF generation via html2canvas & jsPDF
 */
export function InvoiceTemplate({ order, user = {}, onClose, isAdmin = false }) {
  const { storeName, storeSettings } = useConfig();

  const [isDownloading, setIsDownloading] = useState(false);
  const printRef = useRef(null);

  if (!order) return null;

  // ─── Order Items ───────────────────────────────────────────────────
  const rawItems = Array.isArray(order.items) ? order.items : [];

  // ─── Read from immutable snapshots ─────────────────────────────────
  const invoiceSnap = order.invoice || {};
  const storeSnap = order.store || {};
  const taxSnap =
    typeof order.tax === 'object' && order.tax !== null ? order.tax : order.taxSnapshot || {};

  const isGstEnabled = false;
  const invoiceFooter = taxSnap.invoiceFooter || storeSettings?.taxes?.invoiceFooter || '';

  // ─── Invoice metadata ─────────────────────────────────────────────
  const orderId = order.orderId || order._id || order.id || 'N/A';

  const displayInvoiceNumber =
    invoiceSnap.number ||
    order.invoiceNumber ||
    (order._id ? `INV-${order._id.slice(-8).toUpperCase()}` : 'Not Generated');

  const invoiceNumber = displayInvoiceNumber;
  const invoiceHeading = 'INVOICE';

  const rawDate = invoiceSnap.issuedAt || order.createdAt || order.date;
  const invoiceDate = rawDate
    ? new Date(rawDate).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : 'N/A';

  // ─── Store identity (from snapshot with live fallback) ─────────────
  const businessName = storeSnap.displayName || storeName || BRAND.name || "Akula's Kitchen";
  const legalName =
    storeSnap.legalCompanyName ||
    storeSettings?.legal?.legalCompanyName ||
    storeSettings?.legal?.companyName ||
    BRAND.legalCompanyName ||
    '';

  const storeEmail =
    storeSnap.email ||
    storeSettings?.general?.supportEmail ||
    storeSettings?.contact?.email ||
    BRAND.email ||
    'support@akulaskitchen.com';

  const baseAddress =
    storeSnap.addressLine1 ||
    storeSettings?.contact?.address ||
    storeSettings?.legal?.registeredAddress ||
    BRAND.address ||
    'Plot No. 93/1, Purvanchal Silver City, Block-9-B204, Sector 93, Noida, Uttar Pradesh, India - 201304';

  const storeAddressLines = [];
  if (baseAddress) {
    storeAddressLines.push(baseAddress);
  }
  if (
    storeSnap.addressLine2 &&
    !baseAddress.toLowerCase().includes(storeSnap.addressLine2.toLowerCase())
  ) {
    storeAddressLines.push(storeSnap.addressLine2);
  }
  const cityState = [storeSnap.city, storeSnap.state].filter(Boolean).join(', ');
  if (cityState && !baseAddress.toLowerCase().includes(cityState.toLowerCase())) {
    storeAddressLines.push(cityState);
  }
  if (storeSnap.postalCode && !baseAddress.includes(storeSnap.postalCode)) {
    storeAddressLines.push(storeSnap.postalCode);
  }

  // ─── Payment (from live order fields) ──────────────────────────────
  const paymentMode = order.paymentMethod || order.paymentMode || 'COD';

  // ─── Customer (from live order fields) ─────────────────────────────
  const customerName =
    order.shippingAddress?.name ||
    order.deliveryAddress?.name ||
    order.customer ||
    user.name ||
    'Customer';
  const customerEmail = order.email || order.shippingAddress?.email || user.email || '';
  const customerPhone =
    order.shippingAddress?.phone || order.deliveryAddress?.phone || order.phone || user.phone || '';

  // ─── Shipping address (from live order fields) ─────────────────────
  let addressLine1 =
    order.shippingAddress?.address || order.deliveryAddress?.addressString || order.address || '';
  let addressLine2 = '';
  let pin = '';

  if (order.shippingAddress || order.deliveryAddress) {
    const addrObj = order.shippingAddress || order.deliveryAddress;
    const parts = [];
    if (addrObj.locality) parts.push(addrObj.locality);
    if (addrObj.city) parts.push(addrObj.city);
    if (addrObj.state) parts.push(addrObj.state);
    if (parts.length > 0) {
      addressLine2 = parts.join(', ');
    }
    pin = addrObj.pincode || '';
  }

  // ─── Items (normalized) ───────────────────────────────────────────
  const items = rawItems.map((item) => ({
    ...item,
    title: item.title || item.name || 'Product',
    quantity: item.quantity || item.qty || 1,
    price: Number(item.price) || Number(item.unitPrice) || 0,
  }));

  // ─── Financial calculations (Authoritative values) ─────────────────
  const itemsSubtotal = items.reduce(
    (acc, i) => acc + (Number(i.price) || 0) * (Number(i.quantity) || 1),
    0,
  );
  const subtotal = taxSnap.subtotal ?? order.subtotal ?? itemsSubtotal;

  const discount = taxSnap.discount ?? order.discount ?? 0;
  const deliveryCharge = order.shippingFee ?? order.deliveryCharge ?? 0;
  const shippingFee = deliveryCharge;
  const platformFee = Number(order.platformFee ?? taxSnap.platformFee ?? 0);

  const grandTotal =
    taxSnap.grandTotal ??
    order.totalAmount ??
    order.total ??
    subtotal + deliveryCharge + (order.codFee ?? 0) + platformFee - discount;

  // Authoritative COD Handling Fee resolution
  let codFee = Number(order.codFee ?? taxSnap.codFee ?? 0);
  const isCodOrder =
    String(paymentMode).toLowerCase().includes('cod') ||
    String(paymentMode).toLowerCase().includes('cash');

  if (codFee === 0 && isCodOrder && grandTotal > subtotal + shippingFee + platformFee - discount) {
    codFee = grandTotal - (subtotal + shippingFee + platformFee - discount);
  }

  const currency = taxSnap.currencySymbol || '₹';

  // ─── Tracking info ────────────────────────────────────────────────
  const trackingNumber = order.trackingNumber || displayInvoiceNumber;
  const trackingQR = `${typeof window !== 'undefined' ? window.location.origin : ''}/track/${orderId}`;

  // ─── High-Res PDF Capture ─────────────────────────────────────────
  const handleDownload = async () => {
    setIsDownloading(true);
    let clone = null;
    try {
      const element = printRef.current;
      if (!element) throw new Error('Invoice element not found');

      // Create an offscreen clone with fixed 540px canonical width for standard A4 export
      clone = element.cloneNode(true);
      clone.id = 'invoice-pdf-capture-clone';
      clone.style.width = '540px';
      clone.style.minWidth = '540px';
      clone.style.maxWidth = '540px';
      clone.style.boxSizing = 'border-box';
      clone.style.padding = '24px';
      clone.style.borderRadius = '0px';
      clone.style.transform = 'none';
      clone.style.position = 'fixed';
      clone.style.left = '-9999px';
      clone.style.top = '0';
      clone.style.opacity = '1';
      clone.style.visibility = 'visible';
      clone.style.pointerEvents = 'none';
      clone.style.zIndex = '-9999';
      clone.style.backgroundColor = '#ffffff';
      clone.style.color = '#000000';
      clone.style.fontFamily = CANONICAL_INVOICE.FONT_FAMILY;
      document.body.appendChild(clone);

      // Copy canvas bitmaps (QR code and Barcode) from original into clone as static images
      const origCanvases = element.querySelectorAll('canvas');
      const cloneCanvases = clone.querySelectorAll('canvas');
      origCanvases.forEach((orig, idx) => {
        const dest = cloneCanvases[idx];
        if (dest && orig.width > 0 && orig.height > 0) {
          try {
            const dataUrl = orig.toDataURL('image/png');
            const img = document.createElement('img');
            img.src = dataUrl;
            img.width = orig.width;
            img.height = orig.height;
            img.style.width = `${dest.offsetWidth || dest.width || orig.offsetWidth || 68}px`;
            img.style.height = `${dest.offsetHeight || dest.height || orig.offsetHeight || 68}px`;
            img.style.display = 'block';
            img.className = dest.className;
            if (dest.parentNode) {
              dest.parentNode.replaceChild(img, dest);
            }
          } catch (_e) {
            dest.width = orig.width;
            dest.height = orig.height;
            const destCtx = dest.getContext('2d');
            if (destCtx) {
              destCtx.drawImage(orig, 0, 0);
            }
          }
        }
      });

      // Ensure web fonts are completely resolved before rendering
      if (document.fonts && document.fonts.ready) {
        try {
          await document.fonts.ready;
        } catch (_e) {
          // ignore font readiness errors
        }
      }
      await new Promise((r) => setTimeout(r, 100));

      const html2canvasModule = await import('html2canvas');
      const html2canvas = html2canvasModule.default || html2canvasModule;
      const { jsPDF } = await import('jspdf');

      const cloneHeight = Math.max(
        Math.ceil(clone.getBoundingClientRect().height) + 4,
        clone.offsetHeight,
        clone.scrollHeight,
        element.offsetHeight,
        720,
      );

      const canvas = await html2canvas(clone, {
        scale: 3.5, // 540 * 3.5 = 1890px (~300 DPI high-definition print quality)
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        width: 540,
        height: cloneHeight,
        logging: false,
        imageTimeout: 0,
      });

      if (clone && clone.parentNode) {
        clone.parentNode.removeChild(clone);
        clone = null;
      }

      // Use lossless PNG to avoid compression artifacts around text and barcodes
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');

      const margin = 10;
      const pdfWidth = pdf.internal.pageSize.getWidth() - margin * 2;
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(
        imgData,
        'PNG',
        margin,
        margin,
        pdfWidth,
        Math.min(pdfHeight, 277),
        undefined,
        'FAST',
      );

      // Build authoritative clean filename
      const rawNum = invoiceNumber;
      const cleanNum = (
        rawNum && rawNum !== 'Not Generated'
          ? rawNum
          : order._id
            ? String(order._id).slice(-8).toUpperCase()
            : 'DOC'
      ).replace(/[^a-zA-Z0-9-_]/g, '_');
      const filename = `Invoice_${cleanNum}.pdf`;

      const isIOS =
        typeof navigator !== 'undefined' &&
        (/iPad|iPhone|iPod/.test(navigator.userAgent) ||
          (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));

      if (isIOS) {
        const pdfBlob = pdf.output('blob');
        const blobUrl = URL.createObjectURL(pdfBlob);
        const win = window.open(blobUrl, '_blank');
        if (!win) {
          const downloadLink = document.createElement('a');
          downloadLink.href = blobUrl;
          downloadLink.download = filename;
          downloadLink.target = '_blank';
          document.body.appendChild(downloadLink);
          downloadLink.click();
          setTimeout(() => {
            if (downloadLink.parentNode) downloadLink.parentNode.removeChild(downloadLink);
          }, 3000);
        }
      } else {
        try {
          pdf.save(filename);
        } catch (_saveErr) {
          const pdfBlob = pdf.output('blob');
          const blobUrl = URL.createObjectURL(pdfBlob);
          const downloadLink = document.createElement('a');
          downloadLink.href = blobUrl;
          downloadLink.download = filename;
          downloadLink.style.display = 'none';
          document.body.appendChild(downloadLink);
          downloadLink.click();
          setTimeout(() => {
            if (downloadLink.parentNode) {
              downloadLink.parentNode.removeChild(downloadLink);
            }
            URL.revokeObjectURL(blobUrl);
          }, 5000);
        }
      }

      toast.success('Invoice downloaded successfully');
    } catch (err) {
      console.error('Invoice download failed', err);
      toast.error('Failed to generate PDF. Please try again.');
    } finally {
      if (clone && clone.parentNode) {
        clone.parentNode.removeChild(clone);
      }
      setIsDownloading(false);
    }
  };

  const INVOICE_FONT = CANONICAL_INVOICE.FONT_FAMILY;

  return (
    <div
      className="canonical-invoice-wrapper w-full flex flex-col items-center"
      style={{ fontFamily: INVOICE_FONT }}
    >
      {/* Strict Font Enforcement: Guarantees 100% constant font across all pages */}
      <style>{`
        .canonical-invoice-wrapper,
        .canonical-invoice-wrapper h1,
        .canonical-invoice-wrapper h2,
        .canonical-invoice-wrapper h3,
        .canonical-invoice-wrapper h4,
        .canonical-invoice-wrapper h5,
        .canonical-invoice-wrapper h6,
        .canonical-invoice-wrapper p,
        .canonical-invoice-wrapper span,
        .canonical-invoice-wrapper div,
        .canonical-invoice-wrapper strong,
        .canonical-invoice-wrapper td,
        .canonical-invoice-wrapper th {
          font-family: ${INVOICE_FONT} !important;
        }
        .canonical-invoice-wrapper .font-mono {
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace !important;
        }
        .canonical-invoice-wrapper .material-symbols-outlined {
          font-family: 'Material Symbols Outlined', sans-serif !important;
        }
      `}</style>

      {/* Action Header Strip (Hidden in print) */}
      <div className="no-print w-full max-w-[540px] flex justify-between items-center pb-2.5 mb-2 px-1">
        <h3
          className="text-[13px] font-bold uppercase tracking-wider text-[#111827]"
          style={{ fontFamily: INVOICE_FONT }}
        >
          {invoiceHeading}
        </h3>
        <div className="flex items-center gap-2">
          <button
            onClick={handleDownload}
            disabled={isDownloading}
            className="w-8 h-8 min-w-[32px] min-h-[32px] aspect-square rounded-full p-0 shrink-0 overflow-hidden flex items-center justify-center bg-[#111827] hover:bg-black text-white transition-all shadow-sm active:scale-95 disabled:opacity-70 cursor-pointer"
            title="Download PDF"
          >
            <span className="material-symbols-outlined text-[16px] leading-none select-none pointer-events-none flex items-center justify-center">
              {isDownloading ? 'hourglass_top' : 'download'}
            </span>
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="w-8 h-8 min-w-[32px] min-h-[32px] aspect-square rounded-full p-0 shrink-0 overflow-hidden flex items-center justify-center bg-white border border-neutral-200 hover:bg-neutral-100 text-[#111827] transition-colors shadow-sm active:scale-95 cursor-pointer"
              title="Close"
            >
              <X className="w-4 h-4 shrink-0 text-[#111827]" strokeWidth={2.2} />
            </button>
          )}
        </div>
      </div>

      {/* Sharp Commercial Invoice Canvas (Strictly ZERO soft/rounded borders, Very Thin 1px Hairline Borders) */}
      <div className="w-full flex justify-center items-start">
        <div
          ref={printRef}
          id="invoice-download-area"
          className="print-invoice-area w-full max-w-[540px] bg-white rounded-none border border-neutral-200 p-4 sm:p-5 pb-3 text-black font-sans shadow-sm print:shadow-none print:border-none print:p-4"
          style={{ fontFamily: INVOICE_FONT }}
        >
          {/* Header Section */}
          <div className="flex justify-between items-start gap-2">
            {/* Left: Brand Identity */}
            <div className="w-[56%] pr-1">
              <h1
                className="text-[18px] sm:text-[19px] font-black text-neutral-950 uppercase tracking-tight leading-tight"
                style={{ fontFamily: INVOICE_FONT }}
              >
                {businessName}
              </h1>
              {legalName && legalName !== businessName && (
                <p className="text-[10px] text-neutral-600 font-semibold tracking-wide mt-0.5">
                  {legalName}
                </p>
              )}
              <div className="text-[10px] text-neutral-700 mt-1.5 space-y-0.5 leading-snug">
                {storeAddressLines.map((line, i) => (
                  <p key={i}>{line}</p>
                ))}
              </div>
            </div>

            {/* Right: Invoice Metadata */}
            <div className="w-[44%] text-right pl-1">
              <h2
                className="text-[20px] sm:text-[22px] font-black uppercase tracking-widest text-neutral-950"
                style={{ fontFamily: INVOICE_FONT }}
              >
                {invoiceHeading}
              </h2>
              <div className="text-[10px] text-neutral-700 mt-1 space-y-0.5 leading-snug">
                {displayInvoiceNumber !== 'Not Generated' && (
                  <p>
                    Invoice No:{' '}
                    <strong className="text-neutral-950 font-mono font-bold">
                      {displayInvoiceNumber}
                    </strong>
                  </p>
                )}
                {invoiceDate !== 'N/A' && <p>Invoice Date: {invoiceDate}</p>}
                {orderId && orderId !== 'N/A' && (
                  <p>
                    Order Ref:{' '}
                    <strong className="text-neutral-950 font-mono font-bold">
                      {typeof orderId === 'string' && orderId.length > 8
                        ? orderId.slice(-8).toUpperCase()
                        : orderId}
                    </strong>
                  </p>
                )}
                {paymentMode !== 'N/A' && (
                  <p>
                    Payment Mode:{' '}
                    <strong className="text-neutral-950 uppercase font-bold">{paymentMode}</strong>
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Very Thin Hairline Separator Line */}
          <div className="w-full border-b border-neutral-200 mt-3 mb-3" />

          {/* Billed To & Shipped To: SHARP COMMERCIAL 2-COLUMN BOX WITH THIN BORDERS */}
          <div className="grid grid-cols-2 border border-neutral-200 divide-x divide-neutral-200 mb-3 rounded-none bg-neutral-50/50">
            {/* Billed To Box */}
            <div className="p-2.5 sm:p-3 flex flex-col justify-start">
              <h3
                className="font-bold text-neutral-600 uppercase tracking-wider text-[9px] pb-1 mb-1 border-b border-neutral-200"
                style={{ fontFamily: INVOICE_FONT }}
              >
                BILLED TO:
              </h3>
              <p className="font-bold text-neutral-950 text-[12px] leading-normal break-words pt-0.5">
                {customerName}
              </p>
              {customerEmail && (
                <p className="text-neutral-700 text-[10px] break-all leading-normal mt-0.5">
                  {customerEmail}
                </p>
              )}
              {customerPhone && (
                <p className="text-neutral-700 text-[10px] leading-normal mt-0.5">
                  {customerPhone}
                </p>
              )}
            </div>

            {/* Shipped To Box */}
            <div className="p-2.5 sm:p-3 flex flex-col justify-start">
              <h3
                className="font-bold text-neutral-600 uppercase tracking-wider text-[9px] pb-1 mb-1 border-b border-neutral-200"
                style={{ fontFamily: INVOICE_FONT }}
              >
                SHIPPED TO:
              </h3>
              <p className="font-bold text-neutral-950 text-[12px] leading-normal break-words pt-0.5">
                {customerName}
              </p>
              <p className="text-neutral-700 text-[10px] leading-relaxed mt-0.5 break-words">
                {addressLine1}
                {addressLine2 ? `, ${addressLine2}` : ''}
              </p>
              {pin && (
                <span className="text-neutral-950 font-bold text-[11px] font-mono block mt-1 tracking-wide">
                  PIN: {pin}
                </span>
              )}
            </div>
          </div>

          {/* Line Items Table (Sharp Commercial Grid with Thin Borders) */}
          <div className="mb-3">
            <table className="w-full border border-neutral-200 border-collapse rounded-none">
              <thead>
                <tr className="bg-neutral-50 border-b border-neutral-200 text-[9.5px] font-bold text-neutral-800 uppercase tracking-wider">
                  <th className="text-center py-2 px-1.5 w-[28px] border-r border-neutral-200">
                    #
                  </th>
                  <th className="text-left py-2 px-2.5 border-r border-neutral-200">
                    Item Description
                  </th>
                  <th className="text-right py-2 px-2 w-[70px] border-r border-neutral-200">
                    Unit Price
                  </th>
                  <th className="text-center py-2 px-1 w-[40px] border-r border-neutral-200">
                    Qty
                  </th>
                  <th className="text-right py-2 px-2.5 w-[80px]">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 text-[11px]">
                {items.map((item, idx) => {
                  const title = item.title || item.name || 'Item';
                  const qty = item.quantity || item.qty || 1;
                  const price = Number(item.price) || 0;
                  const lineTotal = price * qty;

                  return (
                    <tr key={idx} className="hover:bg-neutral-50/70 transition-colors">
                      <td className="py-2.5 px-1.5 text-center font-mono text-[10px] text-neutral-500 border-r border-neutral-200">
                        {idx + 1}
                      </td>
                      <td className="py-2.5 px-2.5 font-medium text-neutral-950 border-r border-neutral-200">
                        <div className="leading-snug font-semibold">{title}</div>
                        {item.variant && item.variant !== 'Default' && (
                          <span className="block text-[8.5px] text-neutral-600 font-normal mt-0.5">
                            Variant: {item.variant}
                          </span>
                        )}
                        {item.weight && (
                          <span className="block text-[8.5px] text-neutral-600 font-normal">
                            Net Wt: {item.weight}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-2 text-right font-mono text-neutral-700 border-r border-neutral-200">
                        {currency}
                        {price.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-1 text-center font-bold text-neutral-950 border-r border-neutral-200">
                        {qty}
                      </td>
                      <td className="py-2.5 px-2.5 text-right font-bold font-mono text-neutral-950">
                        {currency}
                        {lineTotal.toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Subtotals & Breakdown Section */}
            <div className="pt-2.5 pr-1 space-y-1 text-[10.5px] text-right">
              {/* Exact user-requested label: Subtotal (Excluding Shipping Charges) */}
              <div className="flex justify-end items-center gap-3">
                <span className="font-semibold text-neutral-600">
                  Subtotal (Excluding Shipping Charges):
                </span>
                <span className="font-bold font-mono text-neutral-950 min-w-[85px]">
                  {currency}
                  {subtotal.toLocaleString()}
                </span>
              </div>

              {discount > 0 && (
                <div className="flex justify-end items-center gap-3 text-emerald-700">
                  <span className="font-semibold">Coupon / Promo Discount:</span>
                  <span className="font-bold font-mono min-w-[85px]">
                    -{currency}
                    {discount.toLocaleString()}
                  </span>
                </div>
              )}

              {/* Exact user-requested label: Shipping Charges */}
              <div className="flex justify-end items-center gap-3">
                <span className="font-semibold text-neutral-600">Shipping Charges:</span>
                <span className="font-bold font-mono text-neutral-950 min-w-[85px]">
                  {shippingFee > 0 ? (
                    `${currency}${shippingFee.toLocaleString()}`
                  ) : (
                    <span className="text-emerald-700 font-bold">FREE</span>
                  )}
                </span>
              </div>

              {platformFee > 0 && (
                <div className="flex justify-end items-center gap-3">
                  <span className="font-semibold text-neutral-600">Packaging & Platform Fee:</span>
                  <span className="font-bold font-mono text-neutral-950 min-w-[85px]">
                    {currency}
                    {platformFee.toLocaleString()}
                  </span>
                </div>
              )}

              {codFee > 0 && (
                <div className="flex justify-end items-center gap-3">
                  <span className="font-semibold text-neutral-600">COD Handling Fee:</span>
                  <span className="font-bold font-mono text-neutral-950 min-w-[85px]">
                    {currency}
                    {codFee.toLocaleString()}
                  </span>
                </div>
              )}
            </div>

            {/* Grand Total Banner (Sharp Commercial Thin 1px Border) */}
            <div className="border-y border-neutral-200 bg-neutral-50/80 py-2.5 px-3 flex justify-between items-center mt-2.5 rounded-none">
              <div>
                <span className="font-black text-neutral-950 text-[11.5px] uppercase tracking-wider block">
                  GRAND TOTAL:
                </span>
                <span className="text-[9.5px] text-neutral-600">
                  Payment Mode:{' '}
                  <strong className="text-neutral-950 uppercase font-bold">{paymentMode}</strong>
                </span>
              </div>
              <span className="font-black font-mono text-neutral-950 text-[16px]">
                {currency}
                {grandTotal.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Formal Commercial Terms & Conditions (Strictly Monochrome, Sharp Thin 1px Border) */}
          <div className="border border-neutral-200 bg-neutral-50/40 p-2.5 sm:p-3 my-3 rounded-none text-left">
            <h4
              className="font-bold text-[9.5px] uppercase tracking-wider text-neutral-900 pb-1 mb-1.5 border-b border-neutral-200"
              style={{ fontFamily: INVOICE_FONT }}
            >
              TERMS & CONDITIONS / RETURN POLICY
            </h4>
            <div className="text-[9.5px] text-neutral-700 space-y-1 leading-relaxed">
              <p>
                1. <strong>Perishable Goods Policy:</strong> In compliance with food safety and
                hygiene regulations, all freshly prepared edible culinary products are{' '}
                <strong>strictly non-returnable and non-exchangeable</strong> once dispatched or
                delivered.
              </p>
              <p>
                2. <strong>Transit Damage / Tampering:</strong> Any transit damage or outer seal
                discrepancy must be reported within 24 hours of delivery along with package unboxing
                proof to support.
              </p>
              <p>
                3. <strong>Declaration:</strong> This is an authorized computer-generated commercial
                invoice issued by {businessName} and requires no physical signatures.
              </p>
            </div>
          </div>

          {/* Order Tracking: FULL WIDTH ROW (Sharp Borders, Barcode & QR) */}
          <div className="border border-neutral-200 p-2.5 my-2.5 rounded-none">
            <h4
              className="font-bold text-[9px] uppercase tracking-wider text-neutral-700 mb-1.5"
              style={{ fontFamily: INVOICE_FONT }}
            >
              ORDER TRACKING & VERIFICATION
            </h4>
            <div className="flex items-center justify-between gap-3 sm:gap-4">
              {/* Left: Square QR Code */}
              <div className="shrink-0 border border-neutral-200 p-1 bg-white">
                <Suspense
                  fallback={<div className="w-[64px] h-[64px] bg-neutral-100 animate-pulse" />}
                >
                  <QRCodeCanvas value={trackingQR} size={64} level="H" includeMargin={false} />
                </Suspense>
              </div>

              {/* Right: Barcode with Centered "SCAN" Label */}
              <div className="flex-1 flex flex-col items-center justify-center pl-1 sm:pl-2">
                <span className="font-bold text-[8px] uppercase tracking-widest text-neutral-500 mb-0.5 text-center">
                  SCAN FOR DISPATCH RECORD
                </span>
                <div className="w-full flex justify-center overflow-hidden">
                  <Suspense fallback={<div className="w-48 h-9 bg-neutral-100 animate-pulse" />}>
                    <Barcode
                      value={
                        trackingNumber !== 'Pending' && trackingNumber !== 'Not Generated'
                          ? trackingNumber
                          : orderId.slice(-10)
                      }
                      height={34}
                      width={1.25}
                      displayValue={false}
                      margin={0}
                      renderer="canvas"
                    />
                  </Suspense>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Legal Disclaimer */}
          <div className="pt-1.5 mt-2 text-center text-neutral-500 text-[8px] font-medium leading-normal border-t border-neutral-200">
            {invoiceFooter ||
              `E. & O.E. • This is a computer-generated commercial invoice issued under ${businessName} regulations.`}
          </div>
        </div>
      </div>
    </div>
  );
}
