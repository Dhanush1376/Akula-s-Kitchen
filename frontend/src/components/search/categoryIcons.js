import { Candy, Citrus, Cookie, CookingPot, Flame, Leaf, Nut, Salad, Wheat } from 'lucide-react';

/** Line icon for a category name, matched on the kind of food it holds. */
const ICONS = [
  [/batter/, CookingPot],
  [/chutney/, Salad],
  [/pickle|achar|avakaya|avakaaya/, Citrus],
  [/podi|powder/, Wheat],
  [/masala|spice/, Flame],
  [/namkeen|mixture|cashew|nut/, Nut],
  [/snack|murukk|chakli/, Cookie],
  [/sweet|dessert|laddu|mithai/, Candy],
];

export const categoryIcon = (name) => {
  const key = String(name || '').toLowerCase();
  return ICONS.find(([pattern]) => pattern.test(key))?.[1] || Leaf;
};

/** Warm, food-toned tints that cycle across category tiles. */
export const CATEGORY_TINTS = [
  '#fbf0d2',
  '#e7eedb',
  '#f8e4d6',
  '#e1ecd8',
  '#f3ead7',
  '#fdecbc',
  '#e9eedd',
  '#f6e6cf',
];

/** Things people actually look for, used for the rolling placeholder. */
export const SEARCH_HINTS = [
  'idli batter',
  'avakaaya',
  'gongura pickle',
  'karam podi',
  'ragi murukulu',
  'dosa batter',
  'sweets',
];
