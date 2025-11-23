import { loadLocalRootData } from './analysisService';
import { sanitizeQuranText } from './textSanitizer';

interface RootDataEntry {
  r?: string; // root
  l?: string; // lemma
  t?: string; // text
}

export interface LetterStats {
  letter: string;
  count: number;
  percentage: number;
}

export interface LetterAnalysisResult {
  totalLetters: number;
  uniqueLetters: number;
  distribution: LetterStats[];
}

type LocalRootData = Record<string, (RootDataEntry | null)[]>;

const ARABIC_LETTER_REGEX = /[\u0621-\u063A\u0641-\u064A\u066E-\u066F\u0671-\u06D3\u06FA-\u06FF]/;
const DIACRITICS_REGEX = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]/g;
const TATWEEL_REGEX = /\u0640/g;

const EMPTY_RESULT: LetterAnalysisResult = {
  totalLetters: 0,
  uniqueLetters: 0,
  distribution: []
};

const parseVerseKey = (verseKey: string): { surah: number; ayah: number } => {
  const [surah, ayah] = verseKey.split(':').map(Number);
  return { surah: surah || 0, ayah: ayah || 0 };
};

const compareVerseKeys = (a: string, b: string): number => {
  const parsedA = parseVerseKey(a);
  const parsedB = parseVerseKey(b);
  if (parsedA.surah !== parsedB.surah) return parsedA.surah - parsedB.surah;
  return parsedA.ayah - parsedB.ayah;
};

const buildVerseText = (words: (RootDataEntry | null)[]): string => {
  const text = words
    .filter(Boolean)
    .map(word => (word as RootDataEntry).t || '')
    .join(' ');
  return sanitizeQuranText(text);
};

const extractLetters = (text: string): string[] => {
  if (!text) return [];

  // Remove ornamental characters, tatweel, and diacritics, keep base letters only.
  const cleaned = sanitizeQuranText(text)
    .normalize('NFD')
    .replace(DIACRITICS_REGEX, '')
    .replace(TATWEEL_REGEX, '');

  const letters: string[] = [];
  for (const char of cleaned) {
    if (ARABIC_LETTER_REGEX.test(char)) {
      letters.push(char);
    }
  }
  return letters;
};

export const countLetters = (text: string): Map<string, number> => {
  const counts = new Map<string, number>();
  for (const letter of extractLetters(text)) {
    counts.set(letter, (counts.get(letter) ?? 0) + 1);
  }
  return counts;
};

const buildResultFromCounts = (counts: Map<string, number>): LetterAnalysisResult => {
  if (counts.size === 0) return EMPTY_RESULT;

  const totalLetters = Array.from(counts.values()).reduce((sum, value) => sum + value, 0);

  const distribution = Array.from(counts.entries())
    .map(([letter, count]) => ({
      letter,
      count,
      percentage: totalLetters ? parseFloat(((count / totalLetters) * 100).toFixed(2)) : 0
    }))
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return a.letter.localeCompare(b.letter, 'ar');
    });

  return {
    totalLetters,
    uniqueLetters: counts.size,
    distribution
  };
};

const countLettersForVerseKeys = (verseKeys: string[], data: LocalRootData): LetterAnalysisResult => {
  if (verseKeys.length === 0) return EMPTY_RESULT;

  const aggregate = new Map<string, number>();

  for (const verseKey of verseKeys) {
    const words = data[verseKey];
    if (!words) continue;

    const verseCounts = countLetters(buildVerseText(words));
    for (const [letter, count] of verseCounts.entries()) {
      aggregate.set(letter, (aggregate.get(letter) ?? 0) + count);
    }
  }

  return buildResultFromCounts(aggregate);
};

export const analyzeVerse = async (verseKey: string): Promise<LetterAnalysisResult> => {
  const data = await loadLocalRootData();
  if (!data || !data[verseKey]) return EMPTY_RESULT;

  const counts = countLetters(buildVerseText(data[verseKey]));
  return buildResultFromCounts(counts);
};

export const analyzeSurah = async (surahNumber: number): Promise<LetterAnalysisResult> => {
  const data = await loadLocalRootData();
  if (!data) return EMPTY_RESULT;

  const verseKeys = Object.keys(data).filter(key => key.startsWith(`${surahNumber}:`));
  return countLettersForVerseKeys(verseKeys, data);
};

export const analyzeRange = async (startVerse: string, endVerse: string): Promise<LetterAnalysisResult> => {
  const data = await loadLocalRootData();
  if (!data) return EMPTY_RESULT;

  let start = parseVerseKey(startVerse);
  let end = parseVerseKey(endVerse);

  // Normalize ordering if inputs are reversed.
  if (compareVerseKeys(endVerse, startVerse) < 0) {
    [start, end] = [end, start];
  }

  const verseKeysInRange = Object.keys(data)
    .filter(key => {
      const parsed = parseVerseKey(key);
      const afterStart = parsed.surah > start.surah || (parsed.surah === start.surah && parsed.ayah >= start.ayah);
      const beforeEnd = parsed.surah < end.surah || (parsed.surah === end.surah && parsed.ayah <= end.ayah);
      return afterStart && beforeEnd;
    })
    .sort(compareVerseKeys);

  return countLettersForVerseKeys(verseKeysInRange, data);
};
