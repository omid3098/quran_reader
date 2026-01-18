import React, { useEffect } from "react";
import { Virtualizer } from "@tanstack/react-virtual";
import { Verse, Chapter, VerseNote } from "../types";
import { AyahCard, AyahCardConfig, AyahCardCallbacks, AyahCardNavigation } from "./AyahCard";
import { useVirtualScroller } from "../hooks/useVirtualScroller";

export interface VirtualVerseListProps {
  verses: Verse[];
  scrollElement: HTMLElement | null;
  config: AyahCardConfig;
  callbacks: AyahCardCallbacks;
  navigation: AyahCardNavigation;
  notes: Record<string, VerseNote>;
  currentVerseIndex: number;
  bookmarkedVerseKey?: string;
  currentChapter: Chapter | null;
  onVirtualizerReady: (virtualizer: Virtualizer<HTMLElement, Element>) => void;
}

/**
 * VirtualVerseList component
 *
 * Renders verses using virtual scrolling for optimal performance.
 * Only visible verses are rendered in the DOM, significantly improving
 * performance for long surahs like Al-Baqarah (286 verses).
 *
 * Features:
 * - Renders only ~15-20 verses at a time (visible + overscan)
 * - Dynamic height estimation based on content
 * - Smooth scrolling and navigation
 * - Maintains all AyahCard functionality
 */
const VirtualVerseList: React.FC<VirtualVerseListProps> = ({
  verses,
  scrollElement,
  config,
  callbacks,
  navigation,
  notes,
  currentVerseIndex,
  bookmarkedVerseKey,
  currentChapter,
  onVirtualizerReady,
}) => {
  const virtualizer = useVirtualScroller({
    verses,
    scrollElement,
    config,
    notes,
    overscan: 5,
  });

  // Notify parent when virtualizer is ready
  useEffect(() => {
    onVirtualizerReady(virtualizer);
  }, [virtualizer, onVirtualizerReady]);

  const virtualItems = virtualizer.getVirtualItems();

  return (
    <div
      style={{
        height: `${virtualizer.getTotalSize()}px`,
        width: "100%",
        position: "relative",
      }}
    >
      {virtualItems.map((virtualItem) => {
        const verse = verses[virtualItem.index];
        if (!verse) return null;

        const isActive = currentVerseIndex === virtualItem.index;
        const isBookmarked = bookmarkedVerseKey === verse.verse_key;

        return (
          <div
            key={verse.id}
            data-index={virtualItem.index}
            ref={virtualizer.measureElement}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              transform: `translateY(${virtualItem.start}px)`,
            }}
          >
            <AyahCard
              verse={verse}
              chapterName={currentChapter?.name_simple || ""}
              chapterId={currentChapter?.id || 0}
              isActive={isActive}
              isBookmarked={isBookmarked}
              noteBlocks={notes[verse.verse_key]?.blocks}
              config={config}
              callbacks={callbacks}
              navigation={navigation}
            />
          </div>
        );
      })}
    </div>
  );
};

export default VirtualVerseList;
