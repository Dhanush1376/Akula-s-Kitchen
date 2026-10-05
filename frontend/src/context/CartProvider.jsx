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

  const [activeCartMode, setActiveCartMode] = useState(() => {
    return persistentStorage.getItem('akula_cart_mode', { fallback: 'purchase' });
  });

  useEffect(() => {
    persistentStorage.setItem('akula_cart_mode', activeCartMode);
  }, [activeCartMode]);

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

  const customCart = emptyCart;

  const items = activeCartMode === 'custom' ? customCart.items : purchaseCart.items;
  const summary = activeCartMode === 'custom' ? customCart.summary : purchaseCart.summary;

  const {
    addItem: optAddItem,
    removeItem: optRemoveItem,
    updateQuantity: optUpdateQuantity,
    clearCart: optClearCart,
  } = useOptimisticCartMutation({
    isAuthenticated,
    activeCartMode,
    setActiveCartMode,
    runProtectedAction, // Note: we'll bypass this in useOptimisticCartMutation shortly
    setIsCartOpen,
    emptySummary,
    maxQuantityPerItem,
    maxItemsPerOrder,
  });

  // Abstracted Cart Actions
  const addItem = useCallback(
    (product) => {
      if (isAuthenticated) {
        setIsCartOpen(true);
        optAddItem(product);
      } else {
        const currentGuestCart = GuestCartService.getCart();
        const targetCartKey = 'purchaseCart';
        const currentItems = currentGuestCart[targetCartKey]?.items || [];
        const itemId = product._id || product.id;
        const existingItem = currentItems.find(
          (item) => (item.product?._id || item.product?.id || item._id || item.id) === itemId,
        );
        const currentQty = existingItem ? Number(existingItem.quantity) || 0 : 0;
        const requestedQty = Number(product.quantity) || 1;

        if (!existingItem && currentItems.length >= maxItemsPerOrder) {
          toast.error(`Maximum ${maxItemsPerOrder} different products allowed per order`);
          return;
        }
        if (currentQty + requestedQty > maxQuantityPerItem) {
          toast.error(`Maximum allowed quantity is ${maxQuantityPerItem} per product`);
          return;
        }

        setIsCartOpen(true);
        GuestCartService.addToCart(product, product.quantity || 1, 'purchase');
        setGuestCart(GuestCartService.getCart());
      }
    },
    [isAuthenticated, optAddItem, setIsCartOpen, maxItemsPerOrder, maxQuantityPerItem],
  );

  const attemptAddToCart = useCallback(
    (product) => {
      const itemType = product.type || 'purchase';
      if (itemType !== activeCartMode) {
        toast(`Switched to ${itemType === 'custom' ? 'Custom' : 'Purchase'} Cart to add this item`);
        setActiveCartMode(itemType);
      }
      addItem(product);
    },
    [activeCartMode, addItem],
  );

  const removeItem = useCallback(
    (id) => {
      if (isAuthenticated) {
        optRemoveItem(id);
      } else {
        GuestCartService.removeFromCart(id, activeCartMode);
        setGuestCart(GuestCartService.getCart());
      }
    },
    [isAuthenticated, optRemoveItem, activeCartMode],
  );

  const updateQuantity = useCallback(
    (id, variantOrQuantity, maybeQuantity) => {
      const quantity = maybeQuantity !== undefined ? maybeQuantity : variantOrQuantity;
      const numQty = Number(quantity) || 1;
      const clampedQuantity = Math.max(0, Math.min(maxQuantityPerItem, numQty));
      if (numQty > maxQuantityPerItem) {
        toast.error(`Maximum allowed quantity is ${maxQuantityPerItem} per product`);
      }
      if (isAuthenticated) {
        optUpdateQuantity(id, variantOrQuantity, clampedQuantity);
      } else {
        GuestCartService.updateQuantity(id, clampedQuantity, activeCartMode);
        setGuestCart(GuestCartService.getCart());
      }
    },
    [isAuthenticated, optUpdateQuantity, activeCartMode, maxQuantityPerItem],
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

  const purchaseCartCount = useMemo(
    () => purchaseCart.items.reduce((acc, item) => acc + item.quantity, 0),
    [purchaseCart.items],
  );
  const customCartCount = useMemo(
    () => customCart.items.reduce((acc, item) => acc + item.quantity, 0),
    [customCart.items],
  );

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
      purchaseCartCount,
      customCartCount,
      purchaseCart,
      customCart,
      activeCartMode,
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
      purchaseCartCount,
      customCartCount,
      purchaseCart,
      customCart,
      activeCartMode,
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
      setActiveCartMode,
    }),
    [
      addItem,
      attemptAddToCart,
      removeItem,
      updateQuantity,
      clearCart,
      setIsCartOpen,
      setActiveCartMode,
    ],
  );

  return (
    <CartStateContext.Provider value={stateValue}>
      <CartDispatchContext.Provider value={dispatchValue}>{children}</CartDispatchContext.Provider>
    </CartStateContext.Provider>
  );
}
