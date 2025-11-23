import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  getChapters,
  getVerses,
  getAudioUrl,
  getAvailableTranslations,
  RECITERS,
  PREFERRED_TRANSLATIONS,
} from "@/services/quranService";

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("quranService", () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  afterEach(() => {
    vi.resetAllMocks();
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
    it("should fetch and transform chapters correctly", async () => {
      const mockResponse = {
        data: [
          {
            number: 1,
            revelationType: "Meccan",
            revelationOrder: 5,
            englishName: "Al-Fatiha",
            name: "الفاتحة",
            numberOfAyahs: 7,
            englishNameTranslation: "The Opening",
          },
          {
            number: 2,
            revelationType: "Medinan",
            revelationOrder: 87,
            englishName: "Al-Baqara",
            name: "البقرة",
            numberOfAyahs: 286,
            englishNameTranslation: "The Cow",
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const chapters = await getChapters();

      expect(chapters).toHaveLength(2);
      expect(chapters[0]).toEqual({
        id: 1,
        revelation_place: "meccan",
        revelation_order: 5,
        bismillah_pre: false, // Fatiha doesn't have prefixed bismillah
        name_simple: "Al-Fatiha",
        name_complex: "Al-Fatiha",
        name_arabic: "الفاتحة",
        verses_count: 7,
        translated_name: {
          language_name: "English",
          name: "The Opening",
        },
      });
    });

    it("should return empty array on fetch error", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
      });

      const chapters = await getChapters();
      expect(chapters).toEqual([]);
    });

    it("should return empty array on network error", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const chapters = await getChapters();
      expect(chapters).toEqual([]);
    });

    it("should set bismillah_pre correctly for different surahs", async () => {
      const mockResponse = {
        data: [
          {
            number: 1,
            revelationType: "Meccan",
            englishName: "Al-Fatiha",
            name: "الفاتحة",
            numberOfAyahs: 7,
            englishNameTranslation: "The Opening",
          },
          {
            number: 2,
            revelationType: "Medinan",
            englishName: "Al-Baqara",
            name: "البقرة",
            numberOfAyahs: 286,
            englishNameTranslation: "The Cow",
          },
          {
            number: 9,
            revelationType: "Medinan",
            englishName: "At-Tawba",
            name: "التوبة",
            numberOfAyahs: 129,
            englishNameTranslation: "The Repentance",
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const chapters = await getChapters();

      expect(chapters[0].bismillah_pre).toBe(false); // Fatiha
      expect(chapters[1].bismillah_pre).toBe(true); // Al-Baqara
      expect(chapters[2].bismillah_pre).toBe(false); // At-Tawba (no bismillah)
    });
  });

  describe("getAvailableTranslations", () => {
    it("should fetch and merge translations with preferred ones", async () => {
      const mockResponse = {
        data: [
          {
            identifier: "en.sahih",
            name: "Sahih International",
            englishName: "Sahih",
            language: "en",
          },
          {
            identifier: "fa.fooladvand",
            name: "Fooladvand",
            englishName: "Fooladvand",
            language: "fa",
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const translations = await getAvailableTranslations();

      expect(translations.length).toBeGreaterThan(0);
      // Should be sorted by language name
      const languageNames = translations.map((t) => t.language_name);
      const sortedNames = [...languageNames].sort();
      expect(languageNames).toEqual(sortedNames);
    });

    it("should return preferred translations on fetch error", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const translations = await getAvailableTranslations();

      expect(translations.length).toBe(PREFERRED_TRANSLATIONS.length);
    });
  });

  describe("getVerses", () => {
    it("should fetch and transform verses correctly", async () => {
      const mockResponse = {
        data: [
          {
            edition: { identifier: "quran-uthmani" },
            ayahs: [
              { number: 1, numberInSurah: 1, text: "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ" },
            ],
          },
          {
            edition: { identifier: "quran-simple" },
            ayahs: [{ number: 1, numberInSurah: 1, text: "بسم الله الرحمن الرحيم" }],
          },
          {
            edition: { identifier: "en.sahih", name: "Sahih International", direction: "ltr" },
            ayahs: [
              {
                number: 1,
                numberInSurah: 1,
                text: "In the name of Allah, the Entirely Merciful, the Especially Merciful.",
              },
            ],
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const verses = await getVerses(1, ["en.sahih"]);

      expect(verses).toHaveLength(1);
      expect(verses[0]).toHaveProperty("id");
      expect(verses[0]).toHaveProperty("verse_key", "1:1");
      expect(verses[0]).toHaveProperty("text_uthmani");
      expect(verses[0]).toHaveProperty("text_simple");
      expect(verses[0]).toHaveProperty("translations");
      expect(verses[0].translations).toHaveLength(1);
    });

    it("should return empty array on fetch error", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
      });

      const verses = await getVerses(1);
      expect(verses).toEqual([]);
    });

    it("should use default translation when none specified", async () => {
      const mockResponse = {
        data: [
          {
            edition: { identifier: "quran-uthmani" },
            ayahs: [{ number: 1, numberInSurah: 1, text: "test" }],
          },
          {
            edition: { identifier: "quran-simple" },
            ayahs: [{ number: 1, numberInSurah: 1, text: "test" }],
          },
          {
            edition: { identifier: "en.sahih", name: "Sahih", direction: "ltr" },
            ayahs: [{ number: 1, numberInSurah: 1, text: "test translation" }],
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      await getVerses(1);

      expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining("en.sahih"));
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
