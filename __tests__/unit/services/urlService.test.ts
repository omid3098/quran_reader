import { describe, it, expect } from "vitest";
import {
  parseUrlPath,
  buildVersePath,
  buildFullVerseUrl,
  isValidReference,
} from "../../../services/urlService";
import type { Chapter } from "../../../types";

describe("urlService", () => {
  const mockChapters: Chapter[] = [
    {
      id: 1,
      revelation_place: "makkah",
      revelation_order: 5,
      bismillah_pre: false,
      name_simple: "Al-Fatihah",
      name_complex: "Al-Fātiĥah",
      name_arabic: "الفاتحة",
      verses_count: 7,
      translated_name: {
        language_name: "english",
        name: "The Opener",
      },
    },
    {
      id: 2,
      revelation_place: "madinah",
      revelation_order: 87,
      bismillah_pre: true,
      name_simple: "Al-Baqarah",
      name_complex: "Al-Baqarah",
      name_arabic: "البقرة",
      verses_count: 286,
      translated_name: {
        language_name: "english",
        name: "The Cow",
      },
    },
    {
      id: 114,
      revelation_place: "makkah",
      revelation_order: 21,
      bismillah_pre: true,
      name_simple: "An-Nas",
      name_complex: "An-Nās",
      name_arabic: "الناس",
      verses_count: 6,
      translated_name: {
        language_name: "english",
        name: "Mankind",
      },
    },
  ];

  describe("parseUrlPath", () => {
    it("should parse surah and verse from valid path", () => {
      const result = parseUrlPath("/quran_reader/2/255");
      expect(result).toEqual({
        surahId: 2,
        verseNumber: 255,
        isValid: true,
      });
    });

    it("should parse surah only from path", () => {
      const result = parseUrlPath("/quran_reader/2");
      expect(result).toEqual({
        surahId: 2,
        verseNumber: null,
        isValid: true,
      });
    });

    it("should handle root path", () => {
      const result = parseUrlPath("/quran_reader/");
      expect(result).toEqual({
        surahId: null,
        verseNumber: null,
        isValid: false,
      });
    });

    it("should handle path without trailing slash", () => {
      const result = parseUrlPath("/quran_reader");
      expect(result).toEqual({
        surahId: null,
        verseNumber: null,
        isValid: false,
      });
    });

    it("should invalidate surah out of range (too high)", () => {
      const result = parseUrlPath("/quran_reader/115/1");
      expect(result.isValid).toBe(false);
    });

    it("should invalidate surah out of range (zero)", () => {
      const result = parseUrlPath("/quran_reader/0/1");
      expect(result.isValid).toBe(false);
    });

    it("should invalidate surah out of range (negative)", () => {
      const result = parseUrlPath("/quran_reader/-1/1");
      expect(result.isValid).toBe(false);
    });

    it("should invalidate non-numeric surah", () => {
      const result = parseUrlPath("/quran_reader/abc/1");
      expect(result.isValid).toBe(false);
    });

    it("should invalidate non-numeric verse", () => {
      const result = parseUrlPath("/quran_reader/2/abc");
      expect(result.isValid).toBe(false);
    });

    it("should invalidate zero verse number", () => {
      const result = parseUrlPath("/quran_reader/2/0");
      expect(result.isValid).toBe(false);
    });

    it("should invalidate negative verse number", () => {
      const result = parseUrlPath("/quran_reader/2/-5");
      expect(result.isValid).toBe(false);
    });

    it("should handle extra path segments gracefully", () => {
      const result = parseUrlPath("/quran_reader/2/255/extra");
      expect(result).toEqual({
        surahId: 2,
        verseNumber: 255,
        isValid: true,
      });
    });

    it("should handle paths without base path", () => {
      const result = parseUrlPath("/2/255");
      expect(result.isValid).toBe(false);
    });

    it("should handle paths with different base", () => {
      const result = parseUrlPath("/other_app/2/255");
      expect(result.isValid).toBe(false);
    });

    it("should parse valid edge case: surah 1 verse 1", () => {
      const result = parseUrlPath("/quran_reader/1/1");
      expect(result).toEqual({
        surahId: 1,
        verseNumber: 1,
        isValid: true,
      });
    });

    it("should parse valid edge case: surah 114", () => {
      const result = parseUrlPath("/quran_reader/114");
      expect(result).toEqual({
        surahId: 114,
        verseNumber: null,
        isValid: true,
      });
    });
  });

  describe("buildVersePath", () => {
    it("should build path for surah and verse", () => {
      const path = buildVersePath(2, 255);
      expect(path).toBe("/quran_reader/2/255");
    });

    it("should build path for surah only", () => {
      const path = buildVersePath(2);
      expect(path).toBe("/quran_reader/2");
    });

    it("should handle verse number of 1", () => {
      const path = buildVersePath(1, 1);
      expect(path).toBe("/quran_reader/1/1");
    });

    it("should handle surah 114", () => {
      const path = buildVersePath(114, 6);
      expect(path).toBe("/quran_reader/114/6");
    });

    it("should not add double slashes", () => {
      const path = buildVersePath(2, 255);
      expect(path).not.toContain("//");
    });
  });

  describe("buildFullVerseUrl", () => {
    it("should build full URL with origin", () => {
      // Mock window.location.origin
      Object.defineProperty(window, "location", {
        value: {
          origin: "https://example.com",
        },
        writable: true,
      });

      const url = buildFullVerseUrl(2, 255);
      expect(url).toBe("https://example.com/quran_reader/2/255");
    });

    it("should handle localhost origin", () => {
      Object.defineProperty(window, "location", {
        value: {
          origin: "http://localhost:3000",
        },
        writable: true,
      });

      const url = buildFullVerseUrl(1, 1);
      expect(url).toBe("http://localhost:3000/quran_reader/1/1");
    });
  });

  describe("isValidReference", () => {
    it("should validate surah in range without chapters", () => {
      expect(isValidReference(1)).toBe(true);
      expect(isValidReference(114)).toBe(true);
      expect(isValidReference(57)).toBe(true);
    });

    it("should invalidate surah out of range without chapters", () => {
      expect(isValidReference(0)).toBe(false);
      expect(isValidReference(115)).toBe(false);
      expect(isValidReference(-1)).toBe(false);
      expect(isValidReference(999)).toBe(false);
    });

    it("should validate verse range when chapters provided", () => {
      expect(isValidReference(1, 1, mockChapters)).toBe(true);
      expect(isValidReference(1, 7, mockChapters)).toBe(true);
      expect(isValidReference(2, 286, mockChapters)).toBe(true);
      expect(isValidReference(114, 6, mockChapters)).toBe(true);
    });

    it("should invalidate verse out of range when chapters provided", () => {
      expect(isValidReference(1, 8, mockChapters)).toBe(false); // Al-Fatihah only has 7 verses
      expect(isValidReference(2, 287, mockChapters)).toBe(false); // Al-Baqarah has 286 verses
      expect(isValidReference(114, 7, mockChapters)).toBe(false); // An-Nas has 6 verses
    });

    it("should invalidate zero verse number", () => {
      expect(isValidReference(2, 0, mockChapters)).toBe(false);
    });

    it("should invalidate negative verse number", () => {
      expect(isValidReference(2, -1, mockChapters)).toBe(false);
    });

    it("should validate surah without verse when chapters provided", () => {
      expect(isValidReference(1, undefined, mockChapters)).toBe(true);
      expect(isValidReference(2, undefined, mockChapters)).toBe(true);
    });

    it("should invalidate non-existent surah with chapters", () => {
      expect(isValidReference(999, 1, mockChapters)).toBe(false);
    });

    it("should handle surah not in mock chapters list", () => {
      expect(isValidReference(3, 1, mockChapters)).toBe(false); // Surah 3 not in our mock
    });
  });
});
