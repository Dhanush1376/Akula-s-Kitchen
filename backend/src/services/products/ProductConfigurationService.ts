import ApiError from '../../utils/ApiError';
import { IProduct, IProductOption } from '../../models/Product';
import { ISelectedOptionSnapshot } from '../../types/user';

export interface IProductOptionGroupConfig {
  groupId?: string;
  id?: string;
  _id?: any;
  name: string;
  type: 'SINGLE_SELECT' | 'MULTI_SELECT' | 'OPTIONAL_SINGLE_SELECT';
  required?: boolean;
  minSelections?: number;
  maxSelections?: number;
  displayStyle?: string;
  sortOrder?: number;
  options: (Partial<IProductOption> & {
    optionId?: string;
    id?: string;
    _id?: any;
    label: string;
    value?: string;
    priceAdjustment?: number;
    available?: boolean;
    isDefault?: boolean;
    sortOrder?: number;
  })[];
}

export interface IValidatedConfigurationResult {
  isValid: boolean;
  errors: string[];
  basePrice: number;
  configuredUnitPrice: number;
  selectedOptions: ISelectedOptionSnapshot[];
  configurationSignature: string;
}

export class ProductConfigurationService {
  /**
   * Deterministically generates a string signature for a set of selected options.
   * e.g. "grp1:opt1|grp2:opt2" sorted by groupId then optionId.
   */
  static generateSignature(
    selectedOptions: Array<{ groupId: string; optionId: string } | ISelectedOptionSnapshot> = [],
  ): string {
    if (!selectedOptions || selectedOptions.length === 0) {
      return 'default';
    }

    const sorted = [...selectedOptions].sort((a, b) => {
      const gComp = (a.groupId || '').localeCompare(b.groupId || '');
      if (gComp !== 0) return gComp;
      return (a.optionId || '').localeCompare(b.optionId || '');
    });

    return sorted.map((opt) => `${opt.groupId}:${opt.optionId}`).join('|');
  }

  /**
   * Validates user-selected options against authoritative Product DB optionGroups,
   * enforces requirements, limits, and option availability, and calculates the authoritative price.
   *
   * @param product The product doc or object containing price and optionGroups
   * @param requestedOptions Raw user selections from frontend
   * @param strict If true, throws ApiError for missing required groups or invalid options.
   */
  static validateAndCalculateConfiguration(
    product: Pick<IProduct, 'price' | 'optionGroups' | 'title'> | any,
    requestedOptions: any[] = [],
    strict: boolean = false,
  ): IValidatedConfigurationResult {
    const basePrice = Number(product.price) || 0;
    const optionGroups: IProductOptionGroupConfig[] = Array.isArray(product.optionGroups)
      ? product.optionGroups
      : [];

    const errors: string[] = [];

    // If product has no configuration groups defined:
    if (optionGroups.length === 0) {
      return {
        isValid: true,
        errors: [],
        basePrice,
        configuredUnitPrice: basePrice,
        selectedOptions: [],
        configurationSignature: 'default',
      };
    }

    // Index requested options by groupId -> array of optionIds
    const requestedByGroup = new Map<string, string[]>();
    for (const req of requestedOptions || []) {
      if (!req) continue;
      const gid = String(req.groupId || req.group_id || req.group || '').trim();
      const oid = String(
        req.optionId || req.option_id || req.id || req._id || req.value || '',
      ).trim();
      if (!gid || !oid) continue;

      if (!requestedByGroup.has(gid)) {
        requestedByGroup.set(gid, []);
      }
      const list = requestedByGroup.get(gid)!;
      if (list.includes(oid)) {
        const matchingGroup = optionGroups.find(
          (g) => String(g.groupId || g.id || g._id || g.name) === gid || g.name === gid,
        );
        const matchingOpt = matchingGroup?.options?.find(
          (o) => String(o.optionId || o.id || o._id || o.value) === oid || o.label === oid,
        );
        const optLabel = matchingOpt?.label || req.optionLabel || req.label || oid;
        const msg = `Option "${optLabel}" was selected more than once`;
        errors.push(msg);
        if (strict) throw new ApiError(400, msg);
      } else {
        list.push(oid);
      }
    }

    const validSnapshots: ISelectedOptionSnapshot[] = [];
    let totalAdjustments = 0;

    // Sort option groups by sortOrder for predictable processing
    const sortedGroups = [...optionGroups].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

    for (const group of sortedGroups) {
      const canonicalGroupId = String(group.groupId || group.id || group._id || group.name);
      // Allow matching by groupId OR group name
      const selectedOptionIds =
        (group.groupId && requestedByGroup.get(String(group.groupId))) ||
        (group.id && requestedByGroup.get(String(group.id))) ||
        (group._id && requestedByGroup.get(String(group._id))) ||
        requestedByGroup.get(group.name) ||
        [];

      // Required group check
      if (group.required && selectedOptionIds.length === 0) {
        const msg = `Option group "${group.name}" is required`;
        errors.push(msg);
        if (strict) throw new ApiError(400, msg);
      }

      // Check single-select constraints
      if (
        (group.type === 'SINGLE_SELECT' || group.type === 'OPTIONAL_SINGLE_SELECT') &&
        selectedOptionIds.length > 1
      ) {
        const msg = `Option group "${group.name}" only allows 1 selection`;
        errors.push(msg);
        if (strict) throw new ApiError(400, msg);
      }

      // Check multi-select constraints
      if (group.type === 'MULTI_SELECT') {
        if (group.minSelections && selectedOptionIds.length < group.minSelections) {
          const msg = `Option group "${group.name}" requires at least ${group.minSelections} selection(s)`;
          errors.push(msg);
          if (strict) throw new ApiError(400, msg);
        }
        if (group.maxSelections && selectedOptionIds.length > group.maxSelections) {
          const msg = `Option group "${group.name}" allows at most ${group.maxSelections} selection(s)`;
          errors.push(msg);
          if (strict) throw new ApiError(400, msg);
        }
      }

      // Map group options
      const availableOptionsMap = new Map<string, any>();
      for (const opt of group.options || []) {
        const canonicalOptId = String(opt.optionId || opt.id || opt._id || opt.value || opt.label);
        availableOptionsMap.set(canonicalOptId, opt);
        if (opt.optionId) availableOptionsMap.set(String(opt.optionId), opt);
        if (opt.id) availableOptionsMap.set(String(opt.id), opt);
        if (opt._id) availableOptionsMap.set(String(opt._id), opt);
        if (opt.value) availableOptionsMap.set(String(opt.value), opt);
        if (opt.label) availableOptionsMap.set(String(opt.label), opt);
      }

      for (const chosenId of selectedOptionIds) {
        const foundOption = availableOptionsMap.get(chosenId);
        if (!foundOption) {
          const msg = `Invalid option selection "${chosenId}" for "${group.name}"`;
          errors.push(msg);
          if (strict) throw new ApiError(400, msg);
          continue;
        }

        // Availability check
        if (foundOption.available === false) {
          const msg = `Option "${foundOption.label}" is currently unavailable`;
          errors.push(msg);
          if (strict) throw new ApiError(400, msg);
          continue;
        }

        const adjustment = Number(foundOption.priceAdjustment) || 0;
        totalAdjustments += adjustment;

        validSnapshots.push({
          groupId: canonicalGroupId,
          groupName: group.name,
          optionId: String(
            foundOption.optionId ||
              foundOption.id ||
              foundOption._id ||
              foundOption.value ||
              foundOption.label,
          ),
          optionLabel: foundOption.label,
          priceAdjustment: adjustment,
        });
      }
    }

    const configuredUnitPrice = Math.max(0, basePrice + totalAdjustments);
    const configurationSignature = this.generateSignature(validSnapshots);

    return {
      isValid: errors.length === 0,
      errors,
      basePrice,
      configuredUnitPrice,
      selectedOptions: validSnapshots,
      configurationSignature,
    };
  }
}
