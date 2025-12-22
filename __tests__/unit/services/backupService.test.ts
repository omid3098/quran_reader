import { describe, it, expect } from "vitest";
import { mergeParsedBackupData, parseBackupData } from "@/services/backupService";
import type { PartialBlock } from "@blocknote/core";
import type { BackupDataV1, BackupDataV2 } from "@/types";

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
});
