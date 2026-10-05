/**
 * Pure, server-authoritative order total computation.
 *
 * This is the money math the backend trusts — the client's claimed total is
 * never used. Extracted from OrderCheckoutService so it can be unit-tested in
 * isolation and reused. All amounts are in whole rupees.
 */
export interface OrderTotalsInput {
  /** Sum of item price × quantity, before any adjustments. */
  subtotal: number;
  /** @deprecated Discount amount (always 0). */
  discount?: number;
  /** Total refundable deposits (rentals); 0 for standard purchases. */
  depositTotal: number;
  /** Whether this is a Cash-on-Delivery order. */
  isCod: boolean;
  /** COD surcharge from store settings. */
  codFee: number;
  /** Whether free shipping over threshold is enabled in settings. */
  enableFreeShipping?: boolean;
  /** Order subtotal at or above which shipping is free. */
  freeShippingThreshold: number;
  /** Flat delivery charge applied below the free-shipping threshold. */
  deliveryCharge: number;
  /** Optional platform convenience/processing fee from store settings. */
  platformFee?: number;
  /** Computed tax amount from TaxEngine (0 if GST disabled). */
  taxAmount?: number;
  /** Whether the prices are tax inclusive (default true). If false, tax is added on top. */
  isTaxInclusive?: boolean;
  /** @deprecated Retained for backward-compatibility only. Always ignored. */
  useWallet?: boolean;
  /** @deprecated Retained for backward-compatibility only. Always ignored. */
  walletBalance?: number;
}

export interface OrderTotals {
  shippingFee: number;
  platformFee: number;
  codFee: number;
  taxAmount: number;
  isTaxInclusive: boolean;
  /** Total payable amount, floored at 0. */
  preliminaryTotal: number;
  /** Amount redeemed from wallet (always 0). */
  walletDeduction: number;
  /** Final payable amount. */
  total: number;
}

export const computeOrderTotals = (input: OrderTotalsInput): OrderTotals => {
  const {
    subtotal,
    discount: _discount,
    depositTotal,
    isCod,
    codFee: configuredCodFee,
    enableFreeShipping = true,
    freeShippingThreshold,
    deliveryCharge,
    platformFee = 0,
    taxAmount = 0,
    isTaxInclusive = true,
  } = input;

  const resolvedPlatformFee = Math.max(0, platformFee || 0);
  const resolvedTax = Math.max(0, taxAmount || 0);
  const addedTax = isTaxInclusive ? 0 : resolvedTax;

  // Authoritative free-shipping rule:
  // 1. If cart is empty (subtotal === 0), shipping fee is always 0.
  // 2. If enableFreeShipping is true AND subtotal >= freeShippingThreshold, shipping is free (0).
  // 3. Otherwise, base delivery charge applies.
  const isFreeShipping = enableFreeShipping && subtotal >= freeShippingThreshold;
  const shippingFee = subtotal === 0 ? 0 : isFreeShipping ? 0 : deliveryCharge;

  // Preliminary payable amount before COD fee (subtotal + addedTax + shipping + deposit + platformFee)
  const preliminaryWithoutCod = Math.max(
    0,
    subtotal + addedTax + shippingFee + depositTotal + resolvedPlatformFee,
  );

  // If order is completely free, no cash is collected on delivery, so COD fee is waived
  const codFee = isCod && preliminaryWithoutCod > 0 ? configuredCodFee : 0;

  // Total payable amount
  const total = Math.max(0, preliminaryWithoutCod + codFee);

  return {
    shippingFee,
    platformFee: resolvedPlatformFee,
    codFee,
    taxAmount: resolvedTax,
    isTaxInclusive,
    preliminaryTotal: total,
    walletDeduction: 0,
    total,
  };
};
