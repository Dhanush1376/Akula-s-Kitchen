import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Edit2, Phone, Check } from 'lucide-react';

export function AddressList({
  savedAddresses,
  selectedAddressId,
  setSelectedAddressId,
  handleEdit,
  handleAddNew,
  setIsSelectingList,
}) {
  return (
    <div className="bg-transparent pb-2 lg:pb-6">
      {/* Header bar */}
      <div className="p-3 sm:p-4 max-w-2xl mx-auto flex items-center justify-between mb-2">
        <span
          className="text-[13.5px] sm:text-[14px] font-semibold text-neutral-800 font-sans tracking-normal"
          style={{ fontStretch: 'normal' }}
        >
          Saved Delivery Addresses
        </span>
        <button
          onClick={handleAddNew}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#fef9e7] border border-[#fae182] text-[11px] font-extrabold text-neutral-950 hover:bg-[#fae182] transition-colors cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" strokeWidth={2.5} />
          <span>Add New</span>
        </button>
      </div>

      {/* Address cards list */}
      <div className="max-w-2xl mx-auto px-3 sm:px-4 flex flex-col gap-3">
        {savedAddresses.map((addr) => {
          const addrId = addr._id || addr.id;
          const isSelected = selectedAddressId === addrId;
          return (
            <div
              key={addrId}
              onClick={() => setSelectedAddressId(addrId)}
              className={`relative p-4 sm:p-5 rounded-lg border transition-all duration-200 cursor-pointer overflow-hidden ${
                isSelected
                  ? 'border-[#f7bb0e] ring-2 ring-[#f7bb0e]/20 bg-[#fffdfa] shadow-sm'
                  : 'border-neutral-200 bg-white hover:border-neutral-300 shadow-sm hover:shadow-md'
              }`}
            >
              <div className="flex gap-3.5">
                {/* Radio Circle */}
                <div className="pt-0.5 shrink-0">
                  <div
                    className={`w-4.5 h-4.5 rounded-full border flex items-center justify-center transition-colors ${
                      isSelected ? 'border-neutral-950 bg-white' : 'border-neutral-300 bg-white'
                    }`}
                  >
                    {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-[#f7bb0e]" />}
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1.5">
                    <span className="text-[13.5px] font-extrabold text-neutral-950 capitalize">
                      {addr.name}
                    </span>
                    <span className="text-[9.5px] text-neutral-600 font-bold bg-neutral-100 px-2 py-0.5 rounded-md border border-black/5">
                      Default
                    </span>
                    {addr.tag && (
                      <span className="text-[9.5px] font-extrabold uppercase tracking-wider px-2 py-0.5 bg-[#fef9e7] text-neutral-900 border border-[#fae182] rounded-md">
                        {addr.tag}
                      </span>
                    )}
                  </div>
                  <p className="text-[12px] text-neutral-600 leading-relaxed max-w-xl mb-2">
                    {addr.addressString || addr.address}, {addr.locality}, {addr.city}, {addr.state}{' '}
                    <strong className="text-neutral-900 font-bold">{addr.pincode}</strong>
                  </p>
                  <div className="text-[11.5px] flex items-center gap-1.5 text-neutral-600">
                    <Phone className="w-3 h-3 text-neutral-400" />
                    <span>Mobile:</span>
                    <strong className="font-bold text-neutral-950">{addr.phone}</strong>
                  </div>

                  <AnimatePresence>
                    {isSelected && (
                      <motion.div
                        initial={{ opacity: 0, height: 0, marginTop: 0 }}
                        animate={{ opacity: 1, height: 'auto', marginTop: 12 }}
                        exit={{ opacity: 0, height: 0, marginTop: 0 }}
                        className="flex gap-2.5 overflow-hidden pt-2 border-t border-black/[0.04]"
                      >
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(addr);
                          }}
                          className="px-3.5 py-1 border border-neutral-200 hover:border-neutral-300 rounded-md text-[10.5px] font-bold text-neutral-800 hover:text-black hover:bg-neutral-50 transition-colors cursor-pointer flex items-center gap-1"
                        >
                          <Edit2 className="w-3 h-3 text-neutral-500" />
                          <span>Edit</span>
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Confirm Address Button (Sticky on Mobile, Clean on Desktop) */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t border-neutral-200 p-3.5 shadow-[0_-8px_30px_rgba(0,0,0,0.06)] z-40 flex justify-center lg:static lg:bg-transparent lg:border-none lg:shadow-none lg:p-0 lg:mt-6">
        <div className="max-w-2xl w-full mx-auto">
          <button
            onClick={() => setIsSelectingList(false)}
            className="w-full bg-[#f7bb0e] text-neutral-950 hover:bg-[#eab00d] border border-[#f7bb0e] py-3.5 sm:py-4 rounded-lg text-xs font-extrabold uppercase tracking-wider shadow-[0_2px_0_0_#d99b00,0_4px_12px_rgba(247,187,14,0.3)] transition-all text-center cursor-pointer flex items-center justify-center gap-2"
          >
            <span>Confirm Selected Address</span>
            <Check className="w-4 h-4" strokeWidth={2.5} />
          </button>
        </div>
      </div>
    </div>
  );
}
