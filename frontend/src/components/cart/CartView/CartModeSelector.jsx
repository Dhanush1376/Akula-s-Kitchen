import { ShoppingCart, Palette } from 'lucide-react';
import React, { useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';

const ALL_TABS = [
  {
    id: 'purchase',
    label: 'Purchase',
    icon: ShoppingCart,
  },
  {
    id: 'custom',
    label: 'Custom',
    icon: Palette,
  },
];

export const CartModeSelector = ({
  activeCartMode,
  setActiveCartMode,
  purchaseCartCount = 0,
  customCartCount = 0,
}) => {
  const counts = useMemo(
    () => ({
      purchase: purchaseCartCount,
      custom: customCartCount,
    }),
    [purchaseCartCount, customCartCount],
  );

  // Filter tabs that actually have items (> 0)
  const visibleTabs = useMemo(() => {
    return ALL_TABS.filter((tab) => (counts[tab.id] || 0) > 0);
  }, [counts]);

  // If user is currently on an inactive tab (or a tab with 0 items), auto-switch to the first active tab
  useEffect(() => {
    if (visibleTabs.length > 0 && !visibleTabs.some((t) => t.id === activeCartMode)) {
      setActiveCartMode(visibleTabs[0].id);
    }
  }, [visibleTabs, activeCartMode, setActiveCartMode]);

  // If there are 0 or only 1 cart types with items, do not show the selector at all!
  // Only show when there are 2 or 3 distinct carts with items.
  if (visibleTabs.length <= 1) {
    return null;
  }

  return (
    <div className="w-full bg-white border-b border-neutral-200 py-2 lg:py-2.5 flex justify-center px-4">
      <div
        className={`w-full ${
          visibleTabs.length === 2 ? 'max-w-xs' : 'max-w-sm'
        } bg-neutral-100/90 border border-neutral-200 p-1 rounded-lg flex gap-1 items-center relative z-0`}
      >
        {visibleTabs.map((tab) => {
          const Icon = tab.icon;
          const count = counts[tab.id] || 0;
          const isActive = activeCartMode === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveCartMode(tab.id)}
              className={`relative flex flex-1 items-center justify-center py-2 min-h-0 rounded-md font-sans text-xs uppercase tracking-wider transition-colors duration-200 cursor-pointer z-10 outline-none ${
                isActive
                  ? 'text-neutral-950 font-bold'
                  : 'text-neutral-500 hover:text-neutral-900 font-medium'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="activeCartTabBg"
                  className="absolute inset-0 bg-white rounded-md shadow-sm border border-neutral-200 -z-10"
                  transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                />
              )}
              {count > 0 && (
                <span
                  className={`absolute -top-1 -right-1 w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center border shadow-xs transition-all z-20 ${
                    isActive
                      ? 'bg-[#f7bb0e] text-neutral-950 border-white'
                      : 'bg-neutral-300 text-neutral-700 border-white'
                  }`}
                >
                  {count}
                </span>
              )}
              <div className="flex items-center gap-1.5">
                <Icon className="w-3.5 h-3.5" strokeWidth={1.75} />
                <span>{tab.label}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
