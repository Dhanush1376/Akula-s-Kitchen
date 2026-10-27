import { Clock, MapPin, ArrowRight } from 'lucide-react';
import { Suspense, useState, useRef, useEffect } from 'react';
import { lazyWithRetry as lazy } from '../utils/performance/lazyWithRetry';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { SEO } from '../components/seo/SEO';
import { CheckoutProvider, useCheckout } from '../checkout/CheckoutProvider';
import { useConfig } from '../context/ConfigContext';
import { CheckoutSidebarSkeleton, CheckoutStepSkeleton } from '../components/ui/Skeleton';
import { CheckoutSteps } from '../components/ui/CheckoutSteps';
import { CartAddressBar } from '../components/cart/CartView/CartAddressBar';
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
    setIsAddingNewAddress,
    navigate,
    checkoutSteps,
  } = useCheckout();

  const [isAddressDropdownOpen, setIsAddressDropdownOpen] = useState(false);

  const prevStepRef = useRef(activeStep);
  useEffect(() => {
    prevStepRef.current = activeStep;
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [activeStep]);

  const pageTransition = {
    initial: { opacity: 0 },
    animate: { opacity: 1, transition: { duration: 0.2, ease: 'easeOut' } },
    exit: { opacity: 0, transition: { duration: 0.15, ease: 'easeIn' } },
  };

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
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="bg-white min-h-screen pb-24 font-body text-neutral-950 modern-sans-headings"
    >
      <SEO
        title="Secure Checkout"
        description={`Finalize your ${storeName || "Akula's Kitchen"} order through our secure checkout portal.`}
        noindex
      />

      {/* Sticky Top Section: Checkout Steps + Address Bar (on PAYMENT step) */}
      <div className="sticky top-[44px] sm:top-[48px] md:top-[52px] z-40 bg-white/95 backdrop-blur-md shadow-[0_2px_12px_rgba(0,0,0,0.03)] mb-4">
        <CheckoutSteps
          steps={checkoutSteps}
          currentStep={activeStep}
          isSticky={false}
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

        {checkoutSteps[activeStep] === 'PAYMENT' && (
          <CartAddressBar
            isAddressDropdownOpen={isAddressDropdownOpen}
            setIsAddressDropdownOpen={setIsAddressDropdownOpen}
            activeAddress={activeSelectedAddress}
            addresses={savedAddresses}
            setDefaultAddress={setSelectedAddressId}
            onAddNewClick={() => {
              setIsAddingNewAddress?.(true);
              setActiveStep(1);
              setIsAddressDropdownOpen(false);
            }}
            onManageClick={() => {
              setActiveStep(1);
              setIsAddressDropdownOpen(false);
            }}
          />
        )}
      </div>

      <div className="max-w-[1240px] mx-auto w-full pt-6 lg:pt-10 px-4 sm:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 lg:gap-6 items-start">
          {/* Left Column: Active Step Form Details */}
          <div className="w-full col-span-1 lg:col-span-7 xl:col-span-8">
            <AnimatePresence mode="wait" initial={false}>
              {checkoutSteps[activeStep] === 'ADDRESS' && (
                <motion.div
                  key="step-address"
                  variants={pageTransition}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  className="w-full"
                >
                  <Suspense fallback={<StepFallback mode="address" />}>
                    <CheckoutAddressStep />
                  </Suspense>
                </motion.div>
              )}
              {checkoutSteps[activeStep] === 'PAYMENT' && (
                <motion.div
                  key="step-payment"
                  variants={pageTransition}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  className="w-full"
                >
                  <Suspense fallback={<StepFallback mode="payment" />}>
                    <CheckoutPaymentStep />
                  </Suspense>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Right Column: Price Details Sidebar & Recommendations */}
          <div
            className={`col-span-1 lg:col-span-5 xl:col-span-4 ${
              checkoutSteps[activeStep] === 'ADDRESS' ? 'hidden lg:block' : 'block'
            }`}
          >
            <Suspense fallback={<CheckoutSidebarSkeleton />}>
              <CheckoutSidebar />
            </Suspense>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export function Checkout() {
  return (
    <CheckoutProvider>
      <CheckoutContent />
    </CheckoutProvider>
  );
}
