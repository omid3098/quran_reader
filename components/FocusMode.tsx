import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  X,
  ChevronRight,
  Bookmark,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  BookMarked,
  Repeat,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { Verse, Chapter, VerseNote, BreadcrumbEntry, VerseRef } from "../types";
import { RichNoteEditor } from "./RichNoteEditor";
import { PartialBlock } from "@blocknote/core";

// Simple debounce utility
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function debounce<T extends (...args: any[]) => void>(func: T, wait: number) {
  let timeout: ReturnType<typeof setTimeout>;
  return function (...args: Parameters<T>) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

interface FocusModeProps {
  verse: Verse;
  chapter: Chapter;
  onExit: () => void;
  onNextVerse: () => void;
  onPrevVerse: () => void;
  note: VerseNote | undefined;
  onSaveNote: (verseKey: string, blocks: PartialBlock[]) => void;
  theme: "light" | "dark";
  onNavigateToVerse?: (surahId: number, verseNumber?: number) => void;
  getSurahName?: (surahId: number) => string | undefined;
  settings: {
    fontSize: number;
    fontFamily?: string;
    scriptType?: "uthmani" | "simple";
  };
  breadcrumbs?: BreadcrumbEntry[];
  bookmark?: VerseRef | null;
  onNavigateToBookmark?: () => void;
  onBreadcrumbClick?: (index: number) => void;
  currentVerseKey?: string;
  onBookmark: (verseKey: string) => void;
  isBookmarked: boolean;
  isPlaying: boolean;
  onTogglePlay: () => void;
  autoPlayEnabled: boolean;
  onToggleAutoPlay: () => void;
  hasSurahNotes?: boolean;
  onOpenSurahNotes?: () => void;
}

export const FocusMode: React.FC<FocusModeProps> = ({
  verse,
  chapter,
  onExit,
  onNextVerse,
  onPrevVerse,
  note,
  onSaveNote,
  theme,
  onNavigateToVerse,
  getSurahName,
  settings,
  breadcrumbs = [],
  bookmark,
  onNavigateToBookmark,
  onBreadcrumbClick,
  currentVerseKey,
  onBookmark,
  isBookmarked,
  isPlaying,
  onTogglePlay,
  autoPlayEnabled,
  onToggleAutoPlay,
  hasSurahNotes,
  onOpenSurahNotes,
}) => {
  const [activeTab, setActiveTab] = useState(0);

  // Resizable state
  const [topHeightPercentage, setTopHeightPercentage] = useState(40); // Initial 40% height
  const [isCollapsed, setIsCollapsed] = useState(false);
  const isResizingRef = useRef(false);

  // Translations processing
  const translations = useMemo(() => {
    return verse.translations || [];
  }, [verse.translations]);

  // Reset tab when verse changes
  useEffect(() => {
    setActiveTab(0);
  }, [verse.id]);

  // Auto-save debounced handler
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const handleNoteChange = useCallback(
    debounce((blocks: PartialBlock[]) => {
      onSaveNote(verse.verse_key, blocks);
    }, 1000),
    [verse.verse_key, onSaveNote]
  );

  // Resizable Logic
  const startResizing = useCallback((e: React.MouseEvent) => {
    // Don't start resizing if clicking the toggle button
    if ((e.target as HTMLElement).closest("button")) return;

    isResizingRef.current = true;
    document.body.style.cursor = "row-resize";
    document.body.style.userSelect = "none";
  }, []);

  const stopResizing = useCallback(() => {
    isResizingRef.current = false;
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
  }, []);

  const resize = useCallback(
    (e: MouseEvent) => {
      if (isResizingRef.current) {
        const containerHeight = window.innerHeight;
        const newHeight = (e.clientY / containerHeight) * 100;
        // Clamp between 20% and 80%
        const clampedHeight = Math.min(Math.max(newHeight, 20), 80);
        setTopHeightPercentage(clampedHeight);

        // Auto-expand if resizing
        if (isCollapsed) setIsCollapsed(false);
      }
    },
    [isCollapsed]
  );

  useEffect(() => {
    window.addEventListener("mousemove", resize);
    window.addEventListener("mouseup", stopResizing);
    return () => {
      window.removeEventListener("mousemove", resize);
      window.removeEventListener("mouseup", stopResizing);
    };
  }, [resize, stopResizing]);

  const currentTranslation = translations[activeTab];

  // Calculate scaled font sizes (180% of standard 0.55 ratio)
  const baseTranslationFontSize = settings.fontSize * 0.55;
  const scaledFontSize = Math.round(baseTranslationFontSize * 1.8);

  return (
    <div
      className={`fixed inset-0 z-[100] flex flex-col md:flex-row bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans transition-colors duration-300 overflow-hidden`}
    >
      {/* Left Sidebar (Navigation + Webcam Zone) */}
      <div className="w-full md:w-80 lg:w-96 flex-none flex flex-col border-r border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 z-10">
        {/* Top Nav Area */}
        <div className="p-6 flex flex-col gap-6">
          <button
            onClick={onExit}
            className="self-start flex items-center gap-2 text-slate-500 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400 transition-colors group"
          >
            <div className="p-1.5 rounded-full bg-slate-200 dark:bg-slate-800 group-hover:bg-red-100 dark:group-hover:bg-red-900/30 transition-colors">
              <X size={18} />
            </div>
            <span className="text-sm font-bold">Exit Focus Mode</span>
          </button>

          <div className="flex items-center justify-between mt-2">
            <div className="flex items-baseline gap-2 overflow-hidden">
              <h2 className="text-lg font-black text-slate-800 dark:text-slate-100 leading-tight truncate">
                {chapter.name_simple}
              </h2>
              <span className="text-sm text-slate-500 dark:text-slate-400 font-medium whitespace-nowrap">
                Verse {verse.verse_key.split(":")[1]}
              </span>
            </div>
            <button
              onClick={() => onBookmark(verse.verse_key)}
              className={`
                    p-2 rounded-full transition-colors flex-shrink-0
                    ${
                      isBookmarked
                        ? "bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400"
                        : "bg-slate-100 text-slate-400 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-500 dark:hover:bg-slate-700"
                    }
                `}
              title={isBookmarked ? "Remove Bookmark" : "Bookmark this Verse"}
            >
              <Bookmark size={18} fill={isBookmarked ? "currentColor" : "none"} />
            </button>
          </div>

          {/* Grouped Navigation & Controls - Stitched together */}
          <div className="mt-6 flex flex-col items-center gap-0 w-full">
            {/* Breadcrumbs Section */}
            {(breadcrumbs.length > 0 || bookmark) && (
              <div className="flex justify-center w-full">
                <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-full px-4 py-2 shadow-lg border border-slate-200 dark:border-slate-700 flex items-center gap-1 overflow-x-auto max-w-full custom-scrollbar-hide pointer-events-auto">
                  {/* Bookmark */}
                  {bookmark && (
                    <button
                      onClick={onNavigateToBookmark}
                      className="flex items-center gap-1 px-2 py-1 rounded-full bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 text-xs font-medium hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors whitespace-nowrap flex-shrink-0"
                      title="Return to bookmark"
                    >
                      <Bookmark size={12} fill="currentColor" />
                      <span>{bookmark.verseKey}</span>
                    </button>
                  )}

                  {/* Trail */}
                  {breadcrumbs.map((entry, idx) => (
                    <React.Fragment key={`${entry.verseRef.verseKey}-${entry.timestamp}`}>
                      <ChevronRight
                        size={12}
                        className="text-slate-300 dark:text-slate-600 flex-shrink-0"
                      />
                      <button
                        onClick={() => onBreadcrumbClick?.(idx)}
                        className="px-2 py-1 rounded-full text-slate-600 dark:text-slate-400 text-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap flex-shrink-0"
                      >
                        {entry.verseRef.verseKey}
                      </button>
                    </React.Fragment>
                  ))}

                  {/* Current position indicator */}
                  {currentVerseKey && (
                    <>
                      <ChevronRight
                        size={12}
                        className="text-slate-300 dark:text-slate-600 flex-shrink-0"
                      />
                      <span className="px-2 py-1 text-emerald-600 dark:text-emerald-400 text-xs font-medium whitespace-nowrap flex-shrink-0">
                        {currentVerseKey}
                      </span>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Controls Pill (Audio Player Style) */}
            <div className="flex justify-center w-full">
              <div className="bg-white/95 dark:bg-slate-900/95 text-slate-900 dark:text-white rounded-full shadow-lg shadow-black/10 dark:shadow-black/40 px-4 py-2 flex items-center gap-3 border border-emerald-500 backdrop-blur-md">
                {/* Surah Notes Button */}
                <button
                  onClick={onOpenSurahNotes}
                  className={`
                    relative transition-colors duration-200 flex items-center justify-center
                    ${
                      hasSurahNotes
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"
                    }
                  `}
                  title="Surah Notes"
                >
                  <BookMarked size={18} />
                  {hasSurahNotes && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-500 rounded-full" />
                  )}
                </button>

                {/* Left Separator */}
                <div className="h-6 w-px bg-slate-200 dark:bg-slate-700"></div>

                {/* Main Controls */}
                <div className="flex items-center gap-3">
                  <button
                    onClick={onPrevVerse}
                    className="text-slate-400 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors active:scale-95"
                    title="Previous Ayah"
                  >
                    <SkipBack size={20} fill="currentColor" />
                  </button>

                  <button
                    onClick={onTogglePlay}
                    className="w-10 h-10 flex items-center justify-center bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-full hover:bg-slate-700 dark:hover:bg-slate-200 hover:scale-105 transition-all duration-300 shadow-lg shadow-slate-900/20 dark:shadow-white/10"
                    title={isPlaying ? "Pause" : "Play"}
                  >
                    {isPlaying ? (
                      <Pause size={18} fill="currentColor" />
                    ) : (
                      <Play size={18} fill="currentColor" className="ml-1" />
                    )}
                  </button>

                  <button
                    onClick={onNextVerse}
                    className="text-slate-400 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors active:scale-95"
                    title="Next Ayah"
                  >
                    <SkipForward size={20} fill="currentColor" />
                  </button>
                </div>

                {/* Right Separator */}
                <div className="h-6 w-px bg-slate-200 dark:bg-slate-700"></div>

                {/* Autoplay Toggle */}
                <button
                  onClick={onToggleAutoPlay}
                  className={`
                    transition-colors duration-200 flex items-center justify-center
                    ${
                      autoPlayEnabled
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"
                    }
                  `}
                  title={`Auto-play: ${autoPlayEnabled ? "On" : "Off"}`}
                >
                  <Repeat size={18} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Spacer to push Webcam Zone to bottom */}
        <div className="flex-1"></div>

        {/* Webcam Zone - Empty as requested */}
        <div className="h-56 md:h-64 bg-transparent">
          {/* Intentionally empty for webcam overlay */}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden relative">
        {/* Top Section: Verse & Translation (Resizable) */}
        <div
          style={{ height: isCollapsed ? "auto" : `${topHeightPercentage}%` }}
          className={`flex-none flex flex-col p-6 md:p-10 pb-0 bg-white dark:bg-slate-950 z-10 overflow-y-auto custom-scrollbar transition-[height] duration-300 ease-in-out ${isCollapsed ? "pb-6" : ""}`}
        >
          {/* Arabic Text */}
          <div className="text-center mb-6 dir-rtl flex-shrink-0">
            <p
              className="font-quran leading-[2.0] text-slate-800 dark:text-slate-100 transition-all duration-300"
              style={{ fontSize: `${settings.fontSize * 1.1}px` }} // Reduced multiplier from 1.5 to 1.1
            >
              {settings.scriptType === "simple" ? verse.text_simple : verse.text_uthmani}
            </p>
          </div>

          {/* Translation Toggle Divider */}
          <div
            className="w-full flex items-center gap-3 my-2 cursor-pointer group select-none opacity-60 hover:opacity-100 transition-opacity mb-6"
            onClick={() => setIsCollapsed(!isCollapsed)}
          >
            <div className="h-px bg-slate-200 dark:bg-slate-800 flex-1 group-hover:bg-emerald-200 dark:group-hover:bg-emerald-900/50 transition-colors"></div>
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
              <span>{isCollapsed ? "Show Translation" : "Translation"}</span>
              {isCollapsed ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
            </div>
            <div className="h-px bg-slate-200 dark:bg-slate-800 flex-1 group-hover:bg-emerald-200 dark:group-hover:bg-emerald-900/50 transition-colors"></div>
          </div>

          {/* Translation Tabs */}
          {!isCollapsed && translations.length > 0 && (
            <div className="flex flex-col items-center w-full flex-1">
              <div className="flex gap-1 mb-4 flex-wrap justify-center bg-slate-100 dark:bg-slate-900/50 p-1 rounded-lg flex-shrink-0">
                {translations.map((t, idx) => (
                  <button
                    key={t.id || idx}
                    onClick={() => setActiveTab(idx)}
                    className={`
                      px-3 py-1.5 rounded-md text-xs font-bold transition-all font-vazir
                      ${
                        activeTab === idx
                          ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-sm"
                          : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                      }
                    `}
                  >
                    {t.resource_name}
                  </button>
                ))}
              </div>

              {/* Translation Content */}
              <div
                className={`text-center w-full leading-relaxed text-slate-600 dark:text-slate-300 transition-opacity duration-300 font-vazir`} // Changed font to Vazir
                style={{ fontSize: `${scaledFontSize}px` }}
                key={currentTranslation?.id}
                dir={currentTranslation?.direction || "ltr"}
              >
                {currentTranslation?.text.replace(/<[^>]*>/g, "")}
              </div>
            </div>
          )}
        </div>

        {/* Resize Handle */}
        <div
          onMouseDown={startResizing}
          className="h-3 w-full bg-slate-100 dark:bg-slate-900 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 cursor-row-resize flex items-center justify-center transition-colors group z-20 flex-shrink-0 border-y border-slate-200 dark:border-slate-800 relative"
        >
          <div className="w-12 h-1 rounded-full bg-slate-300 dark:bg-slate-700 group-hover:bg-emerald-400 transition-colors"></div>
        </div>

        {/* Note Editor Area (Obsidian Style) */}
        <div className="flex-1 bg-yellow-50/30 dark:bg-slate-900/30 relative flex flex-col min-h-0 focus-mode-notes">
          <style>{`
            .focus-mode-notes .bn-block-content,
            .focus-mode-notes .tiptap p {
              font-size: ${scaledFontSize}px !important;
              line-height: 1.6 !important;
            }
            .focus-mode-notes .bn-editor {
              font-size: ${scaledFontSize}px !important;
            }
            .focus-mode-notes .quran-link {
              border-radius: 9999px !important;
              padding: 0.25em 0.6em !important;
            }
          `}</style>
          <div className="flex-1 overflow-y-auto px-6 md:px-12 py-8 custom-scrollbar">
            <div className="w-full h-full flex flex-col">
              <div
                className="flex-1 min-h-[300px] cursor-text pb-20"
                onClick={(e) => {
                  // Focus editor if clicking on the background container
                  const editor = document.querySelector(".ProseMirror") as HTMLElement;
                  if (editor && e.target !== editor && !editor.contains(e.target as Node)) {
                    editor.focus();
                  }
                }}
              >
                <RichNoteEditor
                  initialBlocks={note?.blocks}
                  onChange={handleNoteChange}
                  theme={theme}
                  onNavigateToVerse={onNavigateToVerse}
                  getSurahName={getSurahName}
                  editable={true}
                />
              </div>
            </div>
          </div>

          {/* Floating Verse Key Indicator (Bottom Left) */}
          <div className="absolute bottom-8 left-12 pointer-events-none select-none z-20">
            <span
              className={`text-4xl font-black font-sans opacity-20 ${
                theme === "dark" ? "text-white" : "text-slate-900"
              }`}
            >
              {verse.verse_key}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
