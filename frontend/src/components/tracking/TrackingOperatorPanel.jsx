import { ShieldCheck } from 'lucide-react';
import React from 'react';
import { m as motion, AnimatePresence } from 'framer-motion';

const statusIcons = {
  Pending: 'schedule',
  Confirmed: 'thumb_up',
  Processing: 'inventory_2',
  Delivered: 'check_circle',
  Cancelled: 'cancel',
  Returned: 'keyboard_return',
  Refunded: 'payments',
};

export function TrackingOperatorPanel({
  showOperatorPanel,
  setShowOperatorPanel,
  operatorNote,
  setOperatorNote,
  handleStatusUpdate,
  updatingStatus,
}) {
  return (
    <div className="bg-white border border-outline-variant/30 rounded-2xl p-6 shadow-xs">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xs font-bold text-on-surface uppercase tracking-wider">
            Logistics Scanner Terminal
          </h3>
          <p className="text-[10px] text-secondary font-light mt-0.5">
            For courier agents and warehouse managers scanning package labels.
          </p>
        </div>
        <button
          onClick={() => setShowOperatorPanel(!showOperatorPanel)}
          className="px-4 py-2 border border-primary text-primary rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-primary/5 transition-all cursor-pointer"
        >
          {showOperatorPanel ? 'Lock Terminal' : 'Initialize Scanner Mode'}
        </button>
      </div>

      <AnimatePresence>
        {showOperatorPanel && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden mt-4 pt-4 border-t border-dashed border-outline-variant/30"
          >
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-xl p-3.5 flex items-center justify-between text-green-700">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="text-sm font-bold" strokeWidth={1.5} />
                  <span className="text-[10px] font-bold uppercase tracking-wider">
                    Signed in as staff
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                <label className="block text-[10px] uppercase font-bold text-secondary tracking-widest">
                  STORE/TRANSIT SCAN NOTE
                </label>
                <input
                  type="text"
                  placeholder="Enter courier notes (e.g. Dispatched from warehouse, Out for delivery at Jubilee Hills hub)"
                  value={operatorNote}
                  onChange={(e) => setOperatorNote(e.target.value)}
                  className="w-full bg-surface-container-low border border-outline-variant/30 rounded-xl px-4 py-2.5 text-xs outline-none focus:border-primary transition-all font-semibold"
                />

                <label className="block text-[10px] uppercase font-bold text-secondary tracking-widest pt-2">
                  TAP CORRESPONDING SCAN EVENT TO UPDATE
                </label>
                <div className="flex flex-wrap gap-2">
                  {['Processing', 'Delivered', 'Cancelled'].map((s) => (
                    <button
                      key={s}
                      disabled={updatingStatus}
                      onClick={() => handleStatusUpdate(s)}
                      className="flex items-center gap-1.5 px-4 py-2.5 bg-surface border border-outline-variant/40 rounded-xl text-[10.5px] font-bold text-secondary hover:text-primary hover:border-primary hover:bg-primary/5 transition-all cursor-pointer disabled:opacity-50 active:scale-[0.96]"
                    >
                      <span className="material-symbols-outlined text-[15px]">
                        {statusIcons[s]}
                      </span>
                      <span>{s}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
