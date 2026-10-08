import Product from '../../models/Product';
import Category from '../../models/Category';
import SearchSynonym from '../../models/SearchSynonym';
import logger from '../../config/logger';

/**
 * Catalogue-driven search understanding.
 *
 * Everything the search "knows" here comes from the live catalogue: category names, product
 * titles, product tags, the weights each product is actually sold in, and the synonym groups
 * an admin has configured (SearchSynonym). Nothing about specific products is hardcoded, so
 * adding a product or a tag in the admin makes it searchable — including misspellings of it —
 * once the vocabulary refreshes (TTL below, or immediately on reindex).
 *
 * The pure functions (normalize, correct, parse weight, rank) take a Vocabulary argument so
 * they can be unit tested without a database.
 */

export const MAX_QUERY_LENGTH = 100;
const VOCAB_TTL_MS = 5 * 60 * 1000;
const MAX_PRODUCTS = 5000;

// ── Types ──

export interface VocabWeight {
  label: string;
  grams: number;
  available: boolean;
}

export interface VocabProduct {
  id: string;
  title: string;
  slug: string;
  image?: string;
  price?: number;
  oldPrice?: number;
  category?: string;
  categorySlug?: string;
  tags: string[];
  stock: number;
  inStock: boolean;
  weights: VocabWeight[];
  popularity: number;
  titleNorm: string;
  titleWords: string[];
  tagWords: string[];
  tagPhrases: string[];
  categoryWords: string[];
}

export interface VocabCategory {
  name: string;
  slug: string;
  words: string[];
  productCount: number;
}

export interface Vocabulary {
  products: VocabProduct[];
  categories: VocabCategory[];
  /** Every searchable word in the catalogue with how often it appears. */
  words: Map<string, number>;
  /** Synonym groups (normalized phrases) configured in SearchSynonym. */
  synonymGroups: string[][];
  /** Every weight some product is sold in, keyed by grams. */
  weightGrams: Set<number>;
  /** Tags on most products; too broad to suggest as a related search. */
  genericTags: Set<string>;
  builtAt: number;
}

export type CorrectionLevel = 'none' | 'low' | 'medium' | 'high';
export type SearchIntent =
  | 'browse'
  | 'category'
  | 'product'
  | 'product_weight'
  | 'weight'
  | 'unknown';

export interface WeightIntent {
  grams: number;
  label: string;
  /** The words left once the weight is taken out ("dosa 500" → "dosa"). */
  residual: string;
  explicitUnit: boolean;
}

export interface QueryCorrection {
  corrected: string;
  confidence: number;
  level: CorrectionLevel;
  changes: { from: string; to: string; similarity: number }[];
}

export interface RankedProduct {
  id: string;
  title: string;
  slug: string;
  image?: string;
  price?: number;
  oldPrice?: number;
  category?: string;
  inStock: boolean;
  weights: VocabWeight[];
  matchedWeight?: string;
  score: number;
}

export interface CatalogSearchAnalysis {
  query: string;
  normalizedQuery: string;
  correctedQuery?: string;
  correctionConfidence: number;
  correctionLevel: CorrectionLevel;
  intent: SearchIntent;
  weight?: { label: string; grams: number; available: boolean };
  categories: { name: string; slug: string; productCount: number; score: number }[];
  products: RankedProduct[];
  related: string[];
  weights: { label: string; grams: number; productCount: number; selected: boolean }[];
  total: number;
  /** True when nothing matched and `products` holds closest/popular alternatives instead. */
  fallback: boolean;
}

// ── Text normalization ──

export function normalizeSearchText(input: string): string {
  return (
    String(input || '')
      .slice(0, MAX_QUERY_LENGTH * 2)
      .normalize('NFKD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      // Keep letters, digits, Telugu and Devanagari; a dot only inside a number (1.5kg)
      // eslint-disable-next-line no-misleading-character-class
      .replace(/[^a-z0-9.\sఀ-౿ऀ-ॿ]/g, ' ')
      .replace(/(?<!\d)\.|\.(?!\d)/g, ' ')
      // "500g" and "1kg" stay glued, but "dosa500" splits into "dosa 500"
      .replace(/([a-z])(\d)/g, '$1 $2')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, MAX_QUERY_LENGTH)
  );
}

const tokenize = (text: string) => normalizeSearchText(text).split(' ').filter(Boolean);

/** Damerau-Levenshtein distance (insert, delete, substitute, swap adjacent letters). */
export function editDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const d: number[][] = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i += 1) d[i][0] = i;
  for (let j = 0; j <= b.length; j += 1) d[0][j] = j;
  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
    }
  }
  return d[a.length][b.length];
}

/**
 * A rough sound-alike key for Indian food words written in English letters, where the same
 * word is spelt many ways: avakaaya / avakaya, podi / podee, gongura / gonguraa, chutney /
 * chatni. Vowel runs and doubled letters collapse, aspirated consonants lose their "h".
 */
export function phoneticKey(word: string): string {
  return word
    .replace(/[^a-z]/g, '')
    .replace(/ph/g, 'f')
    .replace(/([kgcjtdpbs])h/g, '$1')
    .replace(/w/g, 'v')
    .replace(/z/g, 'j')
    .replace(/q/g, 'k')
    .replace(/ck/g, 'k')
    .replace(/c/g, 'k')
    .replace(/(ee|ea|ie|ey)/g, 'i')
    .replace(/(oo|ou)/g, 'u')
    .replace(/y$/g, 'i')
    .replace(/(.)\1+/g, '$1');
}

/** 0..1 similarity between one typed word and one catalogue word. */
export function tokenSimilarity(typed: string, word: string): number {
  if (!typed || !word) return 0;
  if (typed === word) return 1;
  if (word.startsWith(typed)) {
    // One letter is only a hint; longer prefixes ("gon" → "gongura") are strong
    return typed.length === 1 ? 0.6 : 0.85 + 0.15 * (typed.length / word.length);
  }
  if (typed.length < 3) return 0;
  if (word.length >= 3 && typed.startsWith(word) && typed.length - word.length <= 2) return 0.9;
  if (word.includes(typed)) return 0.75;
  if (phoneticKey(typed) === phoneticKey(word)) return 0.92;
  const whole = 1 - editDistance(typed, word) / Math.max(typed.length, word.length);
  let partial = 0;
  if (word.length > typed.length) {
    const head = word.slice(0, typed.length);
    partial = (1 - editDistance(typed, head) / typed.length) * 0.85;
  }
  const best = Math.max(whole, partial);
  // Short words need to be closer: one wrong letter in four is already a lot
  const floor = typed.length <= 4 ? 0.7 : 0.6;
  return best >= floor ? best * 0.9 : 0;
}

// ── Weights ──

const UNIT_GRAMS: Record<string, number> = {
  g: 1,
  gm: 1,
  gms: 1,
  gr: 1,
  gram: 1,
  grams: 1,
  kg: 1000,
  kgs: 1000,
  kilo: 1000,
  kilos: 1000,
  kilogram: 1000,
  kilograms: 1000,
};

export function formatWeight(grams: number): string {
  if (grams >= 1000) {
    const kg = Math.round((grams / 1000) * 100) / 100;
    return `${kg}kg`;
  }
  return `${Math.round(grams)}g`;
}

/** Grams for a weight label as admins type it: "250g", "1 Kg", "500 gms", "1.5kg". */
export function parseWeightLabel(label: string): number | null {
  const m = normalizeSearchText(label).match(/^(\d+(?:\.\d+)?)\s*([a-z]+)?$/);
  if (!m) return null;
  const unit = m[2] ? UNIT_GRAMS[m[2]] : undefined;
  if (m[2] && !unit) return null;
  const n = parseFloat(m[1]);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n * (unit || 1));
}

/**
 * Finds a weight in the query ("500g", "1 kg", "half kg", or a bare "500"). A bare number only
 * counts as a weight when some product is actually sold in that size, so "dosa 2" means 2kg
 * only if a 2kg pack exists.
 */
export function parseWeightIntent(query: string, knownGrams: Set<number>): WeightIntent | null {
  const text = normalizeSearchText(query);
  if (!text) return null;

  const words = text.split(' ');
  const consumed = new Set<number>();
  let grams: number | null = null;
  let explicitUnit = false;

  for (let i = 0; i < words.length && grams === null; i += 1) {
    const w = words[i];
    const next = words[i + 1];

    // "half kg", "quarter kg"
    if ((w === 'half' || w === 'quarter') && next && UNIT_GRAMS[next] === 1000) {
      grams = w === 'half' ? 500 : 250;
      explicitUnit = true;
      consumed.add(i).add(i + 1);
      break;
    }

    const glued = w.match(/^(\d+(?:\.\d+)?)([a-z]+)$/);
    if (glued && UNIT_GRAMS[glued[2]]) {
      grams = Math.round(parseFloat(glued[1]) * UNIT_GRAMS[glued[2]]);
      explicitUnit = true;
      consumed.add(i);
      break;
    }

    if (/^\d+(?:\.\d+)?$/.test(w)) {
      const n = parseFloat(w);
      if (next && UNIT_GRAMS[next]) {
        grams = Math.round(n * UNIT_GRAMS[next]);
        explicitUnit = true;
        consumed.add(i).add(i + 1);
        break;
      }
      // Bare number: try grams, then kilos, and keep it only if that size exists
      const asGrams = Math.round(n);
      const asKilos = Math.round(n * 1000);
      if (n >= 50 && knownGrams.has(asGrams)) grams = asGrams;
      else if (n <= 10 && knownGrams.has(asKilos)) grams = asKilos;
      if (grams !== null) consumed.add(i);
    }
  }

  if (grams === null || grams <= 0) return null;
  const residual = words.filter((_, i) => !consumed.has(i)).join(' ');
  return { grams, label: formatWeight(grams), residual, explicitUnit };
}

// ── Vocabulary building ──

const WEIGHT_GROUP = /weight|size|pack|quantity|qty/i;

function extractWeights(raw: any): VocabWeight[] {
  const byGrams = new Map<number, VocabWeight>();
  const add = (label: string, available: boolean) => {
    const grams = parseWeightLabel(label);
    if (!grams) return;
    const prev = byGrams.get(grams);
    byGrams.set(grams, {
      label: formatWeight(grams),
      grams,
      available: Boolean(prev?.available) || available,
    });
  };

  for (const group of raw.optionGroups || []) {
    const isWeightGroup = WEIGHT_GROUP.test(group?.name || '');
    for (const opt of group?.options || []) {
      // Options are weights when the group says so, or when the label itself is a weight
      if (isWeightGroup || parseWeightLabel(opt?.label || '')) {
        add(opt?.label || opt?.value || '', opt?.available !== false);
      }
    }
  }
  for (const v of raw.variants || []) {
    if (WEIGHT_GROUP.test(v?.name || '') || parseWeightLabel(v?.value || '')) {
      add(v?.value || '', (v?.stock ?? 1) > 0);
    }
  }
  if (typeof raw.weight === 'string') add(raw.weight, true);

  return [...byGrams.values()].sort((a, b) => a.grams - b.grams);
}

export function buildVocabulary(input: {
  products: any[];
  categories: any[];
  synonyms: { terms: string[] }[];
}): Vocabulary {
  const categoryById = new Map<string, any>();
  for (const c of input.categories) categoryById.set(String(c._id), c);

  const words = new Map<string, number>();
  const addWords = (list: string[]) => {
    for (const w of list) {
      if (w.length < 2 || /^\d/.test(w)) continue;
      words.set(w, (words.get(w) || 0) + 1);
    }
  };

  const productCountByCategory = new Map<string, number>();
  const weightGrams = new Set<number>();

  const products: VocabProduct[] = input.products.map((p) => {
    const cat = categoryById.get(String(p.primaryCategory?._id || p.primaryCategory || ''));
    const catIds = [p.primaryCategory, ...(p.secondaryCategories || [])]
      .map((c) => String(c?._id || c || ''))
      .filter(Boolean);
    for (const id of new Set(catIds)) {
      productCountByCategory.set(id, (productCountByCategory.get(id) || 0) + 1);
    }

    const tags: string[] = (p.tags || []).filter((t: any) => typeof t === 'string' && t.trim());
    const titleWords = tokenize(p.title || '');
    const tagPhrases = tags.map(normalizeSearchText).filter(Boolean);
    const tagWords = [...new Set(tagPhrases.flatMap((t) => t.split(' ')))];
    const categoryWords = cat ? tokenize(cat.name) : [];
    addWords(titleWords);
    addWords(tagWords);

    const weights = extractWeights(p);
    for (const w of weights) weightGrams.add(w.grams);

    const stock = Number(p.stock) || 0;
    return {
      id: String(p._id),
      title: p.title,
      slug: p.slug,
      image: p.imageSrc || (Array.isArray(p.images) ? p.images[0] : undefined),
      price: p.price,
      oldPrice: p.oldPrice,
      category: cat?.name,
      categorySlug: cat?.slug,
      tags,
      stock,
      inStock: stock > 0,
      weights,
      popularity: (Number(p.sold) || 0) + (Number(p.views) || 0) / 50 + (Number(p.rating) || 0),
      titleNorm: normalizeSearchText(p.title || ''),
      titleWords,
      tagWords,
      tagPhrases,
      categoryWords,
    };
  });

  const categories: VocabCategory[] = input.categories.map((c) => {
    const catWords = tokenize(c.name);
    addWords(catWords);
    return {
      name: c.name,
      slug: c.slug,
      words: catWords,
      productCount: productCountByCategory.get(String(c._id)) || 0,
    };
  });

  const synonymGroups = input.synonyms
    .map((s) => [...new Set((s.terms || []).map(normalizeSearchText).filter(Boolean))])
    .filter((g) => g.length > 1);
  for (const g of synonymGroups) addWords(g.flatMap((t) => t.split(' ')));

  // Tags carried by most of the catalogue ("Breakfast", "Homemade") describe the shop, not a
  // product, so they make poor related searches
  const tagCounts = new Map<string, number>();
  for (const p of products) {
    for (const t of new Set(p.tagPhrases)) tagCounts.set(t, (tagCounts.get(t) || 0) + 1);
  }
  const genericTags = new Set(
    products.length >= 4
      ? [...tagCounts.entries()].filter(([, n]) => n > products.length / 2).map(([t]) => t)
      : [],
  );

  return {
    products,
    categories,
    words,
    synonymGroups,
    weightGrams,
    genericTags,
    builtAt: Date.now(),
  };
}

let cachedVocab: Vocabulary | null = null;
let inflight: Promise<Vocabulary> | null = null;

async function loadVocabulary(): Promise<Vocabulary> {
  const [products, categories, synonyms] = await Promise.all([
    Product.find({ isActive: true, deletedAt: null })
      .select(
        '_id title slug imageSrc images price oldPrice primaryCategory secondaryCategories tags stock sold views rating optionGroups variants weight',
      )
      .limit(MAX_PRODUCTS)
      .lean(),
    Category.find({ isActive: true }).select('_id name slug').lean(),
    SearchSynonym.find({ isActive: true, category: { $ne: 'redirect' } })
      .select('terms')
      .lean(),
  ]);
  return buildVocabulary({
    products: products as any[],
    categories: categories as any[],
    synonyms: synonyms as any[],
  });
}

/** The catalogue vocabulary, rebuilt at most every few minutes and shared across requests. */
export async function getCatalogVocabulary(): Promise<Vocabulary> {
  if (cachedVocab && Date.now() - cachedVocab.builtAt < VOCAB_TTL_MS) return cachedVocab;
  if (!inflight) {
    inflight = loadVocabulary()
      .then((v) => {
        cachedVocab = v;
        return v;
      })
      .catch((err) => {
        logger.warn(`[Search Vocabulary] Rebuild failed: ${err.message}`);
        if (cachedVocab) return cachedVocab;
        throw err;
      })
      .finally(() => {
        inflight = null;
      });
  }
  return inflight;
}

/** Forget the vocabulary so the next search sees catalogue/synonym changes immediately. */
export function invalidateCatalogVocabulary(): void {
  cachedVocab = null;
}

// ── Spelling correction ──

export function correctQuery(query: string, vocab: Vocabulary): QueryCorrection {
  const tokens = normalizeSearchText(query).split(' ').filter(Boolean);
  const changes: QueryCorrection['changes'] = [];
  const vocabWords = [...vocab.words.keys()];

  const out = tokens.map((token) => {
    // Numbers, units and very short fragments are left alone
    if (token.length < 3 || /\d/.test(token) || UNIT_GRAMS[token]) return token;
    if (vocab.words.has(token)) return token;
    if (vocabWords.some((w) => w.startsWith(token))) return token;

    let best = '';
    let bestSim = 0;
    let bestFreq = 0;
    const key = phoneticKey(token);
    for (const w of vocabWords) {
      if (Math.abs(w.length - token.length) > 3) continue;
      let sim = 1 - editDistance(token, w) / Math.max(token.length, w.length);
      if (phoneticKey(w) === key) sim = Math.max(sim, 0.92);
      const freq = vocab.words.get(w) || 0;
      if (sim > bestSim || (sim === bestSim && freq > bestFreq)) {
        best = w;
        bestSim = sim;
        bestFreq = freq;
      }
    }

    const maxEdits = token.length <= 4 ? 1 : token.length <= 7 ? 2 : 3;
    const withinEdits =
      bestSim >= 0.92 || (best && editDistance(token, best) <= maxEdits && bestSim >= 0.55);
    if (!best || !withinEdits) return token;
    changes.push({ from: token, to: best, similarity: Math.round(bestSim * 100) / 100 });
    return best;
  });

  if (!changes.length) {
    return { corrected: tokens.join(' '), confidence: 1, level: 'none', changes };
  }
  const confidence = Math.min(...changes.map((c) => c.similarity));
  const level: CorrectionLevel = confidence >= 0.8 ? 'high' : confidence >= 0.65 ? 'medium' : 'low';
  return { corrected: out.join(' '), confidence, level, changes };
}

// ── Ranking ──

function phraseVariants(base: string[], vocab: Vocabulary): string[][] {
  const variants: string[][] = [base];
  const joined = ` ${base.join(' ')} `;
  for (const group of vocab.synonymGroups) {
    for (const term of group) {
      if (!joined.includes(` ${term} `)) continue;
      for (const alt of group) {
        if (alt === term) continue;
        variants.push(joined.replace(` ${term} `, ` ${alt} `).trim().split(' '));
        if (variants.length >= 8) return variants;
      }
    }
  }
  return variants;
}

function scoreTokens(tokens: string[], p: VocabProduct): number {
  if (!tokens.length) return 0;
  let matched = 0;
  let total = 0;
  for (const t of tokens) {
    let best = 0;
    for (const w of p.titleWords) best = Math.max(best, tokenSimilarity(t, w));
    // A single letter only means "names starting with this"; tags would match almost anything
    if (t.length > 1) {
      for (const w of p.tagWords) best = Math.max(best, tokenSimilarity(t, w) * 0.85);
      for (const w of p.categoryWords) best = Math.max(best, tokenSimilarity(t, w) * 0.8);
    }
    if (best > 0) matched += 1;
    total += best;
  }
  // Every word should find something; a query half made of unknown words is a weak match
  const coverage = matched / tokens.length;
  if (coverage < 0.5) return 0;
  let score = (total / tokens.length) * (0.6 + 0.4 * coverage);

  const phrase = tokens.join(' ');
  if (phrase.length >= 2) {
    if (p.titleNorm === phrase) score += 0.4;
    else if (p.titleNorm.startsWith(phrase)) score += 0.25;
    else if (p.titleNorm.includes(phrase)) score += 0.15;
    else if (p.tagPhrases.includes(phrase)) score += 0.2;
  }
  return score;
}

function categoryScore(tokens: string[], c: VocabCategory): number {
  if (!tokens.length || !c.words.length) return 0;
  const sims = tokens.map((t) => Math.max(...c.words.map((w) => tokenSimilarity(t, w))));
  if (sims.some((s) => s === 0)) return 0;
  return sims.reduce((a, b) => a + b, 0) / sims.length;
}

const titleCase = (s: string) => s.replace(/\b\w/g, (ch) => ch.toUpperCase());

export function analyzeWithVocabulary(
  rawQuery: string,
  vocab: Vocabulary,
  options: { limit?: number } = {},
): CatalogSearchAnalysis {
  const limit = Math.max(1, Math.min(options.limit || 8, 200));
  const normalizedQuery = normalizeSearchText(rawQuery);
  const empty: CatalogSearchAnalysis = {
    query: rawQuery,
    normalizedQuery,
    correctionConfidence: 1,
    correctionLevel: 'none',
    intent: 'browse',
    categories: [],
    products: [],
    related: [],
    weights: [],
    total: 0,
    fallback: false,
  };
  if (!normalizedQuery) return empty;

  const weightIntent = parseWeightIntent(normalizedQuery, vocab.weightGrams);
  const textPart = weightIntent ? weightIntent.residual : normalizedQuery;
  const correction = textPart
    ? correctQuery(textPart, vocab)
    : ({ corrected: '', confidence: 1, level: 'none', changes: [] } as QueryCorrection);

  const baseTokens = textPart.split(' ').filter(Boolean);
  const correctedTokens = correction.corrected.split(' ').filter(Boolean);

  // Score each product against the typed words, the corrected words and synonym rewrites
  const variants: { tokens: string[]; factor: number }[] = [];
  if (baseTokens.length) {
    for (const v of phraseVariants(baseTokens, vocab)) variants.push({ tokens: v, factor: 1 });
  }
  if (correction.level !== 'none') {
    const factor = 0.75 + 0.2 * correction.confidence;
    for (const v of phraseVariants(correctedTokens, vocab)) variants.push({ tokens: v, factor });
  }

  const scored: RankedProduct[] = [];
  for (const p of vocab.products) {
    let score = 0;
    if (variants.length) {
      for (const v of variants) score = Math.max(score, scoreTokens(v.tokens, p) * v.factor);
      if (score < 0.45) continue;
    } else {
      // Weight-only query ("500g"): every product sold in that size
      score = 0.6;
    }

    let matchedWeight: string | undefined;
    if (weightIntent) {
      const w = p.weights.find((x) => x.grams === weightIntent.grams);
      if (w && w.available) {
        matchedWeight = w.label;
        score += 0.2;
      } else if (!variants.length) {
        continue;
      } else {
        score *= p.weights.length ? 0.7 : 0.85;
      }
    }

    // In-stock first; out of stock is still findable, just lower
    if (!p.inStock) score *= 0.6;
    score += Math.min(0.05, p.popularity / 2000);

    scored.push({
      id: p.id,
      title: p.title,
      slug: p.slug,
      image: p.image,
      price: p.price,
      oldPrice: p.oldPrice,
      category: p.category,
      inStock: p.inStock,
      weights: p.weights,
      matchedWeight,
      score: Math.round(score * 1000) / 1000,
    });
  }
  scored.sort((a, b) => b.score - a.score || a.title.localeCompare(b.title));

  // Categories: by name, then by where the matching products live
  const catScores = new Map<string, number>();
  const tokenSets = variants.map((v) => v.tokens);
  for (const c of vocab.categories) {
    let s = 0;
    for (const t of tokenSets) s = Math.max(s, categoryScore(t, c));
    if (s >= 0.6) catScores.set(c.name, s + 0.3);
  }
  for (const p of scored.slice(0, 6)) {
    if (p.category && !catScores.has(p.category) && p.score >= 0.7) {
      catScores.set(p.category, Math.min(0.9, p.score * 0.6));
    }
  }
  const categories = vocab.categories
    .filter((c) => catScores.has(c.name) && c.productCount > 0)
    .map((c) => ({
      name: c.name,
      slug: c.slug,
      productCount: c.productCount,
      score: Math.round((catScores.get(c.name) || 0) * 1000) / 1000,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 4);

  // Products in a category the query names directly belong in the results too
  const strongCats = new Set(categories.filter((c) => c.score >= 1).map((c) => c.name));
  if (strongCats.size) {
    const have = new Set(scored.map((p) => p.id));
    for (const p of vocab.products) {
      if (have.has(p.id) || !p.category || !strongCats.has(p.category)) continue;
      if (weightIntent && !p.weights.some((w) => w.grams === weightIntent.grams && w.available)) {
        continue;
      }
      scored.push({
        id: p.id,
        title: p.title,
        slug: p.slug,
        image: p.image,
        price: p.price,
        oldPrice: p.oldPrice,
        category: p.category,
        inStock: p.inStock,
        weights: p.weights,
        matchedWeight: weightIntent ? weightIntent.label : undefined,
        score: Math.round((p.inStock ? 0.6 : 0.36) * 1000) / 1000,
      });
    }
    scored.sort((a, b) => b.score - a.score || a.title.localeCompare(b.title));
  }

  // Sizes the matching products really come in
  const weightCounts = new Map<number, number>();
  for (const p of scored) {
    for (const w of p.weights) {
      if (w.available) weightCounts.set(w.grams, (weightCounts.get(w.grams) || 0) + 1);
    }
  }
  const weights = [...weightCounts.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([grams, productCount]) => ({
      label: formatWeight(grams),
      grams,
      productCount,
      selected: weightIntent?.grams === grams,
    }));

  // Related searches: tags of the matches that say something the query doesn't
  const queryWords = new Set([...baseTokens, ...correctedTokens]);
  const relatedCounts = new Map<string, { label: string; count: number; overlap: number }>();
  const byId = new Map(vocab.products.map((p) => [p.id, p]));
  for (const p of scored.slice(0, 8)) {
    for (const tag of byId.get(p.id)?.tags || []) {
      const norm = normalizeSearchText(tag);
      if (!norm || norm === normalizedQuery || norm === normalizeSearchText(p.title)) continue;
      if (vocab.genericTags.has(norm)) continue;
      const words = norm.split(' ');
      if (words.every((w) => queryWords.has(w))) continue;
      const overlap = words.filter((w) =>
        [...queryWords].some((q) => tokenSimilarity(q, w) > 0),
      ).length;
      const prev = relatedCounts.get(norm);
      relatedCounts.set(norm, {
        label: titleCase(norm),
        count: (prev?.count || 0) + 1,
        overlap: Math.max(prev?.overlap || 0, overlap),
      });
    }
  }
  for (const group of vocab.synonymGroups) {
    if (!group.some((t) => queryWords.has(t) || t === normalizedQuery)) continue;
    for (const t of group) {
      if (t !== normalizedQuery && !relatedCounts.has(t)) {
        relatedCounts.set(t, { label: titleCase(t), count: 2, overlap: 1 });
      }
    }
  }
  // Only terms that share a word with what was typed; "Spicy" is no suggestion for "p"
  const related = [...relatedCounts.values()]
    .filter((r) => r.overlap > 0)
    .sort((a, b) => b.overlap - a.overlap || b.count - a.count || a.label.localeCompare(b.label))
    .slice(0, 6)
    .map((r) => r.label);

  const total = scored.length;
  let products = scored.slice(0, limit);
  let fallback = false;

  // Nothing matched: offer the most popular in-stock products rather than an empty page
  if (!products.length) {
    fallback = true;
    products = [...vocab.products]
      .filter((p) => p.inStock)
      .sort((a, b) => b.popularity - a.popularity || a.title.localeCompare(b.title))
      .slice(0, Math.min(limit, 4))
      .map((p) => ({
        id: p.id,
        title: p.title,
        slug: p.slug,
        image: p.image,
        price: p.price,
        oldPrice: p.oldPrice,
        category: p.category,
        inStock: p.inStock,
        weights: p.weights,
        score: 0,
      }));
  }

  let intent: SearchIntent = 'unknown';
  if (!fallback || categories.length) {
    const topProduct = scored[0]?.score || 0;
    const topCategory = categories[0]?.score || 0;
    if (!variants.length && weightIntent) intent = 'weight';
    else if (topCategory >= 1 && topCategory >= topProduct) intent = 'category';
    else if (weightIntent && total) intent = 'product_weight';
    else if (total) intent = 'product';
  }

  const weightAvailable = weightIntent
    ? vocab.products.some((p) =>
        p.weights.some((w) => w.grams === weightIntent.grams && w.available),
      )
    : false;

  return {
    query: rawQuery,
    normalizedQuery,
    correctedQuery:
      correction.level !== 'none' && correction.level !== 'low'
        ? [correction.corrected, weightIntent?.label].filter(Boolean).join(' ')
        : undefined,
    correctionConfidence: correction.confidence,
    correctionLevel: correction.level,
    intent,
    weight: weightIntent
      ? { label: weightIntent.label, grams: weightIntent.grams, available: weightAvailable }
      : undefined,
    categories,
    products,
    related,
    weights,
    total,
    fallback,
  };
}

/** Catalogue-aware analysis of a query; never throws (search must keep working). */
export async function analyzeCatalogQuery(
  query: string,
  options: { limit?: number } = {},
): Promise<CatalogSearchAnalysis | null> {
  try {
    const vocab = await getCatalogVocabulary();
    return analyzeWithVocabulary(query, vocab, options);
  } catch (err: any) {
    logger.warn(`[Search Vocabulary] Analysis skipped: ${err.message}`);
    return null;
  }
}
