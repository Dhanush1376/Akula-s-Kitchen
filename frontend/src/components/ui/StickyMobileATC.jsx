import { Check, ShoppingBag } from 'lucide-react';
import { m as motion, AnimatePresence } from 'framer-motion';
import React from 'react';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { formatPrice } from '../../utils/ecommerce/priceUtils';

export function StickyMobileATC({ product, triggerRef }) {
  const { addItem, setIsCartOpen } = useCart();
  const { runProtectedAction } = useAuth();
  const [added, setAdded] = React.useState(false);
  const [isVisible, setIsVisible] = React.useState(false);
  const [isScrollingDown, setIsScrollingDown] = React.useState(false);
  const lastScrollY = React.useRef(0);

  const productId = product?._id || product?.id;

  React.useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      // Use 10px threshold to avoid tiny jitter or bounce triggers
      if (Math.abs(currentScrollY - lastScrollY.current) > 10) {
        if (currentScrollY > lastScrollY.current && currentScrollY > 100) {
          setIsScrollingDown(true);
        } else {
          setIsScrollingDown(false);
        }
      }
      lastScrollY.current = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  React.useEffect(() => {
    if (!triggerRef?.current) {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        // Show sticky bar only when main button is NOT intersecting
        setIsVisible(!entry.isIntersecting);
      },
      { threshold: 0 },
    );

    observer.observe(triggerRef.current);
    return () => observer.disconnect();
  }, [triggerRef]);

  // Coordinate with BottomNav: hide it when this sticky ATC is visible to avoid tap conflicts
  React.useEffect(() => {
    if (isVisible && !isScrollingDown) {
      document.body.classList.add('sticky-atc-active');
    } else {
      document.body.classList.remove('sticky-atc-active');
    }
    return () => document.body.classList.remove('sticky-atc-active');
  }, [isVisible, isScrollingDown]);

  const handleAddToCart = () => {
    addItem({
      id: productId,
      title: product.title,
      price: product.price,
      imageSrc: product.imageSrc || product.image,
      formattedPrice: `Rs. ${product.price?.toLocaleString()}`,
      quantity: 1,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  const oldPrice =
    product?.strikingPrice || product?.oldPrice || product?.originalPrice || product?.mrp;

  return (
    <AnimatePresence>
      {isVisible && !isScrollingDown && (
        <motion.div
          initial={{ y: 150, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 150, opacity: 0 }}
          transition={{ type: 'spring', damping: 28, stiffness: 220 }}
          className="sticky-mobile-atc fixed bottom-0 left-0 w-full h-[calc(70px+var(--safe-area-bottom,_env(safe-area-inset-bottom,_0px)))] z-[100] lg:hidden bg-white/95 backdrop-blur-xl border-t border-black/10 px-5 pb-[var(--safe-area-bottom,_env(safe-area-inset-bottom,_0px))] flex items-center justify-between gap-3 shadow-[0_-8px_30px_rgba(0,0,0,0.08)] select-none"
        >
          <div className="flex flex-col truncate">
            <span className="text-[9px] uppercase tracking-[0.2em] text-neutral-400 font-extrabold leading-none">
              Price
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <p
                className="font-serif-heading font-extrabold text-[19px] text-neutral-950 leading-none"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                ₹{formatPrice(product?.price)}
              </p>
              {oldPrice > 0 && oldPrice > product?.price && (
                <p
                  className="font-serif-heading font-medium text-[12px] text-neutral-400 line-through leading-none"
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  ₹{formatPrice(oldPrice)}
                </p>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={added ? undefined : handleAddToCart}
            disabled={added}
            className={`h-11 px-5 rounded-full text-[11px] uppercase tracking-wider font-extrabold shadow-[0_1.5px_0_0_#d99b00,0_2px_4px_rgba(0,0,0,0.06)] active:scale-[0.97] transition-all flex items-center justify-center gap-2 shrink-0 cursor-pointer border-[1.5px] ${
              added
                ? 'bg-black text-[#f7bb0e] border-black'
                : 'bg-[#f7bb0e] text-neutral-950 hover:bg-[#eab00d] border-[#f7bb0e]'
            }`}
            aria-label={`Add ${product?.title || 'product'} to bag`}
          >
            <AnimatePresence mode="wait">
              {added ? (
                <motion.span
                  key="added"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4 text-[#f7bb0e]" strokeWidth={2.5} />
                  <span>Added</span>
                </motion.span>
              ) : (
                <motion.span
                  key="add"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="flex items-center gap-1.5"
                >
                  <ShoppingBag className="w-4 h-4" strokeWidth={2} />
                  <span>Add to Bag</span>
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
