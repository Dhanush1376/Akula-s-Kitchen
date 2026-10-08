import { z } from 'zod';

export const productOptionSchema = z.object({
  _id: z.any().optional(),
  id: z.string().optional(),
  optionId: z.string().optional(),
  label: z.string().min(1, 'Option label is required'),
  value: z.string().min(1, 'Option value is required'),
  priceAdjustment: z.number().default(0),
  available: z.boolean().default(true),
  default: z.boolean().optional(),
  isDefault: z.boolean().optional(),
  sortOrder: z.number().default(0),
});

export const productOptionGroupSchema = z.object({
  _id: z.any().optional(),
  id: z.string().optional(),
  groupId: z.string().optional(),
  name: z.string().min(1, 'Option group name is required'),
  type: z
    .enum(['SINGLE_SELECT', 'MULTI_SELECT', 'OPTIONAL_SINGLE_SELECT'])
    .default('SINGLE_SELECT'),
  required: z.boolean().default(false),
  minSelections: z.number().min(0).optional(),
  maxSelections: z.number().min(0).optional(),
  displayStyle: z
    .preprocess(
      (val) => {
        if (typeof val === 'string') {
          const upper = val.toUpperCase().trim();
          if (upper === 'CARDS') return 'RADIO_CARDS';
          if (upper === 'PILLS') return 'BUTTON_GROUP';
          if (['RADIO_CARDS', 'CHECKBOX_CARDS', 'DROPDOWN', 'BUTTON_GROUP'].includes(upper)) {
            return upper;
          }
        }
        return val || 'RADIO_CARDS';
      },
      z.enum(['RADIO_CARDS', 'CHECKBOX_CARDS', 'DROPDOWN', 'BUTTON_GROUP']),
    )
    .optional(),
  sortOrder: z.number().default(0),
  options: z.array(productOptionSchema).default([]),
});

export const createProductSchema = z.object({
  title: z.string().min(2, 'Title must be at least 2 characters'),
  customerNote: z.string().max(2000).optional(),
  slug: z.string().min(2, 'Slug must be at least 2 characters'),
  category: z.string().min(2, 'Category is required'),
  material: z.string().optional(),
  tags: z.array(z.string()).optional(),
  price: z.number().min(0, 'Price must be positive'),
  oldPrice: z.number().min(0).optional(),
  rating: z.number().min(0).max(5).optional(),
  reviews: z.number().min(0).optional(),
  imageSrc: z
    .string()
    .min(1, 'Image source is required')
    .refine((val) => !val.startsWith('blob:'), 'Image source cannot be a temporary local blob URL'),
  images: z
    .array(
      z
        .string()
        .refine(
          (val) => !val.startsWith('blob:'),
          'Image URL cannot be a temporary local blob URL',
        ),
    )
    .max(4)
    .optional(),
  description: z.string().min(5, 'Description is required'),
  badges: z.array(z.string()).optional(),
  dimensions: z.string().optional(),
  weight: z.string().optional(),
  seoTitle: z.string().optional(),
  seoDescription: z.string().optional(),
  stock: z.number().min(0).optional(),
  lowStockThreshold: z.number().min(0).optional(),
  featured: z.boolean().optional(),
  isActive: z.boolean().optional(),
  isNonRefundable: z.boolean().optional(),
  returnSettings: z
    .object({
      returnWindow: z.number().optional(),
      exchangeWindow: z.number().optional(),
      refundType: z.enum(['full', 'partial', 'store_credit', 'no_refund']).optional(),
      restockingFeePercent: z.number().min(0).max(100).optional(),
      returnShippingFee: z.number().min(0).optional(),
      inspectionRequired: z.boolean().optional(),
      replacementAllowed: z.boolean().optional(),
    })
    .optional(),
  variants: z.array(z.any()).optional(),
  optionGroups: z.array(productOptionGroupSchema).optional(),
  __v: z.number().optional(),
});

export const updateProductSchema = createProductSchema.partial();
