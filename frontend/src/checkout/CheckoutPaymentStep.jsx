import {
  AlertTriangle,
  CreditCard,
  CheckCircle2,
  ShieldCheck,
  ArrowRight,
  ArrowLeft,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import React from 'react';
import toast from 'react-hot-toast';

import { useCheckout } from './CheckoutProvider';
import {
  TargetDeliveryDatePicker,
  CodOtpVerificationSection,
} from '../features/checkout/components';

export default function CheckoutPaymentStep() {
  const {
    _activeStep,
    setActiveStep,
    activeSelectedAddress,
    _isAddingNewAddress,
    paymentOption,
    setPaymentOption,
    _codConfirmed,
    setCodConfirmed,
    codOtpSent,
    codVerified,
    isSendingOtp,
    paymentError,
    _setPaymentError,
    configuredCodChannel,
    effectiveCodChannel,
    selectedCodChannel,
    setSelectedCodChannel,
    handleSendCodOtp,
    handleVerifyCodOtp,
    handleConfirmOrder,
    isProcessing,
    backendTotals,
    isTotalsLoading,
    totalsError,
    fetchBackendTotals,
    settings,
    user,
    needByDate,
    setNeedByDate,
  } = useCheckout();

  const codMinOrder = settings?.payments?.codMinOrder ?? 500;
  const codMaxOrder = settings?.payments?.codMaxOrder ?? 50000;
  const isCodEnabled = settings?.payments?.enableCOD ?? true;
  const isRazorpayEnabled = settings?.payments?.enableRazorpay ?? true;

  // Auto-switch payment option if currently selected method is disabled
  React.useEffect(() => {
    if (!isRazorpayEnabled && paymentOption === 'razorpay' && isCodEnabled) {
      setPaymentOption('cod');
    } else if (!isCodEnabled && paymentOption === 'cod' && isRazorpayEnabled) {
      setPaymentOption('razorpay');
    }
  }, [isRazorpayEnabled, isCodEnabled, paymentOption, setPaymentOption]);

  // State for 6-digit OTP string
  const [codOtpInput, setCodOtpInput] = React.useState('');

  // Automatically confirm COD behind the scenes when COD option is selected to simplify user flow
  React.useEffect(() => {
    if (paymentOption === 'cod') {
      setCodConfirmed(true);
    }
  }, [paymentOption, setCodConfirmed]);

  const shippingFee = backendTotals?.shippingFee || 0;
  const currentPayableTotal = Math.max(0, (backendTotals?.total ?? 0) - shippingFee);

  const getSubmitButtonLabel = () => {
    if (isProcessing) return 'Processing...';
    if (isTotalsLoading) return 'Calculating...';
    if (totalsError) return 'Pricing Load Error';

    if (currentPayableTotal === 0) {
      return 'Place Order (Fully Paid)';
    }

    if (!isRazorpayEnabled && !isCodEnabled) {
      return 'Payment Unavailable';
    }

    if (paymentOption === 'razorpay') {
      if (!isRazorpayEnabled) return 'Online Payment Unavailable';
      return `Pay ₹${currentPayableTotal.toLocaleString('en-IN')}`;
    }

    // COD payment option selected
    if (!isCodEnabled) {
      return 'COD Unavailable';
    }
    if (currentPayableTotal < codMinOrder) {
      return `COD Unavailable (< ₹${codMinOrder})`;
    }
    if (currentPayableTotal > codMaxOrder) {
      return `COD Unavailable (> ₹${codMaxOrder})`;
    }
    if (!codOtpSent) {
      return isSendingOtp
        ? 'Sending OTP...'
        : effectiveCodChannel === 'email'
          ? 'Send OTP to Email'
          : 'Send OTP to Mobile';
    }
    if (!codVerified) {
      return 'Verify OTP';
    }
    return 'Place Order';
  };

  const handleBottomSubmit = async () => {
    if (isProcessing) return;

    if (!activeSelectedAddress) {
      toast.error('Please select a delivery address');
      setActiveStep(1);
      return;
    }

    if (!needByDate) {
      toast.error('Please select a target delivery date');
      return;
    }

    if (backendTotals?.total === 0 || currentPayableTotal === 0) {
      handleConfirmOrder();
    } else if (paymentOption === 'razorpay') {
      if (!isRazorpayEnabled) {
        toast.error('Online payments are currently disabled.');
        return;
      }
      handleConfirmOrder();
    } else if (paymentOption === 'cod') {
      if (!isCodEnabled) {
        toast.error('Cash on Delivery is currently disabled.');
        return;
      }
      if (backendTotals.total < codMinOrder || backendTotals.total > codMaxOrder) {
        toast.error(
          `COD is only serviceable for order totals between ₹${codMinOrder} and ₹${codMaxOrder}.`,
        );
        return;
      }
      if (!codOtpSent) {
        handleSendCodOtp();
      } else if (!codVerified) {
        if (!codOtpInput.trim() || codOtpInput.length < 6) {
          toast.error('Please enter the 6-digit verification code');
          return;
        }
        handleVerifyCodOtp(codOtpInput);
      } else {
        handleConfirmOrder();
      }
    } else {
      toast.error('Please select a payment method');
    }
  };

  const isButtonDisabled = () => {
    if (isProcessing || isSendingOtp) return true;
    if (isTotalsLoading) return true;
    if (totalsError) return true;
    if (backendTotals?.total === 0 || currentPayableTotal === 0) return false;

    if (!isRazorpayEnabled && !isCodEnabled) return true;

    if (paymentOption === 'razorpay') {
      return !isRazorpayEnabled;
    }

    if (paymentOption === 'cod') {
      if (!isCodEnabled || backendTotals.total < codMinOrder || backendTotals.total > codMaxOrder) {
        return true;
      }
      if (!codOtpSent) return false;
      if (!codVerified) return codOtpInput.length < 6;
      return false;
    }
    return false;
  };

  return (
    <div className="bg-transparent pb-1 lg:pb-6">
      {/* Target Delivery Date (Streamlined & Clean) */}
      <TargetDeliveryDatePicker needByDate={needByDate} setNeedByDate={setNeedByDate} />

      {/* Payment Options Section */}
      {backendTotals?.total === 0 ? (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="p-5 bg-emerald-50 text-emerald-950 border border-emerald-200/60 rounded-lg mb-6 shadow-xs mt-2"
        >
          <div className="flex items-center gap-2.5 mb-1.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <h3 className="text-emerald-900 font-extrabold text-[13px] tracking-wider uppercase">
              Payment Complete
            </h3>
          </div>
          <p className="text-emerald-700 text-xs font-medium leading-relaxed">
            Your order total is fully covered. No additional payment is required.
          </p>
        </motion.div>
      ) : (
        <>
          {/* Payment Header */}
          <div className="pb-3 border-b border-neutral-200 mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-neutral-800" strokeWidth={2} />
              <span
                className="text-[13.5px] sm:text-[14px] font-semibold text-neutral-800 font-sans tracking-normal"
                style={{ fontStretch: 'normal' }}
              >
                Choose Payment Method
              </span>
            </div>
            <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>100% Secure</span>
            </div>
          </div>

          <div className="flex flex-col gap-2.5 mb-4">
            {/* Option: Razorpay (Secure Online Payment) */}
            {isRazorpayEnabled && (
              <div
                onClick={() => setPaymentOption('razorpay')}
                className={`relative px-4 py-3.5 rounded-[8px] border transition-all duration-200 cursor-pointer overflow-hidden active:scale-[0.99] ${
                  paymentOption === 'razorpay'
                    ? 'border-[#283618] bg-[#283618] text-white shadow-sm ring-1 ring-[#283618]'
                    : 'border-neutral-200 bg-white hover:border-neutral-300 shadow-xs hover:shadow-sm'
                }`}
              >
                <div className="flex items-center gap-3 select-none">
                  {/* Custom Radio Button */}
                  <div className="shrink-0">
                    <div
                      className={`w-4.5 h-4.5 rounded-full border flex items-center justify-center transition-all ${
                        paymentOption === 'razorpay'
                          ? 'border-white bg-white'
                          : 'border-neutral-300 bg-white'
                      }`}
                    >
                      {paymentOption === 'razorpay' && (
                        <div className="w-2.5 h-2.5 rounded-full bg-[#283618]" />
                      )}
                    </div>
                  </div>

                  <div className="flex-1 min-w-0 flex items-center justify-between gap-2">
                    <span
                      className={`text-[12.5px] sm:text-[13px] font-semibold truncate ${
                        paymentOption === 'razorpay' ? 'text-white' : 'text-neutral-900'
                      }`}
                    >
                      Online Payment (UPI / Cards / Netbanking)
                    </span>
                    <span
                      className={`text-[9px] sm:text-[9.5px] px-2 sm:px-2.5 py-0.5 rounded-[4px] font-bold uppercase tracking-wider shrink-0 transition-colors ${
                        paymentOption === 'razorpay'
                          ? 'bg-white text-[#283618] font-extrabold shadow-2xs'
                          : 'bg-[#283618]/10 text-[#283618] border border-[#283618]/20'
                      }`}
                    >
                      Recommended
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Option: Cash on Delivery */}
            {isCodEnabled && (
              <div
                onClick={() => {
                  if (backendTotals.total >= codMinOrder && backendTotals.total <= codMaxOrder) {
                    setPaymentOption('cod');
                  }
                }}
                className={`relative px-4 py-3.5 rounded-[8px] border transition-all duration-200 overflow-hidden ${
                  backendTotals.total > codMaxOrder || backendTotals.total < codMinOrder
                    ? 'opacity-50 cursor-not-allowed border-neutral-200 bg-neutral-50/60 shadow-xs'
                    : 'cursor-pointer active:scale-[0.99] ' +
                      (paymentOption === 'cod'
                        ? 'border-[#283618] bg-[#283618] text-white shadow-sm ring-1 ring-[#283618]'
                        : 'border-neutral-200 bg-white hover:border-neutral-300 shadow-xs hover:shadow-sm')
                }`}
              >
                <div className="flex items-center gap-3 select-none">
                  {/* Custom Radio Button */}
                  <div className="shrink-0">
                    <div
                      className={`w-4.5 h-4.5 rounded-full border flex items-center justify-center transition-all ${
                        paymentOption === 'cod'
                          ? 'border-white bg-white'
                          : 'border-neutral-300 bg-white'
                      }`}
                    >
                      {paymentOption === 'cod' && (
                        <div className="w-2.5 h-2.5 rounded-full bg-[#283618]" />
                      )}
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <span
                      className={`text-[13px] font-semibold ${
                        paymentOption === 'cod' ? 'text-white' : 'text-neutral-900'
                      }`}
                    >
                      Cash on Delivery (COD)
                    </span>
                    {backendTotals.total > codMaxOrder && (
                      <p
                        className={`text-[11px] font-bold mt-1 flex items-center gap-1 ${
                          paymentOption === 'cod' ? 'text-amber-200' : 'text-red-600'
                        }`}
                      >
                        <AlertTriangle
                          className={`w-3.5 h-3.5 shrink-0 ${
                            paymentOption === 'cod' ? 'text-amber-200' : 'text-red-600'
                          }`}
                        />
                        COD unavailable for orders above ₹{codMaxOrder.toLocaleString('en-IN')}
                      </p>
                    )}
                    {backendTotals.total < codMinOrder && (
                      <p
                        className={`text-[11px] font-bold mt-1 flex items-center gap-1 ${
                          paymentOption === 'cod' ? 'text-amber-200' : 'text-red-600'
                        }`}
                      >
                        <AlertTriangle
                          className={`w-3.5 h-3.5 shrink-0 ${
                            paymentOption === 'cod' ? 'text-amber-200' : 'text-red-600'
                          }`}
                        />
                        COD requires minimum order of ₹{codMinOrder.toLocaleString('en-IN')}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {!isRazorpayEnabled && !isCodEnabled && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  No payment methods are currently available. Please contact kitchen support.
                </span>
              </div>
            )}
          </div>

          {/* Dedicated Separate COD OTP Verification Box */}
          <AnimatePresence>
            {isCodEnabled && paymentOption === 'cod' && (
              <motion.div
                key="cod-otp-section"
                initial={{ opacity: 0, height: 0, marginTop: 0 }}
                animate={{ opacity: 1, height: 'auto', marginTop: 14 }}
                exit={{ opacity: 0, height: 0, marginTop: 0 }}
                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                className="overflow-hidden"
              >
                <CodOtpVerificationSection
                  paymentOption={paymentOption}
                  isCodEnabled={isCodEnabled}
                  orderTotal={currentPayableTotal}
                  codMinOrder={codMinOrder}
                  codMaxOrder={codMaxOrder}
                  codVerified={codVerified}
                  codOtpSent={codOtpSent}
                  isSendingOtp={isSendingOtp}
                  isProcessing={isProcessing}
                  deliveryPhone={activeSelectedAddress?.phone || user?.phone}
                  customerEmail={activeSelectedAddress?.email || user?.email}
                  configuredCodChannel={configuredCodChannel}
                  effectiveCodChannel={effectiveCodChannel}
                  selectedCodChannel={selectedCodChannel}
                  onSelectCodChannel={setSelectedCodChannel}
                  codOtpInput={codOtpInput}
                  setCodOtpInput={setCodOtpInput}
                  handleSendCodOtp={() => {
                    if (!needByDate) {
                      toast.error('Please select a target delivery date first');
                      return;
                    }
                    handleSendCodOtp();
                  }}
                  handleVerifyCodOtp={handleVerifyCodOtp}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}

      {/* Sticky Action Footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t border-neutral-200 p-3.5 shadow-[0_-8px_30px_rgba(0,0,0,0.06)] z-40 flex flex-col items-center">
        <div className="max-w-[768px] w-full mx-auto flex flex-col gap-2.5">
          {paymentError && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-50 text-red-700 p-3 rounded-lg flex items-start gap-2.5 border border-red-200 shadow-2xs"
            >
              <AlertTriangle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" aria-hidden="true" />
              <span className="font-bold text-[11px] leading-snug flex-1">{paymentError}</span>
            </motion.div>
          )}

          {totalsError && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3 bg-red-50 text-red-700 rounded-lg text-[11px] font-bold border border-red-200 flex flex-col gap-2 shadow-2xs"
            >
              <div className="flex items-start gap-2">
                <AlertTriangle
                  className="w-4 h-4 shrink-0 text-red-600 mt-0.5"
                  aria-hidden="true"
                />
                <span className="flex-1 leading-snug">{totalsError}</span>
              </div>
              <button
                type="button"
                onClick={() => fetchBackendTotals()}
                className="bg-neutral-900 text-white py-1 px-3 rounded-md text-[10px] uppercase tracking-wider w-fit self-end font-bold shadow-2xs cursor-pointer"
              >
                Retry Validation
              </button>
            </motion.div>
          )}

          <div className="flex gap-3 w-full items-center">
            <button
              onClick={() => setActiveStep(1)}
              disabled={isProcessing}
              className="h-12 px-5 bg-white text-neutral-800 font-extrabold uppercase tracking-wider text-xs rounded-full border border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50 transition-colors disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5 shrink-0"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
            <button
              onClick={handleBottomSubmit}
              disabled={isButtonDisabled()}
              className={`flex-1 h-12 rounded-full pl-5 pr-1.5 py-1 text-xs font-extrabold uppercase tracking-wider transition-all flex items-center justify-between group ${
                isButtonDisabled()
                  ? 'bg-neutral-100 text-neutral-400 border border-neutral-200 cursor-not-allowed'
                  : 'bg-[#f7bb0e] text-neutral-950 hover:bg-[#eab00d] border border-[#f7bb0e] shadow-[0_2px_0_0_#d99b00,0_4px_12px_rgba(247,187,14,0.3)] active:scale-[0.98] cursor-pointer'
              }`}
            >
              <div className="flex items-center gap-2">
                {isProcessing && (
                  <div className="w-3.5 h-3.5 border-2 border-neutral-950/30 border-t-neutral-950 rounded-full animate-spin shrink-0" />
                )}
                <span className="font-extrabold text-[12px] sm:text-[12.5px] uppercase tracking-wider text-neutral-950 truncate">
                  {getSubmitButtonLabel()}
                </span>
              </div>
              <span className="w-8 h-8 rounded-full bg-white text-neutral-950 flex items-center justify-center shrink-0 shadow-xs transition-transform duration-200 group-hover:scale-105">
                <ArrowRight
                  className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5"
                  strokeWidth={2.5}
                  aria-hidden="true"
                />
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
