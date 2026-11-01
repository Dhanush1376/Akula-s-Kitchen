import path from 'path';
import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import {
  buildInvoiceModel,
  formatInvoiceAmount,
  InvoiceModel,
  InvoiceModelOptions,
} from './invoiceModel';

/**
 * Server-side twin of the website invoice (frontend/src/components/ui/InvoiceTemplate.jsx).
 *
 * Every box is drawn at the same CSS-pixel coordinates the browser lays the
 * template out at on its canonical 480px canvas (measured from the rendered
 * DOM), with the same fonts (Inter + a monospace face), colours (Tailwind
 * neutral scale), letter-spacing, QR code and Code128 barcode — then scaled to
 * A4 exactly like the website's "Download PDF" (480px → 190mm, 10mm margins).
 * The output is vector text, so it stays crisp and searchable in email clients.
 */

// ─── Geometry & palette (CSS px on the 480px canvas) ─────────────────────────
const CANVAS = 480;
const PAD = 14;
const HAIR = 0.8; // 1 CSS px border as rendered
const X0 = PAD + HAIR; // content left edge (14.8)
const W = CANVAS - 2 * X0; // content width (450.4)

const C = {
  n950: '#0a0a0a',
  n800: '#262626',
  n700: '#404040',
  n600: '#525252',
  n500: '#737373',
  n400: '#a1a1a1',
  n300: '#d4d4d4',
  n200: '#e5e5e5',
  n50: '#fafafa',
  emerald700: '#047857',
  white: '#ffffff',
};

// ─── Fonts ───────────────────────────────────────────────────────────────────
type Weight = 400 | 500 | 600 | 700 | 900;
type Family = 'sans' | 'mono';

function fontFile(pkg: string, file: string): string {
  try {
    return path.join(path.dirname(require.resolve(`${pkg}/package.json`)), 'files', file);
  } catch {
    return path.join(process.cwd(), 'node_modules', pkg, 'files', file);
  }
}

function registerFonts(doc: PDFKit.PDFDocument) {
  for (const w of [400, 500, 600, 700]) {
    doc.registerFont(`sans-${w}`, fontFile('@fontsource/inter', `inter-latin-${w}-normal.woff`));
    // ₹ lives only in Inter's latin-ext subset (browsers fall back the same way).
    doc.registerFont(`ext-${w}`, fontFile('@fontsource/inter', `inter-latin-ext-${w}-normal.woff`));
  }
  for (const w of [400, 700]) {
    doc.registerFont(
      `mono-${w}`,
      fontFile('@fontsource/roboto-mono', `roboto-mono-latin-${w}-normal.woff`),
    );
  }
}

interface Style {
  size: number;
  weight?: Weight;
  family?: Family;
  color?: string;
  ls?: number; // letter-spacing in px
  upper?: boolean;
}

interface Seg extends Style {
  text: string;
}

// The storefront loads Inter 400–700 only (index.html), so browsers draw the
// template's font-black (900) headings at 700. Match what customers see.
const renderedWeight = (w: Weight = 400) => (w > 700 ? 700 : w);

const fontName = (s: Style, ch?: string) => {
  const weight = renderedWeight(s.weight);
  if (ch === '₹') return `ext-${weight}`;
  if (s.family === 'mono') return `mono-${weight >= 600 ? 700 : 400}`;
  return `sans-${weight}`;
};

/** Split a segment into runs so ₹ uses the fallback face, like the browser. */
function runsOf(seg: Seg): { text: string; font: string; style: Seg }[] {
  const text = seg.upper ? seg.text.toUpperCase() : seg.text;
  const out: { text: string; font: string; style: Seg }[] = [];
  for (const part of text.split(/(₹)/)) {
    if (!part) continue;
    out.push({ text: part, font: fontName(seg, part === '₹' ? '₹' : undefined), style: seg });
  }
  return out;
}

class Painter {
  constructor(private doc: PDFKit.PDFDocument) {}

  private metrics(font: string, size: number) {
    this.doc.font(font).fontSize(size);
    const f: any = (this.doc as any)._font;
    return { asc: (f.ascender / 1000) * size, desc: (-f.descender / 1000) * size };
  }

  width(segs: Seg[]): number {
    let w = 0;
    for (const seg of segs) {
      for (const r of runsOf(seg)) {
        this.doc.font(r.font).fontSize(seg.size);
        w += this.doc.widthOfString(r.text, { characterSpacing: seg.ls || 0 });
      }
    }
    return w;
  }

  /**
   * Draw one line of (possibly mixed-style) text inside a CSS line box.
   * `top` is the line box top, `lh` its height; baselines are shared and the
   * first segment's font defines the strut, as in CSS inline layout.
   */
  line(
    segs: Seg[],
    x: number,
    top: number,
    lh: number,
    opts: { align?: 'left' | 'right' | 'center'; width?: number } = {},
  ) {
    if (!segs.length) return;
    const strut = this.metrics(fontName(segs[0]), segs[0].size);
    const baseline = top + (lh - (strut.asc + strut.desc)) / 2 + strut.asc;
    const total = this.width(segs);
    let cx = x;
    if (opts.align === 'right') cx = x + (opts.width || 0) - total;
    if (opts.align === 'center') cx = x + ((opts.width || 0) - total) / 2;
    for (const seg of segs) {
      for (const r of runsOf(seg)) {
        const m = this.metrics(r.font, seg.size);
        this.doc
          .fillColor(seg.color || C.n950)
          .text(r.text, cx, baseline - m.asc, { lineBreak: false, characterSpacing: seg.ls || 0 });
        cx += this.doc.widthOfString(r.text, { characterSpacing: seg.ls || 0 });
      }
    }
  }

  /** Word-wrap mixed-style text into `width`; returns the number of lines drawn. */
  flow(segs: Seg[], x: number, top: number, width: number, lh: number): number {
    const words: Seg[] = [];
    for (const seg of segs) {
      const parts = (seg.upper ? seg.text.toUpperCase() : seg.text).split(/(\s+)/);
      for (const p of parts) if (p) words.push({ ...seg, upper: false, text: p });
    }
    const lines: Seg[][] = [[]];
    let lineW = 0;
    for (const w of words) {
      const ww = this.width([w]);
      const isSpace = /^\s+$/.test(w.text);
      if (!isSpace && lineW + ww > width + 0.01 && lines[lines.length - 1].length) {
        lines.push([]);
        lineW = 0;
      }
      if (isSpace && lines[lines.length - 1].length === 0) continue;
      lines[lines.length - 1].push(w);
      lineW += ww;
    }
    lines.forEach((l, i) => {
      while (l.length && /^\s+$/.test(l[l.length - 1].text)) l.pop();
      this.line(l, x, top + i * lh, lh);
    });
    return lines.length;
  }

  countLines(segs: Seg[], width: number): number {
    // Measure-only pass using the same wrapping rules as flow().
    const words: Seg[] = [];
    for (const seg of segs) {
      for (const p of (seg.upper ? seg.text.toUpperCase() : seg.text).split(/(\s+)/))
        if (p) words.push({ ...seg, upper: false, text: p });
    }
    let lines = 1;
    let lineW = 0;
    let lineHas = false;
    for (const w of words) {
      const ww = this.width([w]);
      const isSpace = /^\s+$/.test(w.text);
      if (!isSpace && lineW + ww > width + 0.01 && lineHas) {
        lines++;
        lineW = 0;
        lineHas = false;
      }
      if (isSpace && !lineHas) continue;
      lineW += ww;
      lineHas = true;
    }
    return lines;
  }

  rect(x: number, y: number, w: number, h: number, fill: string) {
    this.doc.rect(x, y, w, h).fill(fill);
  }

  /** CSS-style borders: each side is a filled hairline inside the box. */
  border(x: number, y: number, w: number, h: number, color: string, sides = 'TRBL') {
    if (sides.includes('T')) this.rect(x, y, w, HAIR, color);
    if (sides.includes('B')) this.rect(x, y + h - HAIR, w, HAIR, color);
    if (sides.includes('L')) this.rect(x, y, HAIR, h, color);
    if (sides.includes('R')) this.rect(x + w - HAIR, y, HAIR, h, color);
  }
}

// ─── Barcode (Code128, same encoder as react-barcode / JsBarcode) ────────────
function code128Bits(value: string): string {
  const barcodes = require('jsbarcode/bin/barcodes').default;
  const encoded = new barcodes.CODE128(value, {}).encode();
  return Array.isArray(encoded) ? encoded.map((e: any) => e.data).join('') : encoded.data;
}

// ─── Layout ──────────────────────────────────────────────────────────────────
function drawInvoice(doc: PDFKit.PDFDocument, m: InvoiceModel): number {
  const p = new Painter(doc);
  const amt = (n: number) => `${m.currency}${formatInvoiceAmount(n)}`;

  // Header — left: brand identity
  const leftX = X0;
  const leftW = 252.6;
  p.line(
    [{ text: m.businessName, size: 14, weight: 900, ls: -0.35, upper: true }],
    leftX,
    X0,
    17.5,
  );
  let leftY = X0 + 17.5;
  if (m.legalName) {
    leftY += 2;
    p.line([{ text: m.legalName, size: 8, weight: 600, color: C.n500, ls: 0.2 }], leftX, leftY, 10);
    leftY += 10;
  }
  leftY += 2;
  for (const lineText of m.storeAddressLines) {
    const n = p.flow([{ text: lineText, size: 8, color: C.n600 }], leftX, leftY, leftW, 10);
    leftY += n * 10;
  }

  // Header — right: invoice metadata
  const rightX = 283.4;
  const rightW = W + X0 - rightX;
  p.line([{ text: 'INVOICE', size: 16, weight: 900, ls: 1.6 }], rightX, X0, 20, {
    align: 'right',
    width: rightW,
  });
  let rightY = X0 + 20 + 2;
  const meta: { label: string; value: string; mono: boolean; upper?: boolean }[] = [];
  if (m.invoiceNumber !== 'Not Generated')
    meta.push({ label: 'Invoice No: ', value: m.invoiceNumber, mono: true });
  if (m.invoiceDate !== 'N/A')
    meta.push({ label: `Invoice Date: ${m.invoiceDate}`, value: '', mono: false });
  if (m.orderId && m.orderId !== 'N/A')
    meta.push({ label: 'Order Ref: ', value: m.orderRef, mono: true });
  if (m.paymentMode !== 'N/A')
    meta.push({ label: 'Payment Mode: ', value: m.paymentMode, mono: false, upper: true });
  meta.forEach((row, i) => {
    const h = row.mono ? 10.8 : 10;
    const segs: Seg[] = [{ text: row.label, size: 8, color: C.n600 }];
    if (row.value)
      segs.push({
        text: row.value,
        size: 8,
        weight: 700,
        color: C.n950,
        family: row.mono ? 'mono' : 'sans',
        upper: row.upper,
      });
    p.line(segs, rightX, rightY, h, { align: 'right', width: rightW });
    rightY += h + (i < meta.length - 1 ? 2 : 0);
  });

  let y = Math.max(leftY, rightY) + 6;
  p.rect(X0, y, W, HAIR, C.n200);
  y += HAIR + 6;

  // Billed to / Shipped to
  const colW = (W - 2 * HAIR) / 2;
  const colPad = 6;
  const textW = colW - 2 * colPad;
  const nameLines = (t: string) => p.countLines([{ text: t, size: 10, weight: 700 }], textW);
  const addrLines = p.countLines([{ text: m.shippingAddressText, size: 8 }], textW);
  const headH = 11.25 + 2 + HAIR;
  const leftColH =
    headH +
    2 +
    nameLines(m.customerName) * 12.5 +
    (m.customerEmail ? 2 + 10 : 0) +
    (m.customerPhone ? 2 + 10 : 0);
  const rightColH =
    headH + 2 + nameLines(m.customerName) * 12.5 + 2 + addrLines * 10 + (m.pin ? 2 + 12 : 0);
  const boxH = HAIR + colPad + Math.max(leftColH, rightColH) + colPad + HAIR;
  doc.save().fillOpacity(0.4).rect(X0, y, W, boxH).fill(C.n50).restore();
  p.border(X0, y, W, boxH, C.n200);
  p.rect(X0 + HAIR + colW, y + HAIR, HAIR, boxH - 2 * HAIR, C.n200);

  const drawCol = (cx: number, title: string, body: (top: number) => void) => {
    const top = y + HAIR + colPad;
    p.line([{ text: title, size: 7.5, weight: 700, color: C.n500, ls: 0.375 }], cx, top, 11.25);
    p.rect(cx, top + 11.25 + 2, textW, HAIR, C.n200);
    body(top + headH + 2);
  };
  drawCol(X0 + HAIR + colPad, 'BILLED TO:', (top) => {
    let t = top;
    t +=
      p.flow(
        [{ text: m.customerName, size: 10, weight: 700 }],
        X0 + HAIR + colPad,
        t,
        textW,
        12.5,
      ) * 12.5;
    if (m.customerEmail) {
      p.line([{ text: m.customerEmail, size: 8, color: C.n600 }], X0 + HAIR + colPad, t + 2, 10);
      t += 12;
    }
    if (m.customerPhone)
      p.line([{ text: m.customerPhone, size: 8, color: C.n600 }], X0 + HAIR + colPad, t + 2, 10);
  });
  const rcx = X0 + HAIR + colW + HAIR + colPad;
  drawCol(rcx, 'SHIPPED TO:', (top) => {
    let t = top;
    t += p.flow([{ text: m.customerName, size: 10, weight: 700 }], rcx, t, textW, 12.5) * 12.5;
    t += 2;
    t += p.flow([{ text: m.shippingAddressText, size: 8, color: C.n600 }], rcx, t, textW, 10) * 10;
    if (m.pin)
      p.line(
        [{ text: `PIN: ${m.pin}`, size: 8, weight: 700, family: 'mono', ls: 0.2 }],
        rcx,
        t + 2,
        12,
      );
  });
  y += boxH + 6;

  // Items table
  const cols = [
    { w: 20, align: 'center' as const, pad: 4 },
    { w: W - 2 * HAIR - 20 - 58 - 28 - 65, align: 'left' as const, pad: 6 },
    { w: 58, align: 'right' as const, pad: 4 },
    { w: 28, align: 'center' as const, pad: 2 },
    { w: 65, align: 'right' as const, pad: 6 },
  ];
  const tableX = X0 + HAIR;
  const tableTop = y;
  const headRowH = 2 + 12 + 2 + HAIR;
  p.rect(tableX, y + HAIR, W - 2 * HAIR, headRowH - HAIR, C.n50);
  const headers = ['#', 'ITEM DESCRIPTION', 'UNIT PRICE', 'QTY', 'AMOUNT'];
  let cx = tableX;
  const colXs: number[] = [];
  cols.forEach((c, i) => {
    colXs.push(cx);
    p.line(
      [{ text: headers[i], size: 8, weight: 700, color: C.n700, ls: 0.4 }],
      cx + c.pad,
      y + HAIR + 2,
      12,
      { align: c.align, width: c.w - 2 * c.pad },
    );
    cx += c.w;
  });
  y += HAIR + headRowH;
  p.rect(tableX, y - HAIR, W - 2 * HAIR, HAIR, C.n200);

  m.items.forEach((item, idx) => {
    const descW = cols[1].w - 2 * cols[1].pad;
    const titleLines = p.countLines([{ text: item.title, size: 9, weight: 600 }], descW);
    const contentH = item.details ? titleLines * 11.25 + 8.75 : Math.max(13.5, titleLines * 11.25);
    const rowH = 4 + contentH + 4;
    const mid = y + rowH / 2;
    const titleTop = y + 4 + (item.details ? 0 : (contentH - titleLines * 11.25) / 2);
    p.flow(
      [{ text: item.title, size: 9, weight: 600 }],
      colXs[1] + cols[1].pad,
      titleTop,
      descW,
      11.25,
    );
    if (item.details) {
      p.line(
        [{ text: item.details, size: 7, color: C.n500 }],
        colXs[1] + cols[1].pad,
        titleTop + titleLines * 11.25,
        8.75,
      );
    }
    p.line(
      [{ text: String(idx + 1), size: 7.5, family: 'mono', color: C.n500 }],
      colXs[0] + cols[0].pad,
      mid - 11.25 / 2,
      11.25,
      { align: 'center', width: cols[0].w - 2 * cols[0].pad },
    );
    p.line(
      [{ text: amt(item.price), size: 9, family: 'mono', color: C.n700 }],
      colXs[2] + cols[2].pad,
      mid - 13.5 / 2,
      13.5,
      { align: 'right', width: cols[2].w - 2 * cols[2].pad },
    );
    p.line(
      [{ text: String(item.quantity), size: 9, weight: 700 }],
      colXs[3] + cols[3].pad,
      mid - 13.5 / 2,
      13.5,
      { align: 'center', width: cols[3].w - 2 * cols[3].pad },
    );
    p.line(
      [{ text: amt(item.lineTotal), size: 9, weight: 700, family: 'mono' }],
      colXs[4] + cols[4].pad,
      mid - 13.5 / 2,
      13.5,
      { align: 'right', width: cols[4].w - 2 * cols[4].pad },
    );
    y += rowH;
    if (idx < m.items.length - 1) p.rect(tableX, y, W - 2 * HAIR, HAIR, C.n200);
    if (idx < m.items.length - 1) y += HAIR;
  });
  y += HAIR;
  // Outer and column borders
  p.border(X0, tableTop, W, y - tableTop, C.n200);
  for (let i = 1; i < colXs.length; i++)
    p.rect(colXs[i] - HAIR, tableTop + HAIR, HAIR, y - tableTop - 2 * HAIR, C.n200);

  // Subtotals
  y += 4;
  const valueRight = X0 + W - 2;
  const valueW = 62;
  const row = (label: string, value: string, color: string, valueColor: string, mono: boolean) => {
    const valX = valueRight - valueW;
    p.line(
      [{ text: value, size: 8, weight: 700, family: mono ? 'mono' : 'sans', color: valueColor }],
      valX,
      y,
      12,
      { align: 'right', width: valueW },
    );
    const lw = p.width([{ text: label, size: 8, weight: 600 }]);
    p.line([{ text: label, size: 8, weight: 600, color }], valX - 8 - lw, y, 12);
    y += 12 + 2;
  };
  row('Subtotal (Excluding Shipping Charges):', amt(m.subtotal), C.n600, C.n950, true);
  if (m.discount > 0)
    row('Coupon / Promo Discount:', `-${amt(m.discount)}`, C.emerald700, C.emerald700, true);
  row('Shipping Charges:', 'Excluded', C.n600, C.n600, false);
  if (m.platformFee > 0) row('Packaging & Platform Fee:', amt(m.platformFee), C.n600, C.n950, true);
  if (m.codFee > 0) row('COD Handling Fee:', amt(m.codFee), C.n600, C.n950, true);
  y -= 2;

  // Grand total banner
  y += 4;
  const gtH = HAIR + 4 + 11.875 + 24 + 4 + HAIR;
  doc.save().fillOpacity(0.8).rect(X0, y, W, gtH).fill(C.n50).restore();
  p.border(X0, y, W, gtH, C.n200, 'TB');
  const gtTop = y + HAIR + 4;
  p.line([{ text: 'GRAND TOTAL:', size: 9.5, weight: 900, ls: 0.475 }], X0 + 6, gtTop, 11.875);
  p.line(
    [
      { text: 'Payment Mode: ', size: 7, color: C.n600 },
      { text: m.paymentMode, size: 7, weight: 700, upper: true },
    ],
    X0 + 6,
    gtTop + 11.875 + (24 - 8.75) / 2 + 3.3,
    8.75,
  );
  p.line(
    [{ text: amt(m.grandTotal), size: 13, weight: 900, family: 'mono' }],
    X0 + 6,
    y + gtH / 2 - 19.5 / 2,
    19.5,
    { align: 'right', width: W - 12 },
  );
  y += gtH;

  // Terms & conditions
  y += 6;
  const termsW = W - 2 * HAIR - 12;
  const terms: Seg[][] = [
    [
      { text: '1. ', size: 7.2, color: C.n600 },
      { text: 'Perishable Goods Policy:', size: 7.2, weight: 700, color: C.n600 },
      { text: ' Edible food items are ', size: 7.2, color: C.n600 },
      { text: 'strictly non-returnable & non-exchangeable', size: 7.2, weight: 700, color: C.n600 },
      { text: ' once dispatched.', size: 7.2, color: C.n600 },
    ],
    [
      { text: '2. ', size: 7.2, color: C.n600 },
      { text: 'Transit Issues:', size: 7.2, weight: 700, color: C.n600 },
      {
        text: ' Report damages within 24h of delivery with package unboxing video/proof to support.',
        size: 7.2,
        color: C.n600,
      },
    ],
    [
      { text: '3. ', size: 7.2, color: C.n600 },
      { text: 'Declaration:', size: 7.2, weight: 700, color: C.n600 },
      {
        text: ` Computer-generated commercial invoice issued by ${m.businessName}; requires no physical signature.`,
        size: 7.2,
        color: C.n600,
      },
    ],
  ];
  const termLines = terms.map((t) => p.countLines(t, termsW));
  const termsBodyH = termLines.reduce((a, n) => a + n * 9, 0) + 2 * (terms.length - 1);
  const termsH = HAIR + 6 + 11.25 + 2 + HAIR + 2 + termsBodyH + 6 + HAIR;
  doc.save().fillOpacity(0.4).rect(X0, y, W, termsH).fill(C.n50).restore();
  p.border(X0, y, W, termsH, C.n200);
  let ty = y + HAIR + 6;
  p.line(
    [
      {
        text: 'TERMS & CONDITIONS / RETURN POLICY',
        size: 7.5,
        weight: 700,
        color: C.n800,
        ls: 0.375,
      },
    ],
    X0 + HAIR + 6,
    ty,
    11.25,
  );
  p.rect(X0 + HAIR + 6, ty + 11.25 + 2, termsW, HAIR, C.n200);
  ty += 11.25 + 2 + HAIR + 2;
  terms.forEach((t, i) => {
    const n = p.flow(t, X0 + HAIR + 6, ty, termsW, 9);
    ty += n * 9 + (i < terms.length - 1 ? 2 : 0);
  });
  y += termsH;

  // Order tracking & verification (QR + barcode)
  y += 4;
  const trkH = HAIR + 6 + 10.5 + 2 + 41.6 + 6 + HAIR;
  p.border(X0, y, W, trkH, C.n200);
  const trkTop = y + HAIR + 6;
  p.line(
    [{ text: 'ORDER TRACKING & VERIFICATION', size: 7, weight: 700, color: C.n600, ls: 0.35 }],
    X0 + HAIR + 6,
    trkTop,
    10.5,
  );
  const qrBoxY = trkTop + 10.5 + 2;
  const qrBoxX = X0 + HAIR + 6;
  p.rect(qrBoxX, qrBoxY, 41.6, 41.6, C.white);
  p.border(qrBoxX, qrBoxY, 41.6, 41.6, C.n200);
  const qr = QRCode.create(m.trackingUrl, { errorCorrectionLevel: 'H' });
  const cell = 36 / qr.modules.size;
  for (let r = 0; r < qr.modules.size; r++) {
    for (let c = 0; c < qr.modules.size; c++) {
      if (qr.modules.get(r, c))
        doc.rect(
          qrBoxX + HAIR + 2 + c * cell,
          qrBoxY + HAIR + 2 + r * cell,
          cell + 0.02,
          cell + 0.02,
        );
    }
  }
  doc.fill('#000000'); // qrcode.react default foreground

  const areaX = qrBoxX + 41.6 + 8 + 4;
  const areaW = X0 + W - HAIR - 6 - areaX;
  const colTop = qrBoxY + (41.6 - (9.75 + 2 + 18)) / 2;
  p.line(
    [{ text: 'SCAN FOR DISPATCH RECORD', size: 6.5, weight: 700, color: C.n400, ls: 0.65 }],
    areaX,
    colTop,
    9.75,
    { align: 'center', width: areaW },
  );
  const bits = code128Bits(m.barcodeValue);
  const moduleW = 1.05;
  const barsW = bits.length * moduleW;
  const scaleBars = barsW > areaW ? areaW / barsW : 1; // overflow-hidden in the template
  const bx = areaX + (areaW - barsW * scaleBars) / 2;
  const by = colTop + 9.75 + 2;
  for (let i = 0; i < bits.length; i++) {
    if (bits[i] === '1') doc.rect(bx + i * moduleW * scaleBars, by, moduleW * scaleBars + 0.01, 18);
  }
  doc.fill('#000000');
  y += trkH;

  // Footer disclaimer
  y += 4;
  p.rect(X0, y, W, HAIR, C.n200);
  const footerTop = y + HAIR + 2;
  const footerSeg: Seg[] = [{ text: m.footer, size: 6.5, weight: 500, color: C.n400 }];
  let fl = 1;
  if (p.countLines(footerSeg, W) === 1) {
    p.line(footerSeg, X0, footerTop, 8.125, { align: 'center', width: W });
  } else {
    fl = p.flow(footerSeg, X0, footerTop, W, 8.125); // long custom footers wrap
  }
  y = footerTop + fl * 8.125;

  return y + PAD + HAIR; // full canvas height
}

/** Render the invoice PDF for an order. */
export async function renderInvoicePdf(
  order: any,
  opts: InvoiceModelOptions = {},
): Promise<{ buffer: Buffer; filename: string; model: InvoiceModel }> {
  const model = buildInvoiceModel(order, opts);
  const doc = new PDFDocument({
    size: 'A4',
    margin: 0,
    info: {
      Title: `Invoice ${model.invoiceNumber}`,
      Author: model.businessName,
      Subject: `Order ${model.orderRef}`,
    },
  });
  registerFonts(doc);
  const chunks: Buffer[] = [];
  doc.on('data', (c: Buffer) => chunks.push(c));
  const done = new Promise<Buffer>((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });

  const marginPt = (10 / 25.4) * 72;
  const scale = (doc.page.width - 2 * marginPt) / CANVAS;
  // Canvas pixels that fit on one page (same slicing as the website download).
  const sliceH = (doc.page.height - 2 * marginPt) / scale;

  const drawSlice = (offset: number): number => {
    doc.save();
    doc
      .rect(marginPt, marginPt, doc.page.width - 2 * marginPt, doc.page.height - 2 * marginPt)
      .clip();
    doc.translate(marginPt, marginPt).scale(scale).translate(0, -offset);
    const h = drawInvoice(doc, model);
    // 1px neutral-300 frame (border border-neutral-300), sized to the laid-out canvas.
    new Painter(doc).border(0, 0, CANVAS, h, C.n300);
    doc.restore();
    return h;
  };

  const height = drawSlice(0);
  for (let offset = sliceH; offset < height - 0.5; offset += sliceH) {
    doc.addPage({ size: 'A4', margin: 0 });
    drawSlice(offset);
  }
  doc.end();
  return { buffer: await done, filename: model.filename, model };
}
