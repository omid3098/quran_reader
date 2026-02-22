import { QuranWord, RootAnalysis, RootWordForm } from "../types";
import { sanitizeQuranText } from "./textSanitizer";
import { loadSurahText } from "./localDataService";

// Standard Mashriqi Abjad Values
const ABJAD_MAP: Record<string, number> = {
  ا: 1,
  أ: 1,
  إ: 1,
  آ: 1,
  ٱ: 1,
  ء: 1,
  ب: 2,
  ج: 3,
  د: 4,
  ه: 5,
  ة: 5,
  و: 6,
  ؤ: 6,
  ز: 7,
  ح: 8,
  ط: 9,
  ي: 10,
  ى: 10,
  ئ: 10,
  ك: 20,
  ل: 30,
  م: 40,
  ن: 50,
  س: 60,
  ع: 70,
  ف: 80,
  ص: 90,
  ق: 100,
  ر: 200,
  ش: 300,
  ت: 400,
  ث: 500,
  خ: 600,
  ذ: 700,
  ض: 800,
  ظ: 900,
  غ: 1000,
};

// Local root data cache
interface RootDataEntry {
  r: string; // root
  l: string; // lemma
  t: string; // text
}

// Metadata from Quranic Arabic Corpus
interface DataSourceMeta {
  source: {
    name: string;
    version: string;
    repository: string;
    institution: string;
    checksum: string;
  };
  generated: string;
  stats: {
    totalVerses: number;
    uniqueRoots: number;
  };
}

type LocalRootData = Record<string, (RootDataEntry | null)[]>;

let localRootData: LocalRootData | null = null;
let rootDataMeta: DataSourceMeta | null = null;
let rootDataLoading: Promise<LocalRootData | null> | null = null;

// Verse text cache for concordance display
const verseTextCache: Map<string, string> = new Map();

// Batch load verse texts for multiple verse keys (grouped by surah for efficiency)
const batchFetchVerseTexts = async (verseKeys: string[]): Promise<Map<string, string>> => {
  const results = new Map<string, string>();

  // Group verse keys by surah
  const bySurah = new Map<number, string[]>();
  for (const key of verseKeys) {
    const [surah] = key.split(":").map(Number);
    if (!bySurah.has(surah)) bySurah.set(surah, []);
    bySurah.get(surah)!.push(key);
  }

  // Load each surah's data locally
  const loadPromises = Array.from(bySurah.entries()).map(async ([surahNum, keys]) => {
    // Check cache first
    const uncachedKeys = keys.filter((k) => !verseTextCache.has(k));
    if (uncachedKeys.length === 0) {
      keys.forEach((k) => results.set(k, verseTextCache.get(k)!));
      return;
    }

    try {
      const surahText = await loadSurahText(surahNum);

      // Cache all verses from this surah
      for (const v of surahText.verses) {
        const key = `${surahNum}:${v.numberInSurah}`;
        verseTextCache.set(key, v.text_uthmani);
        if (keys.includes(key)) {
          results.set(key, v.text_uthmani);
        }
      }
    } catch {
      // Surah data not available
    }
  });

  await Promise.all(loadPromises);
  return results;
};

// Get data source metadata (for attribution display)
export const getDataSourceMeta = (): DataSourceMeta | null => rootDataMeta;

// Load local root data from Quranic Arabic Corpus (University of Leeds)
export const loadLocalRootData = async (): Promise<LocalRootData | null> => {
  if (localRootData) return localRootData;

  if (rootDataLoading) return rootDataLoading;

  rootDataLoading = (async () => {
    const baseUrl = import.meta.env.BASE_URL || "/";
    // Try the configured base first, then fall back to common public paths
    const candidateUrls = [`${baseUrl}quran-roots.json`, "/quran-roots.json", "quran-roots.json"];

    for (const url of candidateUrls) {
      try {
        const response = await fetch(url);
        if (!response.ok) {
          console.error(
            `Failed to load local root data from ${url}. Status: ${response.status} ${response.statusText}`
          );
          continue;
        }
        const json = await response.json();

        // Handle both old format (flat data) and new format (with _meta)
        if (json._meta && json.data) {
          rootDataMeta = json._meta;
          localRootData = json.data;
        } else {
          // Legacy format support
          localRootData = json;
        }
        return localRootData;
      } catch (error) {
        console.error(`Error loading local root data from ${url}:`, error);
      }
    }

    return null;
  })();

  return rootDataLoading;
};

// Robust Normalization for Matching using NFKD decomposition
export const normalizeArabic = (text: string): string => {
  if (!text) return "";
  return (
    text
      .normalize("NFKD")
      // Remove Tatweel/Kashida
      .replace(/\u0640/g, "")
      // Remove Tashkeel (Common + Quranic marks + Superscript Alef + Honorifics + End of Ayah)
      // Range 064B-065F covers most diacritics. 0670 is superscript Alef. 06DD is End of Ayah.
      .replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]/g, "")
      // Normalize Alefs (Wasla, Hamza, etc) to bare Alef
      .replace(/[ٱإأآ]/g, "ا")
      // Normalize Ya/Alef Maqsura
      .replace(/[ى]/g, "ي")
      .replace(/[ئ]/g, "ي")
      // Normalize Waw
      .replace(/[ؤ]/g, "و")
      // Normalize Ta Marbuta
      .replace(/[ة]/g, "ه")
      // Remove non-Arabic and non-Letter characters (keeps only the main block)
      .replace(/[^\u0600-\u06FF]/g, "")
      .trim()
  );
};

export const calculateAbjad = (text: string): number => {
  let sum = 0;
  // For Abjad, we want to keep the letters but map them correctly.
  // We don't strip spaces for calculation, just iterate chars.
  const cleanText = text.replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, "");

  for (const char of cleanText) {
    const key = char;
    if (ABJAD_MAP[key]) {
      sum += ABJAD_MAP[key];
    }
  }
  return sum;
};

// Abjad index cache: maps abjad value -> array of unique words with that value
let abjadIndex: Map<number, string[]> | null = null;
let abjadIndexLoading: Promise<Map<number, string[]>> | null = null;

// Build the abjad index from all Quranic words (cached)
const buildAbjadIndex = async (): Promise<Map<number, string[]>> => {
  if (abjadIndex) return abjadIndex;

  if (abjadIndexLoading) return abjadIndexLoading;

  abjadIndexLoading = (async () => {
    const data = await loadLocalRootData();
    const index = new Map<number, string[]>();
    const seenNormalized = new Set<string>();

    if (data) {
      for (const words of Object.values(data)) {
        for (const word of words) {
          if (word?.t) {
            const normalized = normalizeArabic(word.t);
            // Skip if we've already processed this normalized form
            if (seenNormalized.has(normalized)) continue;
            seenNormalized.add(normalized);

            const abjad = calculateAbjad(word.t);
            if (!index.has(abjad)) {
              index.set(abjad, []);
            }
            index.get(abjad)!.push(sanitizeQuranText(word.t));
          }
        }
      }
    }

    abjadIndex = index;
    return index;
  })();

  return abjadIndexLoading;
};

// Find words with the same Abjad value as the target
export const findWordsWithSameAbjad = async (
  targetAbjad: number,
  excludeNormalized?: string
): Promise<string[]> => {
  const index = await buildAbjadIndex();
  const words = index.get(targetAbjad) || [];

  if (excludeNormalized) {
    // Filter out the word we're analyzing
    return words.filter((w) => normalizeArabic(w) !== excludeNormalized);
  }

  return words;
};

// Word-to-root index cache: maps normalized word -> root
let wordToRootIndex: Map<string, string> | null = null;
let wordToRootIndexLoading: Promise<Map<string, string>> | null = null;

// Build the word-to-root index from all Quranic words (cached)
const buildWordToRootIndex = async (): Promise<Map<string, string>> => {
  if (wordToRootIndex) return wordToRootIndex;

  if (wordToRootIndexLoading) return wordToRootIndexLoading;

  wordToRootIndexLoading = (async () => {
    const data = await loadLocalRootData();
    const index = new Map<string, string>();

    if (data) {
      for (const words of Object.values(data)) {
        for (const word of words) {
          if (word?.t && word?.r) {
            const normalized = normalizeArabic(word.t);
            if (normalized && !index.has(normalized)) {
              index.set(normalized, word.r);
            }
          }
        }
      }
    }

    wordToRootIndex = index;
    return index;
  })();

  return wordToRootIndexLoading;
};

// Find the root for a standalone Arabic word (without verse context)
export const findRootForWord = async (word: string): Promise<string | null> => {
  const index = await buildWordToRootIndex();
  const normalized = normalizeArabic(word);

  if (!normalized) return null;

  return index.get(normalized) || null;
};

// Get word data from local root database
export const getVerseWordData = async (verseKey: string): Promise<QuranWord[]> => {
  const data = await loadLocalRootData();
  if (!data) return [];

  const verseData = data[verseKey];
  if (!verseData) return [];

  // Convert local data format to QuranWord format
  return verseData
    .map((entry, index) => ({
      id: index,
      position: index + 1,
      text_uthmani: entry?.t || "",
      text_simple: entry?.t || "",
      root: entry?.r || undefined,
      lemma: entry?.l || undefined,
    }))
    .filter((w) => w.text_uthmani); // Filter out null entries
};

// Search for verses containing a specific root using local data
export const findVersesByRoot = async (root: string): Promise<RootAnalysis> => {
  const data = await loadLocalRootData();

  if (!data) {
    return { root, occurrences: 0, verses: [], wordForms: [] };
  }

  const normalizedSearchRoot = normalizeArabic(root);
  const matches: { verse_key: string; text: string; wordIndex: number }[] = [];
  const wordFormsMap: Map<string, RootWordForm> = new Map();

  // Search through all verses for the root
  for (const [verseKey, words] of Object.entries(data)) {
    let wordIndex = 0;
    let verseRecorded = false;
    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      if (word === null) continue;

      if (normalizeArabic(word.r) === normalizedSearchRoot) {
        const normalizedForm = normalizeArabic(word.t || "");
        if (normalizedForm) {
          const existing = wordFormsMap.get(normalizedForm);
          if (existing) {
            existing.occurrences += 1;
          } else {
            wordFormsMap.set(normalizedForm, {
              form: sanitizeQuranText(word.t || ""),
              normalizedForm,
              lemma: word.l || undefined,
              occurrences: 1,
            });
          }
        }

        if (!verseRecorded) {
          matches.push({
            verse_key: verseKey,
            text: "", // Will be filled with actual verse text
            wordIndex: wordIndex,
          });
          verseRecorded = true; // Only add each verse once
        }
      }
      wordIndex++;
    }
  }

  // Sort by verse order (chapter:verse)
  matches.sort((a, b) => {
    const [aChap, aVerse] = a.verse_key.split(":").map(Number);
    const [bChap, bVerse] = b.verse_key.split(":").map(Number);
    return aChap !== bChap ? aChap - bChap : aVerse - bVerse;
  });

  // Limit to 50 results for performance
  const limitedMatches = matches.slice(0, 50);

  // Batch fetch actual verse texts
  const verseKeys = limitedMatches.map((m) => m.verse_key);
  const verseTexts = await batchFetchVerseTexts(verseKeys);

  // Fill in the actual verse texts
  for (const match of limitedMatches) {
    match.text = verseTexts.get(match.verse_key) || "";
  }

  const wordForms = Array.from(wordFormsMap.values()).sort((a, b) => {
    if (b.occurrences !== a.occurrences) return b.occurrences - a.occurrences;
    return a.form.localeCompare(b.form, "ar");
  });

  return {
    root,
    occurrences: matches.length,
    verses: limitedMatches,
    allVerseKeys: matches.map((m) => m.verse_key),
    wordForms,
  };
};

// Normalize text for phrase search (keep spaces, remove diacritics, normalize letters)
const normalizeForSearch = (text: string): string => {
  return text
    .normalize("NFKD")
    .replace(/\u0640/g, "") // tatweel
    .replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]/g, "") // tashkeel
    .replace(/[ٱإأآ]/g, "ا")
    .replace(/[ى]/g, "ي")
    .replace(/[ئ]/g, "ي")
    .replace(/[ؤ]/g, "و")
    .replace(/[ة]/g, "ه")
    .replace(/\s+/g, " ")
    .trim();
};

// Search for exact phrase using local data
export const searchPhrase = async (
  phrase: string
): Promise<{ count: number; verses: { verse_key: string; text: string }[] }> => {
  try {
    // For phrase search, we want to keep spaces but remove tashkeel
    const cleanPhrase = phrase
      .normalize("NFKD")
      .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, "")
      .replace(/[^\u0600-\u06FF\s]/g, "") // Keep spaces
      .trim();

    if (!cleanPhrase) return { count: 0, verses: [] };

    const normalizedPhrase = normalizeForSearch(cleanPhrase);
    if (!normalizedPhrase) return { count: 0, verses: [] };

    // Use local root data to search through all verses
    const rootData = await loadLocalRootData();
    if (!rootData) return { count: 0, verses: [] };

    const results: { verse_key: string; text: string }[] = [];

    for (const [verseKey, words] of Object.entries(rootData)) {
      // Reconstruct verse text from word entries
      const verseText = words
        .filter((w): w is { r: string; l: string; t: string } => w !== null)
        .map((w) => w.t)
        .join(" ");

      const normalizedVerse = normalizeForSearch(verseText);
      if (normalizedVerse.includes(normalizedPhrase)) {
        results.push({ verse_key: verseKey, text: sanitizeQuranText(verseText) });
      }
    }

    // Sort by verse order
    results.sort((a, b) => {
      const [aS, aV] = a.verse_key.split(":").map(Number);
      const [bS, bV] = b.verse_key.split(":").map(Number);
      return aS !== bS ? aS - bS : aV - bV;
    });

    return { count: results.length, verses: results };
  } catch (error) {
    console.error("Error searching phrase:", error);
    return { count: 0, verses: [] };
  }
};

// Enhanced matching with index support and fuzzy fallback
export const findRootOfWord = (
  selectedText: string,
  words: QuranWord[],
  wordIndex?: number
): string | null => {
  const cleanSelection = normalizeArabic(selectedText);
  if (!cleanSelection) return null;

  // --- Strategy 1: Exact Word Index (Most Accurate) ---
  if (typeof wordIndex === "number" && words[wordIndex]) {
    const candidate = words[wordIndex];
    const normalizedCandidate = normalizeArabic(
      candidate.text_uthmani || candidate.text_simple || ""
    );

    // Sanity Check: Ensure the indexed word roughly resembles the selected text.
    // This guards against misalignment between DOM tokens and API words.
    // We allow partial matches because user might select part of a word.
    const isMatch =
      normalizedCandidate.includes(cleanSelection) ||
      cleanSelection.includes(normalizedCandidate) ||
      // Allow for minor edits (like Alef differences) if length is close
      (Math.abs(normalizedCandidate.length - cleanSelection.length) <= 2 &&
        calculateOverlap(normalizedCandidate, cleanSelection) > 0.6);

    if (isMatch && candidate.root) {
      return candidate.root;
    }
  }

  // --- Strategy 2: Fuzzy Scoring (Fallback) ---
  // If index failed or wasn't provided, scan all words for the best text match.

  let bestScore = 0;
  let bestMatch: QuranWord | null = null;

  for (const word of words) {
    if (!word.root) continue; // Skip words without roots for this purpose

    const rawTexts = [word.text_uthmani, word.text_simple].filter(Boolean) as string[];
    let wordMaxScore = 0;

    for (const raw of rawTexts) {
      const normalizedRaw = normalizeArabic(raw);

      // Perfect match bonus
      if (normalizedRaw === cleanSelection) {
        wordMaxScore = 100;
        break;
      }

      // Overlap Score
      const overlap = calculateOverlap(normalizedRaw, cleanSelection);

      // Length penalty (prefer matches of similar length)
      const lenDiff = Math.abs(normalizedRaw.length - cleanSelection.length);
      const lengthPenalty = lenDiff * 0.1; // Subtract 10% per character difference

      const score = overlap * 10 - lengthPenalty; // Scale overlap to 0-10 range basically
      if (score > wordMaxScore) wordMaxScore = score;
    }

    if (wordMaxScore > bestScore) {
      bestScore = wordMaxScore;
      bestMatch = word;
    }
  }

  // Threshold: Require at least decent overlap
  if (bestMatch && bestScore > 4) {
    // Arbitrary threshold based on heuristic
    return bestMatch.root || null;
  }

  return null;
};

// Helper: Calculate Jaccard-like character overlap
const calculateOverlap = (str1: string, str2: string): number => {
  const set1 = new Set(str1.split(""));
  const set2 = new Set(str2.split(""));

  let intersection = 0;
  set1.forEach((char) => {
    if (set2.has(char)) intersection++;
  });

  const union = new Set([...set1, ...set2]).size;
  return union === 0 ? 0 : intersection / union;
};
