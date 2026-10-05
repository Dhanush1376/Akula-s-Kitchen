import { Gift } from 'lucide-react';
import React from 'react';

export function ProductNoteCard({ complimentaryGift }) {
  if (!complimentaryGift?.enabled) return null;

  return (
    <div className="space-y-3">
      {/* Complimentary Gift Section */}
      {complimentaryGift?.enabled && (
        <div className="p-4 bg-white rounded-2xl border border-black/10 shadow-xs flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-[#f7bb0e]/20 flex items-center justify-center shrink-0 mt-0.5 text-neutral-950">
            <Gift className="w-4 h-4" strokeWidth={2} />
          </div>
          <div className="flex flex-col w-full">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] text-neutral-950 uppercase tracking-wider font-extrabold">
                Complimentary Gift
              </span>
              {complimentaryGift.displayBadge ? (
                <span className="px-2.5 py-0.5 bg-neutral-100 text-neutral-900 text-[10px] uppercase tracking-wider font-extrabold rounded-full border border-black/10">
                  {complimentaryGift.displayBadge}
                </span>
              ) : (
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  Included Free
                </span>
              )}
            </div>

            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-[13px] text-neutral-950 font-bold">
                {complimentaryGift.quantity} × {complimentaryGift.name || 'Surprise Gift'}
              </span>
            </div>

            {complimentaryGift.description && (
              <span className="text-[12px] text-neutral-600 font-normal mt-0.5 leading-relaxed">
                {complimentaryGift.description}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
