import React, { useCallback, useEffect, useRef } from 'react';
import {
  FallingLeavesLayer,
  prefersReducedMotion,
  useFallingLeaves,
  windGust,
} from '../../components/effects/FallingLeaves';

/**
 * Decorative banana leaf for the shop hero.
 * Swoops in on mount and shakes a few small leaves loose, sways at rest, leans toward
 * the pointer, lifts away on scroll, and catches a gust of wind when the visitor
 * scrolls, hovers or taps it, letting go of small leaves and petals that float down.
 * All motion is skipped when the user prefers reduced motion.
 */
const rand = (min, max) => min + Math.random() * (max - min);

export const ShopHeroLeaf = () => {
  const wrapRef = useRef(null);
  const imgRef = useRef(null);
  const shadowRef = useRef(null);
  const { pieces, shed } = useFallingLeaves({ max: 16 });

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

  const rustle = useCallback(
    (count, direction = Math.random() < 0.5 ? -1 : 1) => {
      const leaf = imgRef.current;
      // The pivot sits far off-canvas on the stem, so keep the gust gentle and mostly a swing
      const gust = { direction, strength: 0.8, bend: 0.2, shadow: shadowRef.current };
      if (!windGust(leaf?.parentElement, gust)) return;
      shed(leaf, { count, fallRange: [380, 600], scale: 0.9, wind: direction });
    },
    [shed],
  );

  // Once the leaf has swept in (about 1.4s), a breath of wind shakes a few leaves loose.
  useEffect(() => {
    const timer = window.setTimeout(() => rustle(Math.round(rand(3, 5))), 1700);
    return () => window.clearTimeout(timer);
  }, [rustle]);

  // Scrolling stirs the leaf while it is on screen, once each gust has settled.
  useEffect(() => {
    if (prefersReducedMotion()) return undefined;
    let last = 0;
    let lastY = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      if (Math.abs(y - lastY) < 24) return;
      const down = y > lastY;
      lastY = y;
      const leaf = imgRef.current?.getBoundingClientRect();
      if (!leaf || leaf.bottom < 0 || leaf.top > window.innerHeight) return;
      const now = Date.now();
      if (now - last < 3000) return;
      last = now;
      rustle(Math.round(rand(2, 4)), down ? 1 : -1);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [rustle]);

  return (
    <span ref={wrapRef} className="ak-shop-head__leaf" aria-hidden="true">
      <span
        className="ak-shop-head__leaf-rustle"
        // A passing cursor pushes the leaf the way it was moving
        onPointerEnter={(e) =>
          e.pointerType === 'mouse' && rustle(3, Math.sign(e.movementX) || undefined)
        }
        onPointerDown={() => rustle(5)}
      >
        {/* Cast shadow on the hero; the image inside sweeps in with the leaf */}
        <span ref={shadowRef} className="ak-shop-head__leaf-shadow">
          <img
            src="/banana-leaf-a.webp"
            alt=""
            className="ak-shop-head__leaf-img"
            decoding="async"
            draggable="false"
          />
        </span>
        <img
          ref={imgRef}
          src="/banana-leaf-a.webp"
          alt=""
          className="ak-shop-head__leaf-img"
          decoding="async"
          draggable="false"
        />
      </span>
      <FallingLeavesLayer pieces={pieces} portal />
    </span>
  );
};
