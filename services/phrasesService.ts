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
  surface: { index: null, loading: null },
};

const FILE_MAP: Record<PhraseMatchType, string> = {
  lemma: "quran-phrases.json",
  root: "quran-root-phrases.json",
  surface: "quran-surface-phrases.json",
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

/** Load all phrase indices in parallel */
export async function loadPhraseIndex(): Promise<VerseWordIndex | null> {
  const [lemma, root, surface] = await Promise.all([
    loadIndex("lemma"),
    loadIndex("root"),
    loadIndex("surface"),
  ]);
  // Return the lemma index for backward compat; merged lookups use all
  return lemma || root || surface;
}

/** Merge matches from all indices for a specific (verse, wordIndex) */
function mergeMatches(
  indices: (VerseWordIndex | null)[],
  verseKey: string,
  wordIndex: number
): PhraseMatch[] {
  const results: PhraseMatch[] = [];

  for (const idx of indices) {
    if (!idx) continue;
    const verseMap = idx.get(verseKey);
    if (!verseMap) continue;
    const matches = verseMap.get(wordIndex);
    if (matches) results.push(...matches);
  }

  return results;
}

/**
 * Remove lower-priority matches that are fully redundant with a higher-priority match.
 * Priority: lemma > root > surface.
 * A match is redundant only when:
 *   1. Its wordIndices are a subset of (or equal to) a higher-priority match's wordIndices, AND
 *   2. ALL of its otherOccurrences (connected verses) are also found in that match.
 * If the match connects to even one verse that no higher-priority match covers, keep it.
 */
const MATCH_PRIORITY: Record<PhraseMatchType, number> = { lemma: 2, root: 1, surface: 0 };

function deduplicateLowerPriorityMatches(matches: PhraseMatch[]): PhraseMatch[] {
  return matches.filter((m) => {
    const higherMatches = matches.filter(
      (h) => MATCH_PRIORITY[h.matchType] > MATCH_PRIORITY[m.matchType]
    );
    if (higherMatches.length === 0) return true;

    // Check if any higher-priority match fully covers this match
    return !higherMatches.some((higher) => {
      // 1. Word indices must be covered
      const indicesCovered = m.wordIndices.every((idx) => higher.wordIndices.includes(idx));
      if (!indicesCovered) return false;

      // 2. All connected verses must also be covered
      const higherVerses = new Set(higher.otherOccurrences.map((o) => o.verse));
      return m.otherOccurrences.every((o) => higherVerses.has(o.verse));
    });
  });
}

/**
 * Remove sub-phrase matches whose verse connections are entirely covered
 * by a longer match of the same type.
 *
 * A shorter match is redundant when:
 *   1. Its wordIndices are a subset of a longer match's wordIndices
 *   2. ALL of its otherOccurrences verses are also in that longer match
 *
 * Short phrases with unique verse connections are always preserved.
 */
function deduplicateSubphrases(matches: PhraseMatch[]): PhraseMatch[] {
  if (matches.length <= 1) return matches;

  const sorted = [...matches].sort((a, b) => b.keys.length - a.keys.length);

  return sorted.filter((match, i) => {
    for (let j = 0; j < i; j++) {
      const longer = sorted[j];
      if (longer.matchType !== match.matchType) continue;

      // 1. Word indices must be a subset
      const longerIndices = new Set(longer.wordIndices);
      if (!match.wordIndices.every((idx) => longerIndices.has(idx))) continue;

      // 2. All connected verses must be covered
      const longerVerses = new Set(longer.otherOccurrences.map((o) => o.verse));
      if (match.otherOccurrences.every((o) => longerVerses.has(o.verse))) return false;
    }
    return true;
  });
}

/**
 * Find all phrase matches for a specific word in a verse.
 * Returns matches from lemma, root, and surface indices.
 * Lower-priority matches covered by higher-priority ones are excluded.
 * Sub-phrases with no unique verse connections are excluded.
 * Sorted by phrase length (longest first), then by priority (lemma > root > surface).
 */
export async function findPhrasesForWord(
  verseKey: string,
  wordIndex: number
): Promise<PhraseMatch[]> {
  const indices = await Promise.all([loadIndex("lemma"), loadIndex("root"), loadIndex("surface")]);
  const matches = mergeMatches(indices, verseKey, wordIndex);
  if (matches.length === 0) return [];

  const deduped = deduplicateSubphrases(deduplicateLowerPriorityMatches(matches));

  return deduped.sort((a, b) => {
    const lenDiff = b.keys.length - a.keys.length;
    if (lenDiff !== 0) return lenDiff;
    const priDiff = MATCH_PRIORITY[b.matchType] - MATCH_PRIORITY[a.matchType];
    if (priDiff !== 0) return priDiff;
    return 0;
  });
}

/**
 * Find all phrase matches for a verse (all words).
 * Returns a merged map of wordIndex → PhraseMatch[] from all indices.
 * Lower-priority matches covered by higher-priority ones are excluded.
 */
export async function findPhrasesForVerse(
  verseKey: string
): Promise<Map<number, PhraseMatch[]> | null> {
  const indices = await Promise.all([loadIndex("lemma"), loadIndex("root"), loadIndex("surface")]);
  if (indices.every((idx) => !idx)) return null;

  const merged = new Map<number, PhraseMatch[]>();

  for (const idx of indices) {
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

  // Deduplicate lower-priority matches, then sub-phrases per word
  for (const [wordIdx, matches] of merged) {
    merged.set(wordIdx, deduplicateSubphrases(deduplicateLowerPriorityMatches(matches)));
  }

  return merged.size > 0 ? merged : null;
}
