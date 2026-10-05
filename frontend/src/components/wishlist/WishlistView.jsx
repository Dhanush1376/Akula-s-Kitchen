import { CheckCircle2, Heart, ShoppingBag } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useWishlist } from '../../context/WishlistContext';
import { useCart } from '../../context/CartContext';
import { useRecommendationTracker } from '../../hooks/useRecommendationTracker';
import { SEO } from '../seo/SEO';
import { ProductCard } from '../shared/ProductCard';
import { QuickViewModal } from '../ui/QuickViewModal';
import { WishlistPageSkeleton } from '../ui/Skeleton';
import { useConfig } from '../../context/ConfigContext';
import { RecommendationSystem } from '../sections/RecommendationSystem';

export function WishlistView({ isEmbedded = false }) {
  const { storeName } = useConfig();
  const { items, _removeItem, _toggleItem, loading: wishlistLoading } = useWishlist();
  const { addItem: _addToCart } = useCart();

  const [selectedCategory, setSelectedCategory] = useState(null);
  const [quickViewProduct, setQuickViewProduct] = useState(null);
  const [notification, setNotification] = useState('');

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
    <div className="w-full">
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
        <div className="relative z-0 mt-5 sm:mt-8">
          {/* Header Row: Title, Item Count & Controls */}
          {enhancedItems.length > 0 && (
            <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#ede8e1]">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#283618]">
                  Wishlist
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#283618]/10 text-[#283618] border border-[#283618]/20">
                  {enhancedItems.length} {enhancedItems.length === 1 ? 'item' : 'items'}
                </span>
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
                  className={`h-9 px-4 rounded-full text-xs font-semibold tracking-wide transition-all cursor-pointer border ${
                    !selectedCategory
                      ? 'bg-[#283618] text-white border-[#283618] shadow-xs'
                      : 'bg-white text-neutral-700 border-[#ede8e1] hover:border-neutral-400 hover:bg-neutral-50'
                  }`}
                >
                  All ({enhancedItems.length})
                </button>
                {categoriesList.map((cat) => {
                  const isActive = selectedCategory === cat.name;
                  const catCount = enhancedItems.filter((i) => i.category === cat.name).length;
                  return (
                    <button
                      key={cat.name}
                      type="button"
                      onClick={() => setSelectedCategory(isActive ? null : cat.name)}
                      className={`h-9 px-4 rounded-full text-xs font-semibold tracking-wide transition-all cursor-pointer border flex items-center gap-1.5 ${
                        isActive
                          ? 'bg-[#283618] text-white border-[#283618] shadow-xs'
                          : 'bg-white text-neutral-700 border-[#ede8e1] hover:border-neutral-400 hover:bg-neutral-50'
                      }`}
                    >
                      <span>{cat.name}</span>
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                          isActive ? 'bg-white/20 text-white' : 'bg-neutral-100 text-neutral-600'
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
            <div className="space-y-12">
              <div className="flex flex-col items-center justify-center min-h-[50vh] py-12 text-center bg-white rounded-3xl border border-[#ede8e1] p-8 max-w-2xl mx-auto shadow-2xs">
                <div className="w-20 h-20 rounded-full bg-neutral-50 border border-[#ede8e1] flex items-center justify-center mb-5 text-[#283618]">
                  <Heart className="w-8 h-8 text-[#283618]" strokeWidth={1.5} />
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold text-[#283618] mb-2">
                  Your wishlist is empty
                </h2>
                <p className="text-neutral-500 text-xs sm:text-sm font-normal max-w-sm mb-6 leading-relaxed">
                  Explore our batters, fresh podis, and pickles to save them for later.
                </p>
                <Link
                  to="/shop"
                  className="inline-flex items-center gap-2 h-11 px-6 rounded-full bg-[#283618] hover:bg-[#1f2a13] text-white text-xs font-bold uppercase tracking-wider transition-all shadow-xs active:scale-95"
                >
                  <ShoppingBag className="w-4 h-4" strokeWidth={2} />
                  Explore Shop
                </Link>
              </div>
            </div>
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
                className="h-9 px-4 rounded-full bg-[#283618] hover:bg-[#1f2a13] text-white text-xs font-semibold transition-all cursor-pointer"
              >
                View All Saved Items
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
