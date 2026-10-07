import { ArrowLeft, ShieldCheck, Check } from 'lucide-react';
import React from 'react';
import { m as motion } from 'framer-motion';
export function CheckoutSteps({ currentStep, onStepClick, steps = ['BAG', 'ADDRESS', 'PAYMENT'] }) {
  const getStepLabel = (step) => {
    switch (step) {
      case 'BAG':
        return 'Cart';
      case 'ADDRESS':
        return 'Delivery';
      case 'VERIFY':
        return 'Confirm';
      case 'PAYMENT':
        return 'Pay';
      case 'CUSTOMIZATION':
        return 'Note';
      default:
        return step;
    }
  };

  return (
    <div className="bg-white/95 border-b border-black/[0.08] sticky top-[48px] sm:top-[52px] z-40 shadow-[0_2px_10px_rgba(0,0,0,0.02)] backdrop-blur-md py-2 sm:py-2.5 px-3 sm:px-6">
      <div className="max-w-[1240px] mx-auto flex items-center justify-between gap-3 sm:gap-4">
        {/* Left: Discreet Back Button (hidden on mobile) */}
        <div className="hidden sm:flex items-center gap-2 min-w-[90px]">
          {currentStep > 0 && onStepClick && (
            <button
              onClick={() => onStepClick(currentStep - 1)}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-neutral-700 hover:text-black hover:bg-neutral-100 text-[11px] font-bold transition-colors cursor-pointer"
              aria-label="Go back to previous step"
            >
              <ArrowLeft className="w-3.5 h-3.5" strokeWidth={2.2} />
              <span className="hidden sm:inline">Back</span>
            </button>
          )}
        </div>

        {/* Center: Steps */}
        <div className="flex-1 flex justify-center overflow-x-auto no-scrollbar px-1">
          <div className="flex items-center justify-center w-full max-w-[440px] text-[9.5px] sm:text-[10.5px] font-extrabold tracking-wider text-neutral-400 uppercase relative">
            {steps.map((step, index) => {
              const isActive = currentStep === index;
              const isCompleted = currentStep > index;

              return (
                <React.Fragment key={step}>
                  <div
                    onClick={() => onStepClick?.(index)}
                    role="button"
                    aria-label={`Go to ${step} step`}
                    className={`flex flex-col sm:flex-row items-center justify-center p-2 min-w-[48px] min-h-[48px] gap-1 sm:gap-2 z-10 transition-all duration-300 cursor-pointer hover:opacity-85 active:scale-95 group ${isActive || isCompleted ? 'text-neutral-950' : 'text-neutral-400'}`}
                  >
                    <motion.div
                      layout
                      className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center text-[10px] sm:text-[11px] font-extrabold transition-all duration-500 shrink-0 ${isActive ? 'bg-black text-[#f7bb0e] shadow-sm ring-4 ring-[#f7bb0e]/25' : isCompleted ? 'bg-[#f7bb0e] text-neutral-950' : 'bg-neutral-100 border border-neutral-200 text-neutral-400'}`}
                    >
                      {isCompleted ? (
                        <Check
                          className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-neutral-950"
                          strokeWidth={2.5}
                        />
                      ) : (
                        index + 1
                      )}
                    </motion.div>
                    <span
                      className={`hidden sm:block whitespace-nowrap ${isActive ? 'font-extrabold text-neutral-950' : isCompleted ? 'font-bold text-neutral-800' : 'font-medium'}`}
                    >
                      {getStepLabel(step)}
                    </span>
                    {/* Show text below circle on mobile only */}
                    <span
                      className={`block sm:hidden text-[8px] sm:mt-1 text-center leading-tight whitespace-nowrap mt-[3px] ${isActive ? 'font-extrabold text-neutral-950' : 'font-medium text-neutral-400'}`}
                    >
                      {getStepLabel(step)}
                    </span>
                  </div>

                  {index < steps.length - 1 && (
                    <div className="flex-1 relative mx-1 sm:mx-3 h-4 flex items-center mb-[10px] sm:mb-0">
                      <div className="absolute w-full border-t-[1.5px] border-dashed border-neutral-200 top-1/2 -translate-y-1/2"></div>
                      <motion.div
                        className="absolute left-0 h-[2px] bg-[#f7bb0e] top-1/2 -translate-y-1/2 origin-left z-0 shadow-xs"
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: isCompleted ? 1 : 0 }}
                        transition={{ duration: 0.6, ease: 'easeInOut' }}
                      />
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Right: Secure Badge (Desktop) */}
        <div className="hidden lg:flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200/60 text-emerald-800">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" strokeWidth={2} />
          <span className="text-[9.5px] font-extrabold uppercase tracking-widest">100% Secure</span>
        </div>
      </div>
    </div>
  );
}
