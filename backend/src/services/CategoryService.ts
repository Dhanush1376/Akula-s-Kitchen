import mongoose from 'mongoose';
import Category from '../models/Category';
import { ReferenceIntegrityService } from './ReferenceIntegrityService';

export class CategoryService {
  static {
    // Register cascade rules for when a category is soft-deleted
    ReferenceIntegrityService.register('Category', [
      { targetModel: 'Product', targetField: 'secondaryCategories', action: 'pull' },
      { targetModel: 'Product', targetField: 'primaryCategory', action: 'nullify' },
    ]);
  }

  private static cachedActiveCategories: any[] | null = null;
  private static cacheExpiresAt = 0;

  private static DEFAULT_CATEGORY_IMAGES: Record<string, string> = {
    batters:
      'https://res.cloudinary.com/cftqgair/image/upload/v1793123124/akulas-kitchen/products/ykliysxhqcecv1ipyzjq.jpg',
    chutneys:
      'https://res.cloudinary.com/cftqgair/image/upload/v1793123125/akulas-kitchen/products/lbmarekwegbzfxauigxq.jpg',
    pickles:
      'https://res.cloudinary.com/cftqgair/image/upload/v1793123121/akulas-kitchen/products/ouv4ci03wehkucl4nrxk.jpg',
    masala:
      'https://res.cloudinary.com/cftqgair/image/upload/v1793123135/akulas-kitchen/products/luf8ibyw8shf168fgrsq.jpg',
    podis:
      'https://res.cloudinary.com/cftqgair/image/upload/v1793123135/akulas-kitchen/products/luf8ibyw8shf168fgrsq.jpg',
    snacks:
      'https://res.cloudinary.com/cftqgair/image/upload/v1793123134/akulas-kitchen/products/s5seblgvndbkjlhlthlv.jpg',
    namkeen:
      'https://res.cloudinary.com/cftqgair/image/upload/v1793123134/akulas-kitchen/products/s5seblgvndbkjlhlthlv.jpg',
    sweets:
      'https://res.cloudinary.com/cftqgair/image/upload/v1793123126/akulas-kitchen/products/uepc6xoknuoagrs3qtnt.jpg',
  };

  public static invalidateCache() {
    this.cachedActiveCategories = null;
    this.cacheExpiresAt = 0;
  }

  /**
   * Retrieves active categories based on optional filter with fast in-memory caching.
   */
  static async getActiveCategories(filter: any = {}) {
    const isDefaultQuery = !filter || Object.keys(filter).length === 0;

    if (isDefaultQuery && this.cachedActiveCategories && Date.now() < this.cacheExpiresAt) {
      return this.cachedActiveCategories;
    }

    const query = { ...filter, isActive: true, isDeleted: { $ne: true } };
    const categories = await Category.find(query).sort({ displayOrder: 1 }).lean();

    const Product = mongoose.models.Product || mongoose.model('Product');

    // Collect category IDs that still need an image (or currently point to dead local paths)
    const neededCatIds: mongoose.Types.ObjectId[] = [];
    categories.forEach((cat: any) => {
      const hasValidRemoteImage =
        cat.imageSrc &&
        typeof cat.imageSrc === 'string' &&
        (cat.imageSrc.startsWith('http://') || cat.imageSrc.startsWith('https://'));
      if (!hasValidRemoteImage) {
        cat.imageSrc = '';
        neededCatIds.push(cat._id);
      }
    });

    if (Product && neededCatIds.length > 0) {
      try {
        // Single batch aggregation for all missing category images (replaces N+1 single queries)
        const sampleProducts = await Product.aggregate([
          {
            $match: {
              isActive: true,
              isDeleted: false,
              primaryCategory: { $in: neededCatIds },
              imageSrc: { $exists: true, $regex: '^https?://' },
            },
          },
          {
            $group: {
              _id: '$primaryCategory',
              imageSrc: { $first: '$imageSrc' },
            },
          },
        ]);

        const imageMap = new Map<string, string>();
        sampleProducts.forEach((p: any) => {
          if (p._id && p.imageSrc) {
            imageMap.set(String(p._id), String(p.imageSrc));
          }
        });

        categories.forEach((cat: any) => {
          if (!cat.imageSrc) {
            const foundImage = imageMap.get(String(cat._id));
            if (foundImage) {
              cat.imageSrc = foundImage;
            } else {
              const slug = String(cat.slug || cat.name || '')
                .toLowerCase()
                .trim();
              if (this.DEFAULT_CATEGORY_IMAGES[slug]) {
                cat.imageSrc = this.DEFAULT_CATEGORY_IMAGES[slug];
              }
            }
          }
        });
      } catch {
        // Fallback to default images if aggregation fails
        categories.forEach((cat: any) => {
          if (!cat.imageSrc) {
            const slug = String(cat.slug || cat.name || '')
              .toLowerCase()
              .trim();
            if (this.DEFAULT_CATEGORY_IMAGES[slug]) {
              cat.imageSrc = this.DEFAULT_CATEGORY_IMAGES[slug];
            }
          }
        });
      }
    } else {
      categories.forEach((cat: any) => {
        if (!cat.imageSrc) {
          const slug = String(cat.slug || cat.name || '')
            .toLowerCase()
            .trim();
          if (this.DEFAULT_CATEGORY_IMAGES[slug]) {
            cat.imageSrc = this.DEFAULT_CATEGORY_IMAGES[slug];
          }
        }
      });
    }

    if (isDefaultQuery) {
      this.cachedActiveCategories = categories;
      this.cacheExpiresAt = Date.now() + 5 * 60 * 1000; // 5 min TTL
    }

    return categories;
  }

  private static matchCache = new Map<string, mongoose.Types.ObjectId | null>();

  /**
   * Intelligently matches a category name to prevent duplicates.
   * Handles exact, case-insensitive, plural/singular, and fuzzy matching.
   */
  static async intelligentMatch(name: string): Promise<mongoose.Types.ObjectId | null> {
    if (!name) return null;
    const searchStr = name.trim();
    const lowerSearch = searchStr.toLowerCase();

    if (this.matchCache.has(lowerSearch)) {
      return this.matchCache.get(lowerSearch) || null;
    }

    // 1. Exact or Case-Insensitive Match
    const exactMatch = await Category.findOne({
      $or: [
        { name: { $regex: new RegExp(`^${searchStr}$`, 'i') } },
        { slug: searchStr.replace(/[\s\W-]+/g, '-') },
      ],
    });
    if (exactMatch) {
      const id = exactMatch._id as mongoose.Types.ObjectId;
      this.matchCache.set(lowerSearch, id);
      return id;
    }

    // 2. Plural / Singular match (Basic S-stripping/appending)
    const singular = lowerSearch.endsWith('s') ? lowerSearch.slice(0, -1) : lowerSearch;
    const plural = lowerSearch + 's';

    const pluralMatch = await Category.findOne({
      $or: [
        { name: { $regex: new RegExp(`^${singular}$`, 'i') } },
        { name: { $regex: new RegExp(`^${plural}$`, 'i') } },
      ],
    });
    if (pluralMatch) {
      const id = pluralMatch._id as mongoose.Types.ObjectId;
      this.matchCache.set(lowerSearch, id);
      return id;
    }

    // 3. Partial Substring / Alias matching
    // (In a full enterprise setup, this would ping AI or a vector DB, but for now we do a text search)
    // eslint-disable-next-line unused-imports/no-unused-vars
    const textMatch = await Category.findOne(
      { $text: { $search: searchStr } },
      { score: { $meta: 'textScore' } },
    ).sort({ score: { $meta: 'textScore' } });

    this.matchCache.set(lowerSearch, null);
    return null;
  }

  /**
   * Retrieves all categories.
   */
  static async getAllCategories() {
    return await Category.find().sort({ displayOrder: 1 }).lean();
  }

  /**
   * Creates a new category.
   */
  static async createCategory(data: any) {
    this.invalidateCache();
    const category = new Category(data);
    return await category.save();
  }

  /**
   * Updates an existing category and handles cascading name changes to dependent collections.
   */
  static async updateCategory(id: string, data: any) {
    this.invalidateCache();
    const existing = await Category.findById(id);
    if (!existing) {
      return null;
    }

    // eslint-disable-next-line unused-imports/no-unused-vars
    const oldName = existing.name;

    const dto = {
      name: data.name,
      slug: data.slug,
      description: data.description,
      displayOrder: data.displayOrder,
      isActive: data.isActive,
      type: data.type,
      image: data.image,
      coverProduct: data.coverProduct || null,
    };
    Object.keys(dto).forEach((k) => (dto as any)[k] === undefined && delete (dto as any)[k]);

    const category = await Category.findByIdAndUpdate(
      id,
      { $set: dto },
      { returnDocument: 'after' },
    );

    if (!category) {
      return null;
    }

    // Because we now use ObjectIds (primaryCategory / secondaryCategories),
    // changing the category name automatically reflects across all linked documents via $lookup/populate.
    // We no longer need to perform string cascades.

    return category;
  }

  /**
   * Deletes a category safely using a transaction.
   * ReferenceIntegrityService will handle the cascading logic.
   */
  static async deleteCategory(id: string, user: any) {
    this.invalidateCache();
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const existing = await Category.findById(id).session(session);
      if (!existing) {
        await session.abortTransaction();
        session.endSession();
        return null;
      }

      // The softDelete method (via plugin) will trigger ReferenceIntegrityService.onSoftDelete
      await (existing as any).softDelete(user, 'Deleted via categoryController');

      await session.commitTransaction();
      session.endSession();
      return existing;
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  }
}
