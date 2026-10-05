// ── Event Knowledge Graph ──
// Maps a search concept to its related products, aliases and search terms.
export interface EventGraphEntry {
  aliases: string[]; // All Telugu/Hindi/English names for this event
  teluguAliases: string[]; // Telugu script names
  products: string[]; // Product categories/types within this event
  services: string[]; // Service types
  relatedEvents: string[]; // Related event names
  searchTerms: string[]; // Additional search terms to match products
}

export const EVENT_KNOWLEDGE_GRAPH: Record<string, EventGraphEntry> = {};
