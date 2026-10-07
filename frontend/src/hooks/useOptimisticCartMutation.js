import { useCallback, useRef } from 'react';
import toast from 'react-hot-toast';
import { useCartMutations } from './useCartQueries';
import { calculateCartSummary } from '../utils/ecommerce/cartCalculations';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { hasSessionMarker } from '../utils/auth/authStorage';

const checkAuthLocal = () => hasSessionMarker();

export function useOptimisticCartMutation({
  isAuthenticated,
  runProtectedAction,
  setIsCartOpen,
  emptySummary,
  maxQuantityPerItem = 10,
  maxItemsPerOrder = 5,
}) {
  const { addToCart, removeFromCart, syncCart } = useCartMutations();
  const syncTimeoutRef = useRef(null);
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isAuth = checkAuthLocal();
  const cartKey = isAuth ? user?._id || user?.id || 'authenticated' : 'guest';

  const addItem = useCallback(
    (product) => {
      runProtectedAction(() => {
        const targetCartKey = 'purchaseCart';

        const previousCart = queryClient.getQueryData(['cart', cartKey]);
        const currentItems = previousCart?.[targetCartKey]?.items || [];
        const productId = product._id || product.id;
        const targetSig = product.configurationSignature || 'default';

        const existingItem = currentItems.find((item) => {
          const itemId = item.product?._id || item.product?.id || item._id || item.id;
          const itemSig = item.configurationSignature || 'default';
          return itemId === productId && itemSig === targetSig;
        });

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
        const qty = requestedQty;

        // React Query useCartMutations handles optimistic UI
        addToCart({
          product,
          productId: product._id || product.id,
          quantity: qty,
          selectedOptions: product.selectedOptions,
          customizationNote: product.customizationNote,
        });
      });
    },
    [
      runProtectedAction,
      addToCart,
      setIsCartOpen,
      queryClient,
      cartKey,
      maxItemsPerOrder,
      maxQuantityPerItem,
    ],
  );

  const attemptAddToCart = useCallback(
    (product) => {
      addItem(product);
    },
    [addItem],
  );

  const removeItem = useCallback(
    (id, configurationSignature) => {
      let rawId = id;
      let sig = configurationSignature;
      if (typeof id === 'string' && id.includes('___')) {
        const parts = id.split('___');
        rawId = parts[0];
        if (!sig) sig = parts[1];
      }
      runProtectedAction(() => {
        // React Query useCartMutations handles the optimistic UI and rollback natively now!
        removeFromCart({ productId: rawId, configurationSignature: sig });
      });
    },
    [runProtectedAction, removeFromCart],
  );

  const updateQuantity = useCallback(
    (id, variantOrQuantity, maybeQuantity, maybeSig) => {
      const quantity = maybeQuantity !== undefined ? maybeQuantity : variantOrQuantity;
      let numericQuantity = Number(quantity) || 1;
      let configurationSignature = maybeSig;
      let rawId = id;
      if (typeof id === 'string' && id.includes('___')) {
        const parts = id.split('___');
        rawId = parts[0];
        if (!configurationSignature) configurationSignature = parts[1];
      }

      if (numericQuantity < 1) {
        removeItem(rawId, configurationSignature);
        return;
      }

      if (numericQuantity > maxQuantityPerItem) {
        toast.error(`Maximum allowed quantity is ${maxQuantityPerItem} per product`);
        numericQuantity = maxQuantityPerItem;
      }

      runProtectedAction(() => {
        // 1. Manually update cache instantly for the UI slider responsiveness
        const previousCart = queryClient.getQueryData(['cart', cartKey]);
        if (previousCart) {
          const targetCartKey = 'purchaseCart';
          const updatedItems =
            previousCart[targetCartKey]?.items.map((item) => {
              const itemId = item.product?._id || item.product?.id || item._id || item.id;
              const itemSig = item.configurationSignature || 'default';
              const matches = configurationSignature
                ? (itemId === rawId || String(item.product) === rawId) &&
                  itemSig === configurationSignature
                : itemId === rawId || item.id === id || item._id === id;

              if (matches) {
                return { ...item, quantity: numericQuantity };
              }
              return item;
            }) || [];

          const { subtotal, total } = calculateCartSummary(
            updatedItems,
            previousCart[targetCartKey]?.summary?.shippingFee || 0,
          );

          queryClient.setQueryData(['cart', cartKey], {
            ...previousCart,
            [targetCartKey]: {
              ...previousCart[targetCartKey],
              items: updatedItems,
              summary: {
                ...(previousCart[targetCartKey]?.summary || emptySummary),
                subtotal,
                total,
              },
            },
          });
        }

        // 2. Debounce the actual API call
        if (syncTimeoutRef.current) {
          clearTimeout(syncTimeoutRef.current);
        }

        syncTimeoutRef.current = setTimeout(() => {
          const currentCart = queryClient.getQueryData(['cart', cartKey]);
          const allItems = currentCart?.purchaseCart?.items || [];

          const payload = allItems.map((item) => {
            return {
              product: item.product?._id || item.product?.id || item._id || item.id || item.product,
              quantity: item.quantity,
              selectedOptions: item.selectedOptions || [],
              configurationSignature: item.configurationSignature || 'default',
              configuredUnitPrice: item.configuredUnitPrice || item.price,
            };
          });

          // React Query useCartMutations handles the network request and onSettled invalidation
          syncCart({ cartItems: payload });
        }, 500);
      });
    },
    [
      removeItem,
      runProtectedAction,
      syncCart,
      queryClient,
      cartKey,
      emptySummary,
      maxQuantityPerItem,
    ],
  );

  const clearCart = useCallback(() => {
    runProtectedAction(() => {
      syncCart({ cartItems: [] });
    });
  }, [runProtectedAction, syncCart]);

  return { addItem, attemptAddToCart, removeItem, updateQuantity, clearCart };
}
