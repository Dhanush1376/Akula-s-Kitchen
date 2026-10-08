import ContentSection from '../models/ContentSection';

import ApiError from '../utils/ApiError';
import { cmsCache } from '../utils/cache/MemoryCache';
import { bumpPublicCacheVersion } from '../utils/cache/cacheVersion';
import { invalidateSafetyLockCache } from '../utils/cache/safetyLockCache';

/** Persisted CMS section key that stores the business profile (name, contact, GST, payment ids). */
const BUSINESS_SETTINGS_SECTION = 'studio_settings';
const SENSITIVE_BUSINESS_SETTINGS_KEYS = ['razorpaySecret', 'razorpayKeySecret'] as const;
const ADMIN_ONLY_SECTION_KEYS = new Set([BUSINESS_SETTINGS_SECTION]);

export const sanitizeBusinessSettings = (data: Record<string, unknown> | null | undefined) => {
  if (!data || typeof data !== 'object') return data;
  const sanitized = { ...data };
  for (const key of SENSITIVE_BUSINESS_SETTINGS_KEYS) {
    delete sanitized[key];
  }
  return sanitized;
};

const stripSensitiveFromSectionData = (key: string, data: any) => {
  if (key === BUSINESS_SETTINGS_SECTION) {
    return sanitizeBusinessSettings(data);
  }
  return data;
};

export const sanitizeArray = (val: any): any => {
  if (val === null || val === undefined) return val;
  if (val instanceof Date) return val;

  if (typeof val === 'object') {
    if (Array.isArray(val)) {
      return val.map((v) => sanitizeArray(v));
    }

    const keys = Object.keys(val);
    const isArrayLike =
      keys.length > 0 &&
      keys.includes('0') &&
      keys.every((k) => !isNaN(Number(k)) && Number.isInteger(Number(k)));

    if (isArrayLike) {
      const arr: any[] = [];
      let i = 0;
      while (i.toString() in val) {
        arr.push(sanitizeArray(val[i.toString()]));
        i++;
      }
      return arr;
    } else {
      const obj: any = {};
      for (const k of keys) {
        obj[k] = sanitizeArray(val[k]);
      }
      return obj;
    }
  }
  return val;
};

class ContentService {
  static isAdminOnlySection(key: string): boolean {
    return ADMIN_ONLY_SECTION_KEYS.has(key);
  }

  static async getPublishedContent() {
    const cacheKey = 'cms:published:flat';
    return cmsCache.getOrSet(
      cacheKey,
      async () => {
        const sections = await ContentSection.find({ status: 'published' })
          .select('sectionKey data')
          .lean();
        const flatContent: Record<string, unknown> = {};
        sections.forEach((section) => {
          if (ADMIN_ONLY_SECTION_KEYS.has(section.sectionKey)) return;
          flatContent[section.sectionKey] = sanitizeArray(
            stripSensitiveFromSectionData(section.sectionKey, section.data),
          );
        });

        // Ensure homepage sections are always defined so storefront home never enters empty state
        if (!flatContent.homepageSections) {
          flatContent.homepageSections = [
            { id: 'hero_1', label: 'Hero Banner', isVisible: true },
            { id: 'categoryGrid_1', label: 'Category Grid', isVisible: true },
            { id: 'trendingProducts_1', label: 'Trending Products', isVisible: true },
            { id: 'featuredProducts_1', label: 'Featured Collection', isVisible: true },
            { id: 'recommendedProducts_1', label: 'Smart Recommendations', isVisible: true },
          ];
        }

        return flatContent;
      },
      10 * 60 * 1000,
    );
  }

  static async getSectionByKey(key: string) {
    let section = await ContentSection.findOne({ sectionKey: key });
    if (!section) {
      const defaultData: { [key: string]: any } = {
        admin_safety_lock: { safetyLock: false },
        admin_idle_timeout: { idleTimeout: 15 },
        admin_theme_mode: { themeMode: 'dark' },
        admin_auto_publish: { autoPublish: false },
        homepageSections: [
          { id: 'hero_1', label: 'Hero Banner', isVisible: true },
          { id: 'categoryGrid_1', label: 'Category Grid', isVisible: true },
          { id: 'trendingProducts_1', label: 'Trending Products', isVisible: true },
          { id: 'featuredProducts_1', label: 'Featured Collection', isVisible: true },
          { id: 'recommendedProducts_1', label: 'Smart Recommendations', isVisible: true },
        ],
        categoryGrid: {
          sectionTitle: 'Shop by category',
          sectionSubtitle: 'Authentic Andhra & South Indian Delicacies',
          categories: [
            { name: 'Batters', link: '/collections?category=Batters' },
            { name: 'Pickles', link: '/collections?category=Pickles' },
            { name: 'Chutneys', link: '/collections?category=Chutneys' },
            { name: 'Podis', link: '/collections?category=Podis' },
          ],
          isVisible: true,
        },
        trendingProducts: {
          sectionTitle: "Today's picks",
          sectionSubtitle: 'Trending Now',
          useAutoFeed: true,
          maxDisplay: 10,
          isVisible: true,
        },
        featuredProducts: {
          sectionTitle: 'Best Sellers',
          sectionSubtitle: 'Customer Favorites',
          productIds: [],
          maxDisplay: 10,
          isVisible: true,
        },
        recommendedProducts: {
          sectionTitle: 'Recommended For You',
          sectionSubtitle: 'Specially Handpicked',
          useAutoFeed: true,
          maxDisplay: 12,
          isVisible: true,
        },
        [BUSINESS_SETTINGS_SECTION]: {
          businessName: "Akula's Kitchen",
          tagline: '',
          businessEmail: '',
          phoneNumber: '',
          alternatePhone: '',
          gstNumber: '',
          address: '',
          primaryColor: '#735c00',
          secondaryColor: '#F8F9FB',
          fontFamily: 'Playfair Display + Inter',
          freeShippingThreshold: '2000',
          standardShippingFee: '99',
          expressShippingFee: '249',
          codFee: '90',
          deliveryEstimate: '5-7',
          razorpayKeyId: '',
          upiId: '',
          whatsappNumber: '',
          whatsappMessage: "Hello! Thank you for reaching Akula's Kitchen.",
        },
        custom_categories: {
          products: [],
        },
        storeSettings: {},
      };

      if (defaultData[key] !== undefined) {
        section = new ContentSection({
          sectionKey: key,
          data: defaultData[key],
          status: 'published',
        });
        await section.save();
      } else {
        throw new ApiError(404, `Section ${key} not found`);
      }
    }
    if (section) {
      if (key === BUSINESS_SETTINGS_SECTION) {
        section.data = stripSensitiveFromSectionData(key, section.data) as typeof section.data;
      }
      section.data = sanitizeArray(section.data);
    }
    return section;
  }

  static async updateSection(key: string, newData: any, retry = 0): Promise<any> {
    let payload = key === BUSINESS_SETTINGS_SECTION ? sanitizeBusinessSettings(newData) : newData;
    payload = sanitizeArray(payload);
    try {
      let section = await ContentSection.findOne({ sectionKey: key });

      if (section) {
        // Store current data in revision history
        section.revisionHistory.push({
          previousData: section.data,
          modifiedAt: new Date(),
        });

        // Limit revision history to last 10 versions
        if (section.revisionHistory.length > 10) {
          section.revisionHistory.shift();
        }

        section.data = payload;
        section.lastModified = new Date();
        section.status = 'published'; // Always publish on update/save from admin
        section.markModified('data');
        await section.save();
      } else {
        section = new ContentSection({
          sectionKey: key,
          data: payload,
          status: 'published', // Always publish on update/save from admin
        });
        await section.save();
      }

      // Invalidate MemoryCache to ensure immediate sync
      cmsCache.delete(`cms:content:${key}`);
      cmsCache.delete('cms:all_sections');
      cmsCache.delete('cms:published:flat');
      cmsCache.delete(key); // Just in case cache key is set without prefix (like the business settings section)
      if (key === 'admin_safety_lock') {
        await invalidateSafetyLockCache();
      }
      await bumpPublicCacheVersion();

      return section;
    } catch (err: any) {
      if (err.name === 'VersionError' && retry < 3) {
        return this.updateSection(key, newData, retry + 1);
      }
      throw err;
    }
  }

  static async publishAll() {
    const existing = await ContentSection.findOne({ sectionKey: 'homepageSections' });
    if (!existing) {
      await ContentSection.create({
        sectionKey: 'homepageSections',
        data: [
          { id: 'hero_1', label: 'Hero Banner', isVisible: true },
          { id: 'categoryGrid_1', label: 'Category Grid', isVisible: true },
          { id: 'trendingProducts_1', label: 'Trending Products', isVisible: true },
          { id: 'featuredProducts_1', label: 'Featured Collection', isVisible: true },
          { id: 'recommendedProducts_1', label: 'Smart Recommendations', isVisible: true },
        ],
        status: 'published',
      });
    }

    const result = await ContentSection.updateMany(
      { status: { $ne: 'published' } },
      { $set: { status: 'published' } },
    );

    cmsCache.clear();
    await bumpPublicCacheVersion();

    return result;
  }
}

export default ContentService;
