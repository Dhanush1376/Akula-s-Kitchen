import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import CatalogAttribute from '../src/models/CatalogAttribute';
import CatalogValue from '../src/models/CatalogValue';
import CatalogSynonym from '../src/models/CatalogSynonym';
import logger from '../src/config/logger';

// Load env
dotenv.config({ path: path.join(__dirname, '../.env.local') });

const toSlug = (term: string) => term.toLowerCase().replace(/[^a-z0-9]+/g, '-');

/**
 * Seeds the base catalog registry for Akula's Kitchen: filterable attributes,
 * common pack sizes and product-type tags with their everyday Telugu names.
 * Every write is an upsert keyed by slug, so re-running is safe.
 */
const seedCatalog = async () => {
  try {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) throw new Error('MONGO_URI is not set; refusing to guess a database.');
    await mongoose.connect(mongoUri);
    logger.info('Connected to MongoDB');

    // 1. Attributes
    logger.info('Seeding Attributes...');
    const attributes = [
      {
        name: 'Size',
        slug: 'size',
        description: 'Pack sizes',
        isFilterable: true,
        displayOrder: 1,
      },
      {
        name: 'Tag',
        slug: 'tag',
        description: 'Product types and taxonomy',
        isFilterable: true,
        displayOrder: 2,
      },
    ];

    for (const attr of attributes) {
      await CatalogAttribute.findOneAndUpdate({ slug: attr.slug }, attr, {
        upsert: true,
        new: true,
      });
    }

    // 2. Common pack sizes
    logger.info('Seeding Pack Sizes...');
    const sizes = [
      { value: '250 g', slug: '250-g', sortOrder: 1 },
      { value: '500 g', slug: '500-g', sortOrder: 2 },
      { value: '1 kg', slug: '1-kg', sortOrder: 3 },
    ];

    for (const size of sizes) {
      await CatalogValue.findOneAndUpdate(
        { attributeSlug: 'size', slug: size.slug },
        { ...size, attributeSlug: 'size', status: 'approved' },
        { upsert: true },
      );
    }

    // 3. Product-type tags
    logger.info('Seeding Product Type Tags...');
    const tags = [
      { value: 'Batter', slug: 'batter', taxonomy: 'Product Type', sortOrder: 1 },
      { value: 'Pickle', slug: 'pickle', taxonomy: 'Product Type', sortOrder: 2 },
      { value: 'Podi', slug: 'podi', taxonomy: 'Product Type', sortOrder: 3 },
      { value: 'Namkeen', slug: 'namkeen', taxonomy: 'Product Type', sortOrder: 4 },
    ];

    const tagIds: Record<string, any> = {};

    for (const tag of tags) {
      const doc = await CatalogValue.findOneAndUpdate(
        { attributeSlug: 'tag', slug: tag.slug },
        { ...tag, attributeSlug: 'tag', status: 'approved' },
        { upsert: true, new: true },
      );
      tagIds[tag.slug] = doc._id;
    }

    // 4. Everyday names customers search with
    logger.info('Seeding Tag Synonyms & Aliases...');
    const aliases: Record<string, { term: string; type: 'synonym' | 'alias' }[]> = {
      pickle: [
        { term: 'pachadi', type: 'alias' },
        { term: 'avakaya', type: 'alias' },
      ],
      podi: [{ term: 'karam podi', type: 'alias' }],
      namkeen: [{ term: 'snacks', type: 'synonym' }],
    };

    for (const [tagSlug, terms] of Object.entries(aliases)) {
      const valueId = tagIds[tagSlug];
      if (!valueId) continue;
      for (const { term, type } of terms) {
        await CatalogSynonym.findOneAndUpdate(
          { termSlug: toSlug(term) },
          { valueId, attributeSlug: 'tag', term, termSlug: toSlug(term), type },
          { upsert: true },
        );
      }
    }

    logger.info('Catalog Registry Seeded Successfully!');
    process.exit(0);
  } catch (err) {
    logger.error('Failed to seed catalog registry', err);
    process.exit(1);
  }
};

seedCatalog();
