import React, { useState, useMemo, useRef, useEffect } from 'react';
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

const WEEKDAY_KEYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];

const productId = (p) => p.id || p._id;
const productName = (p) => p.name || p.title || 'Untitled dish';
const productImage = (p) =>
  p.image ||
  p.imageSrc ||
  p.thumbnail ||
  (Array.isArray(p.images) ? p.images[0]?.url || p.images[0] : null);

function Thumb({ product, size = 'md' }) {
  const img = product ? productImage(product) : null;
  const dims = size === 'sm' ? 'w-7 h-7' : 'w-10 h-10';
  return (
    <span
      className={`${dims} rounded-[var(--admin-radius-md,6px)] overflow-hidden bg-[var(--admin-surface-muted)] border border-[var(--admin-border-subtle)] flex items-center justify-center shrink-0`}
    >
      {img ? (
        <img src={img} alt="" className="w-full h-full object-cover" loading="lazy" />
      ) : (
        <span className="material-symbols-outlined text-[16px] text-[var(--admin-text-tertiary)]">
          restaurant
        </span>
      )}
    </span>
  );
}

/** "Today", "Tomorrow" or the date of this day's next occurrence ("4 Nov"). */
function upcomingLabel(dayIndex, now) {
  const ahead = (dayIndex - now.getDay() + 7) % 7;
  if (ahead === 0) return 'Today';
  if (ahead === 1) return 'Tomorrow';
  const date = new Date(now);
  date.setDate(now.getDate() + ahead);
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export function WeeklyMenuCalendarEditor({
  sectionKey = 'hero',
  sectionData = {},
  onUpdate,
  title = 'Weekly Menu Planner',
}) {
  const { products } = useAdmin();
  const cutoffTime = sectionData.cutoffTime !== undefined ? sectionData.cutoffTime : '18:00';
  const effectiveSchedule = useMemo(() => getEffectiveMenuDay(cutoffTime), [cutoffTime]);

  const todayKey = effectiveSchedule.todayKey;
  const liveDayKey = effectiveSchedule.effectiveDayKey || todayKey;
  const [selectedDayKey, setSelectedDayKey] = useState(liveDayKey);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [copyOpen, setCopyOpen] = useState(false);
  const [mobilePane, setMobilePane] = useState('menu');
  const [copyTargets, setCopyTargets] = useState([]);
  const copyRef = useRef(null);

  const weeklySchedule = useMemo(
    () => sectionData.weeklySchedule || {},
    [sectionData.weeklySchedule],
  );
  const masterProductIds = useMemo(
    () => (Array.isArray(sectionData.productIds) ? sectionData.productIds : []),
    [sectionData.productIds],
  );

  const productsById = useMemo(() => {
    const map = new Map();
    (products || []).forEach((p) => map.set(productId(p), p));
    return map;
  }, [products]);

  // A day without its own list falls back to the default (top-level) list.
  const dayProductIds = (dayKey) => {
    const own = weeklySchedule[dayKey]?.productIds;
    return Array.isArray(own) ? own : masterProductIds;
  };
  const hasOwnList = (dayKey) => Array.isArray(weeklySchedule[dayKey]?.productIds);

  const currentDayProductIds = dayProductIds(selectedDayKey);
  // Dishes deleted from the catalogue can linger in a saved schedule; show only real ones.
  const currentDayProducts = currentDayProductIds.map((id) => productsById.get(id)).filter(Boolean);

  /** Writes several days in one update so later days don't overwrite earlier ones. */
  const setDayLists = (listsByDay) => {
    const updatedWeekly = { ...weeklySchedule };
    Object.entries(listsByDay).forEach(([dayKey, productIds]) => {
      updatedWeekly[dayKey] = { ...(weeklySchedule[dayKey] || {}), productIds };
    });
    const payload = { ...sectionData, weeklySchedule: updatedWeekly };
    // Today's list doubles as the top-level list the storefront reads.
    if (listsByDay[todayKey] !== undefined) payload.productIds = listsByDay[todayKey];
    onUpdate(sectionKey, payload);
  };

  const toggleProduct = (id) => {
    const list = currentDayProductIds;
    setDayLists({
      [selectedDayKey]: list.includes(id) ? list.filter((x) => x !== id) : [...list, id],
    });
  };

  const clearDay = () => setDayLists({ [selectedDayKey]: [] });

  const applyCopy = () => {
    if (copyTargets.length === 0) return;
    const lists = {};
    copyTargets.forEach((dayKey) => {
      lists[dayKey] = [...currentDayProductIds];
    });
    setDayLists(lists);
    setCopyOpen(false);
    setCopyTargets([]);
  };

  const updateCutoffTime = (newCutoff) =>
    onUpdate(sectionKey, { ...sectionData, cutoffTime: newCutoff });

  useEffect(() => {
    if (!copyOpen) return undefined;
    const close = (e) => {
      if (copyRef.current && !copyRef.current.contains(e.target)) setCopyOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [copyOpen]);

  const selectedDayMeta = DAYS_OF_WEEK.find((d) => d.key === selectedDayKey) || DAYS_OF_WEEK[0];
  const otherDays = DAYS_OF_WEEK.filter((d) => d.key !== selectedDayKey);

  const categories = useMemo(() => {
    const counts = new Map();
    (products || []).forEach((p) => {
      if (p.category) counts.set(p.category, (counts.get(p.category) || 0) + 1);
    });
    return Array.from(counts.entries());
  }, [products]);

  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return (products || []).filter((p) => {
      const matchesSearch =
        !q ||
        productName(p).toLowerCase().includes(q) ||
        (p.category || '').toLowerCase().includes(q);
      const matchesCategory =
        selectedCategory === 'all' ||
        (p.category || '').toLowerCase() === selectedCategory.toLowerCase();
      return matchesSearch && matchesCategory;
    });
  }, [products, searchQuery, selectedCategory]);

  const liveMeta = effectiveSchedule.effectiveMeta;
  const liveCount = dayProductIds(liveDayKey).filter((id) => productsById.has(id)).length;

  return (
    <div className="space-y-5">
      {/* ── Live status + cutoff (one line) ─────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-3.5 py-2.5 rounded-[var(--admin-radius-lg,8px)] border border-[var(--admin-border)] bg-[var(--admin-surface-muted)]">
        <p className="flex items-center gap-2 text-[12.5px] text-[var(--admin-text-secondary)] min-w-0">
          <span className="relative flex w-2 h-2 shrink-0">
            <span className="absolute inset-0 rounded-full bg-emerald-500 opacity-60 animate-ping" />
            <span className="relative w-2 h-2 rounded-full bg-emerald-500" />
          </span>
          <span className="truncate">
            Live now: <strong className="text-[var(--admin-text-primary)]">{liveMeta.label}</strong>{' '}
            · {liveCount} {liveCount === 1 ? 'dish' : 'dishes'}
          </span>
        </p>
        <label className="flex items-center gap-2 text-[12px] text-[var(--admin-text-secondary)] shrink-0">
          <span className="material-symbols-outlined text-[16px] text-[var(--admin-text-tertiary)]">
            schedule
          </span>
          Next day from
          <select
            value={cutoffTime}
            onChange={(e) => updateCutoffTime(e.target.value)}
            className="h-[30px] px-2 rounded-[var(--admin-radius-md,6px)] bg-[var(--admin-surface)] border border-[var(--admin-border)] text-[12px] font-semibold text-[var(--admin-text-primary)] focus:outline-none focus:border-[var(--admin-accent)] cursor-pointer"
          >
            {CUTOFF_TIME_PRESETS.map((preset) => (
              <option key={preset.value} value={preset.value}>
                {preset.value === 'disabled' ? 'Midnight' : preset.label.replace(' (Default)', '')}
              </option>
            ))}
            {!CUTOFF_TIME_PRESETS.some((p) => p.value === cutoffTime) && (
              <option value={cutoffTime}>{cutoffTime}</option>
            )}
          </select>
          {cutoffTime !== 'disabled' && (
            <input
              type="time"
              value={cutoffTime}
              onChange={(e) => e.target.value && updateCutoffTime(e.target.value)}
              aria-label="Custom time"
              className="hidden sm:block h-[30px] px-2 rounded-[var(--admin-radius-md,6px)] bg-[var(--admin-surface)] border border-[var(--admin-border)] text-[12px] text-[var(--admin-text-primary)] cursor-pointer"
            />
          )}
        </label>
      </div>

      {/* ── Week: compact chips on phones, cards with thumbnails from md ── */}
      <section aria-label={title}>
        <div className="flex md:grid md:grid-cols-7 gap-1.5 md:gap-2 overflow-x-auto -mx-1 px-1 pb-1 snap-x scrollbar-none">
          {DAYS_OF_WEEK.map((day) => {
            const isSelected = selectedDayKey === day.key;
            const isLive = liveDayKey === day.key;
            const ids = dayProductIds(day.key).filter((id) => productsById.has(id));
            const thumbs = ids.slice(0, 3).map((id) => productsById.get(id));
            return (
              <button
                key={day.key}
                type="button"
                onClick={() => setSelectedDayKey(day.key)}
                aria-pressed={isSelected}
                aria-label={`${day.label}, ${ids.length} dishes${isLive ? ', live now' : ''}`}
                className={`relative snap-start shrink-0 md:shrink w-[64px] md:w-auto flex flex-col items-center md:items-stretch text-center md:text-left px-2 py-2 md:p-2.5 rounded-[var(--admin-radius-lg,8px)] border transition-all cursor-pointer ${
                  isSelected
                    ? 'border-[var(--admin-accent)] bg-[var(--admin-surface)] ring-2 ring-[var(--admin-accent)]/20'
                    : 'border-[var(--admin-border)] bg-[var(--admin-surface-muted)] hover:bg-[var(--admin-surface)]'
                }`}
              >
                {isLive && (
                  <span
                    className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-emerald-500"
                    title="Live now"
                  />
                )}
                <span
                  className={`text-[13px] font-bold ${isSelected ? 'text-[var(--admin-accent)]' : 'text-[var(--admin-text-primary)]'}`}
                >
                  <span className="lg:hidden">{day.short}</span>
                  <span className="hidden lg:inline">{day.label}</span>
                </span>
                <span className="hidden md:block text-[10.5px] text-[var(--admin-text-tertiary)]">
                  {upcomingLabel(day.index, effectiveSchedule.now)}
                </span>
                <span className="md:hidden mt-0.5 text-[11px] font-semibold text-[var(--admin-text-tertiary)]">
                  {ids.length}
                </span>
                <span className="hidden md:flex items-center justify-between mt-2 gap-1">
                  <span className="flex -space-x-1.5">
                    {thumbs.length > 0 ? (
                      thumbs.map((p) => (
                        <span
                          key={productId(p)}
                          className="ring-2 ring-[var(--admin-surface)] rounded-[6px]"
                        >
                          <Thumb product={p} size="sm" />
                        </span>
                      ))
                    ) : (
                      <span className="text-[10.5px] text-[var(--admin-text-tertiary)]">Empty</span>
                    )}
                  </span>
                  {ids.length > 0 && (
                    <span className="text-[11px] font-bold text-[var(--admin-text-secondary)]">
                      {ids.length}
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Phones: one panel at a time */}
      <div className="lg:hidden grid grid-cols-2 p-1 rounded-[var(--admin-radius-lg,8px)] bg-[var(--admin-surface-muted)] border border-[var(--admin-border)]">
        {[
          ['menu', `On ${selectedDayMeta.short} (${currentDayProducts.length})`],
          ['add', 'Add dishes'],
        ].map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setMobilePane(key)}
            aria-pressed={mobilePane === key}
            className={`h-[34px] rounded-[var(--admin-radius-md,6px)] text-[12.5px] font-semibold cursor-pointer transition-colors ${
              mobilePane === key
                ? 'bg-[var(--admin-surface)] text-[var(--admin-text-primary)] shadow-[var(--admin-shadow-xs)]'
                : 'text-[var(--admin-text-secondary)]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Day editor: chosen dishes | catalogue ───────────── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        {/* Selected day's menu */}
        <section
          className={`${mobilePane === 'menu' ? 'flex' : 'hidden'} lg:flex min-w-0 rounded-[var(--admin-radius-lg,8px)] border border-[var(--admin-border)] bg-[var(--admin-surface)] flex-col lg:min-h-[320px]`}
        >
          <header className="flex items-center justify-end lg:justify-between gap-2 px-4 py-2.5 lg:py-3 border-b border-[var(--admin-border-subtle)]">
            {/* On phones the "On Mon (4)" tab already names the day and count. */}
            <div className="hidden lg:block min-w-0">
              <h4 className="text-[13.5px] font-bold text-[var(--admin-text-primary)] truncate">
                {selectedDayMeta.label}&apos;s menu
              </h4>
              <p className="text-[11px] text-[var(--admin-text-tertiary)]">
                {currentDayProducts.length} {currentDayProducts.length === 1 ? 'dish' : 'dishes'}
                {liveDayKey === selectedDayKey && ' · live now'}
              </p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <div className="relative" ref={copyRef}>
                <button
                  type="button"
                  onClick={() => setCopyOpen((o) => !o)}
                  disabled={currentDayProducts.length === 0}
                  className="h-[30px] px-2.5 rounded-[var(--admin-radius-md,6px)] border border-[var(--admin-border)] text-[11.5px] font-semibold text-[var(--admin-text-primary)] hover:bg-[var(--admin-surface-muted)] inline-flex items-center gap-1 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <span className="material-symbols-outlined text-[15px]">content_copy</span>
                  Copy to…
                </button>
                {copyOpen && (
                  <div className="absolute right-0 top-[calc(100%+6px)] z-30 w-[230px] p-3 rounded-[var(--admin-radius-lg,8px)] border border-[var(--admin-border)] bg-[var(--admin-surface)] shadow-[var(--admin-shadow-lg,0_10px_30px_rgba(0,0,0,0.12))]">
                    <p className="text-[11.5px] font-bold text-[var(--admin-text-primary)] mb-2">
                      Copy {selectedDayMeta.label}&apos;s dishes to
                    </p>
                    <div className="flex gap-1.5 mb-2">
                      {[
                        ['Weekdays', WEEKDAY_KEYS.filter((k) => k !== selectedDayKey)],
                        ['All days', otherDays.map((d) => d.key)],
                      ].map(([label, keys]) => (
                        <button
                          key={label}
                          type="button"
                          onClick={() => setCopyTargets(keys)}
                          className="px-2 py-1 rounded-full text-[10.5px] font-semibold bg-[var(--admin-surface-muted)] border border-[var(--admin-border)] hover:border-[var(--admin-accent)] cursor-pointer"
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                    <div className="space-y-0.5 max-h-[220px] overflow-y-auto">
                      {otherDays.map((d) => (
                        <label
                          key={d.key}
                          className="flex items-center gap-2 px-1.5 py-1 rounded hover:bg-[var(--admin-surface-muted)] text-[12px] text-[var(--admin-text-primary)] cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={copyTargets.includes(d.key)}
                            onChange={() =>
                              setCopyTargets((t) =>
                                t.includes(d.key) ? t.filter((k) => k !== d.key) : [...t, d.key],
                              )
                            }
                            className="accent-[var(--admin-accent)]"
                          />
                          {d.label}
                          <span className="ml-auto text-[10.5px] text-[var(--admin-text-tertiary)]">
                            {dayProductIds(d.key).filter((id) => productsById.has(id)).length}
                          </span>
                        </label>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={applyCopy}
                      disabled={copyTargets.length === 0}
                      className="mt-2 w-full h-[32px] rounded-[var(--admin-radius-md,6px)] bg-[var(--admin-accent)] text-white text-[12px] font-bold cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Copy to {copyTargets.length || ''} {copyTargets.length === 1 ? 'day' : 'days'}
                    </button>
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={clearDay}
                disabled={currentDayProducts.length === 0}
                className="h-[30px] px-2.5 rounded-[var(--admin-radius-md,6px)] text-[11.5px] font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Clear
              </button>
            </div>
          </header>

          {currentDayProducts.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center px-6 py-10">
              <span className="material-symbols-outlined text-[32px] text-[var(--admin-text-tertiary)]">
                no_meals
              </span>
              <p className="text-[12.5px] font-semibold text-[var(--admin-text-primary)] mt-2">
                Nothing on {selectedDayMeta.label}&apos;s menu yet
              </p>
              <p className="hidden lg:block text-[11.5px] text-[var(--admin-text-tertiary)] mt-1">
                Pick dishes on the right.
              </p>
              <button
                type="button"
                onClick={() => setMobilePane('add')}
                className="lg:hidden mt-3 h-[36px] px-4 rounded-full bg-[var(--admin-accent)] text-white text-[12.5px] font-bold inline-flex items-center gap-1 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[17px]">add</span>
                Add dishes
              </button>
            </div>
          ) : (
            <ul className="flex-1 lg:overflow-y-auto lg:max-h-[440px] divide-y divide-[var(--admin-border-subtle)]">
              {currentDayProducts.map((p) => (
                <li key={productId(p)} className="flex items-center gap-3 px-4 py-2.5 group">
                  <Thumb product={p} />
                  <div className="min-w-0 flex-1">
                    <p className="text-[12.5px] font-semibold text-[var(--admin-text-primary)] truncate">
                      {productName(p)}
                    </p>
                    <p className="text-[11px] text-[var(--admin-text-tertiary)] truncate">
                      {p.category || 'Dish'}
                      {p.price ? ` · ₹${p.price}` : ''}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleProduct(productId(p))}
                    aria-label={`Remove ${productName(p)} from ${selectedDayMeta.label}`}
                    className="w-7 h-7 rounded-full flex items-center justify-center text-[var(--admin-text-tertiary)] hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 cursor-pointer shrink-0"
                  >
                    <span className="material-symbols-outlined text-[17px]">close</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Catalogue picker */}
        <section
          className={`${mobilePane === 'add' ? 'flex' : 'hidden'} lg:flex min-w-0 rounded-[var(--admin-radius-lg,8px)] border border-[var(--admin-border)] bg-[var(--admin-surface)] flex-col lg:min-h-[320px]`}
        >
          <header className="px-4 pt-3 pb-2.5 border-b border-[var(--admin-border-subtle)] space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <h4 className="hidden lg:block text-[13.5px] font-bold text-[var(--admin-text-primary)]">
                Add dishes
              </h4>
              <span className="text-[11px] text-[var(--admin-text-tertiary)]">
                {filteredProducts.length} of {products?.length || 0}
              </span>
            </div>
            <div className="flex items-center h-[36px] px-3 rounded-[var(--admin-radius-md,6px)] bg-[var(--admin-surface-muted)] border border-[var(--admin-border)] focus-within:border-[var(--admin-accent)] focus-within:bg-[var(--admin-surface)] transition-colors">
              <span className="material-symbols-outlined text-[18px] text-[var(--admin-text-tertiary)]">
                search
              </span>
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search dishes or categories"
                className="flex-1 min-w-0 bg-transparent border-none outline-none px-2 text-[12.5px] text-[var(--admin-text-primary)] placeholder-[var(--admin-text-tertiary)]"
              />
            </div>
            {categories.length > 1 && (
              <div className="flex gap-1.5 overflow-x-auto scrollbar-none -mx-1 px-1">
                {[['all', products?.length || 0], ...categories].map(([cat, count]) => {
                  const active = selectedCategory.toLowerCase() === String(cat).toLowerCase();
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-2.5 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap transition-colors cursor-pointer border ${
                        active
                          ? 'bg-[var(--admin-accent)] border-[var(--admin-accent)] text-white'
                          : 'bg-[var(--admin-surface)] border-[var(--admin-border)] text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)]'
                      }`}
                    >
                      {cat === 'all' ? 'All' : cat}
                      <span
                        className={active ? 'text-white/75' : 'text-[var(--admin-text-tertiary)]'}
                      >
                        {' '}
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </header>

          <div className="flex-1 lg:overflow-y-auto lg:max-h-[440px] p-2">
            {!products || products.length === 0 ? (
              <p className="p-8 text-center text-[12px] text-[var(--admin-text-secondary)]">
                No dishes in the catalogue yet.
              </p>
            ) : filteredProducts.length === 0 ? (
              <p className="p-8 text-center text-[12px] text-[var(--admin-text-secondary)]">
                No dishes match &ldquo;{searchQuery}&rdquo;.
              </p>
            ) : (
              <ul className="grid gap-1 sm:grid-cols-2">
                {filteredProducts.map((p) => {
                  const id = productId(p);
                  const added = currentDayProductIds.includes(id);
                  return (
                    <li key={id}>
                      <button
                        type="button"
                        onClick={() => toggleProduct(id)}
                        aria-pressed={added}
                        className={`w-full flex items-center gap-2.5 p-2 rounded-[var(--admin-radius-md,6px)] text-left border transition-colors cursor-pointer ${
                          added
                            ? 'border-[var(--admin-accent)]/40 bg-[var(--admin-accent)]/[0.06]'
                            : 'border-transparent hover:bg-[var(--admin-surface-muted)]'
                        }`}
                      >
                        <Thumb product={p} />
                        <span className="min-w-0 flex-1">
                          <span className="block text-[12.5px] font-semibold text-[var(--admin-text-primary)] truncate">
                            {productName(p)}
                          </span>
                          <span className="block text-[11px] text-[var(--admin-text-tertiary)] truncate">
                            {p.category || 'Dish'}
                            {p.price ? ` · ₹${p.price}` : ''}
                          </span>
                        </span>
                        <span
                          className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                            added
                              ? 'bg-[var(--admin-accent)] text-white'
                              : 'border border-[var(--admin-border-strong)] text-[var(--admin-text-secondary)]'
                          }`}
                        >
                          <span className="material-symbols-outlined text-[16px]">
                            {added ? 'check' : 'add'}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
