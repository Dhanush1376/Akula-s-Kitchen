/* eslint-disable unused-imports/no-unused-imports */
import React, { useState, useEffect } from 'react';
import { m as motion } from 'framer-motion';
import { WishlistView } from '../components/wishlist/WishlistView';
import { SEO } from '../components/seo/SEO';
import { useConfig } from '../context/ConfigContext';

export function Wishlist() {
  const { storeName } = useConfig();

  // Guarantee that navigating to Wishlist always opens at initial top point
  useEffect(() => {
    const scrollToInitialPoint = () => {
      try {
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      } catch {
        window.scrollTo(0, 0);
      }
      if (document.documentElement && document.documentElement.scrollTop !== 0) {
        document.documentElement.scrollTop = 0;
      }
      if (document.body && document.body.scrollTop !== 0) {
        document.body.scrollTop = 0;
      }
    };

    scrollToInitialPoint();
    const frameId = requestAnimationFrame(scrollToInitialPoint);
    const t1 = setTimeout(scrollToInitialPoint, 50);
    const t2 = setTimeout(scrollToInitialPoint, 150);

    return () => {
      cancelAnimationFrame(frameId);
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="bg-surface min-h-screen pt-[calc(var(--ak-header-h,115px)+20px)] pb-32 font-sans text-neutral-900 relative overflow-hidden"
    >
      <SEO
        title="Wishlist"
        description={`Your saved items at ${storeName || "Akula's Kitchen"}.`}
        noindex
      />
      <div className="relative z-10">
        <WishlistView isEmbedded={false} />
      </div>
    </motion.div>
  );
}
