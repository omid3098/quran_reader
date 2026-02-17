#!/usr/bin/env bun
/**
 * Generates phrase data files from quran-roots.json
 *
 * Finds all repeated sequences (length 2-5) across Quran verses.
 * Supports two modes:
 *   - lemma: match by lemma (exact dictionary form) → quran-phrases.json
 *   - root:  match by root (3-letter root)          → quran-root-phrases.json
 *
 * Usage:
 *   bun run scripts/generate-phrases.ts          # generates both files
 *   bun run scripts/generate-phrases.ts lemma    # lemma only
 *   bun run scripts/generate-phrases.ts root     # root only
 *   bun run scripts/generate-phrases.ts all      # both (default)
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
  keys: string[];
  occurrences: PhraseOccurrence[];
}

interface OutputFile {
  _meta: {
    description: string;
    matchBy: "lemma" | "root";
    maxLength: number;
    source: string;
    generated: string;
    sourceChecksum: string;
    stats: { totalPhrases: number; totalOccurrences: number };
  };
  phrases: Phrase[];
}

type Mode = "lemma" | "root";

// --- Constants ---

const MIN_OCCURRENCES = 2;

const MODE_CONFIG: Record<Mode, { field: "l" | "r"; outputFile: string; description: string }> = {
  lemma: {
    field: "l",
    outputFile: "quran-phrases.json",
    description: "Repeated lemma sequences across Quran verses",
  },
  root: {
    field: "r",
    outputFile: "quran-root-phrases.json",
    description: "Repeated root sequences across Quran verses",
  },
};

// --- Core Logic ---

/** Extract content words (non-null entries) with their original indices */
function extractContentWords(
  words: (RootDataEntry | null)[],
  field: "l" | "r"
): { key: string; index: number }[] {
  const result: { key: string; index: number }[] = [];
  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    if (w !== null) {
      result.push({ key: w[field], index: i });
    }
  }
  return result;
}

/** Generate all n-grams (length 2..maxLen) from content words */
function generateNgrams(
  contentWords: { key: string; index: number }[],
  maxLen: number
): { keys: string[]; indices: number[] }[] {
  const ngrams: { keys: string[]; indices: number[] }[] = [];
  for (let len = 2; len <= maxLen; len++) {
    for (let start = 0; start <= contentWords.length - len; start++) {
      const slice = contentWords.slice(start, start + len);
      ngrams.push({
        keys: slice.map((w) => w.key),
        indices: slice.map((w) => w.index),
      });
    }
  }
  return ngrams;
}

/** Build phrase index: map from key sequence to occurrences */
function buildPhraseIndex(
  data: Record<string, (RootDataEntry | null)[]>,
  field: "l" | "r"
): Map<string, PhraseOccurrence[]> {
  const index = new Map<string, PhraseOccurrence[]>();
  const verses = Object.keys(data);

  for (let v = 0; v < verses.length; v++) {
    if (v % 1000 === 0) {
      console.log(`  Processing verse ${v}/${verses.length}...`);
    }
    const verseKey = verses[v];
    const words = data[verseKey];
    const contentWords = extractContentWords(words, field);
    const ngrams = generateNgrams(contentWords, contentWords.length);

    for (const ngram of ngrams) {
      const key = ngram.keys.join("|");
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
 */
function deduplicateSubphrases(index: Map<string, PhraseOccurrence[]>): Phrase[] {
  const entries = [...index.entries()].sort((a, b) => {
    const lenA = a[0].split("|").length;
    const lenB = b[0].split("|").length;
    return lenB - lenA;
  });

  const coveredByVerse = new Map<string, Set<string>>();
  const result: Phrase[] = [];

  for (const [key, occurrences] of entries) {
    const keys = key.split("|");
    const survivingOccurrences: PhraseOccurrence[] = [];

    for (const occ of occurrences) {
      const covered = coveredByVerse.get(occ.verse);
      if (covered) {
        const isCovered = isSubsetOfAnyCoveredRange(occ.words, covered);
        if (isCovered) continue;
      }
      survivingOccurrences.push(occ);
    }

    const distinctVerses = new Set(survivingOccurrences.map((o) => o.verse));
    if (distinctVerses.size >= MIN_OCCURRENCES) {
      result.push({ keys, occurrences: survivingOccurrences });

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

// --- Generate for a single mode ---

function generate(
  data: Record<string, (RootDataEntry | null)[]>,
  mode: Mode,
  sourceChecksum: string,
  rootDir: string
) {
  const config = MODE_CONFIG[mode];
  const outputPath = path.join(rootDir, "public", config.outputFile);

  console.log(`\n=== Generating ${mode} phrases ===`);

  console.log(`Building phrase index (n-grams 2+, no length cap)...`);
  const fullIndex = buildPhraseIndex(data, config.field);
  console.log(`  ${fullIndex.size} unique ${mode} sequences found.`);

  console.log("Filtering to phrases in 2+ distinct verses...");
  const filtered = filterByMinOccurrences(fullIndex, MIN_OCCURRENCES);
  console.log(`  ${filtered.size} phrases appear in 2+ verses.`);

  console.log("Deduplicating sub-phrases...");
  const phrases = deduplicateSubphrases(filtered);
  console.log(`  ${phrases.length} phrases after deduplication.`);

  phrases.sort((a, b) => b.occurrences.length - a.occurrences.length);
  const totalOccurrences = phrases.reduce((sum, p) => sum + p.occurrences.length, 0);
  const maxLength = phrases.reduce((max, p) => Math.max(max, p.keys.length), 0);

  const output: OutputFile = {
    _meta: {
      description: config.description,
      matchBy: mode,
      maxLength,
      source: "computed from quran-roots.json",
      generated: new Date().toISOString(),
      sourceChecksum,
      stats: { totalPhrases: phrases.length, totalOccurrences },
    },
    phrases,
  };

  console.log(`Writing ${config.outputFile}...`);
  writeFileSync(outputPath, JSON.stringify(output, null, 2), "utf-8");

  console.log(`Done! Phrases: ${phrases.length}, Occurrences: ${totalOccurrences}`);
}

// --- Main ---

function main() {
  const arg = process.argv[2] || "all";
  const modes: Mode[] = arg === "all" ? ["lemma", "root"] : [arg as Mode];

  if (!modes.every((m) => m === "lemma" || m === "root")) {
    console.error(`Usage: generate-phrases.ts [lemma|root|all]`);
    process.exit(1);
  }

  const rootDir = process.cwd();
  const inputPath = path.join(rootDir, "public", "quran-roots.json");

  console.log("Reading quran-roots.json...");
  const raw = readFileSync(inputPath, "utf-8");
  const rootsFile: QuranRootsFile = JSON.parse(raw);
  const data = rootsFile.data;
  console.log(`  ${Object.keys(data).length} verses loaded.`);

  for (const mode of modes) {
    generate(data, mode, rootsFile._meta.source.checksum, rootDir);
  }
}

try {
  main();
} catch (error) {
  console.error("Generation failed:", error instanceof Error ? error.message : error);
  process.exit(1);
}
