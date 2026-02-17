import type { KnowledgeBase } from "../types";

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

/** Clear the cache (useful for testing). */
export function clearKnowledgeBaseCache(): void {
  knowledgeBase = null;
  kbLoading = null;
}
