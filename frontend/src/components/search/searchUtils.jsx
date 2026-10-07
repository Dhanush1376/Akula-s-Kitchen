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

export const getStockLabel = (status) => {
  if (!status) return null;
  const s = status.toLowerCase();
  if (s === 'in stock' || s === 'instock')
    return { label: 'In Stock', color: 'text-green-600', dot: 'bg-green-500' };
  if (s === 'low stock' || s === 'low')
    return { label: 'Low Stock', color: 'text-amber-600', dot: 'bg-amber-500' };
  if (s === 'out of stock' || s === 'outofstock')
    return { label: 'Out of Stock', color: 'text-red-500', dot: 'bg-red-500' };
  return null;
};

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
