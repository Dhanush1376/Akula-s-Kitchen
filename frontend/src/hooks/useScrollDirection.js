import { useState, useEffect } from 'react';

// Global singleton state for scroll tracking
let globalScrollDirection = 'up';
let globalIsAtTop = true;
let ticking = false;
let lastScrollY = typeof window !== 'undefined' ? window.scrollY : 0;
const listeners = new Set();

let isProgrammaticScroll = false;
let programmaticScrollTimeout = null;

export function lockScrollDirection(direction, duration = 800) {
  globalScrollDirection = direction;
  if (direction === 'down') {
    globalIsAtTop = false;
  }
  isProgrammaticScroll = true;
  listeners.forEach((listener) =>
    listener({ scrollDirection: globalScrollDirection, isAtTop: globalIsAtTop }),
  );
  if (programmaticScrollTimeout) clearTimeout(programmaticScrollTimeout);
  programmaticScrollTimeout = setTimeout(() => {
    isProgrammaticScroll = false;
    lastScrollY = typeof window !== 'undefined' ? window.scrollY : 0;
  }, duration);
}

const updateScrollDirection = () => {
  const scrollY = typeof window !== 'undefined' ? Math.max(0, window.scrollY) : 0;

  // Near the top of the page (within 40px), navbar is always at the top and marked 'up'
  const currentIsAtTop = scrollY < 40;

  let currentScrollDirection = globalScrollDirection;

  if (currentIsAtTop) {
    currentScrollDirection = 'up';
    lastScrollY = scrollY;
  } else if (!isProgrammaticScroll) {
    const delta = scrollY - lastScrollY;
    // Lower threshold for upward scroll (-4px) so going back upwards reveals the navbar immediately
    if (delta <= -4) {
      currentScrollDirection = 'up';
      lastScrollY = scrollY;
    } else if (delta >= 8) {
      currentScrollDirection = 'down';
      lastScrollY = scrollY;
    }
  }

  // Check if anything actually changed
  if (currentIsAtTop !== globalIsAtTop || currentScrollDirection !== globalScrollDirection) {
    globalIsAtTop = currentIsAtTop;
    globalScrollDirection = currentScrollDirection;

    // Notify all listeners
    listeners.forEach((listener) =>
      listener({ scrollDirection: globalScrollDirection, isAtTop: globalIsAtTop }),
    );
  }

  ticking = false;
};

const onScroll = () => {
  if (!ticking) {
    window.requestAnimationFrame(updateScrollDirection);
    ticking = true;
  }
};

// Only attach the window listener once
if (typeof window !== 'undefined') {
  window.addEventListener('scroll', onScroll, { passive: true });
}

export function resetScrollDirection() {
  globalScrollDirection = 'up';
  const currentY = typeof window !== 'undefined' ? Math.max(0, window.scrollY) : 0;
  globalIsAtTop = currentY < 40;
  lastScrollY = currentY;
  isProgrammaticScroll = false;
  listeners.forEach((listener) =>
    listener({ scrollDirection: globalScrollDirection, isAtTop: globalIsAtTop }),
  );
}

export function useScrollDirection() {
  const [state, setState] = useState({
    scrollDirection: globalScrollDirection,
    isAtTop: globalIsAtTop,
  });

  useEffect(() => {
    // Initial sync in case it changed before mount
    setState({
      scrollDirection: globalScrollDirection,
      isAtTop: globalIsAtTop,
    });

    listeners.add(setState);
    return () => {
      listeners.delete(setState);
    };
  }, []);

  return state;
}
