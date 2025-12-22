import { describe, it, expect } from "vitest";
import { blocksToText, textToBlocks } from "../../../services/noteContent";

describe("noteContent", () => {
  describe("blocksToText", () => {
    it("should convert plain text blocks to text", () => {
      const blocks: any[] = [
        { type: "paragraph", content: "Hello world" },
        { type: "paragraph", content: "Second line" },
      ];
      expect(blocksToText(blocks)).toBe("Hello world\nSecond line");
    });

    it("should handle empty blocks", () => {
      expect(blocksToText([])).toBe("");
      expect(blocksToText(undefined as any)).toBe("");
    });

    it("should convert Quran link nodes to bracketed format", () => {
      const blocks: any[] = [
        {
          type: "paragraph",
          content: [
            { type: "text", text: "See verse " },
            { type: "quranLink", props: { reference: "2:255" } },
            { type: "text", text: " for details" },
          ],
        },
      ];
      expect(blocksToText(blocks)).toBe("See verse [2:255] for details");
    });

    it("should convert hyperlinks to Markdown format", () => {
      const blocks: any[] = [
        {
          type: "paragraph",
          content: [
            { type: "text", text: "Check " },
            {
              type: "link",
              href: "https://example.com",
              content: [{ type: "text", text: "this link", styles: {} }],
            },
            { type: "text", text: " for more" },
          ],
        },
      ];
      expect(blocksToText(blocks)).toBe("Check [this link](https://example.com) for more");
    });

    it("should handle links with empty text", () => {
      const blocks: any[] = [
        {
          type: "paragraph",
          content: [
            {
              type: "link",
              href: "https://example.com",
              content: [],
            },
          ],
        },
      ];
      expect(blocksToText(blocks)).toBe("[](https://example.com)");
    });

    it("should handle links with empty href", () => {
      const blocks: any[] = [
        {
          type: "paragraph",
          content: [
            {
              type: "link",
              href: "",
              content: [{ type: "text", text: "broken link", styles: {} }],
            },
          ],
        },
      ];
      expect(blocksToText(blocks)).toBe("[broken link]()");
    });

    it("should handle mixed content with links and Quran references", () => {
      const blocks: any[] = [
        {
          type: "paragraph",
          content: [
            { type: "text", text: "See " },
            { type: "quranLink", props: { reference: "2:255" } },
            { type: "text", text: " and " },
            {
              type: "link",
              href: "https://quran.com",
              content: [{ type: "text", text: "Quran.com", styles: {} }],
            },
          ],
        },
      ];
      expect(blocksToText(blocks)).toBe("See [2:255] and [Quran.com](https://quran.com)");
    });
  });

  describe("textToBlocks", () => {
    it("should convert plain text to blocks", () => {
      const blocks = textToBlocks("Hello world");
      expect(blocks).toHaveLength(1);
      expect(blocks[0].type).toBe("paragraph");
    });

    it("should handle empty text", () => {
      expect(textToBlocks("")).toEqual([]);
      expect(textToBlocks("   ")).toEqual([]);
    });

    it("should handle multiple lines", () => {
      const blocks = textToBlocks("Line 1\nLine 2\nLine 3");
      expect(blocks).toHaveLength(3);
    });

    it("should parse Quran references into quranLink nodes", () => {
      const blocks = textToBlocks("See [2:255] for details");
      expect(blocks).toHaveLength(1);
      const content = blocks[0].content as unknown[];
      expect(content).toHaveLength(3);
      expect((content[1] as { type: string }).type).toBe("quranLink");
      expect((content[1] as { props: { reference: string } }).props.reference).toBe("2:255");
    });

    it("should parse Markdown links into link nodes", () => {
      const blocks = textToBlocks("Check [this link](https://example.com) for more");
      expect(blocks).toHaveLength(1);
      const content = blocks[0].content as unknown[];
      // Should have: "Check ", link, " for more"
      const linkNode = content.find((c) => (c as { type?: string }).type === "link") as {
        type: string;
        href: string;
        content: { text: string }[];
      };
      expect(linkNode).toBeDefined();
      expect(linkNode.type).toBe("link");
      expect(linkNode.href).toBe("https://example.com");
      expect(linkNode.content[0].text).toBe("this link");
    });

    it("should handle multiple links in same line", () => {
      const blocks = textToBlocks("[Link1](https://one.com) and [Link2](https://two.com)");
      expect(blocks).toHaveLength(1);
      const content = blocks[0].content as unknown[];
      const links = content.filter((c) => (c as { type?: string }).type === "link");
      expect(links).toHaveLength(2);
    });

    it("should not treat Quran references with parentheses as Markdown links", () => {
      // [2:255](some note) should NOT become a Markdown link
      const blocks = textToBlocks("[2:255](some note)");
      expect(blocks).toHaveLength(1);
      const content = blocks[0].content as unknown[];
      // The [2:255] part should become a quranLink, (some note) should be text
      const linkNodes = content.filter((c) => (c as { type?: string }).type === "link");
      expect(linkNodes).toHaveLength(0);
    });

    it("should handle mixed Quran references and Markdown links", () => {
      const blocks = textToBlocks("See [2:255] and [Quran.com](https://quran.com)");
      expect(blocks).toHaveLength(1);
      const content = blocks[0].content as unknown[];
      const quranLinks = content.filter((c) => (c as { type?: string }).type === "quranLink");
      const mdLinks = content.filter((c) => (c as { type?: string }).type === "link");
      expect(quranLinks).toHaveLength(1);
      expect(mdLinks).toHaveLength(1);
    });
  });

  describe("round-trip conversion", () => {
    it("should preserve hyperlinks through export and import", () => {
      const original: any[] = [
        {
          type: "paragraph",
          content: [
            { type: "text", text: "Check " },
            {
              type: "link",
              href: "https://example.com/path?query=1",
              content: [{ type: "text", text: "this link", styles: {} }],
            },
            { type: "text", text: " here" },
          ],
        },
      ];

      const text = blocksToText(original);
      expect(text).toBe("Check [this link](https://example.com/path?query=1) here");

      const restored = textToBlocks(text);
      const content = restored[0].content as unknown[];
      const linkNode = content.find((c) => (c as { type?: string }).type === "link") as {
        type: string;
        href: string;
        content: { text: string }[];
      };
      expect(linkNode).toBeDefined();
      expect(linkNode.href).toBe("https://example.com/path?query=1");
      expect(linkNode.content[0].text).toBe("this link");
    });

    it("should preserve Quran links through export and import", () => {
      const original: any[] = [
        {
          type: "paragraph",
          content: [
            { type: "text", text: "Reference: " },
            { type: "quranLink", props: { reference: "Al-Baqarah:255" } },
          ],
        },
      ];

      const text = blocksToText(original);
      expect(text).toBe("Reference: [Al-Baqarah:255]");

      const restored = textToBlocks(text);
      const content = restored[0].content as unknown[];
      const quranLink = content.find((c) => (c as { type?: string }).type === "quranLink") as {
        type: string;
        props: { reference: string };
      };
      expect(quranLink).toBeDefined();
      expect(quranLink.props.reference).toBe("Al-Baqarah:255");
    });
  });
});
