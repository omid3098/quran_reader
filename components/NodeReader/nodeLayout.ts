import type {
  QuranWord,
  WordNodeData,
  RootNodeData,
  SurahNodeData,
  VerseKeyNodeData,
} from "../../types";

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
const SURAH_NODE_OFFSET_Y = 100;
const SURAH_NODE_WIDTH = 100;
const SURAH_NODE_GAP_X = 12;
const VERSE_KEY_NODE_OFFSET_Y = 80;
const VERSE_KEY_NODE_WIDTH = 70;
const VERSE_KEY_NODE_GAP_X = 8;
const PAGE_SIZE = 20;

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

interface GroupLayoutResult<T> {
  nodes: PositionedNode<T>[];
  edges: { id: string; source: string; target: string }[];
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

/**
 * Layout surah nodes horizontally below a root node.
 * Paginated: max PAGE_SIZE surahs per page.
 */
export function layoutSurahNodes(
  rootNodePosition: { x: number; y: number },
  rootNodeId: string,
  surahs: { surahId: number; name: string; verseCount: number }[],
  page: number
): GroupLayoutResult<SurahNodeData> {
  const start = page * PAGE_SIZE;
  const pageSurahs = surahs.slice(start, start + PAGE_SIZE);

  const y = rootNodePosition.y + SURAH_NODE_OFFSET_Y;
  const nodes: PositionedNode<SurahNodeData>[] = [];
  const edges: { id: string; source: string; target: string }[] = [];

  for (let i = 0; i < pageSurahs.length; i++) {
    const surah = pageSurahs[i];
    const nodeId = `surah-${surah.surahId}-${rootNodeId}`;
    const x = rootNodePosition.x + i * (SURAH_NODE_WIDTH + SURAH_NODE_GAP_X);

    nodes.push({
      id: nodeId,
      type: "surah",
      position: { x, y },
      data: {
        type: "surah",
        surahId: surah.surahId,
        surahName: surah.name,
        rootNodeId,
        verseCount: surah.verseCount,
      },
    });

    edges.push({
      id: `edge-${rootNodeId}-${nodeId}`,
      source: rootNodeId,
      target: nodeId,
    });
  }

  return { nodes, edges };
}

/**
 * Layout verse key nodes below a surah node.
 */
export function layoutVerseKeyNodes(
  surahNodePosition: { x: number; y: number },
  surahNodeId: string,
  verseKeys: string[]
): GroupLayoutResult<VerseKeyNodeData> {
  const y = surahNodePosition.y + VERSE_KEY_NODE_OFFSET_Y;
  const nodes: PositionedNode<VerseKeyNodeData>[] = [];
  const edges: { id: string; source: string; target: string }[] = [];

  for (let i = 0; i < verseKeys.length; i++) {
    const nodeId = `vk-${verseKeys[i]}-${surahNodeId}`;
    const x = surahNodePosition.x + i * (VERSE_KEY_NODE_WIDTH + VERSE_KEY_NODE_GAP_X);

    nodes.push({
      id: nodeId,
      type: "verseKey",
      position: { x, y },
      data: {
        type: "verseKey",
        verseKey: verseKeys[i],
        surahNodeId,
      },
    });

    edges.push({
      id: `edge-${surahNodeId}-${nodeId}`,
      source: surahNodeId,
      target: nodeId,
    });
  }

  return { nodes, edges };
}
