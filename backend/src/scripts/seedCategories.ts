import Category from '../models/Category';
import logger from '../config/logger';

const DEFAULT_CATEGORIES = [
  {
    name: 'Batters',
    slug: 'batters',
    type: 'product' as const,
    description: 'Fresh, stone-ground traditional South Indian batters.',
    displayOrder: 1,
    isActive: true,
  },
  {
    name: 'Pickles',
    slug: 'pickles',
    type: 'product' as const,
    description: 'Authentic Andhra style homemade spicy pickles.',
    displayOrder: 2,
    isActive: true,
  },
  {
    name: 'Podis',
    slug: 'podis',
    type: 'product' as const,
    description: 'Traditional flavorful spice powders and karam podis.',
    displayOrder: 3,
    isActive: true,
  },
  {
    name: 'Snacks',
    slug: 'snacks',
    type: 'product' as const,
    description: 'Crispy, artisanal handmade savory snacks.',
    displayOrder: 4,
    isActive: true,
  },
  {
    name: 'Sweets',
    slug: 'sweets',
    type: 'product' as const,
    description: 'Delectable traditional Indian sweets made with pure ghee.',
    displayOrder: 5,
    isActive: true,
  },
];

export async function seedCategories() {
  try {
    for (const cat of DEFAULT_CATEGORIES) {
      await Category.updateOne(
        { slug: cat.slug },
        {
          $setOnInsert: {
            name: cat.name,
            slug: cat.slug,
            type: cat.type,
            description: cat.description,
            displayOrder: cat.displayOrder,
            isActive: true,
          },
        },
        { upsert: true },
      );
    }
    logger.info('[SEED] Default food categories seeded/verified successfully.');
  } catch (err: any) {
    logger.error('[SEED] Error seeding categories:', err);
  }
}
