import { describe, it, expect } from "vitest";
import { buildPromptText, type PromptContext } from "../../../services/promptBuilderService";

function makeContext(overrides: Partial<PromptContext> = {}): PromptContext {
  return {
    verseKey: "2:255",
    verseText: "ٱللَّهُ لَآ إِلَٰهَ إِلَّا هُوَ ٱلْحَىُّ ٱلْقَيُّومُ",
    chapterName: "Al-Baqarah",
    chapterNameArabic: "البقرة",
    revelationPlace: "madinah",
    translations: [
      {
        name: "Sahih International",
        text: "Allah - there is no deity except Him, the Ever-Living",
      },
    ],
    words: [
      { word: "ٱللَّهُ", root: "اله", lemma: "ٱللَّه" },
      { word: "لَآ", root: undefined, lemma: undefined },
      { word: "إِلَٰهَ", root: "اله", lemma: "إِلَٰه" },
    ],
    rootNotes: new Map(),
    lemmaNotes: new Map(),
    phraseMatches: [],
    connections: [],
    verseNoteText: "",
    surahNoteText: "",
    ...overrides,
  };
}

describe("promptBuilderService", () => {
  describe("buildPromptText", () => {
    it("includes verse key and chapter name in header", () => {
      const result = buildPromptText(makeContext());
      expect(result).toContain("Al-Baqarah");
      expect(result).toContain("البقرة");
      expect(result).toContain("2:255");
    });

    it("includes verse text", () => {
      const result = buildPromptText(makeContext());
      expect(result).toContain("ٱللَّهُ لَآ إِلَٰهَ إِلَّا هُوَ ٱلْحَىُّ ٱلْقَيُّومُ");
    });

    it("includes translations with names", () => {
      const result = buildPromptText(makeContext());
      expect(result).toContain("Sahih International");
      expect(result).toContain("there is no deity except Him");
    });

    it("includes multiple translations", () => {
      const result = buildPromptText(
        makeContext({
          translations: [
            { name: "Sahih International", text: "Translation 1" },
            { name: "Pickthall", text: "Translation 2" },
          ],
        })
      );
      expect(result).toContain("Sahih International");
      expect(result).toContain("Pickthall");
    });

    it("includes word analysis with root and lemma", () => {
      const result = buildPromptText(makeContext());
      expect(result).toContain("ٱللَّهُ");
      expect(result).toContain("اله");
      expect(result).toContain("ٱللَّه");
    });

    it("handles words without root or lemma", () => {
      const result = buildPromptText(makeContext());
      // "لَآ" has no root/lemma — should still appear in word list
      expect(result).toContain("لَآ");
    });

    it("includes KB root notes when present", () => {
      const rootNotes = new Map([
        ["اله", "الألوهية — divinity, the quality of being worthy of worship"],
      ]);
      const result = buildPromptText(makeContext({ rootNotes }));
      expect(result).toContain("اله");
      expect(result).toContain("الألوهية");
    });

    it("includes KB lemma notes when present", () => {
      const lemmaNotes = new Map([["ٱللَّه", "The proper name of God"]]);
      const result = buildPromptText(makeContext({ lemmaNotes }));
      expect(result).toContain("ٱللَّه");
      expect(result).toContain("The proper name of God");
    });

    it("omits root/lemma notes section when none exist", () => {
      const result = buildPromptText(makeContext());
      expect(result).not.toContain("Your Notes on Roots");
    });

    it("includes phrase match cross-references", () => {
      const result = buildPromptText(
        makeContext({
          phraseMatches: [
            {
              pattern: "لَآ إِلَٰهَ إِلَّا",
              matchType: "lemma",
              verses: ["3:18", "37:35", "47:19"],
            },
          ],
        })
      );
      expect(result).toContain("لَآ إِلَٰهَ إِلَّا");
      expect(result).toContain("3:18");
      expect(result).toContain("37:35");
    });

    it("omits cross-references section when none exist", () => {
      const result = buildPromptText(makeContext());
      expect(result).not.toContain("Cross-References");
    });

    it("includes KB connections", () => {
      const result = buildPromptText(
        makeContext({
          connections: [{ from: "2:255", to: "3:2", reason: "Both describe الحي القيوم" }],
        })
      );
      expect(result).toContain("2:255");
      expect(result).toContain("3:2");
      expect(result).toContain("Both describe");
    });

    it("omits connections section when none exist", () => {
      const result = buildPromptText(makeContext());
      expect(result).not.toContain("Connections");
    });

    it("includes verse notes when present", () => {
      const result = buildPromptText(
        makeContext({ verseNoteText: "آیه الکرسی — مهم‌ترین آیه قرآن" })
      );
      expect(result).toContain("آیه الکرسی");
    });

    it("omits verse notes section when empty", () => {
      const result = buildPromptText(makeContext({ verseNoteText: "" }));
      expect(result).not.toContain("Your Notes on This Verse");
    });

    it("includes surah notes when present", () => {
      const result = buildPromptText(makeContext({ surahNoteText: "سوره بقره — بزرگترین سوره" }));
      expect(result).toContain("سوره بقره");
    });

    it("omits surah notes section when empty", () => {
      const result = buildPromptText(makeContext({ surahNoteText: "" }));
      expect(result).not.toContain("Your Notes on");
    });

    it("includes analysis framework section", () => {
      const result = buildPromptText(makeContext());
      expect(result).toContain("Analysis Framework");
      // Should contain key concepts from the framework
      expect(result).toContain("root etymology");
    });

    it("ends with instruction to analyze in Persian", () => {
      const result = buildPromptText(makeContext());
      expect(result).toContain("Persian");
    });

    it("produces a non-trivial prompt with all sections populated", () => {
      const result = buildPromptText(
        makeContext({
          rootNotes: new Map([["اله", "divinity note"]]),
          lemmaNotes: new Map([["ٱللَّه", "God note"]]),
          phraseMatches: [{ pattern: "لَآ إِلَٰهَ", matchType: "lemma", verses: ["3:18"] }],
          connections: [{ from: "2:255", to: "3:2", reason: "test connection" }],
          verseNoteText: "My verse note",
          surahNoteText: "My surah note",
        })
      );
      // Should have all major sections
      expect(result).toContain("## Verse");
      expect(result).toContain("## Translations");
      expect(result).toContain("## Word Analysis");
      expect(result).toContain("Root");
      expect(result).toContain("Cross-References");
      expect(result).toContain("Connections");
      expect(result).toContain("My verse note");
      expect(result).toContain("My surah note");
      expect(result).toContain("Analysis Framework");
    });
  });
});
