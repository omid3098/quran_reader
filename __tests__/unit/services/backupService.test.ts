import { describe, it, expect, vi } from "vitest";
import {
  mergeParsedBackupData,
  mergeKnowledgeBases,
  parseBackupData,
  buildBackupData,
} from "@/services/backupService";
import type { PartialBlock } from "@blocknote/core";
import type { BackupDataV1, BackupDataV2, KnowledgeBase, VerseNote, SurahNote } from "@/types";

vi.mock("@/services/knowledgeBaseService", () => ({
  loadKnowledgeBase: vi.fn().mockResolvedValue(null),
}));

describe("backupService", () => {
  it("parses v1 backups with verse, surah notes, and bookmark", () => {
    const backup: BackupDataV1 = {
      v: 1,
      bookmarks: ["2:255"],
      notes: [["1:1", "Hello", "2024-01-01T00:00:00Z"]],
      surahNotes: [
        {
          surahId: 2,
          blocks: [{ type: "paragraph", content: "Surah note" } as PartialBlock],
          updatedAt: "2024-01-02T00:00:00Z",
          createdAt: "2024-01-02T00:00:00Z",
        },
      ],
      exportedAt: "2024-01-03T00:00:00Z",
    };

    const parsed = parseBackupData(backup);

    expect(parsed.notes["1:1"].verseKey).toBe("1:1");
    expect(parsed.notes["1:1"].blocks[0].content).toBe("Hello");
    expect(parsed.surahNotes[2]).toBeDefined();
    expect(parsed.bookmark?.surahId).toBe(2);
    expect(parsed.bookmark?.verseNumber).toBe(255);
  });

  it("parses v2 backups and merges legacy tuples", () => {
    const backup: BackupDataV2 = {
      v: 2,
      bookmarks: ["3:5"],
      notes: [
        {
          key: "2:1",
          blocks: [{ type: "paragraph", content: "Rich note" } as PartialBlock],
          updatedAt: "2024-02-01T00:00:00Z",
          createdAt: "2024-02-01T00:00:00Z",
        },
      ],
      surahNotes: [
        {
          surahId: 3,
          blocks: [{ type: "paragraph", content: "Surah rich" } as PartialBlock],
          updatedAt: "2024-02-02T00:00:00Z",
          createdAt: "2024-02-02T00:00:00Z",
        },
      ],
      legacyNotes: [["4:1", "Legacy content", "2024-01-01T00:00:00Z"]],
      exportedAt: "2024-02-03T00:00:00Z",
    };

    const parsed = parseBackupData(backup);

    expect(parsed.notes["2:1"].blocks[0].content).toBe("Rich note");
    expect(parsed.notes["4:1"].blocks[0].content).toBe("Legacy content");
    expect(parsed.bookmark?.verseKey).toBe("3:5");
  });

  it("keeps inline styles and custom props when parsing v2 rich blocks", () => {
    const backup: BackupDataV2 = {
      v: 2,
      bookmarks: [],
      notes: [
        {
          key: "1:2",
          blocks: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "Styled",
                  styles: { color: "#ff0000", backgroundColor: "#ffff00", custom: "note" },
                },
              ],
            } as unknown as PartialBlock,
          ],
          updatedAt: "2024-04-01T00:00:00Z",
          createdAt: "2024-04-01T00:00:00Z",
        },
      ],
      surahNotes: [],
      exportedAt: "2024-04-02T00:00:00Z",
    };

    const parsed = parseBackupData(backup);
    const blocks = parsed.notes["1:2"].blocks;
    const textNode = (blocks[0].content as { styles?: Record<string, string> }[])[0];
    expect(textNode.styles?.color).toBe("#ff0000");
    expect(textNode.styles?.backgroundColor).toBe("#ffff00");
  });

  it("drops malformed blocks without a type when parsing v2", () => {
    const backup: BackupDataV2 = {
      v: 2,
      bookmarks: [],
      notes: [
        {
          key: "1:3",
          // Missing type should be ignored
          blocks: [{ content: "oops" } as PartialBlock],
          updatedAt: "2024-05-01T00:00:00Z",
          createdAt: "2024-05-01T00:00:00Z",
        },
      ],
      surahNotes: [],
      exportedAt: "2024-05-02T00:00:00Z",
    };

    const parsed = parseBackupData(backup);
    expect(parsed.notes["1:3"]).toBeUndefined();
  });

  it("merges incoming data over existing notes while keeping user-only entries", () => {
    const current = {
      notes: {
        "1:1": {
          verseKey: "1:1",
          blocks: [{ type: "paragraph", content: "Old" }],
          updatedAt: "a",
          createdAt: "a",
        },
        "2:1": {
          verseKey: "2:1",
          blocks: [{ type: "paragraph", content: "Keep" }],
          updatedAt: "b",
          createdAt: "b",
        },
      },
      surahNotes: {
        1: {
          surahId: 1,
          blocks: [{ type: "paragraph", content: "Old surah" }],
          updatedAt: "a",
          createdAt: "a",
        },
      },
      bookmark: { surahId: 1, verseNumber: 1, verseKey: "1:1" },
    };

    const incoming = {
      notes: {
        "1:1": {
          verseKey: "1:1",
          blocks: [{ type: "paragraph", content: "New" }],
          updatedAt: "c",
          createdAt: "c",
        },
        "3:1": {
          verseKey: "3:1",
          blocks: [{ type: "paragraph", content: "Add" }],
          updatedAt: "d",
          createdAt: "d",
        },
      },
      surahNotes: {
        1: {
          surahId: 1,
          blocks: [{ type: "paragraph", content: "New surah" }],
          updatedAt: "c",
          createdAt: "c",
        },
      },
      bookmark: { surahId: 3, verseNumber: 1, verseKey: "3:1" },
    };

    const merged = mergeParsedBackupData(current, incoming);

    expect(merged.notes["1:1"].blocks[0].content).toBe("New");
    expect(merged.notes["2:1"].blocks[0].content).toBe("Keep");
    expect(merged.notes["3:1"].blocks[0].content).toBe("Add");
    expect(merged.surahNotes[1].blocks[0].content).toBe("New surah");
    expect(merged.bookmark?.verseKey).toBe("3:1");
  });

  it("throws on invalid data", () => {
    expect(() => parseBackupData({} as unknown as BackupDataV1)).toThrow();
  });

  it("parses v2 backup with knowledgeBase data", () => {
    const kb: KnowledgeBase = {
      _meta: { author: "test", version: 1 },
      roots: { كتب: { note: "to write", discoveredIn: "2:2" } },
      lemmas: { كِتَاب: { note: "book", root: "كتب" } },
      connections: [
        { from: { verse: "2:2", words: [1] }, to: { verse: "2:3", words: null }, reason: "theme" },
      ],
      patterns: [],
    };

    const backup: BackupDataV2 = {
      v: 2,
      bookmarks: [],
      notes: [],
      surahNotes: [],
      knowledgeBase: kb,
      exportedAt: "2024-06-01T00:00:00Z",
    };

    const parsed = parseBackupData(backup);

    expect(parsed.knowledgeBase).toBeDefined();
    expect(parsed.knowledgeBase?.roots["كتب"].note).toBe("to write");
    expect(parsed.knowledgeBase?.lemmas["كِتَاب"].note).toBe("book");
    expect(parsed.knowledgeBase?.connections).toHaveLength(1);
  });

  it("parses v2 backup without knowledgeBase (backward compat)", () => {
    const backup: BackupDataV2 = {
      v: 2,
      bookmarks: [],
      notes: [],
      surahNotes: [],
      exportedAt: "2024-06-01T00:00:00Z",
    };

    const parsed = parseBackupData(backup);
    expect(parsed.knowledgeBase).toBeUndefined();
  });

  it("merges incoming KB over current KB", () => {
    const current = {
      notes: {},
      surahNotes: {},
      knowledgeBase: {
        _meta: { author: "user", version: 1 },
        roots: {
          كتب: { note: "old note" },
          قرأ: { note: "to read" },
        },
        lemmas: {},
        connections: [
          {
            from: { verse: "1:1", words: null },
            to: { verse: "1:2", words: null },
            reason: "existing",
          },
        ],
        patterns: [],
      } as KnowledgeBase,
    };

    const incoming = {
      notes: {},
      surahNotes: {},
      knowledgeBase: {
        _meta: { author: "user", version: 1 },
        roots: { كتب: { note: "updated note" } },
        lemmas: { كِتَاب: { note: "book" } },
        connections: [
          {
            from: { verse: "1:1", words: null },
            to: { verse: "1:2", words: null },
            reason: "updated",
          },
          { from: { verse: "2:1", words: null }, to: { verse: "2:2", words: null }, reason: "new" },
        ],
        patterns: [],
      } as KnowledgeBase,
    };

    const merged = mergeParsedBackupData(current, incoming);

    expect(merged.knowledgeBase?.roots["كتب"].note).toBe("updated note");
    expect(merged.knowledgeBase?.roots["قرأ"].note).toBe("to read");
    expect(merged.knowledgeBase?.lemmas["كِتَاب"].note).toBe("book");
    expect(merged.knowledgeBase?.connections).toHaveLength(2);
  });

  it("keeps current KB when incoming has no KB", () => {
    const currentKb: KnowledgeBase = {
      _meta: { author: "user", version: 1 },
      roots: { كتب: { note: "keep" } },
      lemmas: {},
      connections: [],
      patterns: [],
    };

    const merged = mergeParsedBackupData(
      { notes: {}, surahNotes: {}, knowledgeBase: currentKb },
      { notes: {}, surahNotes: {} }
    );

    expect(merged.knowledgeBase?.roots["كتب"].note).toBe("keep");
  });
});

describe("mergeKnowledgeBases", () => {
  it("returns incoming when current is null", () => {
    const incoming: KnowledgeBase = {
      _meta: { author: "user", version: 1 },
      roots: { كتب: { note: "write" } },
      lemmas: {},
      connections: [],
      patterns: [],
    };

    const result = mergeKnowledgeBases(null, incoming);
    expect(result.roots["كتب"].note).toBe("write");
  });

  it("deduplicates connections by from+to verse", () => {
    const current: KnowledgeBase = {
      _meta: { author: "user", version: 1 },
      roots: {},
      lemmas: {},
      connections: [
        { from: { verse: "1:1", words: null }, to: { verse: "1:2", words: null }, reason: "old" },
      ],
      patterns: [],
    };

    const incoming: KnowledgeBase = {
      _meta: { author: "user", version: 1 },
      roots: {},
      lemmas: {},
      connections: [
        {
          from: { verse: "1:1", words: null },
          to: { verse: "1:2", words: null },
          reason: "updated",
        },
        { from: { verse: "2:1", words: null }, to: { verse: "2:2", words: null }, reason: "new" },
      ],
      patterns: [],
    };

    const result = mergeKnowledgeBases(current, incoming);
    expect(result.connections).toHaveLength(2);
    expect(result.connections.find((c) => c.from.verse === "1:1")?.reason).toBe("updated");
  });

  it("deduplicates patterns by id", () => {
    const current: KnowledgeBase = {
      _meta: { author: "user", version: 1 },
      roots: {},
      lemmas: {},
      connections: [],
      patterns: [{ id: "p1", title: "Old", note: "old note" }],
    };

    const incoming: KnowledgeBase = {
      _meta: { author: "user", version: 1 },
      roots: {},
      lemmas: {},
      connections: [],
      patterns: [
        { id: "p1", title: "Updated", note: "new note" },
        { id: "p2", title: "New", note: "brand new" },
      ],
    };

    const result = mergeKnowledgeBases(current, incoming);
    expect(result.patterns).toHaveLength(2);
    expect(result.patterns.find((p) => p.id === "p1")?.title).toBe("Updated");
  });
});

describe("buildBackupData", () => {
  it("produces valid BackupDataV2 from notes and surahNotes", async () => {
    const notes: Record<string, VerseNote> = {
      "1:1": {
        verseKey: "1:1",
        blocks: [{ type: "paragraph", content: "Test note" } as PartialBlock],
        updatedAt: "2024-01-01T00:00:00Z",
        createdAt: "2024-01-01T00:00:00Z",
      },
    };

    const surahNotes: Record<number, SurahNote> = {
      1: {
        surahId: 1,
        blocks: [{ type: "paragraph", content: "Surah note" } as PartialBlock],
        updatedAt: "2024-01-02T00:00:00Z",
        createdAt: "2024-01-02T00:00:00Z",
      },
    };

    const result = await buildBackupData(notes, surahNotes);

    expect(result.v).toBe(2);
    expect(result.notes).toHaveLength(1);
    expect(result.notes[0].key).toBe("1:1");
    expect(result.surahNotes).toHaveLength(1);
    expect(result.surahNotes[0].surahId).toBe(1);
    expect(result.legacyNotes).toHaveLength(1);
    expect(result.legacyNotes![0][0]).toBe("1:1");
    expect(result.exportedAt).toBeDefined();
    expect(result.meta?.editor).toBe("blocknote");
  });

  it("handles empty notes gracefully", async () => {
    const result = await buildBackupData({}, {});

    expect(result.v).toBe(2);
    expect(result.notes).toHaveLength(0);
    expect(result.surahNotes).toHaveLength(0);
    expect(result.legacyNotes).toHaveLength(0);
    expect(result.exportedAt).toBeDefined();
  });
});
