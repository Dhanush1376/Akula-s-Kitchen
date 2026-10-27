import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { m as motion } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';
import { SEO } from '../../components/seo/SEO';
import { useProducts } from '../../hooks/useProductQueries';
import { useConfig } from '../../context/ConfigContext';
import { getProductRoute } from '../../utils/ecommerce/productRouteUtils';
import { formatPrice, parseNumericPrice } from '../../utils/ecommerce/priceUtils';
import { prefersReducedMotion, windBreeze, windGust } from '../../components/effects/FallingLeaves';
import '../../styles/policy.css';
import './menu.css';

/**
 * The menu: every product, grouped by category and set like a printed menu card, with a
 * dotted leader running from each dish to its price. Shares the policy pages' header,
 * type and swaying banana leaf so it feels like part of the same house.
 */

const categoryOf = (p) => {
  const cat = p.primaryCategory?.name || p.category?.name || p.category;
  return typeof cat === 'string' && cat.trim() ? cat.trim() : 'More from the kitchen';
};

// The default pack size, from the product's weight options when it has them
const packOf = (p) => {
  const group = p.optionGroups?.find((g) => /weight|size|pack/i.test(g.name || ''));
  const option = group?.options?.find((o) => o.isDefault || o.default) || group?.options?.[0];
  return option?.label || '';
};

// `material` sometimes holds packaging or a stray word ("Glass", "Powder"): only show it
// when it reads as a list of ingredients
const ingredientsOf = (p) => {
  const text = typeof p.material === 'string' ? p.material.trim() : '';
  return text.split(',').filter((part) => part.trim()).length >= 2 ? text : '';
};

const slugify = (text) =>
  String(text)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

function useMenuLeaf() {
  const leafRef = useRef(null);
  const shadowRef = useRef(null);

  useEffect(() => {
    const breeze = windBreeze(leafRef.current, { strength: 0.8 });
    return () => breeze?.cancel();
  }, []);

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
      onScreen() && windGust(leaf, { direction, strength: 0.9, shadow: shadowRef.current });
    const schedule = (delay) => {
      timer = window.setTimeout(() => {
        gust(Math.random() < 0.5 ? -1 : 1);
        schedule(9000 + Math.random() * 4000);
      }, delay);
    };
    schedule(2000);
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
  }, []);

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
  const pack = packOf(product);
  const desc = ingredientsOf(product);
  const soldOut = product.stock === 0;
  const originalImage = getValidOriginalImage(product);
  const [imgFailed, setImgFailed] = useState(false);

  const showThumb = Boolean(originalImage && !imgFailed);

  return (
    <li>
      <Link
        to={getProductRoute(product._id || product.id)}
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
            {(desc || pack || soldOut) && (
              <span className="menu-row__meta">
                {desc && <span className="menu-row__desc">{desc}</span>}
                {pack && <span className="menu-row__pack">{pack}</span>}
                {soldOut && <span className="menu-row__pack">Sold out today</span>}
              </span>
            )}
          </div>
        </div>
      </Link>
    </li>
  );
}

function MenuSkeleton() {
  return (
    <div className="space-y-12" aria-busy="true" aria-label="Loading the menu">
      {[5, 4].map((rows, s) => (
        <div key={s}>
          <div className="h-6 w-40 rounded-md bg-[#283618]/[0.07] animate-pulse mb-6" />
          <div className="space-y-4">
            {Array.from({ length: rows }, (_, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-[#283618]/[0.07] animate-pulse shrink-0" />
                <div className="flex-1">
                  <div className="flex items-end gap-3 mb-1.5">
                    <div className="h-4 w-1/3 rounded bg-[#283618]/[0.07] animate-pulse" />
                    <div className="flex-1 border-b-2 border-dotted border-[#283618]/10" />
                    <div className="h-4 w-12 rounded bg-[#283618]/[0.07] animate-pulse" />
                  </div>
                  <div className="h-3 w-1/2 rounded bg-[#283618]/[0.04] animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function Menu() {
  const { storeName } = useConfig();
  const { leafRef, shadowRef } = useMenuLeaf();
  const { data, isPending, isError, refetch } = useProducts({ limit: 200 });

  const sections = useMemo(() => {
    const raw = data?.data || data?.products || data?.items || (Array.isArray(data) ? data : []);
    const groups = new Map();
    raw
      .filter((p) => p && p.isActive !== false)
      .forEach((p) => {
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
  }, [data]);

  const ids = useMemo(() => sections.map((s) => s.id), [sections]);
  const [active, setActive] = useActiveSection(ids);
  const total = sections.reduce((n, s) => n + s.items.length, 0);

  const dateInfo = useMemo(() => {
    const now = new Date();
    return {
      day: now.getDate(),
      month: now.toLocaleDateString('en-IN', { month: 'short' }).toUpperCase(),
      weekday: now.toLocaleDateString('en-IN', { weekday: 'short' }),
      year: now.getFullYear(),
    };
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.35 }}
      className="policy-page menu-page pt-44 sm:pt-48 lg:pt-52 pb-[calc(var(--bottom-nav-height,65px)+3.5rem)] lg:pb-24 selection:bg-[#f7bb0e]/30 selection:text-[#283618]"
    >
      <SEO
        title={`Menu | ${storeName || "Akula's Kitchen"}`}
        description="Batters, pickles, chutneys, podis and snacks from Akula's Kitchen, with prices. Made fresh in small batches."
      />

      <div className="policy-hero-glow" aria-hidden="true" />

      <div className="policy-hero-leaf" aria-hidden="true">
        <div className="policy-hero-leaf__frame">
          <div ref={leafRef} className="policy-hero-leaf__sway">
            <img
              ref={shadowRef}
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

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-12 relative z-10">
        <header id="menu-top" className="mb-6 lg:mb-12">
          <div className="flex items-start justify-between gap-3">
            <div>
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

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold font-display text-[#283618] tracking-tight mb-2">
                Our Menu
              </h1>

              <p className="text-[9.5px] sm:text-[10px] font-sans font-medium uppercase tracking-[0.16em] text-[#283618]/55 select-none">
                Fresh today{total > 0 && ` · ${total} items`}
              </p>
            </div>

            {/* Opposite Corner: Redesigned Artisanal Date Stamp */}
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
                  <span className="w-1.5 h-1.5 rounded-full bg-[#f7bb0e] shrink-0" />
                  Today
                </span>
                <span className="block font-display font-bold text-[12px] sm:text-[13px] text-[#283618] leading-tight whitespace-nowrap mt-0.5">
                  {dateInfo.weekday}, {dateInfo.year}
                </span>
              </div>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
          {/* Desktop: the sections, in the policy sidebar's card */}
          <aside className="lg:col-span-4 xl:col-span-3 sticky top-48 h-fit hidden lg:block">
            <div className="bg-[#fdfbf7] border border-[#283618]/12 rounded-2xl p-5 shadow-xs">
              <div className="flex items-center gap-2 pb-4 mb-3 border-b border-[#283618]/10">
                <span className="w-2 h-2 rounded-full bg-[#283618]" />
                <h2 className="font-display font-bold text-xs uppercase tracking-wider text-[#283618]">
                  On the menu
                </h2>
              </div>
              <nav className="flex flex-col space-y-1" aria-label="Menu sections">
                {isPending ? (
                  [1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-9 rounded-xl bg-[#283618]/[0.05] animate-pulse" />
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
                      <span>Our Menu</span>
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

            <Link to="/collections" className="menu-shop-card group">
              <span className="menu-shop-card__title">Ready to order?</span>
              <span className="menu-shop-card__icon">
                <ArrowUpRight strokeWidth={2.4} aria-hidden="true" />
              </span>
            </Link>
          </aside>

          <main className="lg:col-span-8 xl:col-span-9">
            {isPending ? (
              <MenuSkeleton />
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
              <p className="py-12 text-center text-[#4b5563]">
                The menu is being updated. Please check back soon.
              </p>
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
                      <Link
                        to={`/collections?category=${encodeURIComponent(s.name)}`}
                        className="menu-section__shop"
                      >
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

                <p className="menu-note">
                  Prices are for the default pack. Everything is made fresh in small batches, so
                  some items may sell out by evening.
                </p>
              </div>
            )}
          </main>
        </div>
      </div>
    </motion.div>
  );
}
