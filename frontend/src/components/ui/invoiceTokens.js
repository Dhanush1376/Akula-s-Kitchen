/**
 * Canonical Invoice Design Tokens & Geometry Specification
 *
 * Single Source of Truth for visual dimensions, typography, and layout.
 * Canonical coordinate space: 540 CSS pixels width.
 */

export const CANONICAL_INVOICE = {
  // Dimension tokens
  CANVAS_WIDTH: 540,
  CANVAS_PADDING: 20,
  CONTENT_WIDTH: 500,
  OUTER_RADIUS: 0,
  CARD_RADIUS: 0,

  // Unified canonical typography font-family across all pages
  FONT_FAMILY:
    "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",

  // Color Palette (Neutral Premium / Food Brand Approved)
  COLORS: {
    bg: '#ffffff',
    cardBg: '#f9fafb',
    border: '#e5e7eb',
    cardBorder: '#f3f4f6',
    black: '#000000',
    textPrimary: '#111827',
    textSecondary: '#4b5563',
    textMuted: '#6b7280',
    textLight: '#9ca3af',
    tableHeaderBg: '#f3f4f6',
    dividerDark: '#111827',
    accentGreen: '#15803d',
    warningBg: '#fffbf0',
    warningBorder: '#fde68a',
    warningText: '#92400e',
  },

  // Proportional Font Sizes
  TYPOGRAPHY: {
    storeName: '18px',
    legalName: '10px',
    headerDetails: '10.5px',
    headerTitle: '17px',
    cardLabel: '9.5px',
    cardTitle: '12.5px',
    cardBody: '10.5px',
    cardPin: '11px',
    tableHeader: '10px',
    tableItem: '11px',
    tableTotal: '11px',
    subtotalsLabel: '11px',
    subtotalsValue: '11px',
    grandTotalLabel: '11.5px',
    grandTotalValue: '15.5px',
    gstHeader: '9.5px',
    gstRow: '10px',
    gstTotal: '10px',
    scanLabel: '8.5px',
    footerText: '8.5px',
  },

  // QR and Barcode Geometry
  BARCODE: {
    width: 1.3,
    height: 38,
  },
  QR: {
    size: 72,
  },
};
