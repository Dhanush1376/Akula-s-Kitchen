import { Mail, Check, Smartphone, AlertCircle, ArrowRight } from 'lucide-react';
import React from 'react';
import toast from 'react-hot-toast';
import { m as motion } from 'framer-motion';
import { GoogleSignInButton } from './GoogleSignInButton';
import { useGoogleIdentity } from '../../hooks/useGoogleIdentity';

export function UnifiedAuthForm({
  identifier,
  setIdentifier,
  requestOTP,
  isLoading,
  googleLoading,
  handleGoogleSuccess,
  handleGoogleError,
  customerAuthMethod = 'both',
}) {
  const {
    isReady: googleReady,
    triggerLogin,
    renderGoogleButton,
  } = useGoogleIdentity(handleGoogleSuccess, handleGoogleError);

  const cleanVal = (identifier || '').trim();
  const digitsOnly = cleanVal.replace(/\D/g, '');
  const hasLetters = /[a-zA-Z]/.test(cleanVal);
  const hasAt = cleanVal.includes('@');

  // Determine effective mode:
  let effectiveMode = 'both';
  if (customerAuthMethod === 'phone_only') {
    effectiveMode = 'phone';
  } else if (customerAuthMethod === 'email_only') {
    effectiveMode = 'email';
  } else {
    // Both allowed (combined in 1 input field):
    if (hasAt || (hasLetters && !cleanVal.startsWith('+'))) {
      effectiveMode = 'email';
    } else if (digitsOnly.length > 0) {
      effectiveMode = 'phone';
    } else {
      effectiveMode = 'both';
    }
  }

  const handleFormSubmit = (e) => {
    e.preventDefault();
    const val = (identifier || '').trim();
    if (!val) {
      toast.error('Please enter your mobile phone number or email address');
      return;
    }

    if (effectiveMode === 'phone' || customerAuthMethod === 'phone_only') {
      const digits = val.replace(/\D/g, '');
      let clean = digits;
      if (clean.startsWith('91') && clean.length === 12) clean = clean.slice(2);
      else if (clean.startsWith('0') && clean.length === 11) clean = clean.slice(1);

      if (clean.length !== 10) {
        toast.error('Please enter a valid 10-digit mobile phone number');
        return;
      }
      requestOTP(e, clean);
      return;
    }

    if (effectiveMode === 'email' || customerAuthMethod === 'email_only') {
      if (!val.includes('@') || !val.includes('.') || val.length < 5) {
        toast.error('Please enter a valid email address');
        return;
      }
      requestOTP(e, val.toLowerCase());
      return;
    }

    toast.error('Please enter a valid 10-digit mobile number or email address');
  };

  const showGoogleSignIn = customerAuthMethod !== 'phone_only';

  return (
    <div className="space-y-3.5 sm:space-y-4">
      <form onSubmit={handleFormSubmit} className="space-y-3.5 sm:space-y-4">
        <div className="space-y-1.5">
          <label
            htmlFor="auth-identifier-input"
            className="flex items-center gap-1.5 text-[10px] sm:text-[10.5px] md:text-[11px] font-bold text-neutral-500 uppercase tracking-wider"
          >
            {effectiveMode === 'phone' ? (
              <>
                <Smartphone className="w-3.5 h-3.5 text-neutral-700" strokeWidth={2} />
                Mobile Phone Number
              </>
            ) : effectiveMode === 'email' ? (
              <>
                <Mail className="w-3.5 h-3.5 text-neutral-700" strokeWidth={2} />
                Email Address
              </>
            ) : (
              <>
                <span className="flex items-center gap-1 text-neutral-700">
                  <Smartphone className="w-3.5 h-3.5" strokeWidth={2} />
                  <span className="text-[10px] opacity-40">/</span>
                  <Mail className="w-3.5 h-3.5" strokeWidth={2} />
                </span>
                Mobile Phone or Email
              </>
            )}
          </label>

          {customerAuthMethod === 'phone_only' ? (
            <div className="relative flex items-center">
              <div className="absolute left-3.5 sm:left-4 flex items-center gap-1 pointer-events-none select-none text-[12.5px] sm:text-[13px] md:text-[13.5px] font-bold text-neutral-800">
                <span>🇮🇳</span>
                <span>+91</span>
                <span className="text-black/15 ml-0.5">|</span>
              </div>
              <input
                id="auth-identifier-input"
                type="tel"
                inputMode="numeric"
                required
                className="w-full h-11 sm:h-11.5 md:h-12 rounded-full border border-neutral-200 focus:border-[#283618] focus:ring-2 focus:ring-[#283618]/15 bg-white text-neutral-900 placeholder:text-neutral-400 text-[13px] sm:text-[13.5px] md:text-[14px] font-medium !pl-18 sm:!pl-19 md:!pl-20 !pr-4 shadow-xs outline-none transition-all tracking-wide"
                placeholder="98765 43210"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value.replace(/\D/g, '').slice(0, 10))}
                maxLength={10}
              />
            </div>
          ) : customerAuthMethod === 'email_only' ? (
            <div className="relative flex items-center">
              <div className="absolute left-3.5 sm:left-4 flex items-center pointer-events-none select-none text-neutral-400">
                <Mail className="w-4 h-4 text-neutral-500" strokeWidth={2} />
              </div>
              <input
                id="auth-identifier-input"
                type="email"
                required
                className="w-full h-11 sm:h-11.5 md:h-12 rounded-full border border-neutral-200 focus:border-[#283618] focus:ring-2 focus:ring-[#283618]/15 bg-white text-neutral-900 placeholder:text-neutral-400 text-[13px] sm:text-[13.5px] md:text-[14px] font-medium !pl-10 sm:!pl-10.5 md:!pl-11 !pr-4 shadow-xs outline-none transition-all"
                placeholder="name@example.com"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value.trim())}
              />
            </div>
          ) : (
            /* Combined 1 Input: Single smart input field for both Phone and Email */
            <div className="relative flex items-center">
              {effectiveMode === 'phone' ? (
                <div className="absolute left-3.5 sm:left-4 flex items-center gap-1 pointer-events-none select-none text-[12.5px] sm:text-[13px] md:text-[13.5px] font-bold text-neutral-800">
                  <span>🇮🇳</span>
                  <span>+91</span>
                  <span className="text-black/15 ml-0.5">|</span>
                </div>
              ) : (
                <div className="absolute left-3.5 sm:left-4 flex items-center pointer-events-none select-none text-neutral-400">
                  <Mail className="w-4 h-4 text-neutral-500" strokeWidth={2} />
                </div>
              )}
              <input
                id="auth-identifier-input"
                type={effectiveMode === 'email' ? 'email' : 'text'}
                autoCapitalize="none"
                autoCorrect="off"
                required
                className={`w-full h-11 sm:h-11.5 md:h-12 rounded-full border border-neutral-200 focus:border-[#283618] focus:ring-2 focus:ring-[#283618]/15 bg-white text-neutral-900 placeholder:text-neutral-400 text-[13px] sm:text-[13.5px] md:text-[14px] font-medium shadow-xs outline-none transition-all ${
                  effectiveMode === 'phone'
                    ? '!pl-18 sm:!pl-19 md:!pl-20 !pr-4 tracking-wide'
                    : '!pl-10 sm:!pl-10.5 md:!pl-11 !pr-4'
                }`}
                placeholder={
                  effectiveMode === 'phone'
                    ? '98765 43210'
                    : effectiveMode === 'email'
                      ? 'name@example.com'
                      : '98765 43210 or name@example.com'
                }
                value={identifier}
                onChange={(e) => {
                  const raw = e.target.value;
                  const digits = raw.replace(/\D/g, '');
                  const hasAlpha = /[a-zA-Z@]/.test(raw);
                  if (!hasAlpha && digits.length > 0) {
                    let clean = digits;
                    if (clean.startsWith('91') && clean.length > 10) clean = clean.slice(2);
                    else if (clean.startsWith('0') && clean.length > 10) clean = clean.slice(1);
                    setIdentifier(clean.slice(0, 10));
                  } else {
                    setIdentifier(raw);
                  }
                }}
              />
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={isLoading || !identifier}
          className="w-full h-11.5 sm:h-12 md:h-12.5 bg-[#283618] hover:bg-[#1f2b13] active:scale-[0.99] text-white pl-5 sm:pl-5.5 md:pl-6 pr-1.5 sm:pr-2 py-1 rounded-full shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-between group disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer select-none mt-2"
        >
          <span className="font-bold text-[12px] sm:text-[12.5px] md:text-[13px] uppercase tracking-wider text-white">
            {isLoading ? (
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Sending code…</span>
              </div>
            ) : (
              <span>
                {effectiveMode === 'phone'
                  ? 'Send SMS Verification Code'
                  : effectiveMode === 'email'
                    ? 'Send Email Verification Code'
                    : 'Send Verification Code'}
              </span>
            )}
          </span>
          <span className="w-8 h-8 sm:w-8.5 sm:h-8.5 md:w-9 md:h-9 rounded-full bg-white text-[#283618] flex items-center justify-center shrink-0 shadow-xs transition-transform duration-200 group-hover:scale-105">
            <ArrowRight
              className="w-4 h-4 sm:w-4.5 sm:h-4.5 transition-transform duration-200 group-hover:translate-x-0.5"
              strokeWidth={2.5}
              aria-hidden="true"
            />
          </span>
        </button>
      </form>

      {/* ── Optional Google Sign-In (when email is permitted) ── */}
      {showGoogleSignIn && (
        <>
          <div className="flex items-center gap-3 py-1.5 sm:py-2 md:py-2.5">
            <div className="flex-1 h-px bg-black/[0.08]" />
            <span className="text-[9.5px] sm:text-[10px] md:text-[10.5px] text-neutral-400 uppercase tracking-widest font-bold select-none">
              or
            </span>
            <div className="flex-1 h-px bg-black/[0.08]" />
          </div>

          <GoogleSignInButton
            onClick={triggerLogin}
            isLoading={googleLoading}
            disabled={!googleReady}
            renderGoogleButton={googleReady ? renderGoogleButton : null}
          />
        </>
      )}
    </div>
  );
}

export function TwoFactorForm({ totpCode, setTotpCode, verify2FA, isLoading, resetState }) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (totpCode.length >= 6) verify2FA(totpCode);
      }}
      className="space-y-4"
    >
      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        maxLength={6}
        autoComplete="one-time-code"
        value={totpCode}
        onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
        className="w-full h-11 sm:h-11.5 md:h-12 rounded-full border border-neutral-200 focus:border-[#283618] focus:ring-2 focus:ring-[#283618]/15 bg-white text-neutral-900 placeholder:text-neutral-300 text-center font-mono text-[20px] sm:text-[21px] md:text-[22px] tracking-[0.3em] font-extrabold shadow-xs outline-none transition-all"
        placeholder="000000"
      />
      <button
        type="submit"
        disabled={isLoading || totpCode.length < 6}
        className="w-full h-11.5 sm:h-12 md:h-12.5 bg-[#283618] hover:bg-[#1f2b13] active:scale-[0.99] text-white pl-5 sm:pl-5.5 md:pl-6 pr-1.5 sm:pr-2 py-1 rounded-full shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-between group disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer select-none"
      >
        <span className="font-bold text-[12px] sm:text-[12.5px] md:text-[13px] uppercase tracking-wider text-white">
          {isLoading ? 'Verifying…' : 'Verify Authenticator'}
        </span>
        <span className="w-8 h-8 sm:w-8.5 sm:h-8.5 md:w-9 md:h-9 rounded-full bg-white text-[#283618] flex items-center justify-center shrink-0 shadow-xs transition-transform duration-200 group-hover:scale-105">
          <ArrowRight
            className="w-4 h-4 sm:w-4.5 sm:h-4.5 transition-transform duration-200 group-hover:translate-x-0.5"
            strokeWidth={2.5}
            aria-hidden="true"
          />
        </span>
      </button>
      <button
        type="button"
        onClick={resetState}
        className="w-full text-center text-[10.5px] sm:text-[11px] text-amber-950/70 hover:text-black uppercase tracking-wider font-extrabold hover:underline cursor-pointer"
      >
        Start over
      </button>
    </form>
  );
}

export function OtpVerificationForm({
  otp,
  handleVerifyOTP,
  handlePaste,
  handleOtpChange,
  handleKeyDown,
  otpRefs,
  error,
  errorMsg,
  isLoading,
  timer,
  sendOTP,
}) {
  return (
    <form onSubmit={handleVerifyOTP} className="space-y-4.5 sm:space-y-5">
      <div
        className={`grid grid-cols-6 gap-2 sm:gap-2.5 md:gap-3 w-full max-w-[340px] sm:max-w-[360px] md:max-w-[380px] mx-auto transition-transform duration-300 ${error ? 'translate-x-1' : ''}`}
        onPaste={handlePaste}
      >
        {otp.map((digit, idx) => (
          <input
            key={idx}
            ref={(el) => (otpRefs.current[idx] = el)}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            autoComplete="one-time-code"
            value={digit}
            onChange={(e) => handleOtpChange(e.target.value, idx)}
            onKeyDown={(e) => handleKeyDown(e, idx)}
            onPaste={handlePaste}
            aria-label={`Digit ${idx + 1} of verification code`}
            className={`w-full aspect-[1/1.15] min-w-0 max-w-[48px] sm:max-w-[50px] md:max-w-[54px] mx-auto text-center font-serif-heading font-extrabold text-[20px] sm:text-[22px] md:text-[23px] rounded-[14px] sm:rounded-2xl outline-none transition-all duration-200 shadow-xs ${
              error
                ? 'border-2 border-red-500 text-red-600 bg-red-50/50'
                : digit
                  ? 'border-[2px] border-[#283618] text-neutral-950 bg-[#f9faf7] ring-2 ring-[#283618]/20'
                  : 'border-[1.5px] border-neutral-200 text-neutral-950 bg-white focus:border-[#283618] focus:ring-2 focus:ring-[#283618]/15'
            }`}
          />
        ))}
      </div>

      {/* Aria-live inline error message */}
      <div aria-live="polite" className="h-4 text-center">
        {errorMsg && (
          <span className="text-red-600 text-[11.5px] md:text-[12px] font-bold tracking-wide">
            {errorMsg}
          </span>
        )}
      </div>

      <div className="space-y-3.5 pt-1">
        <button
          type="submit"
          disabled={isLoading || otp.join('').length < 6}
          className="w-full h-11.5 sm:h-12 md:h-12.5 bg-[#283618] hover:bg-[#1f2b13] active:scale-[0.99] text-white pl-5 sm:pl-5.5 md:pl-6 pr-1.5 sm:pr-2 py-1 rounded-full shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-between group disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer select-none"
        >
          <span className="font-bold text-[12px] sm:text-[12.5px] md:text-[13px] uppercase tracking-wider text-white">
            {isLoading ? (
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Verifying…</span>
              </div>
            ) : (
              <span>Verify & Login</span>
            )}
          </span>
          <span className="w-8 h-8 sm:w-8.5 sm:h-8.5 md:w-9 md:h-9 rounded-full bg-white text-[#283618] flex items-center justify-center shrink-0 shadow-xs transition-transform duration-200 group-hover:scale-105">
            <ArrowRight
              className="w-4 h-4 sm:w-4.5 sm:h-4.5 transition-transform duration-200 group-hover:translate-x-0.5"
              strokeWidth={2.5}
              aria-hidden="true"
            />
          </span>
        </button>

        <div className="text-center">
          {timer > 0 ? (
            <span className="text-[10px] sm:text-[10.5px] text-amber-900/60 uppercase tracking-widest font-extrabold block">
              Resend code in {timer}s
            </span>
          ) : (
            <button
              type="button"
              onClick={sendOTP}
              className="text-neutral-950 hover:text-[#b38505] text-[10.5px] sm:text-[11px] uppercase tracking-widest font-extrabold underline hover:no-underline cursor-pointer"
            >
              Resend Code
            </button>
          )}
        </div>
      </div>
    </form>
  );
}

export function AuthSuccessScreen({ isNewUser }) {
  return (
    <motion.div
      key="success-screen"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="text-center py-8 sm:py-10 relative flex flex-col items-center justify-center min-h-[240px] sm:min-h-[260px] overflow-hidden"
    >
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 flex flex-col items-center w-full"
      >
        {/* Success Tick Animation */}
        <motion.div
          initial={{ scale: 0.4, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', damping: 15, delay: 0.2 }}
          className="mb-4 relative flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-emerald-50 border border-emerald-200"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', damping: 12, delay: 0.4 }}
            className="flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-black text-[#f7bb0e] shadow-sm"
          >
            <Check className="w-5 h-5 sm:w-6 sm:h-6" strokeWidth={3} />
          </motion.div>
        </motion.div>

        <div className="space-y-1.5">
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-[10px] text-neutral-400 uppercase tracking-widest font-extrabold block"
          >
            Verification Complete
          </motion.span>

          <motion.h2
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="font-serif-heading text-[22px] sm:text-[24px] md:text-[26px] leading-tight text-neutral-950 font-extrabold tracking-tight"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            {isNewUser ? 'Welcome to Akula’s Kitchen' : 'Welcome Back'}
          </motion.h2>
        </div>

        {/* Brand bar */}
        <motion.div
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 40, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.5, ease: 'easeOut' }}
          className="h-1 bg-[#f7bb0e] rounded-full mt-5"
        />
      </motion.div>
    </motion.div>
  );
}

export function LinkRequiredScreen({ setStep }) {
  return (
    <div className="space-y-4.5 sm:space-y-5 text-center">
      <div className="flex justify-center mb-1">
        <div className="w-12 h-12 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center">
          <AlertCircle className="text-amber-600 w-6 h-6" />
        </div>
      </div>

      <h3
        className="font-serif-heading text-[19px] sm:text-[20px] md:text-[21px] font-bold text-neutral-950"
        style={{ fontFamily: 'var(--font-display)' }}
      >
        Sign-in Method Unavailable
      </h3>

      <p className="text-[13px] text-neutral-600 leading-relaxed px-2">
        This Google account can't be used to sign in directly.
        <br />
        <br />
        If you have an existing account, sign in with your phone or email and connect Google from
        your account profile.
      </p>

      <div className="pt-2">
        <button
          onClick={() => setStep('identifier')}
          className="w-full h-11.5 sm:h-12 md:h-12.5 bg-[#283618] hover:bg-[#1f2b13] active:scale-[0.99] text-white pl-5 sm:pl-5.5 md:pl-6 pr-1.5 sm:pr-2 py-1 rounded-full shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-between group cursor-pointer select-none"
        >
          <span className="font-bold text-[12px] sm:text-[12.5px] md:text-[13px] uppercase tracking-wider text-white">
            Sign in with Email or Phone
          </span>
          <span className="w-8 h-8 sm:w-8.5 sm:h-8.5 md:w-9 md:h-9 rounded-full bg-white text-[#283618] flex items-center justify-center shrink-0 shadow-xs transition-transform duration-200 group-hover:scale-105">
            <ArrowRight
              className="w-4 h-4 sm:w-4.5 sm:h-4.5 transition-transform duration-200 group-hover:translate-x-0.5"
              strokeWidth={2.5}
              aria-hidden="true"
            />
          </span>
        </button>
      </div>
    </div>
  );
}

export function NamePromptForm({ name, setName, onSubmit, onSkip, isLoading }) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <label
          htmlFor="auth-name-input"
          className="text-[10px] sm:text-[10.5px] md:text-[11px] font-bold text-neutral-500 uppercase tracking-wider block"
        >
          Your Name
        </label>
        <input
          id="auth-name-input"
          type="text"
          autoFocus
          className="w-full h-11 sm:h-11.5 md:h-12 rounded-full border border-neutral-200 focus:border-[#283618] focus:ring-2 focus:ring-[#283618]/15 bg-white text-neutral-900 placeholder:text-neutral-400 text-[13px] sm:text-[13.5px] md:text-[14px] font-medium px-4 sm:px-4.5 shadow-xs outline-none transition-all"
          placeholder="e.g. Priya Sharma"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <p className="text-[11.5px] sm:text-[12px] text-neutral-500 font-normal pl-1">
          Help us personalize your experience and order delivery.
        </p>
      </div>

      <div className="space-y-3 pt-1">
        <button
          type="submit"
          disabled={isLoading || !name || !name.trim()}
          className="w-full h-11.5 sm:h-12 md:h-12.5 bg-[#283618] hover:bg-[#1f2b13] active:scale-[0.99] text-white pl-5 sm:pl-5.5 md:pl-6 pr-1.5 sm:pr-2 py-1 rounded-full shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-between group disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer select-none"
        >
          <span className="font-bold text-[12px] sm:text-[12.5px] md:text-[13px] uppercase tracking-wider text-white">
            {isLoading ? 'Saving…' : 'Continue'}
          </span>
          <span className="w-8 h-8 sm:w-8.5 sm:h-8.5 md:w-9 md:h-9 rounded-full bg-white text-[#283618] flex items-center justify-center shrink-0 shadow-xs transition-transform duration-200 group-hover:scale-105">
            <ArrowRight
              className="w-4 h-4 sm:w-4.5 sm:h-4.5 transition-transform duration-200 group-hover:translate-x-0.5"
              strokeWidth={2.5}
              aria-hidden="true"
            />
          </span>
        </button>
        <button
          type="button"
          onClick={onSkip}
          className="w-full text-center text-[10.5px] sm:text-[11px] text-amber-950/60 hover:text-black uppercase tracking-wider font-extrabold py-2 transition-colors cursor-pointer"
        >
          Skip for now
        </button>
      </div>
    </form>
  );
}
