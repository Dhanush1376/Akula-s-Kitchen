import React, { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Decorative banana leaf for the shop hero.
 * Swoops in on mount, sways at rest, leans toward the pointer, lifts away on
 * scroll, and rustles when hovered or tapped. All motion is skipped when the
 * user prefers reduced motion.
 */
export const ShopHeroLeaf = () => {
  const wrapRef = useRef(null);
  const [rustling, setRustling] = useState(false);

  useEffect(() => {
    const wrap = wrapRef.current;
    const section = wrap?.closest('.ak-shop-head');
    if (!wrap || !section) return undefined;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return undefined;

    let px = 0;
    let py = 0;
    let frame = 0;

    const apply = () => {
      frame = 0;
      const scroll = Math.min(window.scrollY, 500);
      wrap.style.setProperty('--leaf-x', `${px * 18}px`);
      wrap.style.setProperty('--leaf-y', `${py * 14 - scroll * 0.35}px`);
      wrap.style.setProperty('--leaf-r', `${px * 4 + scroll * 0.04}deg`);
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(apply);
    };

    const onPointerMove = (e) => {
      if (e.pointerType !== 'mouse') return;
      const rect = section.getBoundingClientRect();
      px = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
      py = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
      schedule();
    };
    const onPointerLeave = () => {
      px = 0;
      py = 0;
      schedule();
    };

    section.addEventListener('pointermove', onPointerMove);
    section.addEventListener('pointerleave', onPointerLeave);
    window.addEventListener('scroll', schedule, { passive: true });
    apply();

    return () => {
      section.removeEventListener('pointermove', onPointerMove);
      section.removeEventListener('pointerleave', onPointerLeave);
      window.removeEventListener('scroll', schedule);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  const rustle = useCallback(() => {
    if (rustling) return;
    setRustling(true);
  }, [rustling]);

  return (
    <span ref={wrapRef} className="ak-shop-head__leaf" aria-hidden="true">
      <span
        className={`ak-shop-head__leaf-rustle${rustling ? ' is-rustling' : ''}`}
        onPointerEnter={rustle}
        onPointerDown={rustle}
        onAnimationEnd={(e) => {
          if (e.animationName === 'ak-leaf-rustle') setRustling(false);
        }}
      >
        <img
          src="/banana-leaf-a.webp"
          alt=""
          className="ak-shop-head__leaf-img"
          decoding="async"
          draggable="false"
        />
      </span>
    </span>
  );
};
