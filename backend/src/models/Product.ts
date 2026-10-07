import mongoose, { Schema } from 'mongoose';
import SoftDeletePlugin, { ISoftDeleted, SoftDeleteModel } from '../utils/SoftDeletePlugin';
import { indexProduct } from '../services/search/searchIndexer';
import logger from '../config/logger';
import './Category'; // Ensure Category model is registered since Product depends on it

export interface IProductOption {
  _id?: mongoose.Types.ObjectId | string;
  id?: string;
  optionId?: string;
  label: string;
  value: string;
  priceAdjustment: number;
  available: boolean;
  default?: boolean;
  isDefault?: boolean;
  sortOrder: number;
}

export interface IProductOptionGroup {
  _id?: mongoose.Types.ObjectId | string;
  id?: string;
  groupId?: string;
  name: string;
  type: 'SINGLE_SELECT' | 'MULTI_SELECT' | 'OPTIONAL_SINGLE_SELECT';
  required: boolean;
  minSelections?: number;
  maxSelections?: number;
  displayStyle?: 'RADIO_CARDS' | 'CHECKBOX_CARDS' | 'DROPDOWN' | 'BUTTON_GROUP' | string;
  sortOrder: number;
  options: IProductOption[];
}

export interface IProduct extends ISoftDeleted {
  title: string;
  customerNote?: string;
  slug: string;
  primaryCategory: mongoose.Types.ObjectId;
  secondaryCategories: mongoose.Types.ObjectId[];
  material?: string;
  tags: string[];
  tagIds: mongoose.Types.ObjectId[];
  price: number;
  oldPrice?: number;
  rating: number;
  reviews: number;
  views: number;
  sold: number;
  imageSrc: string;
  images: string[];
  description: string;
  badges: string[];
  dimensions?: string;
  weight?: string;
  seoTitle?: string;
  seoDescription?: string;
  stock: number;
  reservedStock: number;
  inventory?: {
    available: number;
    reserved: number;
    production: number;
    packing: number;
    transit: number;
    maintenance: number;
    returned: number;
    damaged: number;
    lost: number;
    qualityHold: number;
  };
  sku?: string;
  barcode?: string;
  productUuid?: string;
  qrCode?: string;
  qrSignature?: string;
  warehouseLocations?: {
    warehouseId: string;
    zoneId: string;
    aisleId: string;
    shelfId: string;
    binId: string;
    fullPath: string;
    quantity: number;
  }[];
  batchNumber?: string;
  manufacturingDate?: Date;
  preparationTimeDays?: number;
  maxStock?: number;
  fragilityLevel?: number;
  packageSize?: 'small' | 'medium' | 'large' | 'oversized';
  version: number;
  lowStockThreshold: number;
  featured: boolean;
  isActive: boolean;
  isNonRefundable: boolean;
  variants: {
    id: string | number;
    name: string;
    value: string;
    valueId?: mongoose.Types.ObjectId;
    price?: number | string;
    stock?: number | string;
  }[];
  // Generic Product Configuration / Options Engine
  optionGroups?: IProductOptionGroup[];
  // AI metadata
  aiTags?: string[];
  aiCategory?: string;
  aiAttributes?: Record<string, string>;
  imageHash?: string;

  // Return Settings
  returnSettings?: {
    returnWindow?: number;
    exchangeWindow?: number;
    refundType?: 'full' | 'partial' | 'store_credit' | 'no_refund';
    restockingFeePercent?: number;
    returnShippingFee?: number;
    inspectionRequired?: boolean;
    replacementAllowed?: boolean;
  };

  createdAt: Date;
  updatedAt: Date;
}

const ProductOptionSchema = new Schema(
  {
    optionId: { type: String, trim: true },
    label: { type: String, required: true, trim: true },
    value: { type: String, required: true, trim: true },
    priceAdjustment: { type: Number, default: 0 },
    available: { type: Boolean, default: true },
    default: { type: Boolean, default: false },
    isDefault: { type: Boolean, default: false },
    sortOrder: { type: Number, default: 0 },
  },
  { _id: true },
);

const ProductOptionGroupSchema = new Schema(
  {
    groupId: { type: String, trim: true },
    name: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ['SINGLE_SELECT', 'MULTI_SELECT', 'OPTIONAL_SINGLE_SELECT'],
      default: 'SINGLE_SELECT',
    },
    required: { type: Boolean, default: false },
    minSelections: { type: Number, default: 0 },
    maxSelections: { type: Number, default: 0 },
    displayStyle: {
      type: String,
      enum: ['RADIO_CARDS', 'CHECKBOX_CARDS', 'DROPDOWN', 'BUTTON_GROUP'],
      default: 'RADIO_CARDS',
    },
    sortOrder: { type: Number, default: 0 },
    options: { type: [ProductOptionSchema], default: [] },
  },
  { _id: true },
);

const ProductSchema: Schema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    customerNote: { type: String, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    primaryCategory: { type: Schema.Types.ObjectId, ref: 'Category', required: true },
    secondaryCategories: [{ type: Schema.Types.ObjectId, ref: 'Category' }],
    material: { type: String, trim: true },
    tags: [{ type: String, trim: true }],
    tagIds: [{ type: Schema.Types.ObjectId, ref: 'CatalogValue' }],
    price: { type: Number, required: true, min: 0 },
    oldPrice: { type: Number, min: 0 },
    rating: { type: Number, default: 0, min: 0, max: 5 },
    reviews: { type: Number, default: 0 },
    views: { type: Number, default: 0 },
    sold: { type: Number, default: 0 },
    imageSrc: { type: String, required: true },
    images: [{ type: String }],
    description: { type: String, required: true },
    badges: [{ type: String }],
    dimensions: { type: String },
    weight: { type: String },
    seoTitle: { type: String },
    seoDescription: { type: String },
    stock: { type: Number, default: 0, min: 0 },
    reservedStock: { type: Number, default: 0, min: 0 },
    inventory: {
      available: { type: Number, default: 0 },
      reserved: { type: Number, default: 0 },
      production: { type: Number, default: 0 },
      packing: { type: Number, default: 0 },
      transit: { type: Number, default: 0 },
      maintenance: { type: Number, default: 0 },
      returned: { type: Number, default: 0 },
      damaged: { type: Number, default: 0 },
      lost: { type: Number, default: 0 },
      qualityHold: { type: Number, default: 0 },
    },
    sku: { type: String, unique: true, sparse: true, index: true },
    barcode: { type: String, unique: true, sparse: true, index: true },
    productUuid: { type: String, index: true },
    qrCode: { type: String },
    qrSignature: { type: String },
    warehouseLocations: [
      {
        warehouseId: { type: String },
        zoneId: { type: String },
        aisleId: { type: String },
        shelfId: { type: String },
        binId: { type: String },
        fullPath: { type: String },
        quantity: { type: Number, default: 0 },
      },
    ],
    batchNumber: { type: String },
    manufacturingDate: { type: Date },
    preparationTimeDays: { type: Number, default: 3 },
    maxStock: { type: Number },
    fragilityLevel: { type: Number, min: 1, max: 5, default: 1 },
    packageSize: {
      type: String,
      enum: ['small', 'medium', 'large', 'oversized'],
      default: 'medium',
    },
    version: { type: Number, default: 1 },
    lowStockThreshold: { type: Number, default: 5, min: 0 },
    featured: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    isNonRefundable: { type: Boolean, default: true },
    variants: [
      {
        id: { type: Schema.Types.Mixed },
        name: { type: String, required: true },
        value: { type: String, required: true },
        valueId: { type: Schema.Types.ObjectId, ref: 'CatalogValue' },
        price: { type: Schema.Types.Mixed },
        stock: { type: Schema.Types.Mixed },
      },
    ],
    optionGroups: { type: [ProductOptionGroupSchema], default: [] },
    // AI metadata
    aiTags: [{ type: String, trim: true }],
    aiCategory: { type: String, trim: true },
    aiAttributes: { type: Schema.Types.Mixed, default: {} },
    imageHash: { type: String, trim: true, index: true },

    // Return Settings
    returnSettings: {
      returnWindow: { type: Number, default: null },
      exchangeWindow: { type: Number, default: null },
      refundType: {
        type: String,
        enum: ['full', 'partial', 'store_credit', 'no_refund'],
        default: 'full',
      },
      restockingFeePercent: { type: Number, default: 0 },
      returnShippingFee: { type: Number, default: 0 },
      inspectionRequired: { type: Boolean, default: true },
      replacementAllowed: { type: Boolean, default: true },
    },
  },
  {
    timestamps: true,
  },
);

// Indexes
ProductSchema.index(
  { title: 'text', description: 'text', tags: 'text' },
  {
    name: 'FullTextIndex',
    weights: { title: 10, tags: 5, description: 1 },
  },
);
ProductSchema.index({ primaryCategory: 1 });
ProductSchema.index({ secondaryCategories: 1 });
ProductSchema.index({ featured: 1 });
ProductSchema.index({ isActive: 1 });
ProductSchema.index({ slug: 1, isActive: 1 });

// High-Performance Production Compound Indexes
ProductSchema.index({ isActive: 1, primaryCategory: 1, price: 1 });
ProductSchema.index({ isActive: 1, primaryCategory: 1, price: -1 });
ProductSchema.index({ isActive: 1, primaryCategory: 1, rating: -1 });
ProductSchema.index({ isActive: 1, primaryCategory: 1, createdAt: -1 });
ProductSchema.index({ isActive: 1, secondaryCategories: 1, createdAt: -1 });
ProductSchema.index({ isActive: 1, featured: 1, createdAt: -1 });

// Sitemap Auto-Update Trigger
import { triggerSitemapUpdate } from '../utils/sitemapGenerator';
import ForensicAuditPlugin from '../utils/ForensicAuditPlugin';
import { AssetLifecyclePlugin } from '../utils/AssetLifecyclePlugin';

ProductSchema.post('save', () => {
  triggerSitemapUpdate();
});

ProductSchema.post('save', async function (doc) {
  try {
    if (!doc.deletedAt) {
      await indexProduct(doc);
    }
  } catch (err: any) {
    logger.error(`[Search Indexer] Failed to index product: ${err.message}`);
  }
});

ProductSchema.post('findOneAndUpdate', async function (doc) {
  try {
    if (doc && !doc.deletedAt) {
      await indexProduct(doc);
    }
  } catch (err: any) {
    logger.error(`[Search Indexer] Failed to index product on update: ${err.message}`);
  }
});

ProductSchema.plugin(SoftDeletePlugin);
ProductSchema.plugin(ForensicAuditPlugin);
ProductSchema.plugin(AssetLifecyclePlugin, {
  tier: 3,
  assetFields: [
    { path: 'imageSrc', type: 'single', resourceType: 'image' },
    { path: 'images', type: 'array', resourceType: 'image' },
  ],
});

const Product = mongoose.model<IProduct, SoftDeleteModel<IProduct>>('Product', ProductSchema);
export default Product;
