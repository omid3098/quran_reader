/**
 * IndexedDB storage for downloaded (non-bundled) translations.
 *
 * Uses IndexedDB instead of localStorage because a single translation
 * can be ~1.5MB and localStorage has a ~5-10MB limit per origin.
 */
import type { TranslationData } from "./localDataService";

const DB_NAME = "quran-reader-translations";
const DB_VERSION = 1;
const STORE_NAME = "translations";

let dbInstance: IDBDatabase | null = null;
let dbOpening: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbInstance) return Promise.resolve(dbInstance);
  if (dbOpening) return dbOpening;

  dbOpening = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "_meta.id" });
      }
    };

    request.onsuccess = () => {
      dbInstance = request.result;
      dbOpening = null;
      resolve(dbInstance);
    };

    request.onerror = () => {
      dbOpening = null;
      reject(request.error);
    };
  });

  return dbOpening;
}

/** Save a downloaded translation to IndexedDB. */
export async function saveTranslation(data: TranslationData): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(data);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/** Get a downloaded translation by ID. Returns null if not found. */
export async function getTranslation(translationId: string): Promise<TranslationData | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const request = tx.objectStore(STORE_NAME).get(translationId);
    request.onsuccess = () => resolve(request.result ?? null);
    request.onerror = () => reject(request.error);
  });
}

/** Delete a downloaded translation. */
export async function deleteTranslation(translationId: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(translationId);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/** Get IDs of all downloaded translations. */
export async function getDownloadedTranslationIds(): Promise<string[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const request = tx.objectStore(STORE_NAME).getAllKeys();
    request.onsuccess = () => resolve(request.result as string[]);
    request.onerror = () => reject(request.error);
  });
}
