import mongoose from 'mongoose';
import Product, { IProduct } from '../models/Product';
import { ReferenceIntegrityService } from './ReferenceIntegrityService';
import { getPaginationOptions, formatPaginationResponse } from '../utils/pagination';
import logger from '../config/logger';
import { bumpPublicCacheVersion } from '../utils/cache/cacheVersion';
import { categoryCache, MemoryCache } from '../utils/cache/MemoryCache';
import redisClient from '../utils/cache/redis';
import { MediaService } from './media/MediaService';
import { analyzeQueryWithAI, escapeRegex, getMatchingProductCategory } from './searchService';
import { computeSearchScore } from './search/rankingEngine';
import { analyzeCatalogQuery, CatalogSearchAnalysis } from './search/catalogVocabulary';
import Category from '../models/Category';
import { CategoryService } from './CategoryService';
import ApiError from '../utils/ApiError';
import { ChangeTracker } from '../utils/ChangeTracker';
import { generateProductUuid } from '../shared/utils/uuidGenerator';
import { QRCodeService } from '../shared/services/barcode/QRCodeService';
import { emitAdminEvent, emitGlobalUserEvent } from '../socket';
import {
  normalizeProductImages,
  resolveCategories,
  normalizeProductAttributes,
} from './productWriteNormalization';
import FilterService from './FilterService';

ReferenceIntegrityService.register('Product', [
  { targetModel: 'Review', targetField: 'product', action: 'softDelete' },
  { targetModel: 'Wishlist', targetField: 'products', action: 'pull' },
  { targetModel: 'Cart', targetField: 'items.product', action: 'pull' },
]);

const productCountCache = new MemoryCache({
  defaultTtlMs: 60 * 1000,
  maxKeys: 1000,
  name: 'productCountCache',
});

class ProductService {
  static async buildProductFilterQuery(queryParams: any, isAdmin: boolean = false) {
    const {
      category,
      search,
      featured,
      minPrice,
      maxPrice,
      priceRange,
      material,
      collection,
      spellcheck,
      bypassCorrection,
      ids,
      availability,
      ...dynamicFilters
    } = queryParams;

    const filter: any = isAdmin ? {} : { isActive: true };

    if (ids) {
      const idArray = String(ids)
        .split(',')
        .map((id) => id.trim())
        .filter((id) => mongoose.Types.ObjectId.isValid(id));
      if (idArray.length > 0) {
        filter._id = { $in: idArray };
      }
    }

    if (category && String(category).toLowerCase() !== 'all') {
      const catMatchId = await CategoryService.intelligentMatch(String(category));
      if (catMatchId) {
        filter.$or = filter.$or || [];
        filter.$or.push({ primaryCategory: catMatchId }, { secondaryCategories: catMatchId });
      }
    }
    if (featured === 'true') filter.featured = true;
    if (availability === 'in_stock') filter.stock = { $gt: 0 };

    let parsedMin = minPrice !== undefined && minPrice !== '' ? Number(minPrice) : undefined;
    let parsedMax = maxPrice !== undefined && maxPrice !== '' ? Number(maxPrice) : undefined;

    if (priceRange && parsedMin === undefined && parsedMax === undefined) {
      const parts = String(priceRange).split('-');
      if (parts[0] !== undefined && parts[0] !== '' && !isNaN(Number(parts[0]))) {
        parsedMin = Number(parts[0]);
      }
      if (parts[1] !== undefined && parts[1] !== '' && !isNaN(Number(parts[1]))) {
        parsedMax = Number(parts[1]);
      }
    }

    if (
      (parsedMin !== undefined && !isNaN(parsedMin)) ||
      (parsedMax !== undefined && !isNaN(parsedMax))
    ) {
      filter.price = {};
      if (parsedMin !== undefined && !isNaN(parsedMin)) filter.price.$gte = parsedMin;
      if (parsedMax !== undefined && !isNaN(parsedMax)) filter.price.$lte = parsedMax;
    }
    if (material) {
      const materials = String(material)
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
      if (materials.length > 0)
        filter.material = {
          $in: materials.map((item) => new RegExp(`^${escapeRegex(item)}$`, 'i')),
        };
    }
    if (collection) {
      const collections = String(collection)
        .split(',')
        .map((item) => item.trim())
        .filter((item) => Boolean(item) && item.toLowerCase() !== 'all');
      if (collections.length > 0) {
        const catConditions: any[] = [
          { slug: { $in: collections.map((c) => c.toLowerCase()) } },
          { name: { $in: collections.map((c) => new RegExp(`^${escapeRegex(c)}$`, 'i')) } },
        ];
        const validObjectIds = collections
          .filter((c) => mongoose.Types.ObjectId.isValid(c))
          .map((c) => new mongoose.Types.ObjectId(c));
        if (validObjectIds.length > 0) {
          catConditions.push({ _id: { $in: validObjectIds } });
        }
        const matchedCats = await Category.find({ $or: catConditions }).lean();
        if (matchedCats.length > 0 || validObjectIds.length > 0) {
          const catIds = Array.from(
            new Set([
              ...validObjectIds.map((id) => String(id)),
              ...matchedCats.map((c) => String(c._id)),
            ]),
          ).map((id) => new mongoose.Types.ObjectId(id));
          filter.$and = filter.$and || [];
          filter.$and.push({
            $or: [{ primaryCategory: { $in: catIds } }, { secondaryCategories: { $in: catIds } }],
          });
        }
      }
    }

    // Dynamic Filters (e.g. ?Color=Red,Blue or ?Size=M)
    const dynamicFilterOrs: any[] = [];
    Object.keys(dynamicFilters).forEach((key) => {
      // Ignore pagination and known sorts and special params
      if (['page', 'limit', 'skip', 'sort', 'priceRange', 'minPrice', 'maxPrice'].includes(key)) {
        return;
      }

      const values = String(dynamicFilters[key])
        .split(',')
        .map((v) => v.trim())
        .filter(Boolean);

      if (values.length > 0) {
        // Build regex for each value
        const valRegexes = values.map((v) => new RegExp(`^${escapeRegex(v)}$`, 'i'));

        dynamicFilterOrs.push({
          $or: [
            // Option 1: It's a tag
            { tags: { $in: valRegexes } },
            // Option 2: It's a variant where name matches key and value matches val
            {
              variants: {
                $elemMatch: {
                  name: new RegExp(`^${escapeRegex(key)}$`, 'i'),
                  value: { $in: valRegexes },
                },
              },
            },
            // Option 3: It's a purchasable option, e.g. ?Weight=500g against a "Weight" group
            {
              optionGroups: {
                $elemMatch: {
                  name: new RegExp(`^${escapeRegex(key)}$`, 'i'),
                  options: {
                    $elemMatch: { label: { $in: valRegexes }, available: { $ne: false } },
                  },
                },
              },
            },
          ],
        });
      }
    });

    if (dynamicFilterOrs.length > 0) {
      filter.$and = filter.$and || [];
      filter.$and.push(...dynamicFilterOrs);
    }

    let correctedQuery: string | undefined;
    let searchAnalysis: CatalogSearchAnalysis | null = null;
    const shouldSpellcheck = spellcheck !== 'false' && bypassCorrection !== 'true';

    if (search) {
      const aiAnalysis = await analyzeQueryWithAI(search);
      // Catalogue-driven pass: misspellings, sound-alikes, tag synonyms and pack sizes
      searchAnalysis = await analyzeCatalogQuery(String(search), { limit: 200 });

      if (
        shouldSpellcheck &&
        aiAnalysis.correctedQuery &&
        aiAnalysis.correctedQuery.toLowerCase() !== search.toLowerCase()
      ) {
        correctedQuery = aiAnalysis.correctedQuery;
      }
      if (
        shouldSpellcheck &&
        !correctedQuery &&
        searchAnalysis?.correctedQuery &&
        searchAnalysis.correctionLevel !== 'low'
      ) {
        correctedQuery = searchAnalysis.correctedQuery;
      }

      // Apply price filter from AI budget analysis if not manually set
      if (aiAnalysis.priceMax && !maxPrice) {
        filter.price = filter.price || {};
        filter.price.$lte = aiAnalysis.priceMax;
      }
      if (aiAnalysis.priceMin && !minPrice) {
        filter.price = filter.price || {};
        filter.price.$gte = aiAnalysis.priceMin;
      }

      if (aiAnalysis.category && !category) {
        const dbCategories = await Category.find({ isActive: true })
          .distinct('name')
          .catch(() => [] as string[]);
        const matchedCategory = getMatchingProductCategory(aiAnalysis.category, dbCategories);
        if (matchedCategory) {
          const categoryDoc = await Category.findOne({ name: matchedCategory }).lean();
          if (categoryDoc) {
            filter.$or = filter.$or || [];
            filter.$or.push(
              { primaryCategory: categoryDoc._id },
              { secondaryCategories: categoryDoc._id },
            );
          }
        }
      }

      const phraseVariants = [search];
      if (search.toLowerCase().includes('jewelry')) {
        phraseVariants.push(search.replace(/\bjewelry\b/gi, 'jewellery'));
      } else if (search.toLowerCase().includes('jewellery')) {
        phraseVariants.push(search.replace(/\bjewellery\b/gi, 'jewelry'));
      }

      const words = search
        .trim()
        .split(/\s+/)
        .filter((w: string) => w.length > 1);
      const wordVariants: string[] = [];
      for (const w of words) {
        const lower = w.toLowerCase();
        wordVariants.push(lower);
        if (lower === 'jewelry') wordVariants.push('jewellery');
        if (lower === 'jewellery') wordVariants.push('jewelry');
        if (lower === 'box') wordVariants.push('boxes');
        if (lower === 'boxes') wordVariants.push('box');
      }

      const allSearchTerms = [
        ...phraseVariants,
        ...(shouldSpellcheck && aiAnalysis.correctedQuery ? [aiAnalysis.correctedQuery] : []),
        ...aiAnalysis.expandedTerms,
        ...wordVariants,
      ];
      const uniqueSearchTerms = [...new Set(allSearchTerms.filter(Boolean))];
      const regexPatterns = uniqueSearchTerms.map((t) => new RegExp(escapeRegex(t), 'i'));

      const searchOr: any[] = [
        { title: { $in: regexPatterns } },
        { teluguTitle: { $in: regexPatterns } },
        { material: { $in: regexPatterns } },
        { tags: { $in: regexPatterns } },
        { description: { $in: regexPatterns } },
      ];

      // Add category matching when the query or its variants match a category
      const categoryRegexes = phraseVariants.map((p) => new RegExp(`^${escapeRegex(p)}$`, 'i'));
      const matchingCats = await Category.find({
        $or: [
          { name: { $in: categoryRegexes } },
          { slug: { $in: phraseVariants.map((p) => p.toLowerCase().replace(/\s+/g, '-')) } },
        ],
      }).lean();
      if (matchingCats.length > 0) {
        const catIds = matchingCats.map((c) => c._id);
        searchOr.push({ primaryCategory: { $in: catIds } });
        searchOr.push({ secondaryCategories: { $in: catIds } });
      }

      // Products the catalogue analysis matched (typos, tags, sizes) are results too.
      // With correction turned off, only products that matched the words as typed count.
      if (searchAnalysis && !searchAnalysis.fallback) {
        const allowCorrected = shouldSpellcheck || searchAnalysis.correctionLevel === 'none';
        const matchedIds = allowCorrected
          ? searchAnalysis.products
              .map((p) => p.id)
              .filter((id) => mongoose.Types.ObjectId.isValid(id))
          : [];
        if (matchedIds.length > 0) searchOr.push({ _id: { $in: matchedIds } });

        // "dosa 500g": keep to products actually sold in 500g, when any of the matches are
        const weightIds = searchAnalysis.products
          .filter((p) => p.matchedWeight)
          .map((p) => p.id)
          .filter((id) => mongoose.Types.ObjectId.isValid(id));
        if (searchAnalysis.weight && weightIds.length > 0) {
          filter.$and = filter.$and || [];
          filter.$and.push({ _id: { $in: weightIds } });
        }
      }

      // Match colors if detected
      if (aiAnalysis.colors.length > 0) {
        searchOr.push({
          tags: { $in: aiAnalysis.colors.map((c) => new RegExp(escapeRegex(c), 'i')) },
        });
      }

      if (filter.$or) {
        filter.$and = filter.$and || [];
        filter.$and.push({ $or: filter.$or });
        delete filter.$or;
      }

      if (filter.$and) {
        filter.$and.push({ $or: searchOr });
      } else {
        filter.$or = searchOr;
      }
    }

    return { filter, correctedQuery, searchAnalysis };
  }

  static async getAllProducts(queryParams: any, isAdmin: boolean = false) {
    const { sort, search } = queryParams;
    const { page, limit, skip } = getPaginationOptions(queryParams);

    const { filter, correctedQuery, searchAnalysis } = await this.buildProductFilterQuery(
      queryParams,
      isAdmin,
    );
    const analysisScores = new Map(
      (searchAnalysis && !searchAnalysis.fallback ? searchAnalysis.products : []).map((p) => [
        p.id,
        p.score,
      ]),
    );

    const isSearchQuery = Boolean(search && String(search).trim().length > 0);
    const searchQuery = isSearchQuery ? String(search).trim() : '';

    let sortOptions: any = { createdAt: -1, _id: 1 };
    let isRelevanceSort = false;

    if (sort) {
      if (sort === 'price_asc') sortOptions = { price: 1, _id: 1 };
      else if (sort === 'price_desc') sortOptions = { price: -1, _id: 1 };
      else if (sort === 'newest') {
        if (isSearchQuery) isRelevanceSort = true;
        else sortOptions = { createdAt: -1, _id: 1 };
      } else if (sort === 'rating') sortOptions = { rating: -1, _id: 1 };
    } else if (isSearchQuery) {
      isRelevanceSort = true;
    }

    const filterHash = JSON.stringify(filter);

    // If searching with relevance sort, fetch a wider pool (up to 150 items) to sort by relevance score
    const queryLimit = isRelevanceSort ? Math.max(limit * page, 120) : limit;
    const querySkip = isRelevanceSort ? 0 : skip;

    const [rawProducts, totalCount] = await Promise.all([
      Product.find(filter)
        .select(
          isAdmin ? '' : '-description -seoTitle -seoDescription -variants -dimensions -weight',
        )
        .populate('primaryCategory', 'name slug type')
        .populate('secondaryCategories', 'name slug type')
        .sort(sortOptions)
        .skip(querySkip)
        .limit(queryLimit)
        .lean(),
      productCountCache.getOrSet(filterHash, () => Product.countDocuments(filter)),
    ]);

    let products = rawProducts;
    if (isRelevanceSort && searchQuery) {
      const scored = (rawProducts as any[]).map((p) => {
        const catName = p.primaryCategory?.name || '';
        const score = computeSearchScore(
          p.title,
          catName,
          p.tags || [],
          searchQuery,
          p.teluguTitle,
          p.description,
          p.material ? [p.material] : [],
        );
        // The catalogue score already weighs typos, sizes and stock; it leads, text score breaks ties
        const catalogScore = analysisScores.get(String(p._id)) || 0;
        const stockFactor = (p.stock ?? 1) > 0 ? 1 : 0.6;
        return { p, score: catalogScore * 10 + score * stockFactor };
      });

      scored.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return new Date(b.p.createdAt).getTime() - new Date(a.p.createdAt).getTime();
      });

      products = scored.slice(skip, skip + limit).map((s) => s.p);
    }

    const response: any = formatPaginationResponse(products, totalCount, page, limit);
    response.correctedQuery = correctedQuery;
    if (searchAnalysis) {
      response.searchMeta = {
        intent: searchAnalysis.intent,
        weight: searchAnalysis.weight,
        correctionLevel: searchAnalysis.correctionLevel,
        correctionConfidence: searchAnalysis.correctionConfidence,
        related: searchAnalysis.related,
      };
    }
    return response;
  }

  static async getProductById(idOrSlug: string) {
    let product;
    const isObjectId = mongoose.Types.ObjectId.isValid(idOrSlug);

    // Fetch the product first without updating the counter in DB
    if (isObjectId) {
      product = await Product.findById(idOrSlug)
        .populate('primaryCategory', 'name slug type')
        .populate('secondaryCategories', 'name slug type')
        .lean();
    } else {
      product = await Product.findOne({ slug: idOrSlug.toLowerCase() })
        .populate('primaryCategory', 'name slug type')
        .populate('secondaryCategories', 'name slug type')
        .lean();
    }

    if (!product || !product.isActive) return null;

    // Batch view counter updates using Redis to reduce DB write IOPS
    const productIdStr = product._id.toString();
    try {
      if (redisClient && redisClient.isReady) {
        const viewKey = `product:views:${productIdStr}`;
        const views = await redisClient.incr(viewKey);

        // If it's the first view in this batch, set an expiry to prevent orphaned keys
        if (views === 1) {
          await redisClient.expire(viewKey, 3600); // 1 hour max TTL
        }

        // Flush to DB every 10 views to reduce write frequency by 90%
        if (views >= 10) {
          await Product.findByIdAndUpdate(productIdStr, { $inc: { views: views } });
          await redisClient.del(viewKey);
        }
      } else {
        // Fallback to direct DB update if Redis is unavailable
        await Product.findByIdAndUpdate(productIdStr, { $inc: { views: 1 } });
      }
    } catch (err) {
      logger.warn(`Failed to increment product views in Redis for ${productIdStr}:`, err);
      // Failsafe DB update
      Product.findByIdAndUpdate(productIdStr, { $inc: { views: 1 } }).catch(() => {});
    }

    return product;
  }

  static async flushAllViewCounters() {
    try {
      if (!redisClient || !redisClient.isReady) return;

      const keys = await redisClient.keys('product:views:*');
      if (keys.length === 0) return;

      logger.info(`[PRODUCT VIEWS] Flushing ${keys.length} product view counters to DB...`);

      const pipeline = redisClient.multi();
      keys.forEach((key) => pipeline.get(key));
      const results = await pipeline.exec();

      const ops: any[] = [];
      const delPipeline = redisClient.multi();

      keys.forEach((key, index) => {
        const viewsStr = results[index];
        if (viewsStr) {
          const views = parseInt(String(viewsStr), 10);
          const productId = key.split(':').pop();
          if (views > 0 && productId && mongoose.Types.ObjectId.isValid(productId)) {
            ops.push({
              updateOne: {
                filter: { _id: productId },
                update: { $inc: { views: views } },
              },
            });
            delPipeline.del(key);
          }
        }
      });

      if (ops.length > 0) {
        await Promise.all([Product.bulkWrite(ops), delPipeline.exec()]);
        logger.info(`[PRODUCT VIEWS] Successfully flushed ${ops.length} products`);
      }

      if (ops.length > 0) {
        await Product.bulkWrite(ops);
        logger.info(`[PRODUCT VIEWS] Successfully flushed ${ops.length} products`);
      }
    } catch (err) {
      logger.error('[PRODUCT VIEWS] Failed to flush view counters:', err);
    }
  }

  static async createProduct(data: Partial<IProduct>, actor?: any) {
    const session = await mongoose.startSession();
    try {
      session.startTransaction();

      normalizeProductImages(data);
      await resolveCategories(data);
      await normalizeProductAttributes(data);

      if (!data.productUuid) {
        data.productUuid = generateProductUuid();
      }

      if (!data.sku) {
        const categoryPrefix =
          data.primaryCategory && typeof data.primaryCategory === 'string'
            ? (data.primaryCategory as string).substring(0, 3).toUpperCase()
            : 'PRD';
        data.sku = `${categoryPrefix}-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000)}`;
      }

      if (!data.barcode) {
        data.barcode = data.sku;
      }

      if (!data.qrCode) {
        data.qrCode = QRCodeService.generateProductQrPayload(data.productUuid, data.sku);
      }

      // Initialize inventory object
      if (!data.inventory) {
        data.inventory = {
          available: Number(data.stock) || 0,
          reserved: Number(data.reservedStock) || 0,
          production: 0,
          packing: 0,
          transit: 0,
          maintenance: 0,
          returned: 0,
          damaged: 0,
          lost: 0,
          qualityHold: 0,
        };
      }

      const product = new Product(data);
      const saved = await product.save({ session });

      // Verify the write succeeded
      const verified = await Product.findById(saved._id).session(session).lean();
      if (!verified) {
        throw new Error(
          `Product create verification failed: document ${saved._id} not found after save`,
        );
      }

      const allImages = saved.images || [];
      await MediaService.syncReferences('Product', saved._id, allImages, 'images');
      if (saved.imageSrc) {
        await MediaService.syncReferences('Product', saved._id, [saved.imageSrc], 'imageSrc');
      }

      await ChangeTracker.trackChange(
        'Product',
        saved._id,
        null,
        saved.toObject(),
        actor,
        'create',
      );

      await session.commitTransaction();

      try {
        emitAdminEvent('product_update', { productId: saved._id });
        emitAdminEvent('catalog_update', { type: 'product_saved' });
        emitGlobalUserEvent('product_update', { productId: saved._id });
      } catch (e) {
        logger.warn('Failed to emit product update event', e);
      }

      logger.info('[CATEGORY CACHE] Purging distinct categories cache due to new product creation');
      categoryCache.delete('product:distinct_categories');
      productCountCache.clear();
      FilterService.clearCache();
      await bumpPublicCacheVersion();

      return saved;
    } catch (err) {
      await session.abortTransaction();
      throw err;
    } finally {
      session.endSession();
    }
  }

  static async updateProduct(id: string, data: Partial<IProduct> & { __v?: number }, actor?: any) {
    const session = await mongoose.startSession();
    try {
      session.startTransaction();

      const oldProduct = await Product.findById(id).populate('primaryCategory').session(session);
      if (!oldProduct) {
        await session.abortTransaction();
        return null;
      }

      // Optimistic concurrency: check version matches what the client sent
      if (data.__v !== undefined && data.__v !== oldProduct.__v) {
        await session.abortTransaction();
        throw new ApiError(
          409,
          'This product was modified by another user. Please refresh and try again.',
        );
      }

      normalizeProductImages(data, oldProduct as IProduct);
      await resolveCategories(data);
      await normalizeProductAttributes(data);

      const updateData = { ...data };
      delete updateData.__v;

      const product = await Product.findOneAndUpdate(
        { _id: id, __v: oldProduct.__v },
        { ...updateData, $inc: { __v: 1 } },
        { returnDocument: 'after', runValidators: true, session },
      );

      if (!product) {
        await session.abortTransaction();
        throw new ApiError(
          409,
          'This product was modified by another user. Please refresh and try again.',
        );
      }

      // Verify the write succeeded
      const verified = await Product.findById(product._id).session(session).lean();
      if (!verified) {
        throw new Error(
          `Product update verification failed: document ${product._id} not found after save`,
        );
      }

      await ChangeTracker.trackChange(
        'Product',
        product._id,
        oldProduct.toObject(),
        product.toObject(),
        actor,
        'update',
      );

      // Automatically sync references for primary and auxiliary images
      const allImages = product.images || [];
      await MediaService.syncReferences('Product', product._id, allImages, 'images');
      if (product.imageSrc) {
        await MediaService.syncReferences('Product', product._id, [product.imageSrc], 'imageSrc');
      } else {
        await MediaService.syncReferences('Product', product._id, [], 'imageSrc');
      }

      await session.commitTransaction();

      try {
        emitAdminEvent('product_update', { productId: product._id });
        emitAdminEvent('catalog_update', { type: 'product_saved' });
        emitGlobalUserEvent('product_update', { productId: product._id });
        if (oldProduct.stock !== product.stock) {
          emitAdminEvent('stock_update', { productId: product._id, stock: product.stock });
          emitGlobalUserEvent('stock_update', { productId: product._id, stock: product.stock });
        }
      } catch (e) {
        logger.warn('Failed to emit product update event', e);
      }

      logger.info('[CATEGORY CACHE] Purging distinct categories cache due to product update');
      categoryCache.delete('product:distinct_categories');
      productCountCache.clear();
      FilterService.clearCache();
      await bumpPublicCacheVersion();
      return product;
    } catch (err) {
      await session.abortTransaction();
      throw err;
    } finally {
      session.endSession();
    }
  }

  static async deleteProduct(id: string, actor?: any) {
    const session = await mongoose.startSession();
    try {
      session.startTransaction();

      const product = await Product.findById(id).session(session);
      if (!product) {
        await session.abortTransaction();
        return null;
      }

      // Soft delete
      product.isDeleted = true;
      product.deletedAt = new Date();
      product.deletedBy = actor
        ? {
            userId: actor.id || actor._id?.toString(),
            email: actor.email,
            role: actor.role,
          }
        : undefined;
      product.deletionReason = 'Deleted via productService';
      await product.save({ session });

      // Verify the write succeeded
      const verifiedDelete = await Product.findOne({ _id: id, isDeleted: true }).session(session);
      if (!verifiedDelete) {
        throw new Error(`Delete verification failed: Product ${id} was not marked as deleted`);
      }

      // Clean up User wishlist, cart, and recentlyViewed references to prevent orphan/dead links
      const User = require('../models/User').default || require('../models/User');
      await User.updateMany(
        {
          $or: [
            { wishlist: product._id },
            { 'cart.product': product._id },
            { 'recentlyViewed.product': product._id },
          ],
        },
        {
          $pull: {
            wishlist: product._id,
            cart: { product: product._id },
            recentlyViewed: { product: product._id },
          },
        },
        { session },
      );

      // Soft delete product reviews
      const Review = require('../models/Review').default || require('../models/Review');
      const reviews = await Review.find({ product: product._id }).session(session);
      for (const review of reviews) {
        review.isDeleted = true;
        review.deletedAt = new Date();
        review.deletedBy = actor
          ? {
              userId: actor.id || actor._id?.toString(),
              email: actor.email,
              role: actor.role,
            }
          : undefined;
        review.deletionReason = 'Cascading soft delete from product';
        await review.save({ session });
      }

      await session.commitTransaction();

      try {
        emitAdminEvent('product_update', { productId: product._id });
        emitGlobalUserEvent('product_update', { productId: product._id });
      } catch (e) {
        logger.warn('Failed to emit product update event', e);
      }

      logger.info('[CATEGORY CACHE] Purging distinct categories cache due to product deletion');
      categoryCache.delete('product:distinct_categories');
      productCountCache.clear();
      await bumpPublicCacheVersion();
      return product;
    } catch (err) {
      await session.abortTransaction();
      throw err;
    } finally {
      session.endSession();
    }
  }

  static async updateStatus(id: string, status: 'active' | 'inactive', _actor?: any) {
    const product = await Product.findById(id);
    if (!product) return null;

    const isActive = status === 'active';
    if (product.isActive === isActive) return product;

    product.isActive = isActive;
    await product.save();

    // Invalidate caches
    logger.info('[CATEGORY CACHE] Purging distinct categories cache due to status update');
    categoryCache.delete('product:distinct_categories');
    productCountCache.clear();
    await bumpPublicCacheVersion();

    // Emit events
    try {
      emitAdminEvent('product_update', { productId: product._id });
      emitGlobalUserEvent('product_update', { productId: product._id });
    } catch (e) {
      logger.warn('Failed to emit product update event', e);
    }

    return product;
  }

  static async permanentlyDelete(id: string, actor?: any) {
    const product = await Product.findById(id);
    if (!product) return null;

    try {
      // Find the corresponding recycle bin entry
      const RecycleBin = mongoose.models.RecycleBin || require('../models/RecycleBin').default;
      const entry = await RecycleBin.findOne({
        entityType: 'Product',
        entityId: id,
        status: 'deleted',
      });

      if (entry) {
        // Delegate to centralized RecycleBinService
        const { RecycleBinService } = require('./recycleBinService');
        const result = await RecycleBinService.permanentDelete(entry._id.toString(), actor);

        if (!result.success) {
          throw new Error(result.errors.join(', '));
        }

        // Return a mock report matching the old format for backwards compatibility
        const deletedAssets =
          result.report.find((r: any) => r.step === 'Cloudinary Assets Deleted')?.count || 0;
        const failedAssets = result.errors.filter((e: string) => e.includes('Cloudinary')).length;
        const deletedReviews =
          result.report.find((r: any) => r.step === 'Reviews Deleted')?.count || 0;

        return {
          productId: id,
          deletedAssets,
          failedAssets,
          deletedReviews,
        };
      } else {
        // If no recycle bin entry exists (e.g. it was purged or never soft-deleted),
        // we can either error or just create a temporary entry and purge it.
        // For safety, we reject hard deletions that don't go through the recycle bin process.
        throw new Error(
          'Product must be soft-deleted (moved to recycle bin) before it can be permanently deleted.',
        );
      }
    } catch (err) {
      logger.error(`Error in ProductService.permanentlyDelete for product ${id}:`, err);
      throw err;
    }
  }

  static async toggleFeatured(id: string) {
    const product = await Product.findById(id);
    if (!product) return null;
    product.featured = !product.featured;
    const saved = await product.save();
    return saved;
  }

  static async getDistinctCategories() {
    const cacheKey = 'product:distinct_categories';
    const cached = categoryCache.get<any[]>(cacheKey);
    if (cached !== null) {
      logger.info('[CATEGORY CACHE] Cache Hit for distinct categories');
      return cached;
    }

    logger.info('[CATEGORY CACHE] Cache Miss. Fetching distinct categories from database');
    // Fetch all active configured categories from the Category collection
    const allActiveCategories = await Category.find({ isActive: true }).select('name slug').lean();

    // Fetch unique primaryCategory and secondaryCategories values from active products
    const distinctPrimary = await Product.distinct('primaryCategory', { isActive: true });
    const distinctSecondary = await Product.distinct('secondaryCategories', { isActive: true });

    // Separate ObjectIds from raw strings
    const idList: any[] = [];
    const rawStringNames: string[] = [];

    [...distinctPrimary, ...distinctSecondary].forEach((val: any) => {
      if (!val) return;
      if (typeof val === 'string' && val.length !== 24) {
        rawStringNames.push(val);
      } else {
        idList.push(val);
      }
    });

    const productCategories = await Category.find({ _id: { $in: idList }, isActive: true })
      .select('name slug')
      .lean();

    const merged = [
      ...allActiveCategories.map((c) => c.name),
      ...productCategories.map((c) => c.name),
      ...rawStringNames,
    ];

    const uniqueNames = Array.from(new Set(merged.filter(Boolean))).sort();

    categoryCache.set(cacheKey, uniqueNames);
    return uniqueNames;
  }
}

export default ProductService;
// Triggered restart to clear in-memory categoryCache
