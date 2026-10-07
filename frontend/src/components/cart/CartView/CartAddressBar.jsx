import { MapPin, ChevronDown, ArrowRight } from 'lucide-react';
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';

export function CartAddressBar({
  isAddressDropdownOpen,
  setIsAddressDropdownOpen,
  activeAddress,
  addresses,
  setDefaultAddress,
}) {
  return (
    <div
      className={`w-full bg-white border-b border-neutral-200 relative hover:bg-neutral-50/80 transition-colors ${isAddressDropdownOpen ? 'z-50' : 'z-30'}`}
    >
      <div className="max-w-[1240px] mx-auto px-4 sm:px-6 relative">
        <div
          onClick={() => setIsAddressDropdownOpen(!isAddressDropdownOpen)}
          className="flex items-center justify-between py-2 sm:py-2.5 cursor-pointer select-none"
        >
          <div className="flex items-center gap-2 min-w-0">
            <MapPin className="w-4 h-4 text-neutral-800 shrink-0" strokeWidth={2} />
            <span className="text-[11px] sm:text-xs text-neutral-800 font-medium truncate leading-tight">
              <strong className="text-neutral-950 font-bold mr-1">Deliver to:</strong>
              {activeAddress
                ? `${activeAddress.name} - ${activeAddress.addressString || activeAddress.address}, ${activeAddress.locality || ''}, ${activeAddress.city}`
                : 'Select delivery address'}
            </span>
          </div>
          <ChevronDown
            className={`w-4 h-4 text-neutral-400 transition-transform duration-200 shrink-0 ml-2 ${
              isAddressDropdownOpen ? 'rotate-180' : ''
            }`}
            strokeWidth={2}
          />
        </div>

        <AnimatePresence>
          {isAddressDropdownOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute top-full left-4 right-4 mt-1 bg-white border border-neutral-200 rounded-lg shadow-lg z-50 p-2.5 max-h-60 overflow-y-auto"
            >
              <div className="text-[9px] uppercase tracking-wider font-extrabold text-neutral-400 px-2.5 pb-2 mb-1 border-b border-black/5">
                Saved Delivery Addresses
              </div>
              {addresses && addresses.length > 0 ? (
                addresses.map((addr) => (
                  <div
                    key={addr._id || addr.id}
                    onClick={() => {
                      setDefaultAddress(addr._id || addr.id);
                      setIsAddressDropdownOpen(false);
                    }}
                    className={`p-2.5 rounded-lg text-[11px] cursor-pointer hover:bg-neutral-50 transition-colors flex items-start gap-2 ${addr.isDefault ? 'bg-[#fef9e7] text-neutral-900 font-bold border border-[#fae182]' : 'text-neutral-700'}`}
                  >
                    <span className="material-symbols-outlined text-[15px] mt-0.5 text-neutral-900">
                      {addr.isDefault ? 'radio_button_checked' : 'radio_button_unchecked'}
                    </span>
                    <div className="min-w-0">
                      <div className="font-extrabold text-neutral-950">
                        {addr.name} ({addr.tag})
                      </div>
                      <div className="truncate text-neutral-500 text-[10.5px]">
                        {addr.addressString || addr.address}, {addr.locality}, {addr.city}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-3 rounded-xl text-[11px] text-neutral-400 text-center">
                  No other saved addresses found.
                </div>
              )}
              <div className="mt-2 pt-2 border-t border-black/5 flex justify-end">
                <Link
                  to="/dashboard?drawer=addresses"
                  className="text-[10px] font-extrabold text-neutral-900 hover:text-[#f7bb0e] uppercase tracking-wider transition-colors flex items-center gap-1"
                >
                  Manage Addresses
                  <ArrowRight className="w-3 h-3" strokeWidth={2.2} />
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
