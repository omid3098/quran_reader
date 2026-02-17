import type { PhraseMatch } from "../types";

// --- Types matching quran-phrases.json ---

interface PhraseOccurrence {
  verse: string;
  words: number[];
}

interface Phrase {
  lemmas: string[];
  occurrences: PhraseOccurrence[];
}

interface PhrasesFile {
  _meta: {
    description: string;
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

// --- Cache ---

let verseWordIndex: VerseWordIndex | null = null;
let indexLoading: Promise<VerseWordIndex | null> | null = null;

/**
 * Build a reverse index from (verse, wordIndex) → PhraseMatch[].
 * For each phrase occurrence, every word in that occurrence gets an entry
 * pointing to the full phrase and its other occurrences.
 */
function buildVerseWordIndex(phrases: Phrase[]): VerseWordIndex {
  const index: VerseWordIndex = new Map();

  for (const phrase of phrases) {
    for (let i = 0; i < phrase.occurrences.length; i++) {
      const occ = phrase.occurrences[i];
      // Other occurrences = all except this one
      const others = phrase.occurrences.filter((_, j) => j !== i);

      const match: PhraseMatch = {
        lemmas: phrase.lemmas,
        wordIndices: occ.words,
        otherOccurrences: others.map((o) => ({ verse: o.verse, words: o.words })),
      };

      let verseMap = index.get(occ.verse);
      if (!verseMap) {
        verseMap = new Map();
        index.set(occ.verse, verseMap);
      }

      // Add this match to every word index in the occurrence
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
 * Load quran-phrases.json and build the reverse index.
 * Cached after first load.
 */
export async function loadPhraseIndex(): Promise<VerseWordIndex | null> {
  if (verseWordIndex) return verseWordIndex;
  if (indexLoading) return indexLoading;

  indexLoading = (async () => {
    const baseUrl = import.meta.env.BASE_URL || "/";
    const urls = [`${baseUrl}quran-phrases.json`, "/quran-phrases.json"];

    for (const url of urls) {
      try {
        const response = await fetch(url);
        if (!response.ok) continue;
        const json: PhrasesFile = await response.json();
        verseWordIndex = buildVerseWordIndex(json.phrases);
        return verseWordIndex;
      } catch {
        continue;
      }
    }

    return null;
  })();

  return indexLoading;
}

/**
 * Find all phrase matches for a specific word in a verse.
 * Returns deduplicated matches sorted by phrase length (longest first).
 */
export async function findPhrasesForWord(
  verseKey: string,
  wordIndex: number
): Promise<PhraseMatch[]> {
  const index = await loadPhraseIndex();
  if (!index) return [];

  const verseMap = index.get(verseKey);
  if (!verseMap) return [];

  const matches = verseMap.get(wordIndex);
  if (!matches) return [];

  // Sort by phrase length (longest first) for better display
  return [...matches].sort((a, b) => b.lemmas.length - a.lemmas.length);
}

/**
 * Find all phrase matches for a verse (all words).
 * Returns a map of wordIndex → PhraseMatch[].
 */
export async function findPhrasesForVerse(
  verseKey: string
): Promise<Map<number, PhraseMatch[]> | null> {
  const index = await loadPhraseIndex();
  if (!index) return null;

  return index.get(verseKey) || null;
}
