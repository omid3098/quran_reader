import React, { useState, useEffect, useCallback, useRef, Suspense, lazy } from "react";
import { ReactFlowProvider } from "@xyflow/react";
import {
  X,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Repeat,
  Sparkles,
  Bookmark,
  ChevronRight,
} from "lucide-react";
import { NodeReaderCanvas, type TogglePhraseOnCanvas } from "./NodeReaderCanvas";
import { PropertiesPanel } from "./PropertiesPanel";
import { BottomPanel } from "./BottomPanel";
import { Spinner } from "../Spinner";

const LazyPromptBuilderModal = lazy(() => import("./PromptBuilderModal"));
import type {
  Verse,
  Chapter,
  QuranWord,
  CanvasSnapshot,
  PropertiesPanelSelection,
  VerseNote,
  SurahNote,
  BreadcrumbEntry,
  VerseRef,
} from "../../types";
import type { PartialBlock } from "@blocknote/core";
import { loadLocalRootData } from "../../services/analysisService";
import { loadKnowledgeBase, clearKnowledgeBaseCache } from "../../services/knowledgeBaseService";
import { annotateWordsWithFamiliarity } from "../../services/familiarityService";
import {
  computeVerseFamiliarity,
  type VerseFamiliarityInfo,
} from "../../services/verseFamiliarityService";
import { CanvasLegend } from "./CanvasLegend";
import { getBacklinksForVerse } from "../../services/noteBacklinksService";
import { alignSimpleToUthmani } from "../../services/textAlignmentService";
import type { NoteBacklink } from "../../types";

interface NodeReaderProps {
  verse: Verse;
  chapter: Chapter;
  onExit: () => void;
  onNextVerse: () => void;
  onPrevVerse: () => void;
  onNavigateToVerse: (surahId: number, verseNumber?: number) => void;
  getSurahName: (surahId: number) => string | undefined;
  isPlaying: boolean;
  onTogglePlay: () => void;
  autoPlayEnabled: boolean;
  onToggleAutoPlay: () => void;
  verseNote: VerseNote | undefined;
  onSaveVerseNote: (verseKey: string, blocks: PartialBlock[]) => void;
  surahNote: SurahNote | undefined;
  onSaveSurahNote: (surahId: number, blocks: PartialBlock[]) => void;
  theme: "light" | "dark";
  fontSize?: number;
  scriptType: "uthmani" | "simple";
  breadcrumbs?: BreadcrumbEntry[];
  bookmarkedVerse?: VerseRef | null;
  onNavigateToBookmark?: () => void;
  onBreadcrumbClick?: (index: number) => void;
  onBookmark?: (verseKey: string) => void;
}

export const NodeReader: React.FC<NodeReaderProps> = ({
  verse,
  chapter,
  onExit,
  onNextVerse,
  onPrevVerse,
  onNavigateToVerse,
  getSurahName,
  isPlaying,
  onTogglePlay,
  autoPlayEnabled,
  onToggleAutoPlay,
  verseNote,
  onSaveVerseNote,
  surahNote,
  onSaveSurahNote,
  theme,
  fontSize,
  scriptType,
  breadcrumbs = [],
  bookmarkedVerse,
  onNavigateToBookmark,
  onBreadcrumbClick,
  onBookmark,
}) => {
  const [words, setWords] = useState<QuranWord[]>([]);
  const [loading, setLoading] = useState(true);
  const [propertiesSelection, setPropertiesSelection] = useState<PropertiesPanelSelection>(null);
  const togglePhraseRef = useRef<TogglePhraseOnCanvas | null>(null);
  const canvasCacheRef = useRef<Map<string, CanvasSnapshot>>(new Map());
  const canvasAreaRef = useRef<HTMLDivElement>(null);
  const rawWordsRef = useRef<QuranWord[]>([]);
  const updateWordFamiliarityRef = useRef<((words: QuranWord[]) => void) | null>(null);
  const [promptModalOpen, setPromptModalOpen] = useState(false);
  const [verseFamiliarity, setVerseFamiliarity] = useState<VerseFamiliarityInfo>({
    hasConnections: false,
    connections: [],
  });
  const [noteBacklinks, setNoteBacklinks] = useState<NoteBacklink[]>([]);

  // Build word list from actual verse text + root data
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([loadLocalRootData(), loadKnowledgeBase()]).then(([rootData, kb]) => {
      if (cancelled) return;
      // Split the actual verse text — uthmani is the authoritative word list
      // (quran-roots.json indices align with uthmani tokenisation).
      // Simple script may have more tokens (e.g. "يا أيّها" vs merged "يَٰٓأَيُّهَا"),
      // so we align simple words to uthmani positions.
      const uthmaniWords = verse.text_uthmani.split(" ");
      const simpleWords = alignSimpleToUthmani(uthmaniWords, verse.text_simple.split(" "));
      // Raw root entries (may contain nulls for particles)
      const rawEntries = rootData?.[verse.verse_key] || [];
      const builtWords: QuranWord[] = uthmaniWords.map((word, i) => ({
        id: i,
        position: i + 1,
        text_uthmani: word,
        text_simple: simpleWords[i] ?? word,
        root: rawEntries[i]?.r || undefined,
        lemma: rawEntries[i]?.l || undefined,
      }));
      // Keep raw words for re-annotation after KB changes
      rawWordsRef.current = builtWords;
      // Annotate words with familiarity flags from the Knowledge Base
      const annotatedWords = annotateWordsWithFamiliarity(builtWords, kb);
      setWords(annotatedWords);
      setVerseFamiliarity(computeVerseFamiliarity(verse.verse_key, kb));
      setNoteBacklinks(getBacklinksForVerse(verse.verse_key));
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [verse.verse_key, verse.text_uthmani, verse.text_simple]);

  // Keyboard navigation — skip when inside an editable element
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const active = document.activeElement;
      const isEditing =
        active instanceof HTMLInputElement ||
        active instanceof HTMLTextAreaElement ||
        (active instanceof HTMLElement && active.isContentEditable);
      if (isEditing) return;

      if (e.key === "ArrowLeft") onNextVerse(); // RTL: left = next
      if (e.key === "ArrowRight") onPrevVerse(); // RTL: right = prev
      if (e.key === "Escape") onExit();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onNextVerse, onPrevVerse, onExit]);

  const handleSelectionChange = useCallback((sel: PropertiesPanelSelection) => {
    setPropertiesSelection(sel);
  }, []);

  /** Refresh familiarity dots after a KB note is saved. */
  const handleKBNoteChanged = useCallback(() => {
    clearKnowledgeBaseCache();
    loadKnowledgeBase().then((kb) => {
      const annotated = annotateWordsWithFamiliarity(rawWordsRef.current, kb);
      setWords(annotated);
      updateWordFamiliarityRef.current?.(annotated);
    });
  }, []);

  return (
    <div className="fixed inset-0 z-[100] flex bg-slate-950" data-testid="node-reader">
      {/* Left Panel (Properties + Webcam zone) */}
      <PropertiesPanel
        selection={propertiesSelection}
        verse={verse}
        totalWords={words.length}
        verseFamiliarity={verseFamiliarity}
        noteBacklinks={noteBacklinks}
        onNavigateToVerse={onNavigateToVerse}
        onTogglePhraseOnCanvas={(match, show) => togglePhraseRef.current?.(match, show)}
        onKBNoteChanged={handleKBNoteChanged}
        fontSize={fontSize}
      />

      {/* Right area (Nav + Canvas + Bottom Panel + Audio) */}
      <div className="flex-1 relative flex flex-col">
        {/* Navigation bar */}
        <div className="flex items-center px-4 py-2 bg-slate-900/80 border-b border-slate-800 z-10">
          <button
            onClick={onExit}
            className="p-2 rounded-full hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
            aria-label="Exit node reader"
          >
            <X size={20} />
          </button>
          <div className="flex-1 text-center">
            <span className="text-sm font-semibold text-slate-200">{chapter.name_simple}</span>
            <span className="text-slate-600 mx-2">·</span>
            <span className="text-sm font-vazir text-slate-400">{chapter.name_arabic}</span>
          </div>
          <button
            onClick={() => onBookmark?.(verse.verse_key)}
            className={`p-2 rounded-full transition-colors ${
              bookmarkedVerse?.verseKey === verse.verse_key
                ? "bg-amber-900/30 text-amber-400"
                : "hover:bg-slate-800 text-slate-500 hover:text-slate-300"
            }`}
            aria-label={
              bookmarkedVerse?.verseKey === verse.verse_key
                ? "Reading Position"
                : "Bookmark this Verse"
            }
            title={
              bookmarkedVerse?.verseKey === verse.verse_key
                ? "Reading Position"
                : "Bookmark this Verse"
            }
          >
            <Bookmark
              size={18}
              fill={bookmarkedVerse?.verseKey === verse.verse_key ? "currentColor" : "none"}
            />
          </button>
          <button
            onClick={() => setPromptModalOpen(true)}
            className="p-2 rounded-full hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
            aria-label="Build prompt"
          >
            <Sparkles size={18} />
          </button>
        </div>

        {/* Breadcrumb strip */}
        {(breadcrumbs.length > 0 ||
          (bookmarkedVerse && bookmarkedVerse.verseKey !== verse.verse_key)) && (
          <div className="flex items-center gap-1 px-4 py-1.5 bg-slate-900/60 border-b border-slate-800/50 overflow-x-auto custom-scrollbar-hide">
            {bookmarkedVerse && (
              <button
                onClick={onNavigateToBookmark}
                className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-900/20 text-amber-400 text-xs font-medium hover:bg-amber-900/40 transition-colors whitespace-nowrap flex-shrink-0"
                title="Return to bookmark"
              >
                <Bookmark size={12} fill="currentColor" />
                <span>{bookmarkedVerse.verseKey}</span>
              </button>
            )}
            {breadcrumbs.map((entry, idx) => (
              <React.Fragment key={`${entry.verseRef.verseKey}-${entry.timestamp}`}>
                <ChevronRight size={12} className="text-slate-600 flex-shrink-0" />
                <button
                  onClick={() => onBreadcrumbClick?.(idx)}
                  className="px-2 py-0.5 rounded-full text-slate-400 text-xs hover:bg-slate-800 transition-colors whitespace-nowrap flex-shrink-0"
                  title={`Go to ${entry.verseRef.verseKey}`}
                >
                  {entry.verseRef.verseKey}
                </button>
              </React.Fragment>
            ))}
            <ChevronRight size={12} className="text-slate-600 flex-shrink-0" />
            <span className="px-2 py-0.5 text-emerald-400 text-xs font-medium whitespace-nowrap flex-shrink-0">
              {verse.verse_key}
            </span>
          </div>
        )}

        {/* Canvas + Bottom Panel */}
        <div ref={canvasAreaRef} className="flex-1 flex flex-col min-h-0">
          {/* Canvas */}
          <div className="flex-1 relative min-h-0">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <Spinner />
              </div>
            ) : (
              <ReactFlowProvider>
                <NodeReaderCanvas
                  words={words}
                  verseKey={verse.verse_key}
                  chapter={chapter}
                  getSurahName={getSurahName}
                  onSelectionChange={handleSelectionChange}
                  togglePhraseRef={togglePhraseRef}
                  updateWordFamiliarityRef={updateWordFamiliarityRef}
                  onNavigateToVerse={onNavigateToVerse}
                  canvasCacheRef={canvasCacheRef}
                  scriptType={scriptType}
                />
              </ReactFlowProvider>
            )}
            {/* Floating Verse Key Indicator */}
            <div className="absolute bottom-4 left-4 pointer-events-none select-none z-20 flex items-center gap-2">
              <span className="text-4xl font-black font-sans text-white opacity-20">
                {verse.verse_key}
              </span>
              {(verseFamiliarity.hasConnections || noteBacklinks.length > 0) && (
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-yellow-400/50" />
              )}
            </div>
            {/* Color Legend */}
            <CanvasLegend />
          </div>
          {/* Bottom Panel */}
          <BottomPanel
            containerRef={canvasAreaRef}
            translations={verse.translations}
            verseKey={verse.verse_key}
            verseNote={verseNote}
            onSaveVerseNote={onSaveVerseNote}
            surahId={chapter.id}
            surahNote={surahNote}
            onSaveSurahNote={onSaveSurahNote}
            theme={theme}
            onNavigateToVerse={onNavigateToVerse}
            getSurahName={getSurahName}
            fontSize={fontSize}
          />
        </div>

        {/* Audio controls */}
        <div className="flex items-center justify-center gap-3 py-3 bg-slate-900/80 border-t border-slate-800">
          <button
            onClick={onPrevVerse}
            className="p-2 rounded-full hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
            aria-label="Previous verse"
          >
            <SkipBack size={18} />
          </button>
          <button
            onClick={onTogglePlay}
            className="p-3 rounded-full bg-white text-slate-900 hover:bg-slate-200 transition-colors"
            aria-label={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? <Pause size={20} /> : <Play size={20} />}
          </button>
          <button
            onClick={onNextVerse}
            className="p-2 rounded-full hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
            aria-label="Next verse"
          >
            <SkipForward size={18} />
          </button>
          <div className="w-px h-6 bg-slate-700 mx-1" />
          <button
            onClick={onToggleAutoPlay}
            className={`p-2 rounded-full transition-colors ${
              autoPlayEnabled
                ? "bg-emerald-900/50 text-emerald-400"
                : "hover:bg-slate-800 text-slate-500"
            }`}
            aria-label="Toggle auto-play"
          >
            <Repeat size={18} />
          </button>
        </div>
      </div>

      {/* Prompt Builder Modal (lazy loaded) */}
      {promptModalOpen && (
        <Suspense fallback={null}>
          <LazyPromptBuilderModal
            verse={verse}
            chapter={chapter}
            words={words}
            verseNote={verseNote}
            surahNote={surahNote}
            onClose={() => setPromptModalOpen(false)}
          />
        </Suspense>
      )}
    </div>
  );
};
