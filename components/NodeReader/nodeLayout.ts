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
const ROOT_NODE_ESTIMATED_WIDTH = 100;
const SURAH_NODE_OFFSET_Y = 100;
const SURAH_NODE_GAP_X = 0;
const VERSE_KEY_NODE_OFFSET_Y = 80;
const VERSE_KEY_NODE_GAP_X = 10;
const PAGE_SIZE = 20;

// Approximate character widths for node text rendering
const SURAH_TEXT_CHAR_WIDTH = 7.5; // text-sm average
const SURAH_NODE_PADDING = 28; // px-3 (24) + border (4)
const VK_TEXT_CHAR_WIDTH = 7.2; // text-xs font-mono
const VK_NODE_PADDING = 24; // px-2.5 (20) + border (4)

/**
 * Estimate rendered width of a surah node from its label text.
 */
export function estimateSurahNodeWidth(name: string, verseCount: number): number {
  const text = `${name} (${verseCount})`;
  return Math.max(80, text.length * SURAH_TEXT_CHAR_WIDTH + SURAH_NODE_PADDING);
}

/**
 * Estimate rendered width of a verse key node.
 */
export function estimateVerseKeyNodeWidth(verseKey: string): number {
  return Math.max(50, verseKey.length * VK_TEXT_CHAR_WIDTH + VK_NODE_PADDING);
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
 * Layout surah nodes horizontally below a root node, centered.
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

  // Compute variable widths per surah node
  const widths = pageSurahs.map((s) => estimateSurahNodeWidth(s.name, s.verseCount));
  const totalWidth =
    widths.reduce((sum, w) => sum + w, 0) + (pageSurahs.length - 1) * SURAH_NODE_GAP_X;

  // Center the row below the root node
  const rootCenterX = rootNodePosition.x + ROOT_NODE_ESTIMATED_WIDTH / 2;
  const startX = rootCenterX - totalWidth / 2;

  const y = rootNodePosition.y + SURAH_NODE_OFFSET_Y;
  const nodes: PositionedNode<SurahNodeData>[] = [];
  const edges: { id: string; source: string; target: string }[] = [];

  let cursorX = startX;
  for (let i = 0; i < pageSurahs.length; i++) {
    const surah = pageSurahs[i];
    const nodeId = `surah-${surah.surahId}-${rootNodeId}`;

    nodes.push({
      id: nodeId,
      type: "surah",
      position: { x: cursorX, y },
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

    cursorX += widths[i] + SURAH_NODE_GAP_X;
  }

  return { nodes, edges };
}

/**
 * Layout verse key nodes below a surah node, centered.
 */
export function layoutVerseKeyNodes(
  surahNodePosition: { x: number; y: number },
  surahNodeId: string,
  verseKeys: string[],
  parentWidth?: number
): GroupLayoutResult<VerseKeyNodeData> {
  // Compute variable widths per verse key node
  const widths = verseKeys.map((vk) => estimateVerseKeyNodeWidth(vk));
  const totalWidth =
    widths.reduce((sum, w) => sum + w, 0) + (verseKeys.length - 1) * VERSE_KEY_NODE_GAP_X;

  // Center below surah node
  const surahWidth = parentWidth ?? 100;
  const surahCenterX = surahNodePosition.x + surahWidth / 2;
  const startX = surahCenterX - totalWidth / 2;

  const y = surahNodePosition.y + VERSE_KEY_NODE_OFFSET_Y;
  const nodes: PositionedNode<VerseKeyNodeData>[] = [];
  const edges: { id: string; source: string; target: string }[] = [];

  let cursorX = startX;
  for (let i = 0; i < verseKeys.length; i++) {
    const nodeId = `vk-${verseKeys[i]}-${surahNodeId}`;

    nodes.push({
      id: nodeId,
      type: "verseKey",
      position: { x: cursorX, y },
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

    cursorX += widths[i] + VERSE_KEY_NODE_GAP_X;
  }

  return { nodes, edges };
}
