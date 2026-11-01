import { X } from 'lucide-react';
import { useState, useRef, Suspense, lazy, forwardRef, useImperativeHandle } from 'react';
import toast from 'react-hot-toast';
import { CANONICAL_INVOICE } from './invoiceTokens';
import { buildInvoiceModel, formatInvoiceAmount } from './invoiceModel';
import { downloadInvoicePdf, printInvoice } from '../../utils/media/invoiceExport';
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
 * - High-DPI PDF download and isolated A4 print (utils/media/invoiceExport.js)
 */
export const InvoiceTemplate = forwardRef(function InvoiceTemplate(
  { order, user = {}, onClose, isAdmin = false, isEmbedded = false },
  ref,
) {
  const { storeName, storeSettings } = useConfig();

  const [isDownloading, setIsDownloading] = useState(false);
  const printRef = useRef(null);

  // All values come from the shared invoice model, which the server-side PDF
  // (attached to order emails) mirrors exactly.
  const invoice = buildInvoiceModel(order, {
    user,
    storeName,
    storeSettings,
    brand: BRAND,
    origin: typeof window !== 'undefined' ? window.location.origin : '',
  });
  const {
    orderId,
    invoiceNumber,
    invoiceDate,
    businessName,
    legalName,
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
    trackingUrl: trackingQR,
  } = invoice;
  const displayInvoiceNumber = invoiceNumber;
  const invoiceHeading = 'INVOICE';

  const handleDownload = async () => {
    if (!printRef.current) return;
    setIsDownloading(true);
    try {
      await downloadInvoicePdf(printRef.current, invoice.filename);
      toast.success('Invoice downloaded');
    } catch (err) {
      console.error('Invoice download failed', err);
      toast.error('Failed to generate PDF. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  const handlePrint = async () => {
    if (!printRef.current) return;
    try {
      await printInvoice(printRef.current, invoice.filename.replace(/\.pdf$/, ''));
    } catch (err) {
      console.error('Invoice print failed', err);
      toast.error('Unable to open the print dialog. Please try Download PDF instead.');
    }
  };

  useImperativeHandle(ref, () => ({
    handleDownload,
    handlePrint,
    isDownloading,
  }));

  if (!order) return null;

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

      {/* Action Header Strip (Hidden in print and hidden when embedded inside customer InvoiceModal) */}
      {!isEmbedded && (
        <div className="no-print w-full max-w-[480px] flex justify-between items-center pb-2 mb-1 px-0.5">
          <div className="flex items-center gap-2">
            <h3
              className="text-[12px] font-bold uppercase tracking-wider text-[#111827]"
              style={{ fontFamily: INVOICE_FONT }}
            >
              {invoiceHeading}
            </h3>
            {invoiceNumber && (
              <span className="font-mono text-[10.5px] font-bold text-neutral-600 bg-neutral-100 px-1.5 py-0.5 rounded-[3px] border border-neutral-200">
                {invoiceNumber}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={handlePrint}
              type="button"
              className="w-7 h-7 min-w-[28px] min-h-[28px] aspect-square rounded-[4px] p-0 shrink-0 overflow-hidden flex items-center justify-center bg-white border border-neutral-200 hover:bg-neutral-100 text-[#111827] transition-colors shadow-2xs active:scale-95 cursor-pointer"
              title="Print Invoice"
            >
              <span className="material-symbols-outlined text-[15px] leading-none select-none pointer-events-none flex items-center justify-center">
                print
              </span>
            </button>
            <button
              onClick={handleDownload}
              disabled={isDownloading}
              type="button"
              className="w-7 h-7 min-w-[28px] min-h-[28px] aspect-square rounded-[4px] p-0 shrink-0 overflow-hidden flex items-center justify-center bg-[#111827] hover:bg-black text-white transition-all shadow-2xs active:scale-95 disabled:opacity-70 cursor-pointer"
              title="Download PDF"
            >
              <span className="material-symbols-outlined text-[15px] leading-none select-none pointer-events-none flex items-center justify-center">
                {isDownloading ? 'hourglass_top' : 'download'}
              </span>
            </button>
            {onClose && (
              <button
                onClick={onClose}
                type="button"
                className="w-7 h-7 min-w-[28px] min-h-[28px] aspect-square rounded-[4px] p-0 shrink-0 overflow-hidden flex items-center justify-center bg-white border border-neutral-200 hover:bg-neutral-100 text-[#111827] transition-colors shadow-2xs active:scale-95 cursor-pointer"
                title="Close"
              >
                <X className="w-3.5 h-3.5 shrink-0 text-[#111827]" strokeWidth={2.2} />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Sharp Commercial Invoice Canvas (Strictly ZERO soft/rounded borders, Very Thin 1px Hairline Borders, A4 Sheet Proportions) */}
      <div className="w-full flex justify-center items-start">
        <div
          ref={printRef}
          id="invoice-download-area"
          className="print-invoice-area w-full max-w-[480px] bg-white rounded-none border border-neutral-300 p-2.5 sm:p-3 pb-2 text-black font-sans shadow-sm print:shadow-none print:border-none print:p-2"
          style={{ fontFamily: INVOICE_FONT }}
        >
          {/* Header Section */}
          <div className="flex justify-between items-start gap-2">
            {/* Left: Brand Identity */}
            <div className="w-[58%] pr-1">
              <h1
                className="text-[13.5px] sm:text-[14px] font-black text-neutral-950 uppercase tracking-tight leading-tight"
                style={{ fontFamily: INVOICE_FONT }}
              >
                {businessName}
              </h1>
              {legalName && (
                <p className="text-[7.5px] sm:text-[8px] text-neutral-500 font-semibold tracking-wide mt-0.5 leading-tight">
                  {legalName}
                </p>
              )}
              <div className="text-[7.5px] sm:text-[8px] text-neutral-600 mt-0.5 space-y-0 leading-tight">
                {storeAddressLines.map((line, i) => (
                  <p key={i}>{line}</p>
                ))}
              </div>
            </div>

            {/* Right: Invoice Metadata */}
            <div className="w-[42%] text-right pl-1">
              <h2
                className="text-[15px] sm:text-[16px] font-black uppercase tracking-widest text-neutral-950 leading-tight"
                style={{ fontFamily: INVOICE_FONT }}
              >
                {invoiceHeading}
              </h2>
              <div className="text-[7.5px] sm:text-[8px] text-neutral-600 mt-0.5 space-y-0.5 leading-tight">
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
                      {invoice.orderRef}
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
          <div className="w-full border-b border-neutral-200 mt-1.5 mb-1.5" />

          {/* Billed To & Shipped To: SHARP COMMERCIAL 2-COLUMN BOX WITH THIN BORDERS */}
          <div className="grid grid-cols-2 border border-neutral-200 divide-x divide-neutral-200 mb-1.5 rounded-none bg-neutral-50/40">
            {/* Billed To Box */}
            <div className="p-1 sm:p-1.5 flex flex-col justify-start">
              <h3
                className="font-bold text-neutral-500 uppercase tracking-wider text-[7px] sm:text-[7.5px] pb-0.5 mb-0.5 border-b border-neutral-200"
                style={{ fontFamily: INVOICE_FONT }}
              >
                BILLED TO:
              </h3>
              <p className="font-bold text-neutral-950 text-[9.5px] sm:text-[10px] leading-tight break-words">
                {customerName}
              </p>
              {customerEmail && (
                <p className="text-neutral-600 text-[7.5px] sm:text-[8px] break-all leading-tight mt-0.5">
                  {customerEmail}
                </p>
              )}
              {customerPhone && (
                <p className="text-neutral-600 text-[7.5px] sm:text-[8px] leading-tight mt-0.5">
                  {customerPhone}
                </p>
              )}
            </div>

            {/* Shipped To Box */}
            <div className="p-1 sm:p-1.5 flex flex-col justify-start">
              <h3
                className="font-bold text-neutral-500 uppercase tracking-wider text-[7px] sm:text-[7.5px] pb-0.5 mb-0.5 border-b border-neutral-200"
                style={{ fontFamily: INVOICE_FONT }}
              >
                SHIPPED TO:
              </h3>
              <p className="font-bold text-neutral-950 text-[9.5px] sm:text-[10px] leading-tight break-words">
                {customerName}
              </p>
              <p className="text-neutral-600 text-[7.5px] sm:text-[8px] leading-tight mt-0.5 break-words">
                {shippingAddressText}
              </p>
              {pin && (
                <span className="text-neutral-950 font-bold text-[7.5px] sm:text-[8px] font-mono block mt-0.5 tracking-wide">
                  PIN: {pin}
                </span>
              )}
            </div>
          </div>

          {/* Line Items Table (Sharp Commercial Grid with Thin Borders) */}
          <div className="mb-1.5">
            <table className="w-full border border-neutral-200 border-collapse rounded-none">
              <thead>
                <tr className="bg-neutral-50 border-b border-neutral-200 text-[7.5px] sm:text-[8px] font-bold text-neutral-700 uppercase tracking-wider">
                  <th className="text-center py-0.5 px-1 w-[20px] border-r border-neutral-200">
                    #
                  </th>
                  <th className="text-left py-0.5 px-1.5 border-r border-neutral-200">
                    Item Description
                  </th>
                  <th className="text-right py-0.5 px-1 w-[58px] border-r border-neutral-200">
                    Unit Price
                  </th>
                  <th className="text-center py-0.5 px-0.5 w-[28px] border-r border-neutral-200">
                    Qty
                  </th>
                  <th className="text-right py-0.5 px-1.5 w-[65px]">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 text-[8.5px] sm:text-[9px]">
                {items.map((item, idx) => {
                  const { title, quantity: qty, price, lineTotal, details } = item;

                  return (
                    <tr key={idx} className="hover:bg-neutral-50/50 transition-colors">
                      <td className="py-1 px-1 text-center font-mono text-[7.5px] text-neutral-500 border-r border-neutral-200">
                        {idx + 1}
                      </td>
                      <td className="py-1 px-1.5 font-medium text-neutral-950 border-r border-neutral-200">
                        <div className="leading-tight font-semibold">{title}</div>
                        {details && (
                          <span className="block text-[7px] text-neutral-500 font-normal leading-tight">
                            {details}
                          </span>
                        )}
                      </td>
                      <td className="py-1 px-1 text-right font-mono text-neutral-700 border-r border-neutral-200">
                        {currency}
                        {formatInvoiceAmount(price)}
                      </td>
                      <td className="py-1 px-0.5 text-center font-bold text-neutral-950 border-r border-neutral-200">
                        {qty}
                      </td>
                      <td className="py-1 px-1.5 text-right font-bold font-mono text-neutral-950">
                        {currency}
                        {formatInvoiceAmount(lineTotal)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Subtotals & Breakdown Section */}
            <div className="pt-1 pr-0.5 space-y-0.5 text-[7.5px] sm:text-[8px] text-right">
              {/* Exact user-requested label: Subtotal (Excluding Shipping Charges) */}
              <div className="flex justify-end items-center gap-2">
                <span className="font-semibold text-neutral-600">
                  Subtotal (Excluding Shipping Charges):
                </span>
                <span className="font-bold font-mono text-neutral-950 min-w-[62px]">
                  {currency}
                  {formatInvoiceAmount(subtotal)}
                </span>
              </div>

              {discount > 0 && (
                <div className="flex justify-end items-center gap-2 text-emerald-700">
                  <span className="font-semibold">Coupon / Promo Discount:</span>
                  <span className="font-bold font-mono min-w-[62px]">
                    -{currency}
                    {formatInvoiceAmount(discount)}
                  </span>
                </div>
              )}

              {/* Exact user-requested label: Shipping Charges */}
              <div className="flex justify-end items-center gap-2">
                <span className="font-semibold text-neutral-600">Shipping Charges:</span>
                <span className="font-bold text-neutral-600 min-w-[62px]">Excluded</span>
              </div>

              {platformFee > 0 && (
                <div className="flex justify-end items-center gap-2">
                  <span className="font-semibold text-neutral-600">Packaging & Platform Fee:</span>
                  <span className="font-bold font-mono text-neutral-950 min-w-[62px]">
                    {currency}
                    {formatInvoiceAmount(platformFee)}
                  </span>
                </div>
              )}

              {codFee > 0 && (
                <div className="flex justify-end items-center gap-2">
                  <span className="font-semibold text-neutral-600">COD Handling Fee:</span>
                  <span className="font-bold font-mono text-neutral-950 min-w-[62px]">
                    {currency}
                    {formatInvoiceAmount(codFee)}
                  </span>
                </div>
              )}
            </div>

            {/* Grand Total Banner (Sharp Commercial Thin 1px Border) */}
            <div className="border-y border-neutral-200 bg-neutral-50/80 py-1 px-1.5 flex justify-between items-center mt-1 rounded-none">
              <div>
                <span className="font-black text-neutral-950 text-[9px] sm:text-[9.5px] uppercase tracking-wider block leading-tight">
                  GRAND TOTAL:
                </span>
                <span className="text-[7px] text-neutral-600 leading-tight">
                  Payment Mode:{' '}
                  <strong className="text-neutral-950 uppercase font-bold">{paymentMode}</strong>
                </span>
              </div>
              <span className="font-black font-mono text-neutral-950 text-[12px] sm:text-[13px]">
                {currency}
                {formatInvoiceAmount(grandTotal)}
              </span>
            </div>
          </div>

          {/* Formal Commercial Terms & Conditions (Strictly Monochrome, Sharp Thin 1px Border) */}
          <div className="border border-neutral-200 bg-neutral-50/40 p-1 sm:p-1.5 my-1 rounded-none text-left">
            <h4
              className="font-bold text-[7px] sm:text-[7.5px] uppercase tracking-wider text-neutral-800 pb-0.5 mb-0.5 border-b border-neutral-200"
              style={{ fontFamily: INVOICE_FONT }}
            >
              TERMS & CONDITIONS / RETURN POLICY
            </h4>
            <div className="text-[6.8px] sm:text-[7.2px] text-neutral-600 space-y-0.5 leading-tight">
              <p>
                1. <strong>Perishable Goods Policy:</strong> Edible food items are{' '}
                <strong>strictly non-returnable & non-exchangeable</strong> once dispatched.
              </p>
              <p>
                2. <strong>Transit Issues:</strong> Report damages within 24h of delivery with
                package unboxing video/proof to support.
              </p>
              <p>
                3. <strong>Declaration:</strong> Computer-generated commercial invoice issued by{' '}
                {businessName}; requires no physical signature.
              </p>
            </div>
          </div>

          {/* Order Tracking: FULL WIDTH ROW (Sharp Borders, Barcode & QR) */}
          <div className="border border-neutral-200 p-1 sm:p-1.5 my-1 rounded-none">
            <h4
              className="font-bold text-[6.5px] sm:text-[7px] uppercase tracking-wider text-neutral-600 mb-0.5"
              style={{ fontFamily: INVOICE_FONT }}
            >
              ORDER TRACKING & VERIFICATION
            </h4>
            <div className="flex items-center justify-between gap-2">
              {/* Left: Square QR Code */}
              <div className="shrink-0 border border-neutral-200 p-0.5 bg-white">
                <Suspense
                  fallback={<div className="w-[36px] h-[36px] bg-neutral-100 animate-pulse" />}
                >
                  <QRCodeCanvas value={trackingQR} size={36} level="H" includeMargin={false} />
                </Suspense>
              </div>

              {/* Right: Barcode with Centered "SCAN" Label */}
              <div className="flex-1 flex flex-col items-center justify-center pl-1">
                <span className="font-bold text-[6.5px] uppercase tracking-widest text-neutral-400 mb-0.5 text-center">
                  SCAN FOR DISPATCH RECORD
                </span>
                <div className="w-full flex justify-center overflow-hidden">
                  <Suspense fallback={<div className="w-32 h-5 bg-neutral-100 animate-pulse" />}>
                    <Barcode
                      value={barcodeValue}
                      height={18}
                      width={1.05}
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
          <div className="pt-0.5 mt-0.5 text-center text-neutral-400 text-[6.5px] font-medium leading-tight border-t border-neutral-200">
            {invoice.footer}
          </div>
        </div>
      </div>
    </div>
  );
});
