import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  countLetters,
  analyzeVerse,
  analyzeSurah,
  analyzeRange,
  type LetterStats,
  type LetterAnalysisResult,
} from "@/services/letterAnalysisService";

// Mock the analysisService module
vi.mock("@/services/analysisService", () => ({
  loadLocalRootData: vi.fn(),
}));

// Mock textSanitizer
vi.mock("@/services/textSanitizer", () => ({
  sanitizeQuranText: vi.fn((text: string) => text),
}));

import { loadLocalRootData } from "@/services/analysisService";

const mockLoadLocalRootData = vi.mocked(loadLocalRootData);

describe("letterAnalysisService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("countLetters", () => {
    it("should count Arabic letters correctly", () => {
      const counts = countLetters("الله");
      expect(counts.get("ا")).toBe(1);
      expect(counts.get("ل")).toBe(2);
      expect(counts.get("ه")).toBe(1);
    });

    it("should ignore non-Arabic characters", () => {
      const counts = countLetters("Hello الله World");
      expect(counts.has("H")).toBeFalsy();
      expect(counts.has("W")).toBeFalsy();
      expect(counts.get("ا")).toBe(1);
    });

    it("should return empty map for empty string", () => {
      const counts = countLetters("");
      expect(counts.size).toBe(0);
    });

    it("should ignore diacritics", () => {
      const countsWithDiacritics = countLetters("الْحَمْدُ");
      const countsWithoutDiacritics = countLetters("الحمد");

      // Both should have same letter counts
      expect(countsWithDiacritics.get("ا")).toBe(countsWithoutDiacritics.get("ا"));
      expect(countsWithDiacritics.get("ل")).toBe(countsWithoutDiacritics.get("ل"));
    });

    it("should handle tatweel correctly", () => {
      const counts = countLetters("اللــــه");
      expect(counts.get("ا")).toBe(1);
      expect(counts.get("ل")).toBe(2);
      expect(counts.get("ه")).toBe(1);
      // Tatweel should not be counted
      expect(counts.has("\u0640")).toBeFalsy();
    });
  });

  describe("analyzeVerse", () => {
    it("should analyze a single verse", async () => {
      mockLoadLocalRootData.mockResolvedValueOnce({
        "1:1": [
          { r: "سمو", l: "اسم", t: "بسم" },
          { r: "اله", l: "الله", t: "الله" },
        ],
      });

      const result = await analyzeVerse("1:1");
      expect(result).toHaveProperty("totalLetters");
      expect(result).toHaveProperty("uniqueLetters");
      expect(result).toHaveProperty("distribution");
    });

    it("should return empty result for non-existent verse", async () => {
      mockLoadLocalRootData.mockResolvedValueOnce({
        "1:1": [{ r: "test", l: "test", t: "test" }],
      });

      const result = await analyzeVerse("999:999");
      expect(result.totalLetters).toBe(0);
      expect(result.uniqueLetters).toBe(0);
      expect(result.distribution).toEqual([]);
    });

    it("should return empty result when data is null", async () => {
      mockLoadLocalRootData.mockResolvedValueOnce(null);

      const result = await analyzeVerse("1:1");
      expect(result.totalLetters).toBe(0);
    });
  });

  describe("analyzeSurah", () => {
    it("should analyze all verses in a surah", async () => {
      mockLoadLocalRootData.mockResolvedValueOnce({
        "1:1": [{ r: "test", l: "test", t: "بسم" }],
        "1:2": [{ r: "test", l: "test", t: "الحمد" }],
        "1:3": [{ r: "test", l: "test", t: "الرحمن" }],
        "2:1": [{ r: "test", l: "test", t: "الم" }], // Different surah
      });

      const result = await analyzeSurah(1);
      expect(result.totalLetters).toBeGreaterThan(0);
    });

    it("should return empty result for non-existent surah", async () => {
      mockLoadLocalRootData.mockResolvedValueOnce({
        "1:1": [{ r: "test", l: "test", t: "test" }],
      });

      const result = await analyzeSurah(999);
      expect(result.totalLetters).toBe(0);
    });

    it("should return empty result when data is null", async () => {
      mockLoadLocalRootData.mockResolvedValueOnce(null);

      const result = await analyzeSurah(1);
      expect(result.totalLetters).toBe(0);
    });
  });

  describe("analyzeRange", () => {
    it("should analyze verses in a range", async () => {
      mockLoadLocalRootData.mockResolvedValueOnce({
        "1:1": [{ r: "test", l: "test", t: "بسم" }],
        "1:2": [{ r: "test", l: "test", t: "الحمد" }],
        "1:3": [{ r: "test", l: "test", t: "الرحمن" }],
        "1:4": [{ r: "test", l: "test", t: "مالك" }],
      });

      const result = await analyzeRange("1:1", "1:3");
      expect(result.totalLetters).toBeGreaterThan(0);
    });

    it("should handle reversed range order", async () => {
      mockLoadLocalRootData.mockResolvedValueOnce({
        "1:1": [{ r: "test", l: "test", t: "بسم" }],
        "1:2": [{ r: "test", l: "test", t: "الحمد" }],
        "1:3": [{ r: "test", l: "test", t: "الرحمن" }],
      });

      // End before start should still work
      const result = await analyzeRange("1:3", "1:1");
      expect(result.totalLetters).toBeGreaterThan(0);
    });

    it("should handle cross-surah ranges", async () => {
      mockLoadLocalRootData.mockResolvedValueOnce({
        "1:7": [{ r: "test", l: "test", t: "صراط" }],
        "2:1": [{ r: "test", l: "test", t: "الم" }],
        "2:2": [{ r: "test", l: "test", t: "ذلك" }],
      });

      const result = await analyzeRange("1:7", "2:2");
      expect(result.totalLetters).toBeGreaterThan(0);
    });

    it("should return empty result when data is null", async () => {
      mockLoadLocalRootData.mockResolvedValueOnce(null);

      const result = await analyzeRange("1:1", "1:3");
      expect(result.totalLetters).toBe(0);
    });
  });

  describe("LetterAnalysisResult structure", () => {
    it("should have correct structure with sorted distribution", async () => {
      mockLoadLocalRootData.mockResolvedValueOnce({
        "1:1": [
          { r: "test", l: "test", t: "اااببب" }, // 3 alefs, 3 bas
        ],
      });

      const result = await analyzeVerse("1:1");

      expect(result).toHaveProperty("totalLetters");
      expect(result).toHaveProperty("uniqueLetters");
      expect(result).toHaveProperty("distribution");
      expect(Array.isArray(result.distribution)).toBe(true);

      if (result.distribution.length > 0) {
        const firstItem = result.distribution[0];
        expect(firstItem).toHaveProperty("letter");
        expect(firstItem).toHaveProperty("count");
        expect(firstItem).toHaveProperty("percentage");
        expect(typeof firstItem.percentage).toBe("number");
      }
    });

    it("should sort distribution by count descending", async () => {
      mockLoadLocalRootData.mockResolvedValueOnce({
        "1:1": [
          { r: "test", l: "test", t: "ااابب" }, // 3 alefs, 2 bas
        ],
      });

      const result = await analyzeVerse("1:1");

      if (result.distribution.length >= 2) {
        expect(result.distribution[0].count).toBeGreaterThanOrEqual(result.distribution[1].count);
      }
    });
  });
});
