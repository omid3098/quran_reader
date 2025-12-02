import { describe, it, expect } from "vitest";
import { PartialBlock } from "@blocknote/core";
import { normalizeQuranLinkBlocks } from "@/components/QuranLinkInline";
import { blocksToText, textToBlocks } from "@/components/RichNoteEditor";

describe("normalizeQuranLinkBlocks", () => {
  it("converts bracketed numeric references into quranLink inline nodes", () => {
    const blocks = [{ type: "paragraph" as const, content: "See [2:3] for details" }];

    const normalized = normalizeQuranLinkBlocks(blocks);
    const inlineContent = normalized[0].content as Array<Record<string, unknown>>;

    expect(inlineContent).toHaveLength(3);
    expect(inlineContent[1]?.type).toBe("quranLink");
    expect(inlineContent[1]?.props).toMatchObject({ reference: "2:3" });
  });

  it("keeps plain text as a text node when no references exist", () => {
    const blocks = [{ type: "paragraph" as const, content: "No references here" }];
    const normalized = normalizeQuranLinkBlocks(blocks);

    expect(normalized[0].content).toEqual("No references here");
  });
});

describe("block/text helpers", () => {
  it("round-trips quran link references through text helpers", () => {
    const blocks = textToBlocks("reference [5:12] appears");
    const inline = (blocks[0].content as Array<Record<string, unknown>>)[1];

    expect(inline.type).toBe("quranLink");
    expect(inline.props).toMatchObject({ reference: "5:12" });
    expect(blocksToText(blocks)).toBe("reference [5:12] appears");
  });

  it("preserves surrounding text when converting links", () => {
    const blocks = textToBlocks("a [2:3] b");
    const normalized = normalizeQuranLinkBlocks(blocks);
    const content = normalized[0].content as Array<Record<string, unknown>>;

    expect(content[0]).toMatchObject({ type: "text", text: "a " });
    expect(content[1]?.type).toBe("quranLink");
    expect(content[2]).toMatchObject({ type: "text", text: " b" });
    expect(blocksToText(normalized)).toBe("a [2:3] b");
  });

  it("does not mutate already-normalized content", () => {
    const blocks: PartialBlock[] = [
      { type: "paragraph", content: [{ type: "text", text: "plain text", styles: {} }] },
    ];

    const normalized = normalizeQuranLinkBlocks(blocks);
    expect(JSON.stringify(normalized)).toBe(JSON.stringify(blocks));
  });
});
