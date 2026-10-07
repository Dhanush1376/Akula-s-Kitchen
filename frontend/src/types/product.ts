/**
 * Canonical Product and Catalog Domain Types
 */

export interface ProductImage {
  url: string;
  publicId?: string;
  altText?: string;
  isPrimary?: boolean;
}

export interface ProductCategory {
  _id: string;
  id?: string;
  name: string;
  slug: string;
  description?: string;
  imageUrl?: string;
  isActive: boolean;
  itemCount?: number;
}

export interface PricingTier {
  minQty: number;
  maxQty?: number;
  discountPercentage?: number;
  unitPrice: number;
}

export interface Product {
  _id: string;
  id?: string;
  name: string;
  slug: string;
  sku: string;
  description: string;
  shortDescription?: string;
  price: number;
  compareAtPrice?: number;
  images: ProductImage[];
  category: string | ProductCategory;
  tags?: string[];
  stock: number;
  pricingTiers?: PricingTier[];
  isCustomizable?: boolean;
  averageRating?: number;
  totalReviews?: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}
