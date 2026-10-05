import React from 'react';

/**
 * DrawerDragHandle
 * Standard visual pull indicator for mobile bottom sheets and drawers.
 * Provides accessible touch target and visual tactile cue matching Android Material design.
 */
export function DrawerDragHandle({
  onClick,
  className = '',
  pillClassName = '',
  ariaLabel = 'Drag or tap to close',
}) {
  return (
    <div
      onClick={onClick}
      className={`w-full flex justify-center items-center pt-2.5 pb-1.5 shrink-0 cursor-grab active:cursor-grabbing select-none touch-none ${className}`}
      role="button"
      tabIndex={onClick ? 0 : -1}
      aria-label={ariaLabel}
      onKeyDown={(e) => {
        if (onClick && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onClick(e);
        }
      }}
    >
      <div
        className={`w-12 h-1.5 rounded-full bg-neutral-400 dark:bg-neutral-500 transition-opacity hover:opacity-100 ${pillClassName}`}
      />
    </div>
  );
}
