import type { KBConnection, KnowledgeBase } from "../types";

export interface VerseFamiliarityInfo {
  hasConnections: boolean;
  connections: KBConnection[];
}

/**
 * Check if a verse has any KB connections (as from or to).
 * Pure function — no side effects, no async.
 */
export function computeVerseFamiliarity(
  verseKey: string,
  kb: KnowledgeBase | null
): VerseFamiliarityInfo {
  if (!kb || kb.connections.length === 0) {
    return { hasConnections: false, connections: [] };
  }
  const matches = kb.connections.filter(
    (c) => c.from.verse === verseKey || c.to.verse === verseKey
  );
  return {
    hasConnections: matches.length > 0,
    connections: matches,
  };
}
