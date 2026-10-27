import { MapPin, ChevronDown, ArrowRight, CheckCircle2, Circle, Plus } from 'lucide-react';
import React, { useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';

export function formatAddress(addr) {
  if (!addr) return '';
  const parts = [
    addr.addressString || addr.address,
    addr.landmark,
    addr.locality,
    addr.city,
  ].filter(Boolean);

  const unique = [];
  parts.forEach((p) => {
    const clean = String(p).trim().replace(/,\s*$/, '');
    if (!clean) return;
    const isRedundant = unique.some(
      (u) =>
        u.toLowerCase() === clean.toLowerCase() || u.toLowerCase().includes(clean.toLowerCase()),
    );
    if (!isRedundant) {
      const subIdx = unique.findIndex((u) => clean.toLowerCase().includes(u.toLowerCase()));
      if (subIdx >= 0) {
        unique[subIdx] = clean;
      } else {
        unique.push(clean);
      }
    }
  });

  return unique.join(', ');
}

export function CartAddressBar({
  isAddressDropdownOpen,
  setIsAddressDropdownOpen,
  activeAddress,
  addresses,
  setDefaultAddress,
  onAddNewClick,
  onManageClick,
}) {
  const containerRef = useRef(null);

  // Close dropdown on outside click or escape key
  useEffect(() => {
    if (!isAddressDropdownOpen) return;
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsAddressDropdownOpen(false);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsAddressDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isAddressDropdownOpen, setIsAddressDropdownOpen]);

  // Clean formatted address without duplicate locality/city
  const formattedAddress = useMemo(() => {
    return formatAddress(activeAddress);
  }, [activeAddress]);

  return (
    <div
      ref={containerRef}
      className={`w-full bg-white/95 backdrop-blur-md border-b border-black/[0.06] transition-colors relative ${
        isAddressDropdownOpen ? 'z-50' : 'z-30'
      }`}
    >
      <div className="max-w-[1240px] mx-auto px-4 sm:px-6 relative">
        <div
          onClick={() => setIsAddressDropdownOpen(!isAddressDropdownOpen)}
          className="flex items-center justify-between py-2 sm:py-2.5 cursor-pointer select-none group"
          role="button"
          aria-expanded={isAddressDropdownOpen}
          aria-label="Delivery address selection"
        >
          {/* Left: Deliver to info */}
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 flex-1 mr-2">
            <span className="inline-flex items-center gap-1 bg-[#f7bb0e]/15 text-[#283618] border border-[#f7bb0e]/30 text-[9px] sm:text-[9.5px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full shrink-0">
              <MapPin className="w-3 h-3 text-[#283618]" strokeWidth={2.4} />
              <span>Deliver to</span>
            </span>

            <span className="text-[11px] sm:text-xs text-neutral-800 font-medium truncate leading-tight">
              {activeAddress ? (
                <>
                  <strong className="text-neutral-950 font-bold mr-0.5">
                    {activeAddress.name}
                  </strong>
                  <span className="text-neutral-300 mx-1">•</span>
                  <span className="text-neutral-600 truncate">{formattedAddress}</span>
                </>
              ) : (
                <span className="text-neutral-500 font-medium">Select delivery address</span>
              )}
            </span>
          </div>

          {/* Right: Change / Arrow button */}
          <div className="flex items-center gap-1 text-neutral-900 group-hover:text-black font-extrabold text-[10px] sm:text-[10.5px] uppercase tracking-wider shrink-0 transition-colors bg-neutral-100/80 group-hover:bg-neutral-200/70 px-2.5 py-1 rounded-full border border-neutral-200/60">
            <span>Change</span>
            <ChevronDown
              className={`w-3.5 h-3.5 text-neutral-600 transition-transform duration-200 ${
                isAddressDropdownOpen ? 'rotate-180' : ''
              }`}
              strokeWidth={2.4}
            />
          </div>
        </div>

        {/* Dropdown Menu */}
        <AnimatePresence>
          {isAddressDropdownOpen && (
            <motion.div
              initial={{ opacity: 0, y: -6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.98 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              className="absolute top-full left-3 right-3 sm:left-auto sm:right-6 sm:w-[380px] mt-1.5 bg-white border border-neutral-200 rounded-lg shadow-[0_16px_40px_rgba(0,0,0,0.12)] z-50 p-3 max-h-[340px] overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-black/[0.06] px-1">
                <span className="text-[9.5px] uppercase tracking-wider font-extrabold text-neutral-400">
                  Saved Delivery Addresses
                </span>
                <span className="text-[10px] font-bold text-neutral-500">
                  {addresses?.length || 0} {addresses?.length === 1 ? 'address' : 'addresses'}
                </span>
              </div>

              <div className="space-y-1.5">
                {addresses && addresses.length > 0 ? (
                  addresses.map((addr) => {
                    const isSelected =
                      activeAddress &&
                      (activeAddress._id === addr._id || activeAddress.id === addr.id);
                    return (
                      <div
                        key={addr._id || addr.id}
                        onClick={() => {
                          setDefaultAddress(addr._id || addr.id);
                          setIsAddressDropdownOpen(false);
                        }}
                        className={`p-2.5 rounded-lg text-[11px] cursor-pointer transition-all flex items-start gap-2.5 border ${
                          isSelected
                            ? 'bg-[#fef9e7] text-neutral-950 font-bold border-[#f7bb0e] shadow-xs'
                            : 'bg-white hover:bg-neutral-50 text-neutral-700 border-neutral-200/70'
                        }`}
                      >
                        <div className="mt-0.5 shrink-0">
                          {isSelected ? (
                            <CheckCircle2 className="w-4 h-4 text-[#b4820a]" strokeWidth={2.4} />
                          ) : (
                            <Circle className="w-4 h-4 text-neutral-300" strokeWidth={2} />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="font-extrabold text-neutral-950">{addr.name}</span>
                            {addr.tag && (
                              <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-neutral-100 font-bold text-neutral-600">
                                {addr.tag}
                              </span>
                            )}
                          </div>
                          <div className="truncate text-neutral-500 text-[10.5px] mt-0.5">
                            {formatAddress(addr)}
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="p-4 rounded-lg text-[11.5px] text-neutral-400 text-center">
                    No saved addresses found.
                  </div>
                )}
              </div>

              <div className="mt-2.5 pt-2.5 border-t border-black/[0.06] flex items-center justify-between px-1">
                {onAddNewClick ? (
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddressDropdownOpen(false);
                      onAddNewClick();
                    }}
                    className="text-[10px] font-extrabold text-[#283618] hover:text-black uppercase tracking-wider transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3 text-[#283618]" strokeWidth={2.4} />
                    Add Address
                  </button>
                ) : (
                  <Link
                    to="/dashboard?drawer=addresses"
                    onClick={() => setIsAddressDropdownOpen(false)}
                    className="text-[10px] font-extrabold text-[#283618] hover:text-black uppercase tracking-wider transition-colors flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3 text-[#283618]" strokeWidth={2.4} />
                    Add Address
                  </Link>
                )}

                {onManageClick ? (
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddressDropdownOpen(false);
                      onManageClick();
                    }}
                    className="text-[10px] font-extrabold text-neutral-700 hover:text-black uppercase tracking-wider transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    Manage
                    <ArrowRight className="w-3 h-3" strokeWidth={2.2} />
                  </button>
                ) : (
                  <Link
                    to="/dashboard?drawer=addresses"
                    onClick={() => setIsAddressDropdownOpen(false)}
                    className="text-[10px] font-extrabold text-neutral-700 hover:text-black uppercase tracking-wider transition-colors flex items-center gap-1"
                  >
                    Manage
                    <ArrowRight className="w-3 h-3" strokeWidth={2.2} />
                  </Link>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
