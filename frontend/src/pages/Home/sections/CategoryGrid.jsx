import { Link } from 'react-router-dom';
import { SectionHeader } from '../../../components/shared/SectionHeader';
import { useWebsiteContent } from '../../../hooks/useWebsiteContent';
import React, { useMemo } from 'react';
import { useActiveCategories } from '../../../hooks/useProductQueries';
import { MadeFreshStrip } from './MadeFreshStrip';

const getCategoryImage = (cat) => {
  return cat?.image || cat?.imageSrc || null;
};

export const CategoryGrid = React.memo(function CategoryGrid({ previewContent }) {
  const cms = useWebsiteContent();
  const activeCms = previewContent || cms;
  const config = activeCms?.categoryGrid || {};

  const { data: dbCategories = [], isLoading: isCategoriesLoading } = useActiveCategories();

  const categories = useMemo(() => {
    const rawDb = Array.isArray(dbCategories)
      ? dbCategories
      : Array.isArray(dbCategories?.data)
        ? dbCategories.data
        : [];

    const activeDbCategories = rawDb.filter((cat) => {
      if (!cat) return false;
      if (typeof cat === 'string') return true;
      return cat.isActive !== false && !cat.isDeleted;
    });

    // Lookup map from DB categories to resolve images and slugs
    const dbMap = new Map();
    activeDbCategories.forEach((c) => {
      const nameKey = (c.name || c.title || '').toLowerCase().trim();
      const slugKey = (c.slug || '').toLowerCase().trim();
      if (nameKey) dbMap.set(nameKey, c);
      if (slugKey) dbMap.set(slugKey, c);
    });

    const adminConfigured =
      Array.isArray(config.categories) && config.categories.length > 0 ? config.categories : [];

    // If configured in backend admin portal (CMS)
    if (adminConfigured.length > 0) {
      const validAdmin = adminConfigured
        .map((cat, idx) => {
          const name = cat.title || cat.name || cat.categoryName || '';
          const slug = (cat.slug || name).toLowerCase().trim();
          const dbMatch = dbMap.get(name.toLowerCase().trim()) || dbMap.get(slug);
          // If no active DB match, do NOT display this static/phantom item
          if (!dbMatch && activeDbCategories.length > 0) return null;
          const finalName = dbMatch?.name || name;
          return {
            key: dbMatch?._id || cat._id || cat.id || cat.key || `${slug}-${idx}`,
            name: finalName,
            slug: dbMatch?.slug || slug,
            link: cat.link || `/collections?category=${encodeURIComponent(finalName)}`,
            image: dbMatch?.imageSrc || cat.image || cat.imageSrc || null,
          };
        })
        .filter(Boolean);

      return validAdmin;
    }

    // Never render static or unconfigured categories when admin has not published any
    return [];
  }, [config.categories, dbCategories]);

  // Only show skeleton if we have zero categories available
  if (categories.length === 0 && (cms.loading || isCategoriesLoading)) {
    return (
      <section className="ak-cats py-8 lg:py-12" aria-busy="true">
        <div className="h1-container animate-pulse">
          <div className="h-7 w-52 bg-surface-container-high rounded-full mb-6" />
          <div className="grid grid-cols-3 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-4 lg:gap-5">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="aspect-[8/9] sm:aspect-auto sm:h-[210px] md:h-[240px] lg:h-[270px] bg-surface-container-high rounded-lg sm:rounded-xl lg:rounded-2xl"
              />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (config.isVisible === false) return null;
  if (categories.length === 0) return null;

  return (
    <>
      <MadeFreshStrip />
      <section className="ak-cats py-6 sm:py-8 lg:py-12">
        <div className="h1-container">
          {/* Header Section */}
          <SectionHeader
            title={config.sectionTitle || 'Shop by category'}
            seeAllLink="/collections"
          />

          {/* Bento Editorial Category Cards Grid */}
          <div className="grid grid-cols-3 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-4 lg:gap-5">
            {categories.map((category, idx) => {
              const imgSrc = getCategoryImage(category);
              return (
                <Link
                  key={category.key}
                  to={category.link}
                  className="group relative aspect-[8/9] sm:aspect-auto sm:h-[210px] md:h-[240px] lg:h-[270px] rounded-lg sm:rounded-xl lg:rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-500 hover:-translate-y-1 isolate bg-[#1f2b13]"
                >
                  {/* Fallback Monogram Backing */}
                  <div className="absolute inset-0 bg-[#1f2b13] flex items-center justify-center">
                    <span className="text-white/20 font-display font-black text-3xl select-none">
                      {String(category.name).charAt(0)}
                    </span>
                  </div>

                  {/* Full Bleed Background Image with Error Graceful Degradation */}
                  {imgSrc && (
                    <img
                      src={imgSrc}
                      alt={category.name}
                      loading="lazy"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
                    />
                  )}

                  {/* Gradient Overlay for Text Legibility */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />

                  {/* Index Pill */}
                  <div className="absolute top-2 left-2 sm:top-3 sm:left-3 z-10">
                    <span className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-black/35 backdrop-blur-md text-white text-[10px] sm:text-[11px] font-bold flex items-center justify-center border border-white/25 shadow-xs">
                      0{idx + 1}
                    </span>
                  </div>

                  {/* Bottom Title */}
                  <div className="absolute bottom-0 inset-x-0 px-3 pb-3 pt-4 sm:px-4 sm:pb-3.5 lg:px-5 lg:pb-4 z-10 text-white flex flex-col justify-end">
                    <h3 className="font-display font-extrabold text-white text-[13px] sm:text-[17px] md:text-[20px] leading-tight group-hover:text-[#f7bb0e] transition-colors line-clamp-2">
                      {category.name}
                    </h3>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>
    </>
  );
});
