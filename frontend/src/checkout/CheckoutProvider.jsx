import React, { useState, createContext, useContext, Profiler } from 'react';
import { logRenderMetrics } from '../utils/performance/profilerLogger';
import { useNavigate, useLocation } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useRazorpay } from '../hooks/useRazorpay';
import storeSettingsService from '../services/api/storeSettingsService';
import { useQuery } from '@tanstack/react-query';
import logger from '../utils/core/logger';
import { PINCODE_MAP, UPI_REGEX } from './checkoutConstants';
import { persistentStorage } from '../utils/storage/persistentStorage';
import toast from 'react-hot-toast';

import { useCheckoutShipping } from './hooks/useCheckoutShipping';
import { useCheckoutTotals } from './hooks/useCheckoutTotals';
import { useCheckoutFlow } from './hooks/useCheckoutFlow';

const CheckoutContext = createContext(null);

const createIdempotencyKey = () => {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID();
  return `checkout_${Date.now()}_${Math.random().toString(36).slice(2)}`;
};

export function useCheckout() {
  const ctx = useContext(CheckoutContext);
  if (!ctx) throw new Error('useCheckout must be used within CheckoutProvider');
  return ctx;
}

export function CheckoutProvider({ children }) {
  const { purchaseCart, customCart, clearCart, removeItem, claimedCoupon, setClaimedCoupon } =
    useCart();
  const { user, isAuthenticated, openAuthModal } = useAuth();
  const { processPayment } = useRazorpay();
  const navigate = useNavigate();
  const location = useLocation();
  const checkoutMode = location.state?.checkoutMode || 'purchase';
  const hasRentalItems = false;

  React.useEffect(() => {
    if (!isAuthenticated) {
      navigate('/cart');
      setTimeout(() => {
        openAuthModal();
      }, 300);
    }
  }, [isAuthenticated, navigate, openAuthModal]);

  const { data: settingsData } = useQuery({
    queryKey: ['storeSettings', 'public'],
    queryFn: async () => {
      const data = await storeSettingsService.getPublicSettings();
      return data;
    },
    staleTime: 30 * 1000,
    refetchOnMount: 'always',
  });
  const settings = settingsData || {};

  const activeItems = React.useMemo(() => {
    try {
      if (checkoutMode === 'custom') {
        return customCart?.items || [];
      }
      return purchaseCart?.items || [];
    } catch (e) {
      logger.warn('Failed to parse activeItems in checkout', e);
      return [];
    }
  }, [checkoutMode, purchaseCart?.items, customCart?.items]);
  const items = activeItems;

  const subtotal = React.useMemo(() => {
    if (checkoutMode === 'custom') {
      return customCart?.summary?.subtotal || 0;
    }
    return purchaseCart?.summary?.subtotal || 0;
  }, [checkoutMode, purchaseCart?.summary?.subtotal, customCart?.summary?.subtotal]);

  // Empty line since we moved useEffect down

  const [activeStep, setActiveStep] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentOption, setPaymentOption] = useState(() => {
    return persistentStorage.getItem('akula_checkout_payment_option', {
      session: true,
      fallback: 'razorpay',
    });
  });

  const isRazorpayEnabled = settings?.payments?.enableRazorpay ?? true;
  const isCodEnabled = settings?.payments?.enableCOD ?? true;

  React.useEffect(() => {
    if (settings?.payments) {
      if (!isRazorpayEnabled && paymentOption === 'razorpay' && isCodEnabled) {
        setPaymentOption('cod');
      } else if (!isCodEnabled && paymentOption === 'cod' && isRazorpayEnabled) {
        setPaymentOption('razorpay');
      }
    }
  }, [isRazorpayEnabled, isCodEnabled, paymentOption, settings?.payments]);

  React.useEffect(() => {
    persistentStorage.setItem('akula_checkout_payment_option', paymentOption, { session: true });
  }, [paymentOption]);

  // Domain specific Hooks
  const shipping = useCheckoutShipping({ isAuthenticated, user, setActiveStep, setIsProcessing });
  const totals = useCheckoutTotals({
    isAuthenticated,
    activeItems,
    paymentOption,
    location,
    claimedCoupon,
    setClaimedCoupon,
  });

  const {
    orderCompleteRef,
    sendUpdatesToWhatsApp,
    setSendUpdatesToWhatsApp,
    needByDate,
    setNeedByDate,
    upiId,
    setUpiId,
    upiVerified,
    setUpiVerified,
    cardDetails,
    setCardDetails,
    selectedBank,
    setSelectedBank,
    codConfirmed,
    setCodConfirmed,
    codOtpSent,
    setCodOtpSent,
    codOtpCode,
    setCodOtpCode,
    codVerified,
    setCodVerified,
    isSendingOtp,
    paymentError,
    setPaymentError,
    configuredCodChannel,
    effectiveCodChannel,
    selectedCodChannel,
    setSelectedCodChannel,
    handleSendCodOtp,
    handleVerifyCodOtp,
    handleConfirmOrder,
    checkoutSteps,
    hasCustomizableItems,
    customizationNotes,
    setCustomizationNotes,
  } = useCheckoutFlow({
    isAuthenticated,
    user,
    activeItems,
    orderType: checkoutMode,
    checkoutMode,
    removeItem,
    clearCart,
    navigate,
    processPayment,
    shipping,
    totals,
    activeStep,
    setActiveStep,
    isProcessing,
    setIsProcessing,
    paymentOption,
    setPaymentOption,
    settings,
  });

  React.useEffect(() => {
    if (!activeItems || activeItems.length === 0) {
      if (!orderCompleteRef.current) {
        navigate('/cart', { replace: true });
      }
      return;
    }
    if (settings?.orders && !orderCompleteRef.current) {
      const {
        maxItemsPerOrder = 20,
        maxQuantityPerItem = 50,
        minOrderValue = 0,
        maxOrderValue = 1000000,
      } = settings.orders;
      if (activeItems.length > maxItemsPerOrder) {
        toast.error(
          `Order cannot exceed ${maxItemsPerOrder} different products. Please adjust your bag.`,
        );
        navigate('/cart', { replace: true });
        return;
      }
      const overLimitItem = activeItems.find((i) => Number(i.quantity) > maxQuantityPerItem);
      if (overLimitItem) {
        toast.error(
          `Maximum allowed quantity is ${maxQuantityPerItem} per product. Please adjust your bag.`,
        );
        navigate('/cart', { replace: true });
        return;
      }
      if (minOrderValue > 0 && subtotal < minOrderValue) {
        toast.error(
          `Minimum order amount of ₹${minOrderValue.toLocaleString('en-IN')} is required.`,
        );
        navigate('/cart', { replace: true });
        return;
      }
      if (maxOrderValue > 0 && subtotal > maxOrderValue) {
        toast.error(
          `Maximum order amount of ₹${maxOrderValue.toLocaleString('en-IN')} is exceeded.`,
        );
        navigate('/cart', { replace: true });
        return;
      }
    }
  }, [activeItems, navigate, orderCompleteRef, settings?.orders, subtotal]);

  const value = {
    items,
    subtotal,
    clearCart,
    claimedCoupon,
    setClaimedCoupon,
    user,
    isAuthenticated,
    openAuthModal,
    navigate,
    settings,
    isProcessing,
    setIsProcessing,
    orderCompleteRef,
    activeStep,
    setActiveStep,
    activeItems,
    sendUpdatesToWhatsApp,
    setSendUpdatesToWhatsApp,
    paymentOption,
    setPaymentOption,
    needByDate,
    setNeedByDate,
    upiId,
    setUpiId,
    upiVerified,
    setUpiVerified,
    cardDetails,
    setCardDetails,
    selectedBank,
    setSelectedBank,
    codConfirmed,
    setCodConfirmed,
    codOtpSent,
    setCodOtpSent,
    codOtpCode,
    setCodOtpCode,
    codVerified,
    setCodVerified,
    isSendingOtp,
    paymentError,
    setPaymentError,
    configuredCodChannel,
    effectiveCodChannel,
    selectedCodChannel,
    setSelectedCodChannel,
    handleSendCodOtp,
    handleVerifyCodOtp,
    handleConfirmOrder,
    PINCODE_MAP,
    UPI_REGEX,
    hasRentalItems,
    orderType: checkoutMode,
    checkoutSteps,
    hasCustomizableItems,
    customizationNotes,
    setCustomizationNotes,

    // Decomposed Hooks Spread
    ...shipping,
    ...totals,
  };

  return (
    <Profiler id="CheckoutProvider" onRender={logRenderMetrics}>
      <CheckoutContext.Provider value={value}>{children}</CheckoutContext.Provider>
    </Profiler>
  );
}
