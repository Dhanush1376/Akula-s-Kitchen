import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import {
  FallingLeavesLayer,
  prefersReducedMotion,
  useFallingLeaves,
  windBreeze,
  windGust,
} from '../../../components/effects/FallingLeaves';
import './homeHeroLeaves.css';

/**
 * Two banana leaves framing the top of the home page, both behind the frosted header so
 * they glow through its glass: one hangs from the top-left corner, the other (as on the
 * policy pages) rises at the right edge beside "See all" and leans in under the header.
 *
 * - On load each leaf unfurls from its corner, the left one first.
 * - At rest each drifts in a slow breeze with its own rhythm.
 * - Every so often a gust crosses the page: it reaches one leaf, then the other a moment
 *   later, and now and then shakes a few small leaves and petals loose over the menu.
 * - Scrolling sends a gust through them while they trail behind the content and lift
 *   away; a mouse leans them toward the cursor and brushing past one rustles it; a tap
 *   on a leaf shakes it.
 * Everything holds still when the visitor prefers reduced motion, and the breeze pauses
 * while the top of the page is off screen.
 */

const rand = (min, max) => min + Math.random() * (max - min);
const randomSign = () => (Math.random() < 0.5 ? -1 : 1);
const SIDES = ['left', 'right'];
const LEAF_SRC = {
  left: '/account/corner-leaf-left.webp',
  right: '/account/corner-leaf-right.webp',
};
// Each leaf has its own character, so the two never move as one:
//   left:  a big leaf hanging from its stem behind the header. Heavy: long, slow swings
//          at the stem, a late and lazy lean toward the pointer.
//   right: a leaf standing up from the screen edge. Light: a quicker breeze with a flutter
//          on top, its blade flexes in a gust, and it answers the pointer and scroll sooner.
// Their breeze loops differ in length (46s vs 29s), so they never fall into step.
const FEEL = {
  left: {
    breeze: {
      strength: 0.6,
      duration: 46000,
      bend: 0.15,
      waves: [
        { cycles: 3, amp: 2.6 },
        { cycles: 5, amp: 1.3 },
        { cycles: 8, amp: 0.45 },
      ],
    },
    gust: { strength: 0.8, bend: 0.3 },
    ease: 0.035, // pointer follow, per frame
    scrollEase: 0.1,
    shift: 12, // px it slides toward the pointer
    tilt: 1.6, // degrees it leans toward the pointer
    lift: -0.011, // degrees per scrolled px: swings up anticlockwise around its stem
    trail: 0.24, // how far it lags behind the scrolling page
  },
  right: {
    breeze: {
      strength: 0.7,
      duration: 29000,
      bend: 0.4,
      waves: [
        { cycles: 5, amp: 2 },
        { cycles: 9, amp: 1.1 },
        { cycles: 17, amp: 0.45 },
      ],
    },
    gust: { strength: 1, bend: 0.75 },
    ease: 0.09,
    scrollEase: 0.2,
    shift: 7,
    tilt: 0.9,
    lift: 0.016, // clockwise: leans out toward the screen edge
    trail: 0.15,
  },
};
// Both leaves have unfurled by then (see the entrance delays in homeHeroLeaves.css)
const SETTLED_MS = 2100;
// Taps on these belong to the page, not the leaves behind them
const INTERACTIVE = 'a, button, input, textarea, select, label, nav, [role="button"]';

export function HomeHeroLeaves() {
  const stageRef = useRef(null);
  const leafRefs = useRef({});
  const swayRefs = useRef({});
  const shadowRefs = useRef({});
  const dripRefs = useRef({});
  const onScreenRef = useRef(true);
  const timersRef = useRef(new Set());
  const { pieces, shed } = useFallingLeaves({ max: 18 });

  const later = useCallback((fn, ms) => {
    const id = window.setTimeout(() => {
      timersRef.current.delete(id);
      fn();
    }, ms);
    timersRef.current.add(id);
  }, []);

  useEffect(() => {
    const timers = timersRef.current;
    return () => timers.forEach((id) => window.clearTimeout(id));
  }, []);

  // One leaf catches the wind, in its own way (see FEEL). Only the right leaf sheds in a
  // gust: it stands in open air, while the left one stays tucked behind the header.
  const gustLeaf = useCallback(
    (side, { direction = randomSign(), strength = 0.75, shedCount = 0 } = {}) => {
      const moved = windGust(swayRefs.current[side], {
        direction,
        strength: strength * FEEL[side].gust.strength,
        bend: FEEL[side].gust.bend,
        shadow: shadowRefs.current[side],
      });
      if (moved && side === 'right' && shedCount > 0) {
        shed(dripRefs.current.right, {
          count: shedCount,
          fallRange: [340, 560],
          scale: 0.9,
          wind: direction,
        });
      }
      return moved;
    },
    [shed],
  );

  // A gust crossing the page reaches the upwind leaf first and the other one well after,
  // having changed strength on the way
  const crossGust = useCallback(
    (direction = randomSign(), { strength = rand(0.6, 0.85), shedCount = 0 } = {}) => {
      const [first, second] = direction > 0 ? ['left', 'right'] : ['right', 'left'];
      gustLeaf(first, { direction, strength, shedCount });
      later(
        () => gustLeaf(second, { direction, strength: strength * rand(0.65, 1.05), shedCount }),
        rand(550, 1000),
      );
    },
    [gustLeaf, later],
  );

  // Keep the leaves off the heading. The fade zones in homeHeroLeaves.css need to know,
  // in stage pixels, where the heading text starts (--hl-band), where it ends on the
  // right (--hl-clear) and where the cards begin (--hl-floor). Measured rather than
  // hard-coded, because the admin can change the title and the hero loads in stages.
  useLayoutEffect(() => {
    const stage = stageRef.current;
    const page = stage?.parentElement;
    if (!stage || !page) return undefined;
    let frame = 0;
    const measure = () => {
      frame = 0;
      const origin = stage.getBoundingClientRect();
      const text = page.querySelector('.ak-today__head > :first-child')?.getBoundingClientRect();
      const grid = page.querySelector('.ak-today__grid')?.getBoundingClientRect();
      // Without a hero (the admin can hide it), stay above wherever the content starts
      const contentTop = parseFloat(getComputedStyle(page).paddingTop) || 130;
      const band = text?.height ? text.top - origin.top : contentTop + 6;
      const clear = text?.width ? text.right - origin.left : origin.width;
      const floor = grid?.height ? grid.top - origin.top : band + 24;
      stage.style.setProperty('--hl-band', `${Math.round(band)}px`);
      stage.style.setProperty('--hl-clear', `${Math.round(clear)}px`);
      stage.style.setProperty('--hl-floor', `${Math.round(floor)}px`);
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };
    measure();
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(schedule) : null;
    // The content wrapper beside the stage grows as the hero's products arrive
    if (observer) Array.from(page.children).forEach((child) => observer.observe(child));
    window.addEventListener('resize', schedule);
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', schedule);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  // The resting breeze, paused while the leaves are off screen
  useEffect(() => {
    const breezes = SIDES.map((side) =>
      windBreeze(swayRefs.current[side], { ...FEEL[side].breeze, randomStart: true }),
    ).filter(Boolean);
    const stage = stageRef.current;
    if (!stage || typeof IntersectionObserver === 'undefined') {
      return () => breezes.forEach((b) => b.cancel());
    }
    const observer = new IntersectionObserver(([entry]) => {
      onScreenRef.current = entry.isIntersecting;
      breezes.forEach((b) => (entry.isIntersecting ? b.play() : b.pause()));
    });
    observer.observe(stage);
    return () => {
      observer.disconnect();
      breezes.forEach((b) => b.cancel());
    };
  }, []);

  // Once both leaves have unfurled, the first breath of wind crosses them and shakes a
  // few small leaves loose. After that, every 8-13 seconds, either a gust crosses both or
  // a small eddy stirs just one of them.
  useEffect(() => {
    if (prefersReducedMotion()) return undefined;
    let timer;
    const next = (delay) => {
      timer = window.setTimeout(() => {
        if (onScreenRef.current && !document.hidden) {
          const shedCount = Math.random() < 0.45 ? Math.round(rand(1, 3)) : 0;
          if (Math.random() < 0.4) {
            gustLeaf(Math.random() < 0.5 ? 'left' : 'right', {
              strength: rand(0.55, 0.8),
              shedCount,
            });
          } else {
            crossGust(randomSign(), { shedCount });
          }
        }
        next(rand(8000, 13000));
      }, delay);
    };
    timer = window.setTimeout(() => {
      crossGust(1, { strength: 0.85, shedCount: 3 });
      next(rand(8000, 11000));
    }, SETTLED_MS);
    return () => window.clearTimeout(timer);
  }, [crossGust, gustLeaf]);

  // Between gusts, a small leaf or petal drifts down every few seconds, mostly from the
  // right leaf, now and then from behind the header on the left
  useEffect(() => {
    if (prefersReducedMotion()) return undefined;
    let timer;
    let turn = 0;
    const next = (delay) => {
      timer = window.setTimeout(() => {
        if (onScreenRef.current && !document.hidden) {
          turn += 1;
          shed(dripRefs.current[turn % 3 === 0 ? 'left' : 'right'], {
            count: 1,
            fallRange: [320, 520],
            scale: 0.85,
            wind: randomSign() * rand(0.4, 0.8),
          });
        }
        next(rand(3200, 5600));
      }, delay);
    };
    next(SETTLED_MS + 2600);
    return () => window.clearTimeout(timer);
  }, [shed]);

  // Pointer and scroll: the leaves lean toward a mouse, trail behind the page and lift
  // away as it scrolls, and catch a gust when scrolled, brushed past or tapped. Each leaf
  // eases toward the same target at its own pace (see FEEL), so they never move in step,
  // and nothing ever jumps.
  useEffect(() => {
    if (prefersReducedMotion()) return undefined;
    const target = { x: 0, y: 0, scroll: Math.min(window.scrollY, 600) };
    const current = { left: { ...target }, right: { ...target } };
    let frame = 0;
    let lastY = window.scrollY;
    let quietUntil = 0;

    const write = () => {
      SIDES.forEach((side) => {
        const el = leafRefs.current[side];
        if (!el) return;
        const feel = FEEL[side];
        const at = current[side];
        el.style.setProperty('--hl-x', `${(at.x * feel.shift).toFixed(2)}px`);
        el.style.setProperty('--hl-y', `${(at.y * 5 + at.scroll * feel.trail).toFixed(2)}px`);
        el.style.setProperty(
          '--hl-r',
          `${(at.x * feel.tilt + at.scroll * feel.lift).toFixed(3)}deg`,
        );
      });
    };

    const tick = () => {
      frame = 0;
      let moving = false;
      SIDES.forEach((side) => {
        const at = current[side];
        Object.keys(target).forEach((key) => {
          const gap = target[key] - at[key];
          if (Math.abs(gap) < 0.002) {
            at[key] = target[key];
          } else {
            at[key] += gap * (key === 'scroll' ? FEEL[side].scrollEase : FEEL[side].ease);
            moving = true;
          }
        });
      });
      write();
      if (moving) frame = requestAnimationFrame(tick);
    };
    const kick = () => {
      if (!frame) frame = requestAnimationFrame(tick);
    };

    const leafAt = (x, y) =>
      SIDES.find((side) => {
        const r = leafRefs.current[side]?.querySelector('.ak-hl__img')?.getBoundingClientRect();
        return r && x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
      });

    const onScroll = () => {
      const y = window.scrollY;
      target.scroll = Math.min(y, 600);
      kick();
      if (Math.abs(y - lastY) < 24) return;
      const down = y > lastY;
      lastY = y;
      const now = Date.now();
      if (!onScreenRef.current || now < quietUntil) return;
      quietUntil = now + 3500;
      crossGust(down ? 1 : -1, { shedCount: Math.random() < 0.5 ? 2 : 0 });
    };

    const onPointerMove = (e) => {
      if (e.pointerType !== 'mouse' || !onScreenRef.current) return;
      target.x = (e.clientX / window.innerWidth - 0.5) * 2;
      target.y = Math.min(1, e.clientY / Math.max(1, window.innerHeight * 0.5)) - 0.5;
      kick();
      // A cursor brushing past a leaf pushes it the way it was moving
      if (Math.abs(e.movementX) > 2 && !e.target.closest?.('nav')) {
        const side = leafAt(e.clientX, e.clientY);
        if (side)
          gustLeaf(side, { direction: Math.sign(e.movementX), strength: 0.6, shedCount: 2 });
      }
    };

    const onPointerLeave = () => {
      target.x = 0;
      target.y = 0;
      kick();
    };

    const onPointerDown = (e) => {
      if (e.pointerType === 'mouse' || e.target.closest?.(INTERACTIVE)) return;
      const side = leafAt(e.clientX, e.clientY);
      if (side) gustLeaf(side, { strength: 0.9, shedCount: 3 });
    };

    write();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('pointerdown', onPointerDown, { passive: true });
    document.documentElement.addEventListener('pointerleave', onPointerLeave);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerdown', onPointerDown);
      document.documentElement.removeEventListener('pointerleave', onPointerLeave);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [crossGust, gustLeaf]);

  return (
    <div ref={stageRef} className="ak-hero-leaves" aria-hidden="true">
      <div className="ak-hl-zone">
        {SIDES.map((side) => (
          <div
            key={side}
            ref={(el) => {
              leafRefs.current[side] = el;
            }}
            className={`ak-hl ak-hl--${side}`}
          >
            <div className="ak-hl__enter">
              <div
                ref={(el) => {
                  swayRefs.current[side] = el;
                }}
                className="ak-hl__sway"
              >
                {/* Cast shadow on the page; a gust lifts the leaf and slides it farther out */}
                <img
                  ref={(el) => {
                    shadowRefs.current[side] = el;
                  }}
                  src={LEAF_SRC[side]}
                  alt=""
                  className="ak-hl__shadow"
                  draggable="false"
                  decoding="async"
                />
                <img
                  src={LEAF_SRC[side]}
                  alt=""
                  className="ak-hl__img"
                  draggable="false"
                  decoding="async"
                  fetchPriority="low"
                />
                {/* The stretch of the blade small leaves fall from */}
                <span
                  ref={(el) => {
                    dripRefs.current[side] = el;
                  }}
                  className="ak-hl__drip"
                />
              </div>
            </div>
          </div>
        ))}
      </div>
      <FallingLeavesLayer pieces={pieces} portal />
    </div>
  );
}
