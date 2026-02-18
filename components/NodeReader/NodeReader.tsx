import React, { useState, useEffect, useCallback, useRef, Suspense, lazy } from "react";
import { ReactFlowProvider } from "@xyflow/react";
import { X, Play, Pause, SkipBack, SkipForward, Repeat, Sparkles } from "lucide-react";
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
} from "../../types";
import type { PartialBlock } from "@blocknote/core";
import { loadLocalRootData } from "../../services/analysisService";
import { loadKnowledgeBase } from "../../services/knowledgeBaseService";
import { annotateWordsWithFamiliarity } from "../../services/familiarityService";
import {
  computeVerseFamiliarity,
  type VerseFamiliarityInfo,
} from "../../services/verseFamiliarityService";
import { CanvasLegend } from "./CanvasLegend";
import { getBacklinksForVerse } from "../../services/noteBacklinksService";
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
}) => {
  const [words, setWords] = useState<QuranWord[]>([]);
  const [loading, setLoading] = useState(true);
  const [propertiesSelection, setPropertiesSelection] = useState<PropertiesPanelSelection>(null);
  const togglePhraseRef = useRef<TogglePhraseOnCanvas | null>(null);
  const canvasCacheRef = useRef<Map<string, CanvasSnapshot>>(new Map());
  const canvasAreaRef = useRef<HTMLDivElement>(null);
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
      // Split the actual verse text — this is the authoritative word list
      const verseWords = verse.text_uthmani.split(" ");
      // Raw root entries (may contain nulls for particles)
      const rawEntries = rootData?.[verse.verse_key] || [];
      const builtWords: QuranWord[] = verseWords.map((word, i) => ({
        id: i,
        position: i + 1,
        text_uthmani: word,
        text_simple: word,
        root: rawEntries[i]?.r || undefined,
        lemma: rawEntries[i]?.l || undefined,
      }));
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
  }, [verse.verse_key, verse.text_uthmani]);

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

  return (
    <div className="fixed inset-0 z-[100] flex bg-slate-950" data-testid="node-reader">
      {/* Left Panel (Properties + Webcam zone) */}
      <PropertiesPanel
        selection={propertiesSelection}
        verse={verse}
        verseFamiliarity={verseFamiliarity}
        noteBacklinks={noteBacklinks}
        onNavigateToVerse={onNavigateToVerse}
        onTogglePhraseOnCanvas={(match, show) => togglePhraseRef.current?.(match, show)}
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
            onClick={() => setPromptModalOpen(true)}
            className="p-2 rounded-full hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
            aria-label="Build prompt"
          >
            <Sparkles size={18} />
          </button>
        </div>

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
                  onNavigateToVerse={onNavigateToVerse}
                  canvasCacheRef={canvasCacheRef}
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
