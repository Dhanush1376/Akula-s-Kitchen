import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { m as motion } from 'framer-motion';
import { ArrowUpRight, Sparkles } from 'lucide-react';
import { PageSEO } from '../../components/seo/PageSEO';
import { useProducts } from '../../hooks/useProductQueries';
import { useWebsiteContent } from '../../hooks/useWebsiteContent';
import { getCategoryRoute, getProductRoute } from '../../utils/ecommerce/productRouteUtils';
import { formatPrice, parseNumericPrice } from '../../utils/ecommerce/priceUtils';
import {
  DAYS_OF_WEEK,
  getEffectiveMenuDay,
  getWeekDates,
} from '../../utils/ecommerce/menuScheduleUtils';
import { prefersReducedMotion, windBreeze, windGust } from '../../components/effects/FallingLeaves';
import '../../styles/policy.css';
import './menu.css';
import { MenuListSkeleton } from '../../components/ui/skeletons/MenuSkeleton';

/**
 * The menu: daily batch specials synchronized with the weekly menu calendar.
 * Features a 7-day calendar navigation strip, artisanal live date stamp,
 * and dotted price leaders.
 */

const categoryOf = (p) => {
  const cat = p.primaryCategory?.name || p.category?.name || p.category;
  return typeof cat === 'string' && cat.trim() ? cat.trim() : 'More from the kitchen';
};

const slugify = (text) =>
  String(text)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

function useMenuLeaf({ initialDelay = 2000, strength = 0.8 } = {}) {
  const leafRef = useRef(null);
  const shadowRef = useRef(null);

  useEffect(() => {
    const breeze = windBreeze(leafRef.current, { strength });
    return () => breeze?.cancel();
  }, [strength]);

  useEffect(() => {
    if (prefersReducedMotion()) return undefined;
    const leaf = leafRef.current;
    let timer;
    let lastY = window.scrollY;
    const onScreen = () => {
      const r = leaf?.getBoundingClientRect();
      return Boolean(r?.width) && r.bottom > 0 && r.top < window.innerHeight;
    };
    const gust = (direction) =>
      onScreen() && windGust(leaf, { direction, strength, shadow: shadowRef.current });
    const schedule = (delay) => {
      timer = window.setTimeout(() => {
        gust(Math.random() < 0.5 ? -1 : 1);
        schedule(9000 + Math.random() * 4000);
      }, delay);
    };
    schedule(initialDelay);
    const onScroll = () => {
      const y = window.scrollY;
      if (Math.abs(y - lastY) < 32) return;
      gust(y > lastY ? 1 : -1);
      lastY = y;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('scroll', onScroll);
    };
  }, [initialDelay, strength]);

  return { leafRef, shadowRef };
}

/** Highlights the category the reader is looking at, for the sidebar. */
function useActiveSection(ids) {
  const [active, setActive] = useState('all');
  useEffect(() => {
    if (!ids.length) return undefined;

    const onScroll = () => {
      if (window.scrollY < 160) {
        setActive('all');
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });

    if (typeof IntersectionObserver === 'undefined') {
      return () => window.removeEventListener('scroll', onScroll);
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (window.scrollY < 160) {
          setActive('all');
          return;
        }
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id.replace(/^menu-/, ''));
      },
      { rootMargin: '-30% 0px -55% 0px' },
    );

    ids.forEach((id) => {
      const el = document.getElementById(`menu-${id}`);
      if (el) observer.observe(el);
    });

    return () => {
      window.removeEventListener('scroll', onScroll);
      observer.disconnect();
    };
  }, [ids]);

  return [active, setActive];
}

const scrollToSection = (id) => {
  if (id === 'all') {
    const topEl = document.getElementById('menu-top');
    if (topEl) {
      topEl.scrollIntoView({
        behavior: prefersReducedMotion() ? 'auto' : 'smooth',
        block: 'start',
      });
    } else {
      window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
    }
    return;
  }
  const el = document.getElementById(`menu-${id}`);
  if (!el) return;
  el.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' });
};

const KNOWN_UNAVAILABLE_IMAGES = new Set([
  'afbfbe1f-2816-4c86-8818-8bd214e4252c-jpg-d037_jnnqa.webp',
  '359c1754-e63a-43ae-bd27-3a0faeea1f1d-jpg-9562_87qw4.webp',
  '9607c278-08c1-4fed-aabb-e68508e92f29-jpg-674a_tig4f.webp',
]);

const getValidOriginalImage = (product) => {
  const src = product?.imageSrc || product?.images?.[0] || product?.image;
  if (!src || typeof src !== 'string') return null;
  const filename = src.split('/').pop()?.split('?')[0];
  if (filename && KNOWN_UNAVAILABLE_IMAGES.has(filename)) return null;
  return src;
};

function MenuRow({ product }) {
  const price = parseNumericPrice(product.price);
  const oldPrice = parseNumericPrice(product.oldPrice);
  const soldOut = product.stock === 0;
  const originalImage = getValidOriginalImage(product);
  const [imgFailed, setImgFailed] = useState(false);

  const showThumb = Boolean(originalImage && !imgFailed);

  return (
    <li>
      <Link
        to={getProductRoute(product)}
        className={`menu-row group${soldOut ? ' menu-row--out' : ''}`}
      >
        <div className="menu-row__inner">
          {showThumb && (
            <div className="menu-row__thumb">
              <img
                src={originalImage}
                alt={product.title || product.name}
                loading="lazy"
                className="menu-row__img"
                onError={() => setImgFailed(true)}
              />
            </div>
          )}
          <div className="menu-row__body">
            <span className="menu-row__line">
              <span className="menu-row__name">{product.title || product.name}</span>
              <span className="menu-row__dots" aria-hidden="true" />
              <span className="menu-row__price">
                {oldPrice > price && <s className="menu-row__was">₹{formatPrice(oldPrice)}</s>}₹
                {formatPrice(price)}
              </span>
            </span>
            {soldOut && (
              <span className="menu-row__meta">
                <span className="menu-row__pack">Sold out today</span>
              </span>
            )}
          </div>
        </div>
      </Link>
    </li>
  );
}

export function Menu() {
  const topLeaf = useMenuLeaf({ initialDelay: 2000, strength: 0.8 });
  const lowerLeaf = useMenuLeaf({ initialDelay: 3500, strength: 0.7 });
  const cms = useWebsiteContent();
  const menuConfig = useMemo(() => {
    const mp = cms?.menuPage || {};
    const hr = cms?.hero || {};
    const hasMpSchedule =
      mp?.weeklySchedule &&
      Object.values(mp.weeklySchedule).some(
        (d) => Array.isArray(d?.productIds) && d.productIds.length > 0,
      );
    const hasHrSchedule =
      hr?.weeklySchedule &&
      Object.values(hr.weeklySchedule).some(
        (d) => Array.isArray(d?.productIds) && d.productIds.length > 0,
      );

    const schedule =
      hasMpSchedule || (Array.isArray(mp?.productIds) && mp.productIds.length > 0)
        ? mp.weeklySchedule || {}
        : hr.weeklySchedule || {};

    const productIds =
      Array.isArray(mp?.productIds) && mp.productIds.length > 0
        ? mp.productIds
        : hr.productIds || [];

    const cutoffTime = mp.cutoffTime || hr.cutoffTime || '18:00';
    const resolvedTitle = mp.title && mp.title !== "Today's Kitchen" ? mp.title : 'Our Menu';
    const resolvedSubtitle = mp.subtitle || 'Fresh today in small batches';

    return {
      ...hr,
      ...mp,
      title: resolvedTitle,
      subtitle: resolvedSubtitle,
      weeklySchedule: schedule,
      productIds,
      cutoffTime,
    };
  }, [cms?.menuPage, cms?.hero]);

  const title = menuConfig.title || 'Our Menu';
  const subtitle = menuConfig.subtitle || 'Fresh today in small batches';

  // Effective rotating menu schedule (handles cutoff time transition)
  const effectiveSchedule = useMemo(() => {
    return getEffectiveMenuDay(menuConfig.cutoffTime || '18:00');
  }, [menuConfig.cutoffTime]);

  // URL search parameter to sync selected day (?day=wednesday)
  const [searchParams, setSearchParams] = useSearchParams();
  const dayParam = searchParams.get('day')?.toLowerCase();

  const selectedDayKey = useMemo(() => {
    if (dayParam && DAYS_OF_WEEK.some((d) => d.key === dayParam)) {
      return dayParam;
    }
    return effectiveSchedule.effectiveDayKey;
  }, [dayParam, effectiveSchedule.effectiveDayKey]);

  const handleSelectDay = (dayKey) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (dayKey === effectiveSchedule.effectiveDayKey) {
          next.delete('day');
        } else {
          next.set('day', dayKey);
        }
        return next;
      },
      { replace: true },
    );
  };

  // 7-day weekly schedule anchored around the active/effective date
  const weekDays = useMemo(() => {
    return getWeekDates(effectiveSchedule.effectiveDate);
  }, [effectiveSchedule.effectiveDate]);

  const selectedDayMeta = useMemo(() => {
    return weekDays.find((d) => d.key === selectedDayKey) || weekDays[0];
  }, [weekDays, selectedDayKey]);

  const isSelectedDayLive = selectedDayKey === effectiveSchedule.effectiveDayKey;

  const { data, isPending, isError, refetch } = useProducts({ limit: 200 });

  const activeProducts = useMemo(() => {
    const raw = data?.data || data?.products || data?.items || (Array.isArray(data) ? data : []);
    return raw.filter((p) => p && p.isActive !== false);
  }, [data]);

  const productsById = useMemo(() => {
    const map = new Map();
    activeProducts.forEach((p) => {
      map.set(String(p._id || p.id), p);
    });
    return map;
  }, [activeProducts]);

  // Scheduled dish count per day for the calendar pills
  const dayDishCounts = useMemo(() => {
    const counts = {};
    DAYS_OF_WEEK.forEach((d) => {
      const dayConfig = menuConfig.weeklySchedule?.[d.key];
      const pids = Array.isArray(dayConfig?.productIds)
        ? dayConfig.productIds
        : Array.isArray(menuConfig.productIds)
          ? menuConfig.productIds
          : [];
      const validCount = pids.filter((id) => productsById.has(String(id))).length;
      counts[d.key] = validCount;
    });
    return counts;
  }, [menuConfig.weeklySchedule, menuConfig.productIds, productsById]);

  // Scheduled product IDs for the currently selected day
  const currentDayProductIds = useMemo(() => {
    const dayConfig = menuConfig.weeklySchedule?.[selectedDayKey];
    if (Array.isArray(dayConfig?.productIds) && dayConfig.productIds.length > 0) {
      return dayConfig.productIds;
    }
    if (Array.isArray(menuConfig.productIds) && menuConfig.productIds.length > 0) {
      return menuConfig.productIds;
    }
    return [];
  }, [menuConfig.weeklySchedule, menuConfig.productIds, selectedDayKey]);

  // Current day's filtered products (strictly synchronized with the menu's calendar)
  const currentDayProducts = useMemo(() => {
    if (currentDayProductIds.length === 0) {
      const hasAnySchedule = Object.values(menuConfig.weeklySchedule || {}).some(
        (day) => Array.isArray(day?.productIds) && day.productIds.length > 0,
      );
      // Fallback only if no calendar items have ever been configured
      if (!hasAnySchedule && (!menuConfig.productIds || menuConfig.productIds.length === 0)) {
        return activeProducts;
      }
      return [];
    }

    // Keep the curated order of dishes set in the calendar
    return currentDayProductIds.map((id) => productsById.get(String(id))).filter(Boolean);
  }, [
    currentDayProductIds,
    productsById,
    menuConfig.weeklySchedule,
    menuConfig.productIds,
    activeProducts,
  ]);

  const sections = useMemo(() => {
    const groups = new Map();
    currentDayProducts.forEach((p) => {
      const name = categoryOf(p);
      if (!groups.has(name)) groups.set(name, []);
      groups.get(name).push(p);
    });

    return [...groups.entries()].map(([name, items]) => ({
      id: slugify(name),
      name,
      items: items.sort((a, b) =>
        String(a.title || a.name).localeCompare(String(b.title || b.name)),
      ),
    }));
  }, [currentDayProducts]);

  const ids = useMemo(() => sections.map((s) => s.id), [sections]);
  const [active, setActive] = useActiveSection(ids);
  const total = sections.reduce((n, s) => n + s.items.length, 0);

  // Reset active section chip when changing calendar days
  useEffect(() => {
    setActive('all');
  }, [selectedDayKey, setActive]);

  const dateInfo = useMemo(() => {
    if (selectedDayMeta?.date) {
      const d = selectedDayMeta.date;
      return {
        day: d.getDate(),
        month: d.toLocaleDateString('en-IN', { month: 'short' }).toUpperCase(),
        weekday: d.toLocaleDateString('en-IN', { weekday: 'short' }),
        year: d.getFullYear(),
        badgeLabel: isSelectedDayLive
          ? effectiveSchedule.isTomorrow
            ? 'Tomorrow'
            : 'Today'
          : selectedDayMeta.label,
      };
    }
    const now = new Date();
    return {
      day: now.getDate(),
      month: now.toLocaleDateString('en-IN', { month: 'short' }).toUpperCase(),
      weekday: now.toLocaleDateString('en-IN', { weekday: 'short' }),
      year: now.getFullYear(),
      badgeLabel: 'Today',
    };
  }, [selectedDayMeta, isSelectedDayLive, effectiveSchedule.isTomorrow]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.35 }}
      className="policy-page menu-page pt-44 sm:pt-48 lg:pt-52 pb-[calc(var(--bottom-nav-height,65px)+3.5rem)] lg:pb-24 selection:bg-[#f7bb0e]/30 selection:text-[#283618]"
    >
      <PageSEO
        fallback={{
          title: `${title} (${selectedDayMeta?.label || 'Today'}): Batters, Pickles, Podis`,
          description: `${subtitle}. Fresh today in small batches. See our daily rotating menu.`,
          canonicalUrl: `/menu${selectedDayKey !== effectiveSchedule.effectiveDayKey ? `?day=${selectedDayKey}` : ''}`,
        }}
      />

      <div className="policy-hero-glow" aria-hidden="true" />

      {/* Top Banana Leaf */}
      <div className="policy-hero-leaf" aria-hidden="true">
        <div className="policy-hero-leaf__frame">
          <div ref={topLeaf.leafRef} className="policy-hero-leaf__sway">
            <img
              ref={topLeaf.shadowRef}
              src="/account/corner-leaf-right.webp"
              alt=""
              className="policy-hero-leaf__shadow"
              draggable="false"
              decoding="async"
            />
            <img
              src="/account/corner-leaf-right.webp"
              alt=""
              className="policy-hero-leaf__img"
              draggable="false"
              decoding="async"
            />
          </div>
        </div>
      </div>

      {/* Bottom-Left Banana Leaf */}
      <div className="menu-leaf-bottom-left" aria-hidden="true">
        <div className="menu-leaf-bottom-left__frame">
          <div ref={lowerLeaf.leafRef} className="menu-leaf-bottom-left__sway">
            <img
              ref={lowerLeaf.shadowRef}
              src="/account/corner-leaf-left.webp"
              alt=""
              className="menu-leaf-bottom-left__shadow"
              draggable="false"
              decoding="async"
            />
            <img
              src="/account/corner-leaf-left.webp"
              alt=""
              className="menu-leaf-bottom-left__img"
              draggable="false"
              decoding="async"
            />
          </div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-12 relative z-10">
        <header
          id="menu-top"
          className="mb-6 lg:mb-8 pt-2 sm:pt-4 pb-4 sm:pb-6 border-b border-[#283618]/12"
        >
          <div className="flex items-start justify-between gap-3 sm:gap-4">
            <div className="min-w-0 flex-1">
              <nav
                aria-label="Breadcrumb"
                className="text-[7.5px] sm:text-[8px] uppercase font-medium tracking-[0.14em] text-[#283618]/50 mb-2 flex items-center gap-1.5 select-none"
              >
                <Link to="/" className="hover:text-[#283618] transition-colors">
                  Home
                </Link>
                <span className="w-0.5 h-0.5 rounded-full bg-[#283618]/30" />
                <span className="text-[#283618]/70 font-semibold">Menu</span>
              </nav>

              <h1 className="text-[28px] sm:text-4xl lg:text-5xl font-extrabold font-display text-[#283618] tracking-tight leading-tight">
                {title}
              </h1>
              {subtitle && (
                <p className="text-xs sm:text-sm text-[#4b5563] mt-1.5 max-w-xl font-normal leading-relaxed">
                  {subtitle}
                </p>
              )}
            </div>

            {/* Artisanal Live Date Stamp */}
            <div className="flex items-center gap-2.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-2xl bg-[#fdfbf7]/90 border border-[#283618]/15 shadow-[0_2px_10px_rgba(40,54,24,0.06)] shrink-0 self-start mt-0.5 backdrop-blur-md select-none group">
              <div className="flex flex-col items-center justify-center w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-[#283618] text-white shrink-0 shadow-xs transition-transform duration-200 group-hover:scale-105">
                <span className="text-[8px] sm:text-[8.5px] font-sans font-extrabold uppercase tracking-widest text-[#f7bb0e] leading-none pt-0.5">
                  {dateInfo.month}
                </span>
                <span className="font-display font-extrabold text-[16px] sm:text-[17px] leading-tight text-white">
                  {dateInfo.day}
                </span>
              </div>
              <div className="text-left pr-0.5">
                <span className="flex items-center gap-1.5 text-[8.5px] sm:text-[9px] font-sans font-extrabold uppercase tracking-[0.14em] text-[#c89611]">
                  {isSelectedDayLive && (
                    <span className="w-1.5 h-1.5 rounded-full bg-[#f7bb0e] shrink-0 animate-pulse" />
                  )}
                  {dateInfo.badgeLabel}
                </span>
                <span className="block font-display font-bold text-[12px] sm:text-[13px] text-[#283618] leading-tight whitespace-nowrap mt-0.5">
                  {dateInfo.weekday}, {dateInfo.year}
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* Weekly Menu Calendar Strip */}
        <section aria-label="Weekly Menu Calendar" className="mb-7 sm:mb-8">
          <div className="flex items-center justify-between gap-2 mb-2 px-0.5 text-[11px] text-[#283618]/55 font-medium">
            <span>
              {effectiveSchedule.cutoffDisplay
                ? `Cutoff ${effectiveSchedule.cutoffDisplay}`
                : 'Weekly menu'}
            </span>
            {selectedDayKey !== effectiveSchedule.effectiveDayKey ? (
              <button
                type="button"
                onClick={() => handleSelectDay(effectiveSchedule.effectiveDayKey)}
                className="min-h-0 inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#283618] hover:underline cursor-pointer"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[#f7bb0e]" />
                <span>{effectiveSchedule.isTomorrow ? 'Tomorrow' : 'Today'}</span>
              </button>
            ) : (
              <span>
                {total} {total === 1 ? 'dish' : 'dishes'}
              </span>
            )}
          </div>

          <div className="grid grid-cols-7 items-center gap-1 sm:gap-2 p-1.5 sm:p-2 rounded-full bg-[#fdfbf7] border border-[#283618]/12 shadow-[0_2px_10px_rgba(40,54,24,0.04)]">
            {weekDays.map((d) => {
              const isSelected = d.key === selectedDayKey;
              const isLiveDay = d.key === effectiveSchedule.effectiveDayKey;
              const count = dayDishCounts[d.key] ?? 0;

              return (
                <button
                  key={d.key}
                  type="button"
                  onClick={() => handleSelectDay(d.key)}
                  aria-pressed={isSelected}
                  aria-label={`${d.label}, ${d.formattedDate} (${count} ${count === 1 ? 'dish' : 'dishes'})`}
                  className={`aspect-square w-full max-w-[44px] sm:max-w-[52px] mx-auto flex flex-col items-center justify-center p-0 rounded-full transition-all duration-200 cursor-pointer ${
                    isSelected
                      ? 'bg-[#283618] text-white shadow-xs'
                      : count === 0
                        ? 'text-[#283618]/35 hover:bg-[#283618]/[0.05] hover:text-[#283618]/65'
                        : 'text-[#283618] hover:bg-[#283618]/[0.06]'
                  }`}
                >
                  <span
                    className={`text-[8.5px] sm:text-[9.5px] font-sans font-bold uppercase tracking-[0.06em] leading-none ${
                      isSelected ? 'text-[#f7bb0e]' : 'text-[#283618]/55'
                    }`}
                  >
                    {d.short}
                  </span>
                  <span className="font-display font-extrabold text-[14px] sm:text-[16px] leading-none mt-0.5 tabular-nums">
                    {d.dayNumber}
                  </span>
                  <span className="h-1 mt-0.5 flex items-center justify-center" aria-hidden="true">
                    {isLiveDay && (
                      <span
                        className={`w-1 h-1 rounded-full ${
                          isSelected ? 'bg-[#f7bb0e]' : 'bg-[#d99b00]'
                        }`}
                      />
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
          {/* Desktop: the sections, in the policy sidebar's card */}
          <aside className="lg:col-span-4 xl:col-span-3 sticky top-48 h-fit hidden lg:block">
            <div className="bg-[#fdfbf7] border border-[#283618]/12 rounded-2xl p-5 shadow-xs">
              <div className="flex items-center justify-between pb-4 mb-3 border-b border-[#283618]/10">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#283618]" />
                  <h2 className="font-display font-bold text-xs uppercase tracking-wider text-[#283618]">
                    {selectedDayMeta?.label || 'Day'} Menu
                  </h2>
                </div>
                <span className="text-[11px] font-semibold text-[#283618]/60">
                  {total} {total === 1 ? 'item' : 'items'}
                </span>
              </div>
              <nav className="flex flex-col space-y-1" aria-label="Menu sections">
                {isPending ? (
                  [1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-9 rounded-full bg-[#f2f2f0] animate-pulse" />
                  ))
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setActive('all');
                        scrollToSection('all');
                      }}
                      className={`menu-side-link${active === 'all' || !active ? ' menu-side-link--active' : ''}`}
                    >
                      <span>All Specials</span>
                      <span className="menu-side-link__count">{total}</span>
                    </button>
                    {sections.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => {
                          setActive(s.id);
                          scrollToSection(s.id);
                        }}
                        className={`menu-side-link${active === s.id ? ' menu-side-link--active' : ''}`}
                      >
                        <span>{s.name}</span>
                        <span className="menu-side-link__count">{s.items.length}</span>
                      </button>
                    ))}
                  </>
                )}
              </nav>
            </div>

            <Link to="/shop" className="menu-shop-card group">
              <span className="menu-shop-card__title">Shop Full Catalogue</span>
              <span className="menu-shop-card__icon">
                <ArrowUpRight strokeWidth={2.4} aria-hidden="true" />
              </span>
            </Link>
          </aside>

          <main className="lg:col-span-8 xl:col-span-9">
            {isPending ? (
              <MenuListSkeleton />
            ) : isError ? (
              <div className="py-12 text-center">
                <p className="text-red-600 font-semibold mb-2">We couldn&apos;t load the menu.</p>
                <p className="text-sm text-[#4b5563] mb-4">
                  Please check your connection and try again.
                </p>
                <button type="button" onClick={() => refetch()} className="ak-btn ak-btn--dark">
                  Try again
                </button>
              </div>
            ) : sections.length === 0 ? (
              <div className="py-16 px-6 text-center bg-[#fdfbf7] border border-[#283618]/10 rounded-2xl">
                <div className="w-12 h-12 rounded-full bg-[#f7bb0e]/20 text-[#283618] flex items-center justify-center mx-auto mb-3">
                  <Sparkles className="w-6 h-6 text-[#c89611]" />
                </div>
                <h3 className="font-display font-extrabold text-lg text-[#283618] mb-1">
                  No Specials Scheduled for {selectedDayMeta?.label || 'This Day'}
                </h3>
                <p className="text-sm text-[#4b5563] max-w-md mx-auto mb-5">
                  We rotate our fresh items throughout the week. Check another day on the calendar
                  or explore our complete catalogue.
                </p>
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => handleSelectDay(effectiveSchedule.effectiveDayKey)}
                    className="ak-btn ak-btn--dark text-xs"
                  >
                    View Today&apos;s Menu
                  </button>
                  <Link to="/shop" className="ak-btn ak-btn--outline text-xs">
                    Browse All Dishes
                  </Link>
                </div>
              </div>
            ) : (
              <div className="menu-sections">
                {sections.map((s, index) => (
                  <section
                    key={s.id}
                    id={`menu-${s.id}`}
                    className="menu-section"
                    aria-labelledby={`menu-${s.id}-title`}
                  >
                    <header className="menu-section__head">
                      <span className="menu-section__num">
                        {String(index + 1).padStart(2, '0')}
                      </span>
                      <h2 id={`menu-${s.id}-title`} className="menu-section__title">
                        {s.name}
                      </h2>
                      <Link to={getCategoryRoute(s.name)} className="menu-section__shop">
                        Shop {s.name.toLowerCase()}
                        <ArrowUpRight strokeWidth={2.4} aria-hidden="true" />
                      </Link>
                    </header>
                    <ul className="menu-list">
                      {s.items.map((p) => (
                        <MenuRow key={p._id || p.id} product={p} />
                      ))}
                    </ul>
                  </section>
                ))}

                <div className="menu-note">
                  <span className="w-2 h-2 rounded-full bg-[#f7bb0e] shrink-0" />
                  <span>
                    Everything is made fresh in small batches, so some items may sell out by
                    evening.
                  </span>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </motion.div>
  );
}
