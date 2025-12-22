import { PartialBlock } from "@blocknote/core";
import { normalizeQuranLinkBlocks } from "../components/QuranLinkInline";

// Matches Markdown links: [text](url)
const MARKDOWN_LINK_PATTERN = /\[([^\]]*)\]\(([^)]+)\)/g;
const MARKDOWN_LINK_TEST = /\[([^\]]*)\]\(([^)]+)\)/;

// Check if a string looks like a URL (for distinguishing Markdown links from Quran references)
function isValidUrl(str: string): boolean {
  // Match common URL patterns
  return /^(https?:\/\/|www\.|mailto:|tel:|ftp:\/\/)/i.test(str.trim());
}

type InlineContentNode = {
  type: string;
  text?: string;
  styles?: Record<string, unknown>;
  href?: string;
  content?: InlineContentNode[];
  props?: Record<string, unknown>;
};

// Parse Markdown links [text](url) in text and convert to link inline nodes
function normalizeMarkdownLinks(blocks: PartialBlock[]): PartialBlock[] {
  return blocks.map((block) => {
    const normalizedBlock: PartialBlock = { ...block };

    if (block.content !== undefined) {
      const contentArray = Array.isArray(block.content) ? block.content : [block.content];
      const normalizedContent: InlineContentNode[] = [];
      let needsProcessing = false;

      contentArray.forEach((item) => {
        if (typeof item === "string") {
          // Check if the string contains any Markdown links
          if (!MARKDOWN_LINK_TEST.test(item)) {
            // No links, keep as-is
            normalizedContent.push(item as unknown as InlineContentNode);
            return;
          }
          const segments = splitTextWithMarkdownLinks(item);
          // Check if any links were actually created (some might be skipped if not valid URLs)
          const hasLinks = segments.some((s) => s.type === "link");
          if (!hasLinks) {
            // No actual links created, keep original
            normalizedContent.push(item as unknown as InlineContentNode);
            return;
          }
          needsProcessing = true;
          normalizedContent.push(...segments);
          return;
        }

        if (
          typeof item === "object" &&
          item !== null &&
          "text" in item &&
          typeof item.text === "string"
        ) {
          const textItem = item as { text: string; styles?: Record<string, unknown> };
          // Check if the text contains any Markdown links
          if (!MARKDOWN_LINK_TEST.test(textItem.text)) {
            // No links, keep as-is
            normalizedContent.push(item as InlineContentNode);
            return;
          }
          const segments = splitTextWithMarkdownLinks(textItem.text, textItem.styles);
          // Check if any links were actually created
          const hasLinks = segments.some((s) => s.type === "link");
          if (!hasLinks) {
            // No actual links created, keep original
            normalizedContent.push(item as InlineContentNode);
            return;
          }
          needsProcessing = true;
          normalizedContent.push(...segments);
          return;
        }

        normalizedContent.push(item as InlineContentNode);
      });

      if (needsProcessing) {
        normalizedBlock.content = normalizedContent as PartialBlock["content"];
      }
    }

    if (block.children) {
      normalizedBlock.children = normalizeMarkdownLinks(block.children);
    }

    return normalizedBlock;
  });
}

// Split text containing Markdown links into text and link nodes
function splitTextWithMarkdownLinks(
  text: string,
  styles?: Record<string, unknown>
): InlineContentNode[] {
  if (!text || !MARKDOWN_LINK_TEST.test(text)) {
    return [{ type: "text", text, styles: styles || {} }];
  }

  const parts: InlineContentNode[] = [];
  let lastIndex = 0;

  const pushText = (segment: string) => {
    if (!segment) return;
    parts.push({ type: "text", text: segment, styles: styles || {} });
  };

  text.replace(MARKDOWN_LINK_PATTERN, (match, linkText, href, offset) => {
    // Only treat as Markdown link if the href looks like a URL
    // This prevents [2:255](some note) from being treated as a link
    if (!isValidUrl(href)) {
      // Don't convert, keep as plain text
      if (offset > lastIndex) {
        pushText(text.slice(lastIndex, offset + match.length));
      } else {
        pushText(match);
      }
      lastIndex = offset + match.length;
      return match;
    }

    if (offset > lastIndex) {
      pushText(text.slice(lastIndex, offset));
    }

    // Create link inline content
    parts.push({
      type: "link",
      href: href,
      content: [{ type: "text", text: linkText, styles: styles || {} }],
    });

    lastIndex = offset + match.length;
    return match;
  });

  if (lastIndex < text.length) {
    pushText(text.slice(lastIndex));
  }

  return parts;
}

// Convert plain text (with optional Quran references like [2:255] and Markdown links) to BlockNote blocks
export function textToBlocks(text: string): PartialBlock[] {
  if (!text || text.trim() === "") {
    return [];
  }

  const lines = text.split("\n");
  const blocks = lines.map((line) => ({
    type: "paragraph" as const,
    content: line || "",
  }));

  // First parse Markdown links [text](url), then Quran links [2:255]
  // Order matters: Markdown links must be parsed first to avoid [text](url) being
  // partially matched as a Quran link
  const withMarkdownLinks = normalizeMarkdownLinks(blocks);
  return normalizeQuranLinkBlocks(withMarkdownLinks);
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
      // Handle link inline content - serialize as Markdown [text](url)
      if ((inline as { type?: string }).type === "link") {
        const link = inline as { href?: string; content?: unknown[] };
        const href = link.href || "";
        // Extract text from content (array of StyledText)
        const text = (link.content || [])
          .map((c: unknown) => {
            if (typeof c === "string") return c;
            if (c && typeof c === "object" && "text" in c) {
              return (c as { text: string }).text;
            }
            return "";
          })
          .join("");
        return `[${text}](${href})`;
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
