import type { Chapter, UrlVerseParams } from "../types";

// Base path from vite.config.ts
const BASE_PATH = "/quran_reader";

/**
 * Parse URL pathname to extract surah ID and verse number
 * @param pathname - The URL pathname (e.g., "/quran_reader/2/255")
 * @returns Parsed surah ID, verse number, and validation status
 */
export function parseUrlPath(pathname: string): UrlVerseParams {
  // Remove base path and split into segments
  if (!pathname.startsWith(BASE_PATH)) {
    return { surahId: null, verseNumber: null, isValid: false };
  }

  // Remove base path and leading/trailing slashes
  const withoutBase = pathname.slice(BASE_PATH.length).replace(/^\/+|\/+$/g, "");

  // Empty path (root)
  if (!withoutBase) {
    return { surahId: null, verseNumber: null, isValid: false };
  }

  // Split into segments
  const segments = withoutBase.split("/");

  // Check for view mode prefix
  let viewMode: "default" | "node" = "default";
  let dataSegments = segments;
  if (segments[0] === "node") {
    viewMode = "node";
    dataSegments = segments.slice(1);
  }

  // Empty after stripping view mode prefix
  if (dataSegments.length === 0 || !dataSegments[0]) {
    return { surahId: null, verseNumber: null, isValid: false, viewMode };
  }

  // Parse surah ID
  const surahId = parseInt(dataSegments[0], 10);

  // Validate surah ID
  if (isNaN(surahId) || surahId < 1 || surahId > 114) {
    return { surahId: null, verseNumber: null, isValid: false };
  }

  // Parse verse number if provided
  let verseNumber: number | null = null;
  if (dataSegments.length >= 2) {
    verseNumber = parseInt(dataSegments[1], 10);

    // Validate verse number
    if (isNaN(verseNumber) || verseNumber < 1) {
      return { surahId: null, verseNumber: null, isValid: false };
    }
  }

  return {
    surahId,
    verseNumber,
    isValid: true,
    viewMode,
  };
}

/**
 * Build URL path from surah ID and optional verse number
 * @param surahId - The surah ID (1-114)
 * @param verseNumber - Optional verse number
 * @returns URL path (e.g., "/quran_reader/2/255")
 */
export function buildVersePath(surahId: number, verseNumber?: number): string {
  if (verseNumber !== undefined) {
    return `${BASE_PATH}/${surahId}/${verseNumber}`;
  }
  return `${BASE_PATH}/${surahId}`;
}

/**
 * Build full shareable URL with origin
 * @param surahId - The surah ID (1-114)
 * @param verseNumber - The verse number
 * @returns Full URL (e.g., "https://example.com/quran_reader/2/255")
 */
export function buildFullVerseUrl(surahId: number, verseNumber: number): string {
  const origin = window.location.origin;
  const path = buildVersePath(surahId, verseNumber);
  return `${origin}${path}`;
}

/**
 * Validate surah ID and optional verse number against chapter data
 * @param surahId - The surah ID to validate
 * @param verseNumber - Optional verse number to validate
 * @param chapters - Optional chapter data for verse count validation
 * @returns Whether the reference is valid
 */
export function isValidReference(
  surahId: number,
  verseNumber?: number,
  chapters?: Chapter[]
): boolean {
  // Validate surah range
  if (surahId < 1 || surahId > 114) {
    return false;
  }

  // If no verse number, just validate surah
  if (verseNumber === undefined) {
    // If chapters provided, verify surah exists
    if (chapters) {
      return chapters.some((c) => c.id === surahId);
    }
    return true;
  }

  // Validate verse number range
  if (verseNumber < 1) {
    return false;
  }

  // If chapters provided, validate verse against chapter's verse count
  if (chapters) {
    const chapter = chapters.find((c) => c.id === surahId);
    if (!chapter) {
      return false;
    }
    return verseNumber <= chapter.verses_count;
  }

  // Without chapter data, just validate it's a positive number
  return true;
}

/**
 * Get the base path configured in vite.config.ts
 * @returns The base path
 */
/**
 * Build URL path for the node reader view
 * @param surahId - The surah ID (1-114)
 * @param verseNumber - The verse number
 * @returns URL path (e.g., "/quran_reader/node/2/255")
 */
export function buildNodePath(surahId: number, verseNumber: number): string {
  return `${BASE_PATH}/node/${surahId}/${verseNumber}`;
}

export function getBasePath(): string {
  return BASE_PATH;
}
