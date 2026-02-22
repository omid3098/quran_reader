import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getChapters,
  getVerses,
  getAudioUrl,
  getAvailableTranslations,
  RECITERS,
  PREFERRED_TRANSLATIONS,
  getVerseByKey,
} from "@/services/quranService";

// Mock localDataService
vi.mock("@/services/localDataService", () => ({
  loadChapters: vi.fn(),
  loadSurahText: vi.fn(),
  loadTranslation: vi.fn(),
  loadTranslationRegistry: vi.fn(),
  evictTranslationCache: vi.fn(),
}));

// Mock translationStorageService (used by localDataService)
vi.mock("@/services/translationStorageService", () => ({
  getTranslation: vi.fn().mockResolvedValue(null),
  saveTranslation: vi.fn(),
  deleteTranslation: vi.fn(),
  getDownloadedTranslationIds: vi.fn().mockResolvedValue([]),
}));

import {
  loadChapters,
  loadSurahText,
  loadTranslation,
  loadTranslationRegistry,
} from "@/services/localDataService";

const mockLoadChapters = vi.mocked(loadChapters);
const mockLoadSurahText = vi.mocked(loadSurahText);
const mockLoadTranslation = vi.mocked(loadTranslation);
const mockLoadTranslationRegistry = vi.mocked(loadTranslationRegistry);

describe("quranService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("RECITERS", () => {
    it("should have a non-empty list of reciters", () => {
      expect(RECITERS.length).toBeGreaterThan(0);
    });

    it("should have required properties for each reciter", () => {
      RECITERS.forEach((reciter) => {
        expect(reciter).toHaveProperty("id");
        expect(reciter).toHaveProperty("name");
        expect(reciter).toHaveProperty("subfolder");
        expect(typeof reciter.id).toBe("string");
        expect(typeof reciter.name).toBe("string");
        expect(typeof reciter.subfolder).toBe("string");
      });
    });

    it("should have unique reciter IDs", () => {
      const ids = RECITERS.map((r) => r.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });
  });

  describe("PREFERRED_TRANSLATIONS", () => {
    it("should have Persian translations with proper metadata", () => {
      expect(PREFERRED_TRANSLATIONS.length).toBeGreaterThan(0);
      PREFERRED_TRANSLATIONS.forEach((translation) => {
        expect(translation).toHaveProperty("id");
        expect(translation.id).toMatch(/^fa\./);
        expect(translation).toHaveProperty("name");
        expect(translation.language_name).toBe("Persian");
      });
    });
  });

  describe("getChapters", () => {
    it("should load chapters from local data", async () => {
      const mockChapters = [
        {
          id: 1,
          revelation_place: "meccan",
          revelation_order: 5,
          bismillah_pre: false,
          name_simple: "Al-Fatiha",
          name_complex: "Al-Fatiha",
          name_arabic: "الفاتحة",
          verses_count: 7,
          translated_name: { language_name: "English", name: "The Opening" },
        },
        {
          id: 2,
          revelation_place: "medinan",
          revelation_order: 87,
          bismillah_pre: true,
          name_simple: "Al-Baqara",
          name_complex: "Al-Baqarah",
          name_arabic: "البقرة",
          verses_count: 286,
          translated_name: { language_name: "English", name: "The Cow" },
        },
      ];

      mockLoadChapters.mockResolvedValueOnce(mockChapters);

      const chapters = await getChapters();

      expect(chapters).toHaveLength(2);
      expect(chapters[0]).toEqual(mockChapters[0]);
    });

    it("should return fallback chapters on error", async () => {
      mockLoadChapters.mockRejectedValueOnce(new Error("Load failed"));

      const chapters = await getChapters();
      expect(chapters.length).toBeGreaterThan(0);
      expect(chapters[0].id).toBe(1);
    });
  });

  describe("getAvailableTranslations", () => {
    it("should load translations from registry and merge with preferred", async () => {
      mockLoadTranslationRegistry.mockResolvedValueOnce({
        _meta: { source: "test", generated: "2024-01-01" },
        bundled: [
          {
            id: "en.sahih",
            name: "Sahih International",
            author_name: "Sahih",
            language_name: "English",
            direction: "ltr",
            slug: "en.sahih",
            bundled: true as const,
          },
          {
            id: "fa.fooladvand",
            name: "Fooladvand",
            author_name: "Fooladvand",
            language_name: "Persian",
            direction: "rtl",
            slug: "fa.fooladvand",
            bundled: true as const,
          },
        ],
        downloadable: [],
      });

      const translations = await getAvailableTranslations();

      expect(translations.length).toBeGreaterThan(0);
      // Should be sorted by language name
      const languageNames = translations.map((t) => t.language_name);
      const sortedNames = [...languageNames].sort();
      expect(languageNames).toEqual(sortedNames);

      // Persian translation should have preferred name
      const fa = translations.find((t) => t.id === "fa.fooladvand");
      expect(fa?.name).toBe("فولادوند");
    });

    it("should return preferred translations on error", async () => {
      mockLoadTranslationRegistry.mockRejectedValueOnce(new Error("Load failed"));

      const translations = await getAvailableTranslations();
      expect(translations.length).toBe(PREFERRED_TRANSLATIONS.length);
    });
  });

  describe("getVerses", () => {
    it("should load verses from local data and merge translations", async () => {
      mockLoadSurahText.mockResolvedValueOnce({
        surahId: 1,
        verses: [
          {
            id: 1,
            numberInSurah: 1,
            text_uthmani: "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ",
            text_simple: "بسم الله الرحمن الرحيم",
          },
        ],
      });

      mockLoadTranslation.mockResolvedValueOnce({
        _meta: {
          id: "en.sahih",
          name: "Sahih International",
          author_name: "Sahih",
          language_name: "English",
          direction: "ltr",
          slug: "en.sahih",
          generated: "2024-01-01",
        },
        verses: {
          "1:1": "In the name of Allah, the Entirely Merciful, the Especially Merciful.",
        },
      });

      const verses = await getVerses(1, ["en.sahih"]);

      expect(verses).toHaveLength(1);
      expect(verses[0]).toHaveProperty("id");
      expect(verses[0]).toHaveProperty("verse_key", "1:1");
      expect(verses[0]).toHaveProperty("text_uthmani");
      expect(verses[0]).toHaveProperty("text_simple");
      expect(verses[0]).toHaveProperty("translations");
      expect(verses[0].translations).toHaveLength(1);
      expect(verses[0].translations[0].text).toContain("In the name of Allah");
    });

    it("should return fallback verses on error", async () => {
      mockLoadSurahText.mockRejectedValueOnce(new Error("Load failed"));

      const verses = await getVerses(1);
      expect(verses.length).toBeGreaterThan(0);
      expect(verses[0].verse_key).toBe("1:1");
    });

    it("should handle missing translations gracefully", async () => {
      mockLoadSurahText.mockResolvedValueOnce({
        surahId: 1,
        verses: [{ id: 1, numberInSurah: 1, text_uthmani: "test", text_simple: "test" }],
      });

      mockLoadTranslation.mockResolvedValueOnce(null); // Translation not available

      const verses = await getVerses(1, ["non.existent"]);
      expect(verses).toHaveLength(1);
      expect(verses[0].translations).toHaveLength(0);
    });
  });

  describe("getVerseByKey", () => {
    it("should load a single verse by key", async () => {
      mockLoadSurahText.mockResolvedValueOnce({
        surahId: 2,
        verses: [
          { id: 8, numberInSurah: 1, text_uthmani: "الم", text_simple: "الم" },
          { id: 9, numberInSurah: 2, text_uthmani: "ذلك الكتاب", text_simple: "ذلك الكتاب" },
        ],
      });

      mockLoadTranslation.mockResolvedValueOnce({
        _meta: {
          id: "en.sahih",
          name: "Sahih International",
          author_name: "Sahih",
          language_name: "English",
          direction: "ltr",
          slug: "en.sahih",
          generated: "2024-01-01",
        },
        verses: { "2:2": "This is the Book" },
      });

      const verse = await getVerseByKey("2:2", ["en.sahih"]);
      expect(verse).not.toBeNull();
      expect(verse!.verse_key).toBe("2:2");
      expect(verse!.text_uthmani).toBe("ذلك الكتاب");
    });

    it("should return null for invalid verse key", async () => {
      const verse = await getVerseByKey("invalid", ["en.sahih"]);
      expect(verse).toBeNull();
    });
  });

  describe("getAudioUrl", () => {
    it("should construct correct audio URL for valid reciter", () => {
      const url = getAudioUrl("alafasy", 1, 1);
      expect(url).toBe("https://everyayah.com/data/Alafasy_128kbps/001001.mp3");
    });

    it("should use first reciter as fallback for unknown reciter ID", () => {
      const url = getAudioUrl("unknown-reciter", 1, 1);
      expect(url).toContain("everyayah.com");
      expect(url).toContain("001001.mp3");
    });

    it("should pad chapter and verse numbers correctly", () => {
      const url = getAudioUrl("alafasy", 2, 255);
      expect(url).toBe("https://everyayah.com/data/Alafasy_128kbps/002255.mp3");
    });

    it("should handle edge cases for chapter/verse numbers", () => {
      const url1 = getAudioUrl("alafasy", 114, 6);
      expect(url1).toContain("114006.mp3");

      const url2 = getAudioUrl("sudais", 2, 286);
      expect(url2).toContain("002286.mp3");
    });
  });
});
