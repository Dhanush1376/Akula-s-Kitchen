const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../../.env.local') });
if (!process.env.MONGO_URI) {
  dotenv.config({ path: path.resolve(__dirname, '../../.env') });
}

const defaultSections = [
  { id: 'hero_1', label: 'Hero Banner', isVisible: true },
  { id: 'categoryGrid_1', label: 'Category Grid', isVisible: true },
  { id: 'trendingProducts_1', label: 'Trending Products', isVisible: true },
  { id: 'featuredProducts_1', label: 'Featured Collection', isVisible: true },
  { id: 'recommendedProducts_1', label: 'Smart Recommendations', isVisible: true },
];

const categoryGridData = {
  sectionTitle: 'Shop by category',
  sectionSubtitle: 'Authentic Andhra & South Indian Delicacies',
  categories: [
    { name: 'Batters', link: '/collections?category=Batters' },
    { name: 'Pickles', link: '/collections?category=Pickles' },
    { name: 'Chutneys', link: '/collections?category=Chutneys' },
    { name: 'Podis', link: '/collections?category=Podis' },
  ],
  isVisible: true,
  status: 'published',
};

const trendingProductsData = {
  sectionTitle: 'Trending Now',
  sectionSubtitle: '',
  useAutoFeed: true,
  maxDisplay: 10,
  isVisible: true,
  status: 'published',
};

const featuredProductsData = {
  sectionTitle: 'Best Sellers',
  sectionSubtitle: 'Customer Favorites',
  productIds: [],
  maxDisplay: 10,
  isVisible: true,
  status: 'published',
};

const recommendedProductsData = {
  sectionTitle: 'Recommended For You',
  sectionSubtitle: '',
  useAutoFeed: true,
  maxDisplay: 12,
  isVisible: true,
  status: 'published',
};

async function seed() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    const col = mongoose.connection.db.collection('contentsections');

    // 1. homepageSections
    await col.updateOne(
      { sectionKey: 'homepageSections' },
      {
        $set: {
          sectionKey: 'homepageSections',
          data: defaultSections,
          status: 'published',
          lastModified: new Date(),
          updatedAt: new Date(),
        },
        $setOnInsert: {
          createdAt: new Date(),
          revisionHistory: [],
          isDeleted: false,
        },
      },
      { upsert: true },
    );
    console.log('Upserted homepageSections');

    // 2. categoryGrid
    await col.updateOne(
      { sectionKey: 'categoryGrid' },
      {
        $set: {
          sectionKey: 'categoryGrid',
          data: categoryGridData,
          status: 'published',
          lastModified: new Date(),
          updatedAt: new Date(),
        },
        $setOnInsert: {
          createdAt: new Date(),
          revisionHistory: [],
          isDeleted: false,
        },
      },
      { upsert: true },
    );
    console.log('Upserted categoryGrid');

    // 3. trendingProducts
    await col.updateOne(
      { sectionKey: 'trendingProducts' },
      {
        $set: {
          sectionKey: 'trendingProducts',
          data: trendingProductsData,
          status: 'published',
          lastModified: new Date(),
          updatedAt: new Date(),
        },
        $setOnInsert: {
          createdAt: new Date(),
          revisionHistory: [],
          isDeleted: false,
        },
      },
      { upsert: true },
    );
    console.log('Upserted trendingProducts');

    // 4. featuredProducts
    await col.updateOne(
      { sectionKey: 'featuredProducts' },
      {
        $set: {
          sectionKey: 'featuredProducts',
          data: featuredProductsData,
          status: 'published',
          lastModified: new Date(),
          updatedAt: new Date(),
        },
        $setOnInsert: {
          createdAt: new Date(),
          revisionHistory: [],
          isDeleted: false,
        },
      },
      { upsert: true },
    );
    console.log('Upserted featuredProducts');

    // 5. recommendedProducts
    await col.updateOne(
      { sectionKey: 'recommendedProducts' },
      {
        $set: {
          sectionKey: 'recommendedProducts',
          data: recommendedProductsData,
          status: 'published',
          lastModified: new Date(),
          updatedAt: new Date(),
        },
        $setOnInsert: {
          createdAt: new Date(),
          revisionHistory: [],
          isDeleted: false,
        },
      },
      { upsert: true },
    );
    console.log('Upserted recommendedProducts');

    // 6. Ensure hero status is published
    await col.updateOne(
      { sectionKey: 'hero' },
      {
        $set: {
          status: 'published',
          'data.status': 'published',
          lastModified: new Date(),
          updatedAt: new Date(),
        },
      },
    );
    console.log('Updated hero to published');

    console.log('All DB sections seeded and published successfully!');
  } catch (err) {
    console.error('Seeding error:', err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

seed();
