import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useNotes } from "../../../hooks/useNotes";
import type { VerseNote, SurahNote } from "../../../types";

// Access the mocked localStorage from setup.ts
const localStorageMock = window.localStorage as unknown as {
  getItem: ReturnType<typeof vi.fn>;
  setItem: ReturnType<typeof vi.fn>;
  removeItem: ReturnType<typeof vi.fn>;
  clear: ReturnType<typeof vi.fn>;
};

describe("useNotes", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorageMock.getItem.mockReset();
    localStorageMock.setItem.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("initialization", () => {
    it("should initialize with empty state when localStorage is empty", () => {
      localStorageMock.getItem.mockReturnValue(null);

      const { result } = renderHook(() => useNotes());

      expect(result.current.notes).toEqual({});
      expect(result.current.surahNotes).toEqual({});
    });

    it("should load existing notes from localStorage", () => {
      const existingNotes: Record<string, VerseNote> = {
        "2:255": {
          verseKey: "2:255",
          blocks: [{ type: "paragraph", content: "Test note" }],
          updatedAt: "2024-01-01T00:00:00.000Z",
          createdAt: "2024-01-01T00:00:00.000Z",
        },
      };

      localStorageMock.getItem.mockImplementation((key: string) => {
        if (key === "luminaNotes") return JSON.stringify(existingNotes);
        return null;
      });

      const { result } = renderHook(() => useNotes());

      expect(result.current.notes["2:255"]).toBeDefined();
      expect(result.current.notes["2:255"].verseKey).toBe("2:255");
    });

    it("should migrate legacy plain-text notes to block format", () => {
      const legacyNotes = {
        "1:1": {
          text: "This is a legacy note",
          updatedAt: "2024-01-01T00:00:00.000Z",
        },
      };

      localStorageMock.getItem.mockImplementation((key: string) => {
        if (key === "luminaNotes") return JSON.stringify(legacyNotes);
        return null;
      });

      const { result } = renderHook(() => useNotes());

      expect(result.current.notes["1:1"]).toBeDefined();
      expect(result.current.notes["1:1"].blocks).toBeDefined();
      expect(Array.isArray(result.current.notes["1:1"].blocks)).toBe(true);
      expect(result.current.notes["1:1"].verseKey).toBe("1:1");
    });

    it("should handle corrupted localStorage gracefully", () => {
      localStorageMock.getItem.mockImplementation((key: string) => {
        if (key === "luminaNotes") return "invalid json{";
        return null;
      });

      const { result } = renderHook(() => useNotes());

      expect(result.current.notes).toEqual({});
    });
  });

  describe("verse note operations", () => {
    beforeEach(() => {
      localStorageMock.getItem.mockReturnValue(null);
    });

    it("should save a verse note", () => {
      const { result } = renderHook(() => useNotes());

      act(() => {
        result.current.saveVerseNote("2:255", [
          { type: "paragraph", content: "Ayatul Kursi note" },
        ]);
      });

      expect(result.current.notes["2:255"]).toBeDefined();
      expect(result.current.notes["2:255"].verseKey).toBe("2:255");
      expect(result.current.notes["2:255"].blocks).toHaveLength(1);
    });

    it("should preserve createdAt when updating an existing note", () => {
      const existingNotes: Record<string, VerseNote> = {
        "2:255": {
          verseKey: "2:255",
          blocks: [{ type: "paragraph", content: "Original note" }],
          updatedAt: "2024-01-01T00:00:00.000Z",
          createdAt: "2024-01-01T00:00:00.000Z",
        },
      };

      localStorageMock.getItem.mockImplementation((key: string) => {
        if (key === "luminaNotes") return JSON.stringify(existingNotes);
        return null;
      });

      const { result } = renderHook(() => useNotes());
      const originalCreatedAt = result.current.notes["2:255"].createdAt;

      act(() => {
        result.current.saveVerseNote("2:255", [{ type: "paragraph", content: "Updated note" }]);
      });

      expect(result.current.notes["2:255"].createdAt).toBe(originalCreatedAt);
      expect(result.current.notes["2:255"].updatedAt).not.toBe(originalCreatedAt);
    });

    it("should delete a verse note", () => {
      const existingNotes: Record<string, VerseNote> = {
        "2:255": {
          verseKey: "2:255",
          blocks: [{ type: "paragraph", content: "Test note" }],
          updatedAt: "2024-01-01T00:00:00.000Z",
          createdAt: "2024-01-01T00:00:00.000Z",
        },
      };

      localStorageMock.getItem.mockImplementation((key: string) => {
        if (key === "luminaNotes") return JSON.stringify(existingNotes);
        return null;
      });

      const { result } = renderHook(() => useNotes());

      expect(result.current.notes["2:255"]).toBeDefined();

      act(() => {
        result.current.deleteVerseNote("2:255");
      });

      expect(result.current.notes["2:255"]).toBeUndefined();
    });

    it("should check if verse has a note", () => {
      const existingNotes: Record<string, VerseNote> = {
        "2:255": {
          verseKey: "2:255",
          blocks: [{ type: "paragraph", content: "Test note" }],
          updatedAt: "2024-01-01T00:00:00.000Z",
          createdAt: "2024-01-01T00:00:00.000Z",
        },
      };

      localStorageMock.getItem.mockImplementation((key: string) => {
        if (key === "luminaNotes") return JSON.stringify(existingNotes);
        return null;
      });

      const { result } = renderHook(() => useNotes());

      expect(result.current.hasNoteForVerse("2:255")).toBe(true);
      expect(result.current.hasNoteForVerse("2:256")).toBe(false);
    });

    it("should get note for verse", () => {
      const existingNotes: Record<string, VerseNote> = {
        "2:255": {
          verseKey: "2:255",
          blocks: [{ type: "paragraph", content: "Test note" }],
          updatedAt: "2024-01-01T00:00:00.000Z",
          createdAt: "2024-01-01T00:00:00.000Z",
        },
      };

      localStorageMock.getItem.mockImplementation((key: string) => {
        if (key === "luminaNotes") return JSON.stringify(existingNotes);
        return null;
      });

      const { result } = renderHook(() => useNotes());

      const note = result.current.getNoteForVerse("2:255");
      expect(note).toBeDefined();
      expect(note?.verseKey).toBe("2:255");

      const nonExistent = result.current.getNoteForVerse("2:256");
      expect(nonExistent).toBeUndefined();
    });
  });

  describe("surah note operations", () => {
    beforeEach(() => {
      localStorageMock.getItem.mockReturnValue(null);
    });

    it("should save a surah note", () => {
      const { result } = renderHook(() => useNotes());

      act(() => {
        result.current.saveSurahNote(2, [{ type: "paragraph", content: "Al-Baqarah notes" }]);
      });

      expect(result.current.surahNotes[2]).toBeDefined();
      expect(result.current.surahNotes[2].surahId).toBe(2);
    });

    it("should delete a surah note", () => {
      const existingSurahNotes: Record<number, SurahNote> = {
        2: {
          surahId: 2,
          blocks: [{ type: "paragraph", content: "Test surah note" }],
          updatedAt: "2024-01-01T00:00:00.000Z",
          createdAt: "2024-01-01T00:00:00.000Z",
        },
      };

      localStorageMock.getItem.mockImplementation((key: string) => {
        if (key === "luminaSurahNotes") return JSON.stringify(existingSurahNotes);
        return null;
      });

      const { result } = renderHook(() => useNotes());

      expect(result.current.surahNotes[2]).toBeDefined();

      act(() => {
        result.current.deleteSurahNote(2);
      });

      expect(result.current.surahNotes[2]).toBeUndefined();
    });

    it("should check if surah has a note", () => {
      const existingSurahNotes: Record<number, SurahNote> = {
        2: {
          surahId: 2,
          blocks: [{ type: "paragraph", content: "Test surah note" }],
          updatedAt: "2024-01-01T00:00:00.000Z",
          createdAt: "2024-01-01T00:00:00.000Z",
        },
      };

      localStorageMock.getItem.mockImplementation((key: string) => {
        if (key === "luminaSurahNotes") return JSON.stringify(existingSurahNotes);
        return null;
      });

      const { result } = renderHook(() => useNotes());

      expect(result.current.hasNoteForSurah(2)).toBe(true);
      expect(result.current.hasNoteForSurah(3)).toBe(false);
    });
  });

  describe("debounced persistence", () => {
    beforeEach(() => {
      localStorageMock.getItem.mockReturnValue(null);
    });

    it("should debounce localStorage writes", async () => {
      const { result } = renderHook(() => useNotes());

      // Make multiple rapid changes
      act(() => {
        result.current.saveVerseNote("1:1", [{ type: "paragraph", content: "Note 1" }]);
      });
      act(() => {
        result.current.saveVerseNote("1:2", [{ type: "paragraph", content: "Note 2" }]);
      });
      act(() => {
        result.current.saveVerseNote("1:3", [{ type: "paragraph", content: "Note 3" }]);
      });

      // localStorage should not be called yet (debouncing)
      expect(localStorageMock.setItem).not.toHaveBeenCalledWith("luminaNotes", expect.any(String));

      // Fast-forward past the debounce period
      act(() => {
        vi.advanceTimersByTime(600);
      });

      // Now localStorage should be called once with all changes
      expect(localStorageMock.setItem).toHaveBeenCalledWith("luminaNotes", expect.any(String));

      // Verify all notes were saved
      const savedNotes = JSON.parse(
        localStorageMock.setItem.mock.calls.find(
          (call: string[]) => call[0] === "luminaNotes"
        )?.[1] || "{}"
      );
      expect(savedNotes["1:1"]).toBeDefined();
      expect(savedNotes["1:2"]).toBeDefined();
      expect(savedNotes["1:3"]).toBeDefined();
    });

    it("should flush pending writes on flushToStorage call", () => {
      const { result } = renderHook(() => useNotes());

      act(() => {
        result.current.saveVerseNote("2:255", [{ type: "paragraph", content: "Test note" }]);
      });

      // localStorage should not be called yet
      expect(localStorageMock.setItem).not.toHaveBeenCalledWith("luminaNotes", expect.any(String));

      // Force flush
      act(() => {
        result.current.flushToStorage();
      });

      // Now it should be called
      expect(localStorageMock.setItem).toHaveBeenCalledWith("luminaNotes", expect.any(String));
    });

    it("should flush on component unmount", () => {
      const { result, unmount } = renderHook(() => useNotes());

      act(() => {
        result.current.saveVerseNote("2:255", [{ type: "paragraph", content: "Test note" }]);
      });

      // Unmount the hook
      unmount();

      // Should have flushed on unmount
      expect(localStorageMock.setItem).toHaveBeenCalledWith("luminaNotes", expect.any(String));
    });
  });

  describe("search functionality", () => {
    it("should search notes by content", () => {
      const existingNotes: Record<string, VerseNote> = {
        "2:255": {
          verseKey: "2:255",
          blocks: [{ type: "paragraph", content: "Ayatul Kursi is beautiful" }],
          updatedAt: "2024-01-01T00:00:00.000Z",
          createdAt: "2024-01-01T00:00:00.000Z",
        },
        "1:1": {
          verseKey: "1:1",
          blocks: [{ type: "paragraph", content: "Bismillah note" }],
          updatedAt: "2024-01-01T00:00:00.000Z",
          createdAt: "2024-01-01T00:00:00.000Z",
        },
      };

      localStorageMock.getItem.mockImplementation((key: string) => {
        if (key === "luminaNotes") return JSON.stringify(existingNotes);
        return null;
      });

      const { result } = renderHook(() => useNotes());

      const results = result.current.searchNotes("Kursi");

      expect(results).toHaveLength(1);
      expect(results[0].verseKey).toBe("2:255");
      expect(results[0].excerpt).toContain("Kursi");
    });

    it("should return empty array for empty query", () => {
      const { result } = renderHook(() => useNotes());

      expect(result.current.searchNotes("")).toEqual([]);
      expect(result.current.searchNotes("   ")).toEqual([]);
    });

    it("should be case-insensitive", () => {
      const existingNotes: Record<string, VerseNote> = {
        "2:255": {
          verseKey: "2:255",
          blocks: [{ type: "paragraph", content: "IMPORTANT note here" }],
          updatedAt: "2024-01-01T00:00:00.000Z",
          createdAt: "2024-01-01T00:00:00.000Z",
        },
      };

      localStorageMock.getItem.mockImplementation((key: string) => {
        if (key === "luminaNotes") return JSON.stringify(existingNotes);
        return null;
      });

      const { result } = renderHook(() => useNotes());

      const results = result.current.searchNotes("important");

      expect(results).toHaveLength(1);
      expect(results[0].verseKey).toBe("2:255");
    });

    it("should sort results by verse key", () => {
      const existingNotes: Record<string, VerseNote> = {
        "3:1": {
          verseKey: "3:1",
          blocks: [{ type: "paragraph", content: "Test note" }],
          updatedAt: "2024-01-01T00:00:00.000Z",
          createdAt: "2024-01-01T00:00:00.000Z",
        },
        "1:5": {
          verseKey: "1:5",
          blocks: [{ type: "paragraph", content: "Test note" }],
          updatedAt: "2024-01-01T00:00:00.000Z",
          createdAt: "2024-01-01T00:00:00.000Z",
        },
        "2:100": {
          verseKey: "2:100",
          blocks: [{ type: "paragraph", content: "Test note" }],
          updatedAt: "2024-01-01T00:00:00.000Z",
          createdAt: "2024-01-01T00:00:00.000Z",
        },
      };

      localStorageMock.getItem.mockImplementation((key: string) => {
        if (key === "luminaNotes") return JSON.stringify(existingNotes);
        return null;
      });

      const { result } = renderHook(() => useNotes());

      const results = result.current.searchNotes("Test");

      expect(results).toHaveLength(3);
      expect(results[0].verseKey).toBe("1:5");
      expect(results[1].verseKey).toBe("2:100");
      expect(results[2].verseKey).toBe("3:1");
    });
  });

  describe("bulk operations", () => {
    beforeEach(() => {
      localStorageMock.getItem.mockReturnValue(null);
    });

    it("should set all notes at once", () => {
      const { result } = renderHook(() => useNotes());

      const newNotes: Record<string, VerseNote> = {
        "1:1": {
          verseKey: "1:1",
          blocks: [{ type: "paragraph", content: "Note 1" }],
          updatedAt: "2024-01-01T00:00:00.000Z",
          createdAt: "2024-01-01T00:00:00.000Z",
        },
        "2:255": {
          verseKey: "2:255",
          blocks: [{ type: "paragraph", content: "Note 2" }],
          updatedAt: "2024-01-01T00:00:00.000Z",
          createdAt: "2024-01-01T00:00:00.000Z",
        },
      };

      act(() => {
        result.current.setAllNotes(newNotes);
      });

      expect(Object.keys(result.current.notes)).toHaveLength(2);
      expect(result.current.notes["1:1"]).toBeDefined();
      expect(result.current.notes["2:255"]).toBeDefined();
    });

    it("should set all surah notes at once", () => {
      const { result } = renderHook(() => useNotes());

      const newSurahNotes: Record<number, SurahNote> = {
        1: {
          surahId: 1,
          blocks: [{ type: "paragraph", content: "Al-Fatiha notes" }],
          updatedAt: "2024-01-01T00:00:00.000Z",
          createdAt: "2024-01-01T00:00:00.000Z",
        },
        2: {
          surahId: 2,
          blocks: [{ type: "paragraph", content: "Al-Baqarah notes" }],
          updatedAt: "2024-01-01T00:00:00.000Z",
          createdAt: "2024-01-01T00:00:00.000Z",
        },
      };

      act(() => {
        result.current.setAllSurahNotes(newSurahNotes);
      });

      expect(Object.keys(result.current.surahNotes)).toHaveLength(2);
      expect(result.current.surahNotes[1]).toBeDefined();
      expect(result.current.surahNotes[2]).toBeDefined();
    });
  });

  describe("callback stability", () => {
    beforeEach(() => {
      localStorageMock.getItem.mockReturnValue(null);
    });

    it("should return stable callback references", () => {
      const { result, rerender } = renderHook(() => useNotes());

      const firstSaveVerseNote = result.current.saveVerseNote;
      const firstDeleteVerseNote = result.current.deleteVerseNote;
      const firstSaveSurahNote = result.current.saveSurahNote;
      const firstDeleteSurahNote = result.current.deleteSurahNote;
      const firstSetAllNotes = result.current.setAllNotes;
      const firstSetAllSurahNotes = result.current.setAllSurahNotes;
      const firstFlushToStorage = result.current.flushToStorage;

      // Trigger a re-render
      rerender();

      expect(result.current.saveVerseNote).toBe(firstSaveVerseNote);
      expect(result.current.deleteVerseNote).toBe(firstDeleteVerseNote);
      expect(result.current.saveSurahNote).toBe(firstSaveSurahNote);
      expect(result.current.deleteSurahNote).toBe(firstDeleteSurahNote);
      expect(result.current.setAllNotes).toBe(firstSetAllNotes);
      expect(result.current.setAllSurahNotes).toBe(firstSetAllSurahNotes);
      expect(result.current.flushToStorage).toBe(firstFlushToStorage);
    });
  });
});
