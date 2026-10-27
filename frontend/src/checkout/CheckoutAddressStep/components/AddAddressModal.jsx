import { useState, useEffect, useRef } from 'react';
import AlertTriangle from 'lucide-react/dist/esm/icons/alert-triangle';
import ArrowRight from 'lucide-react/dist/esm/icons/arrow-right';
import ArrowLeft from 'lucide-react/dist/esm/icons/arrow-left';
import Check from 'lucide-react/dist/esm/icons/check';
import X from 'lucide-react/dist/esm/icons/x';
import MapPin from 'lucide-react/dist/esm/icons/map-pin';
import User from 'lucide-react/dist/esm/icons/user';
import Mail from 'lucide-react/dist/esm/icons/mail';
import Phone from 'lucide-react/dist/esm/icons/phone';
import { m as motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { createPortal } from 'react-dom';
import { useMobileDrawerEngine } from '../../../components/ui/drawer';
import { sanitizePhoneNumber, isValidPhoneNumber } from '../../../utils/phoneUtils';
import { detectAndResolveAddress } from '../../../utils/locationService';
import { AuthCornerLeaves } from '../../../components/auth/AuthCornerLeaves';

export function AddAddressModal({
  isAddingNewAddress,
  setIsAddingNewAddress,
  newAddress,
  setNewAddress,
  addressError,
  isProcessing,
  handleSaveNewAddress,
  PINCODE_MAP,
  mapPosition,
  setMapPosition,
  fetchAddressFromCoords,
  handleAutofillLocation,
  isResolvingLocation,
}) {
  const [mounted, setMounted] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [stepError, setStepError] = useState(null);
  const [isInternalLocating, setIsInternalLocating] = useState(false);
  const lastStepTransitionTimeRef = useRef(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Reset to Step 1 whenever the modal opens
  useEffect(() => {
    if (isAddingNewAddress) {
      setCurrentStep(1);
      setStepError(null);
    }
  }, [isAddingNewAddress]);

  const { isMobile, dragProps, sheetTransition } = useMobileDrawerEngine({
    isOpen: isAddingNewAddress,
    onClose: () => setIsAddingNewAddress(false),
  });

  const formContainerRef = useRef(null);

  // Smoothly scroll focused input into clear visible area when mobile keyboard opens
  const handleFocusCapture = (e) => {
    const target = e.target;
    if (!target) return;
    const tag = target.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
      setTimeout(() => {
        if (!target || !formContainerRef.current) return;
        const targetRect = target.getBoundingClientRect();
        const containerRect = formContainerRef.current.getBoundingClientRect();

        const isObscured =
          targetRect.bottom > containerRect.bottom - 20 ||
          targetRect.top < containerRect.top + 20 ||
          (window.visualViewport && targetRect.bottom > window.visualViewport.height - 50);

        if (isObscured) {
          target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 300);
    }
  };

  const handleLocationClick = async (e) => {
    e.preventDefault();
    if (typeof handleAutofillLocation === 'function') {
      await handleAutofillLocation();
      return;
    }

    try {
      setIsInternalLocating(true);
      toast.loading('Acquiring pinpoint GPS location...', { id: 'gps' });
      const res = await detectAndResolveAddress();
      if (res.success && res.data) {
        const d = res.data;
        if (d.latitude && d.longitude && typeof setMapPosition === 'function') {
          setMapPosition({ lat: d.latitude, lng: d.longitude });
        }
        const resolvedAddressLine = d.address || [d.locality, d.city].filter(Boolean).join(', ');
        setNewAddress((prev) => ({
          ...prev,
          latitude: d.latitude ?? prev.latitude,
          longitude: d.longitude ?? prev.longitude,
          pincode: d.pincode || prev.pincode,
          city: d.city || prev.city,
          state: d.state || prev.state,
          locality: d.locality || prev.locality,
          address: res.isPinpoint
            ? resolvedAddressLine || prev.address
            : prev.address || resolvedAddressLine,
          landmark: prev.landmark || '',
        }));

        if (res.isPinpoint && res.source === 'gps') {
          const accText = res.accuracy ? ` (~${Math.round(res.accuracy)}m)` : '';
          toast.success(`Exact pinpoint GPS locked${accText}!`, { id: 'gps' });
        } else if (res.isApproximate) {
          toast.success('Location detected! Please review and confirm your address.', {
            id: 'gps',
            duration: 4000,
          });
        } else {
          toast.success('Location auto-filled!', { id: 'gps' });
        }
      } else {
        toast.error(res?.error || 'Could not detect location. Please fill manually.', {
          id: 'gps',
          duration: 5000,
        });
      }
    } catch {
      toast.error('Location detection failed. Please fill manually.', { id: 'gps' });
    } finally {
      setIsInternalLocating(false);
    }
  };

  const isLocating = isResolvingLocation || isInternalLocating;

  const validateStep1 = () => {
    const pincode = (newAddress.pincode || '').trim();
    const locality = (newAddress.locality || '').trim();
    const address = (newAddress.address || '').trim();
    const landmark = (newAddress.landmark || '').trim();
    const city = (newAddress.city || '').trim();
    const state = (newAddress.state || '').trim();

    if (!pincode || !locality || !address || !landmark || !city || !state) {
      return 'Please fill in all address fields (Pincode, Locality, Address, Landmark / Flat No., City, State).';
    }
    if (!/^\d{6}$/.test(pincode)) {
      return 'Please enter a valid 6-digit postal pincode.';
    }
    return null;
  };

  const handleProceedToStep2 = (e) => {
    if (e) {
      e.preventDefault?.();
      e.stopPropagation?.();
    }
    const err = validateStep1();
    if (err) {
      setStepError(err);
      toast.error(err, { id: 'address-step-err' });
      return false;
    }
    lastStepTransitionTimeRef.current = Date.now();
    setStepError(null);
    setCurrentStep(2);
    if (formContainerRef.current) {
      formContainerRef.current.scrollTo({ top: 0, behavior: 'instant' });
    }
    return true;
  };

  const handleFormSubmit = (e) => {
    if (e) {
      e.preventDefault?.();
      e.stopPropagation?.();
    }
    if (currentStep === 1) {
      handleProceedToStep2(e);
      return;
    }

    // Ignore submit events within 600ms of entering Step 2 to completely block click bleeding/ghost taps
    if (Date.now() - lastStepTransitionTimeRef.current < 600) {
      return;
    }

    const name = (newAddress.name || '').trim();
    const phone = sanitizePhoneNumber(newAddress.phone || '');

    if (!name) {
      setStepError('Please enter the receiver full name.');
      toast.error('Please enter the receiver full name.', { id: 'address-step-err' });
      return;
    }
    if (!phone || !isValidPhoneNumber(phone)) {
      setStepError('Please enter a valid 10-digit mobile number.');
      toast.error('Please enter a valid 10-digit mobile number.', { id: 'address-step-err' });
      return;
    }

    setStepError(null);
    handleSaveNewAddress(e);
  };

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

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {isAddingNewAddress && (
        <div className="fixed inset-0 z-[9999] pointer-events-none flex items-end sm:items-center justify-center p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] sm:p-6 md:p-8">
          {/* Dark blurred background overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsAddingNewAddress(false)}
            className="fixed -inset-x-0 -top-40 -bottom-40 bg-black/60 sm:bg-black/40 backdrop-blur-xs pointer-events-auto cursor-pointer"
          />

          {/* Bottom Sheet on Mobile / Centered Card on Desktop */}
          <motion.div
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            {...(isMobile ? dragProps : {})}
            className="relative z-10 pointer-events-auto flex flex-col w-full max-w-full sm:max-w-[510px] md:max-w-[535px] mx-auto"
          >
            <div className="relative w-full bg-white/95 backdrop-blur-2xl rounded-2xl sm:rounded-3xl pt-2 px-5 pb-4 sm:pt-4 sm:px-6 sm:pb-6 shadow-[0_16px_50px_rgba(0,0,0,0.22)] border border-black/[0.08] flex flex-col h-[78dvh] sm:h-auto max-h-[78dvh] sm:max-h-[88dvh] overflow-hidden font-body">
              {/* Gentle wind-blown corner foliage accents */}
              <AuthCornerLeaves />

              {/* Grab handle for mobile bottom sheet */}
              <div
                className="sm:hidden w-full flex justify-center pt-1 pb-2 cursor-grab select-none z-20 relative"
                onClick={() => setIsAddingNewAddress(false)}
              >
                <div className="w-9 h-1 rounded-full bg-neutral-300" />
              </div>

              {/* Close button */}
              <button
                type="button"
                onClick={() => setIsAddingNewAddress(false)}
                className="absolute top-3.5 right-3.5 w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 active:scale-95 flex items-center justify-center text-neutral-700 hover:text-black transition-all z-50 cursor-pointer"
                aria-label="Close modal"
              >
                <X className="w-3.5 h-3.5 text-black" strokeWidth={2} />
              </button>

              {/* Modal Headings in AuthModal serif style */}
              <div className="relative z-10 text-left mb-3 space-y-0.5 pt-1">
                <h2
                  className="font-serif-heading text-[20px] sm:text-[22px] leading-tight text-neutral-950 font-bold tracking-tight"
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  {newAddress?.id ? 'Edit Address' : 'Add New Address'}
                </h2>
                <p className="text-neutral-500 text-[12px] sm:text-[12.5px] font-normal leading-relaxed">
                  {currentStep === 1
                    ? 'Step 1 of 2: Set your delivery address and location'
                    : 'Step 2 of 2: Provide recipient contact information'}
                </p>
              </div>

              {/* Scrollable Form Body */}
              <div
                ref={formContainerRef}
                onFocusCapture={handleFocusCapture}
                className="relative z-10 flex-1 min-h-0 overflow-y-auto overscroll-contain touch-pan-y no-scrollbar pr-0.5 space-y-3 pb-1"
              >
                <form id="address-form" onSubmit={handleFormSubmit}>
                  {currentStep === 1 && (
                    <div className="space-y-3">
                      {/* Olive Green Signature Button to Auto-Fill Address */}
                      <button
                        type="button"
                        disabled={isLocating}
                        onClick={handleLocationClick}
                        className="w-full h-11 px-5 rounded-full bg-[#283618] hover:bg-[#1f2b13] text-white font-extrabold text-[12px] uppercase tracking-wider transition-all shadow-sm active:scale-[0.98] border border-[#283618] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 mb-2.5 select-none"
                      >
                        <span
                          className={`material-symbols-outlined text-[17px] text-[#f7bb0e] shrink-0 ${
                            isLocating ? 'animate-spin' : ''
                          }`}
                        >
                          {isLocating ? 'progress_activity' : 'near_me'}
                        </span>
                        <span>
                          {isLocating
                            ? 'Detecting your location...'
                            : 'Auto-Fill Current Location (GPS)'}
                        </span>
                      </button>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-neutral-600" />
                            6-Digit Pincode*
                          </label>
                          <input
                            type="tel"
                            required
                            inputMode="numeric"
                            maxLength={6}
                            placeholder="Enter 6-digit pincode"
                            value={newAddress.pincode}
                            onChange={(e) => {
                              const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                              setNewAddress((prev) => ({ ...prev, pincode: val }));
                              if (val.length === 6) {
                                toast.loading('Looking up pincode...', { id: 'pincode' });
                                fetch(`https://api.postalpincode.in/pincode/${val}`)
                                  .then((res) => res.json())
                                  .then((data) => {
                                    if (data && data[0] && data[0].Status === 'Success') {
                                      const postOffice = data[0].PostOffice[0];
                                      setNewAddress((prev) => ({
                                        ...prev,
                                        city:
                                          prev.city ||
                                          postOffice.District ||
                                          postOffice.Block ||
                                          postOffice.Region,
                                        state: prev.state || postOffice.State,
                                      }));
                                      toast.success('City & state auto-filled!', { id: 'pincode' });
                                    } else {
                                      toast.dismiss('pincode');
                                    }
                                  })
                                  .catch(() => {
                                    toast.dismiss('pincode');
                                  });
                              }
                            }}
                            className="w-full h-11 rounded-full border border-neutral-200 focus:border-[#283618] focus:ring-2 focus:ring-[#283618]/15 bg-white text-neutral-900 placeholder:text-neutral-400 text-[13px] font-medium px-4 shadow-2xs outline-none transition-all"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">
                            Locality / Sector*
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="Locality, area, or sector"
                            value={newAddress.locality}
                            onChange={(e) =>
                              setNewAddress((prev) => ({ ...prev, locality: e.target.value }))
                            }
                            className="w-full h-11 rounded-full border border-neutral-200 focus:border-[#283618] focus:ring-2 focus:ring-[#283618]/15 bg-white text-neutral-900 placeholder:text-neutral-400 text-[13px] font-medium px-4 shadow-2xs outline-none transition-all"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">
                          Street Address & Building Details*
                        </label>
                        <textarea
                          required
                          placeholder="Building name, street, road, or area details"
                          value={newAddress.address}
                          onChange={(e) =>
                            setNewAddress((prev) => ({ ...prev, address: e.target.value }))
                          }
                          className="w-full rounded-lg border border-neutral-200 focus:border-[#283618] focus:ring-2 focus:ring-[#283618]/15 bg-white text-neutral-900 placeholder:text-neutral-400 text-[13px] font-medium p-3.5 shadow-2xs outline-none transition-all min-h-[70px] resize-none"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">
                          Landmark / Flat No.*
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="Flat / house no., floor, or nearby landmark"
                          value={newAddress.landmark}
                          onChange={(e) =>
                            setNewAddress((prev) => ({ ...prev, landmark: e.target.value }))
                          }
                          className="w-full h-11 rounded-full border border-neutral-200 focus:border-[#283618] focus:ring-2 focus:ring-[#283618]/15 bg-white text-neutral-900 placeholder:text-neutral-400 text-[13px] font-medium px-4 shadow-2xs outline-none transition-all"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">
                            City / District*
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="City or district"
                            value={newAddress.city}
                            onChange={(e) =>
                              setNewAddress((prev) => ({ ...prev, city: e.target.value }))
                            }
                            className="w-full h-11 rounded-full border border-neutral-200 focus:border-[#283618] focus:ring-2 focus:ring-[#283618]/15 bg-white text-neutral-900 placeholder:text-neutral-400 text-[13px] font-medium px-4 shadow-2xs outline-none transition-all"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">
                            State*
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="State"
                            value={newAddress.state}
                            onChange={(e) =>
                              setNewAddress((prev) => ({ ...prev, state: e.target.value }))
                            }
                            className="w-full h-11 rounded-full border border-neutral-200 focus:border-[#283618] focus:ring-2 focus:ring-[#283618]/15 bg-white text-neutral-900 placeholder:text-neutral-400 text-[13px] font-medium px-4 shadow-2xs outline-none transition-all uppercase"
                          />
                        </div>
                      </div>

                      {/* Destination Type Pills */}
                      <div className="space-y-1.5 pt-0.5">
                        <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider block">
                          Address Type
                        </label>
                        <div className="grid grid-cols-3 gap-2 w-full">
                          {['Home', 'Work', 'Other'].map((type) => {
                            const isSelected =
                              (newAddress.tag || 'Home') ===
                              (type === 'Other' ? 'Warehouse' : type);
                            return (
                              <button
                                key={type}
                                type="button"
                                onClick={() =>
                                  setNewAddress((prev) => ({
                                    ...prev,
                                    tag: type === 'Other' ? 'Warehouse' : type,
                                  }))
                                }
                                className={`flex items-center justify-center gap-1.5 h-10 rounded-full text-[12px] font-bold tracking-wide transition-all cursor-pointer select-none border ${
                                  isSelected
                                    ? 'bg-[#283618] text-white border-[#283618] shadow-xs ring-2 ring-[#283618]/15'
                                    : 'bg-neutral-50 hover:bg-neutral-100 text-neutral-700 border-neutral-200/80'
                                }`}
                              >
                                <span className="material-symbols-outlined text-[16px] shrink-0">
                                  {type === 'Home'
                                    ? 'home'
                                    : type === 'Work'
                                      ? 'apartment'
                                      : 'pin_drop'}
                                </span>
                                <span>{type}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}

                  {currentStep === 2 && (
                    <div className="space-y-3">
                      {/* Contact Details Fields */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider flex items-center gap-1">
                            <User className="w-3 h-3 text-neutral-600" />
                            Receiver Full Name*
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="Full name"
                            value={newAddress.name}
                            onChange={(e) =>
                              setNewAddress((prev) => ({ ...prev, name: e.target.value }))
                            }
                            className="w-full h-11 rounded-full border border-neutral-200 focus:border-[#283618] focus:ring-2 focus:ring-[#283618]/15 bg-white text-neutral-900 placeholder:text-neutral-400 text-[13px] font-medium px-4 shadow-2xs outline-none transition-all"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider flex items-center gap-1">
                            <Mail className="w-3 h-3 text-neutral-600" />
                            Email Address*
                          </label>
                          <input
                            type="email"
                            placeholder="Email address"
                            value={newAddress.email}
                            onChange={(e) =>
                              setNewAddress((prev) => ({ ...prev, email: e.target.value }))
                            }
                            className="w-full h-11 rounded-full border border-neutral-200 focus:border-[#283618] focus:ring-2 focus:ring-[#283618]/15 bg-white text-neutral-900 placeholder:text-neutral-400 text-[13px] font-medium px-4 shadow-2xs outline-none transition-all"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider flex items-center gap-1">
                            <Phone className="w-3 h-3 text-neutral-600" />
                            Phone Number*
                          </label>
                          <div className="relative flex items-center">
                            <div className="absolute left-3.5 flex items-center gap-1 pointer-events-none select-none text-[12px] font-bold text-neutral-800">
                              <span>🇮🇳</span>
                              <span>+91</span>
                              <span className="text-black/15 ml-0.5">|</span>
                            </div>
                            <input
                              type="tel"
                              required
                              inputMode="numeric"
                              maxLength={10}
                              placeholder="10-digit mobile number"
                              value={newAddress.phone}
                              onChange={(e) => {
                                const cleaned = sanitizePhoneNumber(e.target.value);
                                setNewAddress((prev) => ({ ...prev, phone: cleaned }));
                              }}
                              onPaste={(e) => {
                                const pasted = e.clipboardData?.getData('text');
                                if (pasted) {
                                  e.preventDefault();
                                  const cleaned = sanitizePhoneNumber(pasted);
                                  setNewAddress((prev) => ({ ...prev, phone: cleaned }));
                                }
                              }}
                              className="w-full h-11 rounded-full border border-neutral-200 focus:border-[#283618] focus:ring-2 focus:ring-[#283618]/15 bg-white text-neutral-900 placeholder:text-neutral-400 text-[13px] font-medium !pl-18 !pr-4 shadow-2xs outline-none transition-all tracking-wide"
                            />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider flex items-center gap-1">
                            <Phone className="w-3 h-3 text-neutral-600" />
                            Alternate Number*
                          </label>
                          <input
                            type="tel"
                            inputMode="numeric"
                            maxLength={10}
                            placeholder="Alternate mobile number"
                            value={newAddress.alternatePhone}
                            onChange={(e) => {
                              const cleaned = sanitizePhoneNumber(e.target.value);
                              setNewAddress((prev) => ({ ...prev, alternatePhone: cleaned }));
                            }}
                            onPaste={(e) => {
                              const pasted = e.clipboardData?.getData('text');
                              if (pasted) {
                                e.preventDefault();
                                const cleaned = sanitizePhoneNumber(pasted);
                                setNewAddress((prev) => ({ ...prev, alternatePhone: cleaned }));
                              }
                            }}
                            className="w-full h-11 rounded-full border border-neutral-200 focus:border-[#283618] focus:ring-2 focus:ring-[#283618]/15 bg-white text-neutral-900 placeholder:text-neutral-400 text-[13px] font-medium px-4 shadow-2xs outline-none transition-all"
                          />
                        </div>
                      </div>

                      {/* Delivery Instructions & Default Option */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">
                          Delivery Instructions (Optional)
                        </label>
                        <textarea
                          placeholder="Delivery instructions (e.g. Leave with security, call before delivery)"
                          value={newAddress.deliveryInstructions}
                          onChange={(e) =>
                            setNewAddress((prev) => ({
                              ...prev,
                              deliveryInstructions: e.target.value,
                            }))
                          }
                          className="w-full rounded-xl border border-neutral-200 focus:border-[#283618] focus:ring-2 focus:ring-[#283618]/15 bg-white text-neutral-900 placeholder:text-neutral-400 text-[13px] font-medium p-3.5 shadow-2xs outline-none transition-all min-h-[64px] resize-none"
                        />
                      </div>

                      <label className="flex items-center gap-2.5 cursor-pointer select-none pt-0.5">
                        <input
                          type="checkbox"
                          checked={newAddress.isDefault || false}
                          onChange={(e) =>
                            setNewAddress((prev) => ({ ...prev, isDefault: e.target.checked }))
                          }
                          className="w-4 h-4 rounded border-black/20 text-[#283618] focus:ring-[#283618] cursor-pointer"
                        />
                        <span className="text-[12px] text-neutral-700 font-medium">
                          Make this as my default address
                        </span>
                      </label>
                    </div>
                  )}
                </form>
              </div>

              {/* Modal Footer: Styled cleanly like AuthModal */}
              <div
                className="relative z-10 pt-3 border-t border-black/[0.08] shrink-0 mt-2"
                style={{
                  paddingBottom: isMobile
                    ? 'calc(0.5rem + env(safe-area-inset-bottom, 0px))'
                    : undefined,
                }}
              >
                {(stepError || addressError) && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-start gap-2.5 p-2.5 bg-red-50 text-red-600 rounded-2xl text-[11px] mb-2.5 shadow-2xs border border-red-100"
                  >
                    <AlertTriangle
                      className="w-4 h-4 shrink-0 text-red-600 mt-0.5"
                      aria-hidden="true"
                    />
                    <span className="font-bold flex-1 leading-snug">
                      {stepError || addressError}
                    </span>
                  </motion.div>
                )}

                {currentStep === 1 ? (
                  <div key="step-1-actions" className="w-full flex items-center gap-2.5 sm:gap-3">
                    <button
                      key="btn-cancel"
                      type="button"
                      onClick={() => setIsAddingNewAddress(false)}
                      className="h-11 px-5 rounded-full border border-black/12 hover:bg-neutral-50 text-neutral-800 font-bold uppercase text-[11px] tracking-wider transition-all cursor-pointer active:scale-[0.98]"
                    >
                      Cancel
                    </button>
                    <button
                      key="btn-next-step"
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleProceedToStep2(e);
                      }}
                      className="flex-1 h-11 pl-5 pr-1.5 py-1 rounded-full bg-[#283618] hover:bg-[#1f2b13] text-white font-extrabold text-[12px] uppercase tracking-wider transition-all shadow-sm active:scale-[0.98] border border-[#283618] flex items-center justify-between group cursor-pointer select-none"
                    >
                      <span className="truncate">Next: Contact Details</span>
                      <span className="w-8 h-8 rounded-full bg-white text-[#283618] flex items-center justify-center shrink-0 shadow-xs transition-transform duration-200 group-hover:scale-105 ml-2">
                        <ArrowRight
                          className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5"
                          strokeWidth={2.5}
                          aria-hidden="true"
                        />
                      </span>
                    </button>
                  </div>
                ) : (
                  <div key="step-2-actions" className="w-full flex items-center gap-2.5 sm:gap-3">
                    <button
                      key="btn-back-step"
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setStepError(null);
                        setCurrentStep(1);
                      }}
                      className="h-11 px-4 sm:px-5 rounded-full border border-black/12 hover:bg-neutral-50 text-neutral-800 font-bold uppercase text-[11px] tracking-wider transition-all cursor-pointer active:scale-[0.98] flex items-center gap-1.5"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" strokeWidth={2.5} />
                      <span>Back</span>
                    </button>
                    <button
                      key="btn-save-address"
                      type="button"
                      disabled={isProcessing}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleFormSubmit(e);
                      }}
                      className="flex-1 h-11 pl-5 pr-1.5 py-1 rounded-full bg-[#283618] hover:bg-[#1f2b13] text-white font-extrabold text-[12px] uppercase tracking-wider transition-all shadow-sm active:scale-[0.98] border border-[#283618] flex items-center justify-between group cursor-pointer disabled:opacity-60 select-none"
                    >
                      <span className="truncate">
                        {isProcessing ? 'Saving Address...' : 'Save Address'}
                      </span>
                      <span className="w-8 h-8 rounded-full bg-white text-[#283618] flex items-center justify-center shrink-0 shadow-xs transition-transform duration-200 group-hover:scale-105 ml-2">
                        {isProcessing ? (
                          <span className="material-symbols-outlined text-[16px] animate-spin text-[#283618]">
                            progress_activity
                          </span>
                        ) : (
                          <Check
                            className="w-4 h-4 transition-transform duration-200 group-hover:scale-110"
                            strokeWidth={2.5}
                            aria-hidden="true"
                          />
                        )}
                      </span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
