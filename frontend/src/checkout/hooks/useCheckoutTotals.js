import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import toast from 'react-hot-toast';
import { orderService } from '../../services/domainServices';
import logger from '../../utils/core/logger';

export function useCheckoutTotals({ isAuthenticated, activeItems, paymentOption, location }) {
  // Pre-calculate estimated subtotal from activeItems so we have an initial non-zero baseline
  const estimatedSubtotal = useMemo(() => {
    if (!activeItems || !Array.isArray(activeItems) || activeItems.length === 0) return 0;
    return activeItems.reduce((sum, item) => {
      const price = Number(item.finalPrice ?? item.price ?? 0);
      const qty = Number(item.quantity) || 1;
      return sum + price * qty;
    }, 0);
  }, [activeItems]);

  const [backendTotals, setBackendTotals] = useState(() => ({
    subtotal: estimatedSubtotal,
    shippingFee: 0,
    platformFee: 0,
    codFee: 0,
    discount: 0,
    total: estimatedSubtotal,
  }));
  const [hasLoadedTotals, setHasLoadedTotals] = useState(false);
  const [isTotalsLoading, setIsTotalsLoading] = useState(() =>
    Boolean(activeItems && activeItems.length > 0),
  );
  const [totalsError, setTotalsError] = useState(null);

  const totalsRequestRef = useRef(0);

  useEffect(() => {
    if (!hasLoadedTotals && estimatedSubtotal > 0) {
      setBackendTotals((prev) => ({
        ...prev,
        subtotal: prev.subtotal || estimatedSubtotal,
        total: prev.total || estimatedSubtotal,
      }));
    }
  }, [estimatedSubtotal, hasLoadedTotals]);

  const fetchBackendTotals = useCallback(async () => {
    if (!activeItems || activeItems.length === 0) {
      setIsTotalsLoading(false);
      return;
    }
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
        setHasLoadedTotals(true);
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
    hasLoadedTotals,
    isTotalsLoading,
    setIsTotalsLoading,
    totalsError,
    setTotalsError,
    fetchBackendTotals,
  };
}
