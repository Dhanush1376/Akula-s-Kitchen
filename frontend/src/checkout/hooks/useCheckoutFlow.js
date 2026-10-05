import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { persistentStorage } from '../../utils/storage/persistentStorage';
import { orderService } from '../../services/domainServices';
import toast from 'react-hot-toast';
import logger from '../../utils/core/logger';

const createIdempotencyKey = () => {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID();
  return `checkout_${Date.now()}_${Math.random().toString(36).slice(2)}`;
};

export function useCheckoutFlow({
  isAuthenticated,
  user,
  activeItems,
  orderType,
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
}) {
  const orderCompleteRef = useRef(false);

  const getInitialStep = () =>
    persistentStorage.getItem('akula_checkout_step', { session: true, fallback: 1 });

  useEffect(() => {
    persistentStorage.setItem('akula_checkout_step', activeStep, { session: true });
  }, [activeStep]);

  const hasCustomizableItems = useMemo(() => {
    return activeItems.some(
      (item) => item.product?.customizationConfig?.enabled || item.customizationConfig?.enabled,
    );
  }, [activeItems]);

  const checkoutSteps = useMemo(() => {
    return ['BAG', 'ADDRESS', 'PAYMENT'];
  }, []);

  const [customizationNotes, setCustomizationNotes] = useState(() => {
    return persistentStorage.getItem('akula_checkout_customization_notes', {
      session: true,
      fallback: {},
    });
  });

  useEffect(() => {
    persistentStorage.setItem('akula_checkout_customization_notes', customizationNotes, {
      session: true,
    });
  }, [customizationNotes]);

  // Payment Options
  const [sendUpdatesToWhatsApp, setSendUpdatesToWhatsApp] = useState(() => {
    return persistentStorage.getItem('akula_checkout_whatsapp_updates', {
      session: true,
      fallback: true,
    });
  });
  const [needByDate, setNeedByDate] = useState(() => {
    const raw = persistentStorage.getItem('akula_checkout_need_by_date', {
      session: true,
      fallback: '',
    });
    if (!raw || typeof raw !== 'string') return '';
    if (raw.includes('T')) return raw.split('T')[0];
    return raw.trim();
  });

  useEffect(() => {
    persistentStorage.setItem('akula_checkout_whatsapp_updates', sendUpdatesToWhatsApp, {
      session: true,
    });
    persistentStorage.setItem('akula_checkout_need_by_date', needByDate || '', { session: true });
  }, [sendUpdatesToWhatsApp, needByDate]);

  const [upiId, setUpiId] = useState('');
  const [upiVerified, setUpiVerified] = useState(false);
  const [cardDetails, setCardDetails] = useState({ number: '', expiry: '', cvv: '', name: '' });
  const [selectedBank, setSelectedBank] = useState('HDFC');
  const [codConfirmed, setCodConfirmed] = useState(false);
  const [codOtpSent, setCodOtpSent] = useState(false);
  const [codOtpCode, setCodOtpCode] = useState('');
  const [codVerified, setCodVerified] = useState(false);
  const [codVerificationToken, setCodVerificationToken] = useState(null);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [paymentError, setPaymentError] = useState('');

  const configuredCodChannel = settings?.payments?.codOtpChannel || 'phone';
  const [selectedCodChannel, setSelectedCodChannel] = useState(() => {
    return configuredCodChannel === 'email' ? 'email' : 'phone';
  });

  useEffect(() => {
    if (configuredCodChannel === 'email') {
      setSelectedCodChannel('email');
    } else if (configuredCodChannel === 'phone') {
      setSelectedCodChannel('phone');
    }
  }, [configuredCodChannel]);

  const effectiveCodChannel =
    configuredCodChannel === 'both' ? selectedCodChannel : configuredCodChannel;

  // Enforce address binding: changing address/phone resets prior COD verification!
  const activeAddrId = shipping.activeSelectedAddress?._id || shipping.activeSelectedAddress?.id;
  const activeAddrPhone = shipping.activeSelectedAddress?.phone;
  const activeAddrEmail = shipping.activeSelectedAddress?.email;

  useEffect(() => {
    setCodVerified(false);
    setCodVerificationToken(null);
    setCodOtpSent(false);
    setCodOtpCode('');
  }, [activeAddrId, activeAddrPhone, activeAddrEmail, effectiveCodChannel]);

  const buildShippingAddress = useCallback(
    () => ({
      name: shipping.activeSelectedAddress.name,
      phone: shipping.activeSelectedAddress.phone,
      alternatePhone: shipping.activeSelectedAddress.alternatePhone || undefined,
      email: shipping.activeSelectedAddress.email || user?.email,
      pincode: shipping.activeSelectedAddress.pincode,
      locality: shipping.activeSelectedAddress.locality,
      address:
        shipping.activeSelectedAddress.addressString || shipping.activeSelectedAddress.address,
      landmark: shipping.activeSelectedAddress.landmark || '',
      city: shipping.activeSelectedAddress.city,
      state: shipping.activeSelectedAddress.state,
      country: shipping.activeSelectedAddress.country || 'India',
      type: (() => {
        const rawType = (
          shipping.activeSelectedAddress.tag ||
          shipping.activeSelectedAddress.type ||
          'home'
        ).toLowerCase();
        if (rawType === 'office') return 'work';
        if (rawType === 'home' || rawType === 'work' || rawType === 'other') return rawType;
        return 'other';
      })(),
      deliveryInstructions: shipping.activeSelectedAddress.deliveryInstructions || undefined,
    }),
    [shipping.activeSelectedAddress, user],
  );

  const handleSendCodOtp = async () => {
    const targetPhone = shipping.activeSelectedAddress?.phone || user?.phone;
    const targetEmail = shipping.activeSelectedAddress?.email || user?.email;

    if (effectiveCodChannel === 'email') {
      if (!targetEmail || !targetEmail.trim()) {
        toast.error('A valid email address is required for COD email verification.');
        return;
      }
    } else {
      if (!targetPhone || !targetPhone.trim()) {
        toast.error('Please add a phone number to this delivery address to place a COD order.');
        return;
      }
    }

    setIsSendingOtp(true);
    try {
      const payload =
        effectiveCodChannel === 'email'
          ? { email: targetEmail.trim(), channel: 'email' }
          : { phone: targetPhone.trim(), channel: 'phone' };

      const res = await orderService.sendCodOtp(payload);
      if (res.success) {
        setCodOtpSent(true);
        if (effectiveCodChannel === 'email') {
          toast.success(
            `Verification OTP sent to ${res.data?.email || res.data?.deliveryTarget || targetEmail}. Please check your email inbox.`,
          );
        } else {
          toast.success(
            `Verification OTP sent via SMS to ${res.data?.phone || res.data?.deliveryTarget || targetPhone}.`,
          );
        }
      } else {
        toast.error(res.message || 'Failed to send verification OTP');
      }
    } catch (err) {
      logger.error('Failed to send COD OTP:', err);
      toast.error(
        err.response?.data?.message || 'Failed to send verification OTP. Please try again.',
      );
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleVerifyCodOtp = async (overrideOtp) => {
    const targetPhone = shipping.activeSelectedAddress?.phone || user?.phone;
    const targetEmail = shipping.activeSelectedAddress?.email || user?.email;

    if (effectiveCodChannel === 'email') {
      if (!targetEmail || !targetEmail.trim()) {
        toast.error('A valid email address is required for COD verification');
        return false;
      }
    } else {
      if (!targetPhone || !targetPhone.trim()) {
        toast.error('A delivery address phone number is required for COD verification');
        return false;
      }
    }

    const otpToVerify = overrideOtp || codOtpCode;
    if (!otpToVerify || !otpToVerify.trim()) {
      toast.error('Please enter the verification code');
      return false;
    }
    setIsProcessing(true);
    try {
      const payload =
        effectiveCodChannel === 'email'
          ? { email: targetEmail.trim(), channel: 'email', otp: otpToVerify }
          : { phone: targetPhone.trim(), channel: 'phone', otp: otpToVerify };

      const res = await orderService.verifyCodOtp(payload);
      if (res.success && res.data?.codVerificationToken) {
        setCodVerified(true);
        setCodVerificationToken(res.data.codVerificationToken);
        const successMsg =
          res.data?.channel === 'email'
            ? 'Email verified successfully! Secure Cash on Delivery activated.'
            : 'Delivery phone verified successfully! Secure Cash on Delivery activated.';
        toast.success(successMsg);
        return true;
      } else {
        toast.error(res.message || 'Invalid verification code');
        return false;
      }
    } catch (err) {
      logger.error('Failed to verify COD OTP:', err);
      toast.error(err.response?.data?.message || 'Invalid verification code. Please try again.');
      return false;
    } finally {
      setIsProcessing(false);
    }
  };

  const clearCheckoutSessionStorage = useCallback(() => {
    persistentStorage.removeItem('akula_checkout_step', { session: true });
    persistentStorage.removeItem('akula_checkout_new_address', { session: true });
    persistentStorage.removeItem('akula_checkout_payment_option', { session: true });
    persistentStorage.removeItem('akula_checkout_need_by_date', { session: true });
    persistentStorage.removeItem('akula_checkout_whatsapp_updates', { session: true });
    persistentStorage.removeItem('akula_checkout_selected_address_id', { session: true });
    persistentStorage.removeItem('akula_checkout_is_adding_address', { session: true });
    persistentStorage.removeItem('akula_checkout_customization_notes', { session: true });
  }, []);

  const handleConfirmOrder = async () => {
    if (isProcessing) return;

    if (!shipping.activeSelectedAddress) {
      toast.error('Please select a delivery address');
      setActiveStep(1);
      return;
    }

    const isFullyPaid = (totals.backendTotals?.total ?? 0) === 0;

    if (!isFullyPaid && paymentOption === 'cod') {
      const codMinOrder = settings?.payments?.codMinOrder ?? 500;
      const codMaxOrder = settings?.payments?.codMaxOrder ?? 50000;
      const isCodEnabled = settings?.payments?.enableCOD ?? true;

      if (!isCodEnabled) {
        toast.error('Cash on Delivery is currently disabled.');
        return;
      }
      if (totals.backendTotals.total < codMinOrder || totals.backendTotals.total > codMaxOrder) {
        toast.error(
          `Cash on Delivery (COD) is only serviceable for order totals between ₹${codMinOrder} and ₹${codMaxOrder}.`,
        );
        return;
      }
      if (!codConfirmed) {
        toast.error('Please confirm Cash on Delivery');
        return;
      }
      if (!codVerified) {
        toast.error('Please verify your mobile number with OTP to place a Cash on Delivery order.');
        return;
      }
    }

    setIsProcessing(true);

    const effectivePaymentMethod = paymentOption === 'cod' ? 'cod' : 'razorpay';

    const orderData = {
      items: activeItems.map((item) => {
        const key = `${item.id || item._id}-${item.variant || 'default'}`;
        return {
          productId: item.id || item._id,
          quantity: item.quantity,
          variant: item.variant || 'Default',
          customizationNote: customizationNotes[key] || undefined,
        };
      }),
      shippingAddress: buildShippingAddress(),
      paymentMethod: effectivePaymentMethod,
      needByDate: needByDate || undefined,
      idempotencyKey: createIdempotencyKey(),
      codVerificationToken:
        !isFullyPaid && paymentOption === 'cod' ? codVerificationToken : undefined,
    };

    if (isFullyPaid) {
      try {
        const response = await orderService.create(orderData, {
          idempotencyKey: orderData.idempotencyKey,
        });
        if (response && response.success) {
          orderCompleteRef.current = true;
          const orderObj = response.data?.order || response.data || response;
          activeItems.forEach((item) => removeItem(item.id || item._id, item.variant));
          clearCheckoutSessionStorage();
          toast.success('Order successfully placed!');
          navigate('/order-success', { state: { orderDetails: orderObj }, replace: true });
        } else {
          toast.error(response?.message || 'Failed to place order');
        }
      } catch (err) {
        logger.error('Failed to place fully paid order:', err);
        toast.error(err.response?.data?.message || err.message || 'Failed to place order');
      } finally {
        setIsProcessing(false);
      }
      return;
    }

    if (paymentOption === 'razorpay') {
      processPayment(
        orderData,
        (order) => {
          orderCompleteRef.current = true;
          setIsProcessing(false);
          activeItems.forEach((item) => removeItem(item.id || item._id, item.variant));
          clearCheckoutSessionStorage();
          navigate('/order-success', { state: { orderDetails: order }, replace: true });
        },
        (_error) => {
          setIsProcessing(false);
        },
      );
    } else {
      try {
        const response = await orderService.create(orderData, {
          idempotencyKey: orderData.idempotencyKey,
        });
        if (response && response.success) {
          orderCompleteRef.current = true;
          const orderObj = response.data?.order || response.data || response;
          activeItems.forEach((item) => removeItem(item.id || item._id, item.variant));
          clearCheckoutSessionStorage();
          navigate('/order-success', { state: { orderDetails: orderObj }, replace: true });
        }
      } catch (err) {
        logger.error('Failed to place COD order:', err);
        toast.error(err.response?.data?.message || err.message || 'Failed to place COD order');
      } finally {
        setIsProcessing(false);
      }
    }
  };

  return {
    isProcessing,
    setIsProcessing,
    orderCompleteRef,
    activeStep,
    setActiveStep,
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
    codVerificationToken,
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
  };
}
