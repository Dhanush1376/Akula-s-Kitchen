import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, User, X, Mail, Phone } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useConfig } from '../../context/ConfigContext';
import { useNavigate } from 'react-router-dom';
import { BRAND, cleanPhoneDigits } from '../../config/brand';

export function StoreClosedOverlay({ isOpen, onClose }) {
  const { openAuthModal, isAuthenticated } = useAuth();
  const { storeSettings, storeName, supportEmail, supportPhone, alternatePhone, whatsappNumber } =
    useConfig();
  const navigate = useNavigate();

  const contactPhone =
    storeSettings?.general?.phone || storeSettings?.contact?.phone || supportPhone || BRAND.phone;
  const contactAltPhone =
    storeSettings?.general?.alternatePhone ||
    storeSettings?.contact?.alternatePhone ||
    alternatePhone ||
    BRAND.alternatePhone;
  const activeWhatsappNumber =
    storeSettings?.general?.whatsappNumber ||
    storeSettings?.contact?.whatsappNumber ||
    whatsappNumber ||
    BRAND.whatsappNumber;
  const activeSupportEmail =
    storeSettings?.general?.supportEmail ||
    storeSettings?.contact?.email ||
    supportEmail ||
    BRAND.email;

  const cleanCallPhone = cleanPhoneDigits(contactPhone);
  const cleanAltCallPhone = cleanPhoneDigits(contactAltPhone);

  const handleExplore = () => {
    onClose();
    navigate('/collections');
  };

  const handleSignIn = () => {
    onClose();
    openAuthModal();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="store-closed-page"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="fixed inset-0 z-[9990] bg-black/75 backdrop-blur-2xl flex flex-col justify-between items-center p-6 sm:p-10 md:p-12 overflow-y-auto"
        >
          {/* Top Bar with Exit Button */}
          <div className="w-full max-w-4xl flex items-center justify-end shrink-0">
            <button
              onClick={onClose}
              aria-label="Close notice"
              className="w-10 h-10 min-h-0 min-w-0 p-0 aspect-square shrink-0 rounded-full text-white/70 hover:text-white hover:bg-white/10 flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" strokeWidth={1.8} />
            </button>
          </div>

          {/* Main Hero Content */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 15 }}
            transition={{ duration: 0.45, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
            className="max-w-xl w-full mx-auto my-auto flex flex-col items-center text-center py-6 sm:py-8"
          >
            {/* Display title in crisp white */}
            <h1 className="font-display text-3xl sm:text-4xl md:text-5xl text-white font-normal leading-[1.15] tracking-tight mb-6">
              {storeName} is Temporarily Closed
            </h1>

            {/* Actions */}
            <div className="w-full max-w-sm flex flex-col items-center gap-3.5 mb-2">
              <button
                onClick={handleExplore}
                className="group relative w-full sm:w-auto sm:min-w-[260px] py-3.5 px-6 sm:px-8 rounded-full bg-white hover:bg-white/95 text-[#111] text-xs sm:text-sm font-semibold tracking-[0.16em] uppercase shadow-[0_4px_24px_rgba(0,0,0,0.35)] hover:shadow-[0_6px_28px_rgba(255,255,255,0.18)] active:scale-[0.98] transition-all duration-300 flex items-center justify-center gap-2.5 cursor-pointer border border-white"
              >
                <span>View Our Collection</span>
                <ArrowRight
                  className="w-4 h-4 text-[#111] transition-transform duration-300 group-hover:translate-x-1"
                  strokeWidth={2.2}
                />
              </button>

              {!isAuthenticated && (
                <button
                  onClick={handleSignIn}
                  className="w-full sm:w-auto sm:min-w-[260px] py-3 px-6 rounded-full border border-white/30 hover:border-white/70 bg-white/10 hover:bg-white/15 text-white/90 hover:text-white text-xs sm:text-sm font-medium tracking-wide backdrop-blur-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <User className="w-4 h-4 text-white/80" />
                  <span>Sign In to Your Account</span>
                </button>
              )}
            </div>
          </motion.div>

          {/* Left-Aligned 1-by-1 Contact Inquiries List */}
          <div className="w-full max-w-md mx-auto pt-6 border-t border-white/15 shrink-0 text-left">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/60 mb-3 text-left">
              Need Assistance or Inquiries?
            </p>
            <div className="flex flex-col gap-2.5 w-full">
              <a
                href={`tel:${cleanCallPhone}`}
                className="group flex items-center justify-between w-full px-4 py-3 rounded-xl bg-white/5 hover:bg-white/12 border border-white/10 hover:border-white/25 text-white transition-all backdrop-blur-md active:scale-[0.99]"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center shrink-0 group-hover:bg-white group-hover:text-black transition-colors">
                    <Phone className="w-4 h-4" />
                  </div>
                  <div className="text-left min-w-0">
                    <p className="text-[10px] uppercase font-bold tracking-wider text-white/60">
                      Call Us
                    </p>
                    <p className="text-xs sm:text-sm font-medium text-white truncate">
                      {contactPhone}
                    </p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-white/40 group-hover:text-white group-hover:translate-x-1 transition-all shrink-0 ml-2" />
              </a>

              {cleanAltCallPhone && cleanAltCallPhone !== cleanCallPhone && (
                <a
                  href={`tel:${cleanAltCallPhone}`}
                  className="group flex items-center justify-between w-full px-4 py-3 rounded-xl bg-white/5 hover:bg-white/12 border border-white/10 hover:border-white/25 text-white transition-all backdrop-blur-md active:scale-[0.99]"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center shrink-0 group-hover:bg-white group-hover:text-black transition-colors">
                      <Phone className="w-4 h-4" />
                    </div>
                    <div className="text-left min-w-0">
                      <p className="text-[10px] uppercase font-bold tracking-wider text-white/60">
                        Alternate Phone
                      </p>
                      <p className="text-xs sm:text-sm font-medium text-white truncate">
                        {contactAltPhone}
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-white/40 group-hover:text-white group-hover:translate-x-1 transition-all shrink-0 ml-2" />
                </a>
              )}

              <a
                href={BRAND.getWhatsAppUrl(null, activeWhatsappNumber)}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center justify-between w-full px-4 py-3 rounded-xl bg-white/5 hover:bg-white/12 border border-white/10 hover:border-white/25 text-white transition-all backdrop-blur-md active:scale-[0.99]"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center shrink-0 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                    <svg
                      viewBox="0 0 24 24"
                      width="16"
                      height="16"
                      stroke="currentColor"
                      strokeWidth="2"
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                    </svg>
                  </div>
                  <div className="text-left min-w-0">
                    <p className="text-[10px] uppercase font-bold tracking-wider text-white/60">
                      WhatsApp
                    </p>
                    <p className="text-xs sm:text-sm font-medium text-white truncate">
                      {activeWhatsappNumber}
                    </p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-white/40 group-hover:text-white group-hover:translate-x-1 transition-all shrink-0 ml-2" />
              </a>

              <a
                href={`mailto:${activeSupportEmail}`}
                className="group flex items-center justify-between w-full px-4 py-3 rounded-xl bg-white/5 hover:bg-white/12 border border-white/10 hover:border-white/25 text-white transition-all backdrop-blur-md active:scale-[0.99]"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center shrink-0 group-hover:bg-white group-hover:text-black transition-colors">
                    <Mail className="w-4 h-4" />
                  </div>
                  <div className="text-left min-w-0">
                    <p className="text-[10px] uppercase font-bold tracking-wider text-white/60">
                      Email Support
                    </p>
                    <p className="text-xs sm:text-sm font-medium text-white truncate">
                      {activeSupportEmail}
                    </p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-white/40 group-hover:text-white group-hover:translate-x-1 transition-all shrink-0 ml-2" />
              </a>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
