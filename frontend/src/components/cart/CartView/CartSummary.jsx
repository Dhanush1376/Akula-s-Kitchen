import { Info, ShieldCheck, Shield, Lock, AlertTriangle, ArrowRight } from 'lucide-react';
import React from 'react';
import { motion } from 'framer-motion';
import { Skeleton } from '../../ui/Skeleton';
import { useConfig } from '../../../context/ConfigContext';
import toast from 'react-hot-toast';

export const CartSummary = ({
  loading,
  cartCount,
  totalMRP,
  actualSubtotal,
  discountOnMRP,

  platformFee,
  shippingFee,
  finalPayableAmount,
  runProtectedAction,
  navigate,
  orderLimitError,
  orderLimitButtonText,
}) => {
  const { isStoreClosed } = useConfig();
  return (
    <div className="bg-white border border-neutral-200 rounded-lg shadow-sm relative overflow-hidden">
      {loading && (
        <div className="absolute inset-0 bg-white/70 backdrop-blur-[1px] z-10 p-5">
          <div className="space-y-3">
            <Skeleton className="h-4 w-40" />
            {[0, 1, 2].map((idx) => (
              <div className="flex justify-between" key={idx}>
                <Skeleton className="h-3 w-24" delay={idx * 90} />
                <Skeleton className="h-3 w-16" delay={idx * 90 + 70} />
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="p-5 sm:p-6">
        <div
          className="text-[11px] font-extrabold text-neutral-950 uppercase tracking-widest pb-3.5 border-b border-neutral-200 mb-4 flex items-center justify-between"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          <span>Bill Details</span>
          <span className="text-[10px] font-extrabold text-neutral-400">
            {cartCount} {cartCount === 1 ? 'ITEM' : 'ITEMS'}
          </span>
        </div>
        <div className="space-y-3 text-[13px] text-neutral-800">
          <>
            <div className="flex justify-between">
              <span className="text-neutral-500">Item Total (MRP)</span>
              <span className="font-medium text-neutral-700">
                ₹{(totalMRP || actualSubtotal).toLocaleString()}
              </span>
            </div>
            {discountOnMRP > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-emerald-700 font-medium">Bag Discount</span>
                <span className="text-emerald-700 font-extrabold">
                  − ₹{discountOnMRP.toLocaleString()}
                </span>
              </div>
            )}
          </>

          {platformFee > 0 && (
            <div className="flex justify-between items-center group">
              <span className="text-neutral-500 flex items-center gap-1 cursor-pointer">
                Platform Fee <Info className="w-3.5 h-3.5 text-neutral-400" />
              </span>
              <span className="font-bold text-neutral-900">₹{platformFee}</span>
            </div>
          )}
          <div className="flex justify-between items-center">
            <span className="text-neutral-500">Delivery Fee</span>
            <span className="font-bold text-neutral-600">Excluded</span>
          </div>

          <div className="h-[1px] bg-neutral-200 my-3.5" />
          <div className="flex justify-between items-baseline">
            <span className="font-extrabold text-[14px] text-neutral-950 uppercase tracking-wider">
              To Pay
            </span>
            <div className="flex items-center gap-2">
              <motion.span
                key={finalPayableAmount}
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
                className="font-bold text-[19px] sm:text-[20px] text-neutral-950 leading-none"
              >
                ₹{finalPayableAmount.toLocaleString()}
              </motion.span>
            </div>
          </div>

          {/* Desktop Place Order Button */}
          {orderLimitError && (
            <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2 text-amber-900 text-[11px] font-medium leading-tight">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>{orderLimitError}</span>
            </div>
          )}
          <button
            onClick={() => {
              if (isStoreClosed) {
                toast(
                  'Online checkout is currently paused while the store is in catalog-only mode.',
                );
                return;
              }
              if (orderLimitError) {
                toast.error(orderLimitError);
                return;
              }
              runProtectedAction(() => {
                sessionStorage.removeItem('akula_checkout_step');
                navigate('/checkout');
              });
            }}
            disabled={Boolean(isStoreClosed || orderLimitError)}
            className={`w-full mt-5 h-12 rounded-full pl-5 pr-1.5 py-1 text-[12px] sm:text-[12.5px] font-extrabold uppercase tracking-wider transition-all hidden lg:flex items-center justify-between group ${
              isStoreClosed || orderLimitError
                ? 'bg-neutral-200 text-neutral-500 border border-neutral-300 cursor-not-allowed'
                : 'bg-[#f7bb0e] text-neutral-950 hover:bg-[#eab00d] border border-[#f7bb0e] shadow-[0_2px_0_0_#d99b00,0_4px_12px_rgba(247,187,14,0.3)] cursor-pointer active:scale-[0.99]'
            }`}
          >
            {isStoreClosed ? (
              <div className="flex items-center justify-center gap-2 w-full pr-3.5">
                <Lock className="w-4 h-4 text-neutral-500" />
                <span>Orders Paused (View Only)</span>
              </div>
            ) : orderLimitError ? (
              <div className="flex items-center justify-center gap-2 w-full pr-3.5">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>{orderLimitButtonText || 'Order Limits Not Met'}</span>
              </div>
            ) : (
              <>
                <span className="font-extrabold text-[12px] sm:text-[12.5px] uppercase tracking-wider text-neutral-950">
                  Proceed to Checkout
                </span>
                <span className="w-8 h-8 rounded-full bg-white text-neutral-950 flex items-center justify-center shrink-0 shadow-xs transition-transform duration-200 group-hover:scale-105">
                  <ArrowRight
                    className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5"
                    strokeWidth={2.5}
                    aria-hidden="true"
                  />
                </span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Secure verification footer inside card */}
      <div className="bg-neutral-50 px-5 py-3 border-t border-neutral-200 flex items-center justify-between text-[10.5px] text-neutral-600 font-extrabold">
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" strokeWidth={2} />
          <span>Fresh From Our Kitchen</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Shield className="w-3.5 h-3.5 text-neutral-800" strokeWidth={2} />
          <span>Secure Payments</span>
        </div>
      </div>
    </div>
  );
};
