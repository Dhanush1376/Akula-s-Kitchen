/**
 * Download / print the invoice exactly as it is rendered on screen.
 *
 * - PDF: the on-screen invoice node is cloned off-screen at its canonical 480px
 *   width and rasterised at ~300 DPI with html2canvas-pro (the original
 *   html2canvas cannot parse Tailwind v4's oklch() colours and threw on every
 *   download), then placed on A4 with 10mm margins.
 * - Print: the same node is printed from an isolated iframe that carries the
 *   page's stylesheets, so the popup/drawer UI around it never interferes and
 *   the printout matches the PDF (480px scaled to the A4 content width).
 */

const CANONICAL_WIDTH = 480;
const A4_MARGIN_MM = 10;
const A4_CONTENT_HEIGHT_MM = 297 - A4_MARGIN_MM * 2;

/** Replace <canvas> (QR code, barcode) in a cloned subtree with static <img> copies. */
function freezeCanvases(source, clone) {
  const originals = source.querySelectorAll('canvas');
  const copies = clone.querySelectorAll('canvas');
  originals.forEach((orig, idx) => {
    const dest = copies[idx];
    if (!dest || !orig.width || !orig.height) return;
    try {
      const img = document.createElement('img');
      img.src = orig.toDataURL('image/png');
      img.width = orig.width;
      img.height = orig.height;
      img.style.width = `${orig.offsetWidth || orig.width}px`;
      img.style.height = `${orig.offsetHeight || orig.height}px`;
      img.style.display = 'block';
      img.className = dest.className;
      dest.replaceWith(img);
    } catch {
      /* tainted canvas: keep the clone's canvas */
    }
  });
}

async function fontsReady(doc = document) {
  try {
    if (doc.fonts?.ready) await doc.fonts.ready;
  } catch {
    /* ignore */
  }
}

async function renderInvoiceCanvas(element) {
  const clone = element.cloneNode(true);
  freezeCanvases(element, clone);
  Object.assign(clone.style, {
    width: `${CANONICAL_WIDTH}px`,
    minWidth: `${CANONICAL_WIDTH}px`,
    maxWidth: `${CANONICAL_WIDTH}px`,
    boxSizing: 'border-box',
    padding: '14px',
    position: 'fixed',
    left: '-10000px',
    top: '0',
    transform: 'none',
    boxShadow: 'none',
    backgroundColor: '#ffffff',
    zIndex: '-1',
  });
  // Keep the scoped font rules that live on the invoice wrapper.
  const host = document.createElement('div');
  host.className = element.closest('.canonical-invoice-wrapper')?.className || '';
  host.appendChild(clone);
  document.body.appendChild(host);
  try {
    await fontsReady();
    await new Promise((r) => requestAnimationFrame(() => r()));
    const { default: html2canvas } = await import('html2canvas-pro');
    return await html2canvas(clone, {
      scale: 3.5,
      useCORS: true,
      backgroundColor: '#ffffff',
      width: CANONICAL_WIDTH,
      height: Math.ceil(clone.getBoundingClientRect().height),
      windowWidth: 1280,
      logging: false,
    });
  } finally {
    host.remove();
  }
}

/** Build the A4 PDF (jsPDF) of the rendered invoice; long invoices flow onto extra pages. */
export async function buildInvoicePdf(element) {
  const canvas = await renderInvoiceCanvas(element);
  const { jsPDF } = await import('jspdf');
  const pdf = new jsPDF('p', 'mm', 'a4');
  const widthMm = pdf.internal.pageSize.getWidth() - A4_MARGIN_MM * 2;
  const pxPerMm = canvas.width / widthMm;
  const pageSlicePx = Math.floor(A4_CONTENT_HEIGHT_MM * pxPerMm);

  for (let y = 0, page = 0; y < canvas.height; y += pageSlicePx, page++) {
    const sliceHeight = Math.min(pageSlicePx, canvas.height - y);
    const slice = document.createElement('canvas');
    slice.width = canvas.width;
    slice.height = sliceHeight;
    slice
      .getContext('2d')
      .drawImage(canvas, 0, y, canvas.width, sliceHeight, 0, 0, canvas.width, sliceHeight);
    if (page > 0) pdf.addPage();
    pdf.addImage(
      slice.toDataURL('image/png'),
      'PNG',
      A4_MARGIN_MM,
      A4_MARGIN_MM,
      widthMm,
      sliceHeight / pxPerMm,
      undefined,
      'FAST',
    );
  }
  return pdf;
}

const isIOS = () =>
  typeof navigator !== 'undefined' &&
  (/iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));

export async function downloadInvoicePdf(element, filename) {
  const pdf = await buildInvoicePdf(element);
  const blob = pdf.output('blob');
  const url = URL.createObjectURL(blob);
  // iOS Safari ignores the download attribute; open the PDF so it can be shared/saved.
  if (isIOS() && window.open(url, '_blank')) {
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
    return;
  }
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.rel = 'noopener';
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  setTimeout(() => {
    link.remove();
    URL.revokeObjectURL(url);
  }, 10_000);
}

/** Print the on-screen invoice (and only the invoice) on A4. */
export async function printInvoice(element, title = 'Invoice') {
  const iframe = document.createElement('iframe');
  iframe.setAttribute('aria-hidden', 'true');
  Object.assign(iframe.style, {
    position: 'fixed',
    right: '0',
    bottom: '0',
    width: '0',
    height: '0',
    border: '0',
    visibility: 'hidden',
  });
  document.body.appendChild(iframe);
  const doc = iframe.contentDocument;
  const styles = [...document.querySelectorAll('link[rel="stylesheet"], style')]
    .map((n) => n.outerHTML)
    .join('\n');
  const clone = element.cloneNode(true);
  freezeCanvases(element, clone);
  const wrapperClass = element.closest('.canonical-invoice-wrapper')?.className || '';
  const scopedFontStyle =
    element.closest('.canonical-invoice-wrapper')?.querySelector(':scope > style')?.outerHTML || '';
  // 480px canvas scaled to the 190mm A4 content width (same geometry as the PDF).
  const zoom = (((210 - A4_MARGIN_MM * 2) / 25.4) * 96) / CANONICAL_WIDTH;

  doc.open();
  doc.write(`<!doctype html><html lang="en"><head><meta charset="utf-8"><base href="${location.origin}/"><title>${title.replace(/</g, '')}</title>${styles}${scopedFontStyle}
<style>
  @page { size: A4 portrait; margin: ${A4_MARGIN_MM}mm; }
  html, body { margin: 0 !important; padding: 0 !important; background: #fff !important; min-height: 0 !important; }
  body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  #print-root { width: ${CANONICAL_WIDTH}px; zoom: ${zoom.toFixed(4)}; }
  #print-root .print-invoice-area { width: ${CANONICAL_WIDTH}px !important; max-width: none !important; padding: 14px !important; box-shadow: none !important; }
  .no-print { display: none !important; }
</style></head><body><div class="${wrapperClass}"><div id="print-root"></div></div></body></html>`);
  doc.close();
  doc.getElementById('print-root').appendChild(doc.importNode(clone, true));

  await new Promise((resolve) => {
    if (doc.readyState === 'complete') resolve();
    else iframe.addEventListener('load', resolve, { once: true });
    setTimeout(resolve, 1500);
  });
  await fontsReady(doc);

  const win = iframe.contentWindow;
  const cleanup = () => setTimeout(() => iframe.remove(), 500);
  win.addEventListener('afterprint', cleanup, { once: true });
  win.focus();
  win.print();
  setTimeout(() => iframe.isConnected && iframe.remove(), 60_000);
}
