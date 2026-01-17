import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { PartialBlock } from "@blocknote/core";
import { Note, VerseNote, SurahNote } from "../types";
import { textToBlocks, blocksToText } from "../services/noteContent";

const STORAGE_KEY_NOTES = "luminaNotes";
const STORAGE_KEY_SURAH_NOTES = "luminaSurahNotes";
const DEBOUNCE_MS = 500;

export interface NoteSearchResult {
  verseKey: string;
  excerpt: string;
  matchIndex: number;
}

export interface UseNotesResult {
  // State
  notes: Record<string, VerseNote>;
  surahNotes: Record<number, SurahNote>;

  // Verse note operations
  saveVerseNote: (verseKey: string, blocks: PartialBlock[]) => void;
  deleteVerseNote: (verseKey: string) => void;
  getNoteForVerse: (verseKey: string) => VerseNote | undefined;
  hasNoteForVerse: (verseKey: string) => boolean;

  // Surah note operations
  saveSurahNote: (surahId: number, blocks: PartialBlock[]) => void;
  deleteSurahNote: (surahId: number) => void;
  getNoteForSurah: (surahId: number) => SurahNote | undefined;
  hasNoteForSurah: (surahId: number) => boolean;

  // Search
  searchNotes: (query: string) => NoteSearchResult[];

  // Bulk operations (for import/sync)
  setAllNotes: (notes: Record<string, VerseNote>) => void;
  setAllSurahNotes: (surahNotes: Record<number, SurahNote>) => void;

  // Flush pending writes immediately
  flushToStorage: () => void;
}

/**
 * Migrate legacy plain-text notes to BlockNote block format.
 */
function migrateNotes(parsed: Record<string, Note | VerseNote>): Record<string, VerseNote> {
  const migrated: Record<string, VerseNote> = {};

  for (const [key, value] of Object.entries(parsed)) {
    if ("blocks" in value) {
      // Already in new format
      migrated[key] = value as VerseNote;
    } else if ("text" in value) {
      // Legacy format - migrate to blocks
      const legacyNote = value as Note;
      const now = new Date().toISOString();
      migrated[key] = {
        verseKey: key,
        blocks: textToBlocks(legacyNote.text),
        updatedAt: legacyNote.updatedAt || now,
        createdAt: legacyNote.updatedAt || now,
      };
    }
  }

  return migrated;
}

/**
 * Load notes from localStorage with migration support.
 */
function loadNotesFromStorage(): Record<string, VerseNote> {
  const saved = localStorage.getItem(STORAGE_KEY_NOTES);
  if (!saved) return {};

  try {
    const parsed = JSON.parse(saved);
    return migrateNotes(parsed);
  } catch (e) {
    console.error("Failed to parse notes from localStorage", e);
    return {};
  }
}

/**
 * Load surah notes from localStorage.
 */
function loadSurahNotesFromStorage(): Record<number, SurahNote> {
  const saved = localStorage.getItem(STORAGE_KEY_SURAH_NOTES);
  if (!saved) return {};

  try {
    return JSON.parse(saved);
  } catch (e) {
    console.error("Failed to parse surah notes from localStorage", e);
    return {};
  }
}

/**
 * Extract plain text from BlockNote blocks for search.
 */
function extractTextFromBlocks(blocks: PartialBlock[]): string {
  return blocksToText(blocks);
}

/**
 * Custom hook for managing notes with debounced localStorage persistence.
 *
 * Features:
 * - Debounced localStorage writes (500ms) to prevent excessive serialization
 * - Legacy plain-text note migration
 * - Stable callback references for React.memo optimization
 * - Note search functionality
 * - Flush on page unload to prevent data loss
 */
export function useNotes(): UseNotesResult {
  // Initialize state from localStorage with migration
  const [notes, setNotes] = useState<Record<string, VerseNote>>(loadNotesFromStorage);
  const [surahNotes, setSurahNotes] =
    useState<Record<number, SurahNote>>(loadSurahNotesFromStorage);

  // Track pending writes for debouncing
  const pendingNotesRef = useRef<Record<string, VerseNote> | null>(null);
  const pendingSurahNotesRef = useRef<Record<number, SurahNote> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Flush pending writes to localStorage
  const flushToStorage = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    if (pendingNotesRef.current !== null) {
      localStorage.setItem(STORAGE_KEY_NOTES, JSON.stringify(pendingNotesRef.current));
      pendingNotesRef.current = null;
    }

    if (pendingSurahNotesRef.current !== null) {
      localStorage.setItem(STORAGE_KEY_SURAH_NOTES, JSON.stringify(pendingSurahNotesRef.current));
      pendingSurahNotesRef.current = null;
    }
  }, []);

  // Schedule a debounced flush
  const scheduleFlush = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(flushToStorage, DEBOUNCE_MS);
  }, [flushToStorage]);

  // Debounced persistence for notes
  useEffect(() => {
    pendingNotesRef.current = notes;
    scheduleFlush();
  }, [notes, scheduleFlush]);

  // Debounced persistence for surah notes
  useEffect(() => {
    pendingSurahNotesRef.current = surahNotes;
    scheduleFlush();
  }, [surahNotes, scheduleFlush]);

  // Flush on page unload to prevent data loss
  useEffect(() => {
    const handleBeforeUnload = () => {
      flushToStorage();
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      // Also flush on unmount
      flushToStorage();
    };
  }, [flushToStorage]);

  // --- Verse Note Operations ---

  const saveVerseNote = useCallback((verseKey: string, blocks: PartialBlock[]) => {
    const now = new Date().toISOString();
    setNotes((prev) => ({
      ...prev,
      [verseKey]: {
        verseKey,
        blocks,
        updatedAt: now,
        createdAt: prev[verseKey]?.createdAt || now,
      },
    }));
  }, []);

  const deleteVerseNote = useCallback((verseKey: string) => {
    setNotes((prev) => {
      const copy = { ...prev };
      delete copy[verseKey];
      return copy;
    });
  }, []);

  const getNoteForVerse = useCallback(
    (verseKey: string): VerseNote | undefined => {
      return notes[verseKey];
    },
    [notes]
  );

  // --- Surah Note Operations ---

  const saveSurahNote = useCallback((surahId: number, blocks: PartialBlock[]) => {
    const now = new Date().toISOString();
    setSurahNotes((prev) => ({
      ...prev,
      [surahId]: {
        surahId,
        blocks,
        updatedAt: now,
        createdAt: prev[surahId]?.createdAt || now,
      },
    }));
  }, []);

  const deleteSurahNote = useCallback((surahId: number) => {
    setSurahNotes((prev) => {
      const copy = { ...prev };
      delete copy[surahId];
      return copy;
    });
  }, []);

  const getNoteForSurah = useCallback(
    (surahId: number): SurahNote | undefined => {
      return surahNotes[surahId];
    },
    [surahNotes]
  );

  const hasNoteForSurah = useCallback(
    (surahId: number): boolean => {
      return surahId in surahNotes;
    },
    [surahNotes]
  );

  // --- Search ---

  const searchNotes = useCallback(
    (query: string): NoteSearchResult[] => {
      if (!query || !query.trim()) return [];

      const lowerQuery = query.toLowerCase();
      const results: NoteSearchResult[] = [];

      for (const [verseKey, note] of Object.entries(notes)) {
        const text = extractTextFromBlocks(note.blocks);
        const lowerText = text.toLowerCase();
        const matchIndex = lowerText.indexOf(lowerQuery);

        if (matchIndex !== -1) {
          // Create excerpt around match
          const excerptStart = Math.max(0, matchIndex - 30);
          const excerptEnd = Math.min(text.length, matchIndex + query.length + 30);
          const excerpt =
            (excerptStart > 0 ? "..." : "") +
            text.slice(excerptStart, excerptEnd) +
            (excerptEnd < text.length ? "..." : "");

          results.push({
            verseKey,
            excerpt,
            matchIndex,
          });
        }
      }

      // Sort by verse key for consistent ordering
      return results.sort((a, b) => {
        const [aSurah, aVerse] = a.verseKey.split(":").map(Number);
        const [bSurah, bVerse] = b.verseKey.split(":").map(Number);
        if (aSurah !== bSurah) return aSurah - bSurah;
        return aVerse - bVerse;
      });
    },
    [notes]
  );

  // --- Bulk Operations ---

  const setAllNotes = useCallback((newNotes: Record<string, VerseNote>) => {
    setNotes(newNotes);
  }, []);

  const setAllSurahNotes = useCallback((newSurahNotes: Record<number, SurahNote>) => {
    setSurahNotes(newSurahNotes);
  }, []);

  // --- Memoized Note Presence Map (for performance) ---

  // This is exposed via hasNoteForVerse, but we compute it once
  const _notePresenceMap = useMemo(() => {
    const map = new Set<string>();
    for (const key of Object.keys(notes)) {
      map.add(key);
    }
    return map;
  }, [notes]);

  // Use the precomputed set for O(1) lookups
  const hasNoteForVerseOptimized = useCallback(
    (verseKey: string): boolean => {
      return _notePresenceMap.has(verseKey);
    },
    [_notePresenceMap]
  );

  return {
    notes,
    surahNotes,
    saveVerseNote,
    deleteVerseNote,
    getNoteForVerse,
    hasNoteForVerse: hasNoteForVerseOptimized,
    saveSurahNote,
    deleteSurahNote,
    getNoteForSurah,
    hasNoteForSurah,
    searchNotes,
    setAllNotes,
    setAllSurahNotes,
    flushToStorage,
  };
}
