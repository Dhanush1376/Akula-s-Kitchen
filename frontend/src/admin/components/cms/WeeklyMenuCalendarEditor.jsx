import React, { useState, useMemo } from 'react';
import { useAdmin } from '../../context/AdminContext';
import {
  DAYS_OF_WEEK as SCHEDULE_DAYS,
  getEffectiveMenuDay,
  CUTOFF_TIME_PRESETS,
} from '../../../utils/ecommerce/menuScheduleUtils';

export const DAYS_OF_WEEK = SCHEDULE_DAYS;

export function getTodayDayKey() {
  const dayIndex = new Date().getDay(); // 0 is Sunday, 1 is Monday...
  const map = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  return map[dayIndex] || 'thursday';
}

export function WeeklyMenuCalendarEditor({
  sectionKey = 'hero',
  sectionData = {},
  onUpdate,
  title = 'Weekly Menu Planner',
  description = "Choose which dishes are served each day. Today's menu updates automatically!",
}) {
  const { products } = useAdmin();
  const cutoffTime = sectionData.cutoffTime !== undefined ? sectionData.cutoffTime : '18:00';
  const effectiveSchedule = useMemo(() => {
    return getEffectiveMenuDay(cutoffTime);
  }, [cutoffTime]);

  const todayKey = effectiveSchedule.todayKey;
  const [selectedDayKey, setSelectedDayKey] = useState(
    effectiveSchedule.effectiveDayKey || todayKey,
  );
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const weeklySchedule = useMemo(() => {
    return sectionData.weeklySchedule || {};
  }, [sectionData.weeklySchedule]);

  const masterProductIds = useMemo(() => {
    return Array.isArray(sectionData.productIds) ? sectionData.productIds : [];
  }, [sectionData.productIds]);

  // Products assigned to the currently selected day
  const currentDayConfig = weeklySchedule[selectedDayKey] || {};
  const currentDayProductIds = useMemo(() => {
    if (Array.isArray(currentDayConfig.productIds)) {
      return currentDayConfig.productIds;
    }
    return masterProductIds;
  }, [currentDayConfig.productIds, masterProductIds]);

  const updateDaySchedule = (dayKey, patch) => {
    const updatedWeekly = {
      ...weeklySchedule,
      [dayKey]: {
        ...(weeklySchedule[dayKey] || {}),
        ...patch,
      },
    };

    const updatePayload = {
      ...sectionData,
      weeklySchedule: updatedWeekly,
    };

    // If updating today, keep the top-level productIds in sync for live storefront
    if (dayKey === todayKey && patch.productIds !== undefined) {
      updatePayload.productIds = patch.productIds;
    }

    onUpdate(sectionKey, updatePayload);
  };

  const toggleProduct = (productId) => {
    const currentList = [...currentDayProductIds];
    const isSelected = currentList.includes(productId);
    const newList = isSelected
      ? currentList.filter((id) => id !== productId)
      : [...currentList, productId];

    updateDaySchedule(selectedDayKey, { productIds: newList });
  };

  const updateCutoffTime = (newCutoff) => {
    onUpdate(sectionKey, {
      ...sectionData,
      cutoffTime: newCutoff,
    });
  };

  const selectedDayMeta = DAYS_OF_WEEK.find((d) => d.key === selectedDayKey) || DAYS_OF_WEEK[0];

  // Extract categories for simple filter chips
  const categories = useMemo(() => {
    if (!products) return [];
    const set = new Set();
    products.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set);
  }, [products]);

  // Filter products by search and category
  const filteredProducts = useMemo(() => {
    if (!products) return [];
    return products.filter((p) => {
      const name = (p.name || p.title || '').toLowerCase();
      const cat = (p.category || '').toLowerCase();
      const matchesSearch = !searchQuery || name.includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || cat === selectedCategory.toLowerCase();
      return matchesSearch && matchesCategory;
    });
  }, [products, searchQuery, selectedCategory]);

  // Formatted date string for today
  const formattedToday = useMemo(() => {
    return new Date().toLocaleDateString('en-IN', {
      weekday: 'long',
      day: 'numeric',
      month: 'short',
    });
  }, []);

  return (
    <div className="space-y-4 pt-2">
      {/* 1. Header with Title & Today Badge — side by side */}
      <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-[var(--admin-border-subtle)]">
        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
          <span className="material-symbols-outlined text-[18px] sm:text-[20px] text-[var(--admin-accent)] shrink-0">
            calendar_month
          </span>
          <h3 className="text-[13.5px] sm:text-[15px] font-bold text-[var(--admin-text-primary)] truncate">
            {title}
          </h3>
        </div>

        {/* Live Today Status */}
        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[var(--admin-surface)] border border-[var(--admin-border)] text-[10.5px] sm:text-[11px] text-[var(--admin-text-secondary)] shadow-2xs shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
          <span>
            Today:{' '}
            <strong className="text-[var(--admin-text-primary)] font-semibold">
              {formattedToday}
            </strong>
          </span>
        </div>
      </div>

      {/* 2. 7-Day Day Selector Strip */}
      <div>
        <div className="grid grid-cols-7 gap-1 sm:gap-2 p-1.5 bg-[var(--admin-surface-muted)] rounded-[6px] border border-[var(--admin-border)]">
          {DAYS_OF_WEEK.map((day) => {
            const isSelected = selectedDayKey === day.key;
            const isToday = todayKey === day.key;
            const isTomorrowLive =
              effectiveSchedule.isTomorrow && day.key === effectiveSchedule.tomorrowKey;
            const dayProducts = weeklySchedule[day.key]?.productIds || masterProductIds;
            const count = dayProducts.length;

            return (
              <button
                key={day.key}
                type="button"
                onClick={() => setSelectedDayKey(day.key)}
                className={`flex flex-col items-center justify-center py-2 px-1 rounded-[4px] transition-all cursor-pointer select-none text-center relative ${
                  isSelected
                    ? 'bg-white dark:bg-stone-800 text-[var(--admin-accent)] shadow-xs ring-1 ring-[var(--admin-accent)] font-bold'
                    : 'text-[var(--admin-text-secondary)] hover:bg-[var(--admin-surface)] hover:text-[var(--admin-text-primary)]'
                }`}
              >
                {/* Day Name */}
                <span className="text-[12px] sm:text-[13px] font-semibold leading-tight">
                  <span className="sm:hidden">{day.short}</span>
                  <span className="hidden sm:inline">{day.label}</span>
                </span>

                {/* Dish Count Pill */}
                <span
                  className={`mt-1 text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    isSelected
                      ? 'bg-[var(--admin-accent)] text-white'
                      : count > 0
                        ? 'bg-[var(--admin-accent)]/15 text-[var(--admin-accent)]'
                        : 'bg-[var(--admin-border-subtle)] text-[var(--admin-text-tertiary)]'
                  }`}
                >
                  {count}
                </span>

                {/* Today Green Dot Indicator */}
                {isToday && (
                  <span
                    className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-[var(--admin-surface)] shadow-xs"
                    title="Actual today"
                  />
                )}

                {/* Tomorrow Evening Rollover Indicator */}
                {isTomorrowLive && (
                  <span
                    className="absolute -top-1 -left-1 w-2.5 h-2.5 rounded-full bg-amber-500 border-2 border-[var(--admin-surface)] shadow-xs animate-pulse"
                    title="Currently active on storefront (evening rollover)"
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Evening Rollover Cutoff Setting */}
      <div className="p-3 bg-[var(--admin-surface-muted)] rounded-[4px] border border-[var(--admin-border)] space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 min-w-0">
            <span className="material-symbols-outlined text-[18px] text-[var(--admin-accent)] shrink-0">
              schedule
            </span>
            <div className="min-w-0">
              <span className="text-[12.5px] font-bold text-[var(--admin-text-primary)] block sm:inline">
                Evening Cutoff Time
              </span>
              <span className="text-[11px] text-[var(--admin-text-secondary)] block sm:inline sm:ml-2 truncate">
                Switches storefront to tomorrow&apos;s menu after this time
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <select
              value={cutoffTime}
              onChange={(e) => updateCutoffTime(e.target.value)}
              className="h-[30px] px-2.5 rounded-[3px] bg-[var(--admin-surface)] border border-[var(--admin-border)] text-[12px] font-semibold text-[var(--admin-text-primary)] focus:outline-none focus:border-[var(--admin-accent)] cursor-pointer"
            >
              {CUTOFF_TIME_PRESETS.map((preset) => (
                <option key={preset.value} value={preset.value}>
                  {preset.label}
                </option>
              ))}
              {!CUTOFF_TIME_PRESETS.some((p) => p.value === cutoffTime) && (
                <option value={cutoffTime}>Custom ({cutoffTime})</option>
              )}
            </select>

            <input
              type="time"
              value={cutoffTime !== 'disabled' ? cutoffTime : '18:00'}
              onChange={(e) => updateCutoffTime(e.target.value)}
              disabled={cutoffTime === 'disabled'}
              className="h-[30px] px-2 rounded-[3px] bg-[var(--admin-surface)] border border-[var(--admin-border)] text-[11.5px] font-medium text-[var(--admin-text-primary)] disabled:opacity-40 cursor-pointer"
              title="Pick custom cutoff time"
            />
          </div>
        </div>

        {/* Live Status Pill */}
        <div className="pt-1.5 border-t border-[var(--admin-border-subtle)] text-[11px]">
          {effectiveSchedule.isAfterCutoff ? (
            <span className="inline-flex items-center gap-1.5 text-amber-700 dark:text-amber-300 font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse shrink-0" />
              <span>
                Evening Cutoff Active: Storefront is showing Tomorrow (
                {effectiveSchedule.tomorrowMeta.label}) · Rolls over to Today at 12:00 AM Midnight
              </span>
            </span>
          ) : cutoffTime === 'disabled' ? (
            <span className="inline-flex items-center gap-1.5 text-[var(--admin-text-secondary)]">
              <span className="w-1.5 h-1.5 rounded-full bg-stone-400 shrink-0" />
              <span>Cutoff Disabled: Storefront stays on Today until 12:00 AM Midnight</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-emerald-700 dark:text-emerald-300 font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
              <span>
                Currently Live: Today ({effectiveSchedule.todayMeta.label}) · Automatically
                transitions to Tomorrow at {effectiveSchedule.cutoffDisplay}
              </span>
            </span>
          )}
        </div>
      </div>

      {/* 3. Search Bar */}
      <div className="relative w-full bg-[var(--admin-surface-muted)] rounded-[4px] border border-[var(--admin-border)] flex items-center px-3 h-[38px] transition-colors focus-within:border-[var(--admin-accent)] focus-within:bg-[var(--admin-surface)]">
        <span className="material-symbols-outlined text-[18px] text-[var(--admin-text-tertiary)] shrink-0 select-none">
          search
        </span>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={`Search dishes for ${selectedDayMeta.label}...`}
          className="bg-transparent border-none outline-none w-full text-[12.5px] text-[var(--admin-text-primary)] placeholder-[var(--admin-text-tertiary)] font-medium px-2.5 h-full min-w-0"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="text-[var(--admin-text-tertiary)] hover:text-[var(--admin-text-primary)] cursor-pointer p-0.5 flex items-center justify-center shrink-0"
            title="Clear search"
          >
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        )}
      </div>

      {/* 5. Category Filter Chips */}
      {categories.length > 0 && (
        <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 scrollbar-none">
          <button
            type="button"
            onClick={() => setSelectedCategory('all')}
            className={`px-2.5 py-1 rounded-[4px] text-[11px] font-semibold transition-colors shrink-0 cursor-pointer ${
              selectedCategory === 'all'
                ? 'bg-[var(--admin-accent)] text-white shadow-2xs'
                : 'bg-[var(--admin-surface-muted)] text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)] border border-[var(--admin-border)]'
            }`}
          >
            All ({products?.length || 0})
          </button>
          {categories.map((cat) => {
            const count = products?.filter((p) => p.category === cat).length || 0;
            const isCatActive = selectedCategory.toLowerCase() === cat.toLowerCase();
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 py-1 rounded-[4px] text-[11px] font-semibold transition-colors shrink-0 cursor-pointer ${
                  isCatActive
                    ? 'bg-[var(--admin-accent)] text-white shadow-2xs'
                    : 'bg-[var(--admin-surface-muted)] text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)] border border-[var(--admin-border)]'
                }`}
              >
                {cat} ({count})
              </button>
            );
          })}
        </div>
      )}

      {/* 5. Food Dishes Grid (Big Visual Cards with Tap to Add / Remove) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5 sm:gap-3 max-h-[460px] overflow-y-auto p-1 pr-1.5 scrollbar-thin">
        {!products || products.length === 0 ? (
          <div className="col-span-full p-8 text-center text-[var(--admin-text-secondary)] text-[12px] bg-[var(--admin-surface-muted)] rounded-[4px] border border-[var(--admin-border)]">
            No dishes found in product catalog.
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="col-span-full p-8 text-center text-[var(--admin-text-secondary)] text-[12px] bg-[var(--admin-surface-muted)] rounded-[4px] border border-[var(--admin-border)]">
            No dishes match &ldquo;{searchQuery}&rdquo;. Try another search.
          </div>
        ) : (
          filteredProducts.map((prd) => {
            const pId = prd.id || prd._id;
            const isSelected = currentDayProductIds.includes(pId);
            const pImg =
              prd.image ||
              prd.imageSrc ||
              (Array.isArray(prd.images) ? prd.images[0]?.url || prd.images[0] : null);

            return (
              <div
                key={pId}
                onClick={() => toggleProduct(pId)}
                className={`relative rounded-[6px] border p-2 cursor-pointer transition-all duration-150 flex flex-col gap-1.5 select-none group ${
                  isSelected
                    ? 'bg-white dark:bg-stone-800 border-[var(--admin-accent)] ring-2 ring-[var(--admin-accent)]/30 shadow-xs'
                    : 'bg-[var(--admin-surface-muted)] border-[var(--admin-border)] opacity-65 hover:opacity-100 hover:border-[var(--admin-accent)]/50'
                }`}
              >
                {/* Picture */}
                <div className="aspect-square w-full rounded-[4px] overflow-hidden bg-black/5 relative">
                  {pImg ? (
                    <img
                      src={pImg}
                      alt={prd.name || prd.title}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[var(--admin-text-tertiary)]">
                      <span className="material-symbols-outlined text-[24px]">restaurant</span>
                    </div>
                  )}

                  {/* Status Overlay Badge */}
                  <div className="absolute top-1 right-1">
                    {isSelected ? (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-[3px] bg-[var(--admin-accent)] text-white text-[9.5px] font-bold shadow-xs">
                        <span className="material-symbols-outlined text-[12px]">check</span>
                        <span>ON</span>
                      </span>
                    ) : (
                      <span className="w-5 h-5 rounded-full bg-black/40 text-white/80 group-hover:bg-[var(--admin-accent)] group-hover:text-white flex items-center justify-center text-[11px] font-bold transition-colors">
                        +
                      </span>
                    )}
                  </div>
                </div>

                {/* Dish Info */}
                <div className="min-w-0">
                  <span className="text-[11.5px] font-bold text-[var(--admin-text-primary)] block truncate">
                    {prd.name || prd.title}
                  </span>
                  <div className="flex items-center justify-between text-[10px] mt-0.5">
                    <span className="text-[var(--admin-text-tertiary)] font-medium truncate">
                      {prd.category || 'Dishes'}
                    </span>
                    {prd.price && (
                      <span className="font-bold text-[var(--admin-text-primary)]">
                        ₹{prd.price}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
