import { persistentStorage } from '../utils/storage/persistentStorage';
import { calculateCartSummary } from '../utils/ecommerce/cartCalculations';

const GUEST_CART_KEY = 'akula_guest_cart';
const TTL = 30 * 24 * 60 * 60 * 1000; // 30 days

const defaultCart = {
  purchaseCart: {
    items: [],
    summary: { subtotal: 0, total: 0, shippingFee: 0, platformFee: 0 },
  },
};

const getMaxQtyPerItem = () => {
  try {
    const val = localStorage.getItem('akula_orders_max_qty');
    return val ? Math.max(1, Number(val)) : 50;
  } catch {
    return 50;
  }
};

const getMaxItemsPerOrder = () => {
  try {
    const val = localStorage.getItem('akula_orders_max_items');
    return val ? Math.max(1, Number(val)) : 20;
  } catch {
    return 20;
  }
};

const getPlatformFee = () => {
  try {
    const val = localStorage.getItem('akula_orders_platform_fee');
    return val !== null && val !== undefined ? Math.max(0, Number(val)) : 0;
  } catch {
    return 0;
  }
};

export const GuestCartService = {
  /**
   * Initializes the guest cart with metadata if not present
   */
  _ensureCartData(cart) {
    if (!cart) cart = { ...defaultCart };
    if (!cart.guestCartId) {
      cart.guestCartId = `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      cart.guestCartCreatedAt = new Date().toISOString();
    }
    cart.guestCartUpdatedAt = new Date().toISOString();

    // Ensure structure
    if (!cart.purchaseCart)
      cart.purchaseCart = { items: [], summary: { ...defaultCart.purchaseCart.summary } };

    return cart;
  },

  getCart() {
    let cart = persistentStorage.getItem(GUEST_CART_KEY, { fallback: defaultCart });
    return this._ensureCartData(cart);
  },

  saveCart(cart) {
    const updatedCart = this._ensureCartData(cart);
    persistentStorage.setItem(GUEST_CART_KEY, updatedCart, { ttl: TTL });
    return updatedCart;
  },

  clearCart() {
    persistentStorage.removeItem(GUEST_CART_KEY);
  },

  /**
   * Add or update item in guest cart, distinguishing distinct configurations
   */
  addToCart(product, quantity = 1) {
    const cart = this.getCart();
    const targetCartKey = 'purchaseCart';
    const items = cart[targetCartKey].items || [];

    const maxQty = getMaxQtyPerItem();
    const maxItems = getMaxItemsPerOrder();

    const productId = String(product.productId || product._id || product.id || '');
    const signature = String(product.configurationSignature || 'default');
    const unitPrice = Number(product.configuredUnitPrice ?? product.price ?? 0);

    const existingIndex = items.findIndex((item) => {
      const pId = String(
        item.productId || item.product?._id || item.product?.id || item._id || item.id || '',
      );
      const iSig = String(item.configurationSignature || 'default');
      return pId === productId && iSig === signature;
    });

    let updatedItems;
    if (existingIndex >= 0) {
      updatedItems = [...items];
      const newQty = Math.min(
        maxQty,
        (Number(updatedItems[existingIndex].quantity) || 1) + quantity,
      );
      updatedItems[existingIndex] = {
        ...updatedItems[existingIndex],
        quantity: newQty,
        price: unitPrice || updatedItems[existingIndex].price,
        configuredUnitPrice: unitPrice || updatedItems[existingIndex].configuredUnitPrice,
      };
    } else {
      if (items.length >= maxItems) {
        return this.getCart();
      }
      const itemKey =
        signature && signature !== 'default' ? `${productId}___${signature}` : productId;
      updatedItems = [
        ...items,
        {
          id: itemKey,
          _id: itemKey,
          productId,
          quantity: Math.min(maxQty, quantity),
          product,
          price: unitPrice,
          configuredUnitPrice: unitPrice,
          selectedOptions: product.selectedOptions || [],
          configurationSignature: signature,
          variant: product.variant || 'Default',
          customizationNote: product.customizationNote,
        },
      ];
    }

    const { subtotal, shippingFee, platformFee, total } = calculateCartSummary(
      updatedItems,
      cart[targetCartKey].summary?.shippingFee || 0,
      getPlatformFee(),
    );

    cart[targetCartKey].items = updatedItems;
    cart[targetCartKey].summary = {
      ...(cart[targetCartKey].summary || defaultCart.purchaseCart.summary),
      subtotal,
      shippingFee,
      platformFee,
      total,
    };

    return this.saveCart(cart);
  },

  removeFromCart(productId, configurationSignature) {
    const cart = this.getCart();
    const targetCartKey = 'purchaseCart';
    const items = cart[targetCartKey].items || [];

    const updatedItems = items.filter((item) => {
      const pId = String(
        item.productId || item.product?._id || item.product?.id || item._id || item.id || '',
      );
      const iSig = String(item.configurationSignature || 'default');

      if (configurationSignature) {
        return !(pId === String(productId) && iSig === String(configurationSignature));
      }
      // If no signature given, match exact id or productId
      return (
        pId !== String(productId) &&
        String(item.id) !== String(productId) &&
        String(item._id) !== String(productId)
      );
    });

    const { subtotal, shippingFee, platformFee, total } = calculateCartSummary(
      updatedItems,
      cart[targetCartKey].summary?.shippingFee || 0,
      getPlatformFee(),
    );

    cart[targetCartKey].items = updatedItems;
    cart[targetCartKey].summary = {
      ...(cart[targetCartKey].summary || defaultCart.purchaseCart.summary),
      subtotal,
      shippingFee,
      platformFee,
      total,
    };

    return this.saveCart(cart);
  },

  updateQuantity(productId, quantity, configurationSignature) {
    const cart = this.getCart();
    const targetCartKey = 'purchaseCart';
    const items = cart[targetCartKey].items || [];

    const maxQty = getMaxQtyPerItem();
    const numericQuantity = Math.max(0, Math.min(maxQty, Number(quantity) || 1));

    if (numericQuantity === 0) {
      return this.removeFromCart(productId, configurationSignature);
    }

    const updatedItems = items.map((item) => {
      const pId = String(
        item.productId || item.product?._id || item.product?.id || item._id || item.id || '',
      );
      const iSig = String(item.configurationSignature || 'default');

      const matches = configurationSignature
        ? pId === String(productId) && iSig === String(configurationSignature)
        : pId === String(productId) || String(item.id) === String(productId);

      if (matches) {
        return { ...item, quantity: numericQuantity };
      }
      return item;
    });

    const { subtotal, shippingFee, platformFee, total } = calculateCartSummary(
      updatedItems,
      cart[targetCartKey].summary?.shippingFee || 0,
      getPlatformFee(),
    );

    cart[targetCartKey].items = updatedItems;
    cart[targetCartKey].summary = {
      ...(cart[targetCartKey].summary || defaultCart.purchaseCart.summary),
      subtotal,
      shippingFee,
      platformFee,
      total,
    };

    return this.saveCart(cart);
  },

  /**
   * Returns a flat array of all items for API syncing
   */
  getCartItemsForSync() {
    const cart = this.getCart();
    const allItems = [...(cart.purchaseCart?.items || [])];

    return allItems.map((item) => ({
      product: item.productId || item.product?._id || item.product?.id || item._id || item.id,
      quantity: item.quantity,
      selectedOptions: item.selectedOptions || [],
      configurationSignature: item.configurationSignature || '',
      configuredUnitPrice: item.configuredUnitPrice || item.price,
      variant: item.variant || 'Default',
      customizationNote: item.customizationNote,
    }));
  },

  hasItems() {
    const items = this.getCartItemsForSync();
    return items.length > 0;
  },
};
