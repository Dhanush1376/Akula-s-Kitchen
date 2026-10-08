import { ArrowUp } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { m as motion, AnimatePresence } from 'framer-motion';

export function ScrollToTopButton() {
  const { pathname } = useLocation();
  const [isVisible, setIsVisible] = useState(false);

  const isHiddenRoute =
    pathname === '/cart' ||
    pathname.startsWith('/cart') ||
    pathname === '/checkout' ||
    pathname.startsWith('/checkout');

  useEffect(() => {
    if (isHiddenRoute) return;

    const toggleVisibility = () => {
      if (window.scrollY > 500) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener('scroll', toggleVisibility, { passive: true });
    return () => window.removeEventListener('scroll', toggleVisibility);
  }, [isHiddenRoute]);

  if (isHiddenRoute) {
    return null;
  }

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.button
          layout
          initial={{ opacity: 0, scale: 0.8, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: 20 }}
          transition={{
            layout: { type: 'spring', damping: 25, stiffness: 300 },
            opacity: { duration: 0.3, ease: 'easeOut' },
            scale: { duration: 0.3, ease: 'easeOut' },
            y: { duration: 0.3, ease: 'easeOut' },
          }}
          onClick={scrollToTop}
          className="relative pointer-events-auto shrink-0 z-50 w-10 h-10 sm:w-11 sm:h-11 bg-white/95 backdrop-blur-md border border-black/10 text-neutral-800 shadow-md hover:shadow-lg rounded-full flex items-center justify-center cursor-pointer transition-all hover:bg-white active:scale-95 group"
          aria-label="Scroll to top"
        >
          <ArrowUp
            className="w-4.5 h-4.5 sm:w-5 sm:h-5 text-neutral-700 group-hover:-translate-y-0.5 transition-transform"
            strokeWidth={2}
          />
        </motion.button>
      )}
    </AnimatePresence>
  );
}
