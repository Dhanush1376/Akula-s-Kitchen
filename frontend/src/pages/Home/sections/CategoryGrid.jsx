import { Link } from 'react-router-dom';
import { SectionHeader } from '../../../components/shared/SectionHeader';
import { useWebsiteContent } from '../../../hooks/useWebsiteContent';
import React, { useMemo } from 'react';
import { useActiveCategories } from '../../../hooks/useProductQueries';

const DEFAULT_CATEGORY_FALLBACK_IMAGES = {
  batters:
    'https://res.cloudinary.com/cftqgair/image/upload/v1793123124/akulas-kitchen/products/ykliysxhqcecv1ipyzjq.jpg',
  chutneys:
    'https://res.cloudinary.com/cftqgair/image/upload/v1793123125/akulas-kitchen/products/lbmarekwegbzfxauigxq.jpg',
  pickles:
    'https://res.cloudinary.com/cftqgair/image/upload/v1793123121/akulas-kitchen/products/ouv4ci03wehkucl4nrxk.jpg',
  masala:
    'https://res.cloudinary.com/cftqgair/image/upload/v1793123135/akulas-kitchen/products/luf8ibyw8shf168fgrsq.jpg',
  podis:
    'https://res.cloudinary.com/cftqgair/image/upload/v1793123135/akulas-kitchen/products/luf8ibyw8shf168fgrsq.jpg',
  snacks:
    'https://res.cloudinary.com/cftqgair/image/upload/v1793123134/akulas-kitchen/products/s5seblgvndbkjlhlthlv.jpg',
  namkeen:
    'https://res.cloudinary.com/cftqgair/image/upload/v1793123134/akulas-kitchen/products/s5seblgvndbkjlhlthlv.jpg',
  sweets:
    'https://res.cloudinary.com/cftqgair/image/upload/v1793123126/akulas-kitchen/products/uepc6xoknuoagrs3qtnt.jpg',
};

const getCategoryImage = (cat) => {
  const img = cat.image || cat.imageSrc || null;
  if (typeof img === 'string') {
    if (img.startsWith('/uploads/')) {
      const slug = String(cat.slug || cat.name || '')
        .toLowerCase()
        .trim();
      return DEFAULT_CATEGORY_FALLBACK_IMAGES[slug] || null;
    }
    return img;
  }
  const slug = String(cat?.slug || cat?.name || '')
    .toLowerCase()
    .trim();
  return DEFAULT_CATEGORY_FALLBACK_IMAGES[slug] || null;
};

export const CategoryGrid = React.memo(function CategoryGrid({ previewContent }) {
  const cms = useWebsiteContent();
  const activeCms = previewContent || cms;
  const config = activeCms?.categoryGrid || {};

  const { data: dbCategories = [], isLoading: isCategoriesLoading } = useActiveCategories();

  const categories = useMemo(() => {
    const adminConfigured =
      Array.isArray(config.categories) && config.categories.length > 0 ? config.categories : [];

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

    // If configured in backend admin portal (CMS), use them
    if (adminConfigured.length > 0) {
      return adminConfigured.map((cat, idx) => {
        const name = cat.title || cat.name || cat.categoryName || 'Category';
        const slug = (cat.slug || name).toLowerCase().trim();
        const dbMatch = dbMap.get(name.toLowerCase().trim()) || dbMap.get(slug);

        return {
          key: cat._id || cat.id || cat.key || `${slug}-${idx}`,
          name,
          slug,
          link: cat.link || `/collections?category=${encodeURIComponent(name)}`,
          image: cat.image || cat.imageSrc || dbMatch?.imageSrc || null,
        };
      });
    }

    // Otherwise, render all active database categories sorted by displayOrder
    const sorted = [...activeDbCategories].sort((a, b) => {
      const orderA = typeof a === 'object' && a?.displayOrder != null ? a.displayOrder : 0;
      const orderB = typeof b === 'object' && b?.displayOrder != null ? b.displayOrder : 0;
      return orderA - orderB;
    });

    return sorted.map((cat, idx) => {
      const name = cat.name || cat.title || 'Category';
      const slug = (cat.slug || name).toLowerCase().trim();
      return {
        key: cat._id || cat.id || slug || idx,
        name,
        slug,
        link: `/collections?category=${encodeURIComponent(name)}`,
        image: cat.imageSrc || cat.image || null,
      };
    });
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
    <section className="ak-cats py-6 sm:py-8 lg:py-12">
      <div className="h1-container">
        {/* Header Section */}
        <SectionHeader
          kicker={config.sectionSubtitle || ''}
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
  );
});
