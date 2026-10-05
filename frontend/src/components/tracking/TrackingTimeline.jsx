import React from 'react';
import { m as motion } from 'framer-motion';
import { Clock, Package, Truck, Check, Route } from 'lucide-react';

const trackingStepConfig = {
  Pending: {
    label: 'Order Placed',
    icon: Clock,
    hex: '#2563eb',
    activeBg: 'bg-blue-600',
    ring: 'ring-blue-100',
  },
  Confirmed: {
    label: 'Confirmed',
    icon: Package,
    hex: '#f59e0b',
    activeBg: 'bg-amber-500',
    ring: 'ring-amber-100',
  },
  Processing: {
    label: 'Dispatched',
    icon: Truck,
    hex: '#7c3aed',
    activeBg: 'bg-violet-600',
    ring: 'ring-violet-100',
  },
  Delivered: {
    label: 'Delivered',
    icon: Check,
    hex: '#059669',
    activeBg: 'bg-emerald-600',
    ring: 'ring-emerald-100',
  },
};

const trackingSteps = ['Pending', 'Confirmed', 'Processing', 'Delivered'];

export function TrackingTimeline({ orderStatus }) {
  const activeIndex = trackingSteps.indexOf(orderStatus);

  return (
    <div className="bg-white border border-neutral-200 rounded-lg p-5 shadow-sm text-left font-sans">
      <div className="pb-3 mb-4 border-b border-neutral-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Route className="w-4 h-4 text-neutral-800" strokeWidth={2} />
          <span className="text-[13px] font-semibold text-neutral-900 tracking-normal">
            Transit Progress Tracker
          </span>
        </div>
        <span className="text-[11px] font-medium text-neutral-500">
          Status: <strong className="text-neutral-900 font-semibold">{orderStatus}</strong>
        </span>
      </div>

      {/* Desktop Horizontal Timeline */}
      <div className="hidden sm:flex items-center justify-between gap-1 overflow-x-auto py-2">
        {trackingSteps.map((step, idx) => {
          const config = trackingStepConfig[step] || trackingStepConfig.Pending;
          const StepIcon = config.icon;
          const active =
            idx <= activeIndex &&
            orderStatus !== 'Cancelled' &&
            orderStatus !== 'Returned' &&
            orderStatus !== 'Refunded';
          const isCurrent = step === orderStatus;
          const nextStep = trackingSteps[idx + 1];
          const nextConfig = nextStep ? trackingStepConfig[nextStep] : null;

          return (
            <React.Fragment key={step}>
              <div className="flex flex-col items-center text-center shrink-0 w-24 relative">
                <motion.div
                  animate={isCurrent ? { scale: [1, 1.1, 1] } : {}}
                  transition={{ repeat: Infinity, duration: 2.2 }}
                  className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                    isCurrent
                      ? `${config.activeBg} text-white ring-4 ${config.ring} shadow-xs`
                      : active
                        ? `${config.activeBg} text-white shadow-xs`
                        : 'bg-neutral-100 text-neutral-400 border border-neutral-300'
                  }`}
                >
                  <StepIcon className="w-4 h-4" strokeWidth={2.2} />
                </motion.div>
                <span
                  className={`text-[11px] font-medium mt-2 tracking-normal ${
                    active ? 'text-neutral-900 font-semibold' : 'text-neutral-400'
                  }`}
                >
                  {config.label}
                </span>
              </div>
              {idx < trackingSteps.length - 1 && (
                <div className="flex-1 h-[2px] bg-neutral-200 relative -top-3">
                  <div
                    className="h-full transition-all duration-500"
                    style={{
                      background:
                        idx < activeIndex && nextConfig
                          ? `linear-gradient(to right, ${config.hex}, ${nextConfig.hex})`
                          : idx === activeIndex
                            ? config.hex
                            : 'transparent',
                      width: idx <= activeIndex ? '100%' : '0%',
                    }}
                  />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Mobile Vertical Timeline */}
      <div className="sm:hidden space-y-4 pt-1">
        {trackingSteps.map((step, idx) => {
          const config = trackingStepConfig[step] || trackingStepConfig.Pending;
          const StepIcon = config.icon;
          const active =
            idx <= activeIndex &&
            orderStatus !== 'Cancelled' &&
            orderStatus !== 'Returned' &&
            orderStatus !== 'Refunded';
          const isCurrent = step === orderStatus;

          return (
            <div key={step} className="flex gap-3 items-center">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-all ${
                  isCurrent
                    ? `${config.activeBg} text-white ring-4 ${config.ring} shadow-xs`
                    : active
                      ? `${config.activeBg} text-white shadow-xs`
                      : 'bg-neutral-100 text-neutral-400 border border-neutral-300'
                }`}
              >
                <StepIcon className="w-3.5 h-3.5" strokeWidth={2.2} />
              </div>
              <div>
                <h4
                  className={`text-[12px] ${
                    active ? 'font-semibold text-neutral-900' : 'text-neutral-400 font-normal'
                  }`}
                >
                  {config.label}
                </h4>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
