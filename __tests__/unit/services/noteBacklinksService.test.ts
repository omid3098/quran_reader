import { describe, it, expect } from "vitest";
import { extractVerseRefs, computeBacklinks } from "../../../services/noteBacklinksService";
import type { VerseNote } from "../../../types";

function makeNote(verseKey: string, blocks: unknown[]): VerseNote {
  return {
    verseKey,
    blocks,
    updatedAt: "2024-01-01T00:00:00Z",
    createdAt: "2024-01-01T00:00:00Z",
  };
}

describe("noteBacklinksService", () => {
  describe("extractVerseRefs", () => {
    it("returns empty array for empty blocks", () => {
      expect(extractVerseRefs([])).toEqual([]);
    });

    it("returns empty array for blocks with no quranLink nodes", () => {
      const blocks = [{ type: "paragraph", content: [{ type: "text", text: "plain text" }] }];
      expect(extractVerseRefs(blocks)).toEqual([]);
    });

    it("extracts a single [x:y] reference", () => {
      const blocks = [
        {
          type: "paragraph",
          content: [
            { type: "text", text: "See verse " },
            { type: "quranLink", props: { reference: "2:255" } },
          ],
        },
      ];
      expect(extractVerseRefs(blocks)).toEqual(["2:255"]);
    });

    it("extracts multiple references", () => {
      const blocks = [
        {
          type: "paragraph",
          content: [
            { type: "quranLink", props: { reference: "2:255" } },
            { type: "text", text: " and " },
            { type: "quranLink", props: { reference: "17:32" } },
          ],
        },
      ];
      expect(extractVerseRefs(blocks)).toEqual(["2:255", "17:32"]);
    });

    it("deduplicates repeated references", () => {
      const blocks = [
        {
          type: "paragraph",
          content: [{ type: "quranLink", props: { reference: "2:255" } }],
        },
        {
          type: "paragraph",
          content: [{ type: "quranLink", props: { reference: "2:255" } }],
        },
      ];
      expect(extractVerseRefs(blocks)).toEqual(["2:255"]);
    });

    it("does not match hyperlinks [text](url)", () => {
      const blocks = [
        {
          type: "paragraph",
          content: [
            {
              type: "link",
              href: "https://quran.com",
              content: [{ type: "text", text: "Quran.com" }],
            },
          ],
        },
      ];
      expect(extractVerseRefs(blocks)).toEqual([]);
    });

    it("does not match plain text in brackets like [some text]", () => {
      const blocks = [
        {
          type: "paragraph",
          content: [{ type: "text", text: "See [some text] here" }],
        },
      ];
      expect(extractVerseRefs(blocks)).toEqual([]);
    });

    it("extracts refs alongside hyperlinks correctly", () => {
      const blocks = [
        {
          type: "paragraph",
          content: [
            { type: "text", text: "See " },
            { type: "quranLink", props: { reference: "2:255" } },
            { type: "text", text: " and " },
            {
              type: "link",
              href: "https://quran.com",
              content: [{ type: "text", text: "Quran.com" }],
            },
          ],
        },
      ];
      expect(extractVerseRefs(blocks)).toEqual(["2:255"]);
    });
  });

  describe("computeBacklinks", () => {
    it("returns empty array when no notes exist", () => {
      expect(computeBacklinks("2:255", {})).toEqual([]);
    });

    it("returns empty array when no notes reference the target", () => {
      const notes: Record<string, VerseNote> = {
        "2:169": makeNote("2:169", [
          {
            type: "paragraph",
            content: [{ type: "quranLink", props: { reference: "17:32" } }],
          },
        ]),
      };
      expect(computeBacklinks("2:255", notes)).toEqual([]);
    });

    it("finds a backlink when a note references the target", () => {
      const notes: Record<string, VerseNote> = {
        "2:169": makeNote("2:169", [
          {
            type: "paragraph",
            content: [
              { type: "text", text: "Compare with " },
              { type: "quranLink", props: { reference: "17:32" } },
            ],
          },
        ]),
      };
      const result = computeBacklinks("17:32", notes);
      expect(result).toHaveLength(1);
      expect(result[0].sourceVerseKey).toBe("2:169");
      expect(result[0].targetVerseKey).toBe("17:32");
      expect(result[0].excerpt).toContain("[17:32]");
    });

    it("finds multiple backlinks from different notes", () => {
      const notes: Record<string, VerseNote> = {
        "2:169": makeNote("2:169", [
          {
            type: "paragraph",
            content: [{ type: "quranLink", props: { reference: "17:32" } }],
          },
        ]),
        "7:80": makeNote("7:80", [
          {
            type: "paragraph",
            content: [{ type: "quranLink", props: { reference: "17:32" } }],
          },
        ]),
      };
      const result = computeBacklinks("17:32", notes);
      expect(result).toHaveLength(2);
    });

    it("excludes self-references", () => {
      const notes: Record<string, VerseNote> = {
        "2:255": makeNote("2:255", [
          {
            type: "paragraph",
            content: [{ type: "quranLink", props: { reference: "2:255" } }],
          },
        ]),
      };
      expect(computeBacklinks("2:255", notes)).toEqual([]);
    });

    it("sorts results by verse key (surah first, then verse)", () => {
      const notes: Record<string, VerseNote> = {
        "7:80": makeNote("7:80", [
          {
            type: "paragraph",
            content: [{ type: "quranLink", props: { reference: "2:255" } }],
          },
        ]),
        "2:169": makeNote("2:169", [
          {
            type: "paragraph",
            content: [{ type: "quranLink", props: { reference: "2:255" } }],
          },
        ]),
        "3:18": makeNote("3:18", [
          {
            type: "paragraph",
            content: [{ type: "quranLink", props: { reference: "2:255" } }],
          },
        ]),
      };
      const result = computeBacklinks("2:255", notes);
      expect(result.map((r) => r.sourceVerseKey)).toEqual(["2:169", "3:18", "7:80"]);
    });

    it("excerpt contains context around the reference", () => {
      const notes: Record<string, VerseNote> = {
        "2:169": makeNote("2:169", [
          {
            type: "paragraph",
            content: [
              { type: "text", text: "This concept appears in " },
              { type: "quranLink", props: { reference: "17:32" } },
              { type: "text", text: " as well" },
            ],
          },
        ]),
      };
      const result = computeBacklinks("17:32", notes);
      expect(result[0].excerpt).toContain("17:32");
    });

    it("handles notes with empty blocks", () => {
      const notes: Record<string, VerseNote> = {
        "2:169": makeNote("2:169", []),
      };
      expect(computeBacklinks("2:255", notes)).toEqual([]);
    });
  });
});
