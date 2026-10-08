import React from 'react';
import { Calendar, CalendarDays, X } from 'lucide-react';

const formatDisplayDate = (dateVal) => {
  if (!dateVal) return '';
  try {
    let d;
    if (typeof dateVal === 'string') {
      const clean = dateVal.trim();
      if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
        const [y, m, day] = clean.split('-').map(Number);
        d = new Date(y, m - 1, day);
      } else {
        d = new Date(clean);
      }
    } else {
      d = new Date(dateVal);
    }
    if (isNaN(d.getTime())) {
      return typeof dateVal === 'string' ? dateVal : '';
    }
    return d.toLocaleDateString('en-IN', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return typeof dateVal === 'string' ? dateVal : '';
  }
};

/**
 * Clean target delivery date picker component in Akula's Kitchen theme.
 * Configured as a required field with validation.
 */
export default function TargetDeliveryDatePicker({ needByDate, setNeedByDate }) {
  const targetDateInputRef = React.useRef(null);

  const handleOpenDatePicker = () => {
    if (targetDateInputRef.current) {
      if (typeof targetDateInputRef.current.showPicker === 'function') {
        try {
          targetDateInputRef.current.showPicker();
          return;
        } catch {}
      }
      targetDateInputRef.current.focus();
    }
  };

  const formattedValue =
    typeof needByDate === 'string'
      ? needByDate.includes('T')
        ? needByDate.split('T')[0]
        : needByDate
      : '';

  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div className="py-3 sm:py-4 mb-3 border-b border-neutral-200">
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <CalendarDays className="w-4 h-4 text-neutral-800" strokeWidth={2} />
          <span
            className="text-[13px] font-semibold text-neutral-800 font-sans tracking-normal"
            style={{ fontStretch: 'normal' }}
          >
            Target Delivery Date
          </span>
          <span
            className="text-red-500 font-bold -ml-1 text-xs leading-none"
            title="Required field"
          >
            *
          </span>
        </div>
        <span className="text-[9.5px] font-extrabold text-neutral-700 bg-neutral-100 border border-neutral-200 px-2 py-0.5 rounded-md uppercase tracking-wider">
          Required
        </span>
      </div>

      <div
        onClick={handleOpenDatePicker}
        className={`group relative flex items-center justify-between w-full h-11 sm:h-12 rounded-[8px] border px-3.5 sm:px-4 shadow-xs hover:shadow-sm cursor-pointer transition-all ${
          needByDate
            ? 'border-[#283618] bg-[#f9faf7] ring-1 ring-[#283618]/20'
            : 'border-neutral-200 bg-white hover:border-neutral-300 focus-within:border-[#283618] focus-within:ring-1 focus-within:ring-[#283618]/20'
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1 overflow-hidden">
          <Calendar
            className={`w-4 h-4 shrink-0 transition-colors ${
              needByDate ? 'text-neutral-950' : 'text-neutral-400 group-hover:text-neutral-700'
            }`}
            strokeWidth={2}
          />
          <span
            className={`min-w-0 truncate text-[12.5px] select-none ${
              needByDate ? 'text-neutral-950 font-bold' : 'text-neutral-400 font-medium'
            }`}
          >
            {needByDate ? formatDisplayDate(needByDate) : 'Select preferred delivery date...'}
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0 ml-2 z-20">
          {needByDate && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setNeedByDate('');
              }}
              className="p-1 rounded-md text-neutral-400 hover:text-black hover:bg-neutral-100 transition-colors cursor-pointer"
              aria-label="Clear selected date"
              title="Clear date"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <CalendarDays className="w-4 h-4 text-neutral-400 group-hover:text-neutral-800 transition-colors pointer-events-none" />
        </div>

        <input
          ref={targetDateInputRef}
          type="date"
          required
          min={todayStr}
          value={formattedValue}
          onChange={(e) => setNeedByDate(e.target.value)}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            opacity: 0,
            zIndex: 10,
            cursor: 'pointer',
          }}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-0"
          aria-label="Target delivery date"
        />
      </div>
    </div>
  );
}
