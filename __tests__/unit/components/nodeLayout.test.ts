import { describe, it, expect } from "vitest";
import {
  layoutWordNodes,
  layoutRootNode,
  estimateWordNodeWidth,
  WORD_NODE_MIN_WIDTH,
  WORD_NODE_HEIGHT,
  WORD_GAP_X,
  WORD_GAP_Y,
  CANVAS_PADDING,
} from "../../../components/NodeReader/nodeLayout";
import type { QuranWord } from "../../../types";

function makeWords(count: number): QuranWord[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    position: i + 1,
    text_uthmani: `w${i}`,
    root: i % 2 === 0 ? "root" : undefined,
    lemma: `lemma${i}`,
  }));
}

describe("nodeLayout", () => {
  describe("estimateWordNodeWidth", () => {
    it("returns minimum width for short words", () => {
      expect(estimateWordNodeWidth("رَبِّ")).toBe(WORD_NODE_MIN_WIDTH);
    });

    it("strips diacritics for width calculation", () => {
      // "ٱلْمُسْتَقِيمَ" has many diacritics but only 9 base chars
      const withDiacritics = "ٱلْمُسْتَقِيمَ";
      const width = estimateWordNodeWidth(withDiacritics);
      expect(width).toBeGreaterThan(WORD_NODE_MIN_WIDTH);
    });

    it("returns wider for longer words", () => {
      const short = estimateWordNodeWidth("رب");
      const long = estimateWordNodeWidth("ٱلْمُسْتَقِيمَ");
      expect(long).toBeGreaterThan(short);
    });
  });

  describe("layoutWordNodes", () => {
    it("positions words RTL within canvas width", () => {
      const words = makeWords(4);
      const result = layoutWordNodes(words, "1:1", 800);

      expect(result.nodes).toHaveLength(4);

      // First word (index 0) should be rightmost
      const xs = result.nodes.map((n) => n.position.x);
      expect(xs[0]).toBeGreaterThan(xs[1]);
      expect(xs[1]).toBeGreaterThan(xs[2]);
      expect(xs[2]).toBeGreaterThan(xs[3]);
    });

    it("wraps to next row when exceeding canvas width", () => {
      // Make canvas narrow enough that only 2 short words fit per row
      const wordWidth = estimateWordNodeWidth("w0");
      const narrowWidth = CANVAS_PADDING * 2 + (wordWidth + WORD_GAP_X) * 2 + 10;
      const words = makeWords(4);
      const result = layoutWordNodes(words, "1:1", narrowWidth);

      // First 2 words on row 0, next 2 on row 1
      const ys = result.nodes.map((n) => n.position.y);
      expect(ys[0]).toBe(ys[1]); // same row
      expect(ys[2]).toBe(ys[3]); // same row
      expect(ys[2]).toBeGreaterThan(ys[0]); // second row below first
    });

    it("handles single-word verses", () => {
      const words = makeWords(1);
      const result = layoutWordNodes(words, "112:1", 800);

      expect(result.nodes).toHaveLength(1);
      expect(result.nodes[0].type).toBe("word");
      expect(result.nodes[0].data.verseKey).toBe("112:1");
    });

    it("handles empty word array", () => {
      const result = layoutWordNodes([], "1:1", 800);
      expect(result.nodes).toHaveLength(0);
    });

    it("assigns correct node data", () => {
      const words: QuranWord[] = [
        { id: 0, position: 1, text_uthmani: "بِسْمِ", root: "سمو", lemma: "اسْم" },
      ];
      const result = layoutWordNodes(words, "1:1", 800);
      const node = result.nodes[0];

      expect(node.id).toBe("word-1:1-0");
      expect(node.type).toBe("word");
      expect(node.data.type).toBe("word");
      expect(node.data.word).toBe("بِسْمِ");
      expect(node.data.root).toBe("سمو");
      expect(node.data.lemma).toBe("اسْم");
      expect(node.data.wordIndex).toBe(0);
      expect(node.data.verseKey).toBe("1:1");
    });

    it("positions all nodes within canvas bounds", () => {
      const words = makeWords(10);
      const canvasWidth = 800;
      const result = layoutWordNodes(words, "2:255", canvasWidth);

      for (const node of result.nodes) {
        expect(node.position.x).toBeGreaterThanOrEqual(0);
        expect(node.position.x).toBeLessThan(canvasWidth);
        expect(node.position.y).toBeGreaterThanOrEqual(0);
      }
    });

    it("does not overlap nodes for long Arabic words", () => {
      const words: QuranWord[] = [
        { id: 0, position: 1, text_uthmani: "ٱهْدِنَا", root: "هدي" },
        { id: 1, position: 2, text_uthmani: "ٱلصِّرَٰطَ", root: "صرط" },
        { id: 2, position: 3, text_uthmani: "ٱلْمُسْتَقِيمَ", root: "قوم" },
      ];
      const result = layoutWordNodes(words, "1:6", 1200);

      // Verify no overlapping: each node's right edge should not cross the next node's left edge
      for (let i = 0; i < result.nodes.length - 1; i++) {
        const currentRight =
          result.nodes[i].position.x + estimateWordNodeWidth(words[i].text_uthmani);
        const nextLeft = result.nodes[i + 1].position.x;
        // If on same row, right edge of current (left-side node) should not exceed next node's x
        if (result.nodes[i].position.y === result.nodes[i + 1].position.y) {
          expect(nextLeft + estimateWordNodeWidth(words[i + 1].text_uthmani)).toBeLessThanOrEqual(
            result.nodes[i].position.x + WORD_GAP_X
          );
        }
      }
    });
  });

  describe("layoutRootNode", () => {
    it("positions root node below the word node", () => {
      const wordPos = { x: 400, y: 100 };
      const result = layoutRootNode(wordPos, "word-1:1-0", { root: "رحم" });

      expect(result.node.position.y).toBeGreaterThan(wordPos.y);
      expect(result.node.type).toBe("root");
      expect(result.node.data.root).toBe("رحم");
      expect(result.node.data.sourceWordId).toBe("word-1:1-0");
    });

    it("creates an edge from word to root", () => {
      const result = layoutRootNode({ x: 400, y: 100 }, "word-1:1-0", { root: "رحم" });

      expect(result.edge.source).toBe("word-1:1-0");
      expect(result.edge.target).toBe(result.node.id);
    });
  });
});
