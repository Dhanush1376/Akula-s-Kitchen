import ApiError from '../../utils/ApiError';
import User from '../../models/User';
import Product from '../../models/Product';
import mongoose from 'mongoose';
import storeSettingsService from '../StoreSettingsService';
import { ProductConfigurationService } from '../products/ProductConfigurationService';

export class UserCartService {
  static async addToCart(
    userId: string,
    productId: string,
    quantity: number,
    selectedOptions?: any[],
    customizationNote?: string,
  ) {
    const settings = await storeSettingsService.getSettings();
    const maxQtyPerItem = settings?.orders?.maxQuantityPerItem ?? 50;
    const maxItemsPerOrder = settings?.orders?.maxItemsPerOrder ?? 20;

    const qty = Math.max(1, Math.min(maxQtyPerItem, Number(quantity) || 1));
    const product = await Product.findById(productId).select(
      'stock isActive title price optionGroups',
    );
    if (!product || !product.isActive) {
      throw new ApiError(404, 'Product is unavailable');
    }

    // Authoritative server-side validation and pricing
    let effectiveSelectedOptions = selectedOptions;
    if (
      (!effectiveSelectedOptions || effectiveSelectedOptions.length === 0) &&
      Array.isArray(product.optionGroups) &&
      product.optionGroups.length > 0
    ) {
      effectiveSelectedOptions = [];
      for (const group of product.optionGroups) {
        const defaultOpt =
          group.options?.find((o: any) => (o.isDefault || o.default) && o.available !== false) ||
          group.options?.find((o: any) => o.available !== false);
        if (defaultOpt) {
          effectiveSelectedOptions.push({
            groupId: String(group.groupId || group.id || group._id || group.name),
            groupName: group.name,
            optionId: String(
              defaultOpt.optionId ||
                defaultOpt.id ||
                defaultOpt._id ||
                defaultOpt.value ||
                defaultOpt.label,
            ),
            optionLabel: defaultOpt.label,
            priceAdjustment: Number(defaultOpt.priceAdjustment) || 0,
          });
        }
      }
    }

    const configResult = ProductConfigurationService.validateAndCalculateConfiguration(
      product,
      effectiveSelectedOptions || [],
      true,
    );

    const objectId = new mongoose.Types.ObjectId(productId);
    const targetSignature = configResult.configurationSignature || 'default';

    const currentUser = await User.findById(userId);
    if (!currentUser) throw new ApiError(404, 'User not found');

    const currentCart = currentUser.cart || [];
    const existingIndex = currentCart.findIndex((i: any) => {
      const pId = i.product?._id?.toString() || i.product?.toString();
      const sameProduct = pId === productId;
      const iSig = i.configurationSignature || 'default';
      return sameProduct && iSig === targetSignature;
    });

    if (existingIndex >= 0) {
      const existingItem = currentCart[existingIndex];
      const currentQty = Number(existingItem?.quantity) || 0;
      if (currentQty + qty > maxQtyPerItem) {
        throw new ApiError(
          400,
          `Maximum allowed quantity for this product is ${maxQtyPerItem}. You already have ${currentQty} in your cart.`,
        );
      }
      existingItem.quantity = currentQty + qty;
      existingItem.configuredUnitPrice = configResult.configuredUnitPrice;
      if (customizationNote) existingItem.customizationNote = customizationNote;
    } else {
      if (currentCart.length >= maxItemsPerOrder) {
        throw new ApiError(
          400,
          `Order limit reached. Maximum ${maxItemsPerOrder} different products allowed per order.`,
        );
      }
      currentCart.push({
        product: objectId,
        quantity: Math.min(maxQtyPerItem, qty),
        variant: 'Default',
        customizationNote: customizationNote || undefined,
        selectedOptions: configResult.selectedOptions,
        configurationSignature: configResult.configurationSignature,
        configuredUnitPrice: configResult.configuredUnitPrice,
      });
    }

    currentUser.cart = currentCart;
    await currentUser.save();
    return currentUser;
  }

  static async syncCart(userId: string, cartItems: any[]) {
    const user = await User.findById(userId);
    if (!user) throw new ApiError(404, 'User not found');

    const settings = await storeSettingsService.getSettings();
    const maxQtyPerItem = settings?.orders?.maxQuantityPerItem ?? 50;
    const maxItemsPerOrder = settings?.orders?.maxItemsPerOrder ?? 20;

    const rawItems = (cartItems || []).filter((item: any) => item.product || item._id || item.id);
    const productIds = Array.from(
      new Set(
        rawItems
          .map((i: any) => i.product?._id || i.product?.id || i.product || i._id || i.id)
          .filter(Boolean),
      ),
    );

    const products = await Product.find({ _id: { $in: productIds } }).select(
      'title price stock isActive optionGroups',
    );
    const productsMap = new Map(products.map((p: any) => [p._id.toString(), p]));

    const updatedCart = [];
    for (const item of rawItems) {
      const pid = String(
        item.product?._id || item.product?.id || item.product || item._id || item.id,
      );
      const prod = productsMap.get(pid);
      if (!prod || !prod.isActive) continue;

      const qty = Math.max(1, Math.min(maxQtyPerItem, Number(item.quantity) || 1));
      const config = ProductConfigurationService.validateAndCalculateConfiguration(
        prod,
        item.selectedOptions || [],
        false, // non-strict so stale selections don't break whole cart sync
      );

      updatedCart.push({
        product: prod._id,
        quantity: qty,
        variant: item.variant || 'Default',
        customizationNote: item.customizationNote,
        selectedOptions: config.selectedOptions,
        configurationSignature: config.configurationSignature,
        configuredUnitPrice: config.configuredUnitPrice,
      });
    }

    if (updatedCart.length > maxItemsPerOrder) {
      throw new ApiError(
        400,
        `Cart limit reached. Maximum ${maxItemsPerOrder} different products allowed per order.`,
      );
    }

    await User.findOneAndUpdate({ _id: userId }, { $set: { cart: updatedCart } });
    return User.findById(userId);
  }

  static async removeFromCart(userId: string, productId: string, configurationSignature?: string) {
    const pullQuery: any = {
      product: new mongoose.Types.ObjectId(productId),
    };
    if (configurationSignature) {
      pullQuery.configurationSignature = configurationSignature;
    }

    const user = await User.findOneAndUpdate(
      { _id: userId },
      { $pull: { cart: pullQuery } },
      { new: true },
    );

    if (!user) throw new ApiError(404, 'User not found');
    return user;
  }

  static async mergeCart(userId: string, guestItems: any[]) {
    const user = await User.findById(userId).populate({
      path: 'cart.product',
      select: 'title isActive stock price imageSrc category isNonRefundable optionGroups',
    });

    if (!user) throw new ApiError(404, 'User not found');

    const settings = await storeSettingsService.getSettings();
    const maxQtyPerItem = settings?.orders?.maxQuantityPerItem ?? 50;
    const maxItemsPerOrder = settings?.orders?.maxItemsPerOrder ?? 20;

    const existingCart = user.cart || [];
    const droppedItems: any[] = [];
    const mergedCart = [...existingCart.map((i: any) => (i.toObject ? i.toObject() : i))];

    for (const item of guestItems || []) {
      const productId =
        item.product?._id || item.product?.id || item.product || item._id || item.id;
      if (!productId) continue;

      const product = await Product.findById(productId).select(
        'isActive stock title price optionGroups',
      );
      const isOutOfStock = (Number(product?.stock) || 0) <= 0;

      if (!product || !product.isActive || isOutOfStock) {
        droppedItems.push({ productId, reason: 'Unavailable or Out of Stock' });
        continue;
      }

      const config = ProductConfigurationService.validateAndCalculateConfiguration(
        product,
        item.selectedOptions || [],
        false,
      );

      const targetSignature = config.configurationSignature || 'default';
      const existingIndex = mergedCart.findIndex((i: any) => {
        const iProductId = i.product?._id?.toString() || i.product?.toString();
        const sameProduct = iProductId === productId.toString();
        const iSig = i.configurationSignature || 'default';
        return sameProduct && iSig === targetSignature;
      });

      const qtyToAdd = Math.max(1, Number(item.quantity) || 1);

      if (existingIndex >= 0) {
        mergedCart[existingIndex].quantity = Math.min(
          maxQtyPerItem,
          mergedCart[existingIndex].quantity + qtyToAdd,
        );
        mergedCart[existingIndex].configuredUnitPrice = config.configuredUnitPrice;
      } else {
        if (mergedCart.length >= maxItemsPerOrder) {
          droppedItems.push({
            productId,
            reason: `Order limit reached (max ${maxItemsPerOrder} products)`,
          });
          continue;
        }
        mergedCart.push({
          product: product._id,
          quantity: Math.min(maxQtyPerItem, qtyToAdd),
          variant: item.variant || 'Default',
          customizationNote: item.customizationNote,
          selectedOptions: config.selectedOptions,
          configurationSignature: config.configurationSignature,
          configuredUnitPrice: config.configuredUnitPrice,
        });
      }
    }

    // Save
    user.cart = mergedCart;
    await user.save();

    const updatedUser = await User.findById(userId).populate({
      path: 'cart.product',
      select:
        'title isActive stock price oldPrice imageSrc category isNonRefundable seller rating optionGroups',
    });

    return { cart: updatedUser?.cart || [], droppedItems };
  }
}
