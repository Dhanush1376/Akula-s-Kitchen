import React from 'react';
import { Check, Clock, Truck, Package, XCircle, RotateCcw, Route } from 'lucide-react';

/**
 * Clean, lightweight timeline tracker showing delivery progress.
 */
export default function OrderJourneyTracker({
  order,
  status,
  isDelivered,
  isCancelled,
  isRefunded,
  activeStepRef,
}) {
  const journeySteps = [];

  const standardTimeline = [
    {
      key: 'pending',
      title: 'Order Placed',
      description: 'Order received and being verified',
      icon: Clock,
      hex: '#2563eb', // Blue
      activeBg: 'bg-blue-600',
      ringColor: 'ring-blue-100',
      textColor: 'text-blue-600',
    },
    {
      key: 'confirmed',
      title: 'Confirmed',
      description: 'Order accepted by kitchen',
      icon: Package,
      hex: '#f59e0b', // Amber / Gold
      activeBg: 'bg-amber-500',
      ringColor: 'ring-amber-100',
      textColor: 'text-amber-600',
    },
    {
      key: 'processing',
      title: 'Dispatched',
      description: 'Handed over to delivery partner',
      icon: Truck,
      hex: '#7c3aed', // Violet / Purple
      activeBg: 'bg-violet-600',
      ringColor: 'ring-violet-100',
      textColor: 'text-violet-600',
    },
    {
      key: 'delivered',
      title: 'Delivered',
      description: 'Delivered to your address',
      icon: Check,
      hex: '#059669', // Emerald Green
      activeBg: 'bg-emerald-600',
      ringColor: 'ring-emerald-100',
      textColor: 'text-emerald-600',
    },
  ];

  const currentStatusLower = status?.toLowerCase()?.replace(' ', '_') || 'pending';

  if (!isCancelled) {
    const timeline = standardTimeline;
    const currentStatusIndex = timeline.findIndex((s) => s.key === currentStatusLower);

    timeline.forEach((step, index) => {
      const historyEntry = order?.statusHistory
        ?.slice()
        .reverse()
        .find((h) => h.status?.toLowerCase()?.replace(' ', '_') === step.key);
      const timestamp = historyEntry
        ? new Date(historyEntry.timestamp)
        : index === 0
          ? new Date(order?.createdAt || order?.orderDate)
          : null;

      let stepStatus = 'pending';
      if (index <= currentStatusIndex || (isDelivered && index < standardTimeline.length)) {
        stepStatus = 'completed';
      }

      journeySteps.push({
        title: step.title,
        description: step.description,
        timestamp,
        status: stepStatus,
        icon: step.icon,
        hex: step.hex,
        activeBg: step.activeBg,
        ringColor: step.ringColor,
        textColor: step.textColor,
        meta:
          step.key === 'processing' && order?.trackingNumber
            ? `AWB: ${order.trackingNumber}`
            : null,
      });
    });

    if (isRefunded) {
      journeySteps.push({
        title: 'Refund Processed',
        description: 'Amount refunded to original payment method',
        status: 'completed',
        icon: RotateCcw,
        hex: '#0d9488', // Teal
        activeBg: 'bg-teal-600',
        ringColor: 'ring-teal-100',
        textColor: 'text-teal-600',
      });
    }
  } else {
    journeySteps.push({
      title: 'Order Placed',
      description: 'Order was placed initially',
      timestamp: new Date(order?.createdAt || Date.now()),
      status: 'completed',
      icon: Clock,
      hex: '#2563eb', // Blue
      activeBg: 'bg-blue-600',
      ringColor: 'ring-blue-100',
      textColor: 'text-blue-600',
    });

    journeySteps.push({
      title: 'Order Cancelled',
      description: 'Order has been cancelled',
      timestamp: order?.updatedAt ? new Date(order.updatedAt) : null,
      status: 'error',
      icon: XCircle,
      hex: '#e11d48', // Rose / Red
      activeBg: 'bg-rose-600',
      ringColor: 'ring-rose-100',
      textColor: 'text-rose-600',
    });

    if (isRefunded) {
      journeySteps.push({
        title: 'Refund Processed',
        description: 'Amount refunded to original payment method',
        status: 'completed',
        icon: RotateCcw,
        hex: '#0d9488', // Teal
        activeBg: 'bg-teal-600',
        ringColor: 'ring-teal-100',
        textColor: 'text-teal-600',
      });
    }
  }

  // Find active step index
  const firstPendingIndex = journeySteps.findIndex((s) => s.status === 'pending');
  const activeStepIndex =
    firstPendingIndex === -1 ? journeySteps.length - 1 : Math.max(0, firstPendingIndex - 1);
  if (journeySteps[activeStepIndex]) {
    journeySteps[activeStepIndex].isCurrent = true;
  }

  return (
    <div
      id="journey-tracker"
      className="bg-white border border-neutral-200 rounded-lg p-4 sm:p-5 shadow-sm text-left font-sans"
    >
      <div className="pb-3 mb-3 border-b border-neutral-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Route className="w-4 h-4 text-neutral-800" strokeWidth={2} />
          <span className="text-[13px] font-semibold text-neutral-900 tracking-normal">
            Order Status Journey
          </span>
        </div>
        {order?.trackingNumber && (
          <span className="text-[11px] text-neutral-500 font-mono">
            AWB: {order.trackingNumber}
          </span>
        )}
      </div>

      <div className="pt-2">
        {journeySteps.map((step, idx) => {
          const isLast = idx === journeySteps.length - 1;
          const isCompleted = step.status === 'completed';
          const isError = step.status === 'error';
          const nextStep = journeySteps[idx + 1];
          const isNextActive = nextStep && (nextStep.status === 'completed' || nextStep.isCurrent);
          const StepIcon = step.icon;

          return (
            <div
              key={idx}
              ref={step.isCurrent ? activeStepRef : null}
              className="relative pl-7 pb-5 group last:pb-1"
            >
              {!isLast && (
                <div
                  className="absolute left-[9px] top-5 bottom-0 w-[2px] transition-all"
                  style={{
                    background:
                      isCompleted && isNextActive
                        ? `linear-gradient(to bottom, ${step.hex}, ${nextStep.hex})`
                        : isCompleted
                          ? step.hex
                          : '#e5e7eb',
                  }}
                />
              )}

              {/* Status Indicator Icon with Distinct Multi-Color */}
              <div
                className={`absolute left-0 top-0.5 w-5 h-5 rounded-full flex items-center justify-center transition-all z-10 shrink-0 ${
                  isError
                    ? 'bg-rose-600 text-white shadow-xs'
                    : isCompleted
                      ? `${step.activeBg} text-white shadow-xs`
                      : step.isCurrent
                        ? `${step.activeBg} text-white ring-4 ${step.ringColor}`
                        : 'bg-neutral-100 text-neutral-400 border border-neutral-300'
                }`}
              >
                <StepIcon className="w-3 h-3" strokeWidth={2.2} />
              </div>

              {/* Step Content */}
              <div className={step.status === 'pending' ? 'opacity-50' : 'opacity-100'}>
                <div className="flex items-baseline justify-between gap-2">
                  <h4 className="text-[12.5px] font-semibold text-neutral-900 leading-tight">
                    {step.title}
                  </h4>
                  {step.timestamp && (
                    <span className="text-[10.5px] text-neutral-400 font-medium shrink-0">
                      {step.timestamp.toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  )}
                </div>

                <p className="text-[11px] text-neutral-500 mt-0.5 leading-snug">
                  {step.description}
                </p>

                {step.meta && (
                  <span className="inline-block mt-1 text-[10px] text-neutral-600 bg-neutral-100 px-2 py-0.5 rounded font-mono font-medium">
                    {step.meta}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
