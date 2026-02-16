import type { QuranWord, WordNodeData, RootNodeData } from "../../types";

// Layout constants
export const WORD_NODE_MIN_WIDTH = 100;
export const WORD_NODE_HEIGHT = 80;
export const WORD_GAP_X = 0;
export const WORD_GAP_Y = 24;
export const CANVAS_PADDING = 60;

// Approximate width per Arabic character at text-3xl (~30px font)
const ARABIC_CHAR_WIDTH = 18;
// Horizontal padding inside the node
const NODE_PADDING_X = 2;

/**
 * Estimate the rendered width of an Arabic word node.
 * Strips diacritics (harakat) for character count since they don't add width.
 */
export function estimateWordNodeWidth(word: string): number {
  // Remove Arabic diacritics (tashkeel) — they don't occupy horizontal space
  const stripped = word.replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]/g, "");
  return Math.max(WORD_NODE_MIN_WIDTH, stripped.length * ARABIC_CHAR_WIDTH + NODE_PADDING_X);
}

const ROOT_NODE_OFFSET_Y = 120;

interface PositionedNode<T> {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: T;
}

interface LayoutResult {
  nodes: PositionedNode<WordNodeData>[];
}

interface RootLayoutResult {
  node: PositionedNode<RootNodeData>;
  edge: { id: string; source: string; target: string };
}

/**
 * Layout word nodes in RTL rows.
 * Words flow right-to-left, wrapping to the next row.
 * Each word's width is estimated from its character count.
 */
export function layoutWordNodes(
  words: QuranWord[],
  verseKey: string,
  canvasWidth: number
): LayoutResult {
  if (words.length === 0) return { nodes: [] };

  const nodes: PositionedNode<WordNodeData>[] = [];

  // RTL flow: start from right edge, wrap to next row when full
  let cursorX = canvasWidth - CANVAS_PADDING;
  let rowY = CANVAS_PADDING;

  for (let i = 0; i < words.length; i++) {
    const wordWidth = estimateWordNodeWidth(words[i].text_uthmani);

    // Check if this word fits in the current row
    if (cursorX - wordWidth < CANVAS_PADDING && cursorX < canvasWidth - CANVAS_PADDING) {
      // Wrap to next row
      cursorX = canvasWidth - CANVAS_PADDING;
      rowY += WORD_NODE_HEIGHT + WORD_GAP_Y;
    }

    // Position: right edge of word at cursorX
    const x = cursorX - wordWidth;

    nodes.push({
      id: `word-${verseKey}-${i}`,
      type: "word",
      position: { x, y: rowY },
      data: {
        type: "word",
        word: words[i].text_uthmani,
        wordIndex: i,
        verseKey,
        root: words[i].root,
        lemma: words[i].lemma,
      },
    });

    // Advance cursor left
    cursorX -= wordWidth + WORD_GAP_X;
  }

  return { nodes };
}

/**
 * Calculate position for a root node spawned from a word node.
 */
export function layoutRootNode(
  wordNodePosition: { x: number; y: number },
  wordNodeId: string,
  rootData: { root: string }
): RootLayoutResult {
  const nodeId = `root-${rootData.root}-${wordNodeId}`;

  return {
    node: {
      id: nodeId,
      type: "root",
      position: {
        x: wordNodePosition.x,
        y: wordNodePosition.y + ROOT_NODE_OFFSET_Y,
      },
      data: {
        type: "root",
        root: rootData.root,
        sourceWordId: wordNodeId,
      },
    },
    edge: {
      id: `edge-${wordNodeId}-${nodeId}`,
      source: wordNodeId,
      target: nodeId,
    },
  };
}
