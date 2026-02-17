#!/usr/bin/env bun
/**
 * Generates quran-phrases.json from quran-roots.json
 *
 * Finds all repeated lemma sequences (length 2-5) across Quran verses.
 * Used by the NodeReader to show cross-verse phrase connections.
 *
 * Usage: bun run generate-phrases
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

// --- Types ---

interface RootDataEntry {
  r: string; // root
  l: string; // lemma
  t: string; // text
}

interface QuranRootsFile {
  _meta: {
    source: { checksum: string };
    generated: string;
    stats: { totalVerses: number; uniqueRoots: number };
  };
  data: Record<string, (RootDataEntry | null)[]>;
}

interface PhraseOccurrence {
  verse: string;
  words: number[];
}

interface Phrase {
  lemmas: string[];
  occurrences: PhraseOccurrence[];
}

interface OutputFile {
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

// --- Constants ---

const MAX_NGRAM_LENGTH = 5;
const MIN_OCCURRENCES = 2;

// --- Core Logic ---

/** Extract content words (non-null entries) with their original indices */
function extractContentWords(words: (RootDataEntry | null)[]): { lemma: string; index: number }[] {
  const result: { lemma: string; index: number }[] = [];
  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    if (w !== null) {
      result.push({ lemma: w.l, index: i });
    }
  }
  return result;
}

/** Generate all n-grams (length 2..maxLen) from content words */
function generateNgrams(
  contentWords: { lemma: string; index: number }[],
  maxLen: number
): { lemmas: string[]; indices: number[] }[] {
  const ngrams: { lemmas: string[]; indices: number[] }[] = [];
  for (let len = 2; len <= maxLen; len++) {
    for (let start = 0; start <= contentWords.length - len; start++) {
      const slice = contentWords.slice(start, start + len);
      ngrams.push({
        lemmas: slice.map((w) => w.lemma),
        indices: slice.map((w) => w.index),
      });
    }
  }
  return ngrams;
}

/** Build phrase index: map from lemma key to occurrences */
function buildPhraseIndex(
  data: Record<string, (RootDataEntry | null)[]>
): Map<string, PhraseOccurrence[]> {
  const index = new Map<string, PhraseOccurrence[]>();
  const verses = Object.keys(data);

  for (let v = 0; v < verses.length; v++) {
    if (v % 1000 === 0) {
      console.log(`  Processing verse ${v}/${verses.length}...`);
    }
    const verseKey = verses[v];
    const words = data[verseKey];
    const contentWords = extractContentWords(words);
    const ngrams = generateNgrams(contentWords, MAX_NGRAM_LENGTH);

    for (const ngram of ngrams) {
      const key = ngram.lemmas.join("|");
      let occurrences = index.get(key);
      if (!occurrences) {
        occurrences = [];
        index.set(key, occurrences);
      }
      occurrences.push({ verse: verseKey, words: ngram.indices });
    }
  }

  return index;
}

/** Filter to only phrases appearing in 2+ distinct verses */
function filterByMinOccurrences(
  index: Map<string, PhraseOccurrence[]>,
  minOccurrences: number
): Map<string, PhraseOccurrence[]> {
  const filtered = new Map<string, PhraseOccurrence[]>();
  for (const [key, occurrences] of index) {
    // Count distinct verses
    const distinctVerses = new Set(occurrences.map((o) => o.verse));
    if (distinctVerses.size >= minOccurrences) {
      filtered.set(key, occurrences);
    }
  }
  return filtered;
}

/**
 * Deduplicate: remove occurrences where the same words in the same verse
 * are fully covered by a longer phrase.
 *
 * For each verse, build a set of word-index-ranges covered by longer phrases.
 * Then remove shorter phrase occurrences whose indices are subsets.
 */
function deduplicateSubphrases(index: Map<string, PhraseOccurrence[]>): Phrase[] {
  // Sort phrases by length (longest first) so we process longer phrases first
  const entries = [...index.entries()].sort((a, b) => {
    const lenA = a[0].split("|").length;
    const lenB = b[0].split("|").length;
    return lenB - lenA;
  });

  // Build covered set: verse → Set of "startIdx-endIdx" ranges
  // Each range represents word indices covered by a phrase in that verse
  const coveredByVerse = new Map<string, Set<string>>();

  const result: Phrase[] = [];

  for (const [key, occurrences] of entries) {
    const lemmas = key.split("|");
    const survivingOccurrences: PhraseOccurrence[] = [];

    for (const occ of occurrences) {
      const covered = coveredByVerse.get(occ.verse);
      if (covered) {
        // Check if this occurrence's indices are a subset of any covered range
        const isCovered = isSubsetOfAnyCoveredRange(occ.words, covered);
        if (isCovered) continue; // Skip — covered by longer phrase
      }
      survivingOccurrences.push(occ);
    }

    // Only keep phrases with 2+ distinct verses after dedup
    const distinctVerses = new Set(survivingOccurrences.map((o) => o.verse));
    if (distinctVerses.size >= MIN_OCCURRENCES) {
      result.push({ lemmas, occurrences: survivingOccurrences });

      // Mark these occurrences as covered for shorter phrases
      for (const occ of survivingOccurrences) {
        let covered = coveredByVerse.get(occ.verse);
        if (!covered) {
          covered = new Set();
          coveredByVerse.set(occ.verse, covered);
        }
        covered.add(occ.words.join(","));
      }
    }
  }

  return result;
}

/** Check if `indices` is a subset of any covered range in the set */
function isSubsetOfAnyCoveredRange(indices: number[], coveredRanges: Set<string>): boolean {
  for (const rangeStr of coveredRanges) {
    const range = rangeStr.split(",").map(Number);
    if (indices.every((idx) => range.includes(idx))) {
      return true;
    }
  }
  return false;
}

// --- Main ---

function main() {
  const rootDir = process.cwd();
  const inputPath = path.join(rootDir, "public", "quran-roots.json");
  const outputPath = path.join(rootDir, "public", "quran-phrases.json");

  console.log("Reading quran-roots.json...");
  const raw = readFileSync(inputPath, "utf-8");
  const rootsFile: QuranRootsFile = JSON.parse(raw);
  const data = rootsFile.data;
  const verseCount = Object.keys(data).length;
  console.log(`  ${verseCount} verses loaded.`);

  console.log("Building phrase index (n-grams 2-5)...");
  const fullIndex = buildPhraseIndex(data);
  console.log(`  ${fullIndex.size} unique lemma sequences found.`);

  console.log("Filtering to phrases in 2+ distinct verses...");
  const filtered = filterByMinOccurrences(fullIndex, MIN_OCCURRENCES);
  console.log(`  ${filtered.size} phrases appear in 2+ verses.`);

  console.log("Deduplicating sub-phrases...");
  const phrases = deduplicateSubphrases(filtered);
  console.log(`  ${phrases.length} phrases after deduplication.`);

  // Sort by number of occurrences (most common first)
  phrases.sort((a, b) => b.occurrences.length - a.occurrences.length);

  const totalOccurrences = phrases.reduce((sum, p) => sum + p.occurrences.length, 0);

  const output: OutputFile = {
    _meta: {
      description: "Repeated lemma sequences across Quran verses",
      maxLength: MAX_NGRAM_LENGTH,
      source: "computed from quran-roots.json",
      generated: new Date().toISOString(),
      sourceChecksum: rootsFile._meta.source.checksum,
      stats: {
        totalPhrases: phrases.length,
        totalOccurrences,
      },
    },
    phrases,
  };

  console.log("Writing quran-phrases.json...");
  writeFileSync(outputPath, JSON.stringify(output, null, 2), "utf-8");

  console.log(`Done!`);
  console.log(`  Phrases: ${phrases.length}`);
  console.log(`  Total occurrences: ${totalOccurrences}`);
  console.log(`  Output: ${outputPath}`);
}

try {
  main();
} catch (error) {
  console.error("Generation failed:", error instanceof Error ? error.message : error);
  process.exit(1);
}
