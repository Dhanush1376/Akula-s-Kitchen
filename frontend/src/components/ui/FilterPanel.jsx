import { Check, X, RotateCcw } from 'lucide-react';
import { m as motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useMobileDrawerEngine, DrawerDragHandle } from './drawer';

const FilterSection = ({ title, id, children, activeSections, onToggle }) => (
  <div className="mb-2 border-b border-black/[0.06] pb-2 last:border-0 last:pb-0">
    <button
      onClick={() => onToggle(id)}
      className="w-full flex justify-between items-center py-1 text-left font-sans text-[12px] sm:text-[13px] text-neutral-900 hover:text-black transition-colors group min-h-0 cursor-pointer"
    >
      <span className="uppercase tracking-wider font-bold">{title}</span>
      <span
        className={`material-symbols-outlined text-neutral-500 text-[18px] transition-transform duration-300 ${activeSections[id] ? 'rotate-180 text-black' : ''}`}
      >
        expand_more
      </span>
    </button>
    <AnimatePresence initial={false}>
      {activeSections[id] && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.25, ease: [0.2, 1, 0.2, 1] }}
          className="overflow-hidden"
        >
          <div className="mt-1 space-y-0.5">{children}</div>
        </motion.div>
      )}
    </AnimatePresence>
  </div>
);

const Checkbox = ({ label, count, type, currentFilters, onToggleFilter, isChild = false }) => {
  const isChecked = currentFilters[type]?.includes(label);
  return (
    <label
      className={`flex items-center justify-between cursor-pointer group py-1 px-1.5 hover:bg-neutral-100/70 rounded-lg transition-all duration-200 ${isChild ? 'ml-4 border-l-2 border-neutral-200 pl-2' : ''}`}
    >
      <div className="flex items-center gap-2">
        <div className="relative flex items-center justify-center">
          <input
            type="checkbox"
            checked={isChecked}
            onChange={() => onToggleFilter(type, label)}
            className="peer appearance-none h-4 w-4 border border-neutral-300 rounded-md bg-white checked:bg-[#283618] checked:border-[#283618] transition-all cursor-pointer focus:ring-2 focus:ring-[#283618]/20"
          />
          <Check
            className="absolute text-white text-[12px] opacity-0 peer-checked:opacity-100 pointer-events-none transition-opacity font-bold"
            strokeWidth={2.4}
          />
        </div>
        <span
          className={`font-sans text-[12.5px] transition-colors ${isChecked ? 'text-black font-semibold' : 'text-neutral-700 group-hover:text-black'}`}
        >
          {label}
        </span>
      </div>
      {count !== null && (
        <span className="font-sans text-[10px] text-neutral-500 font-bold bg-neutral-100 px-1.5 py-0.5 rounded-full">
          {count}
        </span>
      )}
    </label>
  );
};

const PriceRangeSlider = ({
  minPossible = 0,
  maxPossible = 1000,
  initialMin,
  initialMax,
  group,
  onSetFilterValue,
}) => {
  // Normalize safe dynamic bounds
  let boundMin = typeof minPossible === 'number' && !isNaN(minPossible) ? minPossible : 0;
  let boundMax = typeof maxPossible === 'number' && !isNaN(maxPossible) ? maxPossible : 1000;
  if (boundMin >= boundMax) {
    boundMin = Math.max(0, boundMin - 50);
    boundMax = boundMax + 50;
  }
  const span = boundMax - boundMin;
  const step = span <= 200 ? 5 : span <= 1000 ? 10 : span <= 5000 ? 25 : 50;

  const [localMin, setLocalMin] = useState(
    typeof initialMin === 'number' ? Math.max(boundMin, Math.min(boundMax, initialMin)) : boundMin,
  );
  const [localMax, setLocalMax] = useState(
    typeof initialMax === 'number' ? Math.max(boundMin, Math.min(boundMax, initialMax)) : boundMax,
  );
  const [isInteracting, setIsInteracting] = useState(false);
  const debounceTimerRef = useRef(null);
  const lastCommittedRef = useRef({ min: initialMin ?? boundMin, max: initialMax ?? boundMax });

  // Sync when initial values change externally (e.g. Clear All)
  useEffect(() => {
    const nextMin =
      typeof initialMin === 'number'
        ? Math.max(boundMin, Math.min(boundMax, initialMin))
        : boundMin;
    const nextMax =
      typeof initialMax === 'number'
        ? Math.max(boundMin, Math.min(boundMax, initialMax))
        : boundMax;
    setLocalMin(nextMin);
    setLocalMax(nextMax);
    lastCommittedRef.current = { min: nextMin, max: nextMax };
  }, [initialMin, initialMax, boundMin, boundMax]);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, []);

  const commitFilters = useCallback(
    (min, max) => {
      if (!onSetFilterValue || !group) return;
      if (lastCommittedRef.current.min === min && lastCommittedRef.current.max === max) {
        return;
      }
      lastCommittedRef.current = { min, max };
      if (min <= boundMin && max >= boundMax) {
        onSetFilterValue(group.id, []);
      } else {
        onSetFilterValue(group.id, [`${min}-${max}`]);
      }
    },
    [onSetFilterValue, group, boundMin, boundMax],
  );

  const handleMinChange = (e) => {
    const rawVal = Number(e.target.value);
    const val = Math.min(rawVal, localMax - step);
    setLocalMin(val);
    setIsInteracting(true);

    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      commitFilters(val, localMax);
    }, 220);
  };

  const handleMaxChange = (e) => {
    const rawVal = Number(e.target.value);
    const val = Math.max(rawVal, localMin + step);
    setLocalMax(val);
    setIsInteracting(true);

    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      commitFilters(localMin, val);
    }, 220);
  };

  const handlePointerEnd = () => {
    setIsInteracting(false);
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    commitFilters(localMin, localMax);
  };

  const handleReset = (e) => {
    e?.stopPropagation?.();
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    setLocalMin(boundMin);
    setLocalMax(boundMax);
    commitFilters(boundMin, boundMax);
  };

  const handleTrackClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickRatio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const targetVal = Math.round((boundMin + clickRatio * span) / step) * step;

    const distToMin = Math.abs(targetVal - localMin);
    const distToMax = Math.abs(targetVal - localMax);

    if (distToMin < distToMax) {
      const newMin = Math.min(targetVal, localMax - step);
      setLocalMin(newMin);
      commitFilters(newMin, localMax);
    } else {
      const newMax = Math.max(targetVal, localMin + step);
      setLocalMax(newMax);
      commitFilters(localMin, newMax);
    }
  };

  const minPercent = Math.min(100, Math.max(0, ((localMin - boundMin) / span) * 100));
  const maxPercent = Math.min(100, Math.max(0, ((localMax - boundMin) / span) * 100));
  const isFiltered = localMin > boundMin || localMax < boundMax;

  // Swap z-index when thumbs are near the right bound to avoid trapping the min thumb
  const isMinNearRight = localMin > boundMax - span * 0.15;

  return (
    <div className="px-0.5 pt-1 pb-0.5">
      {/* Dynamic Range Track Container */}
      <div
        className="relative w-full h-6 flex items-center select-none cursor-pointer group"
        onClick={handleTrackClick}
      >
        {/* Background Rail */}
        <div className="w-full h-1.5 bg-neutral-200/90 rounded-full relative overflow-visible">
          {/* Active Highlight Bar */}
          <div
            className={`absolute h-full rounded-full bg-[#283618] ${
              isInteracting ? 'transition-none' : 'transition-all duration-150 ease-out'
            }`}
            style={{
              left: `${minPercent}%`,
              width: `${Math.max(0, maxPercent - minPercent)}%`,
            }}
          />
        </div>

        {/* Dual Inputs overlay */}
        <input
          type="range"
          min={boundMin}
          max={boundMax}
          step={step}
          value={localMin}
          onChange={handleMinChange}
          onMouseUp={handlePointerEnd}
          onTouchEnd={handlePointerEnd}
          onKeyUp={handlePointerEnd}
          className="dual-range-input"
          style={{ zIndex: isMinNearRight ? 25 : 20 }}
          aria-label="Minimum Price"
        />
        <input
          type="range"
          min={boundMin}
          max={boundMax}
          step={step}
          value={localMax}
          onChange={handleMaxChange}
          onMouseUp={handlePointerEnd}
          onTouchEnd={handlePointerEnd}
          onKeyUp={handlePointerEnd}
          className="dual-range-input"
          style={{ zIndex: isMinNearRight ? 20 : 22 }}
          aria-label="Maximum Price"
        />
      </div>

      {/* Dynamic Price Display Cards */}
      <div className="grid grid-cols-2 gap-2 mt-1.5">
        <div className="bg-neutral-50/90 hover:bg-neutral-100/90 transition-colors rounded-lg py-1.5 px-2 border border-black/[0.05] flex flex-col items-center justify-center">
          <span className="font-sans text-[9px] uppercase tracking-wider text-neutral-400 font-bold mb-0.5">
            Min Price
          </span>
          <span className="font-sans text-[13.5px] font-bold text-neutral-900 tracking-tight">
            ₹{localMin.toLocaleString('en-IN')}
          </span>
        </div>

        <div className="bg-neutral-50/90 hover:bg-neutral-100/90 transition-colors rounded-lg py-1.5 px-2 border border-black/[0.05] flex flex-col items-center justify-center">
          <span className="font-sans text-[9px] uppercase tracking-wider text-neutral-400 font-bold mb-0.5">
            Max Price
          </span>
          <span className="font-sans text-[13.5px] font-bold text-neutral-900 tracking-tight">
            ₹{localMax.toLocaleString('en-IN')}
          </span>
        </div>
      </div>

      {/* Reset & Status Bar */}
      {isFiltered && (
        <div className="flex items-center justify-between mt-1 pt-1 px-0.5 border-t border-black/[0.04]">
          <span className="font-sans text-[10.5px] font-semibold text-[#283618] flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#283618] inline-block animate-pulse" />
            Active Filter
          </span>
          <button
            type="button"
            onClick={handleReset}
            className="font-sans text-[11px] font-bold text-neutral-500 hover:text-black flex items-center gap-1 underline underline-offset-2 transition-colors cursor-pointer"
          >
            <RotateCcw size={10} strokeWidth={2.5} />
            Reset
          </button>
        </div>
      )}
    </div>
  );
};

export function FilterPanel({
  filterGroups = [],
  currentFilters = {},
  onToggleFilter,
  onSetFilterValue,
  onClearAll,
  className = '',
  isOpen,
  onClose,
  sortBy,
  onSortChange,
  products = [],
  mobileSubtitle = 'Refine Collection',
}) {
  // All sections open by default
  const [activeSections, setActiveSections] = useState({
    sort: true,
    priceRange: true,
  });

  const [cumulativeOptions, setCumulativeOptions] = useState({});
  const [cumulativeGroups, setCumulativeGroups] = useState([]);

  // Initialize active sections for dynamic filters and build cumulative options
  useEffect(() => {
    // Determine dynamic price range bounds from catalog/products fallback
    const productPrices = (products || [])
      .map((p) => p.price)
      .filter((p) => typeof p === 'number' && !isNaN(p));
    const derivedMin =
      productPrices.length > 0 ? Math.floor(Math.min(...productPrices) / 25) * 25 : 0;
    const derivedMax =
      productPrices.length > 0 ? Math.ceil(Math.max(...productPrices) / 25) * 25 : 1000;

    const baseGroups = [...filterGroups];
    const existingPriceGroup = baseGroups.find((g) => g.id === 'priceRange');

    if (!existingPriceGroup) {
      baseGroups.unshift({
        id: 'priceRange',
        label: 'Price Range',
        type: 'range',
        min: derivedMin,
        max: derivedMax,
      });
    }

    // Make ALL sections open by default
    setActiveSections((prev) => {
      const next = { ...prev, sort: true, priceRange: true };
      baseGroups.forEach((group) => {
        if (next[group.id] === undefined) {
          next[group.id] = true;
        }
      });
      return next;
    });

    setCumulativeGroups((prev) => {
      const next = [...prev];
      baseGroups.forEach((fg) => {
        const idx = next.findIndex(
          (g) =>
            g.id.toLowerCase() === fg.id.toLowerCase() ||
            g.label.toLowerCase() === fg.label.toLowerCase(),
        );
        if (idx === -1) {
          next.push({ ...fg });
        } else {
          next[idx] = { ...next[idx], ...fg };
        }
      });
      return next;
    });

    setCumulativeOptions((prev) => {
      const next = { ...prev };
      baseGroups.forEach((group) => {
        if (!next[group.id]) {
          next[group.id] = new Map();
        }
        const groupMap = new Map(next[group.id]);

        // Reset existing counts to 0 before applying new ones
        groupMap.forEach((opt, key) => {
          groupMap.set(key, { ...opt, count: 0 });
        });

        // Update with new options and counts
        if (group.options) {
          group.options.forEach((opt) => {
            groupMap.set(opt.value, opt);
          });
        }
        next[group.id] = groupMap;
      });
      return next;
    });
  }, [filterGroups, products]);

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  const { isMobile, dragProps, sheetTransition } = useMobileDrawerEngine({
    isOpen,
    onClose,
  });

  const toggleSection = (section) => {
    setActiveSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const renderCheckbox = (type, label, count = null, isChild = false) => (
    <Checkbox
      key={label}
      type={type}
      label={label}
      count={count}
      isChild={isChild}
      currentFilters={currentFilters}
      onToggleFilter={onToggleFilter}
    />
  );

  const panelContent = (
    <div className="flex flex-col h-full">
      {/* Top Header Row with normal typography & compact margins */}
      <div className="flex items-center justify-between mb-2 pb-2 border-b border-black/[0.06]">
        <div className="flex flex-col">
          <h2 className="font-sans text-[20px] sm:text-[22px] text-neutral-900 font-bold leading-tight">
            Filters
          </h2>
          {isOpen && (
            <span className="font-sans text-[10px] text-neutral-500 uppercase tracking-widest font-semibold mt-0.5">
              {mobileSubtitle}
            </span>
          )}
        </div>
        <button
          onClick={onClearAll}
          className="font-sans text-[11px] uppercase tracking-wider text-neutral-500 hover:text-black transition-colors font-bold cursor-pointer underline underline-offset-4"
        >
          Clear All
        </button>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar pr-0.5 space-y-0.5">
        {/* Sort By section */}
        <FilterSection
          title="Sort By"
          id="sort"
          activeSections={activeSections}
          onToggle={toggleSection}
        >
          {[
            { value: 'Popularity', label: 'Popularity' },
            { value: 'Price: Low to High', label: 'Price: Low to High' },
            { value: 'Price: High to Low', label: 'Price: High to Low' },
            { value: 'New Arrivals', label: 'New Arrivals' },
          ].map((opt) => (
            <button
              key={opt.value}
              onClick={() => onSortChange(opt.value)}
              className={`w-full flex items-center justify-between py-1.5 px-2.5 min-h-0 rounded-lg group transition-all duration-200 cursor-pointer ${
                sortBy === opt.value
                  ? 'bg-neutral-100 text-black font-semibold'
                  : 'text-neutral-700 hover:bg-neutral-50'
              }`}
            >
              <span className="font-sans text-[13px]">{opt.label}</span>
              {sortBy === opt.value && (
                <div className="w-4.5 h-4.5 rounded-full bg-[#283618] flex items-center justify-center text-white">
                  <Check size={11} strokeWidth={2.8} />
                </div>
              )}
            </button>
          ))}
        </FilterSection>

        {cumulativeGroups.length > 0
          ? cumulativeGroups.map((group) => {
              // Use cumulative options to prevent items from disappearing when their count drops to 0
              const cumulativeGroupOptions = cumulativeOptions[group.id]
                ? Array.from(cumulativeOptions[group.id].values())
                : [];

              const selectedValues = currentFilters[group.id] || [];

              const finalOptionsMap = new Map();
              cumulativeGroupOptions.forEach((opt) => finalOptionsMap.set(opt.value, opt));

              selectedValues.forEach((val) => {
                if (!finalOptionsMap.has(val)) {
                  finalOptionsMap.set(val, { value: val, label: val, count: 0 }); // Retain selected
                }
              });

              const finalOptions = Array.from(finalOptionsMap.values());

              if (group.id === 'priceRange') {
                const productPrices = (products || [])
                  .map((p) => p.price)
                  .filter((p) => typeof p === 'number' && !isNaN(p));
                const fallbackMin =
                  productPrices.length > 0 ? Math.floor(Math.min(...productPrices) / 25) * 25 : 0;
                const fallbackMax =
                  productPrices.length > 0 ? Math.ceil(Math.max(...productPrices) / 25) * 25 : 1000;

                let minPossible = typeof group.min === 'number' ? group.min : fallbackMin;
                let maxPossible = typeof group.max === 'number' ? group.max : fallbackMax;

                if (typeof group.min !== 'number' && finalOptions.length > 0) {
                  finalOptions.forEach((opt) => {
                    const parts = opt.value.split('-');
                    if (parts[0] && !isNaN(Number(parts[0]))) {
                      minPossible = Math.min(minPossible, Number(parts[0]));
                    }
                    if (parts[1] && !isNaN(Number(parts[1]))) {
                      maxPossible = Math.max(maxPossible, Number(parts[1]));
                    }
                  });
                }

                const selectedValues = currentFilters[group.id] || [];
                let currentMin = minPossible;
                let currentMax = maxPossible;

                if (selectedValues.length > 0) {
                  const parts = String(selectedValues[0]).split('-');
                  if (parts[0] !== undefined && parts[0] !== '' && !isNaN(Number(parts[0]))) {
                    currentMin = Number(parts[0]);
                  }
                  if (parts[1] !== undefined && parts[1] !== '' && !isNaN(Number(parts[1]))) {
                    currentMax = Number(parts[1]);
                  }
                }

                return (
                  <FilterSection
                    key={group.id}
                    title={group.label || 'Price Range'}
                    id={group.id}
                    activeSections={activeSections}
                    onToggle={toggleSection}
                  >
                    <PriceRangeSlider
                      minPossible={minPossible}
                      maxPossible={maxPossible}
                      initialMin={currentMin}
                      initialMax={currentMax}
                      group={group}
                      onSetFilterValue={onSetFilterValue}
                    />
                  </FilterSection>
                );
              }

              return (
                <FilterSection
                  key={group.id}
                  title={group.label}
                  id={group.id}
                  activeSections={activeSections}
                  onToggle={toggleSection}
                >
                  {finalOptions.map((opt) => (
                    <div key={opt.value}>
                      {renderCheckbox(group.id, opt.value, opt.count > 0 ? opt.count : null)}
                      {opt.children && opt.children.length > 0 && (
                        <div className="mt-0.5 mb-1.5">
                          {opt.children.map((child) =>
                            renderCheckbox(
                              group.id,
                              child.value,
                              child.count > 0 ? child.count : null,
                              true,
                            ),
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </FilterSection>
              );
            })
          : null}
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Bottom Sheet Implementation */}
      {mounted &&
        createPortal(
          <AnimatePresence>
            {isOpen && (
              <div className="fixed inset-0 z-[1000] lg:hidden pointer-events-none">
                {/* Backdrop */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={onClose}
                  className="fixed inset-0 bg-black/40 backdrop-blur-xs pointer-events-auto"
                />

                {/* Bottom Sheet Floating Shell */}
                <motion.div
                  initial={{ y: '100%', opacity: 0.5 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: '100%', opacity: 0 }}
                  transition={sheetTransition}
                  {...dragProps}
                  className="fixed bottom-3 left-3 right-3 sm:bottom-4 sm:left-4 sm:right-4 z-10 pointer-events-auto flex flex-col max-w-[480px] mx-auto"
                  style={{
                    marginBottom: 'env(safe-area-inset-bottom, 0px)',
                  }}
                >
                  <div className="relative w-full bg-white/95 backdrop-blur-2xl rounded-3xl p-4 sm:p-5 shadow-[0_12px_45px_rgba(0,0,0,0.18)] flex flex-col max-h-[85dvh] overflow-hidden border border-black/[0.08]">
                    {/* Handlebar for bottom sheet feel */}
                    <DrawerDragHandle
                      onClick={onClose}
                      pillClassName="bg-neutral-300 w-10 h-1 mb-1"
                    />

                    <button
                      onClick={onClose}
                      className="absolute top-3.5 right-3.5 w-8.5 h-8.5 rounded-full bg-neutral-100 hover:bg-neutral-200 active:scale-95 flex items-center justify-center text-neutral-700 hover:text-black transition-all z-10 cursor-pointer"
                      aria-label="Close filters"
                    >
                      <X className="w-4 h-4 text-black" strokeWidth={2.2} />
                    </button>

                    <div className="flex-1 overflow-y-auto overscroll-contain touch-pan-y no-scrollbar pt-1">
                      {panelContent}
                    </div>

                    {/* Bottom Action Bar */}
                    <div className="mt-2.5 pt-2.5 border-t border-black/[0.06]">
                      <button
                        onClick={onClose}
                        className="w-full bg-[#283618] hover:bg-[#1f2b13] text-white py-3 rounded-full font-sans text-[12px] sm:text-[13px] uppercase tracking-wider font-bold shadow-sm transition-all active:scale-[0.98] cursor-pointer"
                      >
                        Apply Filters
                      </button>
                    </div>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>,
          document.body,
        )}

      {/* Desktop Sidebar */}
      <div className={`hidden lg:flex flex-col relative w-full ${className}`}>{panelContent}</div>
    </>
  );
}
