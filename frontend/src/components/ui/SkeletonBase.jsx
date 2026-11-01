// Skeletons support standard opaque fill or glassy translucent fill (for sections with background decorative elements like leaves).
export function Skeleton({ className = '', variant = 'rect', delay = 0, glassy = false }) {
  const variants = {
    rect: 'rounded-2xl',
    circle: 'rounded-full',
    text: 'rounded-lg h-4 w-3/4',
  };

  const isGlassy = glassy || className.includes('glassy');

  const defaultBg = isGlassy
    ? 'bg-white/40 dark:bg-white/[0.08] backdrop-blur-md border border-white/60 dark:border-white/15 shadow-[0_4px_20px_rgba(40,54,24,0.03)]'
    : 'bg-[#f2f2f0] dark:bg-white/[0.06] border border-outline-variant/10';

  return (
    <div
      className={`${defaultBg} ${variants[variant]} ${className} relative overflow-hidden`}
      style={{ animationDelay: `${delay}ms` }}
      aria-hidden="true"
    >
      <div
        className={`absolute inset-0 bg-gradient-to-r from-transparent ${
          isGlassy ? 'via-white/55 dark:via-white/20' : 'via-white/30 dark:via-white/10'
        } to-transparent animate-shimmer`}
      />
    </div>
  );
}
