import React from 'react';
import toast from 'react-hot-toast';
import { MapPin, Phone, Edit3, Plus, ArrowRight, ChevronRight, Check } from 'lucide-react';

export function MainDeliveryView({
  activeSelectedAddress,
  hasRentalItems,
  setIsSelectingList,
  handleAddNew,
  activeItems,
  deliveryEstimates,
  setActiveStep,
  checkoutSteps,
  isAddressesLoading,
}) {
  return (
    <div className="bg-transparent pb-1 lg:pb-6">
      <div className="bg-white border border-neutral-200 rounded-lg p-5 sm:p-6 shadow-sm mb-4 relative min-h-[160px]">
        {isAddressesLoading ? (
          <div className="animate-pulse flex flex-col gap-3 py-2">
            <div className="flex justify-between items-center mb-2">
              <div className="flex gap-2 items-center">
                <div className="h-4 bg-neutral-200 rounded-md w-32" />
                <div className="h-4 bg-neutral-200 rounded-md w-16" />
              </div>
              <div className="h-7 w-16 bg-neutral-200 rounded-full" />
            </div>
            <div className="h-3.5 bg-neutral-100 rounded-md w-full" />
            <div className="h-3.5 bg-neutral-100 rounded-md w-2/3" />
            <div className="h-3.5 bg-neutral-100 rounded-md w-1/2 mt-2" />
          </div>
        ) : activeSelectedAddress ? (
          <div>
            {/* Header with Title & Change Address Button */}
            <div className="flex items-center justify-between pb-3.5 border-b border-neutral-200 mb-4">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-neutral-800" strokeWidth={2} />
                <span
                  className="text-[13.5px] sm:text-[14px] font-semibold text-neutral-800 font-sans tracking-normal"
                  style={{ fontStretch: 'normal' }}
                >
                  Delivery Address
                </span>
              </div>
              <button
                onClick={() => setIsSelectingList(true)}
                className="text-[11px] font-bold text-neutral-700 hover:text-black hover:bg-neutral-100 px-3 py-1.5 rounded-md border border-neutral-200 hover:border-neutral-300 transition-colors flex items-center gap-1 cursor-pointer"
                title="Change Address"
                aria-label="Change Address"
              >
                <Edit3 className="w-3 h-3 text-neutral-600" />
                <span>Change</span>
              </button>
            </div>

            {/* Recipient info & tags */}
            <div className="mb-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[14px] font-extrabold text-neutral-950 capitalize">
                  {activeSelectedAddress.name}
                </span>
                <span className="text-[9.5px] text-neutral-600 font-bold bg-neutral-100 px-2 py-0.5 rounded-md border border-black/5">
                  Default
                </span>
                {activeSelectedAddress.tag && (
                  <span className="text-[9.5px] font-extrabold uppercase tracking-wider px-2 py-0.5 bg-[#fef9e7] text-neutral-900 border border-[#fae182] rounded-md">
                    {activeSelectedAddress.tag}
                  </span>
                )}
              </div>
            </div>

            {/* Address lines */}
            <p className="text-[12.5px] text-neutral-600 leading-relaxed max-w-xl">
              {activeSelectedAddress.addressString || activeSelectedAddress.address}
              {activeSelectedAddress.locality && <>, {activeSelectedAddress.locality}</>}
              <br />
              {activeSelectedAddress.city}, {activeSelectedAddress.state}{' '}
              <strong className="text-neutral-900 font-bold">
                {activeSelectedAddress.pincode}
              </strong>
            </p>

            {/* Phone row */}
            <div className="mt-3.5 pt-2.5 border-t border-black/[0.04] text-[12px] flex items-center gap-2 text-neutral-600">
              <Phone className="w-3.5 h-3.5 text-neutral-400" />
              <span>Mobile:</span>
              <strong className="font-bold text-neutral-950">{activeSelectedAddress.phone}</strong>
            </div>

            {hasRentalItems && (
              <div className="mt-3.5 p-3 bg-emerald-50 text-emerald-900 rounded-lg border border-emerald-200/60 flex items-start gap-2">
                <div className="w-4 h-4 rounded-full bg-emerald-100 flex items-center justify-center shrink-0 mt-0.5">
                  <Check className="w-3 h-3 text-emerald-700" strokeWidth={2.5} />
                </div>
                <div>
                  <p className="text-[11.5px] font-bold">Kitchen Order Verification</p>
                  <p className="text-[11px] text-emerald-700/90 mt-0.5">
                    Serviceable at your pincode. Fresh batches dispatched on schedule.
                  </p>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center text-center py-6">
            <div className="w-12 h-12 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-400 mb-3">
              <MapPin className="w-6 h-6" strokeWidth={1.8} />
            </div>
            <p className="text-[14px] font-extrabold text-neutral-950 mb-1">
              No Delivery Address Found
            </p>
            <p className="text-[12px] text-neutral-500 mb-4 max-w-xs leading-normal">
              Please add your delivery address so we can ship fresh delicacies to you.
            </p>
            <button
              type="button"
              onClick={handleAddNew}
              className="bg-[#f7bb0e] text-neutral-950 hover:bg-[#eab00d] py-2.5 px-6 rounded-lg text-xs font-extrabold uppercase tracking-wider shadow-[0_2px_0_0_#d99b00,0_4px_12px_rgba(247,187,14,0.3)] transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" strokeWidth={2.5} />
              <span>Add Address</span>
            </button>
          </div>
        )}
      </div>

      {activeSelectedAddress && (
        <div className="flex justify-end px-1 mb-4">
          <button
            onClick={() => setIsSelectingList(true)}
            className="text-[11px] font-bold text-neutral-600 hover:text-black flex items-center gap-1 cursor-pointer transition-colors"
          >
            <span>Select another saved address</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Continue CTA (Sticky on Mobile, Clean on Desktop) */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t border-neutral-200 p-3.5 shadow-[0_-8px_30px_rgba(0,0,0,0.06)] z-40 flex justify-center lg:static lg:bg-transparent lg:border-none lg:shadow-none lg:p-0 lg:mt-6">
        <div className="max-w-[1240px] w-full mx-auto lg:max-w-none">
          <button
            onClick={() => {
              if (!activeSelectedAddress) {
                toast.error('Please add and select a delivery address first.');
                return;
              }
              const nextIndex = checkoutSteps.indexOf('ADDRESS') + 1;
              setActiveStep(nextIndex);
            }}
            disabled={!activeSelectedAddress}
            className={`w-full py-3.5 sm:py-4 rounded-lg text-xs font-extrabold uppercase tracking-wider transition-all text-center flex items-center justify-center gap-2 ${
              !activeSelectedAddress
                ? 'bg-neutral-100 text-neutral-400 border border-neutral-200 cursor-not-allowed'
                : 'bg-[#f7bb0e] text-neutral-950 hover:bg-[#eab00d] border border-[#f7bb0e] shadow-[0_2px_0_0_#d99b00,0_4px_12px_rgba(247,187,14,0.3)] active:scale-[0.98] cursor-pointer'
            }`}
          >
            <span>Continue to Payment</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
