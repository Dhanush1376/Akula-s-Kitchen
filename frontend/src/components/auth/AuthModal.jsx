import { X } from 'lucide-react';
import { m as motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useConfig } from '../../context/ConfigContext';
import { useAuthFlow } from '../../hooks/useAuthFlow';
import { useScrollLock } from '../../hooks/useScrollLock';
import toast from 'react-hot-toast';
import {
  UnifiedAuthForm,
  TwoFactorForm,
  OtpVerificationForm,
  AuthSuccessScreen,
  LinkRequiredScreen,
  NamePromptForm,
} from './AuthForms';

export function AuthModal() {
  const { isAuthModalOpen, closeAuthModal, loginSuccess } = useAuth();
  const { customerAuthMethod = 'both' } = useConfig();

  useScrollLock(isAuthModalOpen);

  const {
    step,
    setStep,
    identifier,
    setIdentifier,
    otp,
    totpCode,
    setTotpCode,
    timer,
    isLoading,
    error,
    setError,
    errorMsg,
    otpRefs,
    requestOTP,
    verifyOTP,
    verify2FA,
    handleOtpChange,
    handleKeyDown,
    handlePaste,
    resetState,
    googleLoading,
    handleGoogleSuccess,
    handleGoogleError,
    isNewUser,
    userName,
    setUserName,
    isUpdatingName,
    handleNameSubmit,
    handleNameSkip,
  } = useAuthFlow(loginSuccess, isAuthModalOpen);

  const [isFocused, setIsFocused] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 640);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const modalVariants = {
    hidden: isMobile ? { y: '100%', opacity: 1, scale: 1 } : { opacity: 0, scale: 0.95, y: 15 },
    visible: {
      y: 0,
      opacity: 1,
      scale: 1,
      transition: isMobile
        ? { type: 'spring', damping: 25, stiffness: 250 }
        : { duration: 0.4, ease: [0.16, 1, 0.3, 1] },
    },
    exit: isMobile
      ? {
          y: '100%',
          opacity: 1,
          scale: 1,
          transition: { type: 'spring', damping: 30, stiffness: 300 },
        }
      : { opacity: 0, scale: 0.95, y: 10, transition: { duration: 0.3 } },
  };

  // Reset modal state when it closes or opens
  useEffect(() => {
    if (!isAuthModalOpen) {
      // Small delay to prevent visual jump during exit animation
      const t = setTimeout(() => {
        resetState();
      }, 400);
      return () => clearTimeout(t);
    }
  }, [isAuthModalOpen, resetState]);

  // Listen to Escape key to close the auth modal
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      if (e.key === 'Escape' && isAuthModalOpen) {
        closeAuthModal();
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [isAuthModalOpen, closeAuthModal]);

  const handleVerifyOTP = async (e) => {
    e?.preventDefault();
    const otpString = otp.join('');
    if (otpString.length < 6) {
      setError(true);
      toast.error('Please enter all 6 digits');
      setTimeout(() => setError(false), 500);
      return;
    }
    await verifyOTP(otpString);
  };

  return (
    <AnimatePresence>
      {isAuthModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4">
          {/* Dark blurred background overlay */}
          <motion.div
            key="auth-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeAuthModal}
            className="absolute inset-0 bg-black/40 backdrop-blur-md"
          />

          {/* Floating Auth Card Modal Container */}
          <motion.div
            key="auth-modal"
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="w-full sm:max-w-[420px] relative flex flex-col justify-end"
          >
            <div className="relative bg-white w-full rounded-t-[18px] sm:rounded-2xl p-6 sm:p-8 border-t sm:border border-black/10 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.2)] overflow-y-auto max-h-[95%] no-scrollbar">
              {/* Grab handle for mobile bottom sheet */}
              <div className="sm:hidden w-12 h-1.5 bg-neutral-400 rounded-full mx-auto mb-4 shrink-0" />

              {/* Close button */}
              <button
                onClick={closeAuthModal}
                className="absolute top-5 right-5 w-9 h-9 min-h-0 min-w-0 p-0 aspect-square shrink-0 rounded-full bg-[#fff9e6] hover:bg-[#f7bb0e] border border-[#f7bb0e]/40 flex items-center justify-center text-neutral-900 transition-all z-50 cursor-pointer shadow-xs active:scale-95"
                aria-label="Close authentication modal"
              >
                <X size={16} strokeWidth={2.2} />
              </button>

              {/* Core Content Layout */}
              <div className="relative z-10">
                <AnimatePresence mode="wait">
                  {step === 'success' ? (
                    <AuthSuccessScreen isNewUser={isNewUser} />
                  ) : (
                    <motion.div
                      key="form-container"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="space-y-6"
                    >
                      {/* Headings */}
                      <div className="text-left mb-6 sm:mb-8 space-y-2">
                        <h2
                          className="font-serif-heading text-[25px] sm:text-[28px] leading-tight text-neutral-950 font-extrabold tracking-tight"
                          style={{ fontFamily: 'var(--font-display)' }}
                        >
                          {step === '2fa'
                            ? 'Enter Authenticator Code'
                            : step === 'otp'
                              ? 'Verification Code'
                              : step === 'name_prompt'
                                ? "What's your name?"
                                : 'Login or Sign Up'}
                        </h2>
                        {step !== 'otp' && step !== 'account_exists' && step !== 'name_prompt' && (
                          <p className="text-amber-950/70 text-[13px] font-normal leading-relaxed">
                            {step === '2fa'
                              ? 'Enter the 6-digit code from your authenticator app.'
                              : customerAuthMethod === 'email_only'
                                ? 'Log in or register with your email address'
                                : customerAuthMethod === 'phone_only'
                                  ? 'Log in or register with your mobile phone number'
                                  : 'Log in or register with your phone number or email'}
                          </p>
                        )}
                        {step === 'name_prompt' && (
                          <p className="text-amber-950/70 text-[13px] font-normal leading-relaxed">
                            Help us personalize your orders and account experience.
                          </p>
                        )}
                        {step === 'otp' && (
                          <p className="text-amber-950/70 text-[13px] font-normal leading-relaxed">
                            Code sent to{' '}
                            <span className="font-bold text-neutral-950">{identifier}</span>
                            <button
                              type="button"
                              onClick={() => setStep('identifier')}
                              className="text-neutral-950 hover:text-[#b38505] font-extrabold underline ml-1.5 uppercase text-[10px] tracking-wider cursor-pointer"
                            >
                              Change
                            </button>
                          </p>
                        )}
                      </div>

                      {/* Form fields */}
                      <div className="w-full">
                        <AnimatePresence mode="wait">
                          {step === 'identifier' ? (
                            <motion.div
                              key="identifier-step"
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -10 }}
                              className="space-y-6"
                            >
                              <UnifiedAuthForm
                                identifier={identifier}
                                setIdentifier={setIdentifier}
                                requestOTP={requestOTP}
                                isLoading={isLoading}
                                isFocused={isFocused}
                                setIsFocused={setIsFocused}
                                googleLoading={googleLoading}
                                handleGoogleSuccess={handleGoogleSuccess}
                                handleGoogleError={handleGoogleError}
                                customerAuthMethod={customerAuthMethod}
                              />
                            </motion.div>
                          ) : step === 'account_exists' ? (
                            <motion.div
                              key="account-exists-step"
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -10 }}
                            >
                              <LinkRequiredScreen setStep={setStep} />
                            </motion.div>
                          ) : step === '2fa' ? (
                            <motion.div
                              key="2fa-step"
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -10 }}
                            >
                              <TwoFactorForm
                                totpCode={totpCode}
                                setTotpCode={setTotpCode}
                                verify2FA={verify2FA}
                                isLoading={isLoading}
                                resetState={resetState}
                              />
                            </motion.div>
                          ) : step === 'name_prompt' ? (
                            <motion.div
                              key="name-prompt-step"
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -10 }}
                            >
                              <NamePromptForm
                                name={userName}
                                setName={setUserName}
                                onSubmit={handleNameSubmit}
                                onSkip={handleNameSkip}
                                isLoading={isUpdatingName}
                              />
                            </motion.div>
                          ) : (
                            <motion.div
                              key="otp-step"
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -10 }}
                            >
                              <OtpVerificationForm
                                otp={otp}
                                handleVerifyOTP={handleVerifyOTP}
                                handlePaste={handlePaste}
                                handleOtpChange={handleOtpChange}
                                handleKeyDown={handleKeyDown}
                                otpRefs={otpRefs}
                                error={error}
                                errorMsg={errorMsg}
                                isLoading={isLoading}
                                timer={timer}
                                sendOTP={requestOTP}
                              />
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
