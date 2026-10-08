import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from './AuthContext';
import { CartStateContext, CartDispatchContext } from './CartContext';
import { useCartQuery } from '../hooks/useCartQueries';
import { useOptimisticCartMutation } from '../hooks/useOptimisticCartMutation';
import { transformDbCart } from '../utils/ecommerce/cartCalculations';
import { persistentStorage } from '../utils/storage/persistentStorage';
import { GuestCartService } from '../services/GuestCartService';
import { userService } from '../services/api/userService';
import { useConfig } from './ConfigContext';

export function CartProvider({ children }) {
  const { isAuthenticated, runProtectedAction } = useAuth();
  const { maxItemsPerOrder = 5, maxQuantityPerItem = 10 } = useConfig();
  const queryClient = useQueryClient();

  // Earlier builds kept a second cart "mode" in storage; it no longer exists.
  useEffect(() => {
    persistentStorage.removeItem('akula_cart_mode');
  }, []);

  const emptySummary = useMemo(
    () => ({ subtotal: 0, shippingFee: 0, platformFee: 0, total: 0 }),
    [],
  );

  const emptyCart = useMemo(() => ({ items: [], summary: emptySummary }), [emptySummary]);

  const [isCartOpen, setIsCartOpen] = useState(false);

  // Guest Cart Local State
  const [guestCart, setGuestCart] = useState(() => GuestCartService.getCart());

  // Merge Guest Cart on Login
  const prevAuth = useRef(isAuthenticated);
  const [isMerging, setIsMerging] = useState(false);

  useEffect(() => {
    const handleLoginSync = async () => {
      if (!prevAuth.current && isAuthenticated) {
        if (GuestCartService.hasItems()) {
          const guestItems = GuestCartService.getCartItemsForSync();
          setIsMerging(true);
          try {
            const { data } = await userService.mergeGuestCart(guestItems);

            // Validate returned cart format to prevent query cache corruption
            if (data?.cart) {
              // Invalidate query to fetch the newly merged cart
              await queryClient.invalidateQueries({ queryKey: ['cart', 'authenticated'] });
            }

            GuestCartService.clearCart();
            setGuestCart(GuestCartService.getCart()); // Reset local state

            if (data?.droppedItems?.length > 0) {
              const count = data.droppedItems.length;
              toast.error(`${count} item(s) were removed because they are no longer available.`);
            }
            toast.success('Your guest cart has been merged successfully.');
            setIsCartOpen(true);
          } catch (err) {
            console.error('Failed to merge guest cart', err);
            toast.error('Failed to sync guest cart. Please check your bag.');
          } finally {
            setIsMerging(false);
          }
        }
      }
      prevAuth.current = isAuthenticated;
    };

    handleLoginSync();
  }, [isAuthenticated, queryClient]);

  const { data: cartData, isLoading: cartLoading } = useCartQuery();

  const purchaseCart = useMemo(() => {
    if (isAuthenticated) {
      if (cartData?.purchaseCart) {
        const rawItems = cartData.purchaseCart.items || [];
        const transformed = transformDbCart(rawItems);
        return {
          items: transformed,
          summary: cartData.purchaseCart.summary,
        };
      }
      return emptyCart;
    }
    // Return Guest Cart
    const guestItems = guestCart.purchaseCart?.items || [];
    return {
      items: transformDbCart(guestItems),
      summary: guestCart.purchaseCart?.summary || emptyCart.summary,
    };
  }, [isAuthenticated, cartData, guestCart, emptyCart]);

  const items = purchaseCart.items;
  const summary = purchaseCart.summary;

  const {
    addItem: optAddItem,
    removeItem: optRemoveItem,
    updateQuantity: optUpdateQuantity,
    clearCart: optClearCart,
  } = useOptimisticCartMutation({
    isAuthenticated,
    runProtectedAction, // Note: we'll bypass this in useOptimisticCartMutation shortly
    setIsCartOpen,
    emptySummary,
    maxQuantityPerItem,
    maxItemsPerOrder,
  });

  // Abstracted Cart Actions
  const addItem = useCallback(
    (product) => {
      // Ensure default size / options are always selected if not already present
      let enrichedProduct = { ...product };
      if (
        (!enrichedProduct.selectedOptions || enrichedProduct.selectedOptions.length === 0) &&
        Array.isArray(enrichedProduct.optionGroups) &&
        enrichedProduct.optionGroups.length > 0
      ) {
        const defaults = [];
        enrichedProduct.optionGroups.forEach((group) => {
          const defaultOpt =
            (group.options || []).find(
              (opt) => (opt.default || opt.isDefault) && opt.available !== false,
            ) || (group.options || []).find((opt) => opt.available !== false);

          if (defaultOpt) {
            defaults.push({
              groupId: String(group.groupId || group.id || group._id || group.name),
              groupName: group.name,
              optionId: String(
                defaultOpt.optionId || defaultOpt.id || defaultOpt._id || defaultOpt.value,
              ),
              optionLabel: defaultOpt.label,
              priceAdjustment: Number(defaultOpt.priceAdjustment) || 0,
            });
          }
        });
        if (defaults.length > 0) {
          enrichedProduct.selectedOptions = defaults;
          const totalAdj = defaults.reduce((sum, d) => sum + (d.priceAdjustment || 0), 0);
          const baseP = Number(enrichedProduct.basePrice ?? enrichedProduct.price ?? 0);
          enrichedProduct.configuredUnitPrice = Math.max(0, baseP + totalAdj);
          enrichedProduct.price = enrichedProduct.configuredUnitPrice;
          enrichedProduct.configurationSignature = defaults
            .slice()
            .sort((a, b) => a.groupId.localeCompare(b.groupId))
            .map((d) => `${d.groupId}:${d.optionId}`)
            .join('|');
        }
      }

      const shouldOpenDrawer =
        typeof window !== 'undefined' &&
        !window.location.pathname.startsWith('/cart') &&
        !window.location.pathname.startsWith('/checkout');

      if (isAuthenticated) {
        if (shouldOpenDrawer) setIsCartOpen(true);
        optAddItem(enrichedProduct);
      } else {
        const currentGuestCart = GuestCartService.getCart();
        const targetCartKey = 'purchaseCart';
        const currentItems = currentGuestCart[targetCartKey]?.items || [];
        const itemId = enrichedProduct._id || enrichedProduct.id;
        const sig = enrichedProduct.configurationSignature || 'default';
        const existingItem = currentItems.find((item) => {
          const pId = item.product?._id || item.product?.id || item._id || item.id;
          const iSig = item.configurationSignature || 'default';
          return pId === itemId && iSig === sig;
        });
        const currentQty = existingItem ? Number(existingItem.quantity) || 0 : 0;
        const requestedQty = Number(enrichedProduct.quantity) || 1;

        if (!existingItem && currentItems.length >= maxItemsPerOrder) {
          toast.error(`Maximum ${maxItemsPerOrder} different products allowed per order`);
          return;
        }
        if (currentQty + requestedQty > maxQuantityPerItem) {
          toast.error(`Maximum allowed quantity is ${maxQuantityPerItem} per product`);
          return;
        }

        if (shouldOpenDrawer) setIsCartOpen(true);
        GuestCartService.addToCart(enrichedProduct, enrichedProduct.quantity || 1);
        setGuestCart(GuestCartService.getCart());
      }
    },
    [isAuthenticated, optAddItem, setIsCartOpen, maxItemsPerOrder, maxQuantityPerItem],
  );

  const attemptAddToCart = useCallback((product) => addItem(product), [addItem]);

  const removeItem = useCallback(
    (id, configurationSignature) => {
      let rawId = id;
      let sig = configurationSignature;
      if (typeof id === 'string' && id.includes('___')) {
        const parts = id.split('___');
        rawId = parts[0];
        if (!sig) sig = parts[1];
      }
      if (isAuthenticated) {
        optRemoveItem(rawId, sig);
      } else {
        GuestCartService.removeFromCart(rawId, sig);
        setGuestCart(GuestCartService.getCart());
      }
    },
    [isAuthenticated, optRemoveItem],
  );

  const updateQuantity = useCallback(
    (id, variantOrQuantity, maybeQuantity, maybeSig) => {
      const quantity = maybeQuantity !== undefined ? maybeQuantity : variantOrQuantity;
      let rawId = id;
      let sig = maybeSig;
      if (typeof id === 'string' && id.includes('___')) {
        const parts = id.split('___');
        rawId = parts[0];
        if (!sig) sig = parts[1];
      }
      const numQty = Number(quantity) || 1;
      const clampedQuantity = Math.max(0, Math.min(maxQuantityPerItem, numQty));
      if (numQty > maxQuantityPerItem) {
        toast.error(`Maximum allowed quantity is ${maxQuantityPerItem} per product`);
      }
      if (isAuthenticated) {
        optUpdateQuantity(rawId, variantOrQuantity, clampedQuantity, sig);
      } else {
        GuestCartService.updateQuantity(rawId, clampedQuantity, sig);
        setGuestCart(GuestCartService.getCart());
      }
    },
    [isAuthenticated, optUpdateQuantity, maxQuantityPerItem],
  );

  const clearCart = useCallback(() => {
    if (isAuthenticated) {
      optClearCart();
    } else {
      GuestCartService.clearCart();
      setGuestCart(GuestCartService.getCart());
    }
  }, [isAuthenticated, optClearCart]);

  const cartCount = useMemo(() => items.reduce((acc, item) => acc + item.quantity, 0), [items]);

  const subtotal = summary?.subtotal || 0;

  const totalMRP = useMemo(
    () =>
      items.reduce(
        (acc, item) => acc + (Number(item.oldPrice || item.price) || 0) * item.quantity,
        0,
      ),
    [items],
  );

  const itemsMap = useMemo(() => {
    const map = new Map();
    items.forEach((item) => map.set(item.id, item));
    return map;
  }, [items]);

  const isInCart = useCallback(
    (id) => {
      return itemsMap.has(id);
    },
    [itemsMap],
  );

  const stateValue = useMemo(
    () => ({
      items,
      cartCount,
      purchaseCart,
      subtotal,
      totalMRP,
      summary: summary || emptySummary,
      isCartOpen,
      loading: (isAuthenticated ? cartLoading : false) || isMerging,
      isInCart,
    }),
    [
      items,
      cartCount,
      purchaseCart,
      subtotal,
      totalMRP,
      summary,
      emptySummary,
      isCartOpen,
      cartLoading,
      isMerging,
      isInCart,
      isAuthenticated,
    ],
  );

  const dispatchValue = useMemo(
    () => ({
      addItem,
      attemptAddToCart,
      removeItem,
      updateQuantity,
      clearCart,
      setIsCartOpen,
    }),
    [addItem, attemptAddToCart, removeItem, updateQuantity, clearCart, setIsCartOpen],
  );

  return (
    <CartStateContext.Provider value={stateValue}>
      <CartDispatchContext.Provider value={dispatchValue}>{children}</CartDispatchContext.Provider>
    </CartStateContext.Provider>
  );
}
