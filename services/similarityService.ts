import { loadLocalRootData, normalizeArabic } from './analysisService';

type RootDataEntry = {
  r?: string;
  l?: string;
  t?: string;
};

type LocalRootData = Record<string, (RootDataEntry | null)[]>;

export interface SimilarityResult {
  verseKey: string;
  score: number; // 0-1
  sharedRoots: string[];
  sharedRootCount: number;
}

let verseRootsIndex: Map<string, Set<string>> | null = null;

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

const buildVerseRootsIndex = async (): Promise<Map<string, Set<string>> | null> => {
  if (verseRootsIndex) return verseRootsIndex;

  const data = (await loadLocalRootData()) as LocalRootData | null;
  if (!data) return null;

  const index = new Map<string, Set<string>>();
  for (const [verseKey, words] of Object.entries(data)) {
    const roots = new Set<string>();
    words.forEach(word => {
      if (!word?.r) return;
      const normalized = normalizeArabic(word.r);
      if (normalized) roots.add(normalized);
    });
    if (roots.size > 0) {
      index.set(verseKey, roots);
    }
  }

  verseRootsIndex = index;
  return index;
};

const getRootsForVerse = async (verseKey: string): Promise<Set<string>> => {
  const index = await buildVerseRootsIndex();
  if (!index) return new Set();
  return index.get(verseKey) || new Set();
};

export const calculateJaccardSimilarity = (verse1Roots: string[], verse2Roots: string[]): number => {
  const setA = new Set(verse1Roots.map(normalizeArabic).filter(Boolean));
  const setB = new Set(verse2Roots.map(normalizeArabic).filter(Boolean));

  if (setA.size === 0 || setB.size === 0) return 0;

  let intersection = 0;
  setA.forEach(root => {
    if (setB.has(root)) intersection += 1;
  });

  const union = setA.size + setB.size - intersection;
  if (union === 0) return 0;

  return parseFloat((intersection / union).toFixed(4));
};

export const compareVerses = async (verse1: string, verse2: string): Promise<SimilarityResult> => {
  const [roots1, roots2] = await Promise.all([getRootsForVerse(verse1), getRootsForVerse(verse2)]);

  const sharedRoots: string[] = [];
  roots1.forEach(root => {
    if (roots2.has(root)) sharedRoots.push(root);
  });

  sharedRoots.sort((a, b) => a.localeCompare(b, 'ar'));
  const score = calculateJaccardSimilarity(Array.from(roots1), Array.from(roots2));

  return {
    verseKey: verse2,
    score,
    sharedRoots,
    sharedRootCount: sharedRoots.length
  };
};

export const findSimilarVerses = async (verseKey: string, topN: number): Promise<SimilarityResult[]> => {
  const index = await buildVerseRootsIndex();
  if (!index) return [];

  const targetRoots = index.get(verseKey);
  if (!targetRoots || targetRoots.size === 0) return [];

  const results: SimilarityResult[] = [];

  for (const [otherVerseKey, roots] of index.entries()) {
    if (otherVerseKey === verseKey) continue;

    const sharedRoots: string[] = [];
    roots.forEach(root => {
      if (targetRoots.has(root)) sharedRoots.push(root);
    });

    sharedRoots.sort((a, b) => a.localeCompare(b, 'ar'));

    const score = calculateJaccardSimilarity(Array.from(targetRoots), Array.from(roots));
    if (score === 0) continue;

    results.push({
      verseKey: otherVerseKey,
      score,
      sharedRoots,
      sharedRootCount: sharedRoots.length
    });
  }

  return results
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return compareVerseKeys(a.verseKey, b.verseKey);
    })
    .slice(0, topN);
};
