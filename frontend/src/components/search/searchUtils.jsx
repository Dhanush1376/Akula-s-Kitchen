import React from 'react';

export const getTypeIcon = (type) => {
  switch (type) {
    case 'product':
      return 'shopping_bag';
    case 'category':
      return 'category';
    default:
      return 'search';
  }
};

export const getTypeLabel = (type) => {
  switch (type) {
    case 'product':
      return 'Product';
    case 'category':
      return 'Category';
    default:
      return 'Search';
  }
};

const regexCache = new Map();

export const highlightMatch = (text, searchQuery) => {
  if (!searchQuery || searchQuery.length < 1) return text;
  const key = searchQuery.toLowerCase();
  let regex = regexCache.get(key);
  if (!regex) {
    regex = new RegExp(`(${searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    if (regexCache.size > 50) regexCache.clear();
    regexCache.set(key, regex);
  }
  const parts = text.split(regex);
  return parts.map((part, i) =>
    regex.test(part) ? (
      <mark key={i} className="bg-primary/15 text-primary rounded-sm px-0.5 font-semibold">
        {part}
      </mark>
    ) : (
      part
    ),
  );
};

export const getStockLabel = () => null;

export const formatDiscount = (discount) => {
  if (!discount || discount <= 0) return null;
  return `${discount}% OFF`;
};

export const formatPrice = (val) => {
  if (val == null) return '';
  const num = typeof val === 'number' ? val : parseFloat(String(val).replace(/[^\d.-]/g, ''));
  return isNaN(num) ? '' : `₹${num.toLocaleString('en-IN')}`;
};

export const fallbackCollections = [];

export const getCollectionIcon = () => 'category';
