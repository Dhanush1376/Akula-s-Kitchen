import React, { useState } from 'react';
import toast from 'react-hot-toast';

const PRESET_GROUPS = [
  {
    name: 'Weight',
    type: 'SINGLE_SELECT',
    required: true,
    displayStyle: 'RADIO_CARDS',
    options: [
      { label: '250 g', value: '250g', priceAdjustment: 0, available: true, isDefault: true },
      { label: '500 g', value: '500g', priceAdjustment: 200, available: true, isDefault: false },
      { label: '1 kg', value: '1kg', priceAdjustment: 600, available: true, isDefault: false },
      { label: '2 kg', value: '2kg', priceAdjustment: 1400, available: true, isDefault: false },
    ],
  },
  {
    name: 'Jar Type',
    type: 'SINGLE_SELECT',
    required: true,
    displayStyle: 'RADIO_CARDS',
    options: [
      {
        label: 'Standard Jar',
        value: 'standard_jar',
        priceAdjustment: 0,
        available: true,
        isDefault: true,
      },
      {
        label: 'Premium Glass Jar',
        value: 'premium_glass_jar',
        priceAdjustment: 150,
        available: true,
        isDefault: false,
      },
    ],
  },
  {
    name: 'Spice Level',
    type: 'SINGLE_SELECT',
    required: false,
    displayStyle: 'BUTTON_GROUP',
    options: [
      { label: 'Mild', value: 'mild', priceAdjustment: 0, available: true, isDefault: true },
      { label: 'Medium', value: 'medium', priceAdjustment: 50, available: true, isDefault: false },
      { label: 'Spicy', value: 'spicy', priceAdjustment: 75, available: true, isDefault: false },
    ],
  },
  {
    name: 'Add-ons',
    type: 'MULTI_SELECT',
    required: false,
    minSelections: 0,
    maxSelections: 5,
    displayStyle: 'CHECKBOX_CARDS',
    options: [
      {
        label: 'Extra Masala',
        value: 'extra_masala',
        priceAdjustment: 100,
        available: true,
        isDefault: false,
      },
      {
        label: 'Gift Packaging',
        value: 'gift_packaging',
        priceAdjustment: 200,
        available: true,
        isDefault: false,
      },
      {
        label: 'Wooden Spoon',
        value: 'wooden_spoon',
        priceAdjustment: 50,
        available: true,
        isDefault: false,
      },
    ],
  },
];

function generateId(prefix = 'id') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

export function ProductOptionGroupsManager({ optionGroups = [], onChange }) {
  const [newOptionInputs, setNewOptionInputs] = useState({});

  const handleAddPreset = (preset) => {
    const groupId = generateId('grp');
    const newGroup = {
      groupId,
      name: preset.name,
      type: preset.type,
      required: preset.required,
      minSelections: preset.minSelections ?? (preset.required ? 1 : 0),
      maxSelections: preset.maxSelections ?? 1,
      displayStyle:
        preset.displayStyle || (preset.type === 'MULTI_SELECT' ? 'CHECKBOX_CARDS' : 'RADIO_CARDS'),
      sortOrder: optionGroups.length,
      options: preset.options.map((opt, idx) => ({
        optionId: generateId('opt'),
        label: opt.label,
        value: opt.value || opt.label.toLowerCase().replace(/[^a-z0-9]+/g, '_'),
        priceAdjustment: Number(opt.priceAdjustment) || 0,
        available: opt.available !== false,
        isDefault: Boolean(opt.isDefault),
        sortOrder: idx,
      })),
    };

    onChange([...optionGroups, newGroup]);
    toast.success(`Added preset group "${preset.name}"`);
  };

  const handleAddCustomGroup = () => {
    const groupId = generateId('grp');
    const newGroup = {
      groupId,
      name: 'New Option Group',
      type: 'SINGLE_SELECT',
      required: false,
      minSelections: 0,
      maxSelections: 1,
      displayStyle: 'RADIO_CARDS',
      sortOrder: optionGroups.length,
      options: [
        {
          optionId: generateId('opt'),
          label: 'Default Option',
          value: 'default_option',
          priceAdjustment: 0,
          available: true,
          isDefault: true,
          sortOrder: 0,
        },
      ],
    };

    onChange([...optionGroups, newGroup]);
    toast.success('Added new configurable option group');
  };

  const handleUpdateGroup = (groupIndex, field, value) => {
    const updated = [...optionGroups];
    const group = { ...updated[groupIndex], [field]: value };

    if (field === 'type') {
      if (value === 'MULTI_SELECT') {
        group.maxSelections =
          group.maxSelections && group.maxSelections > 1 ? group.maxSelections : 5;
      } else {
        group.maxSelections = 1;
        // Ensure only one default exists for single select
        let hasDefault = false;
        group.options = group.options.map((opt) => {
          if (opt.isDefault && !hasDefault) {
            hasDefault = true;
            return opt;
          }
          return { ...opt, isDefault: false };
        });
      }
    }

    updated[groupIndex] = group;
    onChange(updated);
  };

  const handleDeleteGroup = (groupIndex) => {
    const grpName = optionGroups[groupIndex]?.name || 'Group';
    const updated = optionGroups.filter((_, idx) => idx !== groupIndex);
    onChange(updated);
    toast.success(`Removed "${grpName}"`);
  };

  const handleMoveGroup = (groupIndex, direction) => {
    const targetIndex = groupIndex + direction;
    if (targetIndex < 0 || targetIndex >= optionGroups.length) return;

    const updated = [...optionGroups];
    const temp = updated[groupIndex];
    updated[groupIndex] = updated[targetIndex];
    updated[targetIndex] = temp;

    updated.forEach((g, idx) => {
      g.sortOrder = idx;
    });

    onChange(updated);
  };

  const handleAddOptionToGroup = (groupIndex) => {
    const group = optionGroups[groupIndex];
    const input = newOptionInputs[group.groupId] || { label: '', priceAdjustment: 0 };

    const label = input.label.trim();
    if (!label) {
      return toast.error('Please enter an option label');
    }

    const price = Number(input.priceAdjustment) || 0;
    const isFirst = (group.options || []).length === 0;

    const newOption = {
      optionId: generateId('opt'),
      label,
      value: label.toLowerCase().replace(/[^a-z0-9]+/g, '_'),
      priceAdjustment: price,
      available: true,
      isDefault: isFirst && group.required,
      sortOrder: (group.options || []).length,
    };

    const updated = [...optionGroups];
    updated[groupIndex] = {
      ...group,
      options: [...(group.options || []), newOption],
    };

    onChange(updated);
    setNewOptionInputs((prev) => ({
      ...prev,
      [group.groupId]: { label: '', priceAdjustment: 0 },
    }));
    toast.success(`Added option "${label}"`);
  };

  const handleUpdateOption = (groupIndex, optionIndex, field, value) => {
    const updated = [...optionGroups];
    const group = { ...updated[groupIndex] };
    const options = [...group.options];

    if (field === 'isDefault' && value === true && group.type !== 'MULTI_SELECT') {
      // Clear other defaults in this group
      options.forEach((opt, idx) => {
        opt.isDefault = idx === optionIndex;
      });
    } else {
      options[optionIndex] = {
        ...options[optionIndex],
        [field]: field === 'priceAdjustment' ? Number(value) || 0 : value,
      };
    }

    group.options = options;
    updated[groupIndex] = group;
    onChange(updated);
  };

  const handleDeleteOption = (groupIndex, optionIndex) => {
    const updated = [...optionGroups];
    const group = { ...updated[groupIndex] };
    group.options = group.options.filter((_, idx) => idx !== optionIndex);
    updated[groupIndex] = group;
    onChange(updated);
  };

  const handleMoveOption = (groupIndex, optionIndex, direction) => {
    const group = optionGroups[groupIndex];
    const targetIndex = optionIndex + direction;
    if (targetIndex < 0 || targetIndex >= group.options.length) return;

    const updated = [...optionGroups];
    const updatedOptions = [...group.options];
    const temp = updatedOptions[optionIndex];
    updatedOptions[optionIndex] = updatedOptions[targetIndex];
    updatedOptions[targetIndex] = temp;

    updatedOptions.forEach((o, idx) => {
      o.sortOrder = idx;
    });

    updated[groupIndex] = { ...group, options: updatedOptions };
    onChange(updated);
  };

  return (
    <div className="space-y-5">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[var(--admin-border-subtle)]">
        <div>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px] text-[#800000]">tune</span>
            <h3 className="text-[13px] font-bold text-[var(--admin-text-primary)] uppercase tracking-wider">
              Product Options
            </h3>
          </div>
          <p className="text-[11.5px] text-[var(--admin-text-secondary)] mt-0.5">
            Add choices like weight, jar type, and spice level.
          </p>
        </div>

        <button
          type="button"
          onClick={handleAddCustomGroup}
          className="h-[34px] inline-flex items-center gap-1.5 px-3 rounded-[4px] bg-[var(--admin-surface)] hover:bg-[var(--admin-surface-hover)] border border-[var(--admin-border)] text-[var(--admin-text-primary)] text-[11px] font-bold uppercase tracking-wider cursor-pointer transition-all shadow-2xs shrink-0"
        >
          <span className="material-symbols-outlined text-[15px] text-[#800000]">add</span>
          <span>Add Group</span>
        </button>
      </div>

      {/* Preset Quick-Add Toolbar */}
      <div className="bg-[var(--admin-surface-muted)]/50 p-3 rounded-[6px] border border-[var(--admin-border)]">
        <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--admin-text-secondary)] block mb-2.5">
          Presets:
        </span>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {PRESET_GROUPS.map((preset) => (
            <button
              key={preset.name}
              type="button"
              onClick={() => handleAddPreset(preset)}
              className="h-[36px] px-3 rounded-[4px] bg-[var(--admin-surface)] hover:bg-[var(--admin-surface-hover)] border border-[var(--admin-border)] hover:border-[#800000] text-[var(--admin-text-primary)] transition-all cursor-pointer shadow-2xs flex items-center justify-between gap-1.5 group"
            >
              <span className="text-[11.5px] font-semibold text-[var(--admin-text-primary)] group-hover:text-[#800000] transition-colors truncate">
                + {preset.name}
              </span>
              <span className="text-[10px] font-medium text-[var(--admin-text-tertiary)] bg-[var(--admin-surface-muted)] px-1.5 py-0.5 rounded border border-[var(--admin-border-subtle)] shrink-0">
                {preset.options.length}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Empty State */}
      {optionGroups.length === 0 && (
        <div className="p-8 border border-dashed border-[var(--admin-border)] rounded-[6px] bg-[var(--admin-surface)] text-center">
          <div className="w-10 h-10 rounded-full bg-[var(--admin-surface-muted)] mx-auto flex items-center justify-center text-[var(--admin-text-secondary)] mb-2">
            <span className="material-symbols-outlined text-[20px]">layers</span>
          </div>
          <h4 className="text-[12.5px] font-bold text-[var(--admin-text-primary)]">
            No Options Added
          </h4>
          <p className="text-[11px] text-[var(--admin-text-secondary)] max-w-md mx-auto mt-1 mb-4">
            Add options like weight or jar type above to offer customer choices.
          </p>
          <div className="flex justify-center gap-2">
            <button
              type="button"
              onClick={() => handleAddPreset(PRESET_GROUPS[0])}
              className="px-3.5 py-1.5 rounded-[4px] bg-[#800000] text-white text-[11px] font-bold uppercase tracking-wider shadow-sm hover:bg-[#600000] transition-colors cursor-pointer"
            >
              Add Weight Options
            </button>
          </div>
        </div>
      )}

      {/* Option Groups List */}
      <div className="space-y-4">
        {optionGroups.map((group, groupIdx) => (
          <div
            key={group.groupId || groupIdx}
            className="bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-[6px] shadow-[var(--admin-shadow-sm)] overflow-hidden transition-all"
          >
            {/* Group Header */}
            <div className="px-3 sm:px-4 py-2.5 bg-[var(--admin-surface-muted)]/70 border-b border-[var(--admin-border)] flex flex-wrap items-center justify-between gap-2.5">
              {/* Left: Reorder & Name */}
              <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                <div className="flex items-center bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-[4px] overflow-hidden h-[34px] shrink-0">
                  <button
                    type="button"
                    disabled={groupIdx === 0}
                    onClick={() => handleMoveGroup(groupIdx, -1)}
                    className="w-7 h-full flex items-center justify-center hover:bg-[var(--admin-surface-hover)] disabled:opacity-20 cursor-pointer text-[var(--admin-text-secondary)] transition-colors border-r border-[var(--admin-border)]"
                    title="Move up"
                  >
                    <span className="material-symbols-outlined text-[15px] leading-none">
                      arrow_upward
                    </span>
                  </button>
                  <button
                    type="button"
                    disabled={groupIdx === optionGroups.length - 1}
                    onClick={() => handleMoveGroup(groupIdx, 1)}
                    className="w-7 h-full flex items-center justify-center hover:bg-[var(--admin-surface-hover)] disabled:opacity-20 cursor-pointer text-[var(--admin-text-secondary)] transition-colors"
                    title="Move down"
                  >
                    <span className="material-symbols-outlined text-[15px] leading-none">
                      arrow_downward
                    </span>
                  </button>
                </div>

                <div className="flex-1 max-w-xs">
                  <input
                    type="text"
                    value={group.name}
                    onChange={(e) => handleUpdateGroup(groupIdx, 'name', e.target.value)}
                    placeholder="Group Name (e.g. Weight)"
                    className="w-full h-[34px] bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-[4px] px-3 text-[12px] font-bold text-[var(--admin-text-primary)] outline-none focus:border-[#800000] focus:ring-1 focus:ring-[#800000]/20 transition-all"
                  />
                </div>
              </div>

              {/* Right: Controls (All h-[34px]) */}
              <div className="flex items-center gap-2">
                <select
                  value={group.type}
                  onChange={(e) => handleUpdateGroup(groupIdx, 'type', e.target.value)}
                  className="h-[34px] bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-[4px] px-2.5 text-[11.5px] font-medium text-[var(--admin-text-primary)] outline-none cursor-pointer focus:border-[#800000]"
                >
                  <option value="SINGLE_SELECT">Single Select</option>
                  <option value="MULTI_SELECT">Multi Select</option>
                  <option value="OPTIONAL_SINGLE_SELECT">Optional Single Select</option>
                </select>

                <select
                  value={
                    group.displayStyle === 'cards' || group.displayStyle === 'RADIO_CARDS'
                      ? group.type === 'MULTI_SELECT'
                        ? 'CHECKBOX_CARDS'
                        : 'RADIO_CARDS'
                      : group.displayStyle === 'button_group' ||
                          group.displayStyle === 'BUTTON_GROUP'
                        ? 'BUTTON_GROUP'
                        : group.displayStyle === 'dropdown' || group.displayStyle === 'DROPDOWN'
                          ? 'DROPDOWN'
                          : group.displayStyle ||
                            (group.type === 'MULTI_SELECT' ? 'CHECKBOX_CARDS' : 'RADIO_CARDS')
                  }
                  onChange={(e) => handleUpdateGroup(groupIdx, 'displayStyle', e.target.value)}
                  className="h-[34px] bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-[4px] px-2.5 text-[11.5px] font-medium text-[var(--admin-text-primary)] outline-none cursor-pointer focus:border-[#800000] hidden sm:block"
                >
                  <option value={group.type === 'MULTI_SELECT' ? 'CHECKBOX_CARDS' : 'RADIO_CARDS'}>
                    Cards
                  </option>
                  <option value="BUTTON_GROUP">Pills</option>
                  <option value="DROPDOWN">Dropdown</option>
                </select>

                <label className="h-[34px] flex items-center gap-1.5 px-3 bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-[4px] cursor-pointer text-[11.5px] font-medium text-[var(--admin-text-secondary)] select-none hover:border-[var(--admin-border-subtle)] transition-colors">
                  <input
                    type="checkbox"
                    checked={group.required}
                    onChange={(e) => handleUpdateGroup(groupIdx, 'required', e.target.checked)}
                    className="rounded text-[#800000] accent-[#800000] focus:ring-0 w-3.5 h-3.5"
                  />
                  <span>Required</span>
                </label>

                <button
                  type="button"
                  onClick={() => handleDeleteGroup(groupIdx)}
                  className="w-[34px] h-[34px] flex items-center justify-center bg-red-50/60 hover:bg-red-100/70 text-red-600 border border-red-200/80 rounded-[4px] transition-colors cursor-pointer shrink-0"
                  title="Delete Group"
                >
                  <span className="material-symbols-outlined text-[17px]">delete</span>
                </button>
              </div>
            </div>

            {/* Options Table / Symmetrical Grid */}
            <div className="p-3 sm:p-4">
              <div className="overflow-x-auto">
                <div className="min-w-[600px] space-y-2">
                  {/* Table Header Grid */}
                  <div className="grid grid-cols-[32px_minmax(0,1fr)_140px_72px_104px_36px] items-center gap-2.5 pb-2 border-b border-[var(--admin-border-subtle)] text-[10px] uppercase tracking-wider text-[var(--admin-text-secondary)] font-bold select-none">
                    <span className="text-center">#</span>
                    <span>Option Label</span>
                    <span>Price Adjustment</span>
                    <span className="text-center">Default</span>
                    <span className="text-center">Available</span>
                    <span className="text-center"></span>
                  </div>

                  {/* Option Rows */}
                  {(group.options || []).map((option, optIdx) => (
                    <div
                      key={option.optionId || optIdx}
                      className="grid grid-cols-[32px_minmax(0,1fr)_140px_72px_104px_36px] items-center gap-2.5 py-0.5"
                    >
                      {/* Order Handle */}
                      <div className="flex flex-col items-center justify-center">
                        <button
                          type="button"
                          disabled={optIdx === 0}
                          onClick={() => handleMoveOption(groupIdx, optIdx, -1)}
                          className="h-3.5 flex items-center justify-center text-[var(--admin-text-tertiary)] hover:text-[var(--admin-text-primary)] disabled:opacity-20 cursor-pointer"
                          title="Move up"
                        >
                          <span className="material-symbols-outlined text-[14px] leading-none">
                            expand_less
                          </span>
                        </button>
                        <button
                          type="button"
                          disabled={optIdx === group.options.length - 1}
                          onClick={() => handleMoveOption(groupIdx, optIdx, 1)}
                          className="h-3.5 flex items-center justify-center text-[var(--admin-text-tertiary)] hover:text-[var(--admin-text-primary)] disabled:opacity-20 cursor-pointer"
                          title="Move down"
                        >
                          <span className="material-symbols-outlined text-[14px] leading-none">
                            expand_more
                          </span>
                        </button>
                      </div>

                      {/* Option Label */}
                      <div>
                        <input
                          type="text"
                          value={option.label}
                          onChange={(e) =>
                            handleUpdateOption(groupIdx, optIdx, 'label', e.target.value)
                          }
                          placeholder="e.g. 500 g"
                          className="w-full h-[34px] bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-[4px] px-3 text-[11.5px] font-medium text-[var(--admin-text-primary)] outline-none focus:border-[#800000] focus:ring-1 focus:ring-[#800000]/20 transition-all"
                        />
                      </div>

                      {/* Price Adjustment */}
                      <div>
                        <div className="relative w-full">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[11px] font-bold text-[var(--admin-text-secondary)] select-none pointer-events-none">
                            +₹
                          </span>
                          <input
                            type="number"
                            value={option.priceAdjustment}
                            onChange={(e) =>
                              handleUpdateOption(
                                groupIdx,
                                optIdx,
                                'priceAdjustment',
                                e.target.value,
                              )
                            }
                            placeholder="0"
                            className="w-full h-[34px] bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-[4px] pl-7 pr-2.5 text-[11.5px] font-bold text-[var(--admin-text-primary)] outline-none focus:border-[#800000] focus:ring-1 focus:ring-[#800000]/20 transition-all"
                          />
                        </div>
                      </div>

                      {/* Default Selection */}
                      <div className="flex items-center justify-center h-[34px]">
                        <input
                          type={group.type === 'MULTI_SELECT' ? 'checkbox' : 'radio'}
                          name={`default_${group.groupId}`}
                          checked={Boolean(option.isDefault)}
                          onChange={(e) =>
                            handleUpdateOption(groupIdx, optIdx, 'isDefault', e.target.checked)
                          }
                          className="cursor-pointer text-[#800000] accent-[#800000] focus:ring-0 w-4 h-4"
                          title="Set as default"
                        />
                      </div>

                      {/* Available Status */}
                      <div className="flex items-center justify-center h-[34px]">
                        <button
                          type="button"
                          onClick={() =>
                            handleUpdateOption(groupIdx, optIdx, 'available', !option.available)
                          }
                          className={`w-full h-[28px] inline-flex items-center justify-center gap-1 rounded-[4px] text-[10.5px] font-semibold cursor-pointer transition-colors ${
                            option.available
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100/60'
                              : 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100/60'
                          }`}
                        >
                          <span className="material-symbols-outlined text-[13px]">
                            {option.available ? 'check_circle' : 'cancel'}
                          </span>
                          <span>{option.available ? 'In Stock' : 'Out of Stock'}</span>
                        </button>
                      </div>

                      {/* Delete Action */}
                      <div className="flex items-center justify-center h-[34px]">
                        <button
                          type="button"
                          onClick={() => handleDeleteOption(groupIdx, optIdx)}
                          className="w-7 h-7 flex items-center justify-center text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-[4px] transition-colors cursor-pointer"
                          title="Remove Option"
                        >
                          <span className="material-symbols-outlined text-[15px]">close</span>
                        </button>
                      </div>
                    </div>
                  ))}

                  {/* Add Option Row (Exact Same Symmetrical Column Alignment) */}
                  <div className="grid grid-cols-[32px_minmax(0,1fr)_140px_72px_104px_36px] items-center gap-2.5 pt-2 border-t border-[var(--admin-border-subtle)]">
                    <div className="flex items-center justify-center text-[var(--admin-text-tertiary)]">
                      <span className="material-symbols-outlined text-[15px]">add</span>
                    </div>

                    <div>
                      <input
                        type="text"
                        placeholder="New option label (e.g. 3 kg, Wooden Box)"
                        value={newOptionInputs[group.groupId]?.label || ''}
                        onChange={(e) =>
                          setNewOptionInputs((prev) => ({
                            ...prev,
                            [group.groupId]: {
                              ...prev[group.groupId],
                              label: e.target.value,
                            },
                          }))
                        }
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddOptionToGroup(groupIdx);
                          }
                        }}
                        className="w-full h-[34px] bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-[4px] px-3 text-[11.5px] text-[var(--admin-text-primary)] placeholder:text-[var(--admin-text-tertiary)] outline-none focus:border-[#800000] focus:ring-1 focus:ring-[#800000]/20 transition-all"
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
                          value={newOptionInputs[group.groupId]?.priceAdjustment ?? ''}
                          onChange={(e) =>
                            setNewOptionInputs((prev) => ({
                              ...prev,
                              [group.groupId]: {
                                ...prev[group.groupId],
                                priceAdjustment: e.target.value,
                              },
                            }))
                          }
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddOptionToGroup(groupIdx);
                            }
                          }}
                          className="w-full h-[34px] bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-[4px] pl-7 pr-2.5 text-[11.5px] font-bold text-[var(--admin-text-primary)] placeholder:text-[var(--admin-text-tertiary)] outline-none focus:border-[#800000] focus:ring-1 focus:ring-[#800000]/20 transition-all"
                        />
                      </div>
                    </div>

                    <div className="col-span-3">
                      <button
                        type="button"
                        onClick={() => handleAddOptionToGroup(groupIdx)}
                        className="w-full h-[34px] rounded-[4px] bg-[#800000] hover:bg-[#6a0000] text-white text-[11px] font-bold uppercase tracking-wider cursor-pointer transition-colors shadow-2xs flex items-center justify-center gap-1.5"
                      >
                        <span className="material-symbols-outlined text-[15px]">add</span>
                        <span>Add Option</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
