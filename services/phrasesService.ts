import type { PhraseMatch, PhraseMatchType } from "../types";

// --- Types matching generated JSON files ---

interface PhraseOccurrence {
  verse: string;
  words: number[];
}

interface Phrase {
  keys: string[];
  occurrences: PhraseOccurrence[];
}

interface PhrasesFile {
  _meta: {
    description: string;
    matchBy: PhraseMatchType;
    maxLength: number;
    source: string;
    generated: string;
    sourceChecksum: string;
    stats: { totalPhrases: number; totalOccurrences: number };
  };
  phrases: Phrase[];
}

// --- Reverse index: verse → wordIndex → PhraseMatch[] ---

type VerseWordIndex = Map<string, Map<number, PhraseMatch[]>>;

// --- Cache per match type ---

const caches: Record<
  PhraseMatchType,
  { index: VerseWordIndex | null; loading: Promise<VerseWordIndex | null> | null }
> = {
  lemma: { index: null, loading: null },
  root: { index: null, loading: null },
};

const FILE_MAP: Record<PhraseMatchType, string> = {
  lemma: "quran-phrases.json",
  root: "quran-root-phrases.json",
};

/**
 * Build a reverse index from (verse, wordIndex) → PhraseMatch[].
 * For each phrase occurrence, every word in that occurrence gets an entry
 * pointing to the full phrase and its other occurrences.
 */
function buildVerseWordIndex(phrases: Phrase[], matchType: PhraseMatchType): VerseWordIndex {
  const index: VerseWordIndex = new Map();

  for (const phrase of phrases) {
    for (let i = 0; i < phrase.occurrences.length; i++) {
      const occ = phrase.occurrences[i];
      const others = phrase.occurrences.filter((_, j) => j !== i);

      const match: PhraseMatch = {
        matchType,
        keys: phrase.keys,
        wordIndices: occ.words,
        otherOccurrences: others.map((o) => ({ verse: o.verse, words: o.words })),
      };

      let verseMap = index.get(occ.verse);
      if (!verseMap) {
        verseMap = new Map();
        index.set(occ.verse, verseMap);
      }

      for (const wordIdx of occ.words) {
        let matches = verseMap.get(wordIdx);
        if (!matches) {
          matches = [];
          verseMap.set(wordIdx, matches);
        }
        matches.push(match);
      }
    }
  }

  return index;
}

/**
 * Load a phrases JSON file and build its reverse index.
 * Cached after first load.
 */
function loadIndex(matchType: PhraseMatchType): Promise<VerseWordIndex | null> {
  const cache = caches[matchType];
  if (cache.index) return Promise.resolve(cache.index);
  if (cache.loading) return cache.loading;

  cache.loading = (async () => {
    const baseUrl = import.meta.env.BASE_URL || "/";
    const fileName = FILE_MAP[matchType];
    const urls = [`${baseUrl}${fileName}`, `/${fileName}`];

    for (const url of urls) {
      try {
        const response = await fetch(url);
        if (!response.ok) continue;
        const json: PhrasesFile = await response.json();
        cache.index = buildVerseWordIndex(json.phrases, matchType);
        return cache.index;
      } catch {
        continue;
      }
    }

    return null;
  })();

  return cache.loading;
}

/** Load both lemma and root indices in parallel */
export async function loadPhraseIndex(): Promise<VerseWordIndex | null> {
  const [lemma, root] = await Promise.all([loadIndex("lemma"), loadIndex("root")]);
  // Return the lemma index for backward compat; merged lookups use both
  return lemma || root;
}

/** Merge matches from both indices for a specific (verse, wordIndex) */
function mergeMatches(
  lemmaIndex: VerseWordIndex | null,
  rootIndex: VerseWordIndex | null,
  verseKey: string,
  wordIndex: number
): PhraseMatch[] {
  const results: PhraseMatch[] = [];

  for (const idx of [lemmaIndex, rootIndex]) {
    if (!idx) continue;
    const verseMap = idx.get(verseKey);
    if (!verseMap) continue;
    const matches = verseMap.get(wordIndex);
    if (matches) results.push(...matches);
  }

  return results;
}

/**
 * Remove root matches that are fully redundant with a lemma match.
 * A root match is redundant only when:
 *   1. Its wordIndices are a subset of (or equal to) a lemma match's wordIndices, AND
 *   2. ALL of its otherOccurrences (connected verses) are also found in that lemma match.
 * If the root match connects to even one verse that no lemma match covers, keep it.
 */
function deduplicateRootMatches(matches: PhraseMatch[]): PhraseMatch[] {
  const lemmaMatches = matches.filter((m) => m.matchType === "lemma");
  if (lemmaMatches.length === 0) return matches;

  return matches.filter((m) => {
    if (m.matchType === "lemma") return true;

    // Check if any lemma match fully covers this root match
    return !lemmaMatches.some((lemma) => {
      // 1. Word indices must be covered
      const indicesCovered = m.wordIndices.every((idx) => lemma.wordIndices.includes(idx));
      if (!indicesCovered) return false;

      // 2. All connected verses must also be covered
      const lemmaVerses = new Set(lemma.otherOccurrences.map((o) => o.verse));
      return m.otherOccurrences.every((o) => lemmaVerses.has(o.verse));
    });
  });
}

/**
 * Find all phrase matches for a specific word in a verse.
 * Returns matches from both lemma and root indices.
 * Root matches already covered by lemma matches are excluded.
 * Sorted by phrase length (longest first), then lemma before root.
 */
export async function findPhrasesForWord(
  verseKey: string,
  wordIndex: number
): Promise<PhraseMatch[]> {
  const [lemmaIdx, rootIdx] = await Promise.all([loadIndex("lemma"), loadIndex("root")]);
  const matches = mergeMatches(lemmaIdx, rootIdx, verseKey, wordIndex);
  if (matches.length === 0) return [];

  const deduplicated = deduplicateRootMatches(matches);

  return deduplicated.sort((a, b) => {
    const lenDiff = b.keys.length - a.keys.length;
    if (lenDiff !== 0) return lenDiff;
    if (a.matchType !== b.matchType) return a.matchType === "lemma" ? -1 : 1;
    return 0;
  });
}

/**
 * Find all phrase matches for a verse (all words).
 * Returns a merged map of wordIndex → PhraseMatch[] from both indices.
 * Root matches covered by lemma matches are excluded.
 */
export async function findPhrasesForVerse(
  verseKey: string
): Promise<Map<number, PhraseMatch[]> | null> {
  const [lemmaIdx, rootIdx] = await Promise.all([loadIndex("lemma"), loadIndex("root")]);
  if (!lemmaIdx && !rootIdx) return null;

  const merged = new Map<number, PhraseMatch[]>();

  for (const idx of [lemmaIdx, rootIdx]) {
    if (!idx) continue;
    const verseMap = idx.get(verseKey);
    if (!verseMap) continue;
    for (const [wordIdx, matches] of verseMap) {
      const existing = merged.get(wordIdx);
      if (existing) {
        existing.push(...matches);
      } else {
        merged.set(wordIdx, [...matches]);
      }
    }
  }

  // Deduplicate root matches covered by lemma per word
  for (const [wordIdx, matches] of merged) {
    merged.set(wordIdx, deduplicateRootMatches(matches));
  }

  return merged.size > 0 ? merged : null;
}
