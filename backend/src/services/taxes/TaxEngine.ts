import { ApiError } from '../../utils/ApiError';
import { canonicalizeState } from '../../utils/stateCanonicalizer';

export interface TaxEngineConfig {
  gstEnabled: boolean;
  taxInclusive: boolean;
  gstRate: number;
  cgstRate: number;
  sgstRate: number;
}

export interface TaxCalculationParams {
  /** Taxable subtotal (product subtotal) */
  subtotal: number;
  /** @deprecated Retained for backwards compatibility; always treated as 0 */
  discount?: number;
  /** Store registered state (e.g. 'Andhra Pradesh', 'AP') */
  storeState?: string | null;
  /** Customer shipping destination state */
  customerState?: string | null;
  /** Active tax configuration */
  taxConfig?: Partial<TaxEngineConfig>;
  taxSettings?: Partial<TaxEngineConfig>;
}

export interface TaxCalculationResult {
  taxableBase: number;
  taxableAmount: number;
  taxAmount: number;
  cgst: number;
  sgst: number;
  igst: number;
  isInterState: boolean;
  taxInclusive: boolean;
  isTaxInclusive: boolean;
  gstEnabled: boolean;
  isGstEnabled: boolean;
  gstRate: number;
  cgstRate: number;
  sgstRate: number;
  customerState?: string;
  storeState?: string;
}

export class TaxEngine {
  /**
   * Pure, authoritative calculation of taxes.
   *
   * Responsibilities:
   * - Calculates ONLY tax components (taxableAmount, taxAmount, cgst, sgst, igst).
   * - Never calculates grand totals or payable order totals.
   * - Resolves intra-state (CGST + SGST) vs inter-state (IGST) using canonical states.
   * - Enforces exact paise-reconciliation: cgst + sgst === taxAmount.
   */
  public static calculateTax(params: TaxCalculationParams): TaxCalculationResult {
    const { subtotal = 0, storeState, customerState } = params;

    // Validate customer destination state
    const canonicalCustomerState = canonicalizeState(customerState);
    if (!canonicalCustomerState) {
      throw new ApiError(
        400,
        'Destination state is required and must be a valid Indian State or Union Territory for delivery.',
      );
    }

    // Resolve store state (defaults to 'AP' if unconfigured)
    const canonicalStoreState = canonicalizeState(storeState) || 'AP';
    const isInterState = canonicalStoreState !== canonicalCustomerState;

    // Zero taxes website-wide
    const taxableBase = Math.max(0, Number(subtotal.toFixed(2)));

    return {
      taxableBase,
      taxableAmount: taxableBase,
      taxAmount: 0,
      cgst: 0,
      sgst: 0,
      igst: 0,
      isInterState,
      taxInclusive: false,
      isTaxInclusive: false,
      gstEnabled: false,
      isGstEnabled: false,
      gstRate: 0,
      cgstRate: 0,
      sgstRate: 0,
      customerState: canonicalCustomerState,
      storeState: canonicalStoreState,
    };
  }
}

export default TaxEngine;
