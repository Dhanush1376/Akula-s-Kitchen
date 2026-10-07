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
        const resolvedAddressLine =
          d.address || [d.locality, d.landmark, d.city].filter(Boolean).join(', ');
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
          landmark: d.landmark || prev.landmark,
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
    const city = (newAddress.city || '').trim();
    const state = (newAddress.state || '').trim();

    if (!pincode || !locality || !address || !city || !state) {
      return 'Please fill in all mandatory address fields (Pincode, Locality, Address, City, State).';
    }
    if (!/^\d{6}$/.test(pincode)) {
      return 'Please enter a valid 6-digit postal pincode.';
    }
    return null;
  };

  const handleProceedToStep2 = () => {
    const err = validateStep1();
    if (err) {
      setStepError(err);
      toast.error(err, { id: 'address-step-err' });
      return false;
    }
    setStepError(null);
    setCurrentStep(2);
    if (formContainerRef.current) {
      formContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
    return true;
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (currentStep === 1) {
      handleProceedToStep2();
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
        <div className="fixed inset-0 z-[9999] pointer-events-none flex items-end sm:items-center justify-center p-3 sm:p-6 md:p-8">
          {/* Dark blurred background overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsAddingNewAddress(false)}
            className="fixed inset-0 bg-black/40 backdrop-blur-xs pointer-events-auto cursor-pointer"
          />

          {/* Floating Card Modal Container in AuthModal style */}
          <motion.div
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            {...(isMobile ? dragProps : {})}
            className="relative z-10 pointer-events-auto flex flex-col w-full max-w-[510px] md:max-w-[535px] mx-auto"
            style={{
              marginBottom: isMobile ? 'env(safe-area-inset-bottom, 0px)' : undefined,
            }}
          >
            <div className="relative w-full bg-white/95 backdrop-blur-2xl rounded-3xl pt-2 px-5 pb-5 sm:pt-4 sm:px-6 sm:pb-6 shadow-[0_12px_45px_rgba(0,0,0,0.18)] border border-black/[0.08] flex flex-col max-h-[88dvh] overflow-hidden font-body">
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

              {/* 2-Step Stepper Progress Bar */}
              <div className="relative z-10 flex items-center justify-between gap-2 mb-3.5">
                <button
                  type="button"
                  onClick={() => {
                    setStepError(null);
                    setCurrentStep(1);
                  }}
                  className={`flex items-center gap-2 py-1 px-3 sm:px-3.5 rounded-full text-[11px] font-bold tracking-wide transition-all cursor-pointer ${
                    currentStep === 1
                      ? 'bg-[#283618] text-white shadow-xs'
                      : 'bg-neutral-100 hover:bg-neutral-200/80 text-neutral-600'
                  }`}
                >
                  <span
                    className={`w-4.5 h-4.5 rounded-full flex items-center justify-center text-[10px] font-extrabold ${
                      currentStep === 1
                        ? 'bg-white text-[#283618]'
                        : 'bg-neutral-300 text-neutral-800'
                    }`}
                  >
                    1
                  </span>
                  <span>Address & Location</span>
                </button>

                <div className="flex-1 h-0.5 mx-1 bg-neutral-200 relative overflow-hidden rounded-full">
                  <div
                    className="h-full bg-[#283618] transition-all duration-300"
                    style={{ width: currentStep === 2 ? '100%' : '0%' }}
                  />
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (currentStep === 1) {
                      handleProceedToStep2();
                    }
                  }}
                  className={`flex items-center gap-2 py-1 px-3 sm:px-3.5 rounded-full text-[11px] font-bold tracking-wide transition-all cursor-pointer ${
                    currentStep === 2
                      ? 'bg-[#283618] text-white shadow-xs'
                      : 'bg-neutral-100 hover:bg-neutral-200/80 text-neutral-600'
                  }`}
                >
                  <span
                    className={`w-4.5 h-4.5 rounded-full flex items-center justify-center text-[10px] font-extrabold ${
                      currentStep === 2
                        ? 'bg-white text-[#283618]'
                        : 'bg-neutral-300 text-neutral-800'
                    }`}
                  >
                    2
                  </span>
                  <span>Contact Details</span>
                </button>
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

                      {newAddress.latitude && newAddress.longitude && (
                        <div className="flex items-center gap-1.5 text-[10.5px] text-[#283618] bg-[#283618]/10 border border-[#283618]/20 px-3 py-1 rounded-full font-bold uppercase tracking-wider inline-flex mb-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#283618] animate-pulse" />
                          <span>GPS Location Locked & Auto-Filled</span>
                        </div>
                      )}

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
                            className="w-full h-11 rounded-xl border border-neutral-200 focus:border-[#283618] focus:ring-2 focus:ring-[#283618]/15 bg-white text-neutral-900 placeholder:text-neutral-400 text-[13px] font-medium px-4 shadow-2xs outline-none transition-all"
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
                            className="w-full h-11 rounded-xl border border-neutral-200 focus:border-[#283618] focus:ring-2 focus:ring-[#283618]/15 bg-white text-neutral-900 placeholder:text-neutral-400 text-[13px] font-medium px-4 shadow-2xs outline-none transition-all"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">
                          Street Address & Building Details*
                        </label>
                        <textarea
                          required
                          placeholder="Flat / House no., building, apartment, or street"
                          value={newAddress.address}
                          onChange={(e) =>
                            setNewAddress((prev) => ({ ...prev, address: e.target.value }))
                          }
                          className="w-full rounded-xl border border-neutral-200 focus:border-[#283618] focus:ring-2 focus:ring-[#283618]/15 bg-white text-neutral-900 placeholder:text-neutral-400 text-[13px] font-medium p-3.5 shadow-2xs outline-none transition-all min-h-[70px] resize-none"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">
                          Landmark (Optional)
                        </label>
                        <input
                          type="text"
                          placeholder="Nearby landmark (optional)"
                          value={newAddress.landmark}
                          onChange={(e) =>
                            setNewAddress((prev) => ({ ...prev, landmark: e.target.value }))
                          }
                          className="w-full h-11 rounded-xl border border-neutral-200 focus:border-[#283618] focus:ring-2 focus:ring-[#283618]/15 bg-white text-neutral-900 placeholder:text-neutral-400 text-[13px] font-medium px-4 shadow-2xs outline-none transition-all"
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
                            className="w-full h-11 rounded-xl border border-neutral-200 focus:border-[#283618] focus:ring-2 focus:ring-[#283618]/15 bg-white text-neutral-900 placeholder:text-neutral-400 text-[13px] font-medium px-4 shadow-2xs outline-none transition-all"
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
                            className="w-full h-11 rounded-xl border border-neutral-200 focus:border-[#283618] focus:ring-2 focus:ring-[#283618]/15 bg-white text-neutral-900 placeholder:text-neutral-400 text-[13px] font-medium px-4 shadow-2xs outline-none transition-all uppercase"
                          />
                        </div>
                      </div>

                      {/* Destination Type Pills */}
                      <div className="space-y-1.5 pt-0.5">
                        <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider block">
                          Address Type
                        </label>
                        <div className="flex items-center gap-2">
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
                                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[11px] font-bold tracking-wider transition-all cursor-pointer ${
                                  isSelected
                                    ? 'bg-[#283618] text-white shadow-xs'
                                    : 'bg-neutral-100 hover:bg-neutral-200/80 text-neutral-700'
                                }`}
                              >
                                <span className="material-symbols-outlined text-[14px]">
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
                      {/* Summary of chosen address from Step 1 */}
                      <div className="bg-neutral-50/90 border border-black/[0.08] rounded-2xl p-3 flex items-start justify-between gap-3 shadow-2xs">
                        <div className="flex items-start gap-2.5 min-w-0">
                          <div className="w-7 h-7 rounded-full bg-[#283618]/15 text-[#283618] flex items-center justify-center shrink-0 mt-0.5">
                            <MapPin className="w-3.5 h-3.5 text-[#283618]" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[9.5px] font-extrabold uppercase tracking-wider text-neutral-500">
                                Delivering to ({newAddress.tag || 'Home'})
                              </span>
                            </div>
                            <p className="text-[12px] font-bold text-neutral-900 truncate mt-0.5">
                              {newAddress.address || 'Address specified'}
                            </p>
                            <p className="text-[10.5px] text-neutral-500 truncate">
                              {[
                                newAddress.locality,
                                newAddress.landmark,
                                newAddress.city,
                                newAddress.state,
                                newAddress.pincode,
                              ]
                                .filter(Boolean)
                                .join(', ')}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setStepError(null);
                            setCurrentStep(1);
                          }}
                          className="text-[11px] font-bold text-neutral-900 hover:underline shrink-0 flex items-center gap-1 cursor-pointer py-1 px-2.5 rounded-full bg-white hover:bg-neutral-100 border border-black/10 shadow-2xs"
                        >
                          <span>Edit</span>
                        </button>
                      </div>

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
                            className="w-full h-11 rounded-xl border border-neutral-200 focus:border-[#283618] focus:ring-2 focus:ring-[#283618]/15 bg-white text-neutral-900 placeholder:text-neutral-400 text-[13px] font-medium px-4 shadow-2xs outline-none transition-all"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider flex items-center gap-1">
                            <Mail className="w-3 h-3 text-neutral-600" />
                            Email Address (Optional)
                          </label>
                          <input
                            type="email"
                            placeholder="Email address (optional)"
                            value={newAddress.email}
                            onChange={(e) =>
                              setNewAddress((prev) => ({ ...prev, email: e.target.value }))
                            }
                            className="w-full h-11 rounded-xl border border-neutral-200 focus:border-[#283618] focus:ring-2 focus:ring-[#283618]/15 bg-white text-neutral-900 placeholder:text-neutral-400 text-[13px] font-medium px-4 shadow-2xs outline-none transition-all"
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
                              className="w-full h-11 rounded-xl border border-neutral-200 focus:border-[#283618] focus:ring-2 focus:ring-[#283618]/15 bg-white text-neutral-900 placeholder:text-neutral-400 text-[13px] font-medium !pl-18 !pr-4 shadow-2xs outline-none transition-all tracking-wide"
                            />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider flex items-center gap-1">
                            <Phone className="w-3 h-3 text-neutral-600" />
                            Alternate Number (Optional)
                          </label>
                          <input
                            type="tel"
                            inputMode="numeric"
                            maxLength={10}
                            placeholder="Alternate mobile number (optional)"
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
                            className="w-full h-11 rounded-xl border border-neutral-200 focus:border-[#283618] focus:ring-2 focus:ring-[#283618]/15 bg-white text-neutral-900 placeholder:text-neutral-400 text-[13px] font-medium px-4 shadow-2xs outline-none transition-all"
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
                  <div className="w-full flex items-center gap-2.5 sm:gap-3">
                    <button
                      type="button"
                      onClick={() => setIsAddingNewAddress(false)}
                      className="h-11 px-5 rounded-full border border-black/12 hover:bg-neutral-50 text-neutral-800 font-bold uppercase text-[11px] tracking-wider transition-all cursor-pointer active:scale-[0.98]"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleProceedToStep2}
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
                  <div className="w-full flex items-center gap-2.5 sm:gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setStepError(null);
                        setCurrentStep(1);
                      }}
                      className="h-11 px-4 sm:px-5 rounded-full border border-black/12 hover:bg-neutral-50 text-neutral-800 font-bold uppercase text-[11px] tracking-wider transition-all cursor-pointer active:scale-[0.98] flex items-center gap-1.5"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" strokeWidth={2.5} />
                      <span>Back</span>
                    </button>
                    <button
                      form="address-form"
                      type="submit"
                      disabled={isProcessing}
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
