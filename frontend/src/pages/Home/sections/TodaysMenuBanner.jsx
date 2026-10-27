import { Link } from 'react-router-dom';
import { useMemo } from 'react';
import { ArrowRight } from 'lucide-react';
import { useProducts } from '../../../hooks/useProductQueries';

const DEFAULT_ITEMS = [
  { name: 'Idli & Dosa Batter', price: '₹90' },
  { name: 'Fresh Coconut Chutney', price: '₹60' },
  { name: 'Traditional Mango Avakaaya', price: '₹180' },
  { name: 'Tomato Chutney', price: '₹65' },
  { name: 'Gongura Pickle', price: '₹160' },
  { name: 'Gunpowder Idli Podi', price: '₹95' },
  { name: 'Ginger Allam Chutney', price: '₹70' },
  { name: 'Garlic Pickle', price: '₹150' },
  { name: 'Ragi Murukulu', price: '₹110' },
  { name: 'Sambar Masala Podi', price: '₹120' },
];

export function TodaysMenuBanner() {
  const { data } = useProducts({ limit: 40 });

  const menuItems = useMemo(() => {
    const raw = data?.data || data?.products || data?.items || (Array.isArray(data) ? data : []);
    const valid = raw.filter((p) => p && p.isActive !== false);
    if (!valid.length) return DEFAULT_ITEMS;
    return valid.map((p) => {
      const rawImage =
        p.imageSrc || p.image || (Array.isArray(p.images) ? p.images[0]?.url || p.images[0] : null);
      const imageUrl = typeof rawImage === 'string' ? rawImage : rawImage?.url || null;

      return {
        id: p._id || p.id,
        name: p.title || p.name,
        price: p.price ? `₹${p.price}` : '',
        category: p.primaryCategory?.name || p.category || 'Menu',
        image: imageUrl,
      };
    });
  }, [data]);

  // Duplicate items for continuous seamless loop
  const displayItems = useMemo(() => {
    const base = menuItems.length >= 6 ? menuItems : [...menuItems, ...DEFAULT_ITEMS];
    return [...base, ...base];
  }, [menuItems]);

  return (
    <section
      aria-label="Today's Menu Live Highlights"
      className="ak-menu-banner w-full bg-[#fcfaf5]/90 border-y border-[#283618]/10 my-6 sm:my-8 lg:my-10 overflow-hidden select-none"
    >
      {/* Mobile Top Bar (< sm) - Aligned with website's SectionHeader style */}
      <div className="flex sm:hidden items-center justify-between px-4 py-2.5 bg-[#fcfaf5] border-b border-[#283618]/8 relative z-20">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#f7bb0e] opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#f7bb0e]" />
          </span>
          <span className="font-display font-bold text-[13.5px] tracking-tight text-[#283618]">
            Today&apos;s Menu
          </span>
          <span className="text-[10px] font-sans font-medium text-[#7a5400] bg-[#f7bb0e]/15 px-1.5 py-0.5 rounded-full border border-[#f7bb0e]/20">
            Fresh Today
          </span>
        </div>
        <Link
          to="/menu"
          className="flex items-center gap-1 text-xs font-semibold text-[#283618] hover:text-[#b47a00] transition-colors"
        >
          <span>See all</span>
          <ArrowRight size={13} strokeWidth={2.2} className="text-[#283618]/70" />
        </Link>
      </div>

      {/* Main Banner Bar */}
      <div className="flex items-center w-full">
        {/* Desktop Left Pinned Header Badge */}
        <div className="hidden sm:flex shrink-0 items-center gap-2.5 px-4 md:px-5 py-3 bg-[#fcfaf5] border-r border-[#283618]/8 z-20 shadow-[4px_0_12px_rgba(40,54,24,0.03)]">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#f7bb0e] opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#f7bb0e]" />
            </span>
            <span className="font-display font-bold text-sm md:text-[15px] tracking-tight text-[#283618] whitespace-nowrap">
              Today&apos;s Menu
            </span>
          </div>
          <span className="px-2 py-0.5 rounded-full bg-[#f7bb0e]/15 border border-[#f7bb0e]/25 text-[#7a5400] font-sans text-[11px] font-semibold whitespace-nowrap">
            Fresh Today
          </span>
        </div>

        {/* Center Infinite Scrolling Marquee */}
        <div className="flex-1 overflow-hidden relative py-2.5 sm:py-3 group min-w-0">
          {/* Subtle edge fade masks for warm off-white background */}
          <div className="absolute left-0 top-0 bottom-0 w-8 sm:w-14 bg-gradient-to-r from-[#fcfaf5] to-transparent z-10 pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-8 sm:w-14 bg-gradient-to-l from-[#fcfaf5] to-transparent z-10 pointer-events-none" />

          {/* Scrolling items row (smooth and serene glide) */}
          <div className="animate-menu-scroll flex items-center gap-2 sm:gap-3 w-max">
            {displayItems.map((item, idx) => (
              <Link
                key={`${item.id || item.name}-${idx}`}
                to="/menu"
                className="flex items-center gap-2 px-3 sm:px-3.5 py-1.5 rounded-full bg-white/90 hover:bg-white border border-[#283618]/10 hover:border-[#283618]/25 text-[#283618] transition-all duration-200 shrink-0 group/pill shadow-[0_1px_3px_rgba(40,54,24,0.04)] hover:shadow-[0_4px_12px_rgba(40,54,24,0.08)] hover:-translate-y-0.5 cursor-pointer"
              >
                {item.image ? (
                  <img
                    src={item.image}
                    alt=""
                    loading="lazy"
                    className="w-5 h-5 rounded-full object-cover shrink-0 border border-[#283618]/15"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      if (e.currentTarget.nextElementSibling) {
                        e.currentTarget.nextElementSibling.style.display = 'inline-block';
                      }
                    }}
                  />
                ) : null}
                <span
                  className="w-1.5 h-1.5 rounded-full bg-[#f7bb0e] shrink-0"
                  style={{ display: item.image ? 'none' : 'inline-block' }}
                />
                <span className="font-sans font-medium text-[12.5px] sm:text-[13px] text-[#283618] group-hover/pill:text-[#b47a00] transition-colors whitespace-nowrap">
                  {item.name}
                </span>
                {item.price && (
                  <span className="px-2 py-0.5 rounded-full bg-[#f7bb0e]/15 border border-[#f7bb0e]/25 text-[#7a5400] font-sans font-semibold text-[11px] whitespace-nowrap">
                    {item.price}
                  </span>
                )}
              </Link>
            ))}
          </div>
        </div>

        {/* Desktop Right Pinned CTA Button */}
        <div className="hidden sm:flex shrink-0 items-center px-4 md:px-5 py-3 bg-[#fcfaf5] border-l border-[#283618]/8 z-20 shadow-[-4px_0_12px_rgba(40,54,24,0.03)]">
          <Link
            to="/menu"
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#283618] hover:bg-[#1f2b13] active:scale-95 text-white font-sans font-medium text-xs tracking-wide transition-all duration-200 shadow-xs hover:shadow-sm whitespace-nowrap"
          >
            <span>View Menu</span>
            <ArrowRight size={13} strokeWidth={2.2} className="text-[#f7bb0e] shrink-0" />
          </Link>
        </div>
      </div>
    </section>
  );
}
