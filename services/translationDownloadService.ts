/**
 * Service for downloading non-bundled translations from the API on demand.
 *
 * Downloads a translation surah-by-surah from api.alquran.cloud,
 * saves it to IndexedDB via translationStorageService, and notifies
 * localDataService to evict its cache so the new data is picked up.
 */
import type { TranslationData } from "./localDataService";
import { evictTranslationCache, loadTranslationRegistry } from "./localDataService";
import { saveTranslation, getDownloadedTranslationIds } from "./translationStorageService";
import { PREFERRED_TRANSLATIONS } from "./quranService";

const API_BASE = "https://api.alquran.cloud/v1";

interface AyahResponse {
  numberInSurah: number;
  text: string;
}

interface EditionResponse {
  edition?: { identifier: string; name: string; direction?: string };
  ayahs: AyahResponse[];
}

/** Download a translation and store it in IndexedDB. */
export async function downloadTranslation(
  translationId: string,
  onProgress?: (percent: number) => void
): Promise<void> {
  const verses: Record<string, string> = {};

  for (let surahId = 1; surahId <= 114; surahId++) {
    const res = await fetch(`${API_BASE}/surah/${surahId}/editions/${translationId}`);
    if (!res.ok) throw new Error(`Failed to fetch surah ${surahId} for ${translationId}`);

    const json = await res.json();
    const edition: EditionResponse = Array.isArray(json.data) ? json.data[0] : json.data;

    if (edition?.ayahs) {
      for (const ayah of edition.ayahs) {
        verses[`${surahId}:${ayah.numberInSurah}`] = ayah.text;
      }
    }

    onProgress?.(Math.round((surahId / 114) * 100));
  }

  // Build meta from registry
  const registry = await loadTranslationRegistry();
  const regMeta = [...registry.bundled, ...registry.downloadable].find(
    (m) => m.id === translationId
  );

  const preferred = PREFERRED_TRANSLATIONS.find((p) => p.id === translationId);

  const data: TranslationData = {
    _meta: {
      id: translationId,
      name: preferred?.name || regMeta?.name || translationId,
      author_name: preferred?.author_name || regMeta?.author_name || "",
      language_name: preferred?.language_name || regMeta?.language_name || "",
      direction: regMeta?.direction || "ltr",
      slug: preferred?.slug || regMeta?.slug || translationId,
      generated: new Date().toISOString(),
    },
    verses,
  };

  // Save to IndexedDB
  await saveTranslation(data);

  // Evict localDataService cache so it picks up the new data
  evictTranslationCache(translationId);
}

/** Check if a translation is available (bundled or downloaded). */
export async function isTranslationAvailable(translationId: string): Promise<boolean> {
  const registry = await loadTranslationRegistry();
  if (registry.bundled.some((b) => b.id === translationId)) return true;

  const downloadedIds = await getDownloadedTranslationIds();
  return downloadedIds.includes(translationId);
}

/** Get IDs of all downloaded (non-bundled) translations. */
export { getDownloadedTranslationIds } from "./translationStorageService";
