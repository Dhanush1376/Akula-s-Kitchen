import { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { policyService } from '../../services/domainServices';
import {
  DEFAULT_POLICIES,
  getPolicyMeta,
  sortPoliciesByImportance,
} from '../../constants/defaultPolicies';
import { Shield, ChevronRight, ChevronLeft } from 'lucide-react';

export function PolicySidebar() {
  const { pathname } = useLocation();

  const { data: response } = useQuery({
    queryKey: ['public-policies'],
    queryFn: () => policyService.getPublicPolicies(),
    staleTime: 5 * 60 * 1000,
  });

  // Merge live policies with default policies fallback and sort by importance
  const policies = useMemo(() => {
    const livePolicies = response?.data || [];
    const raw =
      livePolicies.length > 0
        ? livePolicies.map((p) => {
            const meta = getPolicyMeta(p.slug, p.title);
            return {
              title: p.title,
              slug: p.slug,
              path: `/policy/${p.slug}`,
              icon: meta.icon,
              badge: meta.badge,
            };
          })
        : DEFAULT_POLICIES.map((p) => {
            const meta = getPolicyMeta(p.slug, p.title);
            return {
              title: p.title,
              slug: p.slug,
              path: `/policy/${p.slug}`,
              icon: meta.icon,
              badge: meta.badge,
            };
          });
    return sortPoliciesByImportance(raw);
  }, [response?.data]);

  return (
    <aside className="lg:col-span-4 xl:col-span-3.5 space-y-6 sticky top-44 lg:top-48 h-fit hidden lg:block">
      {/* Navigation Card */}
      <div className="bg-[#fdfbf7] border border-[#283618]/12 rounded-2xl p-5 shadow-xs">
        <div className="flex items-center justify-between pb-4 mb-3 border-b border-[#283618]/10">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#283618]" />
            <h2 className="font-display font-bold text-xs uppercase tracking-wider text-[#283618]">
              Legal & Help Center
            </h2>
          </div>
        </div>

        <nav className="flex flex-col space-y-1.5" aria-label="Policy Navigation">
          {policies.map((policy) => {
            const isActive = pathname === policy.path;
            const IconComponent = policy.icon || Shield;

            return (
              <Link
                key={policy.path}
                to={policy.path}
                className={`group flex items-center justify-between px-3.5 py-2.5 rounded-xl font-medium text-xs sm:text-[13px] transition-all duration-200 select-none ${
                  isActive
                    ? 'bg-[#283618] text-white shadow-sm font-semibold'
                    : 'text-[#4b5563] hover:text-[#283618] hover:bg-white/80'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
                      isActive
                        ? 'bg-white/15 text-[#f7bb0e]'
                        : 'bg-white text-[#283618]/70 border border-[#283618]/10 group-hover:text-[#283618] group-hover:border-[#283618]/25'
                    }`}
                  >
                    <IconComponent className="w-3.5 h-3.5" />
                  </div>
                  <span className="truncate">{policy.title}</span>
                </div>

                {isActive ? (
                  <div className="w-1.5 h-1.5 rounded-full bg-[#f7bb0e]" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 text-stone-300 opacity-0 group-hover:opacity-100 group-hover:text-[#283618]/60 transition-all -translate-x-1 group-hover:translate-x-0" />
                )}
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}

export function MobilePolicyNav() {
  const { pathname } = useLocation();
  const scrollContainerRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // Mouse drag-to-scroll tracking
  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const scrollLeftStartRef = useRef(0);
  const hasDraggedRef = useRef(false);

  const { data: response } = useQuery({
    queryKey: ['public-policies'],
    queryFn: () => policyService.getPublicPolicies(),
    staleTime: 5 * 60 * 1000,
  });

  const policies = useMemo(() => {
    const livePolicies = response?.data || [];
    const raw =
      livePolicies.length > 0
        ? livePolicies.map((p) => {
            const meta = getPolicyMeta(p.slug, p.title);
            return {
              title: meta.shortTitle || p.title,
              fullTitle: p.title,
              slug: p.slug,
              path: `/policy/${p.slug}`,
              icon: meta.icon,
            };
          })
        : DEFAULT_POLICIES.map((p) => {
            const meta = getPolicyMeta(p.slug, p.title);
            return {
              title: meta.shortTitle || p.title,
              fullTitle: p.title,
              slug: p.slug,
              path: `/policy/${p.slug}`,
              icon: meta.icon,
            };
          });
    return sortPoliciesByImportance(raw);
  }, [response?.data]);

  const checkScroll = useCallback(() => {
    const el = scrollContainerRef.current;
    if (el) {
      const { scrollLeft, scrollWidth, clientWidth } = el;
      setCanScrollLeft(scrollLeft > 4);
      setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 4);
    }
  }, []);

  useEffect(() => {
    checkScroll();
    const frame = requestAnimationFrame(checkScroll);
    const timer = setTimeout(checkScroll, 150);
    const el = scrollContainerRef.current;
    if (!el) {
      return () => {
        cancelAnimationFrame(frame);
        clearTimeout(timer);
      };
    }
    el.addEventListener('scroll', checkScroll, { passive: true });
    window.addEventListener('resize', checkScroll);
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(timer);
      el.removeEventListener('scroll', checkScroll);
      window.removeEventListener('resize', checkScroll);
    };
  }, [checkScroll, policies]);

  // Handle smooth horizontal scrolling with mouse wheel
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const handleWheel = (e) => {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        const maxScroll = el.scrollWidth - el.clientWidth;
        if (maxScroll <= 0) return;
        const canScrollInDir =
          (e.deltaY > 0 && el.scrollLeft < maxScroll - 1) || (e.deltaY < 0 && el.scrollLeft > 1);
        if (canScrollInDir) {
          e.preventDefault();
          el.scrollBy({ left: e.deltaY * 1.15, behavior: 'auto' });
          checkScroll();
        }
      }
    };
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [checkScroll]);

  // Clean up global drag state on mouseup anywhere
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      isDraggingRef.current = false;
    };
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, []);

  // Smoothly bring active policy chip into view if out of sight
  useEffect(() => {
    const row = scrollContainerRef.current;
    if (!row) return;
    const chip = row.querySelector('[data-active="true"]');
    if (chip) {
      const rowRect = row.getBoundingClientRect();
      const chipRect = chip.getBoundingClientRect();
      if (chipRect.left < rowRect.left || chipRect.right > rowRect.right) {
        chip.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
    const timer = setTimeout(checkScroll, 200);
    return () => clearTimeout(timer);
  }, [pathname, policies, checkScroll]);

  const handleMouseDown = (e) => {
    if (e.button !== 0) return;
    const el = scrollContainerRef.current;
    if (!el) return;
    isDraggingRef.current = true;
    hasDraggedRef.current = false;
    startXRef.current = e.pageX;
    scrollLeftStartRef.current = el.scrollLeft;
  };

  const handleMouseMove = (e) => {
    if (!isDraggingRef.current) return;
    const el = scrollContainerRef.current;
    if (!el) return;
    const dx = e.pageX - startXRef.current;
    if (Math.abs(dx) > 4) {
      hasDraggedRef.current = true;
    }
    el.scrollLeft = scrollLeftStartRef.current - dx;
    checkScroll();
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  const handleChipClick = (e) => {
    if (hasDraggedRef.current) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    const row = scrollContainerRef.current;
    const chip = e.currentTarget;
    if (row && chip) {
      const rowRect = row.getBoundingClientRect();
      const chipRect = chip.getBoundingClientRect();
      if (chipRect.left < rowRect.left || chipRect.right > rowRect.right) {
        chip.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
      setTimeout(checkScroll, 200);
    }
  };

  const handleScrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -220, behavior: 'smooth' });
      setTimeout(checkScroll, 200);
    }
  };

  const handleScrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 220, behavior: 'smooth' });
      setTimeout(checkScroll, 200);
    }
  };

  return (
    <div className="lg:hidden mb-8 policy-mobile-nav">
      {/* Top Header with title and clean, non-overlapping prev/next scroll buttons */}
      <div className="flex items-center justify-between mb-2.5 px-0.5 select-none">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#283618]" />
          <span className="text-[11.5px] font-bold uppercase tracking-wider text-[#283618]">
            Select Policy
          </span>
          <span className="text-[10px] text-[#283618]/50 font-semibold">({policies.length})</span>
        </div>

        {/* Clean Prev / Next controls in header (Zero overlay on chips!) */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleScrollLeft}
            disabled={!canScrollLeft}
            className="w-7 h-7 rounded-full bg-white hover:bg-neutral-100 disabled:opacity-20 disabled:pointer-events-none border border-[#283618]/20 flex items-center justify-center text-[#283618] shadow-2xs transition-all active:scale-90 cursor-pointer"
            aria-label="Previous policies"
            title="Scroll left"
          >
            <ChevronLeft size={13} strokeWidth={2.5} />
          </button>
          <button
            type="button"
            onClick={handleScrollRight}
            disabled={!canScrollRight}
            className="w-7 h-7 rounded-full bg-white hover:bg-neutral-100 disabled:opacity-20 disabled:pointer-events-none border border-[#283618]/20 flex items-center justify-center text-[#283618] shadow-2xs transition-all active:scale-90 cursor-pointer"
            aria-label="Next policies"
            title="Scroll right"
          >
            <ChevronRight size={13} strokeWidth={2.5} />
          </button>
        </div>
      </div>

      {/* 100% Unobstructed, Silky-Smooth Chips Row */}
      <div className="w-full">
        <div
          ref={scrollContainerRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1 px-1 -mx-1 overscroll-x-contain touch-pan-x cursor-grab active:cursor-grabbing select-none"
        >
          {policies.map((policy) => {
            const isActive = pathname === policy.path;
            const IconComponent = policy.icon || Shield;

            return (
              <Link
                key={policy.path}
                to={policy.path}
                data-active={isActive ? 'true' : 'false'}
                onClick={handleChipClick}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-200 shrink-0 ${
                  isActive
                    ? 'bg-[#283618] text-white shadow-sm ring-2 ring-[#283618]/20 font-bold'
                    : 'bg-[#fdfbf7] text-[#4b5563] border border-[#283618]/12 hover:border-[#283618]/30 hover:bg-white active:bg-neutral-100'
                }`}
              >
                <IconComponent
                  className={`w-3.5 h-3.5 ${isActive ? 'text-[#f7bb0e]' : 'text-[#283618]/70'}`}
                />
                <span>{policy.title}</span>
                {isActive && <span className="w-1.5 h-1.5 rounded-full bg-[#f7bb0e]" />}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
