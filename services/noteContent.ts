import { PartialBlock } from "@blocknote/core";
import { normalizeQuranLinkBlocks } from "../components/QuranLinkInline";

// Convert plain text (with optional Quran references like [2:255]) to BlockNote blocks
export function textToBlocks(text: string): PartialBlock[] {
  if (!text || text.trim() === "") {
    return [];
  }

  const lines = text.split("\n");
  const blocks = lines.map((line) => ({
    type: "paragraph" as const,
    content: line || "",
  }));

  return normalizeQuranLinkBlocks(blocks);
}

// Extract plain text (including Quran link references) from BlockNote blocks
export function blocksToText(blocks: PartialBlock[]): string {
  if (!blocks || blocks.length === 0) {
    return "";
  }

  const inlineToText = (inline: unknown): string => {
    if (typeof inline === "string") return inline;
    if (inline && typeof inline === "object") {
      if ("text" in inline && typeof (inline as { text: unknown }).text === "string") {
        return (inline as { text: string }).text;
      }
      if (
        (inline as { type?: string }).type === "quranLink" &&
        (inline as { props?: { reference?: unknown } }).props?.reference
      ) {
        return `[${(inline as { props: { reference: string } }).props.reference}]`;
      }
    }
    return "";
  };

  return blocks
    .map((block) => {
      if (!block.content) return "";
      const contentArray = Array.isArray(block.content) ? block.content : [block.content];
      return contentArray.map(inlineToText).join("");
    })
    .join("\n");
}
