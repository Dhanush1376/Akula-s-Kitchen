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
    <div className="space-y-4">
      <form onSubmit={handleFormSubmit} className="space-y-4">
        <div className="space-y-2">
          <label
            htmlFor="auth-identifier-input"
            className="flex items-center gap-1.5 text-[10.5px] font-extrabold text-amber-950/70 uppercase tracking-wider"
          >
            {effectiveMode === 'phone' ? (
              <>
                <Smartphone className="w-3.5 h-3.5 text-[#f7bb0e]" strokeWidth={2.2} />
                Mobile Phone Number
              </>
            ) : effectiveMode === 'email' ? (
              <>
                <Mail className="w-3.5 h-3.5 text-[#f7bb0e]" strokeWidth={2.2} />
                Email Address
              </>
            ) : (
              <>
                <span className="flex items-center gap-1 text-[#f7bb0e]">
                  <Smartphone className="w-3.5 h-3.5" strokeWidth={2.2} />
                  <span className="text-[10px] opacity-40">/</span>
                  <Mail className="w-3.5 h-3.5" strokeWidth={2.2} />
                </span>
                Mobile Phone or Email
              </>
            )}
          </label>

          {customerAuthMethod === 'phone_only' ? (
            <div className="relative flex items-center">
              <div className="absolute left-4 flex items-center gap-1.5 pointer-events-none select-none text-[13px] font-bold text-neutral-800">
                <span>🇮🇳</span>
                <span>+91</span>
                <span className="text-black/15 ml-0.5">|</span>
              </div>
              <input
                id="auth-identifier-input"
                type="tel"
                inputMode="numeric"
                required
                className="w-full h-12 rounded-full border-[1.5px] border-black/15 focus:border-black focus:ring-2 focus:ring-black/5 bg-white text-neutral-900 placeholder:text-neutral-400 text-[14px] font-medium !pl-20 !pr-4 shadow-xs outline-none transition-all tracking-wide"
                placeholder="98765 43210"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value.replace(/\D/g, '').slice(0, 10))}
                maxLength={10}
              />
            </div>
          ) : customerAuthMethod === 'email_only' ? (
            <div className="relative flex items-center">
              <div className="absolute left-4 flex items-center pointer-events-none select-none text-neutral-400">
                <Mail className="w-4 h-4 text-neutral-600" strokeWidth={2} />
              </div>
              <input
                id="auth-identifier-input"
                type="email"
                required
                className="w-full h-12 rounded-full border-[1.5px] border-black/15 focus:border-black focus:ring-2 focus:ring-black/5 bg-white text-neutral-900 placeholder:text-neutral-400 text-[14px] font-medium !pl-11 !pr-4 shadow-xs outline-none transition-all"
                placeholder="name@example.com"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value.trim())}
              />
            </div>
          ) : (
            /* Combined 1 Input: Single smart input field for both Phone and Email */
            <div className="relative flex items-center">
              {effectiveMode === 'phone' ? (
                <div className="absolute left-4 flex items-center gap-1.5 pointer-events-none select-none text-[13px] font-bold text-neutral-800">
                  <span>🇮🇳</span>
                  <span>+91</span>
                  <span className="text-black/15 ml-0.5">|</span>
                </div>
              ) : (
                <div className="absolute left-4 flex items-center pointer-events-none select-none text-neutral-400">
                  <Mail className="w-4 h-4 text-neutral-600" strokeWidth={2} />
                </div>
              )}
              <input
                id="auth-identifier-input"
                type={effectiveMode === 'email' ? 'email' : 'text'}
                autoCapitalize="none"
                autoCorrect="off"
                required
                className={`w-full h-12 rounded-full border-[1.5px] border-black/15 focus:border-black focus:ring-2 focus:ring-black/5 bg-white text-neutral-900 placeholder:text-neutral-400 text-[14px] font-medium shadow-xs outline-none transition-all ${
                  effectiveMode === 'phone' ? '!pl-20 !pr-4 tracking-wide' : '!pl-11 !pr-4'
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
          className="w-full h-12 rounded-full bg-[#f7bb0e] text-neutral-950 hover:bg-[#eab00d] active:scale-98 disabled:bg-[#fef2c0] disabled:text-[#8a6800] disabled:border-[#fae182] disabled:cursor-not-allowed font-extrabold text-[12px] sm:text-[13px] uppercase tracking-wider border-[1.5px] border-[#f7bb0e] shadow-[0_1.5px_0_0_#d99b00,0_2px_4px_rgba(0,0,0,0.06)] transition-all flex items-center justify-center gap-2 cursor-pointer mt-1"
        >
          {isLoading ? (
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-amber-900/30 border-t-neutral-950 rounded-full animate-spin" />
              <span>Sending code…</span>
            </div>
          ) : (
            <>
              <span>
                {effectiveMode === 'phone'
                  ? 'Send SMS Verification Code'
                  : effectiveMode === 'email'
                    ? 'Send Email Verification Code'
                    : 'Send Verification Code'}
              </span>
              <ArrowRight className="w-4 h-4" strokeWidth={2.2} />
            </>
          )}
        </button>
      </form>

      {/* ── Optional Google Sign-In (when email is permitted) ── */}
      {showGoogleSignIn && (
        <>
          <div className="flex items-center gap-4 py-2">
            <div className="flex-1 h-px bg-[#f7bb0e]/25" />
            <span className="text-[10px] text-amber-900/60 uppercase tracking-widest font-extrabold select-none">
              or
            </span>
            <div className="flex-1 h-px bg-[#f7bb0e]/25" />
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
        className="w-full h-12 rounded-full border-[1.5px] border-amber-900/15 focus:border-[#f7bb0e] focus:ring-2 focus:ring-[#f7bb0e]/20 bg-white text-neutral-900 placeholder:text-amber-950/20 text-center font-mono text-[20px] tracking-[0.3em] font-extrabold shadow-xs outline-none transition-all"
        placeholder="000000"
      />
      <button
        type="submit"
        disabled={isLoading || totpCode.length < 6}
        className="w-full h-12 rounded-full bg-[#f7bb0e] text-neutral-950 hover:bg-[#eab00d] active:scale-98 disabled:bg-[#fef2c0] disabled:text-[#8a6800] disabled:border-[#fae182] disabled:cursor-not-allowed font-extrabold text-[12px] sm:text-[13px] uppercase tracking-wider border-[1.5px] border-[#f7bb0e] shadow-[0_1.5px_0_0_#d99b00,0_2px_4px_rgba(0,0,0,0.06)] transition-all flex items-center justify-center gap-2 cursor-pointer"
      >
        {isLoading ? (
          <div className="flex items-center gap-2">
            <span className="w-4 h-4 border-2 border-amber-900/30 border-t-neutral-950 rounded-full animate-spin" />
            <span>Verifying…</span>
          </div>
        ) : (
          <>
            <span>Verify Authenticator</span>
            <ArrowRight className="w-4 h-4" strokeWidth={2.2} />
          </>
        )}
      </button>
      <button
        type="button"
        onClick={resetState}
        className="w-full text-center text-[10.5px] text-amber-950/70 hover:text-black uppercase tracking-wider font-extrabold hover:underline cursor-pointer"
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
    <form onSubmit={handleVerifyOTP} className="space-y-5">
      <div
        className={`grid grid-cols-6 gap-1.5 xs:gap-2 sm:gap-2.5 w-full max-w-[340px] mx-auto transition-transform duration-300 ${error ? 'translate-x-1' : ''}`}
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
            className={`w-full aspect-[1/1.15] min-w-0 max-w-[48px] mx-auto text-center font-serif-heading font-extrabold text-[20px] sm:text-[22px] rounded-[14px] outline-none transition-all duration-200 shadow-xs ${
              error
                ? 'border-2 border-red-500 text-red-600 bg-red-50/50'
                : digit
                  ? 'border-[2px] border-[#f7bb0e] text-neutral-950 bg-[#fffdf0] ring-2 ring-[#f7bb0e]/25'
                  : 'border-[1.5px] border-amber-900/20 text-neutral-950 bg-white focus:border-[#f7bb0e] focus:ring-2 focus:ring-[#f7bb0e]/20'
            }`}
          />
        ))}
      </div>

      {/* Aria-live inline error message */}
      <div aria-live="polite" className="h-4 text-center">
        {errorMsg && (
          <span className="text-red-600 text-[11.5px] font-bold tracking-wide">{errorMsg}</span>
        )}
      </div>

      <div className="space-y-4 pt-1">
        <button
          type="submit"
          disabled={isLoading || otp.join('').length < 6}
          className="w-full h-12 rounded-full bg-[#f7bb0e] text-neutral-950 hover:bg-[#eab00d] active:scale-98 disabled:bg-[#fef2c0] disabled:text-[#8a6800] disabled:border-[#fae182] disabled:cursor-not-allowed font-extrabold text-[12px] sm:text-[13px] uppercase tracking-wider border-[1.5px] border-[#f7bb0e] shadow-[0_1.5px_0_0_#d99b00,0_2px_4px_rgba(0,0,0,0.06)] transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          {isLoading ? (
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-amber-900/30 border-t-neutral-950 rounded-full animate-spin" />
              <span>Verifying…</span>
            </div>
          ) : (
            <>
              <span>Verify & Login</span>
              <ArrowRight className="w-4 h-4" strokeWidth={2.2} />
            </>
          )}
        </button>

        <div className="text-center">
          {timer > 0 ? (
            <span className="text-[10px] text-amber-900/60 uppercase tracking-widest font-extrabold block">
              Resend code in {timer}s
            </span>
          ) : (
            <button
              type="button"
              onClick={sendOTP}
              className="text-neutral-950 hover:text-[#b38505] text-[10.5px] uppercase tracking-widest font-extrabold underline hover:no-underline cursor-pointer"
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
      className="text-center py-10 relative flex flex-col items-center justify-center min-h-[250px] overflow-hidden"
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
          className="mb-5 relative flex items-center justify-center w-16 h-16 rounded-full bg-emerald-50 border border-emerald-200"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', damping: 12, delay: 0.4 }}
            className="flex items-center justify-center w-11 h-11 rounded-full bg-black text-[#f7bb0e] shadow-sm"
          >
            <Check className="w-6 h-6" strokeWidth={3} />
          </motion.div>
        </motion.div>

        <div className="space-y-2">
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
            className="font-serif-heading text-[26px] leading-tight text-neutral-950 font-extrabold tracking-tight"
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
          className="h-1 bg-[#f7bb0e] rounded-full mt-6"
        />
      </motion.div>
    </motion.div>
  );
}

export function LinkRequiredScreen({ setStep }) {
  return (
    <div className="space-y-5 text-center">
      <div className="flex justify-center mb-1">
        <div className="w-12 h-12 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center">
          <AlertCircle className="text-amber-600" size={22} />
        </div>
      </div>

      <h3
        className="font-serif-heading text-[20px] font-bold text-neutral-950"
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
          className="w-full h-12 rounded-full bg-[#f7bb0e] text-neutral-950 hover:bg-[#eab00d] font-extrabold text-[12px] uppercase tracking-wider border-[1.5px] border-[#f7bb0e] shadow-[0_1.5px_0_0_#d99b00,0_2px_4px_rgba(0,0,0,0.06)] active:scale-98 transition-all cursor-pointer"
        >
          Sign in with Email or Phone
        </button>
      </div>
    </div>
  );
}

export function NamePromptForm({ name, setName, onSubmit, onSkip, isLoading }) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <label
          htmlFor="auth-name-input"
          className="text-[10.5px] font-extrabold text-amber-950/70 uppercase tracking-wider block"
        >
          Your Name
        </label>
        <input
          id="auth-name-input"
          type="text"
          autoFocus
          className="w-full h-12 rounded-full border-[1.5px] border-amber-900/15 focus:border-[#f7bb0e] focus:ring-2 focus:ring-[#f7bb0e]/20 bg-white text-neutral-900 placeholder:text-amber-950/30 text-[14px] font-medium px-5 shadow-xs outline-none transition-all"
          placeholder="e.g. Priya Sharma"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <p className="text-[11.5px] text-amber-950/60 font-normal pl-1">
          Help us personalize your experience and order delivery.
        </p>
      </div>

      <div className="space-y-3 pt-1">
        <button
          type="submit"
          disabled={isLoading || !name || !name.trim()}
          className="w-full h-12 rounded-full bg-[#f7bb0e] text-neutral-950 hover:bg-[#eab00d] active:scale-98 disabled:bg-[#fef2c0] disabled:text-[#8a6800] disabled:border-[#fae182] disabled:cursor-not-allowed font-extrabold text-[12px] sm:text-[13px] uppercase tracking-wider border-[1.5px] border-[#f7bb0e] shadow-[0_1.5px_0_0_#d99b00,0_2px_4px_rgba(0,0,0,0.06)] transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          {isLoading ? (
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-amber-900/30 border-t-neutral-950 rounded-full animate-spin" />
              <span>Saving…</span>
            </div>
          ) : (
            <>
              <span>Continue</span>
              <ArrowRight className="w-4 h-4" strokeWidth={2.2} />
            </>
          )}
        </button>
        <button
          type="button"
          onClick={onSkip}
          className="w-full text-center text-[10.5px] text-amber-950/60 hover:text-black uppercase tracking-wider font-extrabold py-2 transition-colors cursor-pointer"
        >
          Skip for now
        </button>
      </div>
    </form>
  );
}
