import React from 'react';

/**
 * AuthCornerLeaves
 * Organic, wind-blown multi-leaf effect for the Auth Modal.
 * Leaves drift naturally with random wind gusts, diverse leaf/petal sprites,
 * and varying 3D tilts, sways, and velocities.
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
const randomSign = () => (Math.random() < 0.5 ? -1 : 1);
const TAU = Math.PI * 2;

function generateFallFrames({ fall, drift, isPetal }) {
  const swings = rand(2.1, 3.7);
  const swing = rand(16, 34) * (isPetal ? 1.25 : 1);
  const rock = rand(20, 38);
  const tilt = rand(-32, 32);
  const tumble = Math.random() < 0.28 ? randomSign() * rand(130, 270) : 0;
  const turn = Math.min(rand(24, 48) * (isPetal ? 1.2 : 1), 60);
  const phase = rand(0, TAU);
  const ramp = 0.12;

  const frames = [];
  const steps = 60;
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    const p = phase + TAU * swings * t;
    const descent = (t < ramp ? (t * t) / (2 * ramp) : t - ramp / 2) / (1 - ramp / 2);
    const open = Math.min(1, 0.3 + t * 2.5);
    // Drift carries the leaf naturally across with wind, plus wave sways
    const x = drift * (1 - (1 - t) ** 2) + swing * open * Math.sin(p);
    const y = fall * descent - 8 * open * Math.sin(p) ** 2;
    const r = tilt + rock * open * Math.cos(p) + tumble * t;
    const turnY = turn * Math.sin(p + 0.7);
    const turnX = 10 * Math.cos(p * 0.5 + phase);
    const opacity = t < 0.08 ? (t / 0.08) * 0.85 : t > 0.82 ? ((1 - t) / 0.18) * 0.85 : 0.85;

    frames.push({
      offset: t,
      opacity: Math.max(0, Math.min(1, opacity)),
      transform: `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0) perspective(300px) rotate(${r.toFixed(2)}deg) rotateY(${turnY.toFixed(2)}deg) rotateX(${turnX.toFixed(2)}deg)`,
    });
  }
  return frames;
}

let nextLeafId = 1;

function createRandomLeaf(id, initialProgress = 0) {
  const isPetal = Math.random() < 0.2;
  const src = isPetal
    ? PETAL_SPRITES[Math.floor(Math.random() * PETAL_SPRITES.length)]
    : LEAF_SPRITES[Math.floor(Math.random() * LEAF_SPRITES.length)];

  // Vary starting points across the corner curve
  const startX = rand(-8, 48);
  const startY = rand(-16, 12);
  const fall = rand(300, 440);
  // Natural wind blows rightwards and downward into the card with slight variations
  const drift = rand(25, 120);
  const duration = rand(7.8, 12.2);
  const size = isPetal ? rand(13, 19) : rand(14, 23);
  const frames = generateFallFrames({ fall, drift, isPetal });

  return {
    id,
    src,
    startX,
    startY,
    size,
    duration,
    delay: initialProgress > 0 ? 0 : rand(0, 0.7),
    frames,
    initialProgress,
  };
}

function AnimatedLeaf({ piece, onFinish }) {
  const ref = React.useRef(null);

  React.useLayoutEffect(() => {
    const el = ref.current;
    if (!el || !el.animate) return undefined;

    let anim;
    try {
      anim = el.animate(piece.frames, {
        duration: piece.duration * 1000,
        delay: (piece.delay || 0) * 1000,
        easing: 'linear',
        fill: 'both',
      });

      if (piece.initialProgress > 0) {
        anim.currentTime = piece.initialProgress * piece.duration * 1000;
      }

      anim.onfinish = () => {
        onFinish(piece.id);
      };
    } catch (e) {
      // Ignored if cancelled
    }

    return () => {
      try {
        if (anim) anim.cancel();
      } catch (e) {}
    };
  }, [piece, onFinish]);

  return (
    <img
      ref={ref}
      src={piece.src}
      alt=""
      draggable="false"
      className="absolute top-0 pointer-events-none select-none drop-shadow-[0_2px_3px_rgba(40,54,24,0.12)]"
      style={{
        left: `${piece.startX}px`,
        top: `${piece.startY}px`,
        width: `${piece.size}px`,
        opacity: 0,
        willChange: 'transform, opacity',
      }}
    />
  );
}

export function AuthCornerLeaves() {
  const [pieces, setPieces] = React.useState(() => {
    if (
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    ) {
      return [];
    }
    // Staggered flight progress on initial load so modal starts with active breeze
    return [
      createRandomLeaf(nextLeafId++, 0.16),
      createRandomLeaf(nextLeafId++, 0.38),
      createRandomLeaf(nextLeafId++, 0.64),
      createRandomLeaf(nextLeafId++, 0.86),
    ];
  });

  const handleFinish = React.useCallback((finishedId) => {
    setPieces((prev) => {
      const filtered = prev.filter((p) => p.id !== finishedId);
      const newLeaf = createRandomLeaf(nextLeafId++, 0);
      newLeaf.delay = rand(0.3, 1.4);
      return [...filtered, newLeaf];
    });
  }, []);

  // Periodic natural breeze gust that adds an occasional leaf up to 6 concurrent
  React.useEffect(() => {
    if (
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    ) {
      return;
    }

    const interval = setInterval(() => {
      setPieces((prev) => {
        if (prev.length < 6) {
          const fresh = createRandomLeaf(nextLeafId++, 0);
          return [...prev, fresh];
        }
        return prev;
      });
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div
      className="absolute inset-0 pointer-events-none select-none overflow-hidden z-0"
      aria-hidden="true"
    >
      <style>{`
        @keyframes authLeafRustle {
          0%, 100% {
            transform: rotate(-12deg) scale(1);
          }
          50% {
            transform: rotate(-9deg) scale(1.02);
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .auth-corner-leaf-foliage {
            animation: none !important;
          }
        }
      `}</style>

      {/* Corner foliage accent anchored at top-left curve with subtle ambient wind rustle */}
      <div className="auth-corner-leaf-foliage absolute -top-3 -left-3 w-14 sm:w-16 md:w-17 pointer-events-none opacity-85 transition-transform duration-700 animate-[authLeafRustle_7s_ease-in-out_infinite]">
        <img
          src="/wishlist/banana-leaf.webp"
          alt=""
          className="w-full h-auto drop-shadow-[0_2px_4px_rgba(40,54,24,0.12)] select-none"
          draggable="false"
        />
      </div>

      {/* Dynamic multi-leaf randomized wind-blown particles */}
      {pieces.map((piece) => (
        <AnimatedLeaf key={piece.id} piece={piece} onFinish={handleFinish} />
      ))}
    </div>
  );
}
