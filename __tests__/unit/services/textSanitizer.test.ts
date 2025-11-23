import { describe, it, expect } from "vitest";
import { sanitizeQuranText } from "@/services/textSanitizer";

describe("textSanitizer", () => {
  describe("sanitizeQuranText", () => {
    it("should return empty string for null/undefined input", () => {
      expect(sanitizeQuranText("")).toBe("");
      expect(sanitizeQuranText(null as unknown as string)).toBe("");
      expect(sanitizeQuranText(undefined as unknown as string)).toBe("");
    });

    it("should remove Quranic annotation characters (U+0610-U+061A)", () => {
      // These are Arabic signs like صلعم, etc.
      const textWithAnnotations = "بِسْمِ\u0610 اللَّهِ";
      const result = sanitizeQuranText(textWithAnnotations);
      expect(result).not.toContain("\u0610");
    });

    it("should remove Quranic marks (U+06D6-U+06E4)", () => {
      // Stop signs, sajdah marks, etc.
      const textWithMarks = "الْحَمْدُ\u06D6 لِلَّهِ";
      const result = sanitizeQuranText(textWithMarks);
      expect(result).not.toContain("\u06D6");
    });

    it("should remove extended Arabic marks (U+08D4-U+08FF)", () => {
      const textWithExtended = "test\u08D4text";
      const result = sanitizeQuranText(textWithExtended);
      expect(result).not.toContain("\u08D4");
    });

    it("should normalize multiple spaces to single space", () => {
      const textWithSpaces = "بسم   الله    الرحمن";
      const result = sanitizeQuranText(textWithSpaces);
      expect(result).toBe("بسم الله الرحمن");
    });

    it("should trim leading and trailing whitespace", () => {
      const textWithWhitespace = "   بسم الله   ";
      const result = sanitizeQuranText(textWithWhitespace);
      expect(result).toBe("بسم الله");
    });

    it("should preserve regular Arabic letters and diacritics", () => {
      const arabicText = "الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ";
      const result = sanitizeQuranText(arabicText);
      // Should preserve the core text structure including diacritics
      expect(result).toContain("الْحَمْدُ");
      expect(result.length).toBeGreaterThan(0);
    });

    it("should handle mixed content correctly", () => {
      const mixedText = "  بِسْمِ\u0610\u06D6 اللَّهِ   ";
      const result = sanitizeQuranText(mixedText);
      expect(result).not.toContain("\u0610");
      expect(result).not.toContain("\u06D6");
      expect(result.startsWith(" ")).toBe(false);
      expect(result.endsWith(" ")).toBe(false);
    });

    it("should handle empty string input", () => {
      expect(sanitizeQuranText("")).toBe("");
    });

    it("should handle string with only non-text characters", () => {
      const onlyMarks = "\u0610\u06D6\u08D4";
      const result = sanitizeQuranText(onlyMarks);
      expect(result).toBe("");
    });
  });
});
