import { ArrowRight, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useMemo } from 'react';
import { CloudinaryImage } from '../../../components/ui/CloudinaryImage';
import { useWebsiteContent } from '../../../hooks/useWebsiteContent';
import { useProducts } from '../../../hooks/useProductQueries';
import { useMediaQuery } from '../../../hooks/useMediaQuery';

/**
 * Hero — "Today's Kitchen".
 *
 * The admin picks a fresh set of products every day, so the layout has to look
 * deliberate for any count. Items are packed Pinterest-style into the shortest
 * column, then the last card in each column stretches so every column ends on
 * the same line.
 */

const MAX_ITEMS = 24;

// Image height / width, cycled so neighbouring cards never share a height.
const ASPECTS = [1.35, 1.05, 1.2, 1.45, 1.1, 1.3, 1, 1.25];

// Image fields may be plain URLs or media objects ({ url } / { secure_url } / { src }).
const toUrl = (img) =>
  typeof img === 'string' ? img : img?.url || img?.secure_url || img?.src || '';

const pickImage = (p) =>
  toUrl(p.image) ||
  toUrl(p.imageSrc) ||
  toUrl(p.thumbnail) ||
  (Array.isArray(p.images) ? toUrl(p.images[0]) : '') ||
  '';

const toItem = (p) => ({
  id: p.id || p._id,
  title: p.title || p.name || '',
  image: pickImage(p),
});

/** Distribute items into `count` columns, always filling the shortest one. */
function packColumns(items, count) {
  const columns = Array.from({ length: count }, () => ({ height: 0, cards: [] }));
  items.forEach((item, index) => {
    const aspect = ASPECTS[index % ASPECTS.length];
    const target = columns.reduce((min, col) => (col.height < min.height ? col : min));
    target.cards.push({ item, aspect, index });
    target.height += aspect;
  });
  return columns.map((col) => col.cards);
}

function useColumnCount() {
  const isTablet = useMediaQuery('(min-width: 640px)');
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  return isDesktop ? 4 : isTablet ? 3 : 2;
}

function TodayCard({ item, aspect, index, badge, isLast }) {
  const eager = index < 4;
  return (
    <Link
      to={`/product/${item.id}`}
      className={`ak-today__card group${isLast ? ' ak-today__card--fill' : ''}`}
      style={{ '--i': index }}
    >
      <div className="ak-today__media" style={{ aspectRatio: `1 / ${aspect}` }}>
        <CloudinaryImage
          src={item.image}
          alt={item.title}
          eager={eager}
          fetchPriority={index === 0 ? 'high' : undefined}
          loading={eager ? undefined : 'lazy'}
          width={600}
          height={Math.round(600 * aspect)}
          sizes="(max-width: 640px) 48vw, (max-width: 1024px) 32vw, 320px"
          containerClassName="absolute inset-0 w-full h-full"
          className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.06]"
        />
        {badge && <span className="ak-today__badge">{badge}</span>}
        <span className="ak-tile-shade" aria-hidden="true" />
        <div className="ak-tile-caption">
          <h3 className="ak-tile-name">{item.title}</h3>
          <ExternalLink className="ak-tile-icon" strokeWidth={1.6} aria-hidden="true" />
        </div>
      </div>
    </Link>
  );
}

function TodayHead({ title, subtitle, count }) {
  const today = new Date().toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });

  return (
    <div className="ak-today__head">
      <div className="min-w-0">
        <p className="ak-today__eyebrow">
          <span className="ak-today__live" aria-hidden="true" />
          Fresh today · {today}
        </p>
        <h1 id="ak-today-title" className="ak-today__title">
          {title}
        </h1>
        {subtitle && <p className="ak-today__subtitle">{subtitle}</p>}
      </div>
      <Link to="/collections" className="ak-today__all">
        {count > 0 && <span className="ak-today__count">{count}</span>}
        <span>See all</span>
        <ArrowRight strokeWidth={2.4} aria-hidden="true" />
      </Link>
    </div>
  );
}

function HeroSkeleton({ columns }) {
  const heights = [
    [260, 190],
    [200, 250],
    [240, 210],
    [210, 240],
  ];
  return (
    <section className="ak-today" aria-busy="true" aria-label="Loading today's menu">
      <div className="ak-today__head">
        <div>
          <div className="h-3 w-32 rounded-full bg-surface-container-high animate-pulse mb-2" />
          <div className="h-8 w-52 rounded-lg bg-surface-container-high animate-pulse" />
        </div>
      </div>
      <div className="ak-today__grid" style={{ '--cols': columns }}>
        {heights.slice(0, columns).map((col, c) => (
          <div key={c} className="ak-today__col">
            {col.map((h, i) => (
              <div
                key={i}
                className="rounded-[18px] bg-surface-container-high animate-pulse"
                style={{ height: h }}
              />
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}

export function EditorialHero({ previewContent }) {
  const cms = useWebsiteContent({ includeDefaults: false });
  const activeCms = previewContent || cms;
  const heroConfig = activeCms?.hero || {};
  const productIds = useMemo(() => heroConfig.productIds || [], [heroConfig.productIds]);
  const maxColumns = useColumnCount();

  const { data, isPending } = useProducts(
    { ids: productIds.join(','), limit: Math.min(productIds.length || 5, MAX_ITEMS) },
    { enabled: productIds.length > 0 },
  );

  const items = useMemo(() => {
    const raw = data?.data || data?.products || data?.items || (Array.isArray(data) ? data : []);
    // Keep the admin's chosen order
    const byId = new Map(raw.map((p) => [String(p.id || p._id), p]));
    const ordered = productIds.map((id) => byId.get(String(id))).filter(Boolean);
    return (ordered.length ? ordered : raw)
      .slice(0, MAX_ITEMS)
      .map(toItem)
      .filter((i) => i.id);
  }, [data, productIds]);

  const columnCount = Math.max(1, Math.min(maxColumns, items.length));
  const columns = useMemo(() => packColumns(items, columnCount), [items, columnCount]);

  if (productIds.length > 0 && isPending) return <HeroSkeleton columns={maxColumns} />;
  if (items.length === 0) return null;

  const badge = heroConfig.badgeText || "Today's special";

  return (
    <section className="ak-today" aria-labelledby="ak-today-title">
      <TodayHead
        title={heroConfig.title || "Today's Kitchen"}
        subtitle={heroConfig.subtitle}
        count={items.length}
      />

      <div className="ak-today__grid" style={{ '--cols': columnCount }}>
        {columns.map((cards, c) => (
          <div key={c} className="ak-today__col">
            {cards.map(({ item, aspect, index }, i) => (
              <TodayCard
                key={item.id}
                item={item}
                aspect={aspect}
                index={index}
                badge={index === 0 ? badge : null}
                isLast={i === cards.length - 1}
              />
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}
