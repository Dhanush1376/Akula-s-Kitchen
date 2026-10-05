import { Check, X } from 'lucide-react';
import { m as motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useMobileDrawerEngine, DrawerDragHandle } from './drawer';

const FilterSection = ({ title, id, children, activeSections, onToggle }) => (
  <div className="mb-3 border-b border-black/[0.06] pb-3 last:border-0 last:pb-0">
    <button
      onClick={() => onToggle(id)}
      className="w-full flex justify-between items-center py-1.5 text-left font-sans text-[12px] sm:text-[13px] text-neutral-900 hover:text-black transition-colors group min-h-0"
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
          transition={{ duration: 0.3, ease: [0.2, 1, 0.2, 1] }}
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
      className={`flex items-center justify-between cursor-pointer group py-1.5 px-2 hover:bg-neutral-100/70 rounded-xl transition-all duration-200 ${isChild ? 'ml-5 border-l-2 border-neutral-200 pl-2.5' : ''}`}
    >
      <div className="flex items-center gap-2.5">
        <div className="relative flex items-center justify-center">
          <input
            type="checkbox"
            checked={isChecked}
            onChange={() => onToggleFilter(type, label)}
            className="peer appearance-none h-4.5 w-4.5 border border-neutral-300 rounded-md bg-white checked:bg-[#283618] checked:border-[#283618] transition-all cursor-pointer focus:ring-2 focus:ring-[#283618]/20"
          />
          <Check
            className="absolute text-white text-[13px] opacity-0 peer-checked:opacity-100 pointer-events-none transition-opacity font-bold"
            strokeWidth={2.2}
          />
        </div>
        <span
          className={`font-sans text-[13px] transition-colors ${isChecked ? 'text-black font-semibold' : 'text-neutral-700 group-hover:text-black'}`}
        >
          {label}
        </span>
      </div>
      {count !== null && (
        <span className="font-sans text-[10px] text-neutral-500 font-bold bg-neutral-100 px-2 py-0.5 rounded-full">
          {count}
        </span>
      )}
    </label>
  );
};

const PriceRangeSlider = ({ maxPossible, initialMax, group, onSetFilterValue }) => {
  const [localMax, setLocalMax] = useState(initialMax);

  useEffect(() => {
    setLocalMax(initialMax);
  }, [initialMax]);

  const handleCommit = () => {
    if (onSetFilterValue) {
      if (localMax === maxPossible) {
        onSetFilterValue(group.id, []);
      } else {
        onSetFilterValue(group.id, [`0-${localMax}`]);
      }
    }
  };

  return (
    <div className="px-1 pt-3 pb-2">
      <input
        type="range"
        min="0"
        max={maxPossible}
        step="500"
        value={localMax}
        onChange={(e) => setLocalMax(parseInt(e.target.value, 10))}
        onMouseUp={handleCommit}
        onTouchEnd={handleCommit}
        className="w-full h-1 bg-black/10 rounded-lg cursor-pointer accent-primary focus:outline-none"
      />
      <div className="flex items-center justify-between mt-6 px-1">
        <div className="flex flex-col">
          <span className="font-label text-[9px] uppercase tracking-[0.2em] text-black/40 font-bold mb-0.5">
            Minimum
          </span>
          <span className="font-display text-[16px] text-black tracking-tight font-medium">₹0</span>
        </div>
        <div className="flex flex-col items-end">
          <span className="font-label text-[9px] uppercase tracking-[0.2em] text-black/40 font-bold mb-0.5">
            Maximum
          </span>
          <span className="font-display text-[16px] text-black tracking-tight font-medium">
            {localMax === maxPossible ? 'No Limit' : `₹${localMax.toLocaleString()}`}
          </span>
        </div>
      </div>
    </div>
  );
};

export function FilterPanel({
  filterGroups = [],
  currentFilters,
  onToggleFilter,
  onSetFilterValue,
  onClearAll,
  className = '',
  isOpen,
  onClose,
  sortBy,
  onSortChange,
  mobileSubtitle = 'Refine Collection',
}) {
  const [activeSections, setActiveSections] = useState({
    sort: true,
  });

  const [cumulativeOptions, setCumulativeOptions] = useState({});
  const [cumulativeGroups, setCumulativeGroups] = useState([]);

  // Initialize active sections for dynamic filters and build cumulative options
  useEffect(() => {
    if (filterGroups && filterGroups.length > 0) {
      setActiveSections((prev) => {
        const next = { ...prev };
        const isMobile = typeof window !== 'undefined' && window.innerWidth < 1024;
        filterGroups.forEach((group, idx) => {
          if (next[group.id] === undefined) {
            next[group.id] = !isMobile || idx === 0;
          }
        });
        return next;
      });

      setCumulativeGroups((prev) => {
        const next = [...prev];
        filterGroups.forEach((fg) => {
          if (
            !next.find(
              (g) =>
                g.id.toLowerCase() === fg.id.toLowerCase() ||
                g.label.toLowerCase() === fg.label.toLowerCase(),
            )
          ) {
            next.push({ id: fg.id, label: fg.label });
          }
        });
        return next;
      });

      setCumulativeOptions((prev) => {
        const next = { ...prev };
        filterGroups.forEach((group) => {
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
    }
  }, [filterGroups]);

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
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-black/[0.06]">
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

      <div className="flex-1 overflow-y-auto no-scrollbar pr-1">
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
              className={`w-full flex items-center justify-between py-2 px-3 min-h-0 rounded-xl group transition-all duration-200 cursor-pointer ${
                sortBy === opt.value
                  ? 'bg-neutral-100 text-black font-semibold'
                  : 'text-neutral-700 hover:bg-neutral-50'
              }`}
            >
              <span className="font-sans text-[13px]">{opt.label}</span>
              {sortBy === opt.value && (
                <div className="w-5 h-5 rounded-full bg-black flex items-center justify-center text-white">
                  <Check size={12} strokeWidth={2.5} />
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
                let maxPossible = 0;
                finalOptions.forEach((opt) => {
                  const parts = opt.value.split('-');
                  const maxVal = parts[1] ? parseInt(parts[1], 10) : 0;
                  if (maxVal > maxPossible) maxPossible = maxVal;
                });
                if (maxPossible === 0) maxPossible = 100000;

                const selectedValues = currentFilters[group.id] || [];
                let currentMax = maxPossible;
                if (selectedValues.length > 0) {
                  const parts = selectedValues[0].split('-');
                  if (parts[1]) currentMax = parseInt(parts[1], 10);
                }

                return (
                  <FilterSection
                    key={group.id}
                    title={group.label}
                    id={group.id}
                    activeSections={activeSections}
                    onToggle={toggleSection}
                  >
                    <PriceRangeSlider
                      maxPossible={maxPossible}
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
                        <div className="mt-1 mb-2">
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
                  <div className="relative w-full bg-white/95 backdrop-blur-2xl rounded-3xl p-5 shadow-[0_12px_45px_rgba(0,0,0,0.18)] flex flex-col max-h-[82dvh] overflow-hidden border border-black/[0.08]">
                    {/* Handlebar for bottom sheet feel */}
                    <DrawerDragHandle onClick={onClose} pillClassName="bg-neutral-300 w-10 h-1" />

                    <button
                      onClick={onClose}
                      className="absolute top-4 right-4 w-9 h-9 rounded-full bg-neutral-100 hover:bg-neutral-200 active:scale-95 flex items-center justify-center text-neutral-700 hover:text-black transition-all z-10 cursor-pointer"
                      aria-label="Close filters"
                    >
                      <X className="w-4 h-4 text-black" strokeWidth={2} />
                    </button>

                    <div className="flex-1 overflow-y-auto overscroll-contain touch-pan-y no-scrollbar pt-2">
                      {panelContent}
                    </div>

                    {/* Bottom Action Bar */}
                    <div className="mt-3 pt-3 border-t border-black/[0.06]">
                      <button
                        onClick={onClose}
                        className="w-full bg-[#283618] hover:bg-[#1f2b13] text-white py-3.5 rounded-full font-sans text-[12px] uppercase tracking-wider font-bold shadow-sm transition-all active:scale-[0.98] cursor-pointer"
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
