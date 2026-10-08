/**
 * Spelling-tolerant matching for the search panel. When the server finds nothing (a typo,
 * a regional spelling like "avakaya" for "avakaaya"), the panel ranks the catalogue it
 * already has against the query by edit distance, so the closest products and categories
 * can still be offered.
 */

const normalize = (s) =>
  String(s || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/** Damerau-Levenshtein distance (insert, delete, substitute, swap adjacent letters). */
function editDistance(a, b) {
  const rows = a.length + 1;
  const cols = b.length + 1;
  const d = Array.from({ length: rows }, (_, i) => [i, ...Array(cols - 1).fill(0)]);
  for (let j = 0; j < cols; j += 1) d[0][j] = j;
  for (let i = 1; i < rows; i += 1) {
    for (let j = 1; j < cols; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
    }
  }
  return d[a.length][b.length];
}

/** 0..1 similarity between one typed word and one catalogue word. */
function wordSimilarity(typed, word) {
  if (!typed || !word) return 0;
  if (word === typed) return 1;
  // Typing the start of a word ("gon" -> "gongura") is a strong match
  if (typed.length >= 2 && word.startsWith(typed)) return 0.9 + 0.1 * (typed.length / word.length);
  if (typed.length >= 3 && word.includes(typed)) return 0.8;
  // Compare against the word cut to the typed length too, so partial typos still count
  const whole = 1 - editDistance(typed, word) / Math.max(typed.length, word.length);
  const head = word.slice(0, Math.max(typed.length, 3));
  const partial = 1 - editDistance(typed, head) / Math.max(typed.length, head.length);
  return Math.max(whole, partial * 0.9);
}

/** 0..1 score for how well the query matches a list of terms (name, category, tags). */
export function matchScore(query, terms) {
  const typed = normalize(query).split(' ').filter(Boolean);
  if (!typed.length) return 0;
  const words = terms.flatMap((t) => normalize(t).split(' ')).filter((w) => w.length > 1);
  if (!words.length) return 0;
  const perWord = typed.map((t) => Math.max(...words.map((w) => wordSimilarity(t, w))));
  return perWord.reduce((sum, s) => sum + s, 0) / perWord.length;
}

/**
 * Rank items against the query. `getTerms(item)` returns the strings to match on.
 * Only reasonably close matches are kept, best first.
 */
export function fuzzyRank(query, items, getTerms, { threshold = 0.6, limit = 6 } = {}) {
  const q = normalize(query);
  if (q.length < 2) return [];
  // Short queries get less slack: one wrong letter in three is a big change
  const minScore = q.length <= 3 ? Math.max(threshold, 0.75) : threshold;
  return items
    .map((item) => ({ item, score: matchScore(q, getTerms(item)) }))
    .filter((r) => r.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
