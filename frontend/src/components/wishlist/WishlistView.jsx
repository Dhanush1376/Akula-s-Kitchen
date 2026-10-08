import { CheckCircle2, Heart, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useMemo, useEffect } from 'react';
import { useWishlist } from '../../context/WishlistContext';
import { useCart } from '../../context/CartContext';
import { useRecommendationTracker } from '../../hooks/useRecommendationTracker';
import { SEO } from '../seo/SEO';
import { ProductCard } from '../shared/ProductCard';
import { QuickViewModal } from '../ui/QuickViewModal';
import { WishlistPageSkeleton } from '../ui/Skeleton';
import { useConfig } from '../../context/ConfigContext';
import { RecommendationSystem } from '../sections/RecommendationSystem';
import { WishlistEmptyState } from './WishlistEmptyState';
import { WishlistLeaf } from './WishlistLeaf';

export function WishlistView({ isEmbedded = false }) {
  const { storeName } = useConfig();
  const { items, _removeItem, _toggleItem, loading: wishlistLoading } = useWishlist();
  const { addItem: _addToCart } = useCart();

  const [selectedCategory, setSelectedCategory] = useState(null);
  const [quickViewProduct, setQuickViewProduct] = useState(null);
  const [notification, setNotification] = useState('');

  // Retain initial top scroll position when loading transitions to loaded view
  useEffect(() => {
    if (!wishlistLoading && !isEmbedded) {
      if (typeof window !== 'undefined' && window.scrollY > 0 && window.scrollY < 250) {
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      }
    }
  }, [wishlistLoading, isEmbedded]);

  // Track wishlist view
  useRecommendationTracker({
    targetType: 'page',
    targetId: 'wishlist',
    source: 'wishlist',
  });

  const shouldShowRecommendations = items.length === 0;

  const _triggerNotification = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(''), 3000);
  };

  const enhancedItems = useMemo(() => {
    return items.map((item) => ({
      ...item,
      id: item.id || item._id,
      category: item.category?.name || item.category || 'Kitchen & Dining',
      imageSrc: item.imageSrc || item.image || item.images?.[0] || '',
      quantity: item.quantity !== undefined ? item.quantity : 1,
    }));
  }, [items]);

  // Dynamic category list from items
  const categoriesList = useMemo(() => {
    const map = new Map();
    enhancedItems.forEach((item) => {
      if (!map.has(item.category)) {
        map.set(item.category, item.imageSrc);
      }
    });

    return Array.from(map.entries()).map(([name, image]) => ({
      name,
      image,
    }));
  }, [enhancedItems]);

  // Search & Filter logic
  const filteredItems = useMemo(() => {
    let result = [...enhancedItems];

    if (selectedCategory) {
      result = result.filter((item) => item.category === selectedCategory);
    }

    const hasAddedAt = result.some((item) => item.addedAt);
    if (hasAddedAt) {
      result.sort((a, b) => {
        if (!a.addedAt && !b.addedAt) return 0;
        if (!a.addedAt) return 1;
        if (!b.addedAt) return -1;
        return new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime();
      });
    }
    return result;
  }, [enhancedItems, selectedCategory]);

  if (wishlistLoading) {
    return <WishlistPageSkeleton />;
  }

  const containerClasses = isEmbedded
    ? 'w-full text-on-surface'
    : 'max-w-[1440px] mx-auto px-4 sm:px-8';

  return (
    <div className="relative w-full">
      {/* Decorative banana leaf at the top of the page, with or without saved items */}
      {!isEmbedded && <WishlistLeaf />}

      {!isEmbedded && (
        <SEO
          title="My Wishlist"
          description={`A private collection of your favorite ${storeName} culinary and home products.`}
        />
      )}

      {/* Toast Notification */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed top-28 left-1/2 -translate-x-1/2 z-[100] bg-white/95 backdrop-blur-md border border-[#ede8e1] text-neutral-900 px-5 py-2.5 rounded-full shadow-lg text-[12px] font-semibold tracking-wide flex items-center gap-2 whitespace-nowrap"
          >
            <CheckCircle2 className="w-4 h-4 text-[#283618]" strokeWidth={2} />
            {notification}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Wishlist Content */}
      <div className={containerClasses}>
        <div
          className={`relative z-10 mt-5 sm:mt-8${
            !isEmbedded && enhancedItems.length > 0 ? ' wl-leaf-clearance' : ''
          }`}
        >
          {/* Header Row: Title, Item Count & Controls */}
          {enhancedItems.length > 0 && (
            <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
              <div className="flex items-center gap-3 md:gap-4">
                <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-[44px] font-extrabold tracking-tight text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)] leading-none">
                  Wishlist
                </h1>
              </div>
            </div>
          )}

          {/* Category Filter Pills */}
          {enhancedItems.length > 0 && categoriesList.length > 1 && (
            <div className="mb-6 overflow-x-auto scrollbar-none py-1">
              <div className="flex items-center gap-2 min-w-max">
                <button
                  type="button"
                  onClick={() => setSelectedCategory(null)}
                  className={`h-9 px-3.5 sm:px-4 rounded-full text-xs font-semibold tracking-wide transition-all cursor-pointer border flex items-center gap-2 ${
                    !selectedCategory
                      ? 'bg-[#283618] text-white border-[#283618] shadow-xs'
                      : 'bg-white text-neutral-700 border-[#ede8e1] hover:border-neutral-400 hover:bg-neutral-50'
                  }`}
                >
                  <span>All</span>
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none transition-colors ${
                      !selectedCategory
                        ? 'bg-white/20 text-white'
                        : 'bg-neutral-100 text-neutral-700 border border-neutral-200/60'
                    }`}
                  >
                    {enhancedItems.length}
                  </span>
                </button>
                {categoriesList.map((cat) => {
                  const isActive = selectedCategory === cat.name;
                  const catCount = enhancedItems.filter((i) => i.category === cat.name).length;
                  return (
                    <button
                      key={cat.name}
                      type="button"
                      onClick={() => setSelectedCategory(isActive ? null : cat.name)}
                      className={`h-9 px-3.5 sm:px-4 rounded-full text-xs font-semibold tracking-wide transition-all cursor-pointer border flex items-center gap-2 ${
                        isActive
                          ? 'bg-[#283618] text-white border-[#283618] shadow-xs'
                          : 'bg-white text-neutral-700 border-[#ede8e1] hover:border-neutral-400 hover:bg-neutral-50'
                      }`}
                    >
                      <span>{cat.name}</span>
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none transition-colors ${
                          isActive
                            ? 'bg-white/20 text-white'
                            : 'bg-neutral-100 text-neutral-700 border border-neutral-200/60'
                        }`}
                      >
                        {catCount}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Empty State */}
          {enhancedItems.length === 0 ? (
            <WishlistEmptyState />
          ) : filteredItems.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center min-h-[35vh] py-10 text-center bg-white rounded-3xl border border-[#ede8e1] p-6 max-w-lg mx-auto shadow-2xs"
            >
              <div className="w-16 h-16 rounded-full bg-neutral-50 border border-[#ede8e1] flex items-center justify-center mb-4">
                <Heart className="w-6 h-6 text-neutral-400" strokeWidth={1.5} />
              </div>
              <h3 className="text-xl font-bold text-[#283618] mb-1.5">No items in this category</h3>
              <p className="text-neutral-500 text-xs max-w-xs mb-5">
                You don't have any items in "{selectedCategory}" in your wishlist.
              </p>
              <button
                type="button"
                onClick={() => setSelectedCategory(null)}
                className="inline-flex items-center justify-between gap-3 pl-5 pr-1.5 py-1 min-h-[42px] rounded-full bg-[#283618] hover:bg-[#1f2a13] text-white text-xs font-bold uppercase tracking-wider transition-all cursor-pointer group active:scale-[0.98] shadow-xs"
              >
                <span>View All Saved Items</span>
                <span className="w-7 h-7 rounded-full bg-white text-[#283618] flex items-center justify-center shrink-0 shadow-xs transition-transform duration-200 group-hover:scale-105">
                  <ArrowRight
                    className="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-0.5"
                    strokeWidth={2.5}
                    aria-hidden="true"
                  />
                </span>
              </button>
            </motion.div>
          ) : (
            <motion.div
              layout
              className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6"
            >
              <AnimatePresence>
                {filteredItems.map((item) => (
                  <ProductCard
                    key={`wishlist-item-${item.id}`}
                    {...item}
                    layoutMode="wishlist"
                    onQuickView={(e) => {
                      if (window.innerWidth >= 768) {
                        e.preventDefault();
                        setQuickViewProduct(item);
                      }
                    }}
                  />
                ))}
              </AnimatePresence>
            </motion.div>
          )}
        </div>

        {/* Recommendations - matching the Product Detail page */}
        {shouldShowRecommendations && (
          <div className="pt-2 pb-8 mt-6 relative z-0">
            <RecommendationSystem
              targetType="product"
              compact={false}
              hideChefDivider={true}
              containerClassName="w-full relative z-10"
            />
          </div>
        )}
      </div>

      {/* Quick View Modal */}
      <QuickViewModal
        isOpen={!!quickViewProduct}
        onClose={() => setQuickViewProduct(null)}
        product={quickViewProduct}
      />
    </div>
  );
}
