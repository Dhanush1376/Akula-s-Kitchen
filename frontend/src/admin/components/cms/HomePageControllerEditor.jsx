import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { AdminField, AdminInput, AdminToggle } from '../AdminUIKit';
import { useAdmin } from '../../context/AdminContext';
import { useActiveCategories } from '../../../hooks/useProductQueries';

export function HomePageControllerEditor({ content, onUpdate }) {
  const [activeTab, setActiveTab] = useState('hero');
  const { products, _productsError } = useAdmin();
  const { data: dbCategories = [] } = useActiveCategories();

  const uniqueCategories = React.useMemo(() => {
    const activeFromDb = Array.isArray(dbCategories)
      ? dbCategories.map((c) => c?.name).filter(Boolean)
      : [];
    const fromProducts = Array.isArray(products)
      ? products.map((p) => p?.category).filter(Boolean)
      : [];
    return Array.from(new Set([...activeFromDb, ...fromProducts]));
  }, [dbCategories, products]);

  const updateSectionState = (sectionId, field, value) => {
    if (typeof field === 'object' && field !== null && value === undefined) {
      const updated = { ...(content[sectionId] || {}), ...field };
      onUpdate(sectionId, updated);
      if (sectionId === 'hero') {
        // Only sync calendar scheduling properties (weeklySchedule, productIds, cutoffTime)
        // NEVER overwrite menuPage's own title or copy!
        const schedulePatch = {};
        if (field.weeklySchedule !== undefined) schedulePatch.weeklySchedule = field.weeklySchedule;
        if (field.productIds !== undefined) schedulePatch.productIds = field.productIds;
        if (field.cutoffTime !== undefined) schedulePatch.cutoffTime = field.cutoffTime;
        if (Object.keys(schedulePatch).length > 0) {
          onUpdate('menuPage', { ...(content.menuPage || {}), ...schedulePatch });
        }
      }
    } else {
      const updated = { ...(content[sectionId] || {}), [field]: value };
      onUpdate(sectionId, updated);
      if (sectionId === 'hero' && ['weeklySchedule', 'productIds', 'cutoffTime'].includes(field)) {
        onUpdate('menuPage', { ...(content.menuPage || {}), [field]: value });
      }
    }
  };

  const renderProductSelector = (sectionId, defaultTitle = '', placeholder = '') => {
    const isAutoMode = content[sectionId]?.useAutoFeed !== false; // defaults to true
    const titleVal =
      content[sectionId]?.sectionTitle !== undefined
        ? content[sectionId]?.sectionTitle
        : defaultTitle;

    return (
      <div className="space-y-6">
        {/* Header Controls: Section Title and Product Feed Toggle side-by-side */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 items-end max-w-2xl">
          <AdminField label="Section Title">
            <AdminInput
              placeholder={placeholder || defaultTitle}
              value={titleVal || ''}
              onChange={(e) => updateSectionState(sectionId, 'sectionTitle', e.target.value)}
            />
          </AdminField>

          <AdminField label="Product Feed">
            <div className="flex items-center justify-between gap-3 px-3.5 bg-[var(--admin-surface-muted)] border border-[var(--admin-border)] rounded-[var(--admin-radius-lg)] min-h-[38px]">
              <span className="text-[12.5px] font-semibold text-[var(--admin-text-primary)]">
                Auto-Generated
              </span>
              <AdminToggle
                checked={isAutoMode}
                onChange={() => updateSectionState(sectionId, 'useAutoFeed', !isAutoMode)}
              />
            </div>
          </AdminField>
        </div>

        {/* Product Selection Area */}
        <div className="pt-2 border-t border-[var(--admin-border-subtle)] space-y-3">
          <div className="flex items-center justify-between gap-2 px-3 py-2 bg-[var(--admin-surface-muted)] rounded-[4px] border border-[var(--admin-border-subtle)]">
            <div className="flex items-center gap-2">
              <span className="text-[13px] font-bold text-[var(--admin-text-primary)]">
                {isAutoMode ? 'Auto-Generated Feed' : 'Manual Product Selection'}
              </span>
              <span className="text-[11px] font-semibold text-[var(--admin-text-secondary)] bg-[var(--admin-surface)] border border-[var(--admin-border)] px-1.5 py-0.5 rounded-[3px]">
                {isAutoMode
                  ? 'Dynamic'
                  : `${(content[sectionId]?.productIds || []).length} selected`}
              </span>
            </div>
            {isAutoMode && (
              <span className="text-[11.5px] text-[var(--admin-text-tertiary)] italic">
                Turn off Auto-Generated to manually pick items
              </span>
            )}
          </div>

          <div
            className={`grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-h-[400px] overflow-y-auto p-1 pr-2 scrollbar-thin transition-all duration-300 ${isAutoMode ? 'opacity-50 pointer-events-none grayscale-[50%]' : 'opacity-100'}`}
          >
            {!products || products.length === 0 ? (
              <div className="col-span-full p-4 text-center text-[var(--admin-text-secondary)] text-[12px] bg-[var(--admin-surface-muted)] rounded-md border border-[var(--admin-border)]">
                Loading products...
              </div>
            ) : (
              products.map((p) => {
                const pId = p._id || p.id;
                const isSelected = (content[sectionId]?.productIds || []).includes(pId);
                return (
                  <div
                    key={pId}
                    onClick={() => {
                      const currentIds = content[sectionId]?.productIds || [];
                      let newIds;
                      if (isSelected) {
                        newIds = currentIds.filter((id) => id !== pId);
                      } else {
                        newIds = [...currentIds, pId];
                      }
                      updateSectionState(sectionId, 'productIds', newIds);
                    }}
                    className={`relative p-3 rounded-md border cursor-pointer transition-all duration-300 flex flex-col gap-3 group ${
                      isSelected
                        ? 'bg-[var(--admin-surface)] border-[var(--admin-accent)] ring-1 ring-[var(--admin-accent)] shadow-[var(--admin-shadow-sm)]'
                        : 'bg-[var(--admin-surface)] border-[var(--admin-border)] opacity-70 hover:opacity-100 hover:border-[var(--admin-accent)]/50 shadow-[var(--admin-shadow-xs)]'
                    }`}
                  >
                    <div
                      className={`absolute top-2 right-2 w-6 h-6 rounded-sm flex items-center justify-center z-10 transition-colors ${
                        isSelected
                          ? 'bg-[var(--admin-accent)] text-[var(--admin-text-inverse)]'
                          : 'bg-[var(--admin-surface-muted)] border border-[var(--admin-border-strong)] text-transparent group-hover:border-[var(--admin-accent)]/50'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[14px] font-bold">check</span>
                    </div>
                    <img
                      src={p.imageSrc || p.image || p.thumbnail}
                      alt={p.name || p.title}
                      className="w-full aspect-[3/4] object-cover rounded shadow-inner border border-[var(--admin-border-subtle)]"
                    />
                    <div className="space-y-1">
                      <span className="text-[11px] font-bold text-[var(--admin-text-primary)] block line-clamp-1">
                        {p.name || p.title}
                      </span>
                      <span className="text-[10px] font-semibold text-[var(--admin-accent)] uppercase tracking-wider block">
                        {p.category}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    );
  };

  // Master Layout array
  const defaultSections = [
    { id: 'hero_1', isVisible: true },
    { id: 'categoryGrid_1', isVisible: true },
    { id: 'trendingProducts_1', isVisible: true },
    { id: 'featuredProducts_1', isVisible: true },
    { id: 'recommendedProducts_1', isVisible: true },
  ];

  const homepageSections = content.homepageSections || defaultSections;

  const HOMEPAGE_TABS = [
    {
      id: 'hero',
      label: "Today's Kitchen",
      subtitle: 'Daily rotating menu & specials',
      icon: 'soup_kitchen',
    },
    {
      id: 'categories',
      label: 'Categories',
      subtitle: 'Storefront category grid & cover photos',
      icon: 'grid_view',
    },
    {
      id: 'trending',
      label: 'Trending',
      subtitle: 'Popular and high-velocity dishes feed',
      icon: 'trending_up',
    },
    {
      id: 'featured',
      label: 'Featured',
      subtitle: 'Chef-curated signature specials',
      icon: 'star',
    },
    {
      id: 'recommended',
      label: 'Recommended',
      subtitle: 'Tailored customer picks and recommendations',
      icon: 'recommend',
    },
  ];

  const currentTab = HOMEPAGE_TABS.find((t) => t.id === activeTab) || HOMEPAGE_TABS[0];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6 items-start">
      {/* Left Navigation Side Panel */}
      <div className="bg-[var(--admin-surface)] rounded-[4px] border border-[var(--admin-border)] shadow-xs overflow-hidden h-fit lg:sticky lg:top-24">
        {/* Card Header */}
        <div className="px-3.5 py-3 border-b border-[var(--admin-border-subtle)] bg-[var(--admin-bg-subtle)] flex items-center justify-between">
          <h3 className="text-[13px] font-bold text-[var(--admin-text-primary)] flex items-center gap-2">
            <span className="material-symbols-outlined text-[17px] text-[var(--admin-accent)]">
              view_quilt
            </span>
            Sections Menu
          </h3>
          <span className="text-[10px] bg-[var(--admin-surface)] text-[var(--admin-text-secondary)] px-2 py-0.5 rounded-[4px] font-bold border border-[var(--admin-border)] shadow-2xs">
            {HOMEPAGE_TABS.length}
          </span>
        </div>

        {/* Desktop Navigation (Compact Segmented List) */}
        <div className="hidden lg:block p-2 space-y-0.5">
          {HOMEPAGE_TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-[4px] text-left cursor-pointer transition-all box-border ${
                  isActive
                    ? 'bg-[var(--admin-accent)]/10 text-[var(--admin-accent)] font-bold border-l-2 border-[var(--admin-accent)] shadow-2xs'
                    : 'text-[var(--admin-text-secondary)] hover:bg-[var(--admin-surface-muted)] hover:text-[var(--admin-text-primary)] font-medium'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className={`material-symbols-outlined text-[18px] shrink-0 ${
                      isActive ? 'text-[var(--admin-accent)]' : 'text-[var(--admin-text-tertiary)]'
                    }`}
                  >
                    {tab.icon}
                  </span>
                  <span className="text-[12.5px] truncate">{tab.label}</span>
                </div>
                {isActive && (
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--admin-accent)] shrink-0" />
                )}
              </button>
            );
          })}
        </div>

        {/* Mobile Navigation (Horizontal Scrollable Strip) */}
        <div className="lg:hidden p-2 flex items-center gap-1.5 overflow-x-auto overscroll-x-contain touch-pan-x [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {HOMEPAGE_TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`h-[34px] px-3 rounded-[4px] text-[12px] font-medium flex items-center gap-1.5 whitespace-nowrap cursor-pointer transition-all shrink-0 ${
                  isActive
                    ? 'bg-[var(--admin-accent)] text-white shadow-xs font-semibold'
                    : 'bg-[var(--admin-surface-muted)] text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)]'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Right Content Editor Card */}
      <div className="admin-card p-4 sm:p-6 space-y-5 rounded-[4px] border border-[var(--admin-border)] shadow-xs">
        {/* Active Section Header */}
        <div className="flex items-center justify-between gap-2.5 pb-3 sm:pb-4 border-b border-[var(--admin-border-subtle)]">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-[4px] bg-[var(--admin-accent)]/10 text-[var(--admin-accent)] flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[18px] sm:text-[20px]">
                {currentTab?.icon || 'tune'}
              </span>
            </div>
            <div className="min-w-0">
              <h2 className="text-[15px] sm:text-[16px] font-semibold text-[var(--admin-text-primary)] leading-snug truncate">
                {currentTab?.label}
              </h2>
              <p className="text-[11.5px] text-[var(--admin-text-secondary)] truncate">
                {currentTab?.subtitle}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 shrink-0">
            <span className="inline-flex items-center gap-1.5 text-[11.5px] sm:text-[12px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-[4px] shrink-0 whitespace-nowrap">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span className="sm:hidden">Live</span>
              <span className="hidden sm:inline">Section Live</span>
            </span>
            <a
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11.5px] font-bold text-[var(--admin-accent)] hover:underline inline-flex items-center gap-1 shrink-0"
            >
              <span>View Live</span>
              <span className="material-symbols-outlined text-[14px]">open_in_new</span>
            </a>
          </div>
        </div>

        {/* Today's Kitchen Tab */}
        {activeTab === 'hero' && (
          <div className="space-y-6">
            {/* Header Controls: Section Title, 'See All' Text, and Align with Menu Toggle side-by-side */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 items-end">
              <AdminField label="Section Title">
                <AdminInput
                  placeholder="Today's Kitchen"
                  value={
                    content.hero?.title !== undefined && content.hero?.title !== ''
                      ? content.hero.title
                      : "Today's Kitchen"
                  }
                  onChange={(e) => updateSectionState('hero', 'title', e.target.value)}
                />
              </AdminField>

              <AdminField label="'See All' Button Text">
                <AdminInput
                  placeholder="See all"
                  value={
                    content.hero?.seeAllText !== undefined && content.hero?.seeAllText !== ''
                      ? content.hero.seeAllText
                      : 'See all'
                  }
                  onChange={(e) => updateSectionState('hero', 'seeAllText', e.target.value)}
                />
              </AdminField>

              <AdminField label="Daily Rotating Menu">
                <div className="flex items-center justify-between gap-3 px-3.5 bg-[var(--admin-surface-muted)] border border-[var(--admin-border)] rounded-[var(--admin-radius-lg)] min-h-[38px]">
                  <span className="text-[12px] font-semibold text-[var(--admin-text-primary)] truncate">
                    Align with Daily Menu
                  </span>
                  <AdminToggle
                    checked={content.hero?.useDailyMenuSchedule !== false}
                    onChange={() =>
                      updateSectionState(
                        'hero',
                        'useDailyMenuSchedule',
                        !(content.hero?.useDailyMenuSchedule !== false),
                      )
                    }
                  />
                </div>
              </AdminField>
            </div>

            {/* Conditional View: Top-only compact status with 'Go to Menu Page' button OR Manual Fixed Dish Selector */}
            {content.hero?.useDailyMenuSchedule !== false ? (
              <div className="pt-3 border-t border-[var(--admin-border-subtle)]">
                <div className="p-4 sm:p-5 rounded-[8px] bg-[var(--admin-surface-muted)] border border-[var(--admin-border)] flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5 text-left">
                    <div className="w-10 h-10 rounded-full bg-[var(--admin-accent)]/10 text-[var(--admin-accent)] flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-[22px]">restaurant_menu</span>
                    </div>
                    <div>
                      <h4 className="text-[13.5px] font-bold text-[var(--admin-text-primary)]">
                        Synchronized with Daily Rotating Menu
                      </h4>
                      <p className="text-[12px] text-[var(--admin-text-secondary)] mt-0.5 leading-relaxed">
                        Today's Kitchen dishes are automatically updated based on the weekly menu
                        schedule.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 flex-wrap">
                    <a
                      href="/menu"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="h-[38px] px-3.5 rounded-[6px] border border-[var(--admin-border)] hover:bg-[var(--admin-surface)] text-[var(--admin-text-primary)] text-[12px] font-bold inline-flex items-center justify-center gap-1.5 transition-all"
                    >
                      <span>View Storefront</span>
                      <span className="material-symbols-outlined text-[15px]">open_in_new</span>
                    </a>
                    <Link
                      to="/admin/homepage?section=menu-page"
                      className="h-[38px] px-4 rounded-[6px] bg-[var(--admin-accent)] hover:opacity-95 text-white text-[12.5px] font-bold inline-flex items-center justify-center gap-1.5 shadow-xs cursor-pointer transition-all active:scale-95 whitespace-nowrap"
                    >
                      <span className="material-symbols-outlined text-[16px]">edit_calendar</span>
                      <span>Edit Menu Schedule</span>
                    </Link>
                  </div>
                </div>
              </div>
            ) : (
              <div className="pt-2 border-t border-[var(--admin-border-subtle)] space-y-3">
                <div className="flex items-center justify-between gap-2 px-3 py-2 bg-[var(--admin-surface-muted)] rounded-[4px] border border-[var(--admin-border-subtle)]">
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-bold text-[var(--admin-text-primary)]">
                      Featured Homepage Dishes
                    </span>
                    <span className="text-[11px] font-semibold text-[var(--admin-text-secondary)] bg-[var(--admin-surface)] border border-[var(--admin-border)] px-1.5 py-0.5 rounded-[3px]">
                      {(content.hero?.productIds || []).length} selected
                    </span>
                  </div>
                  {(content.hero?.productIds || []).length > 0 && (
                    <button
                      type="button"
                      onClick={() => updateSectionState('hero', 'productIds', [])}
                      className="text-[11px] font-medium text-rose-600 hover:underline cursor-pointer"
                    >
                      Clear all
                    </button>
                  )}
                </div>

                {/* Manual Dish Cards Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5 sm:gap-3 max-h-[460px] overflow-y-auto p-1 pr-1.5 scrollbar-thin">
                  {!products || products.length === 0 ? (
                    <div className="col-span-full p-8 text-center text-[var(--admin-text-secondary)] text-[12px] bg-[var(--admin-surface-muted)] rounded-[4px] border border-[var(--admin-border)]">
                      No dishes found in product catalog.
                    </div>
                  ) : (
                    products.map((p) => {
                      const pId = p.id || p._id;
                      const isSelected = (content.hero?.productIds || []).includes(pId);
                      const pImg =
                        p.image ||
                        p.imageSrc ||
                        (Array.isArray(p.images) ? p.images[0]?.url || p.images[0] : null);

                      return (
                        <div
                          key={pId}
                          onClick={() => {
                            const currentIds = content.hero?.productIds || [];
                            const newIds = isSelected
                              ? currentIds.filter((id) => id !== pId)
                              : [...currentIds, pId];
                            updateSectionState('hero', 'productIds', newIds);
                          }}
                          className={`relative rounded-[6px] border p-2 cursor-pointer transition-all duration-150 flex flex-col gap-1.5 select-none group ${
                            isSelected
                              ? 'bg-white dark:bg-stone-800 border-[var(--admin-accent)] ring-2 ring-[var(--admin-accent)]/30 shadow-xs'
                              : 'bg-[var(--admin-surface-muted)] border-[var(--admin-border)] opacity-65 hover:opacity-100 hover:border-[var(--admin-accent)]/50'
                          }`}
                        >
                          <div className="aspect-square w-full rounded-[4px] overflow-hidden bg-black/5 relative">
                            {pImg ? (
                              <img
                                src={pImg}
                                alt={p.name || p.title}
                                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                loading="lazy"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-[var(--admin-text-tertiary)]">
                                <span className="material-symbols-outlined text-[24px]">
                                  restaurant
                                </span>
                              </div>
                            )}

                            <div className="absolute top-1 right-1">
                              {isSelected ? (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-[3px] bg-[var(--admin-accent)] text-white text-[9.5px] font-bold shadow-xs">
                                  <span className="material-symbols-outlined text-[12px]">
                                    check
                                  </span>
                                  <span>ON</span>
                                </span>
                              ) : (
                                <span className="w-5 h-5 rounded-full bg-black/40 text-white/80 group-hover:bg-[var(--admin-accent)] group-hover:text-white flex items-center justify-center text-[11px] font-bold transition-colors">
                                  +
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="min-w-0">
                            <span className="text-[11.5px] font-bold text-[var(--admin-text-primary)] block truncate">
                              {p.name || p.title}
                            </span>
                            <div className="flex items-center justify-between text-[10px] mt-0.5">
                              <span className="text-[var(--admin-text-tertiary)] font-medium truncate">
                                {p.category || 'Dishes'}
                              </span>
                              {p.price && (
                                <span className="font-bold text-[var(--admin-text-primary)]">
                                  ₹{p.price}
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
            )}
          </div>
        )}

        {activeTab === 'categories' && (
          <div className="space-y-6">
            <div className="max-w-md">
              <AdminField label="Section Title">
                <AdminInput
                  value={content.categoryGrid?.sectionTitle || ''}
                  onChange={(e) =>
                    updateSectionState('categoryGrid', 'sectionTitle', e.target.value)
                  }
                />
              </AdminField>
            </div>

            <div className="pt-4 border-t border-[var(--admin-border-subtle)] space-y-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[14px] sm:text-[15px] font-semibold text-[var(--admin-text-primary)] tracking-tight">
                  Select Store Categories to Feature
                </span>
                <span className="text-[11px] font-semibold text-[var(--admin-text-secondary)] bg-[var(--admin-surface-muted)] border border-[var(--admin-border)] px-2 py-0.5 rounded-[4px]">
                  {(content.categoryGrid?.categories || []).length} selected
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-2.5">
                {uniqueCategories.map((categoryName) => {
                  const isSelected = (content.categoryGrid?.categories || []).some(
                    (c) => c.title === categoryName,
                  );
                  return (
                    <button
                      key={categoryName}
                      type="button"
                      onClick={() => {
                        const ObjectCopy = { ...content.categoryGrid };
                        const cats = [...(ObjectCopy.categories || [])];
                        const existingIdx = cats.findIndex((c) => c.title === categoryName);

                        if (existingIdx >= 0) {
                          cats.splice(existingIdx, 1);
                        } else {
                          cats.push({
                            title: categoryName,
                            link: `/shop?category=${encodeURIComponent(categoryName)}`,
                            image: '',
                          });
                        }
                        updateSectionState('categoryGrid', 'categories', cats);
                      }}
                      className={`h-[38px] px-2.5 sm:px-3 rounded-[4px] text-[12px] sm:text-[12.5px] font-bold flex items-center justify-center gap-1.5 transition-all min-w-0 cursor-pointer select-none active:scale-[0.98] ${
                        isSelected
                          ? 'bg-[var(--admin-accent)] text-[var(--admin-text-inverse)] shadow-xs'
                          : 'bg-[var(--admin-surface-muted)] text-[var(--admin-text-secondary)] hover:bg-[var(--admin-border)]'
                      }`}
                    >
                      <span className="truncate">{categoryName}</span>
                      {isSelected && (
                        <span className="material-symbols-outlined text-[15px] font-bold shrink-0">
                          check
                        </span>
                      )}
                    </button>
                  );
                })}
                {uniqueCategories.length === 0 && (
                  <div className="col-span-full text-[12px] text-[var(--admin-text-tertiary)] italic text-center py-2">
                    No categories found in product catalog.
                  </div>
                )}
              </div>
            </div>

            {content.categoryGrid?.categories?.length > 0 && (
              <div className="pt-6 border-t border-[var(--admin-border-subtle)] space-y-6">
                <span className="text-[14px] sm:text-[15px] font-semibold text-[var(--admin-text-primary)] tracking-tight block mb-4 pb-2">
                  Configure Cover Photos
                </span>

                {(content.categoryGrid?.categories || []).map((cat, idx) => {
                  const categoryProducts =
                    products?.filter((p) => {
                      const pCat = (
                        p.category ||
                        p.rawProduct?.primaryCategory?.name ||
                        p.rawProduct?.category ||
                        ''
                      )
                        .toLowerCase()
                        .trim();
                      const catName = (cat.title || cat.name || '').toLowerCase().trim();
                      return pCat === catName || pCat.includes(catName) || catName.includes(pCat);
                    }) || [];

                  return (
                    <div
                      key={`cat-config-${idx}`}
                      className="p-5 bg-[var(--admin-surface-muted)] rounded-md border border-[var(--admin-border)] shadow-sm space-y-4"
                    >
                      <div className="flex items-center justify-between mb-4 pb-4 border-b border-[var(--admin-border-subtle)]">
                        <div className="flex items-center gap-4 w-full pr-4">
                          {cat.image ? (
                            <div className="w-12 h-12 rounded-md overflow-hidden border-2 border-[var(--admin-border)] shadow-sm shrink-0">
                              <img
                                src={cat.image}
                                alt={cat.title}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          ) : (
                            <div className="w-12 h-12 rounded-md border-2 border-dashed border-[var(--admin-border-strong)] flex items-center justify-center shrink-0 bg-[var(--admin-surface)]">
                              <span className="material-symbols-outlined text-[var(--admin-text-tertiary)] text-[20px]">
                                image
                              </span>
                            </div>
                          )}
                          <div className="flex-1">
                            <h3 className="text-[15px] font-bold text-[var(--admin-text-primary)]">
                              {cat.title}
                            </h3>
                            <div className="flex items-center gap-2 mt-1 w-full max-w-md">
                              <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--admin-text-tertiary)] shrink-0">
                                Link:
                              </span>
                              <input
                                type="text"
                                value={cat.link || ''}
                                onChange={(e) => {
                                  const ObjectCopy = { ...content.categoryGrid };
                                  const cats = [...(ObjectCopy.categories || [])];
                                  cats[idx] = { ...cats[idx], link: e.target.value };
                                  updateSectionState('categoryGrid', 'categories', cats);
                                }}
                                className="text-[11px] text-[var(--admin-text-secondary)] bg-transparent border-b border-transparent focus:border-[var(--admin-accent)]/50 outline-none focus:ring-0 p-0 m-0 w-full transition-colors"
                                placeholder={`/shop?category=${encodeURIComponent(cat.title)}`}
                              />
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            const ObjectCopy = { ...content.categoryGrid };
                            const cats = [...(ObjectCopy.categories || [])];
                            cats.splice(idx, 1);
                            updateSectionState('categoryGrid', 'categories', cats);
                          }}
                          className="text-[var(--admin-error)] bg-[var(--admin-error)]/5 hover:bg-[var(--admin-error)]/10 p-2 rounded-md transition-colors border border-[var(--admin-error)]/20 shrink-0"
                          title="Remove Featured Category"
                        >
                          <span className="material-symbols-outlined text-[18px]">delete</span>
                        </button>
                      </div>

                      <div className="pt-2">
                        <span className="text-[10px] font-bold text-[var(--admin-text-tertiary)] uppercase tracking-wider mb-3 block">
                          Select Cover Photo from {cat.title} Products
                        </span>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-h-[300px] overflow-y-auto p-1 pr-2 scrollbar-thin">
                          {categoryProducts.length > 0 ? (
                            categoryProducts.map((product) => {
                              const productImg =
                                product.image ||
                                product.imageSrc ||
                                product.rawProduct?.imageSrc ||
                                '';
                              const isSelected =
                                cat.image === productImg ||
                                Boolean(cat.image && productImg && cat.image === productImg);
                              return (
                                <div
                                  key={product._id || product.id}
                                  onClick={() => {
                                    const ObjectCopy = { ...content.categoryGrid };
                                    const cats = [...(ObjectCopy.categories || [])];
                                    cats[idx] = { ...cats[idx], image: productImg };
                                    updateSectionState('categoryGrid', 'categories', cats);
                                  }}
                                  className={`relative p-3 rounded-md border cursor-pointer transition-all duration-300 flex flex-col gap-3 group ${
                                    isSelected
                                      ? 'bg-[var(--admin-surface)] border-[var(--admin-accent)] ring-1 ring-[var(--admin-accent)] shadow-[var(--admin-shadow-sm)]'
                                      : 'bg-[var(--admin-surface)] border-[var(--admin-border)] opacity-70 hover:opacity-100 hover:border-[var(--admin-accent)]/50 shadow-[var(--admin-shadow-xs)]'
                                  }`}
                                >
                                  <div
                                    className={`absolute top-2 right-2 w-6 h-6 rounded-sm flex items-center justify-center z-10 transition-colors ${
                                      isSelected
                                        ? 'bg-[var(--admin-accent)] text-[var(--admin-text-inverse)]'
                                        : 'bg-[var(--admin-surface-muted)] border border-[var(--admin-border-strong)] text-transparent group-hover:border-[var(--admin-accent)]/50'
                                    }`}
                                  >
                                    <span className="material-symbols-outlined text-[14px] font-bold">
                                      check
                                    </span>
                                  </div>
                                  <img
                                    src={productImg}
                                    alt={product.name || product.title}
                                    className="w-full aspect-square object-cover rounded shadow-inner border border-[var(--admin-border-subtle)]"
                                  />
                                  <div className="space-y-1">
                                    <span className="text-[11px] font-bold text-[var(--admin-text-primary)] block line-clamp-1">
                                      {product.name || product.title}
                                    </span>
                                    <span className="text-[10px] font-semibold text-[var(--admin-accent)] uppercase tracking-wider block line-clamp-1">
                                      {product.category}
                                    </span>
                                  </div>
                                </div>
                              );
                            })
                          ) : (
                            <div className="col-span-full p-4 text-center text-[var(--admin-text-secondary)] text-[12px] bg-[var(--admin-surface-muted)] rounded-md border border-[var(--admin-border)]">
                              No products found in this category.
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'trending' &&
          renderProductSelector('trendingProducts', 'Trending Now', 'Trending Now')}

        {activeTab === 'featured' &&
          renderProductSelector('featuredProducts', 'Featured Products', 'Featured Products')}

        {activeTab === 'recommended' &&
          renderProductSelector(
            'recommendedProducts',
            'Recommended For You',
            'Recommended For You',
          )}
      </div>
    </div>
  );
}
