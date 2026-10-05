import Product from '../models/Product';
import ApiError from '../utils/ApiError';
import storeSettingsService from '../services/StoreSettingsService';
import { computeOrderTotals } from './orders/orderTotals';

export class OrderValidationService {
  static async validateTotals(userId: string, data: any) {
    const { items } = data;
    if (!items || !Array.isArray(items) || items.length === 0) {
      throw new ApiError(400, 'Items array is required');
    }

    const settings = await storeSettingsService.getSettings();

    const MAX_QUANTITY_PER_ITEM = settings.orders.maxQuantityPerItem;
    const MAX_ITEMS_PER_ORDER = settings.orders.maxItemsPerOrder;

    if (items.length > MAX_ITEMS_PER_ORDER) {
      throw new ApiError(
        400,
        `Order exceeds maximum allowed limit of ${MAX_ITEMS_PER_ORDER} distinct items. Current items count: ${items.length}`,
      );
    }

    for (const item of items) {
      if (
        typeof item.quantity !== 'number' ||
        !Number.isInteger(item.quantity) ||
        item.quantity < 1
      ) {
        throw new ApiError(400, `Invalid quantity for item: ${item.productId}`);
      }
      if (item.quantity > MAX_QUANTITY_PER_ITEM) {
        throw new ApiError(
          400,
          `Quantity (${item.quantity}) exceeds the maximum allowed limit of ${MAX_QUANTITY_PER_ITEM} per product.`,
        );
      }
    }

    let subtotal = 0;

    const productIds = [
      ...new Set(items.map((item: any) => String(item.productId)).filter(Boolean)),
    ] as any[];

    const products = await Product.find({ _id: { $in: productIds } }).select(
      'title price stock category isActive rentalEnabled rentalPricing securityDeposit isDepositRefundable',
    );

    const productsById = new Map<string, any>(
      products.map((product: any) => [product._id.toString(), product]),
    );

    let depositTotal = 0;

    // 1. Validate stock availability and calculate actual subtotal from DB
    for (const item of items) {
      const product = productsById.get(String(item.productId));
      if (!product) throw new ApiError(404, `Product not found: ${item.productId}`);
      if (!product.isActive)
        throw new ApiError(400, `Product is no longer active: ${product.title}`);
      const availableStock = product.stock - (product.reservedStock || 0);
      if (availableStock < item.quantity) {
        throw new ApiError(400, `Insufficient stock for product: ${product.title}`);
      }

      let itemPrice = product.price;

      if (item.type === 'rental') {
        if (!product.rentalEnabled)
          throw new ApiError(400, `Product is not available for rent: ${product.title}`);

        if (
          product.rentalPricing?.rentalPrice !== undefined &&
          product.rentalPricing?.rentalPrice !== null
        ) {
          itemPrice = product.rentalPricing.rentalPrice;
        }

        // Add security deposit
        if (product.securityDeposit) {
          depositTotal += product.securityDeposit * item.quantity;
        }
      }

      item._calculatedPrice = itemPrice;
      subtotal += itemPrice * item.quantity;
    }

    const discount = 0;

    const { paymentMethod } = data;
    const isCod = Boolean(paymentMethod && paymentMethod.toLowerCase() === 'cod');

    const totals = computeOrderTotals({
      subtotal,
      discount: 0,
      depositTotal,
      isCod,
      codFee: settings.payments.codFee,
      enableFreeShipping: settings.shipping.enableFreeShipping,
      freeShippingThreshold: settings.shipping.freeShippingThreshold,
      deliveryCharge: settings.shipping.deliveryCharge,
      platformFee: settings.orders.platformFee || 0,
    });

    const { shippingFee, platformFee, codFee, total } = totals;

    const orderValueForLimits = subtotal;
    if (settings.orders.minOrderValue && orderValueForLimits < settings.orders.minOrderValue) {
      throw new ApiError(400, `Minimum order value must be ₹${settings.orders.minOrderValue}`);
    }
    if (settings.orders.maxOrderValue && orderValueForLimits > settings.orders.maxOrderValue) {
      throw new ApiError(400, `Maximum order value must be ₹${settings.orders.maxOrderValue}`);
    }

    // Estimate reward coins
    const coinsToEarn = Math.round(subtotal * settings.loyalty.coinsPerRupee);

    // Generate a random cashback percentage between 1% and 4% (1 decimal place)
    const randomPercent = Math.round((Math.random() * (4.0 - 1.0) + 1.0) * 10) / 10;
    const cashbackRate = randomPercent / 100;

    let estimatedCashback = Math.round(total * cashbackRate);
    if (estimatedCashback > 40) {
      estimatedCashback = 40;
    }

    return {
      subtotal,
      discount,
      shippingFee,
      platformFee,
      codFee,
      walletBalance: 0,
      walletDeduction: 0,
      coinsEarned: coinsToEarn,
      cashbackEarned: estimatedCashback,
      total,
      depositTotal,
    };
  }
}
