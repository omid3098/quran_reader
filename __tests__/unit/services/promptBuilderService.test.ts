import { describe, it, expect } from "vitest";
import {
  buildPromptText,
  collectSampleNotes,
  type PromptContext,
} from "../../../services/promptBuilderService";
import type { VerseNote } from "../../../types";

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
    sampleNotes: [],
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

    it("omits cross-references data section when none exist", () => {
      const result = buildPromptText(makeContext());
      expect(result).not.toContain("## Cross-References (Shared Patterns)");
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

    it("includes note style guide section", () => {
      const result = buildPromptText(makeContext());
      expect(result).toContain("Note Style Guide");
      // Should contain key concepts from the style guide
      expect(result).toContain("Two-Part Note Architecture");
    });

    it("ends with instruction requesting three-part output", () => {
      const result = buildPromptText(makeContext());
      expect(result).toContain("بخش ۱");
      expect(result).toContain("بخش ۲");
      expect(result).toContain("بخش ۳");
      expect(result).toContain("فارسی محاوره‌ای");
    });

    it("includes sample notes section when present", () => {
      const result = buildPromptText(
        makeContext({
          sampleNotes: [
            { verseKey: "2:254", text: "نوت آیه ۲۵۴" },
            { verseKey: "2:253", text: "نوت آیه ۲۵۳" },
          ],
        })
      );
      expect(result).toContain("Sample Notes from Your Recent Analysis");
      expect(result).toContain("### [2:254]");
      expect(result).toContain("نوت آیه ۲۵۴");
      expect(result).toContain("### [2:253]");
      expect(result).toContain("نوت آیه ۲۵۳");
    });

    it("omits sample notes section when empty", () => {
      const result = buildPromptText(makeContext({ sampleNotes: [] }));
      expect(result).not.toContain("Sample Notes");
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
      expect(result).toContain("Note Style Guide");
    });
  });

  describe("collectSampleNotes", () => {
    function makeNote(verseKey: string, text: string): VerseNote {
      return {
        verseKey,
        blocks: [{ type: "paragraph", content: [{ type: "text", text }] }],
        updatedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      };
    }

    it("returns notes from connected verses first", () => {
      const allNotes: Record<string, VerseNote> = {
        "3:2": makeNote("3:2", "Connected note"),
        "2:254": makeNote("2:254", "Previous ayah note"),
      };
      const connections = [{ from: "2:255", to: "3:2", reason: "test" }];
      const result = collectSampleNotes("2:255", connections, allNotes);
      expect(result[0].verseKey).toBe("3:2");
      expect(result[0].text).toBe("Connected note");
    });

    it("falls back to previous ayahs when no connections have notes", () => {
      const allNotes: Record<string, VerseNote> = {
        "2:253": makeNote("2:253", "Note 253"),
        "2:254": makeNote("2:254", "Note 254"),
      };
      const result = collectSampleNotes("2:255", [], allNotes);
      expect(result).toHaveLength(2);
      expect(result[0].verseKey).toBe("2:254");
      expect(result[1].verseKey).toBe("2:253");
    });

    it("limits to 3 sample notes", () => {
      const allNotes: Record<string, VerseNote> = {};
      for (let i = 1; i <= 10; i++) {
        allNotes[`2:${i}`] = makeNote(`2:${i}`, `Note ${i}`);
      }
      const result = collectSampleNotes("2:11", [], allNotes);
      expect(result).toHaveLength(3);
    });

    it("skips current verse", () => {
      const allNotes: Record<string, VerseNote> = {
        "2:255": makeNote("2:255", "Current verse note"),
        "2:254": makeNote("2:254", "Previous note"),
      };
      const result = collectSampleNotes("2:255", [], allNotes);
      expect(result).toHaveLength(1);
      expect(result[0].verseKey).toBe("2:254");
    });

    it("deduplicates across connections and backlinks", () => {
      const allNotes: Record<string, VerseNote> = {
        "3:2": makeNote("3:2", "Note with [2:255] ref"),
      };
      // 3:2 appears as both a connection AND would be a backlink
      const connections = [{ from: "2:255", to: "3:2", reason: "test" }];
      const result = collectSampleNotes("2:255", connections, allNotes);
      expect(result).toHaveLength(1);
    });

    it("returns empty when no notes exist", () => {
      const result = collectSampleNotes("2:255", [], {});
      expect(result).toHaveLength(0);
    });

    it("skips verses with empty notes", () => {
      const allNotes: Record<string, VerseNote> = {
        "2:254": {
          verseKey: "2:254",
          blocks: [],
          updatedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        },
        "2:253": makeNote("2:253", "Real note"),
      };
      const result = collectSampleNotes("2:255", [], allNotes);
      expect(result).toHaveLength(1);
      expect(result[0].verseKey).toBe("2:253");
    });
  });
});
