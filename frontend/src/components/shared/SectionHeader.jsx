import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

/**
 * Section header — heavy, wide headline in the logo's lettering style,
 * a small yellow emblem dot, and an outlined "See all" link.
 */
export function SectionHeader({
  kicker,
  title,
  seeAllLink,
  linkText = 'See all',
  className = '',
  size = 'default',
}) {
  if (!title && !kicker) return null;

  const isSm = size === 'sm';

  return (
    <div className={`ak-section-header ${isSm ? 'ak-section-header--sm' : ''} ${className}`}>
      <div className="min-w-0">
        <h2 className="ak-section-header__title">
          <span className="ak-section-header__dot" aria-hidden="true" />
          {title}
        </h2>
        {kicker && <p className="ak-section-header__kicker">{kicker}</p>}
      </div>

      {seeAllLink && (
        <Link to={seeAllLink} className="ak-section-header__link">
          <span>{linkText}</span>
          <ArrowRight
            className={isSm ? 'w-3 h-3' : 'w-3.5 h-3.5'}
            strokeWidth={2.2}
            aria-hidden="true"
          />
        </Link>
      )}
    </div>
  );
}
