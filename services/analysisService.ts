

import { Verse, QuranWord, RootAnalysis } from '../types';
import { sanitizeQuranText } from './textSanitizer';

const API_V4_BASE = 'https://api.quran.com/api/v4';
const API_CLOUD_BASE = 'https://api.alquran.cloud/v1';

// Standard Mashriqi Abjad Values
const ABJAD_MAP: Record<string, number> = {
  'ا': 1, 'أ': 1, 'إ': 1, 'آ': 1, 'ٱ': 1, 'ء': 1,
  'ب': 2, 'ج': 3, 'د': 4, 'ه': 5, 'ة': 5, 'و': 6, 'ؤ': 6, 'ز': 7, 'ح': 8, 'ط': 9, 'ي': 10, 'ى': 10, 'ئ': 10,
  'ك': 20, 'ل': 30, 'م': 40, 'ن': 50, 'س': 60, 'ع': 70, 'ف': 80, 'ص': 90, 'ق': 100,
  'ر': 200, 'ش': 300, 'ت': 400, 'ث': 500, 'خ': 600, 'ذ': 700, 'ض': 800, 'ظ': 900, 'غ': 1000
};

// Local root data cache
interface RootDataEntry {
  r: string;  // root
  l: string;  // lemma
  t: string;  // text
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

// Fetch verse text from API (with caching)
const fetchVerseText = async (verseKey: string): Promise<string> => {
  if (verseTextCache.has(verseKey)) {
    return verseTextCache.get(verseKey)!;
  }

  try {
    const response = await fetch(`https://api.alquran.cloud/v1/ayah/${verseKey}/quran-uthmani`);
    if (!response.ok) return '';
    const data = await response.json();
    const text = sanitizeQuranText(data.data?.text || '');
    verseTextCache.set(verseKey, text);
    return text;
  } catch {
    return '';
  }
};

// Batch fetch verse texts for multiple verse keys (grouped by surah for efficiency)
const batchFetchVerseTexts = async (verseKeys: string[]): Promise<Map<string, string>> => {
  const results = new Map<string, string>();

  // Group verse keys by surah
  const bySurah = new Map<number, string[]>();
  for (const key of verseKeys) {
    const [surah] = key.split(':').map(Number);
    if (!bySurah.has(surah)) bySurah.set(surah, []);
    bySurah.get(surah)!.push(key);
  }

  // Fetch each surah's verses
  const fetchPromises = Array.from(bySurah.entries()).map(async ([surahNum, keys]) => {
    // Check cache first
    const uncachedKeys = keys.filter(k => !verseTextCache.has(k));
    if (uncachedKeys.length === 0) {
      // All cached
      keys.forEach(k => results.set(k, verseTextCache.get(k)!));
      return;
    }

    try {
      const response = await fetch(`https://api.alquran.cloud/v1/surah/${surahNum}/quran-uthmani`);
      if (!response.ok) return;
      const data = await response.json();

      // Cache all verses from this surah
      for (const ayah of data.data?.ayahs || []) {
        const key = `${surahNum}:${ayah.numberInSurah}`;
        const sanitized = sanitizeQuranText(ayah.text);
        verseTextCache.set(key, sanitized);
        if (keys.includes(key)) {
          results.set(key, sanitized);
        }
      }
    } catch {
      // Fallback: fetch individually for failed surahs
      for (const key of keys) {
        const text = await fetchVerseText(key);
        if (text) results.set(key, text);
      }
    }
  });

  await Promise.all(fetchPromises);
  return results;
};

// Get data source metadata (for attribution display)
export const getDataSourceMeta = (): DataSourceMeta | null => rootDataMeta;

// Load local root data from Quranic Arabic Corpus (University of Leeds)
export const loadLocalRootData = async (): Promise<LocalRootData | null> => {
  if (localRootData) return localRootData;

  if (rootDataLoading) return rootDataLoading;

  rootDataLoading = (async () => {
    try {
      const response = await fetch('/quran-roots.json');
      if (!response.ok) {
        console.error('Failed to load local root data');
        return null;
      }
      const json = await response.json();

      // Handle both old format (flat data) and new format (with _meta)
      if (json._meta && json.data) {
        rootDataMeta = json._meta;
        localRootData = json.data;
        console.log(`Root data loaded: ${rootDataMeta.source.name} v${rootDataMeta.source.version}`);
        console.log(`Institution: ${rootDataMeta.source.institution}`);
      } else {
        // Legacy format support
        localRootData = json;
        console.log('Local root data loaded (legacy format)');
      }
      return localRootData;
    } catch (error) {
      console.error('Error loading local root data:', error);
      return null;
    }
  })();

  return rootDataLoading;
};

// Robust Normalization for Matching using NFKD decomposition
export const normalizeArabic = (text: string): string => {
  if (!text) return '';
  return text
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
    .trim();
};

export const calculateAbjad = (text: string): number => {
  let sum = 0;
  // For Abjad, we want to keep the letters but map them correctly.
  // We don't strip spaces for calculation, just iterate chars.
  const cleanText = text.replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, '');

  for (const char of cleanText) {
    const key = char;
    if (ABJAD_MAP[key]) {
      sum += ABJAD_MAP[key];
    }
  }
  return sum;
};

// Get word data from local root database
export const getVerseWordData = async (verseKey: string): Promise<QuranWord[]> => {
  const data = await loadLocalRootData();
  if (!data) {
    // Fallback to API if local data not available
    return getVerseWordDataFromAPI(verseKey);
  }

  const verseData = data[verseKey];
  if (!verseData) {
    return getVerseWordDataFromAPI(verseKey);
  }

  // Convert local data format to QuranWord format
  return verseData.map((entry, index) => ({
    id: index,
    position: index + 1,
    text_uthmani: entry?.t || '',
    text_simple: entry?.t || '',
    root: entry?.r || undefined,
    lemma: entry?.l || undefined,
  })).filter(w => w.text_uthmani); // Filter out null entries
};

// Fallback: Fetch from API (original implementation)
const getVerseWordDataFromAPI = async (verseKey: string): Promise<QuranWord[]> => {
  try {
    const response = await fetch(`${API_V4_BASE}/verses/by_key/${verseKey}?words=true&word_fields=root,text_uthmani,text_simple`);
    if (!response.ok) return [];
    const data = await response.json();
    return (data.verse?.words || []).filter((w: any) => w.char_type_name !== 'end');
  } catch (error) {
    console.error('Error fetching word data:', error);
    return [];
  }
};

// Search for verses containing a specific root using local data
export const findVersesByRoot = async (root: string): Promise<RootAnalysis> => {
  const data = await loadLocalRootData();

  if (!data) {
    // Fallback to API search
    return findVersesByRootFromAPI(root);
  }

  const normalizedSearchRoot = normalizeArabic(root);
  const matches: { verse_key: string; text: string; wordIndex: number }[] = [];

  // Search through all verses for the root
  for (const [verseKey, words] of Object.entries(data)) {
    let wordIndex = 0;
    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      if (word === null) continue;

      if (normalizeArabic(word.r) === normalizedSearchRoot) {
        matches.push({
          verse_key: verseKey,
          text: '', // Will be filled with actual verse text
          wordIndex: wordIndex
        });
        break; // Only add each verse once
      }
      wordIndex++;
    }
  }

  // Sort by verse order (chapter:verse)
  matches.sort((a, b) => {
    const [aChap, aVerse] = a.verse_key.split(':').map(Number);
    const [bChap, bVerse] = b.verse_key.split(':').map(Number);
    return aChap !== bChap ? aChap - bChap : aVerse - bVerse;
  });

  // Limit to 50 results for performance
  const limitedMatches = matches.slice(0, 50);

  // Batch fetch actual verse texts
  const verseKeys = limitedMatches.map(m => m.verse_key);
  const verseTexts = await batchFetchVerseTexts(verseKeys);

  // Fill in the actual verse texts
  for (const match of limitedMatches) {
    match.text = verseTexts.get(match.verse_key) || '';
  }

  return {
    root,
    occurrences: matches.length,
    verses: limitedMatches
  };
};

// Fallback: Search from API (original implementation)
const findVersesByRootFromAPI = async (root: string): Promise<RootAnalysis> => {
  try {
    const response = await fetch(`${API_V4_BASE}/search?q=${encodeURIComponent(root)}&size=20&language=en`);
    if (!response.ok) throw new Error('Search failed');
    const data = await response.json();

    const matches = data.search.results.map((r: any) => ({
      verse_key: r.verse_key,
      text: sanitizeQuranText(r.text)
    }));

    return {
      root,
      occurrences: data.search.total_results || matches.length,
      verses: matches
    };
  } catch (error) {
    console.error('Error finding root:', error);
    return { root, occurrences: 0, verses: [] };
  }
};

// Search for exact phrase
export const searchPhrase = async (phrase: string): Promise<{ count: number; verses: any[] }> => {
  try {
    // For phrase search, we want to keep spaces but remove tashkeel
    const cleanPhrase = phrase
      .normalize("NFKD")
      .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, "")
      .replace(/[^\u0600-\u06FF\s]/g, "") // Keep spaces
      .trim();

    if (!cleanPhrase) return { count: 0, verses: [] };

    const response = await fetch(`${API_CLOUD_BASE}/search/${encodeURIComponent(cleanPhrase)}/all/quran-simple-clean`);

    if (!response.ok) return { count: 0, verses: [] };

    const data = await response.json();

    if (!data.data || !data.data.matches) return { count: 0, verses: [] };

    return {
      count: data.data.count,
      verses: data.data.matches.map((m: any) => ({
        verse_key: `${m.surah.number}:${m.numberInSurah}`,
        text: sanitizeQuranText(m.text)
      }))
    };
  } catch (error) {
    console.error('Error searching phrase:', error);
    return { count: 0, verses: [] };
  }
};

// Enhanced matching with index support and fuzzy fallback
export const findRootOfWord = (selectedText: string, words: QuranWord[], wordIndex?: number): string | null => {
    const cleanSelection = normalizeArabic(selectedText);
    if (!cleanSelection) return null;

    // --- Strategy 1: Exact Word Index (Most Accurate) ---
    if (typeof wordIndex === 'number' && words[wordIndex]) {
         const candidate = words[wordIndex];
         const normalizedCandidate = normalizeArabic(candidate.text_uthmani || candidate.text_simple || "");

         // Sanity Check: Ensure the indexed word roughly resembles the selected text.
         // This guards against misalignment between DOM tokens and API words.
         // We allow partial matches because user might select part of a word.
         const isMatch =
            normalizedCandidate.includes(cleanSelection) ||
            cleanSelection.includes(normalizedCandidate) ||
            // Allow for minor edits (like Alef differences) if length is close
            (Math.abs(normalizedCandidate.length - cleanSelection.length) <= 2 && calculateOverlap(normalizedCandidate, cleanSelection) > 0.6);

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

            const score = (overlap * 10) - lengthPenalty; // Scale overlap to 0-10 range basically
            if (score > wordMaxScore) wordMaxScore = score;
        }

        if (wordMaxScore > bestScore) {
            bestScore = wordMaxScore;
            bestMatch = word;
        }
    }

    // Threshold: Require at least decent overlap
    if (bestMatch && bestScore > 4) { // Arbitrary threshold based on heuristic
        return bestMatch.root || null;
    }

    return null;
};

// Helper: Calculate Jaccard-like character overlap
const calculateOverlap = (str1: string, str2: string): number => {
    const set1 = new Set(str1.split(''));
    const set2 = new Set(str2.split(''));

    let intersection = 0;
    set1.forEach(char => {
        if (set2.has(char)) intersection++;
    });

    const union = new Set([...set1, ...set2]).size;
    return union === 0 ? 0 : intersection / union;
};
