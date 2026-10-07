import { useEffect, useLayoutEffect, useRef } from 'react';
import { prefersReducedMotion, windBreeze, windGust } from '../effects/FallingLeaves';
import './productLeaf.css';

/**
 * A quiet banana leaf peeking in from the right edge of the product details, behind the
 * text. It sweeps in once, drifts in a slow breeze and stirs gently when the visitor
 * scrolls. Purely decorative: it never takes clicks and drops nothing, so it stays out of
 * the way of shopping. Shown on phones, where the details run to the screen edge.
 *
 * Render it inside a positioned container that isolates its stacking context.
 */
export function ProductLeaf() {
  const rootRef = useRef(null);
  const swayRef = useRef(null);
  const shadowRef = useRef(null);

  // Reach exactly to the screen edge, whatever padding the page has around the details
  // (the scrollbar is excluded, so the leaf never hides under it). Measured from layout
  // offsets rather than getBoundingClientRect, so the page's entrance animation can't skew
  // it, and re-measured whenever the page or the details change size (a scrollbar
  // appearing once content loads, rotation, and so on).
  useLayoutEffect(() => {
    const el = rootRef.current;
    const parent = el?.parentElement;
    if (!parent) return undefined;
    const place = () => {
      let left = 0;
      for (let node = parent; node; node = node.offsetParent) left += node.offsetLeft;
      const gap = document.documentElement.clientWidth - (left + parent.offsetWidth);
      el.style.right = `${-Math.max(0, gap)}px`;
    };
    place();
    const observer = new ResizeObserver(place);
    observer.observe(document.documentElement);
    observer.observe(parent);
    window.addEventListener('resize', place);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', place);
    };
  }, []);

  useEffect(() => {
    const breeze = windBreeze(swayRef.current, { strength: 0.5 });
    return () => breeze?.cancel();
  }, []);

  // A soft gust now and then while scrolling past it, never more than every 6 seconds.
  useEffect(() => {
    if (prefersReducedMotion()) return undefined;
    let quietUntil = 0;
    let lastY = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      if (Math.abs(y - lastY) < 32) return;
      const down = y > lastY;
      lastY = y;
      const r = swayRef.current?.getBoundingClientRect();
      if (!r || !r.width || r.bottom < 0 || r.top > window.innerHeight) return;
      const now = Date.now();
      if (now < quietUntil) return;
      quietUntil = now + 6000;
      windGust(swayRef.current, {
        direction: down ? 1 : -1,
        strength: 0.5,
        shadow: shadowRef.current,
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div ref={rootRef} className="pd-leaf" aria-hidden="true">
      <div className="pd-leaf__frame">
        <div ref={swayRef} className="pd-leaf__sway">
          <img
            ref={shadowRef}
            src="/account/corner-leaf-right.webp"
            alt=""
            className="pd-leaf__shadow"
            draggable="false"
            decoding="async"
          />
          <img
            src="/account/corner-leaf-right.webp"
            alt=""
            className="pd-leaf__img"
            draggable="false"
            decoding="async"
          />
        </div>
      </div>
    </div>
  );
}
