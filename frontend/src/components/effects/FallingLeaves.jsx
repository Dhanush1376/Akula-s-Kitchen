import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import './fallingLeaves.css';

/**
 * Wind effects for the decorative banana leaves.
 *
 * `windGust(el)` eases a leaf over as a soft gust reaches it, then lets it drift back
 * with a couple of lazy, fading swings. Every gust is generated fresh, so repeated
 * rustles never look canned. `windBreeze(el)` keeps a leaf drifting slowly at rest.
 *
 * `useFallingLeaves().shed(sourceEl, options)` releases small leaves and jasmine petals
 * from the lower half of `sourceEl`. They float down the way real leaves do: swinging
 * side to side, tilting into each swing, turning over and drifting with the wind.
 *   - with `stageEl`, pieces are placed inside that element and fall to its bottom
 *     edge, or `fallRange` px when given;
 *   - without it, pieces are placed on the page (render the layer with `portal`)
 *     and fall `fallRange` px over whatever is below.
 */

const LEAF_SPRITES = Array.from(
  { length: 33 },
  (_, i) => `/wishlist/leaf-${String(i + 1).padStart(2, '0')}.webp`,
);
const PETAL_SPRITES = Array.from(
  { length: 14 },
  (_, i) => `/wishlist/petal-${String(i + 1).padStart(2, '0')}.webp`,
);

const rand = (min, max) => min + Math.random() * (max - min);
const pick = (list) => list[Math.floor(Math.random() * list.length)];
const randomSign = () => (Math.random() < 0.5 ? -1 : 1);
const TAU = Math.PI * 2;

export const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);

// Time until each leaf may be gusted again. A clock is used rather than the animation's
// playState so a throttled background tab can never leave a leaf locked.
const calmUntil = new WeakMap();

/**
 * Blow a gust of wind through a leaf. `el` should be a wrapper whose transform-origin
 * sits on the leaf stem. Returns false (and does nothing) while the last gust is still
 * settling, so callers can skip shedding too.
 *
 * @param {Element} el
 * @param {{ direction?: number, strength?: number, bend?: number, shadow?: Element }} [options]
 *   direction: 1 or -1, which way the leaf is pushed
 *   strength: scales how far it moves
 *   bend: 0..1, how much of the motion is a flex of the blade rather than a swing at the stem
 *   shadow: the leaf's cast shadow; it slides farther out as the gust lifts the leaf
 */
export function windGust(
  el,
  { direction = randomSign(), strength = 1, bend = 0.55, shadow = null } = {},
) {
  if (!el?.animate || prefersReducedMotion()) return false;
  const now = Date.now();
  if (now < (calmUntil.get(el) ?? 0)) return false;

  const duration = rand(4200, 5200);
  const peak = rand(3.2, 4.6) * strength * direction; // degrees at the height of the gust
  const push = rand(0.3, 0.36); // share of the time spent easing over
  const settle = TAU * rand(1.1, 1.5); // lazy swings while settling back
  const damping = 2.6;
  const breeze = rand(0.3, 0.45); // slow wander so no two gusts settle identically, in Hz
  const breezePhase = rand(0, TAU);
  const seconds = duration / 1000;

  const frames = [];
  const shadowFrames = [];
  const steps = 120;
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    let sway;
    if (t < push) {
      // Smootherstep: the leaf eases into the gust and eases to a stop at its peak
      const u = t / push;
      sway = peak * u ** 3 * (u * (u * 6 - 15) + 10);
    } else {
      // Damped spring released from rest at the peak, tapered to land exactly on zero
      const u = (t - push) / (1 - push);
      sway =
        peak *
        Math.exp(-damping * u) *
        (Math.cos(settle * u) + (damping / settle) * Math.sin(settle * u)) *
        (1 - u ** 6);
    }
    sway +=
      peak * 0.12 * Math.sin(Math.PI * t) ** 2 * Math.sin(TAU * breeze * t * seconds + breezePhase);

    frames.push({
      offset: t,
      transform: `rotate(${(sway * (1 - bend * 0.5)).toFixed(3)}deg) skewY(${(
        sway *
        bend *
        0.5
      ).toFixed(3)}deg)`,
    });
    // The farther the gust lifts the leaf off the page, the farther its shadow falls
    // (away from the light, which comes from the top left).
    const lift = Math.min(1, Math.abs(sway / peak));
    shadowFrames.push({
      offset: t,
      translate: `${(lift * 6).toFixed(2)}px ${(lift * 10).toFixed(2)}px`,
    });
  }

  // `add` layers the gust on top of any resting animation the leaf already has
  el.animate(frames, { duration, easing: 'linear', composite: 'add' });
  shadow?.animate?.(shadowFrames, { duration, easing: 'linear', composite: 'add' });
  calmUntil.set(el, now + duration * 0.8);
  return true;
}

// Whole numbers of cycles per loop keep it seamless; mixing periods (about 9s, 5s and
// 3.3s over the default 36s loop) avoids a metronome feel. Each wave starts at rest, so
// nothing jumps. Peaks reach about 4 degrees: always visibly alive, never more than a
// gentle sway.
const BREEZE_WAVES = [
  { cycles: 4, amp: 2.4 },
  { cycles: 7, amp: 1.2 },
  { cycles: 11, amp: 0.5 },
];

/**
 * Keep a leaf drifting slowly in a light breeze, forever. Returns the Animation (cancel it
 * on unmount) or null when motion is reduced. Gusts from `windGust` layer on top of it.
 *
 * Leaves that share a page can be given their own character so they never sway as one:
 *   duration: length of one loop in ms
 *   waves: [{ cycles, amp }], whole cycles per loop and their size in degrees
 *   bend: 0..1, how much of the sway is a flex of the blade rather than a swing at the stem
 *   randomStart: start somewhere along the loop instead of at its beginning
 */
export function windBreeze(
  el,
  {
    strength = 1,
    duration = 36000,
    waves: waveSpec = BREEZE_WAVES,
    bend = 0.25,
    randomStart = false,
  } = {},
) {
  if (!el?.animate || prefersReducedMotion()) return null;

  const waves = waveSpec.map((w) => ({ ...w, sign: randomSign() }));
  const swellPhase = rand(0, TAU); // the breeze picks up and dies down twice a loop

  const frames = [];
  // At least 24 keyframes per cycle of the fastest wave keeps every ripple round
  const steps = Math.max(240, 24 * Math.max(...waves.map((w) => w.cycles)));
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    const swell = 0.75 + 0.25 * Math.sin(TAU * 2 * t + swellPhase);
    const sway =
      strength *
      swell *
      waves.reduce((sum, w) => sum + w.sign * w.amp * Math.sin(TAU * w.cycles * t), 0);
    frames.push({
      offset: t,
      transform: `rotate(${(sway * (1 - bend)).toFixed(3)}deg) skewY(${(sway * bend).toFixed(3)}deg)`,
    });
  }

  const animation = el.animate(frames, { duration, iterations: Infinity, easing: 'linear' });
  if (randomStart) animation.currentTime = rand(0, duration);
  return animation;
}

/**
 * Flight of one small leaf or petal, simulated step by step: it lets go at rest, picks up
 * speed, and once the air catches it falls the way light leaves really do, in one of
 * three styles, while a gusty wind carries it sideways:
 *   - flutter: rocks side to side, sinking through each swing and floating at its ends
 *   - tumble:  spins end over end and drops a little faster
 *   - spiral:  circles slowly on the way down
 * Returns WAAPI keyframes and the flight time in seconds.
 */
function simulateFall({ fall, wind, isPetal }) {
  const roll = Math.random();
  const style =
    roll < (isPetal ? 0.35 : 0.55)
      ? 'flutter'
      : roll < (isPetal ? 0.75 : 0.85)
        ? 'tumble'
        : 'spiral';

  const terminal = { flutter: rand(55, 80), tumble: rand(95, 135), spiral: rand(70, 95) }[style]; // px/s
  const period = { flutter: rand(1.1, 1.7), tumble: rand(1.8, 2.6), spiral: rand(1.4, 2.2) }[style]; // s
  const swing = { flutter: rand(16, 30), tumble: rand(4, 9), spiral: rand(10, 18) }[style]; // px
  const rock = style === 'flutter' ? rand(28, 45) : 0; // degrees it tilts into each swing
  const spinRate = style === 'tumble' ? randomSign() * rand(280, 520) : 0; // degrees/s
  const tilt = rand(-35, 35);
  const startPhase = rand(0, TAU);
  // Wind: the gust's push dies away over a second or so, then a gusty drift remains
  const push = wind * rand(35, 80); // px/s
  const breeze = wind * rand(8, 26); // px/s
  const gustRate = rand(0.25, 0.5) * TAU;
  const gustPhase = rand(0, TAU);

  const dt = 1 / 120;
  const points = [];
  let t = 0;
  let x = 0;
  let y = 0;
  let vy = 0;
  let phase = startPhase;
  let spin = 0;
  for (let step = 0; y < fall && t < 14; step += 1) {
    // Gravity against air drag: speed builds over the first fraction of a second
    vy += 320 * (1 - vy / terminal) * dt;
    // The flutter only develops once the leaf is moving through the air
    const settled = 1 - Math.exp(-t / 0.45);
    phase += (TAU / period) * dt;
    const sink =
      style === 'flutter' ? 1 - settled + settled * (0.1 + 1.8 * Math.cos(phase) ** 2) : 1;
    y += vy * sink * dt;
    x +=
      (push * Math.exp(-t / 0.9) + breeze * (0.6 + 0.4 * Math.sin(gustRate * t + gustPhase))) * dt;
    spin += spinRate * Math.min(1, t / 0.4) * dt;
    if (step % 4 === 0) points.push({ t, x, y, phase, settled, spin });
    t += dt;
  }
  points.push({ t, x, y, phase, settled: 1, spin });

  const total = t;
  const frames = points.map((pt) => {
    const sway = swing * pt.settled * Math.sin(pt.phase);
    let rotZ = tilt;
    let rotX = 0;
    let rotY = 0;
    let depth = 1;
    if (style === 'flutter') {
      rotZ = tilt * 0.4 + rock * pt.settled * Math.cos(pt.phase); // leans into each swing
      rotY = 22 * pt.settled * Math.sin(pt.phase); // banks as it turns
      rotX = 12 * Math.sin(pt.phase * 0.5);
    } else if (style === 'tumble') {
      rotX = pt.spin; // end over end
      rotY = 10 * Math.sin(pt.phase);
    } else {
      rotY = ((pt.phase - startPhase) * 180) / Math.PI; // turns as it circles
      depth = 1 + 0.1 * pt.settled * Math.cos(pt.phase); // nearer, then farther
    }
    const remaining = total - pt.t;
    const opacity = Math.min(1, pt.t / 0.12, remaining / 0.35);
    return {
      offset: pt.t / total,
      opacity: Math.max(0, opacity),
      transform:
        `translate(-50%, -50%) translate3d(${(pt.x + sway).toFixed(2)}px, ${pt.y.toFixed(2)}px, 0) ` +
        `perspective(400px) rotateZ(${rotZ.toFixed(2)}deg) rotateX(${rotX.toFixed(2)}deg) ` +
        `rotateY(${rotY.toFixed(2)}deg) scale(${depth.toFixed(3)})`,
    };
  });
  return { frames, duration: total };
}

export function useFallingLeaves({ max = 28 } = {}) {
  const [pieces, setPieces] = useState([]);
  const idRef = useRef(0);

  const shed = useCallback(
    (
      sourceEl,
      { count = 5, stageEl = null, fallRange = null, scale = 1, wind = randomSign() } = {},
    ) => {
      if (!sourceEl || prefersReducedMotion()) return;
      const leaf = sourceEl.getBoundingClientRect();
      const bounds = stageEl
        ? stageEl.getBoundingClientRect()
        : { left: 0, top: 0, right: window.innerWidth, bottom: window.innerHeight };

      // Only the part of the leaf that is actually visible can drop anything.
      const minX = Math.max(leaf.left, bounds.left);
      const maxX = Math.min(leaf.right, bounds.right);
      // Pieces let go along the lower part of the leaf, where its edge hangs.
      const minY = Math.max(leaf.top + leaf.height * 0.55, bounds.top);
      const maxY = Math.min(leaf.top + leaf.height * 0.9, bounds.bottom);
      if (maxX - minX < 20 || maxY <= minY) return;

      // Stage-relative coordinates, or page coordinates for the portal layer.
      const offsetX = stageEl ? bounds.left : -window.scrollX;
      const offsetY = stageEl ? bounds.top : -window.scrollY;
      const stageHeight = stageEl ? bounds.bottom - bounds.top : 0;

      // Pieces let go one after another as the gust works through the leaf
      let release = rand(0.1, 0.35);
      const batch = Array.from({ length: count }, () => {
        const isPetal = Math.random() < 0.3;
        const y = rand(minY, maxY) - offsetY;
        let fall = rand(...(fallRange ?? [420, 620]));
        if (stageEl && !fallRange) fall = Math.max(stageHeight - y + 60, 160);
        const { frames, duration } = simulateFall({ fall, wind, isPetal });
        const delay = release;
        release += rand(0.25, 0.6);
        return {
          id: ++idRef.current,
          src: isPetal ? pick(PETAL_SPRITES) : pick(LEAF_SPRITES),
          x: rand(minX, maxX) - offsetX,
          y,
          // Small, like real bits of leaf and petal: never more than about 20px
          size: (isPetal ? rand(9, 15) : rand(11, 20)) * scale,
          duration,
          delay,
          frames,
        };
      });

      setPieces((prev) => [...prev, ...batch].slice(-max));

      // Clear the batch once its slowest piece has landed. A timer is used instead of
      // animation events so cleanup still happens when the tab is throttled in the background.
      const ids = new Set(batch.map((p) => p.id));
      const lifetime = Math.max(...batch.map((p) => p.duration + p.delay));
      window.setTimeout(
        () => setPieces((prev) => prev.filter((p) => !ids.has(p.id))),
        lifetime * 1000 + 250,
      );
    },
    [max],
  );

  return { pieces, shed };
}

function FallingPiece({ piece }) {
  const ref = useRef(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el?.animate) return undefined;
    const animation = el.animate(piece.frames, {
      duration: piece.duration * 1000,
      delay: piece.delay * 1000,
      easing: 'linear',
      fill: 'both',
    });
    return () => animation.cancel();
  }, [piece]);

  return (
    <img
      ref={ref}
      src={piece.src}
      alt=""
      className="fl-piece"
      draggable="false"
      style={{ left: piece.x, top: piece.y, width: piece.size }}
    />
  );
}

export function FallingLeavesLayer({ pieces, portal = false, className = '' }) {
  const layer = (
    <div
      className={`fl-layer${portal ? ' fl-layer--page' : ''}${className ? ` ${className}` : ''}`}
      aria-hidden="true"
    >
      {pieces.map((p) => (
        <FallingPiece key={p.id} piece={p} />
      ))}
    </div>
  );

  if (portal) {
    if (typeof document === 'undefined') return null;
    return createPortal(layer, document.body);
  }
  return layer;
}
