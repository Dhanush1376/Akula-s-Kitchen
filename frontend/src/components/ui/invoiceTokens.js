/**
 * Canonical Invoice Design Tokens & Geometry Specification
 *
 * Single Source of Truth for visual dimensions, typography, and layout.
 * Canonical coordinate space: 540 CSS pixels width.
 */

export const CANONICAL_INVOICE = {
  // Dimension tokens
  CANVAS_WIDTH: 480,
  CANVAS_PADDING: 12,
  CONTENT_WIDTH: 456,
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
    storeName: '13.5px',
    legalName: '8px',
    headerDetails: '8px',
    headerTitle: '14.5px',
    cardLabel: '7.5px',
    cardTitle: '10px',
    cardBody: '8px',
    cardPin: '8.5px',
    tableHeader: '8px',
    tableItem: '8.5px',
    tableTotal: '8.5px',
    subtotalsLabel: '8px',
    subtotalsValue: '8.5px',
    grandTotalLabel: '9.5px',
    grandTotalValue: '13px',
    gstHeader: '7.5px',
    gstRow: '8px',
    gstTotal: '8px',
    scanLabel: '7px',
    footerText: '7px',
  },

  // QR and Barcode Geometry
  BARCODE: {
    width: 1.1,
    height: 22,
  },
  QR: {
    size: 40,
  },
};
