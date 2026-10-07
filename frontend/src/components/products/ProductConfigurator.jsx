import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Check, AlertCircle, Plus, Minus, ShoppingBag, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatPrice, parseNumericPrice } from '../../utils/ecommerce/priceUtils';

/**
 * Deterministically generates a configuration signature on the client
 * to match backend ProductConfigurationService.
 */
export function generateClientSignature(selectedOptions = []) {
  if (!selectedOptions || selectedOptions.length === 0) return 'default';
  const sorted = [...selectedOptions].sort((a, b) => {
    const gComp = (a.groupId || '').localeCompare(b.groupId || '');
    if (gComp !== 0) return gComp;
    return (a.optionId || '').localeCompare(b.optionId || '');
  });
  return sorted.map((opt) => `${opt.groupId}:${opt.optionId}`).join('|');
}

function buildDefaultSelections(groups = [], initial = []) {
  const map = {};
  if (initial && initial.length > 0) {
    initial.forEach((sel) => {
      const gid = String(sel.groupId || sel.group_id || sel.name || '');
      if (gid) {
        if (!map[gid]) map[gid] = [];
        map[gid].push(sel);
      }
    });
    return map;
  }

  groups.forEach((group) => {
    const gid = String(group.groupId || group.id || group._id || group.name);
    const isSingle = group.type !== 'MULTI_SELECT';

    const defaults = (group.options || []).filter(
      (opt) => (opt.default || opt.isDefault) && opt.available !== false,
    );

    let chosen = [];
    if (defaults.length > 0) {
      chosen = isSingle ? [defaults[0]] : defaults;
    } else if (group.required || isSingle) {
      const firstAvailable = (group.options || []).find((opt) => opt.available !== false);
      if (firstAvailable) {
        chosen = [firstAvailable];
      }
    }

    if (chosen.length > 0) {
      map[gid] = chosen.map((opt) => ({
        groupId: gid,
        groupName: group.name,
        optionId: String(opt.optionId || opt.id || opt._id || opt.value),
        optionLabel: opt.label,
        priceAdjustment: Number(opt.priceAdjustment) || 0,
      }));
    }
  });
  return map;
}

/**
 * ProductConfigurator
 * Shared, generic product configuration component.
 * Supports SINGLE_SELECT, MULTI_SELECT, and OPTIONAL_SINGLE_SELECT.
 */
export function ProductConfigurator({
  product,
  initialSelections = [],
  quantity = 1,
  onQuantityChange,
  onAddToCart,
  mode = 'inline', // 'inline' | 'modal'
  isSubmitting = false,
  ctaLabel = 'Add to Bag',
  ctaRef,
  secondaryAction,
}) {
  const basePrice = useMemo(() => parseNumericPrice(product?.price || 0), [product?.price]);
  const optionGroups = useMemo(() => {
    if (Array.isArray(product?.optionGroups) && product.optionGroups.length > 0) {
      return product.optionGroups;
    }

    // Fallback 1: Legacy variants
    if (Array.isArray(product?.variants) && product.variants.length > 0) {
      const groupMap = new Map();
      product.variants.forEach((v, idx) => {
        const groupName = v.name?.trim() || 'Weight';
        if (!groupMap.has(groupName)) groupMap.set(groupName, []);
        groupMap.get(groupName).push({
          optionId: `var_${idx}_${v.value}`,
          label: v.value,
          value: String(v.value || '')
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '_'),
          priceAdjustment: Number(v.price) || 0,
          available: v.inStock !== false && v.available !== false,
          isDefault: idx === 0,
          default: idx === 0,
          sortOrder: idx,
        });
      });
      const synth = [];
      groupMap.forEach((opts, name) => {
        synth.push({
          groupId: `synth_${name.toLowerCase()}`,
          name,
          type: 'SINGLE_SELECT',
          required: true,
          displayStyle: 'RADIO_CARDS',
          options: opts,
        });
      });
      if (synth.length > 0) return synth;
    }

    // Fallback 2: Single weight field
    if (product?.weight && typeof product.weight === 'string' && product.weight.trim()) {
      return [
        {
          groupId: 'grp_weight_single',
          name: 'Weight',
          type: 'SINGLE_SELECT',
          required: true,
          displayStyle: 'RADIO_CARDS',
          options: [
            {
              optionId: 'opt_w_0',
              label: product.weight.trim(),
              value: product.weight
                .trim()
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '_'),
              priceAdjustment: 0,
              available: true,
              isDefault: true,
              default: true,
              sortOrder: 0,
            },
          ],
        },
      ];
    }

    return [];
  }, [product?.optionGroups, product?.variants, product?.weight]);

  // Selections state: map of groupId -> array of selected option objects
  const [selections, setSelections] = useState(() =>
    buildDefaultSelections(optionGroups, initialSelections),
  );

  // Synchronize selections whenever optionGroups loads or changes
  useEffect(() => {
    setSelections((prev) => {
      const hasAll =
        optionGroups.length > 0 &&
        optionGroups.every((g) => {
          const gid = String(g.groupId || g.id || g._id || g.name);
          return prev[gid] !== undefined && prev[gid].length > 0;
        });
      if (hasAll) return prev;
      return buildDefaultSelections(optionGroups, initialSelections);
    });
  }, [optionGroups, initialSelections]);

  const [errors, setErrors] = useState({});
  const groupRefs = useRef({});

  // Flattened selected options array
  const flatSelectedOptions = useMemo(() => {
    const list = [];
    Object.values(selections).forEach((arr) => {
      if (Array.isArray(arr)) list.push(...arr);
    });
    return list;
  }, [selections]);

  // Total price calculations
  const totalAdjustment = useMemo(() => {
    return flatSelectedOptions.reduce((sum, opt) => sum + (Number(opt.priceAdjustment) || 0), 0);
  }, [flatSelectedOptions]);

  const configuredUnitPrice = Math.max(0, basePrice + totalAdjustment);
  const lineTotal = configuredUnitPrice * quantity;
  const configurationSignature = useMemo(
    () => generateClientSignature(flatSelectedOptions),
    [flatSelectedOptions],
  );

  // Toggle selection for a single-select or multi-select group
  const handleSelectOption = (group, option) => {
    if (option.available === false) return;

    const gid = String(group.groupId || group.id || group._id || group.name);
    const oid = String(option.optionId || option.id || option._id || option.value);

    // Clear validation error on change
    if (errors[gid]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[gid];
        return next;
      });
    }

    setSelections((prev) => {
      const current = prev[gid] || [];
      const isSelected = current.some((item) => item.optionId === oid);

      if (group.type === 'MULTI_SELECT') {
        if (isSelected) {
          return {
            ...prev,
            [gid]: current.filter((item) => item.optionId !== oid),
          };
        } else {
          // Check max limit
          if (group.maxSelections && current.length >= group.maxSelections) {
            return prev;
          }
          return {
            ...prev,
            [gid]: [
              ...current,
              {
                groupId: gid,
                groupName: group.name,
                optionId: oid,
                optionLabel: option.label,
                priceAdjustment: Number(option.priceAdjustment) || 0,
              },
            ],
          };
        }
      } else {
        // SINGLE_SELECT or OPTIONAL_SINGLE_SELECT
        if (group.type === 'OPTIONAL_SINGLE_SELECT' && isSelected) {
          // Can deselect in optional single select
          return {
            ...prev,
            [gid]: [],
          };
        }
        return {
          ...prev,
          [gid]: [
            {
              groupId: gid,
              groupName: group.name,
              optionId: oid,
              optionLabel: option.label,
              priceAdjustment: Number(option.priceAdjustment) || 0,
            },
          ],
        };
      }
    });
  };

  // Validate and submit
  const handleSubmit = (e) => {
    if (e) e.preventDefault();

    const newErrors = {};
    let firstErrorGid = null;
    const finalSelections = { ...selections };

    optionGroups.forEach((group) => {
      const gid = String(group.groupId || group.id || group._id || group.name);
      let chosen = finalSelections[gid] || [];

      // Auto-fallback to default option if none chosen
      if (chosen.length === 0 && (group.options || []).length > 0) {
        const defaultOpt =
          (group.options || []).find(
            (opt) => (opt.default || opt.isDefault) && opt.available !== false,
          ) || (group.options || []).find((opt) => opt.available !== false);

        if (defaultOpt) {
          const autoChosen = [
            {
              groupId: gid,
              groupName: group.name,
              optionId: String(
                defaultOpt.optionId || defaultOpt.id || defaultOpt._id || defaultOpt.value,
              ),
              optionLabel: defaultOpt.label,
              priceAdjustment: Number(defaultOpt.priceAdjustment) || 0,
            },
          ];
          finalSelections[gid] = autoChosen;
          chosen = autoChosen;
        }
      }

      if (group.required && chosen.length === 0) {
        newErrors[gid] = `Please select an option for "${group.name}".`;
        if (!firstErrorGid) firstErrorGid = gid;
      } else if (group.type === 'MULTI_SELECT') {
        if (group.minSelections && chosen.length < group.minSelections) {
          newErrors[gid] = `Please choose at least ${group.minSelections} for "${group.name}".`;
          if (!firstErrorGid) firstErrorGid = gid;
        }
      }
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      // Smooth scroll to first missing required option
      if (firstErrorGid && groupRefs.current[firstErrorGid]) {
        groupRefs.current[firstErrorGid].scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
      }
      return;
    }

    const flatFinalOptions = [];
    Object.values(finalSelections).forEach((arr) => {
      if (Array.isArray(arr)) flatFinalOptions.push(...arr);
    });
    const finalAdjustment = flatFinalOptions.reduce(
      (sum, opt) => sum + (Number(opt.priceAdjustment) || 0),
      0,
    );
    const finalUnitPrice = Math.max(0, basePrice + finalAdjustment);
    const finalSig = generateClientSignature(flatFinalOptions);

    if (onAddToCart) {
      onAddToCart({
        id: product._id || product.id,
        productId: product._id || product.id,
        title: product.title,
        imageSrc: product.imageSrc || product.images?.[0],
        price: finalUnitPrice,
        configuredUnitPrice: finalUnitPrice,
        basePrice,
        quantity,
        variant: 'Default',
        selectedOptions: flatFinalOptions,
        configurationSignature: finalSig,
        isNonRefundable: true,
      });
    }
  };

  if (!optionGroups || optionGroups.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-6 text-neutral-900 w-full">
      {/* Option Groups Container */}
      <div className="flex flex-col gap-6">
        {optionGroups.map((group, groupIndex) => {
          const gid = String(group.groupId || group.id || group._id || group.name);
          const currentSelections = selections[gid] || [];
          const hasError = Boolean(errors[gid]);

          return (
            <div
              key={gid}
              ref={(el) => (groupRefs.current[gid] = el)}
              className={`p-4 rounded-2xl transition-all duration-300 border ${
                hasError
                  ? 'bg-red-50/50 border-red-300 ring-2 ring-red-200'
                  : 'bg-white border-neutral-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.02)]'
              }`}
            >
              {/* Group Header */}
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-[13.5px] sm:text-[14px] text-neutral-950 uppercase tracking-wide">
                    {group.name}
                  </span>
                  {group.required ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-neutral-900 text-white shadow-2xs">
                      Required
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-neutral-100 text-neutral-500 border border-neutral-200/80">
                      Optional
                    </span>
                  )}
                </div>

                {group.type === 'MULTI_SELECT' && (
                  <span className="text-[11px] text-neutral-500 font-medium">
                    {group.maxSelections ? `Select up to ${group.maxSelections}` : 'Choose any'}
                  </span>
                )}
              </div>

              {/* Validation Error Banner */}
              <AnimatePresence>
                {hasError && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex items-center gap-1.5 text-red-600 text-[12px] font-semibold mb-3 overflow-hidden"
                  >
                    <AlertCircle size={14} className="shrink-0" />
                    <span>{errors[gid]}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Options Side-by-Side Grid Layout */}
              <div
                className={`w-full ${
                  (group.options || []).length <= 4
                    ? 'grid gap-2 sm:gap-2.5'
                    : 'flex items-stretch gap-2 sm:gap-2.5 overflow-x-auto pb-1 no-scrollbar'
                }`}
                style={
                  (group.options || []).length <= 4
                    ? {
                        gridTemplateColumns: `repeat(${
                          (group.options || []).length || 1
                        }, minmax(0, 1fr))`,
                      }
                    : undefined
                }
              >
                {(group.options || []).map((option) => {
                  const oid = String(option.optionId || option.id || option._id || option.value);
                  const isSelected = currentSelections.some((item) => item.optionId === oid);
                  const isUnavailable = option.available === false;
                  const adj = Number(option.priceAdjustment) || 0;

                  return (
                    <button
                      key={oid}
                      type="button"
                      disabled={isUnavailable}
                      onClick={() => handleSelectOption(group, option)}
                      className={`relative ${(group.options || []).length <= 4 ? 'w-full min-w-0' : 'min-w-[85px] sm:min-w-[100px] shrink-0'} flex flex-col items-center justify-center text-center p-2.5 sm:p-3 min-h-[58px] sm:min-h-[62px] rounded-xl border transition-all duration-200 cursor-pointer select-none active:scale-[0.98] ${
                        isUnavailable
                          ? 'opacity-40 bg-neutral-100 border-neutral-200 cursor-not-allowed'
                          : isSelected
                            ? 'bg-neutral-950 text-white border-neutral-950 shadow-md ring-1 ring-neutral-950'
                            : 'bg-white hover:bg-neutral-50/80 border-neutral-200/90 hover:border-neutral-300 text-neutral-800 shadow-2xs'
                      }`}
                    >
                      <span
                        className={`font-extrabold text-[12.5px] sm:text-[13.5px] leading-tight truncate w-full tracking-tight ${
                          isSelected ? 'text-white' : 'text-neutral-900'
                        }`}
                        title={option.label}
                      >
                        {option.label}
                      </span>

                      <div className="mt-1 flex items-center justify-center gap-1 text-[11px] sm:text-[11.5px] whitespace-nowrap font-medium">
                        {adj > 0 ? (
                          <span
                            className={`font-extrabold ${
                              isSelected ? 'text-[#f7bb0e]' : 'text-neutral-700'
                            }`}
                          >
                            +₹{formatPrice(adj)}
                          </span>
                        ) : adj < 0 ? (
                          <span
                            className={`font-extrabold ${
                              isSelected ? 'text-emerald-400' : 'text-emerald-700'
                            }`}
                          >
                            −₹{formatPrice(Math.abs(adj))}
                          </span>
                        ) : (
                          <span
                            className={`font-medium ${
                              isSelected ? 'text-neutral-300' : 'text-neutral-400'
                            }`}
                          >
                            Included
                          </span>
                        )}

                        {isUnavailable && (
                          <span className="text-[9.5px] text-red-500 font-bold uppercase ml-1">
                            Out
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer / Summary Bar (in modal or inline CTA mode) */}
      <div className="flex flex-col gap-3 pt-3 border-t border-neutral-200/80">
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-neutral-500">
              Unit Price
            </span>
            <div className="flex items-baseline gap-2">
              <motion.span
                key={configuredUnitPrice}
                initial={{ opacity: 0.5, y: -2 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className="font-serif-heading lining-nums text-[22px] sm:text-[26px] font-extrabold text-neutral-950 leading-none"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                ₹{formatPrice(configuredUnitPrice)}
              </motion.span>
              {totalAdjustment > 0 && (
                <span className="text-[11.5px] font-bold text-amber-800">
                  (+₹{formatPrice(totalAdjustment)} options)
                </span>
              )}
            </div>
          </div>

          {/* Quantity Controls */}
          {onQuantityChange && (
            <div className="flex items-center gap-2">
              <span className="text-[11px] uppercase tracking-wider font-extrabold text-neutral-500 hidden sm:inline">
                Qty
              </span>
              <div className="inline-flex items-center h-9 rounded-full border-[1.5px] border-[#f7bb0e] bg-[#fffdf0] px-1 shadow-2xs">
                <button
                  type="button"
                  onClick={() => onQuantityChange(Math.max(1, quantity - 1))}
                  disabled={quantity <= 1 || isSubmitting}
                  className="w-7 h-7 rounded-full flex items-center justify-center text-neutral-950 hover:bg-[#f7bb0e] disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
                  aria-label="Decrease quantity"
                >
                  <Minus size={12} strokeWidth={2.5} />
                </button>
                <span className="w-7 text-center font-extrabold text-[13px] text-neutral-950">
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={() => onQuantityChange(Math.min(product?.stock || 50, quantity + 1))}
                  disabled={(product?.stock != null && quantity >= product.stock) || isSubmitting}
                  className="w-7 h-7 rounded-full flex items-center justify-center text-neutral-950 hover:bg-[#f7bb0e] disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
                  aria-label="Increase quantity"
                >
                  <Plus size={12} strokeWidth={2.5} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* CTA Buttons (Side-by-Side when secondaryAction present) */}
        <div className={`w-full ${secondaryAction ? 'grid grid-cols-2 gap-2.5 sm:gap-3' : ''}`}>
          <button
            ref={ctaRef}
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || product?.stock <= 0}
            className="w-full h-[48px] sm:h-[52px] rounded-full flex items-center justify-center gap-2 sm:gap-2.5 font-extrabold text-[12px] sm:text-[13px] uppercase tracking-wider bg-[#f7bb0e] text-neutral-950 hover:bg-[#eab00d] border-[1.5px] border-[#f7bb0e] shadow-[0_1.5px_0_0_#d99b00,0_2px_4px_rgba(0,0,0,0.06)] active:scale-98 transition-all cursor-pointer px-3 sm:px-4 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ShoppingBag className="w-4 h-4 shrink-0" strokeWidth={2.2} />
            <span className="truncate">
              {ctaLabel} • ₹{formatPrice(lineTotal)}
            </span>
          </button>

          {secondaryAction}
        </div>
      </div>
    </div>
  );
}
