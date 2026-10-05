export function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function getMatchingProductCategory(
  predicted: string,
  dbCategories?: string[],
): string | null {
  const categories = dbCategories || [];
  const p = predicted.toLowerCase();

  const match = categories.find((c) => c.toLowerCase().includes(p) || p.includes(c.toLowerCase()));
  return match || null;
}
