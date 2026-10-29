import { m as motion, AnimatePresence } from 'framer-motion';

export function DraftStatusIndicator({
  status,
  lastSavedAt,
  compact = false,
  showTime = true,
  className = '',
}) {
  // status: 'idle' | 'saving' | 'saved' | 'unsaved' | 'error'

  if (status === 'idle') return null;

  const formattedTime =
    lastSavedAt && showTime
      ? new Intl.DateTimeFormat('en-IN', { timeStyle: 'short' }).format(new Date(lastSavedAt))
      : null;

  const config = {
    saving: {
      text: compact ? (
        <span>
          <span className="hidden sm:inline">Saving </span>draft...
        </span>
      ) : (
        'Saving draft...'
      ),
      icon: 'sync',
      color: 'text-slate-500',
      dotColor: 'bg-slate-400',
      animateClass: 'animate-spin-slow',
      pulse: true,
    },
    saved: {
      text: compact ? (
        formattedTime ? (
          <span>
            <span className="hidden sm:inline">Draft </span>saved at {formattedTime}
          </span>
        ) : (
          'Saved'
        )
      ) : formattedTime ? (
        `Draft saved at ${formattedTime}`
      ) : (
        'Draft saved'
      ),
      icon: 'cloud_done',
      color: 'text-emerald-600 dark:text-emerald-400',
      dotColor: 'bg-emerald-500',
      animateClass: '',
      pulse: false,
    },
    unsaved: {
      text: 'Unsaved',
      icon: 'edit_document',
      color: 'text-amber-600 dark:text-amber-400',
      dotColor: 'bg-amber-500',
      animateClass: '',
      pulse: false,
    },
    error: {
      text: compact ? 'Failed' : 'Failed to save draft',
      icon: 'error',
      color: 'text-red-500',
      dotColor: 'bg-red-500',
      animateClass: '',
      pulse: false,
    },
  };

  const current = config[status];
  if (!current) return null;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={status}
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 4 }}
        transition={{ duration: 0.2 }}
        className={`flex items-center rounded-full bg-[var(--admin-surface)] border border-[var(--admin-border)] shadow-2xs ${
          compact ? 'gap-1.5 px-2.5 py-0.5' : 'gap-2 px-3 py-1.5'
        } ${className}`}
      >
        <div className="relative flex items-center justify-center w-2 h-2">
          {current.pulse && (
            <span
              className={`absolute w-full h-full rounded-full ${current.dotColor} opacity-30 animate-ping`}
            />
          )}
          <span className={`w-1.5 h-1.5 rounded-full ${current.dotColor}`} />
        </div>

        <span
          className={`font-medium tracking-tight whitespace-nowrap ${current.color} ${
            compact ? 'text-[10.5px] sm:text-[11px]' : 'text-[11px]'
          }`}
        >
          {current.text}
        </span>
      </motion.div>
    </AnimatePresence>
  );
}
