import { Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { SEARCH_HINTS } from './categoryIcons';
import './searchOverlay.css';

/**
 * The search pill in the header. Its placeholder rolls through real things people look
 * for, so it reads as an invitation rather than a blank box. Tapping anywhere opens the
 * search panel.
 */
export function SearchTrigger({ onOpen }) {
  const [hint, setHint] = useState(0);

  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return undefined;
    const timer = window.setInterval(() => setHint((i) => (i + 1) % SEARCH_HINTS.length), 2600);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div
      onClick={() => onOpen('text')}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen('text');
        }
      }}
      className="st-pill group"
      role="button"
      tabIndex={0}
      aria-label="Search batters, pickles, snacks"
    >
      <span className="st-pill__icon" aria-hidden="true">
        <Search size={16} strokeWidth={2.2} />
      </span>
      <span className="st-pill__text" aria-hidden="true">
        <span className="st-pill__lead">Search</span>
        <span className="st-pill__roll">
          <span key={hint} className="st-pill__word">
            {SEARCH_HINTS[hint]}
          </span>
        </span>
      </span>
      <kbd className="st-pill__kbd" aria-hidden="true">
        /
      </kbd>
    </div>
  );
}
