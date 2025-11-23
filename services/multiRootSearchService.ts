import { loadLocalRootData, normalizeArabic } from "./analysisService";
import { sanitizeQuranText } from "./textSanitizer";

type RootDataEntry = {
  r?: string;
  l?: string;
  t?: string;
};

type _LocalRootData = Record<string, (RootDataEntry | null)[]>;

export type BooleanOperator = "AND" | "OR" | "NOT";

export interface SearchQuery {
  roots: string[];
  operator: BooleanOperator;
  proximity?: number;
}

export interface SearchResult {
  verseKey: string;
  verseText: string;
  matchedRoots: string[];
  positions: number[]; // 1-based word positions
}

const normalizeRoot = (root: string): string => normalizeArabic(root || "");

const parseVerseKey = (verseKey: string): { surah: number; ayah: number } => {
  const [surah, ayah] = verseKey.split(":").map(Number);
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
    .map((word) => (word as RootDataEntry).t || "")
    .join(" ");
  return sanitizeQuranText(text);
};

const findMinDistance = (a: number[], b: number[]): number => {
  let best = Number.POSITIVE_INFINITY;
  for (const posA of a) {
    for (const posB of b) {
      const distance = Math.abs(posA - posB);
      if (distance < best) best = distance;
    }
  }
  return best;
};

const meetsProximity = (
  positionsByRoot: Map<string, number[]>,
  normalizedRoots: string[],
  maxDistance?: number
): boolean => {
  if (typeof maxDistance !== "number" || maxDistance < 0 || normalizedRoots.length < 2) return true;

  const presentRoots = normalizedRoots.filter((root) => positionsByRoot.has(root));
  if (presentRoots.length < 2) return false;

  let best = Number.POSITIVE_INFINITY;
  for (let i = 0; i < presentRoots.length; i++) {
    for (let j = i + 1; j < presentRoots.length; j++) {
      const positionsA = positionsByRoot.get(presentRoots[i]) || [];
      const positionsB = positionsByRoot.get(presentRoots[j]) || [];
      best = Math.min(best, findMinDistance(positionsA, positionsB));
    }
  }

  return best <= maxDistance;
};

export const searchByRoots = async (query: SearchQuery): Promise<SearchResult[]> => {
  const normalizedRoots = Array.from(new Set(query.roots.map(normalizeRoot))).filter(Boolean);
  if (normalizedRoots.length === 0) return [];
  const normalizedRootSet = new Set(normalizedRoots);

  const data = await loadLocalRootData();
  if (!data) return [];

  const results: SearchResult[] = [];

  for (const [verseKey, words] of Object.entries(data)) {
    const positionsByRoot = new Map<string, number[]>();
    const matchedRoots = new Set<string>();
    const matchedPositions: number[] = [];

    words.forEach((word, index) => {
      if (!word?.r) return;
      const normalized = normalizeRoot(word.r);
      if (!normalized) return;

      if (normalizedRootSet.has(normalized)) {
        matchedRoots.add(word.r);
        matchedPositions.push(index + 1);
        const existing = positionsByRoot.get(normalized) || [];
        existing.push(index + 1);
        positionsByRoot.set(normalized, existing);
      }
    });

    let matches = false;
    switch (query.operator) {
      case "AND":
        matches = normalizedRoots.every((root) => positionsByRoot.has(root));
        break;
      case "OR":
        matches = matchedPositions.length > 0;
        break;
      case "NOT":
        matches = normalizedRoots.every((root) => !positionsByRoot.has(root));
        break;
    }

    if (!matches) continue;
    if (
      query.operator !== "NOT" &&
      !meetsProximity(positionsByRoot, normalizedRoots, query.proximity)
    )
      continue;

    results.push({
      verseKey,
      verseText: buildVerseText(words),
      matchedRoots: Array.from(matchedRoots),
      positions: matchedPositions,
    });
  }

  return results.sort((a, b) => compareVerseKeys(a.verseKey, b.verseKey));
};

export const searchWithProximity = async (
  root1: string,
  root2: string,
  maxDistance: number
): Promise<SearchResult[]> => {
  const normalizedA = normalizeRoot(root1);
  const normalizedB = normalizeRoot(root2);
  if (!normalizedA || !normalizedB) return [];
  if (maxDistance < 0) return [];

  const data = await loadLocalRootData();
  if (!data) return [];

  const results: SearchResult[] = [];

  for (const [verseKey, words] of Object.entries(data)) {
    const positionsA: number[] = [];
    const positionsB: number[] = [];
    const matchedRoots = new Set<string>();

    words.forEach((word, index) => {
      if (!word?.r) return;
      const normalized = normalizeRoot(word.r);
      if (normalized === normalizedA) {
        positionsA.push(index + 1);
        matchedRoots.add(word.r);
      }
      if (normalized === normalizedB) {
        positionsB.push(index + 1);
        matchedRoots.add(word.r);
      }
    });

    if (positionsA.length === 0 || positionsB.length === 0) continue;

    const distance = findMinDistance(positionsA, positionsB);
    if (distance <= maxDistance) {
      // Select the closest pair for clearer highlighting in consumers.
      let closestPair: [number, number] = [positionsA[0], positionsB[0]];
      let best = Math.abs(positionsA[0] - positionsB[0]);
      for (const aPos of positionsA) {
        for (const bPos of positionsB) {
          const current = Math.abs(aPos - bPos);
          if (current < best) {
            best = current;
            closestPair = [aPos, bPos];
          }
        }
      }

      results.push({
        verseKey,
        verseText: buildVerseText(words),
        matchedRoots: Array.from(matchedRoots),
        positions: closestPair,
      });
    }
  }

  return results.sort((a, b) => compareVerseKeys(a.verseKey, b.verseKey));
};
