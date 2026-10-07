import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { userService } from '../services/domainServices';
import { hasSessionMarker } from '../utils/auth/authStorage';
import toast from 'react-hot-toast';
import { getErrorMessage } from '../utils/core/errorHelpers';
import { useAuth } from '../context/AuthContext';
import { calculateCartSummary } from '../utils/ecommerce/cartCalculations';
import { GuestCartService } from '../services/GuestCartService';
import { logCartTrace, forensicHashId } from '../utils/forensic/cartTrace';
import { useEffect, useRef } from 'react';
const checkAuthLocal = () => hasSessionMarker();

const emptyCart = {
  items: [],
  summary: { subtotal: 0, total: 0, shippingFee: 0, platformFee: 0 },
};
const defaultCart = { purchaseCart: emptyCart };

export function useCartQuery() {
  const { user } = useAuth();
  const isAuth = checkAuthLocal();
  const cartKey = isAuth ? user?._id || user?.id || 'authenticated' : 'guest';

  const prevCartKey = useRef(cartKey);
  useEffect(() => {
    if (prevCartKey.current !== cartKey) {
      logCartTrace('CART_KEY_CHANGE', {
        previousCartKey: prevCartKey.current,
        nextCartKey: cartKey,
        isAuth,
        hasUserId: !!(user?._id || user?.id),
        hashedUserId: forensicHashId(user?._id || user?.id),
      });
      prevCartKey.current = cartKey;
    }
  }, [cartKey, isAuth, user]);

  return useQuery({
    queryKey: ['cart', cartKey],
    queryFn: async ({ signal }) => {
      logCartTrace('GET_START', {
        queryKey: `cart,${cartKey}`,
        cartKey,
        source: 'useCartQueries.queryFn',
      });
      const res = await userService.getCart({ signal });
      const responseShape = typeof res === 'object' ? Object.keys(res).join(',') : typeof res;
      logCartTrace('GET_RESPONSE', {
        queryKey: `cart,${cartKey}`,
        cartKey,
        cartData: res.success ? res.data : res,
        responseShape,
        source: 'useCartQueries.queryFn',
      });
      const dataToReturn = res.success ? res.data : res;
      logCartTrace('QUERY_FN_RETURN', {
        queryKey: `cart,${cartKey}`,
        cartKey,
        cartData: dataToReturn,
        source: 'useCartQueries.queryFn',
      });
      return dataToReturn;
    },
    enabled: checkAuthLocal(),
    gcTime: 30 * 60 * 1000,
    staleTime: 1000 * 60 * 2,
  });
}

export function useCartMutations() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isAuth = checkAuthLocal();
  const cartKey = isAuth ? user?._id || user?.id || 'authenticated' : 'guest';

  const addToCartMutation = useMutation({
    mutationFn: async ({ productId, quantity, selectedOptions, customizationNote }) => {
      const res = await userService.addToCart(productId, quantity, {
        selectedOptions,
        customizationNote,
      });
      logCartTrace('POST_RESPONSE', {
        cartKey,
        cartData: res.success ? res.data : res,
        source: 'addToCartMutation.mutationFn',
      });
      return res.success ? res.data : res;
    },
    onMutate: async ({ product, quantity, selectedOptions, customizationNote }) => {
      logCartTrace('ON_MUTATE_START', { cartKey, source: 'addToCartMutation.onMutate' });
      await queryClient.cancelQueries({ queryKey: ['cart', cartKey] });
      const previousCart = queryClient.getQueryData(['cart', cartKey]);

      if (previousCart && product) {
        const targetCartKey = 'purchaseCart';

        const prevItems = previousCart[targetCartKey]?.items || [];
        const itemKey = product._id || product.id;

        const targetSig = product.configurationSignature || 'default';
        const existingIndex = prevItems.findIndex((item) => {
          const itemId = item.product?._id || item.product?.id || item._id || item.id;
          const itemSig = item.configurationSignature || 'default';
          return itemId === itemKey && itemSig === targetSig;
        });

        let updatedItems;
        if (existingIndex >= 0) {
          updatedItems = [...prevItems];
          updatedItems[existingIndex] = {
            ...updatedItems[existingIndex],
            quantity: updatedItems[existingIndex].quantity + (quantity || 1),
          };
        } else {
          const optItemKey =
            targetSig && targetSig !== 'default' ? `${itemKey}___${targetSig}` : itemKey;
          updatedItems = [
            ...prevItems,
            {
              id: optItemKey,
              _id: optItemKey,
              quantity: quantity || 1,
              product: product,
              selectedOptions: selectedOptions || product?.selectedOptions || [],
              customizationNote: customizationNote || product?.customizationNote || '',
              configurationSignature: targetSig,
              configuredUnitPrice: product.configuredUnitPrice || product.price,
            },
          ];
        }

        const { subtotal, total } = calculateCartSummary(
          updatedItems,
          previousCart[targetCartKey]?.summary?.shippingFee || 0,
        );

        const optimisticData = {
          ...previousCart,
          [targetCartKey]: {
            ...previousCart[targetCartKey],
            items: updatedItems,
            summary: {
              ...(previousCart[targetCartKey]?.summary || emptyCart.summary),
              subtotal,
              total,
            },
          },
        };

        queryClient.setQueryData(['cart', cartKey], optimisticData);
        logCartTrace('OPTIMISTIC_WRITE', {
          cartKey,
          cartData: optimisticData,
          source: 'addToCartMutation.onMutate',
        });
      }

      return { previousCart };
    },
    onSuccess: (data) => {
      logCartTrace('ON_SUCCESS', {
        cartKey,
        cartData: data,
        source: 'addToCartMutation.onSuccess',
      });
      if (data && data.purchaseCart) {
        queryClient.setQueryData(['cart', cartKey], data);
      }
    },
    onError: (err, variables, context) => {
      logCartTrace('ON_ERROR', {
        cartKey,
        error: err?.message,
        source: 'addToCartMutation.onError',
      });
      if (context?.previousCart) {
        queryClient.setQueryData(['cart', cartKey], context.previousCart);
      }
      // If error is Session expired, unauthorized or 401, seamlessly fallback to GuestCart
      if (
        err?.message?.includes('Session expired') ||
        err?.message?.includes('Not authenticated') ||
        err?.code === 'ERR_NO_SESSION' ||
        err?.response?.status === 401
      ) {
        if (variables?.product) {
          GuestCartService.addToCart(variables.product, variables.quantity || 1);
          toast.success('Added to bag');
          return;
        }
      }
      toast.error(getErrorMessage(err, 'Unable to add item to bag'));
    },
    onSettled: async () => {
      logCartTrace('ON_SETTLED_INVALIDATE', { cartKey, source: 'addToCartMutation.onSettled' });
      await queryClient.invalidateQueries({ queryKey: ['cart', cartKey] });
      logCartTrace('ON_SETTLED_INVALIDATE_COMPLETE', {
        cartKey,
        source: 'addToCartMutation.onSettled',
      });
    },
  });

  const removeFromCartMutation = useMutation({
    mutationFn: async ({ productId, configurationSignature }) => {
      const res = await userService.removeFromCart(productId, configurationSignature);
      return res.success ? res.data : res;
    },
    onMutate: async ({ productId, configurationSignature }) => {
      await queryClient.cancelQueries({ queryKey: ['cart', cartKey] });
      const previousCart = queryClient.getQueryData(['cart', cartKey]);

      if (previousCart) {
        const targetCartKey = 'purchaseCart';

        const prevItems = previousCart[targetCartKey]?.items || [];
        const updatedItems = prevItems.filter((item) => {
          const id = item.product?._id || item.product?.id || item._id || item.id;
          if (configurationSignature) {
            const sig = item.configurationSignature || 'default';
            return !(id === productId && sig === configurationSignature);
          }
          return id !== productId;
        });

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
              ...(previousCart[targetCartKey]?.summary || emptyCart.summary),
              subtotal,
              total,
            },
          },
        });
      }

      return { previousCart };
    },
    onError: (err, variables, context) => {
      if (context?.previousCart) {
        queryClient.setQueryData(['cart', cartKey], context.previousCart);
      }
      toast.error(getErrorMessage(err, 'Unable to remove item from bag'));
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['cart', cartKey] });
    },
  });

  const syncCartMutation = useMutation({
    mutationFn: async ({ cartItems }) => {
      const res = await userService.syncCart(cartItems);
      return res.success ? res.data : res;
    },
    onError: (err) => {
      toast.error(getErrorMessage(err, 'Unable to sync bag'));
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['cart', cartKey] });
    },
  });

  return {
    addToCart: addToCartMutation.mutateAsync,
    removeFromCart: removeFromCartMutation.mutateAsync,
    syncCart: syncCartMutation.mutateAsync,
    isUpdatingCart:
      addToCartMutation.isPending || removeFromCartMutation.isPending || syncCartMutation.isPending,
  };
}
