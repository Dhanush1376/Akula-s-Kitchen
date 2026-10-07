import { useState, useEffect, useRef, useCallback } from 'react';
import toast from 'react-hot-toast';
import { orderService } from '../../services/domainServices';
import logger from '../../utils/core/logger';

export function useCheckoutTotals({ isAuthenticated, activeItems, paymentOption, location }) {
  const [backendTotals, setBackendTotals] = useState({
    subtotal: 0,
    shippingFee: 0,
    platformFee: 0,
    total: 0,
  });
  const [isTotalsLoading, setIsTotalsLoading] = useState(false);
  const [totalsError, setTotalsError] = useState(null);

  const totalsRequestRef = useRef(0);

  const fetchBackendTotals = useCallback(async () => {
    if (!activeItems || activeItems.length === 0) return;
    const requestId = totalsRequestRef.current + 1;
    totalsRequestRef.current = requestId;

    setIsTotalsLoading(true);
    setTotalsError(null);
    try {
      const itemsPayload = activeItems.map((item) => {
        const rawProductId =
          item.productId ||
          (item.id && typeof item.id === 'string' && item.id.includes('___')
            ? item.id.split('___')[0]
            : item.product?._id || item.product?.id || item.id || item._id);
        return {
          productId: rawProductId,
          quantity: item.quantity,
          type: item.type,
          selectedOptions: item.selectedOptions || [],
          configurationSignature: item.configurationSignature || 'default',
        };
      });

      const res = await orderService.validateTotals({
        items: itemsPayload,
        paymentMethod: paymentOption,
      });

      if (res.success && res.data) {
        if (requestId !== totalsRequestRef.current) return;
        setBackendTotals(res.data);
        setTotalsError(null);
      }
    } catch (err) {
      logger.error('Failed to validate checkout totals:', err);
      const errMsg =
        err.response?.data?.message || err.message || 'Failed to calculate order totals';
      setTotalsError(errMsg);
      toast.error(errMsg);
    } finally {
      if (requestId === totalsRequestRef.current) {
        setIsTotalsLoading(false);
      }
    }
  }, [activeItems, paymentOption]);

  useEffect(() => {
    fetchBackendTotals();
  }, [fetchBackendTotals]);

  return {
    backendTotals,
    setBackendTotals,
    isTotalsLoading,
    setIsTotalsLoading,
    totalsError,
    setTotalsError,
    fetchBackendTotals,
  };
}
