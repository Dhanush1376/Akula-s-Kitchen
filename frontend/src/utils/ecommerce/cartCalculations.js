import { logCartTrace, forensicHashId } from '../forensic/cartTrace';
import { BRAND } from '../../config/brand';

export function calculateCartSummary(items, shippingFee = 0, platformFee = 0, _taxSettings) {
  const subtotal = items.reduce((sum, item) => {
    const itemPrice = Number(item.configuredUnitPrice ?? item.price ?? item.product?.price ?? 0);
    return sum + itemPrice * item.quantity;
  }, 0);

  const resolvedPlatformFee = items.length > 0 ? Math.max(0, platformFee || 0) : 0;
  const total = Math.round((subtotal + shippingFee + resolvedPlatformFee) * 100) / 100;

  return {
    subtotal,
    shippingFee,
    platformFee: resolvedPlatformFee,
    estimatedTax: 0,
    taxInclusive: false,
    gstEnabled: false,
    total,
  };
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
      const unitPrice = Number(item.configuredUnitPrice ?? item.price ?? item.product?.price ?? 0);
      const rawProductId =
        item.product._id || item.product.id || item.productId || item._id || item.id;
      const signature = item.configurationSignature || '';
      const uniqueId =
        signature && signature !== 'default' ? `${rawProductId}___${signature}` : rawProductId;

      return {
        id: uniqueId,
        _id: uniqueId,
        productId: rawProductId,
        title: item.product.title || item.title,
        price: unitPrice,
        configuredUnitPrice: unitPrice,
        selectedOptions: item.selectedOptions || [],
        configurationSignature: signature,
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
        customizationNote: item.customizationNote,
        isNonRefundable: item.product.isNonRefundable ?? item.isNonRefundable,
        customizationConfig: item.product.customizationConfig,
        product: item.product,
      };
    });
}
