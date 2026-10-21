import React, { useState, useMemo, useEffect } from 'react';
import toast from 'react-hot-toast';

const BADGE_PRESETS = [
  'Best Seller',
  'Fresh Daily',
  'Must Try',
  'Trending',
  'Traditional Recipe',
  '100% Pure & Natural',
  'No Preservatives',
  'Special Batch',
  'New Arrival',
  'Homestyle',
];

const DIETARY_FILTER_PRESETS = [
  'Spicy',
  'Medium Spicy',
  'Mild',
  'Jain / No Garlic',
  'Gluten Free',
  'Organic Ingredients',
  'Cold-Pressed Oil',
  'Sweet & Tangy',
];

const MEAL_AND_CUISINE_PRESETS = [
  'Breakfast',
  'Lunch',
  'Dinner',
  'Festive',
  'Snack',
  'Andhra Style',
];

// Clean normalizer to prevent any whitespace or casing duplicates (e.g. "1 kg" vs "1kg")
const normalizeTag = (tag) => (tag || '').toLowerCase().replace(/[^a-z0-9]/g, '');

function FilterToggleChip({ label, active, onToggle }) {
  return (
    <button
      type="button"
      onClick={() => onToggle(label)}
      className={`px-2.5 py-1 text-[11px] rounded-[4px] border font-semibold flex items-center gap-1 transition-all cursor-pointer select-none active:scale-95 shadow-2xs ${
        active
          ? 'bg-[var(--admin-accent,#800000)] text-white border-[var(--admin-accent,#800000)] shadow-xs'
          : 'bg-[var(--admin-surface)] text-[var(--admin-text-secondary)] border-[var(--admin-border)] hover:border-[var(--admin-accent,#800000)] hover:text-[var(--admin-accent,#800000)] hover:bg-[var(--admin-surface-muted)]/50'
      }`}
      title={active ? `Click to remove "${label}"` : `Click to add "${label}"`}
    >
      <span
        className={`text-[11px] font-bold ${active ? 'text-white' : 'text-[var(--admin-text-tertiary)]'}`}
      >
        {active ? '✓' : '+'}
      </span>
      <span>{label}</span>
    </button>
  );
}

export function ProductVariantsStep({ formData, setFormData, focusedField }) {
  const [customTagInput, setCustomTagInput] = useState('');

  // Auto-clean legacy "Size", "Color", "Material" from variants if present
  useEffect(() => {
    if (!formData.variants || formData.variants.length === 0) return;
    const hasLegacy = formData.variants.some((v) =>
      ['size', 'color', 'material', 'finish', 'style'].includes(
        (v.name || '').trim().toLowerCase(),
      ),
    );
    if (hasLegacy) {
      const sizeVariants = formData.variants.filter(
        (v) => (v.name || '').trim().toLowerCase() === 'size',
      );

      setFormData((prev) => {
        const currentGroups = prev.optionGroups || [];
        const existingWeightGroup = currentGroups.find(
          (g) => (g.name || '').trim().toLowerCase() === 'weight',
        );

        let updatedGroups = currentGroups;
        if (!existingWeightGroup && sizeVariants.length > 0) {
          const newWeightGroup = {
            groupId: `grp_weight_${Date.now()}`,
            name: 'Weight',
            type: 'SINGLE_SELECT',
            required: true,
            displayStyle: 'RADIO_CARDS',
            options: sizeVariants.map((sv, idx) => ({
              optionId: `opt_w_${idx}_${Date.now()}`,
              label: sv.value,
              value: sv.value.toLowerCase().replace(/[^a-z0-9]+/g, '_'),
              priceAdjustment: Number(sv.price) || 0,
              available: true,
              isDefault: idx === 0,
              default: idx === 0,
              sortOrder: idx,
            })),
          };
          updatedGroups = [newWeightGroup, ...currentGroups];
        }

        const cleanedVariants = (prev.variants || []).filter(
          (v) =>
            !['size', 'color', 'material', 'finish', 'style'].includes(
              (v.name || '').trim().toLowerCase(),
            ),
        );

        return {
          ...prev,
          optionGroups: updatedGroups,
          variants: cleanedVariants,
        };
      });
    }
  }, []);

  // Tags helper (handles string or array)
  const parsedTags = useMemo(() => {
    if (Array.isArray(formData.tags)) return formData.tags.filter(Boolean);
    if (typeof formData.tags === 'string') {
      return formData.tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);
    }
    return [];
  }, [formData.tags]);

  // Badges helper (handles string or array)
  const parsedBadges = useMemo(() => {
    if (Array.isArray(formData.badges)) return formData.badges.filter(Boolean);
    if (typeof formData.badges === 'string') {
      return formData.badges
        .split(',')
        .map((b) => b.trim())
        .filter(Boolean);
    }
    return [];
  }, [formData.badges]);

  // Extract all option labels from all Option Groups configured on top
  const configuredAttributes = useMemo(() => {
    const list = [];
    (formData.optionGroups || []).forEach((group) => {
      (group.options || []).forEach((opt) => {
        const val = (opt.label || opt.value || '').trim();
        if (!val) return;
        const norm = normalizeTag(val);
        if (!list.some((item) => normalizeTag(item.label) === norm)) {
          list.push({
            label: val,
            groupName: group.name || 'Option',
          });
        }
      });
    });
    return list;
  }, [formData.optionGroups]);

  // Strict deduplication of curated categories against configured attributes
  const deduplicatedBadges = useMemo(() => {
    return BADGE_PRESETS.filter(
      (b) => !configuredAttributes.some((c) => normalizeTag(c.label) === normalizeTag(b)),
    );
  }, [configuredAttributes]);

  const deduplicatedDietary = useMemo(() => {
    return DIETARY_FILTER_PRESETS.filter(
      (d) =>
        !configuredAttributes.some((c) => normalizeTag(c.label) === normalizeTag(d)) &&
        !BADGE_PRESETS.some((b) => normalizeTag(b) === normalizeTag(d)),
    );
  }, [configuredAttributes]);

  const deduplicatedMeals = useMemo(() => {
    return MEAL_AND_CUISINE_PRESETS.filter(
      (m) =>
        !configuredAttributes.some((c) => normalizeTag(c.label) === normalizeTag(m)) &&
        !BADGE_PRESETS.some((b) => normalizeTag(b) === normalizeTag(m)) &&
        !DIETARY_FILTER_PRESETS.some((d) => normalizeTag(d) === normalizeTag(m)),
    );
  }, [configuredAttributes]);

  const customTags = useMemo(() => {
    return parsedTags.filter((tag) => {
      const norm = normalizeTag(tag);
      return (
        !BADGE_PRESETS.some((b) => normalizeTag(b) === norm) &&
        !DIETARY_FILTER_PRESETS.some((d) => normalizeTag(d) === norm) &&
        !MEAL_AND_CUISINE_PRESETS.some((m) => normalizeTag(m) === norm) &&
        !configuredAttributes.some((c) => normalizeTag(c.label) === norm)
      );
    });
  }, [parsedTags, configuredAttributes]);

  // ─── Actions for Tags & Filters ───

  const isTagActive = (tagText) => {
    const norm = normalizeTag(tagText);
    return parsedTags.some((t) => normalizeTag(t) === norm);
  };

  const handleToggleTag = (tagText) => {
    const clean = (tagText || '').trim();
    if (!clean) return;
    const norm = normalizeTag(clean);
    const existingIndex = parsedTags.findIndex((t) => normalizeTag(t) === norm);

    let nextTags;
    if (existingIndex >= 0) {
      // Remove tag
      nextTags = parsedTags.filter((_, idx) => idx !== existingIndex);
    } else {
      // Add tag
      nextTags = [...parsedTags, clean];
    }

    // Sync into badges if it's a known badge
    const isBadge = BADGE_PRESETS.some((b) => normalizeTag(b) === norm);
    let nextBadges = parsedBadges;
    if (isBadge) {
      if (existingIndex >= 0) {
        nextBadges = parsedBadges.filter((b) => normalizeTag(b) !== norm);
      } else if (!parsedBadges.some((b) => normalizeTag(b) === norm)) {
        nextBadges = [...parsedBadges, clean];
      }
    }

    setFormData((prev) => ({
      ...prev,
      tags: nextTags.join(', '),
      badges: nextBadges.join(', '),
    }));
  };

  const handleRemoveTag = (tagText) => {
    const norm = normalizeTag(tagText);
    const nextTags = parsedTags.filter((t) => normalizeTag(t) !== norm);
    const nextBadges = parsedBadges.filter((b) => normalizeTag(b) !== norm);
    setFormData((prev) => ({
      ...prev,
      tags: nextTags.join(', '),
      badges: nextBadges.join(', '),
    }));
  };

  const handleClearAllTags = () => {
    setFormData((prev) => ({
      ...prev,
      tags: '',
      badges: '',
    }));
    toast.success('Cleared all storefront filters');
  };

  // Sync all options from all configured Option Groups above into Tags
  const handleSyncAllAttributes = () => {
    if (configuredAttributes.length === 0) {
      toast.error('No attributes configured in the Option Groups above yet');
      return;
    }
    const toAdd = configuredAttributes.map((c) => c.label).filter((label) => !isTagActive(label));

    if (toAdd.length === 0) {
      toast('All configured attributes are already added to filters', { icon: 'ℹ️' });
      return;
    }

    const nextTags = [...parsedTags, ...toAdd];
    setFormData((prev) => ({ ...prev, tags: nextTags.join(', ') }));
    toast.success(
      `Added ${toAdd.length} attribute${toAdd.length > 1 ? 's' : ''} to storefront filters`,
    );
  };

  return (
    <div className="space-y-5">
      {/* ─── UNIFIED DISCOVERY FILTERS & STOREFRONT TAGS ─── */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[var(--admin-border-subtle)]">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px] text-[var(--admin-accent,#800000)]">
              sell
            </span>
            <h2 className="text-[13px] font-bold text-[var(--admin-text-primary)] uppercase tracking-wider whitespace-nowrap">
              Storefront Tags & Badges
            </h2>
            <span className="text-[10px] text-[var(--admin-text-secondary)] font-medium bg-[var(--admin-surface-muted)] px-2 py-0.5 rounded-full border border-[var(--admin-border)] whitespace-nowrap">
              {parsedTags.length} active {parsedTags.length === 1 ? 'filter' : 'filters'}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {configuredAttributes.length > 0 && (
              <button
                type="button"
                onClick={handleSyncAllAttributes}
                className="text-[11px] text-[var(--admin-accent)] hover:underline font-bold cursor-pointer flex items-center gap-1"
                title="Add all portion weights configured in pricing into search filters"
              >
                <span className="material-symbols-outlined text-[13px]">sync</span>
                <span>Add Portions to Filters</span>
              </button>
            )}

            {parsedTags.length > 0 && (
              <button
                type="button"
                onClick={handleClearAllTags}
                className="text-[10.5px] text-[var(--admin-text-tertiary)] hover:text-[var(--admin-error)] font-semibold cursor-pointer transition-colors"
              >
                Clear All
              </button>
            )}
          </div>
        </div>

        {/* ── Main Unified Filters Card ── */}
        <div className="p-3.5 sm:p-4 bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-[6px] shadow-2xs divide-y divide-[var(--admin-border-subtle)] space-y-3.5 [&>*:not(:first-child)]:pt-3.5">
          {/* ── 1. Portion & Weight Filters from Configured Attributes ── */}
          {configuredAttributes.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold text-[var(--admin-text-secondary)] uppercase tracking-wider flex items-center gap-1">
                <span className="material-symbols-outlined text-[13px] text-[var(--admin-accent,#800000)]">
                  scale
                </span>
                <span>Portion & Weight Filters:</span>
              </span>
              <div className="flex flex-wrap gap-1.5">
                {configuredAttributes.map((attr) => (
                  <FilterToggleChip
                    key={`cfg-${attr.label}`}
                    label={attr.label}
                    active={isTagActive(attr.label)}
                    onToggle={handleToggleTag}
                  />
                ))}
              </div>
            </div>
          )}

          {/* ── 2. Storefront Badges & Merchandising ── */}
          {deduplicatedBadges.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold text-[var(--admin-text-secondary)] uppercase tracking-wider flex items-center gap-1">
                <span className="material-symbols-outlined text-[13px] text-[var(--admin-accent,#800000)]">
                  auto_awesome
                </span>
                <span>Storefront Badges & Highlights:</span>
              </span>
              <div className="flex flex-wrap gap-1.5">
                {deduplicatedBadges.map((badge) => (
                  <FilterToggleChip
                    key={badge}
                    label={badge}
                    active={isTagActive(badge)}
                    onToggle={handleToggleTag}
                  />
                ))}
              </div>
            </div>
          )}

          {/* ── 3. Dietary, Taste & Recipe Filters ── */}
          {deduplicatedDietary.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold text-[var(--admin-text-secondary)] uppercase tracking-wider flex items-center gap-1">
                <span className="material-symbols-outlined text-[13px] text-[var(--admin-accent,#800000)]">
                  eco
                </span>
                <span>Dietary, Taste & Recipe Filters:</span>
              </span>
              <div className="flex flex-wrap gap-1.5">
                {deduplicatedDietary.map((diet) => (
                  <FilterToggleChip
                    key={diet}
                    label={diet}
                    active={isTagActive(diet)}
                    onToggle={handleToggleTag}
                  />
                ))}
              </div>
            </div>
          )}

          {/* ── 4. Meal & Occasion Tags ── */}
          {deduplicatedMeals.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold text-[var(--admin-text-secondary)] uppercase tracking-wider flex items-center gap-1">
                <span className="material-symbols-outlined text-[13px] text-[var(--admin-accent,#800000)]">
                  restaurant
                </span>
                <span>Meal & Occasion Filters:</span>
              </span>
              <div className="flex flex-wrap gap-1.5">
                {deduplicatedMeals.map((meal) => (
                  <FilterToggleChip
                    key={meal}
                    label={meal}
                    active={isTagActive(meal)}
                    onToggle={handleToggleTag}
                  />
                ))}
              </div>
            </div>
          )}

          {/* ── 5. Custom Keyword Tags ── */}
          {customTags.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold text-[var(--admin-text-secondary)] uppercase tracking-wider flex items-center gap-1">
                <span className="material-symbols-outlined text-[13px] text-[var(--admin-accent,#800000)]">
                  label
                </span>
                <span>Custom Keyword Filters:</span>
              </span>
              <div className="flex flex-wrap gap-1.5">
                {customTags.map((tag) => (
                  <FilterToggleChip
                    key={tag}
                    label={tag}
                    active={isTagActive(tag)}
                    onToggle={handleToggleTag}
                  />
                ))}
              </div>
            </div>
          )}

          {/* ── Custom Filter Tag Adder ── */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const val = customTagInput.trim();
              if (!val) return;
              if (isTagActive(val)) {
                toast.error(`"${val}" is already added to filters`);
                return;
              }
              handleToggleTag(val);
              setCustomTagInput('');
              toast.success(`Added filter tag "${val}"`);
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              placeholder="Type any custom search keyword (e.g. Guntur Chilly, Traditional, 250g)"
              value={customTagInput}
              onChange={(e) => setCustomTagInput(e.target.value)}
              className={`w-full bg-[var(--admin-surface)] rounded-[4px] px-3 h-8 text-[11.5px] outline-none transition-all placeholder:text-[var(--admin-text-tertiary)] ${
                focusedField === 'tags'
                  ? 'border border-[var(--admin-accent)] ring-2 ring-[var(--admin-accent)]/50'
                  : 'border border-[var(--admin-border)] focus:border-[var(--admin-accent)]'
              }`}
            />
            <button
              type="submit"
              disabled={!customTagInput.trim()}
              className="h-8 px-4 rounded-[4px] bg-[var(--admin-accent)] hover:brightness-105 text-white font-bold text-[11px] uppercase cursor-pointer transition-all disabled:opacity-50 shrink-0 shadow-xs flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-[13px]">add</span>
              <span>Add</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
