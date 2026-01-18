import React, { useMemo } from "react";
import { Verse } from "../types";
import { NotebookPen, Bookmark } from "lucide-react";
import { NotePreview } from "./NotePreview";
import { ShareButton } from "./ShareButton";
import { PartialBlock } from "@blocknote/core";

// Grouped stable configuration props
export interface AyahCardConfig {
  fontSize: number;
  showTranslation: boolean;
  scriptType: "uthmani" | "simple";
}

// Grouped callback props
export interface AyahCardCallbacks {
  onNote: (verse: Verse, e: React.MouseEvent) => void;
  onSelect: (verseKey: string) => void;
  onWordClick?: (word: string, wordIndex: number, verseKey: string, rect: DOMRect) => void;
  onBookmark?: (verseKey: string) => void;
}

// Grouped navigation props
export interface AyahCardNavigation {
  onNavigateToVerse?: (surahId: number, verseNumber?: number) => void;
  getSurahName?: (surahId: number) => string | undefined;
}

interface AyahCardProps {
  // Per-verse data
  verse: Verse;
  chapterName: string;
  chapterId: number;
  isActive: boolean;
  isBookmarked?: boolean;
  noteBlocks?: PartialBlock[]; // Current note blocks if exists

  // Grouped props
  config: AyahCardConfig;
  callbacks: AyahCardCallbacks;
  navigation: AyahCardNavigation;
}

const AyahCardComponent: React.FC<AyahCardProps> = ({
  verse,
  chapterId,
  isActive,
  isBookmarked,
  noteBlocks,
  config,
  callbacks,
  navigation,
}) => {
  // Destructure grouped props
  const { fontSize, showTranslation, scriptType } = config;
  const { onNote, onSelect, onWordClick, onBookmark } = callbacks;
  const { onNavigateToVerse, getSurahName } = navigation;
  const verseNum = verse.verse_key.split(":")[1];

  // Calculate translation font size relative to Arabic font size
  const translationFontSize = Math.max(14, Math.round(fontSize * 0.55));

  // Select correct text based on setting
  const displayText = scriptType === "simple" ? verse.text_simple : verse.text_uthmani;

  // Memoize word splitting to avoid re-computation on every render
  const words = useMemo(() => (displayText ? displayText.split(" ") : []), [displayText]);

  // Memoize cleaned translations to avoid regex processing on every render
  const cleanedTranslations = useMemo(
    () =>
      verse.translations?.map((t) => ({
        ...t,
        cleanText: t.text.replace(/<[^>]*>/g, ""),
        isRtl: t.direction === "rtl",
        isResourceNameRtl: t.resource_name ? /[\u0600-\u06FF]/.test(t.resource_name) : false,
      })) ?? [],
    [verse.translations]
  );

  const handleWordSpanClick = (
    e: React.MouseEvent<HTMLSpanElement>,
    word: string,
    wordIndex: number
  ) => {
    e.stopPropagation();
    // Only show context menu on active or bookmarked verse
    if (!isActive && !isBookmarked) return;
    // Only trigger if there's no text selection (user is not dragging to select)
    const selection = window.getSelection();
    if (selection && selection.toString().length > 0) {
      return;
    }
    if (onWordClick) {
      const rect = e.currentTarget.getBoundingClientRect();
      onWordClick(word, wordIndex, verse.verse_key, rect);
    }
  };

  const renderArabicText = () => {
    if (words.length === 0) return null;
    // Use memoized words array
    return words.map((word, i) => (
      <React.Fragment key={i}>
        <span
          data-word-index={i}
          onClick={(e) => handleWordSpanClick(e, word, i)}
          className="hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors duration-150 rounded px-0.5 -mx-0.5 cursor-pointer"
        >
          {word}
        </span>
        {i < words.length - 1 && " "}
      </React.Fragment>
    ));
  };

  const handleParagraphClick = (e: React.MouseEvent<HTMLParagraphElement>) => {
    // Only show context menu on active or bookmarked verse
    if (!isActive && !isBookmarked) return;
    const selection = window.getSelection();
    if (selection && selection.toString().length > 0) {
      return;
    }

    // If a word span handled the click, skip the fallback handler
    const targetSpan = (e.target as HTMLElement).closest("[data-word-index]");
    if (targetSpan) return;

    if (onWordClick && displayText) {
      const firstWord = displayText.split(" ").filter(Boolean)[0];
      if (!firstWord) return;
      const rect = e.currentTarget.getBoundingClientRect();
      onWordClick(firstWord, 0, verse.verse_key, rect);
    }
  };

  return (
    <div
      id={`ayah-${chapterId}-${verseNum}`}
      onClick={() => {
        // If the user is selecting text, do NOT trigger the row selection/activation.
        const selection = window.getSelection();
        if (selection && selection.toString().length > 0) {
          return;
        }
        onSelect(verse.verse_key);
      }}
      className={`
        group scroll-mt-48 border-b border-slate-100 dark:border-slate-800 py-8 px-4 md:px-8 transition-all duration-300 cursor-default rounded-xl
        ${
          isActive
            ? "bg-emerald-50/60 dark:bg-emerald-900/20 ring-1 ring-emerald-100 dark:ring-emerald-900/50 shadow-sm"
            : "hover:bg-slate-50/50 dark:hover:bg-slate-900/50"
        }
        ${isBookmarked ? "ring-2 ring-amber-400 dark:ring-amber-500/70" : ""}
      `}
      style={{ contain: "content" }} // CSS containment for performance optimization
    >
      <div className="flex flex-col gap-6">
        {/* Top Actions Bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span
              className={`
              px-3 py-1 rounded-full text-xs font-medium transition-colors
              ${
                isActive
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300"
                  : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
              }
            `}
            >
              {chapterId}:{verseNum}
            </span>
            {/* Small indicator if note exists */}
            {noteBlocks && noteBlocks.length > 0 && (
              <span className="block md:hidden w-2 h-2 rounded-full bg-yellow-400"></span>
            )}
          </div>
          <div className="flex gap-1 opacity-100 transition-opacity duration-300">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onBookmark?.(verse.verse_key);
              }}
              className={`
                p-2 rounded-full transition-colors
                ${
                  isBookmarked
                    ? "bg-amber-100 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400"
                    : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                }
              `}
              title={isBookmarked ? "Reading Position" : "Set Bookmark"}
            >
              <Bookmark size={16} fill={isBookmarked ? "currentColor" : "none"} />
            </button>
            <button
              onClick={(e) => onNote(verse, e)}
              className={`
                p-2 rounded-full transition-colors flex items-center gap-2
                ${
                  noteBlocks && noteBlocks.length > 0
                    ? "bg-yellow-100 text-yellow-600 dark:bg-yellow-500/10 dark:text-yellow-400"
                    : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                }
              `}
              title="Personal Note"
            >
              <NotebookPen size={16} />
            </button>
            <ShareButton
              surahId={chapterId}
              verseNumber={parseInt(verse.verse_key.split(":")[1])}
              className={`
                p-2 rounded-full transition-colors
                hover:bg-slate-100 dark:hover:bg-slate-800
                text-slate-400 hover:text-slate-600
                dark:hover:text-slate-300
              `}
            />
          </div>
        </div>

        {/* Arabic Text with Selection Data */}
        <div className="w-full text-right relative" dir="rtl" data-verse-key={verse.verse_key}>
          <p
            className="font-quran leading-[2.5] text-slate-800 dark:text-slate-100 mb-2 transition-all duration-300 selection:bg-emerald-200/50 dark:selection:bg-emerald-700/50"
            style={{ fontSize: `${fontSize}px` }}
            onClick={handleParagraphClick}
          >
            {renderArabicText()}
          </p>
        </div>

        {/* Translations */}
        {showTranslation && cleanedTranslations.length > 0 && (
          <div className="max-w-5xl space-y-4 mt-2 w-full">
            {cleanedTranslations.map((t, idx) => (
              <div
                key={t.id || idx}
                dir={t.isRtl ? "rtl" : "ltr"}
                style={{ fontSize: `${translationFontSize}px` }}
                className={`
                    text-slate-600 dark:text-slate-400 leading-relaxed font-light transition-all duration-300
                    ${
                      t.isRtl
                        ? "text-right border-r-2 border-slate-100 dark:border-slate-800 pr-4 font-vazir"
                        : "text-left border-l-2 border-slate-100 dark:border-slate-800 pl-4 font-sans"
                    }
                  `}
              >
                <p>
                  <span
                    className={`
                     inline-block text-[0.75em] font-bold text-emerald-600 dark:text-emerald-500 opacity-90 me-2
                     ${t.isResourceNameRtl ? "font-vazir" : "font-sans"}
                   `}
                  >
                    {t.resource_name}
                  </span>
                  <span>{t.cleanText}</span>
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Display Note if exists */}
        {noteBlocks && noteBlocks.length > 0 && (
          <div
            className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-500/5 border border-yellow-100 dark:border-yellow-500/20 rounded-lg relative cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              onNote(verse, e);
            }}
          >
            <div className="absolute top-3 left-3 opacity-50">
              <NotebookPen size={14} className="text-yellow-500" />
            </div>
            <div className="pl-6">
              <NotePreview
                blocks={noteBlocks}
                onNavigateToVerse={onNavigateToVerse}
                getSurahName={getSurahName}
                fontSize={translationFontSize}
              />
            </div>
            <div className="text-[10px] text-yellow-600/70 dark:text-yellow-500/70 mt-2 font-medium text-right">
              Personal Note
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Memoize the component to prevent re-renders when props haven't changed
export const AyahCard = React.memo(AyahCardComponent);
