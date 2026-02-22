import type { QuranWord, WordNodeData, PhraseVerseNodeData, PhraseMatchType } from "../../types";

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

interface PositionedNode<T> {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: T;
}

interface LayoutResult {
  nodes: PositionedNode<WordNodeData>[];
}

/**
 * Layout word nodes in a single RTL row.
 * Words flow right-to-left in one continuous line — ReactFlow handles
 * panning/zooming so there's no need to wrap to a second row.
 */
export function layoutWordNodes(
  words: QuranWord[],
  verseKey: string,
  canvasWidth: number,
  scriptType: "uthmani" | "simple" = "uthmani"
): LayoutResult {
  if (words.length === 0) return { nodes: [] };

  const nodes: PositionedNode<WordNodeData>[] = [];

  const getDisplayText = (w: QuranWord) =>
    scriptType === "simple" ? (w.text_simple ?? w.text_uthmani) : w.text_uthmani;

  // Calculate total width to right-align within canvas
  let totalWidth = 0;
  for (const w of words) {
    totalWidth += estimateWordNodeWidth(getDisplayText(w)) + WORD_GAP_X;
  }
  totalWidth -= WORD_GAP_X; // no trailing gap

  // Start from the right: use canvas width or total width, whichever is larger
  const startX = Math.max(canvasWidth, totalWidth + CANVAS_PADDING * 2) - CANVAS_PADDING;
  let cursorX = startX;
  const rowY = CANVAS_PADDING;

  for (let i = 0; i < words.length; i++) {
    const displayText = getDisplayText(words[i]);
    const wordWidth = estimateWordNodeWidth(displayText);
    const x = cursorX - wordWidth;

    nodes.push({
      id: `word-${verseKey}-${i}`,
      type: "word",
      position: { x, y: rowY },
      data: {
        type: "word",
        word: displayText,
        wordIndex: i,
        verseKey,
        root: words[i].root,
        lemma: words[i].lemma,
        hasFamiliarRoot: words[i].hasFamiliarRoot,
        hasFamiliarLemma: words[i].hasFamiliarLemma,
      },
    });

    cursorX -= wordWidth + WORD_GAP_X;
  }

  return { nodes };
}

// --- Phrase Verse Nodes ---

const PHRASE_VERSE_BASE_OFFSET_Y = 100;
const PHRASE_VERSE_ROW_GAP_Y = 60;
const PHRASE_VERSE_NODE_WIDTH = 80;
const PHRASE_VERSE_GAP_X = 16;

interface PhraseVerseLayoutResult {
  nodes: PositionedNode<PhraseVerseNodeData>[];
  edges: {
    id: string;
    source: string;
    target: string;
    style?: Record<string, string>;
    animated?: boolean;
  }[];
}

const PHRASE_EDGE_STYLES: Record<PhraseMatchType, { stroke: string; strokeDasharray: string }> = {
  lemma: { stroke: "#f59e0b", strokeDasharray: "5 3" },
  root: { stroke: "#14b8a6", strokeDasharray: "5 3" },
  surface: { stroke: "#8b5cf6", strokeDasharray: "5 3" },
};

/**
 * Layout phrase verse nodes above the word row, centered over the matched words.
 * Each node represents a verse where the same pattern appears.
 * Edges connect each phrase verse node to the matched word nodes in the current verse.
 *
 * @param rowIndex — vertical row index (0, 1, 2…) so multiple toggled patterns don't overlap
 */
export function layoutPhraseVerseNodes(
  occurrences: { verse: string; words: number[] }[],
  matchType: PhraseMatchType,
  wordIndices: number[],
  verseKey: string,
  currentWordNodes: { id: string; position: { x: number; y: number }; width: number }[],
  patternKeys: string[],
  rowIndex: number
): PhraseVerseLayoutResult {
  if (occurrences.length === 0 || wordIndices.length === 0) return { nodes: [], edges: [] };

  // Find the matched word nodes to center above
  const matchedNodes = wordIndices
    .map((idx) => currentWordNodes.find((n) => n.id === `word-${verseKey}-${idx}`))
    .filter(Boolean) as { id: string; position: { x: number; y: number }; width: number }[];

  if (matchedNodes.length === 0) return { nodes: [], edges: [] };

  // Center x: use visual bounding box (position.x is left edge, + width gives right edge)
  const leftEdge = Math.min(...matchedNodes.map((n) => n.position.x));
  const rightEdge = Math.max(...matchedNodes.map((n) => n.position.x + n.width));
  const centerX = (leftEdge + rightEdge) / 2;

  // Position above the word row — each rowIndex adds more vertical offset
  const wordRowY = matchedNodes[0].position.y;
  const rowY = wordRowY - PHRASE_VERSE_BASE_OFFSET_Y - rowIndex * PHRASE_VERSE_ROW_GAP_Y;

  // Lay out occurrence nodes centered above matched words
  const totalWidth =
    occurrences.length * PHRASE_VERSE_NODE_WIDTH + (occurrences.length - 1) * PHRASE_VERSE_GAP_X;
  let cursorX = centerX - totalWidth / 2;

  const nodes: PositionedNode<PhraseVerseNodeData>[] = [];
  const edges: PhraseVerseLayoutResult["edges"] = [];
  const edgeStyle = PHRASE_EDGE_STYLES[matchType];

  for (const occ of occurrences) {
    const nodeId = `pv-${matchType}-${occ.verse}`;
    nodes.push({
      id: nodeId,
      type: "phraseVerse",
      position: { x: cursorX, y: rowY },
      data: {
        type: "phraseVerse",
        verseKey: occ.verse,
        matchType,
        patternKeys,
      },
    });

    // Edges from this phrase verse node to each matched word in the current verse
    for (const wordIdx of wordIndices) {
      const targetId = `word-${verseKey}-${wordIdx}`;
      edges.push({
        id: `edge-${nodeId}-${targetId}`,
        source: nodeId,
        target: targetId,
        style: edgeStyle,
        animated: true,
      });
    }

    cursorX += PHRASE_VERSE_NODE_WIDTH + PHRASE_VERSE_GAP_X;
  }

  return { nodes, edges };
}
