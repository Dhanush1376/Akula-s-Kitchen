import React from 'react';
import {
  Receipt,
  ChevronDown,
  CreditCard,
  AlertTriangle,
  FileText,
  ArrowRight,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { useConfig } from '../../../context/ConfigContext';

/**
 * Clean, lightweight order price breakdown and invoice download card.
 */
export default function OrderPricingSummaryCard({
  order,
  isPriceDetailsOpen,
  setIsPriceDetailsOpen,
  isResuming,
  setIsResuming,
  resumePayment,
  downloadInvoice,
}) {
  const { storeName } = useConfig();

  const subtotal =
    (order.total || 0) - (order.shippingFee || 0) + (order.discount || 0) - (order.codFee || 0);

  return (
    <div className="bg-white border border-neutral-200 rounded-lg overflow-hidden shadow-sm font-sans text-left">
      <button
        onClick={() => setIsPriceDetailsOpen(!isPriceDetailsOpen)}
        className="w-full px-4 sm:px-5 py-3.5 flex items-center justify-between hover:bg-neutral-50 transition-colors text-left cursor-pointer border-b border-neutral-200"
      >
        <div className="flex items-center gap-2">
          <Receipt className="w-4 h-4 text-neutral-800" strokeWidth={2} />
          <span className="text-[13px] font-semibold text-neutral-900 tracking-normal">
            Payment & Bill Breakdown
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-bold text-neutral-950">
            ₹{(order.total || 0).toLocaleString('en-IN')}
          </span>
          <ChevronDown
            className={`w-4 h-4 text-neutral-400 transition-transform duration-200 ${
              isPriceDetailsOpen ? 'rotate-180' : ''
            }`}
            strokeWidth={2}
          />
        </div>
      </button>

      <AnimatePresence initial={false}>
        {isPriceDetailsOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="p-4 sm:p-5 space-y-2.5 text-[12px] text-neutral-700 border-b border-neutral-200">
              <div className="flex justify-between">
                <span className="text-neutral-500">Items Subtotal</span>
                <span className="font-medium text-neutral-900">
                  ₹{Math.max(0, subtotal).toLocaleString('en-IN')}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-neutral-500">Delivery Fee</span>
                <span className="font-medium text-neutral-600">Excluded</span>
              </div>

              {order.discount > 0 && (
                <div className="flex justify-between items-center text-emerald-700 font-medium">
                  <span>Bag Discount</span>
                  <span>- ₹{order.discount.toLocaleString('en-IN')}</span>
                </div>
              )}

              {order.codFee > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-neutral-500">COD Handling Fee</span>
                  <span className="font-medium text-neutral-900">₹{order.codFee}</span>
                </div>
              )}

              <div className="pt-2.5 mt-1 border-t border-neutral-200 flex justify-between items-baseline font-bold">
                <span className="text-[12.5px] text-neutral-900">Total Paid</span>
                <span className="text-[15px] text-neutral-950 font-bold">
                  ₹{(order.total || 0).toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            <div className="px-4 sm:px-5 py-2.5 bg-neutral-50/80 flex flex-wrap items-center justify-between gap-2 text-[11px] text-neutral-500 border-b border-neutral-200">
              <span className="flex items-center gap-1.5 font-medium text-neutral-700">
                <CreditCard className="w-3.5 h-3.5 text-neutral-600" />
                Payment Mode: {order.paymentMethod?.toUpperCase() || 'ONLINE'}
              </span>
              <span>Sold by: {storeName}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Complete Payment Banner for Pending Orders */}
      {order.paymentStatus === 'pending' && order.paymentMethod === 'razorpay' && (
        <div className="bg-amber-50 p-4 flex flex-col sm:flex-row justify-between items-center gap-3 border-b border-amber-200">
          <div className="flex items-center gap-2 text-amber-900 text-[12px] font-semibold">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Payment is pending for this order</span>
          </div>
          <button
            disabled={isResuming}
            onClick={() => {
              setIsResuming(true);
              resumePayment(
                order,
                () => {
                  toast.success('Payment completed successfully. Refreshing...');
                  window.location.reload();
                },
                () => setIsResuming(false),
              );
            }}
            className="h-10 pl-4 pr-1.5 py-1 bg-[#283618] hover:bg-[#1f2b13] text-white font-extrabold text-[11px] uppercase tracking-wider rounded-full shadow-sm transition-all border border-[#283618] disabled:opacity-50 cursor-pointer flex items-center justify-between gap-2.5 group active:scale-[0.98]"
          >
            <span>{isResuming ? 'Processing...' : 'Complete Payment'}</span>
            <span className="w-7 h-7 rounded-full bg-white text-[#283618] flex items-center justify-center shrink-0 shadow-xs transition-transform duration-200 group-hover:scale-105">
              <ArrowRight
                className="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-0.5"
                strokeWidth={2.5}
              />
            </span>
          </button>
        </div>
      )}

      {/* Invoice Download Action Bar */}
      <div className="p-3.5 sm:p-4 bg-white flex flex-col sm:flex-row justify-between items-center gap-3">
        <span className="text-[11.5px] text-neutral-500 font-medium">
          Official invoice is available for your records
        </span>
        <button
          onClick={() => downloadInvoice(order._id)}
          className="w-full sm:w-auto h-10 pl-4 pr-1.5 py-1 bg-[#283618] hover:bg-[#1f2b13] text-white font-extrabold uppercase tracking-wider text-[11px] rounded-full shadow-sm transition-all flex items-center justify-between sm:justify-center gap-2.5 border border-[#283618] cursor-pointer active:scale-[0.98] group"
        >
          <span>View Invoice</span>
          <span className="w-7 h-7 rounded-full bg-white text-[#283618] flex items-center justify-center shrink-0 shadow-xs transition-transform duration-200 group-hover:scale-105">
            <FileText className="w-3.5 h-3.5 text-[#283618]" strokeWidth={2.2} />
          </span>
        </button>
      </div>
    </div>
  );
}
