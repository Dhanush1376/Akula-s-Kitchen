import { Clock, MapPin, ArrowRight, ChevronDown } from 'lucide-react';
import { Suspense, useState } from 'react';
import { lazyWithRetry as lazy } from '../utils/performance/lazyWithRetry';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { SEO } from '../components/seo/SEO';
import { CheckoutProvider, useCheckout } from '../checkout/CheckoutProvider';
import { useConfig } from '../context/ConfigContext';
import {
  CheckoutSidebarSkeleton,
  CheckoutStepSkeleton,
  AddressBarSkeleton,
} from '../components/ui/Skeleton';
import { CheckoutSteps } from '../components/ui/CheckoutSteps';
import toast from 'react-hot-toast';

const CheckoutAddressStep = lazy(() => import('../checkout/CheckoutAddressStep'));
const CheckoutPaymentStep = lazy(() => import('../checkout/CheckoutPaymentStep'));

function StepFallback({ mode = 'address' }) {
  return <CheckoutStepSkeleton mode={mode} />;
}

const CheckoutSidebar = lazy(() => import('../checkout/CheckoutSidebar'));

function CheckoutContent() {
  const { isStoreClosed, storeName } = useConfig();
  const {
    activeStep,
    setActiveStep,
    activeSelectedAddress,
    savedAddresses,
    setSelectedAddressId,
    navigate,
    checkoutSteps,
  } = useCheckout();

  const [isAddressDropdownOpen, setIsAddressDropdownOpen] = useState(false);

  if (isStoreClosed) {
    return (
      <div className="min-h-[75vh] bg-surface-container-low flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white border border-black/10 rounded-lg p-6 sm:p-8 text-center shadow-md">
          <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-700 flex items-center justify-center mx-auto mb-4">
            <Clock className="w-6 h-6" strokeWidth={1.75} />
          </div>
          <h2 className="font-display text-2xl text-on-surface mb-2 font-medium">
            Checkout Temporarily Paused
          </h2>
          <p className="font-body text-on-surface-variant text-sm mb-6 leading-relaxed">
            Our store is currently in catalog-browsing mode. New order submissions and checkout are
            temporarily paused. Your bag items remain saved for when ordering resumes.
          </p>
          <Link
            to="/collections"
            className="inline-flex items-center justify-center gap-2 w-full py-3.5 px-6 rounded-full bg-black hover:bg-stone-800 text-white text-xs font-bold uppercase tracking-wider transition-colors shadow-sm"
          >
            <span>Explore Collections</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white min-h-screen pb-24 font-body text-neutral-950 modern-sans-headings">
      <SEO
        title="Secure Checkout"
        description={`Finalize your ${storeName || "Akula's Kitchen"} order through our secure checkout portal.`}
        noindex
      />

      {/* Top Header Strip with Animated Progress Bar */}
      <CheckoutSteps
        steps={checkoutSteps}
        currentStep={activeStep}
        onStepClick={(stepIndex) => {
          if (stepIndex === 0) {
            navigate('/cart');
          } else if (stepIndex === activeStep) {
            return; // Already here
          } else if (stepIndex < activeStep) {
            setActiveStep(stepIndex);
          } else {
            // Cannot jump forward without passing validations, rely on continue buttons
            toast('Complete the current step to continue', {
              icon: <MapPin className="w-4 h-4 text-brand-primary" />,
            });
          }
        }}
      />

      {/* Address Bar - Attached perfectly below checkout steps */}
      {checkoutSteps[activeStep] === 'PAYMENT' &&
        (!activeSelectedAddress ? (
          <AddressBarSkeleton />
        ) : (
          <div
            className={`w-full bg-white border-b border-black/[0.06] relative hover:bg-neutral-50/80 transition-colors ${isAddressDropdownOpen ? 'z-50' : 'z-30'}`}
          >
            <div className="max-w-[1240px] mx-auto px-4 sm:px-6 relative">
              <div
                onClick={() => setIsAddressDropdownOpen(!isAddressDropdownOpen)}
                className="flex items-center justify-between md:justify-center py-2.5 cursor-pointer select-none"
              >
                <div className="flex items-center gap-2.5 min-w-0 max-w-2xl">
                  <span className="hidden sm:inline-flex items-center gap-1 bg-neutral-100 text-neutral-800 border border-neutral-200 text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md shrink-0">
                    <MapPin className="w-3 h-3 text-neutral-700" strokeWidth={2.2} />
                    Deliver to
                  </span>
                  <span className="text-[11px] sm:text-xs text-neutral-800 font-medium truncate leading-tight">
                    <strong className="font-bold text-neutral-950">
                      {activeSelectedAddress.name}
                    </strong>
                    <span className="text-neutral-300 mx-1.5">•</span>
                    <span className="text-neutral-600">
                      {activeSelectedAddress.addressString || activeSelectedAddress.address},{' '}
                      {activeSelectedAddress.locality ? `${activeSelectedAddress.locality}, ` : ''}
                      {activeSelectedAddress.city}
                    </span>
                  </span>
                </div>
                <div className="flex items-center gap-1 text-neutral-900 text-[10.5px] font-extrabold uppercase tracking-wider shrink-0 ml-3 sm:ml-4 hover:text-black">
                  <span>Change</span>
                  <ChevronDown
                    className={`w-3.5 h-3.5 text-neutral-500 transition-transform duration-200 ${
                      isAddressDropdownOpen ? 'rotate-180' : ''
                    }`}
                    strokeWidth={2}
                  />
                </div>
              </div>

              {/* Address Switcher Dropdown */}
              <AnimatePresence>
                {isAddressDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute top-full left-4 right-4 md:left-1/2 md:-translate-x-1/2 md:w-full md:max-w-xl mt-1 bg-white border border-black/10 rounded-lg shadow-xl z-50 p-2.5 max-h-60 overflow-y-auto"
                  >
                    <div className="text-[9px] uppercase tracking-wider font-extrabold text-neutral-400 px-2.5 pb-2 mb-1 border-b border-black/5">
                      Select Destination
                    </div>
                    {!savedAddresses ? (
                      <div className="flex flex-col gap-2 px-2 pb-2">
                        <div className="h-11 bg-black/[0.04] rounded-lg animate-pulse" />
                        <div className="h-11 bg-black/[0.04] rounded-lg animate-pulse" />
                      </div>
                    ) : savedAddresses.length > 0 ? (
                      savedAddresses.map((addr) => {
                        const isSelected =
                          activeSelectedAddress &&
                          String(activeSelectedAddress._id || activeSelectedAddress.id) ===
                            String(addr._id || addr.id);
                        return (
                          <div
                            key={addr._id || addr.id}
                            onClick={() => {
                              setSelectedAddressId(addr._id || addr.id);
                              setIsAddressDropdownOpen(false);
                            }}
                            className={`p-2.5 rounded-lg text-[11px] cursor-pointer hover:bg-neutral-50 transition-colors flex items-start gap-2.5 ${isSelected ? 'bg-[#283618]/10 text-neutral-900 font-bold border border-[#283618]/25' : 'text-neutral-700'}`}
                          >
                            <div className="mt-0.5 shrink-0">
                              <div
                                className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                                  isSelected
                                    ? 'border-[#283618] bg-white'
                                    : 'border-neutral-300 bg-white'
                                }`}
                              >
                                {isSelected && (
                                  <div className="w-1.5 h-1.5 rounded-full bg-[#283618]" />
                                )}
                              </div>
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="font-bold text-neutral-950">
                                {addr.name} ({addr.tag})
                              </div>
                              <div className="truncate text-neutral-500 text-[10.5px]">
                                {addr.addressString || addr.address}, {addr.locality}, {addr.city}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="p-2.5 rounded-lg text-[11px] text-neutral-400 text-center">
                        No other addresses saved.
                      </div>
                    )}
                    <div className="mt-2 pt-2 border-t border-black/5 flex justify-end">
                      <Link
                        to="/dashboard?drawer=addresses"
                        className="text-[10px] font-extrabold text-neutral-900 uppercase tracking-widest hover:text-[#d99b00] flex items-center gap-1"
                      >
                        Manage Addresses
                        <ArrowRight className="w-3 h-3" strokeWidth={2} />
                      </Link>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        ))}

      <div className="max-w-[1240px] mx-auto w-full pt-6 lg:pt-10 px-4 sm:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 lg:gap-6 items-start">
          {/* Left Column: Active Step Form Details */}
          <div className="w-full col-span-1 lg:col-span-7 xl:col-span-8">
            <Suspense fallback={<StepFallback mode="address" />}>
              {checkoutSteps[activeStep] === 'ADDRESS' && <CheckoutAddressStep />}
              {checkoutSteps[activeStep] === 'PAYMENT' && <CheckoutPaymentStep />}
            </Suspense>
          </div>

          {/* Right Column: Price Details Sidebar & Recommendations */}
          <div
            className={`col-span-1 lg:col-span-5 xl:col-span-4 ${
              checkoutSteps[activeStep] === 'ADDRESS' ? 'hidden lg:block' : ''
            }`}
          >
            <Suspense fallback={<CheckoutSidebarSkeleton />}>
              <CheckoutSidebar />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  );
}

export function Checkout() {
  return (
    <CheckoutProvider>
      <CheckoutContent />
    </CheckoutProvider>
  );
}
