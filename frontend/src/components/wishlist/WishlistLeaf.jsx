import { useCallback, useEffect, useRef } from 'react';
import {
  FallingLeavesLayer,
  prefersReducedMotion,
  useFallingLeaves,
  windBreeze,
  windGust,
} from '../effects/FallingLeaves';
import './wishlistLeaf.css';

/**
 * Banana leaf hanging into the top of the wishlist page, tucked under the header.
 * It sweeps in on page load and shakes a few small leaves loose, then drifts slowly in a
 * light breeze. When the visitor scrolls, hovers or taps it, a
 * stronger gust moves through it and it lets go of a few small leaves and jasmine petals.
 *
 * Render it as the first child of a positioned container that spans the page width;
 * the leaf and the falling pieces are placed relative to that container.
 */

const rand = (min, max) => min + Math.random() * (max - min);

export function WishlistLeaf() {
  const boxRef = useRef(null);
  const leafRef = useRef(null);
  const shadowRef = useRef(null);
  const { pieces, shed } = useFallingLeaves({ max: 20 });

  const rustle = useCallback(
    (count = Math.round(rand(4, 6)), direction = Math.random() < 0.5 ? -1 : 1) => {
      const leaf = leafRef.current;
      // The gust plays on the wrapper, which pivots on the leaf stem
      if (!windGust(leaf?.parentElement, { direction, shadow: shadowRef.current })) return;
      shed(leaf, {
        count,
        stageEl: boxRef.current?.offsetParent,
        fallRange: [460, 680],
        wind: direction,
      });
    },
    [shed],
  );

  // A slow, endless breeze on the stem-pivoted wrapper; gusts layer on top of it.
  useEffect(() => {
    const breeze = windBreeze(leafRef.current?.parentElement);
    return () => breeze?.cancel();
  }, []);

  // Once the leaf has swept in (about 1.45s), a breath of wind shakes a few leaves loose.
  useEffect(() => {
    const timer = window.setTimeout(() => rustle(Math.round(rand(3, 5))), 1700);
    return () => window.clearTimeout(timer);
  }, [rustle]);

  // Scrolling stirs the leaf while it is on screen, once the last gust has settled.
  useEffect(() => {
    if (prefersReducedMotion()) return undefined;
    let quietUntil = 0;
    let lastY = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      if (Math.abs(y - lastY) < 24) return;
      const down = y > lastY;
      lastY = y;
      const r = leafRef.current?.getBoundingClientRect();
      if (!r || r.bottom < 0 || r.top > window.innerHeight) return;
      const now = Date.now();
      if (now < quietUntil) return;
      quietUntil = now + 4000;
      rustle(Math.round(rand(2, 4)), down ? 1 : -1);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [rustle]);

  return (
    <>
      <div ref={boxRef} className="wl-leaf" aria-hidden="true">
        <div
          className="wl-leaf__sway"
          // A passing cursor pushes the leaf the way it was moving
          onPointerEnter={(e) =>
            e.pointerType === 'mouse' && rustle(3, Math.sign(e.movementX) || undefined)
          }
          onPointerDown={() => rustle(5)}
        >
          {/* Cast shadow on the page; it moves with the leaf */}
          <img
            ref={shadowRef}
            src="/wishlist/banana-leaf.webp"
            alt=""
            className="wl-leaf__shadow"
            draggable="false"
            decoding="async"
          />
          <img
            ref={leafRef}
            src="/wishlist/banana-leaf.webp"
            alt=""
            className="wl-leaf__img"
            draggable="false"
            decoding="async"
          />
        </div>
      </div>
      {/* Behind the big leaf, so each piece drops out from under its edge */}
      <FallingLeavesLayer pieces={pieces} className="wl-leaf-fall" />
    </>
  );
}
