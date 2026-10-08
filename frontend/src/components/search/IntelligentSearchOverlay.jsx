import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Clock,
  Flame,
  Mic,
  Search,
  SearchX,
  Sparkles,
  TrendingUp,
  X,
} from 'lucide-react';
import { m as motion, AnimatePresence } from 'framer-motion';
import { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { useCategories, useProducts } from '../../hooks/useProductQueries';
import { useSearch } from '../../hooks/useSearchQueries';
import logger from '../../utils/core/logger';
import { CloudinaryImage } from '../ui/CloudinaryImage';
import { ProductCard } from '../shared/ProductCard';
import { SEARCH_HINTS, categoryIcon } from './categoryIcons';
import { fuzzyRank } from './fuzzyMatch';
import { formatPrice, highlightMatch } from './searchUtils';
import './searchOverlay.css';

/**
 * Search panel. One layout on phones (full screen) and desktop (a floating sheet):
 *   - a large input with a rolling placeholder, clear and voice buttons
 *   - a row of category chips that is always one tap away
 *   - before typing: recent searches, what's popular, trending products, categories
 *   - while typing: grouped, highlighted results that animate in, with a live preview of
 *     the highlighted product on desktop and a sticky "see all results" action
 *   - no results: suggestions instead of a dead end
 * Data, keyboard navigation and recents all come from useSearchOverlay.
 */

const SPEECH_SUPPORTED =
  typeof window !== 'undefined' &&
  ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window);

function useVoiceSearch(setQuery, onFinal) {
  const recognitionRef = useRef(null);
  const transcriptRef = useRef('');
  const [isRecording, setIsRecording] = useState(false);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
    setIsRecording(false);
  }, []);

  const start = useCallback(() => {
    if (!SPEECH_SUPPORTED) {
      toast.error("Voice search isn't supported in this browser. Try Chrome or Safari.");
      return;
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    transcriptRef.current = '';
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-IN';
    recognition.onstart = () => setIsRecording(true);
    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((result) => result[0].transcript)
        .join('');
      transcriptRef.current = transcript;
      setQuery(transcript);
    };
    recognition.onerror = (event) => {
      logger.error('Speech recognition error: ', event.error);
      if (event.error === 'not-allowed') {
        toast.error('Allow microphone access to search by voice.');
      }
      setIsRecording(false);
    };
    recognition.onend = () => {
      setIsRecording(false);
      if (transcriptRef.current.trim()) onFinal?.(transcriptRef.current.trim());
    };
    try {
      recognition.start();
    } catch (err) {
      logger.error('Failed to start speech recognition: ', err);
    }
  }, [setQuery, onFinal]);

  useEffect(() => () => recognitionRef.current?.abort?.(), []);

  return { isRecording, toggle: isRecording ? stop : start };
}

function SectionLabel({ icon: Icon, children, action }) {
  return (
    <div className="so-label">
      <span className="so-label__text">
        {Icon && <Icon size={14} strokeWidth={2} aria-hidden="true" />}
        {children}
      </span>
      {action}
    </div>
  );
}

function CategoryChips({ categories, highlighted, onPick }) {
  if (!categories.length) return null;
  const highlight = new Set(highlighted.map((c) => String(c).toLowerCase()));
  return (
    <nav className="so-chips" aria-label="Browse categories">
      {categories.map((name, i) => {
        const Icon = categoryIcon(name);
        const isMatch = highlight.has(String(name).toLowerCase());
        return (
          <button
            key={name}
            type="button"
            onClick={() => onPick(name)}
            className={`so-chip${isMatch ? ' so-chip--match' : ''}`}
            style={{ '--i': i }}
          >
            <Icon size={14} strokeWidth={1.9} aria-hidden="true" />
            {name}
          </button>
        );
      })}
    </nav>
  );
}

function Discovery({
  categories,
  recentSearches,
  trendingSearches,
  discoveryData,
  onSearch,
  onRemoveRecent,
  onClearRecent,
  onPickCategory,
  onOpenProduct,
}) {
  // Popular searches that are just category names repeat the tiles below, so skip them
  const categorySet = new Set(categories.map((c) => String(c).toLowerCase()));
  const popular = (trendingSearches || []).filter(
    (term) => term?.query && !categorySet.has(String(term.query).toLowerCase()),
  );

  const products = (
    discoveryData?.popularProducts?.length
      ? discoveryData.popularProducts
      : discoveryData?.newArrivals || []
  ).slice(0, 8);

  return (
    <div className="so-discover">
      {recentSearches.length > 0 && (
        <section className="so-block" style={{ '--i': 0 }}>
          <SectionLabel
            icon={Clock}
            action={
              <button type="button" className="so-link" onClick={onClearRecent}>
                Clear
              </button>
            }
          >
            Recent
          </SectionLabel>
          <div className="so-recent">
            {recentSearches.slice(0, 8).map((term) => (
              <span key={term} className="so-recent__chip">
                <button type="button" onClick={() => onSearch(term)} className="so-recent__term">
                  {term}
                </button>
                <button
                  type="button"
                  onClick={() => onRemoveRecent(term)}
                  className="so-recent__x"
                  aria-label={`Remove ${term} from recent searches`}
                >
                  <X size={11} strokeWidth={2.4} />
                </button>
              </span>
            ))}
          </div>
        </section>
      )}

      {popular.length > 0 && (
        <section className="so-block" style={{ '--i': 1 }}>
          <SectionLabel icon={TrendingUp}>Popular right now</SectionLabel>
          <ol className="so-popular">
            {popular.slice(0, 6).map((term, idx) => (
              <li key={term.query || idx}>
                <button
                  type="button"
                  onClick={() => onSearch(term.query)}
                  className="so-popular__row"
                >
                  <span className="so-popular__rank">{idx + 1}</span>
                  <span className="so-popular__term">{term.query}</span>
                  <ArrowUpRight
                    size={16}
                    strokeWidth={2}
                    className="so-popular__go"
                    aria-hidden="true"
                  />
                </button>
              </li>
            ))}
          </ol>
        </section>
      )}

      {products.length > 0 && (
        <section className="so-block" style={{ '--i': 2 }}>
          <SectionLabel icon={Flame}>Trending in the kitchen</SectionLabel>
          <div className="so-cards">
            {products.map((product) => (
              <button
                key={product.id}
                type="button"
                onClick={() => onOpenProduct(product)}
                className="so-card"
              >
                <span className="so-card__img">
                  {product.image && (
                    <CloudinaryImage
                      src={product.image}
                      alt=""
                      className="w-full h-full object-cover"
                      containerClassName="w-full h-full"
                      width={240}
                      height={240}
                    />
                  )}
                </span>
                <span className="so-card__name">{product.title}</span>
                {product.price > 0 && (
                  <span className="so-card__price">{formatPrice(product.price)}</span>
                )}
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

/** One plain suggestion: a search icon and the words, nothing more. */
function SuggestionRow({ id, label, query, index, isActive, hint, onClick, onHover }) {
  return (
    <button
      type="button"
      id={id}
      data-suggestion
      role="option"
      aria-selected={Boolean(isActive)}
      onClick={onClick}
      onMouseEnter={onHover}
      className={`so-sug${isActive ? ' is-active' : ''}`}
      style={{ '--i': index }}
    >
      <Search size={14} strokeWidth={2.2} className="so-sug__icon" aria-hidden="true" />
      <span className="so-sug__text">{query ? highlightMatch(label, query) : label}</span>
      {hint && <span className="so-sug__hint">{hint}</span>}
    </button>
  );
}

/** Small note beside a suggestion, only when it adds something: the size asked for, or stock. */
const suggestionHint = (item) => {
  if (item.type !== 'product') return '';
  if (item.stockStatus === 'out_of_stock') return 'Out of stock';
  return item.matchedWeight || '';
};

function Results({ suggestions, query, activeIndex, setActiveIndex, onSelect, isMobile }) {
  return (
    <section className="so-group">
      <div className="so-group__header">SUGGESTIONS</div>
      <div className="so-sugs">
        {suggestions.map((item, index) => {
          const isRowActive = activeIndex === index || (activeIndex === -1 && index === 0);
          return (
            <SuggestionRow
              key={item.id}
              id={`so-opt-${index}`}
              label={item.title}
              query={query}
              index={index}
              isActive={isRowActive}
              hint={suggestionHint(item)}
              onClick={() => onSelect(item)}
              onHover={isMobile ? undefined : () => setActiveIndex(index)}
            />
          );
        })}
      </div>
    </section>
  );
}

/** Product results shown directly inside the searchbar overlay using the store's ProductCard */
function SearchResultsView({
  query,
  products = [],
  loading = false,
  onCloseOverlay,
  onBackToSuggestions,
  suggestions = [],
  onPickSuggestion,
}) {
  return (
    <div className="so-results-wrap">
      <div className="so-results-head">
        <div className="so-results-head__left">
          <span className="so-results-head__title">
            Results for <strong>“{query}”</strong>
          </span>
          {!loading && (
            <span className="so-results-head__count">
              {products.length} {products.length === 1 ? 'item' : 'items'}
            </span>
          )}
        </div>
        <button type="button" onClick={onBackToSuggestions} className="so-results-head__back">
          Suggestions
        </button>
      </div>

      {loading && products.length === 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-x-2.5 sm:gap-x-4 gap-y-6 sm:gap-y-8">
          {[0, 1, 2, 3].map((i) => (
            <ProductCard key={i} loading={true} />
          ))}
        </div>
      ) : products.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-x-2.5 sm:gap-x-4 gap-y-6 sm:gap-y-8">
          {products.map((product, index) => (
            <div
              key={product.id || product._id || index}
              onClickCapture={(e) => {
                if (e.target.closest('button') || e.target.closest('[role="button"]')) {
                  return;
                }
                onCloseOverlay?.();
              }}
            >
              <ProductCard
                {...product}
                imageSrc={product.imageSrc || product.image}
                eager={index < 4}
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="so-results-empty">
          <div className="so-results-empty__icon">
            <SearchX size={36} strokeWidth={1.8} />
          </div>
          <h4 className="so-results-empty__title">No items found for “{query}”</h4>
          <p className="so-results-empty__desc">
            Try checking for typos or explore related kitchen items below.
          </p>
          {suggestions.length > 0 && (
            <div className="so-results-empty__chips">
              {suggestions.slice(0, 6).map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className="so-results-empty__chip"
                  onClick={() => onPickSuggestion(s)}
                >
                  <Search size={12} strokeWidth={2} />
                  {s.title}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ResultSkeleton() {
  return (
    <section className="so-group" aria-hidden="true">
      <div className="so-group__header">SUGGESTIONS</div>
      <div className="so-sugs">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="so-sug so-sug--skeleton">
            <span className="so-skel so-skel--title" />
          </div>
        ))}
      </div>
    </section>
  );
}

const productCategory = (p) => p?.category?.name || p?.categoryName || p?.category || '';

/**
 * Nothing matched on the server. Say so in one line, then offer the closest things in the
 * catalogue, ranked by spelling similarity (so "avakaya" still leads somewhere), or popular
 * picks when nothing is close, in the same plain list as normal suggestions.
 */
function NoResults({
  query,
  catalogue,
  serverFallback,
  categories,
  onSearch,
  onPickCategory,
  onOpenProduct,
}) {
  const products = fuzzyRank(query, catalogue, (p) => [
    p.title || p.name,
    productCategory(p),
    ...(Array.isArray(p.tags) ? p.tags : []),
  ]).map((r) => r.item);
  const closeCategories = fuzzyRank(query, categories, (c) => [c], { limit: 3 }).map((r) => r.item);
  const suggestion = products[0]?.title || products[0]?.name || closeCategories[0] || '';
  const hasClose = products.length > 0 || closeCategories.length > 0;

  // Nothing close: the server's popular in-stock picks, or a few from the catalogue
  const fallbackProducts = hasClose
    ? []
    : serverFallback.length
      ? serverFallback.slice(0, 4)
      : catalogue.slice(0, 4);

  const rows = [
    ...[...products, ...fallbackProducts].map((p) => ({
      key: `p:${p.id || p._id}`,
      label: p.title || p.name,
      onClick: () => onOpenProduct({ id: p.id || p._id, slug: p.slug }),
    })),
    ...closeCategories.map((name) => ({
      key: `c:${name}`,
      label: name,
      onClick: () => onPickCategory(name),
    })),
  ].slice(0, 6);

  return (
    <div className="so-none">
      <p className="so-none__head">
        <SearchX size={16} strokeWidth={2} aria-hidden="true" />
        No results for <strong>“{query}”</strong>
      </p>

      {suggestion && (
        <button type="button" className="so-dym" onClick={() => onSearch(suggestion)}>
          <Sparkles size={15} strokeWidth={2} aria-hidden="true" />
          Did you mean <strong>{suggestion}</strong>?
        </button>
      )}

      {rows.length > 0 && (
        <section className="so-group">
          <div className="so-group__header">{hasClose ? 'CLOSEST MATCHES' : 'TRY THESE'}</div>
          <div className="so-sugs">
            {rows.map((row, i) => (
              <SuggestionRow
                key={row.key}
                label={row.label}
                index={i}
                isActive={i === 0}
                onClick={row.onClick}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

export function IntelligentSearchOverlay({
  isOpen,
  initialMode = 'text',
  query,
  setQuery,
  isShowingResults: propIsShowingResults,
  setIsShowingResults: propSetIsShowingResults,
  suggestions,
  predictedCategories,
  trendingSearches,
  discoveryData,
  recentSearches,
  loading,
  activeIndex,
  setActiveIndex,
  onClose,
  onKeyDown,
  onSelectSuggestion,
  onExecuteSearch,
  onRemoveRecent,
  onClearRecent,
  correctedQuery,
  searchMeta = {},
  searchError = false,
}) {
  const isMobile = useMediaQuery('(max-width: 767px)');
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const panelRef = useRef(null);
  const [hint, setHint] = useState(0);
  const [isFocused, setIsFocused] = useState(false);
  const [internalShowingResults, setInternalShowingResults] = useState(false);

  const isShowingResults =
    propIsShowingResults !== undefined ? propIsShowingResults : internalShowingResults;
  const setIsShowingResults =
    propSetIsShowingResults !== undefined ? propSetIsShowingResults : setInternalShowingResults;

  const { data: categories = [] } = useCategories({ enabled: isOpen });
  // The catalogue, for spelling-tolerant matching when the server finds nothing
  const { data: catalogueData } = useProducts({ limit: 100 }, { enabled: isOpen });
  const catalogue = useMemo(() => {
    return (
      catalogueData?.data ||
      catalogueData?.products ||
      catalogueData?.items ||
      (Array.isArray(catalogueData) ? catalogueData : [])
    );
  }, [catalogueData]);

  const { isRecording, toggle: toggleVoice } = useVoiceSearch(setQuery);

  const trimmed = query.trim();
  const hasQuery = trimmed.length >= 1;

  // Full product search query for in-overlay results
  const { data: searchResults, isLoading: isSearchLoading } = useSearch(trimmed, {
    enabled: isOpen && hasQuery,
  });

  const productResults = useMemo(() => {
    const list = searchResults?.items || [];
    const sourceList = list.length > 0 ? list : suggestions.filter((s) => s.type === 'product');

    const catalogueMap = new Map();
    catalogue.forEach((p) => {
      if (p._id) catalogueMap.set(String(p._id), p);
      if (p.id) catalogueMap.set(String(p.id), p);
      if (p.slug) catalogueMap.set(String(p.slug), p);
      if (p.title) catalogueMap.set(String(p.title).trim().toLowerCase(), p);
      if (p.name) catalogueMap.set(String(p.name).trim().toLowerCase(), p);
    });

    let finalSource = sourceList;
    if (finalSource.length === 0 && trimmed.length >= 1) {
      const qLower = trimmed.toLowerCase();
      finalSource = catalogue.filter((p) => {
        const cat = (productCategory(p) || '').toLowerCase();
        const t = (p.title || p.name || '').toLowerCase();
        return cat === qLower || cat.includes(qLower) || t.includes(qLower);
      });
    }

    return finalSource.map((item) => {
      const fromCat =
        catalogueMap.get(String(item.id || '')) ||
        catalogueMap.get(String(item._id || '')) ||
        catalogueMap.get(String(item.slug || '')) ||
        catalogueMap.get(
          String(item.title || item.name || '')
            .trim()
            .toLowerCase(),
        );

      if (fromCat) {
        return {
          ...fromCat,
          ...item,
          id: fromCat.id || fromCat._id || item.id || item._id,
          _id: fromCat._id || fromCat.id || item._id || item.id,
          title: fromCat.title || fromCat.name || item.title || item.name,
          imageSrc: fromCat.imageSrc || item.imageSrc || item.image,
          images: fromCat.images || fromCat.gallery || (item.image ? [item.image] : []),
          gallery: fromCat.gallery || fromCat.images || (item.image ? [item.image] : []),
          optionGroups: fromCat.optionGroups || item.optionGroups || [],
          stock: fromCat.stock !== undefined ? fromCat.stock : item.stock,
          primaryCategory: fromCat.primaryCategory || fromCat.category || item.category,
          category: fromCat.category || fromCat.primaryCategory || item.category,
          rating: fromCat.rating !== undefined ? fromCat.rating : item.rating,
          reviews: fromCat.reviews !== undefined ? fromCat.reviews : item.reviews,
          price: fromCat.price !== undefined ? fromCat.price : item.price,
          oldPrice: fromCat.oldPrice || fromCat.strikingPrice || item.oldPrice,
          badges: fromCat.badges || item.badges || [],
        };
      }
      return {
        ...item,
        id: item.id || item._id,
        _id: item._id || item.id,
        imageSrc: item.imageSrc || item.image,
      };
    });
  }, [searchResults?.items, suggestions, catalogue, trimmed]);

  const showResults = hasQuery && suggestions.length > 0;
  const showSkeleton = hasQuery && loading && suggestions.length === 0;
  const showNoResults = hasQuery && !loading && !searchError && suggestions.length === 0;
  const showError = hasQuery && !loading && searchError && suggestions.length === 0;
  const productCount = suggestions.filter((s) => s.type === 'product').length;
  // A confident spelling fix is already applied to the results; a less sure one is a question
  const showCorrection =
    hasQuery && correctedQuery && trimmed.toLowerCase() !== correctedQuery.toLowerCase();
  const correctionApplied = showCorrection && searchMeta.correctionLevel === 'high' && productCount;

  const handlePickSuggestion = useCallback(
    (item) => {
      onSelectSuggestion(item);
      setIsShowingResults(true);
    },
    [onSelectSuggestion, setIsShowingResults],
  );

  const searchFor = useCallback(
    (term) => {
      setQuery(term);
      onExecuteSearch(term);
      setIsShowingResults(true);
    },
    [setQuery, onExecuteSearch, setIsShowingResults],
  );

  const pickCategory = useCallback(
    (name) => {
      onSelectSuggestion({ id: `cat:${name}`, title: name, type: 'category' });
      setIsShowingResults(true);
    },
    [onSelectSuggestion, setIsShowingResults],
  );

  const openProduct = useCallback(
    (product) => {
      onClose();
      navigate(`/product/${product.slug || product.id}`);
    },
    [onClose, navigate],
  );

  // Rolling placeholder while the box is empty
  useEffect(() => {
    if (!isOpen) {
      setIsFocused(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || query) return undefined;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return undefined;
    const timer = window.setInterval(() => setHint((i) => (i + 1) % SEARCH_HINTS.length), 2600);
    return () => window.clearInterval(timer);
  }, [isOpen, query]);

  // Focus the input on open, or go straight into voice search when opened from the mic
  useEffect(() => {
    if (!isOpen) return undefined;
    const timer = window.setTimeout(() => {
      inputRef.current?.focus();
      if (initialMode === 'voice') toggleVoice();
    }, 120);
    return () => window.clearTimeout(timer);
    // toggleVoice only matters on open
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, initialMode]);

  // Keep Tab inside the panel
  useEffect(() => {
    if (!isOpen) return undefined;
    const handleTab = (e) => {
      if (e.key !== 'Tab' || !panelRef.current) return;
      const focusable = panelRef.current.querySelectorAll(
        'button, [href], input, [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        last.focus();
        e.preventDefault();
      } else if (!e.shiftKey && document.activeElement === last) {
        first.focus();
        e.preventDefault();
      }
    };
    window.addEventListener('keydown', handleTab);
    return () => window.removeEventListener('keydown', handleTab);
  }, [isOpen]);

  // Keep the highlighted result in view while using the arrow keys
  useEffect(() => {
    if (activeIndex < 0 || !listRef.current) return;
    const rows = listRef.current.querySelectorAll('[data-suggestion]');
    const target = [...rows].find(
      (row) => Number(row.style.getPropertyValue('--i')) === activeIndex,
    );
    target?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  const panelMotion = isMobile
    ? { initial: { opacity: 0, y: 24 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: 24 } }
    : {
        initial: { opacity: 0, y: -18, scale: 0.98 },
        animate: { opacity: 1, y: 0, scale: 1 },
        exit: { opacity: 0, y: -12, scale: 0.98 },
      };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="so-root"
          role="dialog"
          aria-modal="true"
          aria-label="Search"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {!isMobile && <div className="so-backdrop" onClick={onClose} aria-hidden="true" />}

          <motion.div
            ref={panelRef}
            className="so-panel"
            {...panelMotion}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
          >
            {/* Search field */}
            <div className="so-bar">
              {isMobile && (
                <button
                  type="button"
                  onClick={() => {
                    if (isShowingResults) {
                      setIsShowingResults(false);
                    } else {
                      onClose();
                    }
                  }}
                  className="so-icon-btn"
                  aria-label={isShowingResults ? 'Back to suggestions' : 'Close search'}
                >
                  <ArrowLeft size={20} strokeWidth={2} />
                </button>
              )}
              <label className={`so-field${isRecording ? ' is-listening' : ''}`}>
                <Search size={19} strokeWidth={2.1} className="so-field__icon" aria-hidden="true" />
                {!query && !isRecording && !isFocused && (
                  <span className="so-field__placeholder" aria-hidden="true">
                    Search for{' '}
                    <span className="so-field__roll">
                      <span key={hint} className="so-field__word">
                        {SEARCH_HINTS[hint]}
                      </span>
                    </span>
                  </span>
                )}
                {!query && isRecording && (
                  <span className="so-field__placeholder" aria-hidden="true">
                    Listening… try “idli batter”
                  </span>
                )}
                <input
                  ref={inputRef}
                  type="search"
                  enterKeyHint="search"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    if (isShowingResults) setIsShowingResults(false);
                  }}
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setIsFocused(false)}
                  onKeyDown={onKeyDown}
                  // search-portal-input opts out of the site-wide input underline/focus styles
                  className="so-field__input search-portal-input"
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck="false"
                  role="combobox"
                  aria-label="Search products and categories"
                  aria-autocomplete="list"
                  aria-expanded={showResults}
                  aria-controls="search-suggestions-list"
                  aria-activedescendant={
                    showResults && activeIndex >= 0 ? `so-opt-${activeIndex}` : undefined
                  }
                  maxLength={100}
                />
                {loading && hasQuery && <span className="so-field__spinner" aria-hidden="true" />}
                {query && (
                  <button
                    type="button"
                    onClick={() => {
                      setQuery('');
                      if (isShowingResults) setIsShowingResults(false);
                      inputRef.current?.focus();
                    }}
                    className="so-field__clear"
                    aria-label="Clear search"
                  >
                    <X size={15} strokeWidth={2.4} />
                  </button>
                )}
                <button
                  type="button"
                  onClick={toggleVoice}
                  className={`so-field__mic${isRecording ? ' is-on' : ''}`}
                  aria-label={isRecording ? 'Stop voice search' : 'Search by voice'}
                  aria-pressed={isRecording}
                >
                  {isRecording ? (
                    <span className="so-wave" aria-hidden="true">
                      <i />
                      <i />
                      <i />
                      <i />
                    </span>
                  ) : (
                    <Mic size={17} strokeWidth={2.2} />
                  )}
                </button>
              </label>
              {!isMobile && (
                <button
                  type="button"
                  onClick={onClose}
                  className="so-esc"
                  aria-label="Close search"
                >
                  esc
                </button>
              )}
            </div>

            <p className="sr-only" role="status" aria-live="polite">
              {hasQuery && !loading
                ? showNoResults
                  ? `No results for ${trimmed}`
                  : `${suggestions.length} suggestions available`
                : ''}
            </p>

            {/* Body */}
            <div className="so-body">
              <div ref={listRef} id="search-suggestions-list" role="listbox" className="so-list">
                {showCorrection && !showNoResults && (
                  <button
                    type="button"
                    className="so-dym"
                    onClick={() => searchFor(correctedQuery)}
                  >
                    <Sparkles size={15} strokeWidth={2} aria-hidden="true" />
                    {correctionApplied ? (
                      <>
                        Showing matches for <strong>{correctedQuery}</strong>
                      </>
                    ) : (
                      <>
                        Did you mean <strong>{correctedQuery}</strong>?
                      </>
                    )}
                  </button>
                )}

                {!hasQuery && (
                  <Discovery
                    categories={categories}
                    recentSearches={recentSearches}
                    trendingSearches={trendingSearches}
                    discoveryData={discoveryData}
                    onSearch={searchFor}
                    onRemoveRecent={onRemoveRecent}
                    onClearRecent={onClearRecent}
                    onPickCategory={pickCategory}
                    onOpenProduct={openProduct}
                  />
                )}

                {hasQuery && isShowingResults && (
                  <SearchResultsView
                    query={trimmed}
                    products={productResults}
                    loading={isSearchLoading}
                    onOpenProduct={openProduct}
                    onCloseOverlay={onClose}
                    onBackToSuggestions={() => setIsShowingResults(false)}
                    suggestions={suggestions}
                    onPickSuggestion={handlePickSuggestion}
                  />
                )}

                {hasQuery && !isShowingResults && showSkeleton && <ResultSkeleton />}

                {hasQuery && !isShowingResults && showResults && (
                  <Results
                    suggestions={suggestions}
                    query={trimmed}
                    activeIndex={activeIndex}
                    setActiveIndex={setActiveIndex}
                    onSelect={handlePickSuggestion}
                    isMobile={isMobile}
                  />
                )}

                {hasQuery && !isShowingResults && showError && (
                  <div className="so-none">
                    <p className="so-none__head">
                      <SearchX size={16} strokeWidth={2} aria-hidden="true" />
                      Suggestions are not loading right now
                    </p>
                    <button type="button" className="so-dym" onClick={() => onExecuteSearch(query)}>
                      <ArrowRight size={15} strokeWidth={2} aria-hidden="true" />
                      Search all products for <strong>“{trimmed}”</strong>
                    </button>
                  </div>
                )}

                {hasQuery && !isShowingResults && showNoResults && (
                  <NoResults
                    query={trimmed}
                    catalogue={catalogue}
                    serverFallback={searchMeta.fallbackProducts || []}
                    categories={categories}
                    onSearch={searchFor}
                    onPickCategory={pickCategory}
                    onOpenProduct={openProduct}
                  />
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default IntelligentSearchOverlay;
