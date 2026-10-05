import { ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { SectionHeader } from '../../../components/shared/SectionHeader';
import { CloudinaryImage } from '../../../components/ui/CloudinaryImage';
import { useWebsiteContent } from '../../../hooks/useWebsiteContent';

import React from 'react';

/**
 * Category tiles strictly driven by CMS config. No fallbacks.
 *
 * Tiles wrap in rows and the last row stretches to the full width, so any
 * number of categories lands on a clean edge.
 */

/** Pick a desktop row length that avoids a single orphan tile on the last row. */
const desktopColumns = (count) => {
  if (count <= 4) return count;
  const remainder = (cols) => count % cols || cols;
  return remainder(3) >= remainder(4) ? 3 : 4;
};

const normalizeCategory = (category, index) => {
  if (typeof category === 'string') {
    return {
      key: category,
      name: category,
      link: `/collections?category=${encodeURIComponent(category)}`,
      image: null,
    };
  }
  const categoryName = category.categoryName || category.name || category.title || 'Category';
  return {
    key: category.id || category._id || index,
    name: category.title || category.name || categoryName,
    link: category.link || `/collections?category=${encodeURIComponent(categoryName)}`,
    image: category.image || null,
  };
};

export const CategoryGrid = React.memo(function CategoryGrid({ previewContent }) {
  const cms = useWebsiteContent({ includeDefaults: false });
  const activeCms = previewContent || cms;
  const config = activeCms?.categoryGrid || {};

  if (cms.loading) {
    return (
      <section className="ak-cats" aria-busy="true">
        <div className="h1-container animate-pulse">
          <div className="h-7 w-52 bg-surface-container-high rounded-full mb-4" />
          <ul className="ak-cats__grid" style={{ '--cols-lg': 4 }}>
            {[...Array(4)].map((_, i) => (
              <li key={i} className="ak-cats__cell">
                <div className="ak-cats__tile bg-surface-container-high" />
              </li>
            ))}
          </ul>
        </div>
      </section>
    );
  }

  if (config.isVisible === false) return null;

  const categories = Array.isArray(config.categories)
    ? config.categories.map(normalizeCategory)
    : [];

  if (categories.length === 0) return null;

  return (
    <section className="ak-cats">
      <div className="h1-container">
        <SectionHeader
          kicker={config.sectionSubtitle}
          title={config.sectionTitle || 'Shop by category'}
          seeAllLink="/collections"
        />
        <ul className="ak-cats__grid" style={{ '--cols-lg': desktopColumns(categories.length) }}>
          {categories.map((category) => (
            <li key={category.key} className="ak-cats__cell">
              <Link to={category.link} className="ak-cats__tile group">
                {category.image ? (
                  <CloudinaryImage
                    src={category.image}
                    alt=""
                    loading="lazy"
                    containerClassName="absolute inset-0 w-full h-full"
                    className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.07]"
                    sizes="(max-width: 640px) 50vw, 400px"
                    width={640}
                  />
                ) : (
                  <span className="ak-cats__initial" aria-hidden="true">
                    {String(category.name).charAt(0)}
                  </span>
                )}
                <span className="ak-tile-shade" aria-hidden="true" />
                <span className="ak-tile-caption">
                  <span className="ak-tile-name">{category.name}</span>
                  <ExternalLink className="ak-tile-icon" strokeWidth={1.6} aria-hidden="true" />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
});
