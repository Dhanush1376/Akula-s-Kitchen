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
import { useMobileDrawerEngine } from '../../hooks/useMobileDrawerEngine';
import { AuthCornerLeaves } from './AuthCornerLeaves';

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

  const { isMobile, dragProps, sheetTransition } = useMobileDrawerEngine({
    isOpen: isAuthModalOpen,
    onClose: closeAuthModal,
  });

  const modalVariants = {
    hidden: isMobile ? { y: '100%', opacity: 0.5 } : { opacity: 0, scale: 0.95, y: 15 },
    visible: {
      y: 0,
      opacity: 1,
      scale: 1,
      transition: isMobile ? sheetTransition : { duration: 0.35, ease: [0.16, 1, 0.3, 1] },
    },
    exit: isMobile
      ? {
          y: '100%',
          opacity: 0,
          transition: sheetTransition,
        }
      : { opacity: 0, scale: 0.95, y: 10, transition: { duration: 0.25 } },
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
        <div className="fixed inset-0 z-[9999] pointer-events-none flex items-end sm:items-center justify-center p-3 sm:p-6 md:p-8">
          {/* Dark blurred background overlay */}
          <motion.div
            key="auth-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeAuthModal}
            className="fixed inset-0 bg-black/40 backdrop-blur-xs pointer-events-auto"
          />

          {/* Floating Auth Card Modal Container */}
          <motion.div
            key="auth-modal"
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            {...(isMobile ? dragProps : {})}
            className="relative z-10 pointer-events-auto flex flex-col w-full max-w-[450px] md:max-w-[475px] mx-auto"
            style={{
              marginBottom: isMobile ? 'env(safe-area-inset-bottom, 0px)' : undefined,
            }}
          >
            <div className="relative w-full bg-white/95 backdrop-blur-2xl rounded-3xl pt-2 px-5 pb-5 sm:pt-6 sm:px-7 sm:pb-7 md:pt-7 md:px-8 md:pb-8 shadow-[0_12px_45px_rgba(0,0,0,0.16)] border border-black/[0.08] flex flex-col max-h-[88dvh] overflow-hidden">
              {/* Decorative gentle corner leaves falling slowly */}
              <AuthCornerLeaves />

              {/* Grab handle for mobile bottom sheet - moved right to the top rim */}
              <div
                className="sm:hidden w-full flex justify-center pt-1 pb-2 cursor-grab select-none"
                onClick={closeAuthModal}
              >
                <div className="w-9 h-1 rounded-full bg-neutral-300" />
              </div>

              {/* Close button */}
              <button
                onClick={closeAuthModal}
                className="absolute top-3.5 right-3.5 sm:top-4.5 sm:right-4.5 w-8 h-8 sm:w-8.5 sm:h-8.5 rounded-full bg-neutral-100 hover:bg-neutral-200 active:scale-95 flex items-center justify-center text-neutral-700 hover:text-black transition-all z-50 cursor-pointer"
                aria-label="Close authentication modal"
              >
                <X className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-black" strokeWidth={2.2} />
              </button>

              {/* Core Content Layout */}
              <div className="relative z-10 flex-1 overflow-y-auto overscroll-contain touch-pan-y no-scrollbar pt-1">
                <AnimatePresence mode="wait">
                  {step === 'success' ? (
                    <AuthSuccessScreen isNewUser={isNewUser} />
                  ) : (
                    <motion.div
                      key="form-container"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="space-y-4 sm:space-y-4.5"
                    >
                      {/* Headings */}
                      <div className="text-left mb-3.5 sm:mb-4.5 space-y-1 sm:space-y-1.5">
                        <h2
                          className="font-serif-heading text-[20px] sm:text-[23px] md:text-[25px] leading-tight text-neutral-950 font-bold tracking-tight"
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
                          <p className="text-neutral-500 text-[12px] sm:text-[13px] md:text-[13.5px] font-normal leading-relaxed">
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
                          <p className="text-neutral-500 text-[12px] sm:text-[13px] md:text-[13.5px] font-normal leading-relaxed">
                            Help us personalize your orders and account experience.
                          </p>
                        )}
                        {step === 'otp' && (
                          <p className="text-amber-950/70 text-[12.5px] sm:text-[13px] md:text-[13.5px] font-normal leading-relaxed">
                            Code sent to{' '}
                            <span className="font-bold text-neutral-950">{identifier}</span>
                            <button
                              type="button"
                              onClick={() => setStep('identifier')}
                              className="text-neutral-950 hover:text-[#b38505] font-extrabold underline ml-1.5 uppercase text-[10px] sm:text-[11px] tracking-wider cursor-pointer"
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
