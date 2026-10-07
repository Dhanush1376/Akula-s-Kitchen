import { useCallback, useEffect, useRef } from 'react';
import {
  FallingLeavesLayer,
  prefersReducedMotion,
  useFallingLeaves,
  windBreeze,
  windGust,
} from '../effects/FallingLeaves';
import './accountLeaves.css';

/**
 * A banana leaf rising from the bottom-left corner of the account pages, behind the
 * content and the bottom navigation; with the top-right leaf it frames the page on a
 * diagonal. It sweeps in on page load, drifts in a slow breeze, and catches a gust when
 * the visitor scrolls, hovers or taps it. A few small leaves float down past it.
 *
 * Render it inside a positioned page container; it fills that container's bottom edge.
 */

const rand = (min, max) => min + Math.random() * (max - min);
// Kept to one leaf for a minimal look; add 'right' back for a second corner.
const LEAVES = ['left'];
const LEAF_SRC = {
  left: '/account/corner-leaf-left.webp',
  right: '/account/corner-leaf-right.webp',
};

export function AccountLeaves() {
  const stageRef = useRef(null);
  const canopyRef = useRef(null);
  const leafRefs = useRef({});
  const shadowRefs = useRef({});
  const { pieces, shed } = useFallingLeaves({ max: 24 });

  const rustle = useCallback(
    (which, count = Math.round(rand(2, 4)), direction = Math.random() < 0.5 ? -1 : 1) => {
      const leaf = leafRefs.current[which];
      // The gust plays on the wrapper, which pivots on the leaf stem
      const gust = {
        direction,
        strength: 0.7,
        shadow: shadowRefs.current[which],
      };
      if (!windGust(leaf?.parentElement, gust)) return;
      shed(canopyRef.current, { count, stageEl: stageRef.current, wind: direction });
    },
    [shed],
  );

  // A slow breeze on each leaf; each one gets its own irregular rhythm.
  useEffect(() => {
    const breezes = LEAVES.map((which) =>
      windBreeze(leafRefs.current[which]?.parentElement, {
        strength: which === 'left' ? 0.6 : 0.5,
      }),
    );
    return () => breezes.forEach((b) => b?.cancel());
  }, []);

  // Once the leaves have swept in, a breath of wind shakes a few small leaves loose.
  useEffect(() => {
    const timer = window.setTimeout(() => rustle('left', Math.round(rand(2, 3))), 1800);
    return () => window.clearTimeout(timer);
  }, [rustle]);

  // Scrolling stirs one leaf at a time while the area is on screen.
  useEffect(() => {
    if (prefersReducedMotion()) return undefined;
    let quietUntil = 0;
    let lastY = window.scrollY;
    let turn = 0;
    const onScroll = () => {
      const y = window.scrollY;
      if (Math.abs(y - lastY) < 24) return;
      const down = y > lastY;
      lastY = y;
      const r = stageRef.current?.getBoundingClientRect();
      if (!r || r.bottom < 0 || r.top > window.innerHeight) return;
      const now = Date.now();
      if (now < quietUntil) return;
      quietUntil = now + 4000;
      turn += 1;
      rustle(LEAVES[turn % LEAVES.length], Math.round(rand(2, 3)), down ? 1 : -1);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [rustle]);

  return (
    <div ref={stageRef} className="acct-leaves" aria-hidden="true">
      {/* Invisible strip above the leaves that the small pieces fall from */}
      <div ref={canopyRef} className="acct-leaves__canopy" />
      <FallingLeavesLayer pieces={pieces} className="acct-leaves__fall" />

      {LEAVES.map((which) => (
        <div key={which} className={`acct-leaf acct-leaf--${which}`}>
          <div
            className="acct-leaf__sway"
            // A passing cursor pushes the leaf the way it was moving
            onPointerEnter={(e) =>
              e.pointerType === 'mouse' && rustle(which, 3, Math.sign(e.movementX) || undefined)
            }
            onPointerDown={() => rustle(which, 5)}
          >
            {/* Cast shadow on the page; it moves with the leaf */}
            <img
              ref={(el) => {
                shadowRefs.current[which] = el;
              }}
              src={LEAF_SRC[which]}
              alt=""
              className="acct-leaf__shadow"
              draggable="false"
              decoding="async"
            />
            <img
              ref={(el) => {
                leafRefs.current[which] = el;
              }}
              src={LEAF_SRC[which]}
              alt=""
              className="acct-leaf__img"
              draggable="false"
              decoding="async"
            />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * One banana leaf drooping in from the top-right corner of the account pages, behind the
 * content, balancing the two at the bottom. It sweeps in, drifts in a slow breeze and
 * catches a gust when tapped or hovered. It drops nothing, so the top of the page stays calm.
 * The corner frame's right leaf is flipped vertically, so it hangs from the top-right
 * corner with its cut edges off the top and right.
 */
export function AccountTopLeaf() {
  const swayRef = useRef(null);
  const shadowRef = useRef(null);

  useEffect(() => {
    const breeze = windBreeze(swayRef.current, { strength: 0.55 });
    return () => breeze?.cancel();
  }, []);

  const gust = useCallback((direction = Math.random() < 0.5 ? -1 : 1) => {
    windGust(swayRef.current, { direction, strength: 0.6, shadow: shadowRef.current });
  }, []);

  return (
    <div className="acct-top" aria-hidden="true">
      <div className="acct-top-leaf">
        <div
          ref={swayRef}
          className="acct-top-leaf__sway"
          onPointerEnter={(e) =>
            e.pointerType === 'mouse' && gust(Math.sign(e.movementX) || undefined)
          }
          onPointerDown={() => gust()}
        >
          <img
            ref={shadowRef}
            src="/account/corner-leaf-right.webp"
            alt=""
            className="acct-top-leaf__shadow"
            draggable="false"
            decoding="async"
          />
          <img
            src="/account/corner-leaf-right.webp"
            alt=""
            className="acct-top-leaf__img"
            draggable="false"
            decoding="async"
          />
        </div>
      </div>
    </div>
  );
}
