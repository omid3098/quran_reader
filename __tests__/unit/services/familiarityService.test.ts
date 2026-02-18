import { describe, it, expect } from "vitest";
import {
  computeWordFamiliarity,
  annotateWordsWithFamiliarity,
} from "../../../services/familiarityService";
import type { KnowledgeBase, QuranWord } from "../../../types";

const SAMPLE_KB: KnowledgeBase = {
  _meta: { author: "test", version: 1 },
  roots: {
    رحم: { note: "Mercy/womb", discoveredIn: "1:1" },
    كتب: { note: "Writing/prescribing", discoveredIn: "2:2" },
  },
  lemmas: {
    رَحِيم: { root: "رحم", note: "Most Merciful" },
    كِتَٰب: { root: "كتب", note: "The Book" },
  },
  connections: [],
  patterns: [],
};

describe("familiarityService", () => {
  describe("computeWordFamiliarity", () => {
    it("returns both false when KB is null", () => {
      const result = computeWordFamiliarity("رحم", "رَحِيم", null);
      expect(result).toEqual({ hasFamiliarRoot: false, hasFamiliarLemma: false });
    });

    it("returns both false when root and lemma are undefined", () => {
      const result = computeWordFamiliarity(undefined, undefined, SAMPLE_KB);
      expect(result).toEqual({ hasFamiliarRoot: false, hasFamiliarLemma: false });
    });

    it("detects familiar root only", () => {
      const result = computeWordFamiliarity("رحم", "unknownLemma", SAMPLE_KB);
      expect(result).toEqual({ hasFamiliarRoot: true, hasFamiliarLemma: false });
    });

    it("detects familiar lemma only", () => {
      const result = computeWordFamiliarity("unknownRoot", "رَحِيم", SAMPLE_KB);
      expect(result).toEqual({ hasFamiliarRoot: false, hasFamiliarLemma: true });
    });

    it("detects both familiar root and lemma", () => {
      const result = computeWordFamiliarity("رحم", "رَحِيم", SAMPLE_KB);
      expect(result).toEqual({ hasFamiliarRoot: true, hasFamiliarLemma: true });
    });

    it("returns false for root with empty note string", () => {
      const kbWithEmptyNote: KnowledgeBase = {
        ...SAMPLE_KB,
        roots: { تست: { note: "" } },
      };
      const result = computeWordFamiliarity("تست", undefined, kbWithEmptyNote);
      expect(result).toEqual({ hasFamiliarRoot: false, hasFamiliarLemma: false });
    });

    it("returns false for lemma with empty note string", () => {
      const kbWithEmptyNote: KnowledgeBase = {
        ...SAMPLE_KB,
        lemmas: { تست: { note: "" } },
      };
      const result = computeWordFamiliarity(undefined, "تست", kbWithEmptyNote);
      expect(result).toEqual({ hasFamiliarRoot: false, hasFamiliarLemma: false });
    });

    it("detects familiar particle via normalizedText fallback", () => {
      const kbWithParticle: KnowledgeBase = {
        ...SAMPLE_KB,
        lemmas: { ...SAMPLE_KB.lemmas, انما: { note: "Restrictive particle" } },
      };
      const result = computeWordFamiliarity(undefined, undefined, kbWithParticle, "انما");
      expect(result).toEqual({ hasFamiliarRoot: false, hasFamiliarLemma: true });
    });

    it("ignores normalizedText when root or lemma already exist", () => {
      const kbWithParticle: KnowledgeBase = {
        ...SAMPLE_KB,
        lemmas: { ...SAMPLE_KB.lemmas, انما: { note: "Restrictive particle" } },
      };
      // Has a root, so normalizedText should be ignored
      const result = computeWordFamiliarity("رحم", undefined, kbWithParticle, "انما");
      expect(result).toEqual({ hasFamiliarRoot: true, hasFamiliarLemma: false });
    });

    it("ignores normalizedText when lemma exists", () => {
      const kbWithParticle: KnowledgeBase = {
        ...SAMPLE_KB,
        lemmas: { ...SAMPLE_KB.lemmas, انما: { note: "Restrictive particle" } },
      };
      const result = computeWordFamiliarity(undefined, "رَحِيم", kbWithParticle, "انما");
      expect(result).toEqual({ hasFamiliarRoot: false, hasFamiliarLemma: true });
    });
  });

  describe("annotateWordsWithFamiliarity", () => {
    it("returns original array reference when KB is null", () => {
      const words: QuranWord[] = [{ id: 0, position: 1, text_uthmani: "test", root: "رحم" }];
      const result = annotateWordsWithFamiliarity(words, null);
      expect(result).toBe(words);
    });

    it("annotates words with familiar roots and lemmas", () => {
      const words: QuranWord[] = [
        { id: 0, position: 1, text_uthmani: "بِسْمِ", root: "سمو" },
        { id: 1, position: 2, text_uthmani: "ٱللَّهِ", root: "اله" },
        { id: 2, position: 3, text_uthmani: "ٱلرَّحْمَٰنِ", root: "رحم", lemma: "رَحْمَٰن" },
        { id: 3, position: 4, text_uthmani: "ٱلرَّحِيمِ", root: "رحم", lemma: "رَحِيم" },
      ];
      const result = annotateWordsWithFamiliarity(words, SAMPLE_KB);

      // Words 0, 1: no familiar root or lemma — returned as-is
      expect(result[0]).toBe(words[0]);
      expect(result[1]).toBe(words[1]);

      // Word 2: familiar root (رحم), unfamiliar lemma (رَحْمَٰن)
      expect(result[2].hasFamiliarRoot).toBe(true);
      expect(result[2].hasFamiliarLemma).toBe(false);

      // Word 3: familiar root (رحم) AND familiar lemma (رَحِيم)
      expect(result[3].hasFamiliarRoot).toBe(true);
      expect(result[3].hasFamiliarLemma).toBe(true);
    });

    it("does not mutate input array or objects", () => {
      const words: QuranWord[] = [{ id: 0, position: 1, text_uthmani: "test", root: "رحم" }];
      const result = annotateWordsWithFamiliarity(words, SAMPLE_KB);
      expect(result).not.toBe(words);
      expect(words[0].hasFamiliarRoot).toBeUndefined();
    });

    it("skips annotation when no words have familiar data", () => {
      const words: QuranWord[] = [
        { id: 0, position: 1, text_uthmani: "بِسْمِ", root: "سمو" },
        { id: 1, position: 2, text_uthmani: "ٱللَّهِ", root: "اله" },
      ];
      const result = annotateWordsWithFamiliarity(words, SAMPLE_KB);
      // All returned as-is (same references)
      expect(result[0]).toBe(words[0]);
      expect(result[1]).toBe(words[1]);
    });

    it("annotates particles (no root/lemma) via normalized text fallback", () => {
      const kbWithParticle: KnowledgeBase = {
        ...SAMPLE_KB,
        lemmas: { ...SAMPLE_KB.lemmas, انما: { note: "Restrictive particle" } },
      };
      const words: QuranWord[] = [
        { id: 0, position: 1, text_uthmani: "إِنَّمَا" }, // particle — no root, no lemma
        { id: 1, position: 2, text_uthmani: "ٱلرَّحِيمِ", root: "رحم", lemma: "رَحِيم" },
      ];
      const result = annotateWordsWithFamiliarity(words, kbWithParticle);

      // Word 0: particle — should be familiar via normalized text "انما"
      expect(result[0].hasFamiliarLemma).toBe(true);
      expect(result[0].hasFamiliarRoot).toBe(false);

      // Word 1: normal word — familiar via both root and lemma
      expect(result[1].hasFamiliarRoot).toBe(true);
      expect(result[1].hasFamiliarLemma).toBe(true);
    });
  });
});
