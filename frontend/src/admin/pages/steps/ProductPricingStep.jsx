import React, { useState, useMemo } from 'react';
import toast from 'react-hot-toast';

function generateId(prefix = 'id') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

const STANDARD_WEIGHT_PRESETS = [
  { label: '250 g', value: '250g', priceAdjustment: 0, isDefault: true },
  { label: '500 g', value: '500g', priceAdjustment: 200, isDefault: false },
  { label: '1 kg', value: '1kg', priceAdjustment: 600, isDefault: false },
  { label: '2 kg', value: '2kg', priceAdjustment: 1400, isDefault: false },
];

const PORTION_SIZE_PRESETS = [
  { label: 'Half Plate', value: 'half_plate', priceAdjustment: 0, isDefault: true },
  { label: 'Full Plate', value: 'full_plate', priceAdjustment: 150, isDefault: false },
  { label: 'Family Pack', value: 'family_pack', priceAdjustment: 450, isDefault: false },
];

export function ProductPricingStep({ formData, setFormData }) {
  const [newOptionInput, setNewOptionInput] = useState({ label: '', priceAdjustment: 0 });

  // Separate the Weight / Portion group from all other option groups (e.g. Jar Type, Spice Level)
  const isWeightGroup = (g) => (g?.name || '').trim().toLowerCase() === 'weight';

  const weightGroup = useMemo(() => {
    return (formData.optionGroups || []).find(isWeightGroup) || null;
  }, [formData.optionGroups]);

  const nonWeightGroups = useMemo(() => {
    return (formData.optionGroups || []).filter((g) => !isWeightGroup(g));
  }, [formData.optionGroups]);

  // Synchronize weight group changes back into formData.optionGroups and formData.weight
  const syncWeightGroup = (updatedWeightGroup) => {
    let updatedOptionGroups;
    if (
      !updatedWeightGroup ||
      !updatedWeightGroup.options ||
      updatedWeightGroup.options.length === 0
    ) {
      updatedOptionGroups = nonWeightGroups;
    } else {
      updatedOptionGroups = [updatedWeightGroup, ...nonWeightGroups];
    }

    const defaultOpt =
      updatedWeightGroup?.options?.find((o) => o.isDefault) || updatedWeightGroup?.options?.[0];
    const weightString = defaultOpt ? defaultOpt.label : '';

    setFormData((prev) => ({
      ...prev,
      optionGroups: updatedOptionGroups,
      weight: weightString || prev.weight || '',
    }));
  };

  const handleApplyPreset = (presetOptions, groupName = 'Weight') => {
    const newGroup = {
      groupId: weightGroup?.groupId || generateId('grp_weight'),
      name: groupName,
      type: 'SINGLE_SELECT',
      required: true,
      minSelections: 1,
      maxSelections: 1,
      displayStyle: weightGroup?.displayStyle || 'RADIO_CARDS',
      sortOrder: 0,
      options: presetOptions.map((opt, idx) => ({
        optionId: generateId('opt_w'),
        label: opt.label,
        value: opt.value || opt.label.toLowerCase().replace(/[^a-z0-9]+/g, '_'),
        priceAdjustment: Number(opt.priceAdjustment) || 0,
        available: true,
        isDefault: Boolean(opt.isDefault),
        sortOrder: idx,
      })),
    };

    syncWeightGroup(newGroup);
    toast.success(`Applied ${presetOptions.length} weight/portion options`);
  };

  const handleClearWeightGroup = () => {
    syncWeightGroup(null);
    toast.success('Removed weight pricing tiers. Dish will sell at base price.');
  };

  const handleUpdateOption = (optionIndex, field, value) => {
    if (!weightGroup) return;
    const currentOptions = [...(weightGroup.options || [])];

    if (field === 'isDefault' && value === true) {
      currentOptions.forEach((opt, idx) => {
        opt.isDefault = idx === optionIndex;
      });
    } else {
      currentOptions[optionIndex] = {
        ...currentOptions[optionIndex],
        [field]: field === 'priceAdjustment' ? Number(value) || 0 : value,
      };
      if (field === 'label') {
        currentOptions[optionIndex].value = value.toLowerCase().replace(/[^a-z0-9]+/g, '_');
      }
    }

    syncWeightGroup({ ...weightGroup, options: currentOptions });
  };

  const handleDeleteOption = (optionIndex) => {
    if (!weightGroup) return;
    const updatedOptions = weightGroup.options.filter((_, idx) => idx !== optionIndex);
    if (updatedOptions.length > 0 && !updatedOptions.some((o) => o.isDefault)) {
      updatedOptions[0].isDefault = true;
    }
    syncWeightGroup({ ...weightGroup, options: updatedOptions });
  };

  const handleMoveOption = (optionIndex, direction) => {
    if (!weightGroup) return;
    const targetIndex = optionIndex + direction;
    if (targetIndex < 0 || targetIndex >= weightGroup.options.length) return;

    const updatedOptions = [...weightGroup.options];
    const temp = updatedOptions[optionIndex];
    updatedOptions[optionIndex] = updatedOptions[targetIndex];
    updatedOptions[targetIndex] = temp;

    updatedOptions.forEach((o, idx) => {
      o.sortOrder = idx;
    });

    syncWeightGroup({ ...weightGroup, options: updatedOptions });
  };

  const handleAddCustomOption = () => {
    const label = newOptionInput.label.trim();
    if (!label) {
      return toast.error('Please enter a weight or portion label (e.g. 500 g)');
    }

    const priceAdjustment = Number(newOptionInput.priceAdjustment) || 0;
    const existingOptions = weightGroup?.options || [];
    const isFirst = existingOptions.length === 0;

    const newOption = {
      optionId: generateId('opt_w'),
      label,
      value: label.toLowerCase().replace(/[^a-z0-9]+/g, '_'),
      priceAdjustment,
      available: true,
      isDefault: isFirst,
      sortOrder: existingOptions.length,
    };

    const newGroup = {
      groupId: weightGroup?.groupId || generateId('grp_weight'),
      name: 'Weight',
      type: 'SINGLE_SELECT',
      required: true,
      minSelections: 1,
      maxSelections: 1,
      displayStyle: weightGroup?.displayStyle || 'RADIO_CARDS',
      sortOrder: 0,
      options: [...existingOptions, newOption],
    };

    syncWeightGroup(newGroup);
    setNewOptionInput({ label: '', priceAdjustment: 0 });
    toast.success(`Added weight option "${label}"`);
  };

  const basePriceNum = Number(formData.price) || 0;
  const oldPriceNum = Number(formData.oldPrice) || 0;
  const discountPercent =
    oldPriceNum > basePriceNum && basePriceNum > 0
      ? Math.round(((oldPriceNum - basePriceNum) / oldPriceNum) * 100)
      : null;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-[13px] font-bold text-[var(--admin-text-primary)] tracking-wide flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px] text-[var(--admin-accent,#800000)]">
            payments
          </span>
          <span>Pricing & Portions</span>
        </h2>
      </div>

      {/* Base Pricing Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {/* Product Base Price */}
        <div className="p-3.5 sm:p-4 bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-[6px] shadow-2xs space-y-2">
          <label className="text-[11px] font-bold text-[var(--admin-text-secondary)] uppercase tracking-wider block">
            Base Price (₹) <span className="text-red-500">*</span>
          </label>

          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--admin-text-secondary)] text-[14px] font-bold select-none">
              ₹
            </span>
            <input
              type="number"
              required
              min="1"
              inputMode="decimal"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              placeholder="e.g. 200"
              className="w-full bg-[var(--admin-surface)] rounded-[4px] pl-7 pr-3 h-10 text-[13px] font-bold outline-none border border-[var(--admin-border)] focus:border-[#800000] focus:ring-1 focus:ring-[#800000]/20 transition-all"
            />
          </div>
        </div>

        {/* Old Striking Price */}
        <div className="p-3.5 sm:p-4 bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-[6px] shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-bold text-[var(--admin-text-secondary)] uppercase tracking-wider block">
              Original / Striking Price (₹)
            </label>
            {discountPercent && (
              <span className="text-[10.5px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-[3px] border border-emerald-200">
                {discountPercent}% OFF
              </span>
            )}
          </div>

          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--admin-text-secondary)]/60 text-[14px] font-bold select-none">
              ₹
            </span>
            <input
              type="number"
              inputMode="decimal"
              value={formData.oldPrice}
              onChange={(e) => setFormData({ ...formData, oldPrice: e.target.value })}
              placeholder="Optional original price"
              className="w-full bg-[var(--admin-surface)] rounded-[4px] pl-7 pr-3 h-10 text-[13px] outline-none border border-[var(--admin-border)] focus:border-[#800000] focus:ring-1 focus:ring-[#800000]/20 transition-all"
            />
          </div>
        </div>
      </div>

      {/* ─── WEIGHT & PORTION PRICING TIERS SECTION ─── */}
      <div className="border border-[var(--admin-border)] rounded-[6px] bg-[var(--admin-surface)] shadow-2xs overflow-hidden">
        {/* Section Header */}
        <div className="px-3.5 sm:px-4 py-2.5 sm:py-3 bg-[var(--admin-surface-muted)]/60 border-b border-[var(--admin-border)] flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px] text-[var(--admin-accent,#800000)]">
              scale
            </span>
            <h3 className="text-[12px] sm:text-[12.5px] font-bold text-[var(--admin-text-primary)] uppercase tracking-wider">
              Portion & Weight Tiers
            </h3>
          </div>

          {weightGroup && weightGroup.options?.length > 0 && (
            <div className="flex items-center gap-2 shrink-0">
              <select
                value={
                  weightGroup.displayStyle === 'BUTTON_GROUP'
                    ? 'BUTTON_GROUP'
                    : weightGroup.displayStyle === 'DROPDOWN'
                      ? 'DROPDOWN'
                      : 'RADIO_CARDS'
                }
                onChange={(e) => syncWeightGroup({ ...weightGroup, displayStyle: e.target.value })}
                className="h-7 sm:h-8 bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-[4px] px-2 text-[11px] font-semibold text-[var(--admin-text-primary)] outline-none cursor-pointer focus:border-[#800000]"
                title="Storefront selector appearance"
              >
                <option value="RADIO_CARDS">Cards</option>
                <option value="BUTTON_GROUP">Pills</option>
                <option value="DROPDOWN">Dropdown</option>
              </select>

              <button
                type="button"
                onClick={handleClearWeightGroup}
                className="h-7 sm:h-8 px-2.5 rounded-[4px] text-[11px] font-semibold text-stone-500 hover:text-red-600 hover:bg-red-50 border border-[var(--admin-border)] transition-colors cursor-pointer"
                title="Remove weight choices and sell at base price only"
              >
                Clear
              </button>
            </div>
          )}
        </div>

        {/* Preset Toolbar */}
        <div className="px-3.5 py-2.5 bg-[var(--admin-surface-muted)]/30 border-b border-[var(--admin-border-subtle)] flex flex-wrap items-center justify-between gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--admin-text-secondary)]">
            Presets:
          </span>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => handleApplyPreset(STANDARD_WEIGHT_PRESETS, 'Weight')}
              className="h-7 px-2.5 rounded-[4px] bg-[var(--admin-surface)] hover:bg-[var(--admin-surface-hover)] border border-[var(--admin-border)] hover:border-[#800000] text-[11px] font-semibold text-[var(--admin-text-primary)] transition-all cursor-pointer shadow-2xs"
            >
              + Standard (250g, 500g, 1kg, 2kg)
            </button>
            <button
              type="button"
              onClick={() => handleApplyPreset(PORTION_SIZE_PRESETS, 'Portion')}
              className="h-7 px-2.5 rounded-[4px] bg-[var(--admin-surface)] hover:bg-[var(--admin-surface-hover)] border border-[var(--admin-border)] hover:border-[#800000] text-[11px] font-semibold text-[var(--admin-text-primary)] transition-all cursor-pointer shadow-2xs"
            >
              + Portions (Half, Full, Family)
            </button>
          </div>
        </div>

        {/* Options Content */}
        <div className="p-3.5 sm:p-4">
          {!weightGroup || !weightGroup.options || weightGroup.options.length === 0 ? (
            <div className="p-6 text-center border border-dashed border-[var(--admin-border)] rounded-[6px] bg-[var(--admin-surface-muted)]/20 space-y-3">
              <span className="material-symbols-outlined text-[26px] text-[var(--admin-text-tertiary)] block mx-auto">
                straighten
              </span>
              <p className="text-[12.5px] font-semibold text-[var(--admin-text-primary)]">
                Selling at Base Price (₹{basePriceNum || '0'})
              </p>
              <div className="flex flex-wrap justify-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => handleApplyPreset(STANDARD_WEIGHT_PRESETS, 'Weight')}
                  className="px-3 py-1.5 rounded-[4px] bg-[var(--admin-accent,#800000)] hover:opacity-90 text-white text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer shadow-xs"
                >
                  + Add Weights (250g, 500g, 1kg)
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPreset(PORTION_SIZE_PRESETS, 'Portion')}
                  className="px-3 py-1.5 rounded-[4px] bg-[var(--admin-surface)] hover:bg-[var(--admin-surface-muted)] border border-[var(--admin-border)] text-[var(--admin-text-primary)] text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer shadow-xs"
                >
                  + Add Portions (Half / Full)
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2.5">
              {/* Desktop Table Header */}
              <div className="hidden sm:grid sm:grid-cols-[28px_minmax(0,1.2fr)_130px_110px_60px_32px] sm:items-center sm:gap-3 sm:pb-2 sm:border-b sm:border-[var(--admin-border-subtle)] sm:text-[10px] sm:uppercase sm:tracking-wider sm:text-[var(--admin-text-secondary)] sm:font-bold sm:select-none">
                <span className="text-center">#</span>
                <span>Portion / Weight</span>
                <span>Price (Diff)</span>
                <span className="text-right">Final Price</span>
                <span className="text-center">Default</span>
                <span></span>
              </div>

              {/* Rows List (Responsive card on mobile, grid row on desktop) */}
              <div className="space-y-2 sm:space-y-1.5">
                {weightGroup.options.map((option, optIdx) => {
                  const finalCalculatedPrice = basePriceNum + (Number(option.priceAdjustment) || 0);

                  return (
                    <div
                      key={option.optionId || optIdx}
                      className="p-2.5 sm:p-0 bg-[var(--admin-surface-muted)]/20 sm:bg-transparent rounded-[4px] sm:rounded-none border sm:border-0 border-[var(--admin-border-subtle)] space-y-2 sm:space-y-0"
                    >
                      {/* Top Row on mobile / Full Grid on desktop */}
                      <div className="flex items-center gap-2 sm:grid sm:grid-cols-[28px_minmax(0,1.2fr)_130px_110px_60px_32px] sm:items-center sm:gap-3">
                        {/* Reorder Arrows */}
                        <div className="flex flex-col items-center justify-center shrink-0">
                          <button
                            type="button"
                            disabled={optIdx === 0}
                            onClick={() => handleMoveOption(optIdx, -1)}
                            className="h-3.5 flex items-center justify-center text-[var(--admin-text-tertiary)] hover:text-[var(--admin-text-primary)] disabled:opacity-20 cursor-pointer"
                            title="Move up"
                          >
                            <span className="material-symbols-outlined text-[15px] leading-none">
                              expand_less
                            </span>
                          </button>
                          <button
                            type="button"
                            disabled={optIdx === weightGroup.options.length - 1}
                            onClick={() => handleMoveOption(optIdx, 1)}
                            className="h-3.5 flex items-center justify-center text-[var(--admin-text-tertiary)] hover:text-[var(--admin-text-primary)] disabled:opacity-20 cursor-pointer"
                            title="Move down"
                          >
                            <span className="material-symbols-outlined text-[15px] leading-none">
                              expand_more
                            </span>
                          </button>
                        </div>

                        {/* Weight Label */}
                        <div className="flex-1 min-w-0">
                          <input
                            type="text"
                            value={option.label}
                            onChange={(e) => handleUpdateOption(optIdx, 'label', e.target.value)}
                            placeholder="e.g. 500g"
                            className="w-full h-[36px] bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-[4px] px-3 text-[12.5px] font-semibold text-[var(--admin-text-primary)] outline-none focus:border-[#800000] focus:ring-1 focus:ring-[#800000]/20 transition-all"
                          />
                        </div>

                        {/* Desktop: Price Adjustment */}
                        <div className="hidden sm:block">
                          <div className="relative w-full">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[11px] font-bold text-[var(--admin-text-secondary)] select-none pointer-events-none">
                              +₹
                            </span>
                            <input
                              type="number"
                              value={option.priceAdjustment}
                              onChange={(e) =>
                                handleUpdateOption(optIdx, 'priceAdjustment', e.target.value)
                              }
                              placeholder="0"
                              className="w-full h-[36px] bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-[4px] pl-7 pr-2.5 text-[12.5px] font-bold text-[var(--admin-text-primary)] outline-none focus:border-[#800000] focus:ring-1 focus:ring-[#800000]/20 transition-all"
                            />
                          </div>
                        </div>

                        {/* Desktop: Customer Price Preview */}
                        <div className="hidden sm:flex items-center justify-end">
                          <span className="text-[12px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-[4px] border border-emerald-200">
                            ₹{finalCalculatedPrice.toLocaleString()}
                          </span>
                        </div>

                        {/* Desktop: Default Radio */}
                        <div className="hidden sm:flex items-center justify-center h-[36px]">
                          <input
                            type="radio"
                            name="default_weight_option"
                            checked={Boolean(option.isDefault)}
                            onChange={(e) =>
                              handleUpdateOption(optIdx, 'isDefault', e.target.checked)
                            }
                            className="cursor-pointer text-[#800000] accent-[#800000] focus:ring-0 w-4 h-4"
                            title="Set as default"
                          />
                        </div>

                        {/* Delete button */}
                        <div className="flex items-center justify-center shrink-0">
                          <button
                            type="button"
                            onClick={() => handleDeleteOption(optIdx)}
                            className="w-8 h-8 flex items-center justify-center text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-[4px] transition-colors cursor-pointer"
                            title="Remove tier"
                          >
                            <span className="material-symbols-outlined text-[16px]">close</span>
                          </button>
                        </div>
                      </div>

                      {/* Mobile Bottom Row (hidden on desktop sm:) */}
                      <div className="flex items-center justify-between gap-2 pt-2 border-t border-[var(--admin-border-subtle)] sm:hidden">
                        <div className="relative w-28">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[11px] font-bold text-[var(--admin-text-secondary)] select-none pointer-events-none">
                            +₹
                          </span>
                          <input
                            type="number"
                            value={option.priceAdjustment}
                            onChange={(e) =>
                              handleUpdateOption(optIdx, 'priceAdjustment', e.target.value)
                            }
                            placeholder="0"
                            className="w-full h-8 bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-[4px] pl-7 pr-2 text-[12px] font-bold text-[var(--admin-text-primary)] outline-none focus:border-[#800000]"
                          />
                        </div>

                        <span className="text-[12px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-[4px] border border-emerald-200">
                          ₹{finalCalculatedPrice.toLocaleString()}
                        </span>

                        <label className="flex items-center gap-1.5 text-[11px] font-semibold text-[var(--admin-text-secondary)] cursor-pointer select-none">
                          <input
                            type="radio"
                            name="default_weight_option"
                            checked={Boolean(option.isDefault)}
                            onChange={(e) =>
                              handleUpdateOption(optIdx, 'isDefault', e.target.checked)
                            }
                            className="cursor-pointer text-[#800000] accent-[#800000] w-3.5 h-3.5"
                          />
                          <span>Default</span>
                        </label>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Add Option Row - Desktop Grid */}
              <div className="hidden sm:grid sm:grid-cols-[28px_minmax(0,1.2fr)_130px_110px_96px] sm:items-center sm:gap-3 sm:pt-3 sm:border-t sm:border-[var(--admin-border-subtle)]">
                <div className="flex items-center justify-center text-[var(--admin-text-tertiary)]">
                  <span className="material-symbols-outlined text-[16px]">add</span>
                </div>

                <div>
                  <input
                    type="text"
                    placeholder="New portion (e.g. 1 kg, Family Pack)"
                    value={newOptionInput.label}
                    onChange={(e) =>
                      setNewOptionInput((prev) => ({ ...prev, label: e.target.value }))
                    }
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddCustomOption();
                      }
                    }}
                    className="w-full h-[36px] bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-[4px] px-3 text-[12px] text-[var(--admin-text-primary)] placeholder:text-[var(--admin-text-tertiary)] outline-none focus:border-[#800000] focus:ring-1 focus:ring-[#800000]/20 transition-all"
                  />
                </div>

                <div>
                  <div className="relative w-full">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[11px] font-bold text-[var(--admin-text-secondary)] select-none pointer-events-none">
                      +₹
                    </span>
                    <input
                      type="number"
                      placeholder="0"
                      value={newOptionInput.priceAdjustment || ''}
                      onChange={(e) =>
                        setNewOptionInput((prev) => ({
                          ...prev,
                          priceAdjustment: e.target.value,
                        }))
                      }
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddCustomOption();
                        }
                      }}
                      className="w-full h-[36px] bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-[4px] pl-7 pr-2.5 text-[12px] font-bold text-[var(--admin-text-primary)] placeholder:text-[var(--admin-text-tertiary)] outline-none focus:border-[#800000] focus:ring-1 focus:ring-[#800000]/20 transition-all"
                    />
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[11.5px] font-bold text-stone-500 bg-stone-100 dark:bg-stone-800 px-2 py-1 rounded-[4px]">
                    ₹{basePriceNum + (Number(newOptionInput.priceAdjustment) || 0)}
                  </span>
                </div>

                <div>
                  <button
                    type="button"
                    onClick={handleAddCustomOption}
                    className="w-full h-[36px] rounded-[4px] bg-[#800000] hover:bg-[#6a0000] text-white text-[11.5px] font-bold uppercase tracking-wider cursor-pointer transition-colors shadow-2xs flex items-center justify-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[15px]">add</span>
                    <span>Add</span>
                  </button>
                </div>
              </div>

              {/* Add Option Row - Mobile Stacking */}
              <div className="sm:hidden p-2.5 bg-[var(--admin-surface-muted)]/20 rounded-[4px] border border-dashed border-[var(--admin-border)] space-y-2">
                <input
                  type="text"
                  placeholder="New portion (e.g. 1 kg, Family Pack)"
                  value={newOptionInput.label}
                  onChange={(e) =>
                    setNewOptionInput((prev) => ({ ...prev, label: e.target.value }))
                  }
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddCustomOption();
                    }
                  }}
                  className="w-full h-8 bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-[4px] px-2.5 text-[12px] text-[var(--admin-text-primary)] outline-none focus:border-[#800000]"
                />

                <div className="flex items-center gap-2">
                  <div className="relative w-28">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[11px] font-bold text-[var(--admin-text-secondary)] select-none pointer-events-none">
                      +₹
                    </span>
                    <input
                      type="number"
                      placeholder="0"
                      value={newOptionInput.priceAdjustment || ''}
                      onChange={(e) =>
                        setNewOptionInput((prev) => ({
                          ...prev,
                          priceAdjustment: e.target.value,
                        }))
                      }
                      className="w-full h-8 bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-[4px] pl-7 pr-2 text-[12px] font-bold text-[var(--admin-text-primary)] outline-none focus:border-[#800000]"
                    />
                  </div>

                  <span className="text-[11.5px] font-bold text-stone-500 bg-stone-100 dark:bg-stone-800 px-2 py-0.5 rounded-[3px] shrink-0">
                    ₹{basePriceNum + (Number(newOptionInput.priceAdjustment) || 0)}
                  </span>

                  <button
                    type="button"
                    onClick={handleAddCustomOption}
                    className="flex-1 h-8 rounded-[4px] bg-[#800000] hover:bg-[#6a0000] text-white text-[11px] font-bold uppercase tracking-wider cursor-pointer transition-colors shadow-2xs flex items-center justify-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[14px]">add</span>
                    <span>Add Tier</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
