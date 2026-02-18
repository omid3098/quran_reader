import type { KnowledgeBase, KBConnection } from "../types";

const STORAGE_KEY = "luminaKnowledgeBase";

// --- Cache ---

let knowledgeBase: KnowledgeBase | null = null;
let kbLoading: Promise<KnowledgeBase | null> | null = null;

/**
 * Load knowledge base: first from localStorage (user edits), then from static file (seed).
 * localStorage takes precedence since it contains user modifications.
 */
export async function loadKnowledgeBase(): Promise<KnowledgeBase | null> {
  if (knowledgeBase) return knowledgeBase;
  if (kbLoading) return kbLoading;

  kbLoading = (async () => {
    // Try localStorage first (user edits)
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        knowledgeBase = JSON.parse(stored) as KnowledgeBase;
        return knowledgeBase;
      }
    } catch {
      // Corrupt localStorage data — fall through to static file
    }

    // Load static seed file
    const baseUrl = import.meta.env.BASE_URL || "/";
    const urls = [`${baseUrl}knowledge-base.json`, "/knowledge-base.json"];

    for (const url of urls) {
      try {
        const response = await fetch(url);
        if (!response.ok) continue;
        knowledgeBase = (await response.json()) as KnowledgeBase;
        return knowledgeBase;
      } catch {
        continue;
      }
    }

    return null;
  })();

  return kbLoading;
}

/** Get the note for a specific root. */
export async function getRootNote(root: string): Promise<string | null> {
  const kb = await loadKnowledgeBase();
  if (!kb) return null;
  return kb.roots[root]?.note || null;
}

/** Get the note for a specific lemma. */
export async function getLemmaNote(lemma: string): Promise<{ note: string; root?: string } | null> {
  const kb = await loadKnowledgeBase();
  if (!kb) return null;
  const entry = kb.lemmas[lemma];
  if (!entry) return null;
  return { note: entry.note, root: entry.root };
}

/** Save the entire knowledge base to localStorage. */
export function saveKnowledgeBase(kb: KnowledgeBase): void {
  knowledgeBase = kb;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(kb));
}

/** Create an empty KB if none exists. */
function ensureKB(kb: KnowledgeBase | null): KnowledgeBase {
  return (
    kb ?? {
      _meta: { author: "user", version: 1 },
      roots: {},
      lemmas: {},
      connections: [],
      patterns: [],
    }
  );
}

/** Save or update a note for a specific root. */
export async function saveRootNote(
  root: string,
  note: string,
  discoveredIn?: string
): Promise<void> {
  const kb = ensureKB(await loadKnowledgeBase());
  if (note.trim() === "") {
    delete kb.roots[root];
  } else {
    kb.roots[root] = { note, ...(discoveredIn ? { discoveredIn } : {}) };
  }
  saveKnowledgeBase(kb);
}

/** Save or update a note for a specific lemma. */
export async function saveLemmaNote(
  lemma: string,
  note: string,
  root?: string,
  discoveredIn?: string
): Promise<void> {
  const kb = ensureKB(await loadKnowledgeBase());
  if (note.trim() === "") {
    delete kb.lemmas[lemma];
  } else {
    kb.lemmas[lemma] = {
      note,
      ...(root ? { root } : {}),
      ...(discoveredIn ? { discoveredIn } : {}),
    };
  }
  saveKnowledgeBase(kb);
}

/** Save a new connection. Deduplicates by from.verse + to.verse. */
export async function saveConnection(connection: KBConnection): Promise<void> {
  const kb = ensureKB(await loadKnowledgeBase());
  const exists = kb.connections.some(
    (c) => c.from.verse === connection.from.verse && c.to.verse === connection.to.verse
  );
  if (!exists) {
    kb.connections.push(connection);
    saveKnowledgeBase(kb);
  }
}

/** Delete a connection by matching from+to verse keys. */
export async function deleteConnection(fromVerse: string, toVerse: string): Promise<void> {
  const kb = ensureKB(await loadKnowledgeBase());
  kb.connections = kb.connections.filter(
    (c) => !(c.from.verse === fromVerse && c.to.verse === toVerse)
  );
  saveKnowledgeBase(kb);
}

/** Get all connections where this verse appears as from or to. */
export async function getConnectionsForVerse(verseKey: string): Promise<KBConnection[]> {
  const kb = await loadKnowledgeBase();
  if (!kb) return [];
  return kb.connections.filter((c) => c.from.verse === verseKey || c.to.verse === verseKey);
}

/** Clear the cache (useful for testing). */
export function clearKnowledgeBaseCache(): void {
  knowledgeBase = null;
  kbLoading = null;
}
