/**
 * Pack-size labels ("500g", "1 Kg", "2 kgs") are typed by hand on products, so the
 * same weight shows up spelled several ways. These helpers give one canonical
 * label per weight for the storefront filter, and a regex that matches every
 * spelling when that filter is applied.
 */

const UNIT_ALIASES: Record<string, string[]> = {
  g: ['g', 'gm', 'gms', 'gram', 'grams'],
  kg: ['kg', 'kgs', 'kilo', 'kilos'],
  ml: ['ml'],
  l: ['l', 'ltr', 'litre', 'litres', 'liter', 'liters'],
  oz: ['oz'],
  lb: ['lb', 'lbs'],
};

const UNIT_BY_ALIAS = new Map<string, string>(
  Object.entries(UNIT_ALIASES).flatMap(([unit, aliases]) => aliases.map((a) => [a, unit])),
);

const WEIGHT_RE = /^(\d+(?:\.\d+)?)\s*([a-z]+)$/i;

function parse(str: string): { num: string; unit: string } | null {
  const match = String(str || '')
    .trim()
    .match(WEIGHT_RE);
  if (!match) return null;
  const unit = UNIT_BY_ALIAS.get(match[2].toLowerCase());
  if (!unit) return null;
  return { num: String(parseFloat(match[1])), unit };
}

export const isWeightLabel = (str: string): boolean =>
  !!parse(str) || /^(half|quarter)\s*(kg|kilo|litre|liter)$/i.test(String(str || '').trim());

/** "1 Kg", "1kgs", "1 kilo" → "1kg". Non-weights are returned trimmed and unchanged. */
export function canonicalWeightLabel(str: string): string {
  const parsed = parse(str);
  return parsed ? `${parsed.num}${parsed.unit}` : String(str || '').trim();
}

/** Weight in grams (or ml) for sorting; 0 when not a weight. */
export function weightInGrams(str: string): number {
  const parsed = parse(str);
  if (!parsed) return 0;
  const num = Number(parsed.num);
  return parsed.unit === 'kg' || parsed.unit === 'l' ? num * 1000 : num;
}

/**
 * Regex matching every spelling of a weight ("1kg" matches "1 Kg", "1kgs", "1.0 kilo").
 * Returns null for values that are not weights.
 */
export function weightMatchRegex(str: string): RegExp | null {
  const parsed = parse(str);
  if (!parsed) return null;
  const [intPart, fracPart] = parsed.num.split('.');
  const num = fracPart ? `${intPart}\\.${fracPart}0*` : `${intPart}(?:\\.0+)?`;
  return new RegExp(`^${num}\\s*(?:${UNIT_ALIASES[parsed.unit].join('|')})$`, 'i');
}
