/**
 * Local data service — loads bundled JSON files from public/data/ with in-memory caching.
 *
 * All Quran text, chapter metadata, and bundled translations are served from
 * static JSON files. Downloaded (non-bundled) translations are stored in IndexedDB
 * and loaded via translationStorageService.
 */
import type { Chapter } from "../types";
import { getTranslation as getDownloadedTranslation } from "./translationStorageService";

// ---------------------------------------------------------------------------
// Types for data files
// ---------------------------------------------------------------------------

export interface SurahTextData {
  surahId: number;
  verses: {
    id: number;
    numberInSurah: number;
    text_uthmani: string;
    text_simple: string;
  }[];
}

export interface TranslationMeta {
  id: string;
  name: string;
  author_name: string;
  language_name: string;
  direction: string;
  slug: string;
  bundled: boolean;
}

export interface TranslationData {
  _meta: {
    id: string;
    name: string;
    author_name: string;
    language_name: string;
    direction: string;
    slug: string;
    generated: string;
  };
  verses: Record<string, string>;
}

export interface TranslationRegistry {
  _meta: { source: string; generated: string };
  bundled: (TranslationMeta & { bundled: true })[];
  downloadable: (TranslationMeta & { bundled: false })[];
}

interface ChaptersFile {
  _meta: { source: string; generated: string };
  chapters: Chapter[];
}

// ---------------------------------------------------------------------------
// In-memory caches
// ---------------------------------------------------------------------------

let chaptersCache: Chapter[] | null = null;
let chaptersLoading: Promise<Chapter[]> | null = null;

const surahTextCache = new Map<number, SurahTextData>();
const surahTextLoading = new Map<number, Promise<SurahTextData>>();

const translationCache = new Map<string, TranslationData>();
const translationLoading = new Map<string, Promise<TranslationData | null>>();

let registryCache: TranslationRegistry | null = null;
let registryLoading: Promise<TranslationRegistry> | null = null;

// ---------------------------------------------------------------------------
// Base URL helper (works in both dev and production)
// ---------------------------------------------------------------------------

function getBaseUrl(): string {
  if (typeof import.meta !== "undefined" && import.meta.env?.BASE_URL) {
    return import.meta.env.BASE_URL;
  }
  return "/";
}

async function fetchJson<T>(relativePath: string): Promise<T> {
  const base = getBaseUrl();
  const url = `${base}data/${relativePath}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to load ${url}: ${res.status}`);
  return res.json();
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Load chapter metadata (114 surahs). Cached after first load. */
export async function loadChapters(): Promise<Chapter[]> {
  if (chaptersCache) return chaptersCache;
  if (chaptersLoading) return chaptersLoading;

  chaptersLoading = fetchJson<ChaptersFile>("chapters.json").then((file) => {
    chaptersCache = file.chapters;
    chaptersLoading = null;
    return file.chapters;
  });

  return chaptersLoading;
}

/** Load a single surah's text (Uthmani + Simple). Cached per surah. */
export async function loadSurahText(surahId: number): Promise<SurahTextData> {
  const cached = surahTextCache.get(surahId);
  if (cached) return cached;

  const loading = surahTextLoading.get(surahId);
  if (loading) return loading;

  const promise = fetchJson<SurahTextData>(`quran/${surahId}.json`).then((data) => {
    surahTextCache.set(surahId, data);
    surahTextLoading.delete(surahId);
    return data;
  });

  surahTextLoading.set(surahId, promise);
  return promise;
}

/**
 * Load a translation by ID.
 * Tries bundled file first, then IndexedDB (downloaded translations).
 * Returns null if not available.
 */
export async function loadTranslation(translationId: string): Promise<TranslationData | null> {
  const cached = translationCache.get(translationId);
  if (cached) return cached;

  const loading = translationLoading.get(translationId);
  if (loading) return loading;

  const promise = (async (): Promise<TranslationData | null> => {
    // Try bundled file first
    try {
      const data = await fetchJson<TranslationData>(`translations/${translationId}.json`);
      translationCache.set(translationId, data);
      translationLoading.delete(translationId);
      return data;
    } catch {
      // Not bundled, try IndexedDB
    }

    // Try IndexedDB (downloaded)
    try {
      const downloaded = await getDownloadedTranslation(translationId);
      if (downloaded) {
        translationCache.set(translationId, downloaded);
        translationLoading.delete(translationId);
        return downloaded;
      }
    } catch {
      // IndexedDB not available
    }

    translationLoading.delete(translationId);
    return null;
  })();

  translationLoading.set(translationId, promise);
  return promise;
}

/** Load translation registry (bundled + downloadable metadata). */
export async function loadTranslationRegistry(): Promise<TranslationRegistry> {
  if (registryCache) return registryCache;
  if (registryLoading) return registryLoading;

  registryLoading = fetchJson<TranslationRegistry>("translations-registry.json").then((data) => {
    registryCache = data;
    registryLoading = null;
    return data;
  });

  return registryLoading;
}

/** Clear a specific translation from the in-memory cache (e.g. after deletion). */
export function evictTranslationCache(translationId: string): void {
  translationCache.delete(translationId);
}
