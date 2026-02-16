import React, { useState, useEffect, useCallback } from "react";
import { ReactFlowProvider } from "@xyflow/react";
import { X, Play, Pause, SkipBack, SkipForward, Repeat } from "lucide-react";
import { NodeReaderCanvas } from "./NodeReaderCanvas";
import { PropertiesPanel } from "./PropertiesPanel";
import { Spinner } from "../Spinner";
import type { Verse, Chapter, QuranWord, PropertiesPanelSelection } from "../../types";
import { loadLocalRootData } from "../../services/analysisService";

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
}) => {
  const [words, setWords] = useState<QuranWord[]>([]);
  const [loading, setLoading] = useState(true);
  const [propertiesSelection, setPropertiesSelection] = useState<PropertiesPanelSelection>(null);

  // Build word list from actual verse text + root data
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    loadLocalRootData().then((rootData) => {
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
      setWords(builtWords);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [verse.verse_key, verse.text_uthmani]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
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
      {/* Canvas area */}
      <div className="flex-1 relative flex flex-col">
        {/* Top bar */}
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
          {/* Spacer to balance the exit button */}
          <div className="w-9" />
        </div>

        {/* Canvas */}
        <div className="flex-1 relative">
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
              />
            </ReactFlowProvider>
          )}
          {/* Floating Verse Key Indicator (Bottom Left) */}
          <div className="absolute bottom-4 left-4 pointer-events-none select-none z-20">
            <span className="text-4xl font-black font-sans text-white opacity-20">
              {verse.verse_key}
            </span>
          </div>
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

      {/* Properties Panel */}
      <PropertiesPanel
        selection={propertiesSelection}
        verse={verse}
        chapter={chapter}
        onNavigateToVerse={onNavigateToVerse}
      />
    </div>
  );
};
