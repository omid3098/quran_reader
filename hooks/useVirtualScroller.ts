import { useVirtualizer, Virtualizer } from "@tanstack/react-virtual";
import { useMemo } from "react";
import { Verse, VerseNote } from "../types";
import { AyahCardConfig } from "../components/AyahCard";

interface UseVirtualScrollerOptions {
  verses: Verse[];
  scrollElement: HTMLElement | null;
  config: AyahCardConfig;
  notes: Record<string, VerseNote>;
  overscan?: number;
}

/**
 * Estimates the height of a verse card based on content and configuration.
 *
 * Height calculation breakdown:
 * - Base padding + actions bar: ~104px
 * - Arabic text: Scales with fontSize (~8 words per line)
 * - Translations: Each translation adds height based on text length
 * - Notes: If present, adds ~120px
 *
 * @param verse - The verse to estimate height for
 * @param config - AyahCard configuration (fontSize, showTranslation, etc.)
 * @param notes - User notes record
 * @returns Estimated height in pixels
 */
export function estimateVerseHeight(
  verse: Verse,
  config: AyahCardConfig,
  notes: Record<string, VerseNote>
): number {
  let height = 104; // base padding + actions bar

  // Arabic text (scales with fontSize, ~8 words per line)
  const arabicText = config.scriptType === "simple" ? verse.text_simple : verse.text_uthmani;
  const arabicWords = arabicText ? arabicText.split(" ").length : 0;
  const arabicLines = Math.ceil(arabicWords / 8);
  height += arabicLines * (config.fontSize * 2.5);

  // Translations
  if (config.showTranslation && verse.translations?.length) {
    const transFontSize = Math.max(14, config.fontSize * 0.55);
    verse.translations.forEach((t) => {
      // Remove HTML tags for accurate length calculation
      const cleanText = t.text.replace(/<[^>]*>/g, "");
      const lines = Math.ceil(cleanText.length / 80);
      height += lines * (transFontSize * 1.5) + 16; // +16 for spacing/padding
    });
  }

  // Notes - Improved estimation
  const noteBlocks = notes[verse.verse_key]?.blocks;
  if (noteBlocks && Array.isArray(noteBlocks) && noteBlocks.length > 0) {
    let noteHeight = 50; // Container padding (p-4=32) + margin (mt-4=16) + borders

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    noteBlocks.forEach((block: any) => {
      let blockHeight = 32; // Default paragraph height (24px + 8px margin)

      if (block.type === "heading") {
        blockHeight = 48; // Heading height + margin
      } else if (block.type === "bulletListItem" || block.type === "numberedListItem") {
        blockHeight = 28; // List item
      }

      // Estimate text length
      let textLength = 0;
      if (typeof block.content === "string") {
        textLength = block.content.length;
      } else if (Array.isArray(block.content)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        textLength = block.content.reduce((acc: number, item: any) => {
          if (typeof item === "string") return acc + item.length;
          if (item.text) return acc + item.text.length;
          return acc;
        }, 0);
      }

      // Estimate lines (assuming ~60 chars per line for sidebar width)
      if (textLength > 60) {
        const extraLines = Math.ceil(textLength / 60) - 1;
        blockHeight += extraLines * 24;
      }

      noteHeight += blockHeight;
    });

    height += noteHeight;
  }

  return height;
}

/**
 * Hook that wraps @tanstack/react-virtual for verse virtualization.
 *
 * Provides:
 * - Dynamic height estimation based on verse content
 * - Scroll-to-index functionality for navigation
 * - Overscan for smoother scrolling experience
 *
 * @param options - Configuration options for the virtualizer
 * @returns Virtualizer instance
 */
export function useVirtualScroller({
  verses,
  scrollElement,
  config,
  notes,
  overscan = 5,
}: UseVirtualScrollerOptions): Virtualizer<HTMLElement, Element> {
  // Memoize the estimateSize function to prevent recreating on every render
  const estimateSize = useMemo(
    () => (index: number) => {
      const verse = verses[index];
      if (!verse) return 200; // fallback height
      return estimateVerseHeight(verse, config, notes);
    },
    [verses, config, notes]
  );

  const virtualizer = useVirtualizer({
    count: verses.length,
    getScrollElement: () => scrollElement,
    estimateSize,
    overscan,
    // Enable smooth scrolling behavior
    scrollMargin: 0,
    scrollPaddingStart: 0,
    scrollPaddingEnd: 0,
  });

  return virtualizer;
}
