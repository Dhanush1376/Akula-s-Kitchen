import { motion } from 'framer-motion';
import { Banknote, ShieldCheck, Truck, Lock, CheckCircle2, AlertCircle } from 'lucide-react';
import React from 'react';
import { useCheckout } from './CheckoutProvider';
import { useConfig } from '../context/ConfigContext';

export default function CheckoutSidebar() {
  const { estimatedDeliveryDays } = useConfig();
  const {
    user,
    backendTotals,
    isTotalsLoading,
    totalsError,
    activeStep,
    paymentOption,
    activeItems,
    fetchBackendTotals,
    settings,
    checkoutSteps,
  } = useCheckout();

  const shippingFee = backendTotals?.shippingFee || 0;
  const payableTotal = Math.max(0, (backendTotals?.total || 0) - shippingFee);
  const activeTotal = payableTotal;
  const totalItemUnits = activeItems.reduce((sum, item) => sum + (Number(item.quantity) || 1), 0);

  return (
    <>
      {/* Right Column: PRICE DETAILS */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="space-y-4"
      >
        {/* Price Details Card */}
        <div className="bg-white border border-neutral-200 rounded-lg p-5 sm:p-6 shadow-sm sticky top-24 relative overflow-hidden">
          {/* Header */}
          <div className="pb-3.5 border-b border-neutral-200 mb-4 relative z-10 flex items-center justify-between">
            <span
              className="text-[12.5px] font-semibold text-neutral-800 uppercase tracking-wider font-sans"
              style={{ fontStretch: 'normal' }}
            >
              Order Bill Details
            </span>
            <span className="text-[10.5px] font-extrabold text-neutral-400">
              {totalItemUnits} {totalItemUnits === 1 ? 'ITEM' : 'ITEMS'}
            </span>
          </div>

          <div className="space-y-3 text-[13px] text-neutral-700">
            {totalsError ? (
              <div className="p-3.5 bg-red-50 text-red-700 rounded-lg text-xs font-semibold border border-red-200 flex flex-col gap-2">
                <div className="flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>Pricing details couldn't be loaded</span>
                </div>
                <p className="text-[11px] font-normal leading-normal text-red-600/80">
                  {totalsError}
                </p>
                <button
                  type="button"
                  onClick={() => fetchBackendTotals()}
                  className="bg-neutral-900 text-white py-1 px-3 rounded-md text-[10px] uppercase tracking-wider w-fit self-end font-bold shadow-2xs cursor-pointer"
                >
                  Retry
                </button>
              </div>
            ) : isTotalsLoading ? (
              <div className="space-y-3.5 animate-pulse py-1">
                <div className="flex justify-between">
                  <div className="h-3.5 bg-neutral-200 rounded w-1/3" />
                  <div className="h-3.5 bg-neutral-200 rounded w-1/6" />
                </div>
                <div className="flex justify-between">
                  <div className="h-3.5 bg-neutral-200 rounded w-1/4" />
                  <div className="h-3.5 bg-neutral-200 rounded w-1/6" />
                </div>
                <div className="flex justify-between">
                  <div className="h-3.5 bg-neutral-200 rounded w-1/3" />
                  <div className="h-3.5 bg-neutral-200 rounded w-1/12" />
                </div>
                <div className="h-[1px] bg-neutral-200 my-3" />
                <div className="flex justify-between items-center">
                  <div className="h-4 bg-neutral-200 rounded w-1/4" />
                  <div className="h-5 bg-neutral-200 rounded w-1/3" />
                </div>
              </div>
            ) : (
              <>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Items Total ({activeItems.length} items)</span>
                  <span className="font-bold text-neutral-950">
                    ₹{backendTotals?.subtotal?.toLocaleString() || 0}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-neutral-500">Delivery Fee</span>
                  <span className="font-bold text-neutral-600">Excluded</span>
                </div>

                {backendTotals?.platformFee > 0 && (
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Packaging & Platform</span>
                    <span className="font-bold text-neutral-950">
                      ₹{backendTotals.platformFee.toLocaleString()}
                    </span>
                  </div>
                )}

                {paymentOption === 'cod' && backendTotals?.codFee > 0 && (
                  <div className="flex justify-between items-center bg-[#fef9e7] text-neutral-950 rounded-lg p-2.5 border border-[#fae182]">
                    <span className="flex items-center gap-1.5 font-bold text-[12px]">
                      <span>COD Handling Fee</span>
                    </span>
                    <span className="font-black text-[12.5px]">
                      ₹{backendTotals?.codFee?.toLocaleString() || 0}
                    </span>
                  </div>
                )}

                <div className="h-[1px] bg-neutral-200 my-3.5" />

                <div className="flex justify-between items-baseline">
                  <span className="text-[13px] font-bold text-neutral-900">
                    Total Payable Amount
                  </span>
                  <span className="text-[18px] sm:text-[19px] text-neutral-950 font-bold leading-none">
                    ₹{payableTotal?.toLocaleString() || 0}
                  </span>
                </div>
              </>
            )}

            {/* Loyalty / Savings Strip */}
            {activeTotal > 0 && (
              <div className="bg-[#fef9e7] text-neutral-900 rounded-lg p-3 text-[11px] border border-[#fae182] flex items-center gap-2 shadow-2xs mt-3">
                <Banknote className="w-4 h-4 text-neutral-950 shrink-0" strokeWidth={2} />
                <span className="font-bold">
                  Guaranteed fresh preparation right before dispatch
                </span>
              </div>
            )}
          </div>

          {/* Trust Badges */}
          <div className="mt-4 pt-3.5 border-t border-neutral-200 grid grid-cols-2 gap-2 text-[11px] text-neutral-600">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span className="truncate">100% Authentic Quality</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
              <span className="truncate">Secure Payments</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Truck className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
              <span className="truncate">Safe Kitchen Delivery</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span className="truncate">Fresh Ingredients</span>
            </div>
          </div>
        </div>
      </motion.div>
    </>
  );
}
