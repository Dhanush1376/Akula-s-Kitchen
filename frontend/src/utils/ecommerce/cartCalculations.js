import { logCartTrace, forensicHashId } from '../forensic/cartTrace';
import { BRAND } from '../../config/brand';

export function cleanRentalInfo(_rentalInfo) {
  return undefined;
}

export function calculateCartSummary(
  items,
  _cartType,
  shippingFee = 0,
  platformFee = 0,
  taxSettings,
) {
  const subtotal = items.reduce((sum, item) => {
    const itemPrice = item.price || item.product?.price || 0;
    return sum + itemPrice * item.quantity;
  }, 0);

  const depositTotal = 0;
  const resolvedPlatformFee = items.length > 0 ? Math.max(0, platformFee || 0) : 0;

  if (taxSettings && typeof taxSettings === 'object') {
    const gstEnabled = taxSettings.gstEnabled ?? true;
    const taxInclusive = taxSettings.taxInclusive ?? true;
    const gstRate = Number(taxSettings.gstRate) || 0.18;

    let estimatedTax = 0;
    if (gstEnabled) {
      if (taxInclusive) {
        const taxableBase = Math.round((subtotal / (1 + gstRate)) * 100) / 100;
        estimatedTax = Math.round((subtotal - taxableBase) * 100) / 100;
      } else {
        estimatedTax = Math.round(subtotal * gstRate * 100) / 100;
      }
    }

    const total =
      !gstEnabled || taxInclusive
        ? Math.round((subtotal + depositTotal + shippingFee + resolvedPlatformFee) * 100) / 100
        : Math.round(
            (subtotal + depositTotal + shippingFee + resolvedPlatformFee + estimatedTax) * 100,
          ) / 100;

    return {
      subtotal,
      depositTotal,
      shippingFee,
      platformFee: resolvedPlatformFee,
      estimatedTax,
      taxInclusive,
      gstEnabled,
      total,
    };
  }

  const total = subtotal + depositTotal + shippingFee + resolvedPlatformFee;
  return { subtotal, depositTotal, shippingFee, platformFee: resolvedPlatformFee, total };
}

export function transformDbCart(dbCartItems) {
  if (!dbCartItems || !Array.isArray(dbCartItems)) return [];
  return dbCartItems
    .filter((item) => {
      const isValid = !!item.product;
      if (!isValid) {
        logCartTrace('TRANSFORM_ITEM_REJECTED', {
          productHash: forensicHashId(
            item?.product?._id || item?.product?.id || item?._id || item?.id,
          ),
          reason: 'MISSING_PRODUCT',
          source: 'transformDbCart',
        });
      }
      return isValid;
    })
    .map((item) => {
      const itemPrice = item.price ?? item.product?.price ?? 0;
      const itemId = item.product._id || item.product.id || item._id || item.id;

      return {
        id: itemId,
        _id: itemId,
        title: item.product.title || item.title,
        price: itemPrice,
        oldPrice: item.product.oldPrice || item.product.price || item.price,
        stock: item.product.stock ?? 10,
        seller: item.product.seller || BRAND.name,
        rating: item.product.rating || 0,
        imageSrc:
          item.product.imageSrc ||
          (item.product.images?.length > 0 ? item.product.images[0] : null) ||
          item.imageSrc,
        category: item.product.category || item.category,
        quantity: item.quantity,
        variant: item.variant || 'Default',
        type: item.type || 'purchase',
        deposit: 0,
        isNonRefundable: item.product.isNonRefundable ?? item.isNonRefundable,
        customizationConfig: item.product.customizationConfig,
        product: item.product,
      };
    });
}
