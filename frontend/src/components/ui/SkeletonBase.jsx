// Skeletons support standard opaque fill or glassy translucent fill (for sections with background decorative elements like leaves).
export function Skeleton({ className = '', variant = 'rect', delay = 0, glassy = false }) {
  const variants = {
    rect: 'rounded-2xl',
    circle: 'rounded-full',
    text: 'rounded-lg h-4 w-3/4',
  };

  const isGlassy =
    glassy || className.includes('glassy') || className.includes('ak-skeleton-glassy');

  return (
    <div
      className={`${variants[variant]} ${className} ${
        isGlassy
          ? 'ak-skeleton-glassy'
          : 'bg-[#f2f2f0] dark:bg-white/[0.06] border border-outline-variant/10'
      } relative overflow-hidden`}
      style={{
        animationDelay: `${delay}ms`,
        ...(isGlassy
          ? {
              backgroundColor: 'rgba(255, 255, 255, 0.22)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              border: '1px solid rgba(255, 255, 255, 0.45)',
              boxShadow: '0 4px 20px 0 rgba(0, 0, 0, 0.03)',
            }
          : {}),
      }}
      aria-hidden="true"
    >
      <div
        className="absolute inset-0 animate-shimmer"
        style={{
          background: isGlassy
            ? 'linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.45) 50%, transparent 100%)'
            : 'linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.25) 50%, transparent 100%)',
        }}
      />
    </div>
  );
}
