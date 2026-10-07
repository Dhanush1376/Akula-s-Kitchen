import ApiError from '../../utils/ApiError';
import User from '../../models/User';
import Product from '../../models/Product';
import {
  cacheWishlist,
  getCachedSessionJson,
  sessionKeys,
} from '../../utils/cache/userSessionCache';

export class UserWishlistService {
  static async getWishlist(userId: string) {
    const cacheKey = sessionKeys.wishlist(userId);
    const cached = await getCachedSessionJson<unknown[]>(cacheKey);
    if (cached) {
      return { data: cached, cacheStatus: 'HIT' };
    }

    const user = await User.findById(userId).select('wishlist');
    if (!user) throw new ApiError(404, 'User not found');

    const wishlistArray = user.wishlist || [];

    const products = await Product.find({ _id: { $in: wishlistArray } })
      .select(
        'name title price oldPrice strikingPrice imageSrc images primaryCategory isAvailable quantity availableQuantity slug',
      )
      .populate('primaryCategory', 'name')
      .lean();

    const itemMap = new Map<string, any>();
    products.forEach((p: any) => {
      itemMap.set(p._id.toString(), {
        ...p,
        itemType: 'product',
        category: p.primaryCategory?.name || 'General',
      });
    });

    // Map wishlist items in exact sequence of wishlistArray (latest first at index 0)
    const combinedWishlist = wishlistArray
      .map((id: any) => itemMap.get(id.toString()))
      .filter(Boolean);

    await cacheWishlist(userId, combinedWishlist);
    return { data: combinedWishlist, cacheStatus: 'MISS' };
  }

  static async toggleWishlist(userId: string, productId: string) {
    const user = await User.findById(userId);
    if (!user) throw new ApiError(404, 'User not found');

    if (!user.wishlist) {
      user.wishlist = [];
    }

    const index = user.wishlist.findIndex((id: any) => id.toString() === productId);
    let action = 'Added to wishlist';

    if (index === -1) {
      if (user.wishlist.length >= 100) {
        throw new ApiError(400, 'Wishlist capacity reached. Maximum 100 items allowed.');
      }
      user.wishlist.unshift(productId as any);
    } else {
      user.wishlist.splice(index, 1);
      action = 'Removed from wishlist';
    }

    await user.save();

    return { action, wishlist: user.wishlist };
  }
}
