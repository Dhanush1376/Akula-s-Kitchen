/* eslint-disable unused-imports/no-unused-imports */
import React, { useState, useEffect } from 'react';
import { m as motion } from 'framer-motion';
import { WishlistView } from '../components/wishlist/WishlistView';
import { SEO } from '../components/seo/SEO';
import { useConfig } from '../context/ConfigContext';

export function Wishlist() {
  const { storeName } = useConfig();
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
