#!/usr/bin/env bun
/**
 * Generates phrase data files from quran-roots.json
 *
 * Finds all repeated sequences (length 2+) across Quran verses.
 * Supports three modes:
 *   - lemma:   match by lemma (exact dictionary form) → quran-phrases.json
 *   - root:    match by root (3-letter root)          → quran-root-phrases.json
 *   - surface: match by normalized word text           → quran-surface-phrases.json
 *              (only n-grams containing at least one particle/function word)
 *
 * Usage:
 *   bun run scripts/generate-phrases.ts          # generates all files
 *   bun run scripts/generate-phrases.ts lemma    # lemma only
 *   bun run scripts/generate-phrases.ts root     # root only
 *   bun run scripts/generate-phrases.ts surface  # surface only
 *   bun run scripts/generate-phrases.ts all      # all (default)
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

interface SurahFile {
  surahId: number;
  verses: { id: number; numberInSurah: number; text_uthmani: string; text_simple: string }[];
}

interface OutputFile {
  _meta: {
    description: string;
    matchBy: "lemma" | "root" | "surface";
    maxLength: number;
    source: string;
    generated: string;
    sourceChecksum: string;
    stats: { totalPhrases: number; totalOccurrences: number };
  };
  phrases: Phrase[];
}

type Mode = "lemma" | "root" | "surface";

// --- Constants ---

const MIN_OCCURRENCES = 2;

const CONTENT_MODE_CONFIG: Record<
  "lemma" | "root",
  { field: "l" | "r"; outputFile: string; description: string }
> = {
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

const SURFACE_CONFIG = {
  outputFile: "quran-surface-phrases.json",
  description: "Repeated surface-form sequences involving particles across Quran verses",
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

/** Convert filtered index to Phrase array */
function toPhrases(index: Map<string, PhraseOccurrence[]>): Phrase[] {
  return [...index.entries()].map(([key, occurrences]) => ({
    keys: key.split("|"),
    occurrences,
  }));
}

// --- Surface-form specific logic ---

/** Normalize Arabic text for surface-form matching (mirrors analysisService.normalizeArabic) */
function normalizeArabic(text: string): string {
  if (!text) return "";
  return text
    .normalize("NFKD")
    .replace(/\u0640/g, "") // Tatweel/Kashida
    .replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]/g, "") // Tashkeel
    .replace(/[ٱإأآ]/g, "ا") // Normalize Alefs
    .replace(/[ى]/g, "ي") // Normalize Ya/Alef Maqsura
    .replace(/[ئ]/g, "ي")
    .replace(/[ؤ]/g, "و") // Normalize Waw
    .replace(/[ة]/g, "ه") // Normalize Ta Marbuta
    .replace(/[^\u0600-\u06FF]/g, "") // Keep only Arabic
    .trim();
}

/** Load all per-surah JSON files and build a map of verseKey → word texts */
function loadVerseTexts(rootDir: string): Map<string, string[]> {
  const verseTexts = new Map<string, string[]>();
  for (let surah = 1; surah <= 114; surah++) {
    const filePath = path.join(rootDir, "public", "data", "quran", `${surah}.json`);
    const raw = readFileSync(filePath, "utf-8");
    const surahFile: SurahFile = JSON.parse(raw);
    for (const verse of surahFile.verses) {
      const verseKey = `${surah}:${verse.numberInSurah}`;
      verseTexts.set(verseKey, verse.text_uthmani.split(/\s+/));
    }
  }
  return verseTexts;
}

/** Extract all words (content + particles) with normalized keys and particle flags */
function extractAllWords(
  rootWords: (RootDataEntry | null)[],
  textWords: string[]
): { key: string; index: number; isParticle: boolean }[] {
  const result: { key: string; index: number; isParticle: boolean }[] = [];
  const len = Math.min(rootWords.length, textWords.length);
  for (let i = 0; i < len; i++) {
    const key = normalizeArabic(textWords[i]);
    if (key) {
      result.push({ key, index: i, isParticle: rootWords[i] === null });
    }
  }
  return result;
}

/** Generate n-grams that contain at least one particle */
function generateSurfaceNgrams(
  allWords: { key: string; index: number; isParticle: boolean }[],
  maxLen: number
): { keys: string[]; indices: number[] }[] {
  const ngrams: { keys: string[]; indices: number[] }[] = [];
  for (let len = 2; len <= maxLen; len++) {
    for (let start = 0; start <= allWords.length - len; start++) {
      const slice = allWords.slice(start, start + len);
      // Only keep n-grams that include at least one particle
      if (slice.some((w) => w.isParticle)) {
        ngrams.push({
          keys: slice.map((w) => w.key),
          indices: slice.map((w) => w.index),
        });
      }
    }
  }
  return ngrams;
}

/** Build surface phrase index: only n-grams containing particles */
function buildSurfacePhraseIndex(
  data: Record<string, (RootDataEntry | null)[]>,
  verseTexts: Map<string, string[]>
): Map<string, PhraseOccurrence[]> {
  const index = new Map<string, PhraseOccurrence[]>();
  const verses = Object.keys(data);

  for (let v = 0; v < verses.length; v++) {
    if (v % 1000 === 0) {
      console.log(`  Processing verse ${v}/${verses.length}...`);
    }
    const verseKey = verses[v];
    const rootWords = data[verseKey];
    const textWords = verseTexts.get(verseKey);
    if (!textWords) continue;

    const allWords = extractAllWords(rootWords, textWords);
    const ngrams = generateSurfaceNgrams(allWords, allWords.length);

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

// --- Generate for a single mode ---

function writeOutput(
  phrases: Phrase[],
  outputPath: string,
  outputFile: string,
  description: string,
  matchBy: "lemma" | "root" | "surface",
  sourceChecksum: string
) {
  phrases.sort((a, b) => b.occurrences.length - a.occurrences.length);
  const totalOccurrences = phrases.reduce((sum, p) => sum + p.occurrences.length, 0);
  const maxLength = phrases.reduce((max, p) => Math.max(max, p.keys.length), 0);

  const output: OutputFile = {
    _meta: {
      description,
      matchBy,
      maxLength,
      source: "computed from quran-roots.json",
      generated: new Date().toISOString(),
      sourceChecksum,
      stats: { totalPhrases: phrases.length, totalOccurrences },
    },
    phrases,
  };

  console.log(`Writing ${outputFile}...`);
  writeFileSync(outputPath, JSON.stringify(output, null, 2), "utf-8");
  console.log(`Done! Phrases: ${phrases.length}, Occurrences: ${totalOccurrences}`);
}

function generateContentMode(
  data: Record<string, (RootDataEntry | null)[]>,
  mode: "lemma" | "root",
  sourceChecksum: string,
  rootDir: string
) {
  const config = CONTENT_MODE_CONFIG[mode];
  const outputPath = path.join(rootDir, "public", config.outputFile);

  console.log(`\n=== Generating ${mode} phrases ===`);

  console.log(`Building phrase index (n-grams 2+, no length cap)...`);
  const fullIndex = buildPhraseIndex(data, config.field);
  console.log(`  ${fullIndex.size} unique ${mode} sequences found.`);

  console.log("Filtering to phrases in 2+ distinct verses...");
  const filtered = filterByMinOccurrences(fullIndex, MIN_OCCURRENCES);
  console.log(`  ${filtered.size} phrases appear in 2+ verses.`);

  const phrases = toPhrases(filtered);
  console.log(`  ${phrases.length} phrases to write.`);

  writeOutput(phrases, outputPath, config.outputFile, config.description, mode, sourceChecksum);
}

function generateSurface(
  data: Record<string, (RootDataEntry | null)[]>,
  sourceChecksum: string,
  rootDir: string
) {
  const outputPath = path.join(rootDir, "public", SURFACE_CONFIG.outputFile);

  console.log(`\n=== Generating surface phrases ===`);

  console.log("Loading per-surah verse texts...");
  const verseTexts = loadVerseTexts(rootDir);
  console.log(`  ${verseTexts.size} verses loaded from surah files.`);

  console.log("Building surface phrase index (n-grams 2+, particle-containing only)...");
  const fullIndex = buildSurfacePhraseIndex(data, verseTexts);
  console.log(`  ${fullIndex.size} unique surface sequences found.`);

  console.log("Filtering to phrases in 2+ distinct verses...");
  const filtered = filterByMinOccurrences(fullIndex, MIN_OCCURRENCES);
  console.log(`  ${filtered.size} phrases appear in 2+ verses.`);

  const phrases = toPhrases(filtered);
  console.log(`  ${phrases.length} phrases to write.`);

  writeOutput(
    phrases,
    outputPath,
    SURFACE_CONFIG.outputFile,
    SURFACE_CONFIG.description,
    "surface",
    sourceChecksum
  );
}

// --- Main ---

function main() {
  const arg = process.argv[2] || "all";
  const validModes = ["lemma", "root", "surface", "all"];

  if (!validModes.includes(arg)) {
    console.error(`Usage: generate-phrases.ts [lemma|root|surface|all]`);
    process.exit(1);
  }

  const modes: Mode[] = arg === "all" ? ["lemma", "root", "surface"] : [arg as Mode];

  const rootDir = process.cwd();
  const inputPath = path.join(rootDir, "public", "quran-roots.json");

  console.log("Reading quran-roots.json...");
  const raw = readFileSync(inputPath, "utf-8");
  const rootsFile: QuranRootsFile = JSON.parse(raw);
  const data = rootsFile.data;
  console.log(`  ${Object.keys(data).length} verses loaded.`);

  for (const mode of modes) {
    if (mode === "surface") {
      generateSurface(data, rootsFile._meta.source.checksum, rootDir);
    } else {
      generateContentMode(data, mode, rootsFile._meta.source.checksum, rootDir);
    }
  }
}

try {
  main();
} catch (error) {
  console.error("Generation failed:", error instanceof Error ? error.message : error);
  process.exit(1);
}
