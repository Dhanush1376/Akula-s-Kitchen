import React from 'react';
import { m as motion, AnimatePresence } from 'framer-motion';
import {
  ShieldCheck,
  Phone,
  Mail,
  ArrowRight,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Loader2,
} from 'lucide-react';

/**
 * Encapsulated 6-digit OTP verification section for Cash on Delivery (COD) orders.
 * Redesigned in Akula's Kitchen aesthetic with reduced border radius and clean labels.
 */
export default function CodOtpVerificationSection({
  paymentOption,
  isCodEnabled,
  orderTotal,
  codMinOrder,
  codMaxOrder,
  codVerified,
  codOtpSent,
  isSendingOtp,
  isProcessing,
  deliveryPhone,
  customerEmail,
  configuredCodChannel = 'phone',
  effectiveCodChannel = 'phone',
  selectedCodChannel = 'phone',
  onSelectCodChannel,
  codOtpInput,
  setCodOtpInput,
  handleSendCodOtp,
  handleVerifyCodOtp,
}) {
  const otpRefs = React.useRef([]);
  const [otpDigits, setOtpDigits] = React.useState(['', '', '', '', '', '']);

  // Sync internal digits state with codOtpInput
  React.useEffect(() => {
    if (codOtpInput) {
      const digits = codOtpInput
        .padEnd(6, ' ')
        .slice(0, 6)
        .split('')
        .map((c) => (c === ' ' ? '' : c));
      setOtpDigits(digits);
    } else {
      setOtpDigits(['', '', '', '', '', '']);
    }
  }, [codOtpInput]);

  const handleDigitChange = async (index, value) => {
    const cleanedVal = value.replace(/\D/g, '').slice(-1);
    const newDigits = [...otpDigits];
    newDigits[index] = cleanedVal;
    setOtpDigits(newDigits);

    const code = newDigits.join('');
    setCodOtpInput(code);

    // Auto-focus next field
    if (cleanedVal !== '' && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }

    // Auto-verify if fully entered
    if (code.length === 6 && !newDigits.includes('')) {
      await handleVerifyCodOtp(code);
    }
  };

  const handleDigitKeyDown = (index, e) => {
    if (e.key === 'Backspace') {
      if (otpDigits[index] === '' && index > 0) {
        const newDigits = [...otpDigits];
        newDigits[index - 1] = '';
        setOtpDigits(newDigits);
        setCodOtpInput(newDigits.join(''));
        otpRefs.current[index - 1]?.focus();
      } else {
        const newDigits = [...otpDigits];
        newDigits[index] = '';
        setOtpDigits(newDigits);
        setCodOtpInput(newDigits.join(''));
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      otpRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpPaste = async (e) => {
    e.preventDefault();
    const pasteData = e.clipboardData?.getData('text') || '';
    const digits = pasteData.replace(/\D/g, '').slice(0, 6).split('');
    if (digits.length === 0) return;

    const newDigits = [...otpDigits];
    digits.forEach((d, i) => {
      if (i < 6) newDigits[i] = d;
    });
    setOtpDigits(newDigits);
    const code = newDigits.join('');
    setCodOtpInput(code);

    const nextIdx = Math.min(digits.length, 5);
    otpRefs.current[nextIdx]?.focus();

    if (code.length === 6 && !newDigits.includes('')) {
      await handleVerifyCodOtp(code);
    }
  };

  const isCodVisible =
    paymentOption === 'cod' &&
    isCodEnabled &&
    orderTotal <= codMaxOrder &&
    orderTotal >= codMinOrder;

  const isEmailActive = effectiveCodChannel === 'email';
  const targetValue = isEmailActive ? customerEmail : deliveryPhone;
  const isTargetMissing = isEmailActive ? !customerEmail : !deliveryPhone;

  return (
    <AnimatePresence mode="wait">
      {isCodVisible && (
        <motion.div
          key="cod-otp-box"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
          className="mb-4 rounded-lg border border-neutral-200 bg-white p-4 sm:p-5 shadow-sm space-y-3.5"
        >
          {/* Header */}
          <div className="flex items-center justify-between gap-2 border-b border-neutral-200 pb-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-neutral-800" strokeWidth={2} />
              <span
                className="text-[13px] font-semibold text-neutral-800 font-sans tracking-normal"
                style={{ fontStretch: 'normal' }}
              >
                Verify COD Order
              </span>
            </div>
          </div>

          {!codVerified ? (
            <div className="space-y-3.5">
              {/* Channel Selector if configured as 'both' and OTP not yet sent */}
              {configuredCodChannel === 'both' && !codOtpSent && (
                <div className="flex items-center gap-2.5 bg-neutral-50 p-1.5 rounded-lg border border-neutral-200">
                  <span className="text-[10px] uppercase tracking-wider font-extrabold text-neutral-500 px-2 shrink-0">
                    Verify via:
                  </span>
                  <div className="grid grid-cols-2 gap-1.5 flex-1">
                    <button
                      type="button"
                      onClick={() => onSelectCodChannel && onSelectCodChannel('phone')}
                      className={`flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-md text-[11px] font-extrabold uppercase tracking-wider transition-all cursor-pointer ${
                        selectedCodChannel === 'phone'
                          ? 'bg-[#f7bb0e] text-neutral-950 border border-[#f7bb0e] shadow-xs'
                          : 'text-neutral-600 hover:text-black hover:bg-white/80 border border-transparent'
                      }`}
                    >
                      <Phone className="w-3.5 h-3.5" strokeWidth={2.2} />
                      <span>Phone</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onSelectCodChannel && onSelectCodChannel('email')}
                      className={`flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-md text-[11px] font-extrabold uppercase tracking-wider transition-all cursor-pointer ${
                        selectedCodChannel === 'email'
                          ? 'bg-[#f7bb0e] text-neutral-950 border border-[#f7bb0e] shadow-xs'
                          : 'text-neutral-600 hover:text-black hover:bg-white/80 border border-transparent'
                      }`}
                    >
                      <Mail className="w-3.5 h-3.5" strokeWidth={2.2} />
                      <span>Email</span>
                    </button>
                  </div>
                </div>
              )}

              {isTargetMissing ? (
                <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg flex items-center gap-2 text-amber-900 text-xs">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    {isEmailActive
                      ? 'Please ensure your account or delivery address has a valid email address.'
                      : 'Please add a phone number to this delivery address to place a COD order.'}
                  </span>
                </div>
              ) : !codOtpSent ? (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-neutral-50 border border-neutral-200 p-3.5 rounded-lg">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[12px] text-neutral-600 font-medium">
                      {isEmailActive ? 'Send OTP to email:' : 'Send OTP to phone:'}
                    </span>
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white border border-neutral-200 text-[12px] font-mono font-bold text-neutral-950">
                      {isEmailActive ? (
                        <Mail className="w-3.5 h-3.5 text-neutral-600" />
                      ) : (
                        <Phone className="w-3.5 h-3.5 text-neutral-600" />
                      )}
                      <span>{targetValue}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleSendCodOtp}
                    disabled={isSendingOtp || isProcessing}
                    className="bg-[#f7bb0e] text-neutral-950 hover:bg-[#eab00d] border border-[#f7bb0e] py-2.5 px-5 rounded-lg text-xs font-extrabold uppercase tracking-wider shadow-[0_2px_0_0_#d99b00,0_4px_12px_rgba(247,187,14,0.3)] transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                  >
                    {isSendingOtp ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Sending...</span>
                      </>
                    ) : (
                      <>
                        <span>Send OTP</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <div className="space-y-3.5 bg-neutral-50 border border-neutral-200 p-4 rounded-lg">
                  <div className="text-center sm:text-left">
                    <p className="text-[12px] text-neutral-800 font-medium">
                      Enter the 6-digit OTP sent to {isEmailActive ? 'email' : 'phone'}:{' '}
                      <span className="font-bold text-neutral-950">{targetValue}</span>
                    </p>
                    <p className="text-[11px] text-neutral-500 mt-0.5">
                      {isEmailActive
                        ? 'Please check your email inbox and spam folder.'
                        : 'Please check your incoming mobile SMS.'}
                    </p>
                  </div>

                  {/* Responsive 6-digit input grid */}
                  <div
                    className="w-full max-w-[280px] mx-auto grid grid-cols-6 gap-2 py-1"
                    onPaste={handleOtpPaste}
                  >
                    {otpDigits.map((digit, idx) => (
                      <input
                        key={idx}
                        ref={(el) => (otpRefs.current[idx] = el)}
                        type="tel"
                        pattern="[0-9]*"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        disabled={isProcessing}
                        onPaste={handleOtpPaste}
                        onChange={(e) => handleDigitChange(idx, e.target.value)}
                        onKeyDown={(e) => handleDigitKeyDown(idx, e)}
                        className="w-full aspect-square min-w-0 bg-white border border-neutral-200 focus:border-[#f7bb0e] focus:ring-2 focus:ring-[#f7bb0e]/20 rounded-md text-center font-mono font-bold text-base text-neutral-950 shadow-xs outline-none transition-all disabled:opacity-50"
                      />
                    ))}
                  </div>

                  {/* Resend option */}
                  <div className="flex justify-center pt-2 border-t border-neutral-200">
                    <button
                      type="button"
                      onClick={handleSendCodOtp}
                      disabled={isSendingOtp || isProcessing}
                      className="text-[11px] text-neutral-700 hover:text-black font-bold uppercase tracking-wider hover:underline flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <RefreshCw className="w-3 h-3 text-neutral-500" />
                      <span>Resend OTP</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-2.5 bg-emerald-50 border border-emerald-200/60 p-3.5 rounded-lg text-emerald-900"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
              <div className="flex-1 min-w-0 text-xs">
                <span className="font-bold">COD Verified:</span>{' '}
                <span className="text-emerald-800">
                  Confirmed via {isEmailActive ? 'email' : 'phone'}. Ready to place order.
                </span>
              </div>
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
