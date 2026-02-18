import React, { memo, useState, useCallback, useRef, Suspense, useEffect } from "react";
import { X, ChevronUp, BookOpen, FileText, FolderOpen } from "lucide-react";
import type { Verse, VerseNote, SurahNote } from "../../types";
import type { PartialBlock } from "@blocknote/core";
import { TranslationTabs } from "./TranslationTabs";
import { useResizablePanel } from "../../hooks/useResizablePanel";

const RichNoteEditor = React.lazy(() =>
  import("../RichNoteEditor").then((m) => ({ default: m.RichNoteEditor }))
);

type BottomPanelTab = "translations" | "verseNotes" | "surahNotes";

interface BottomPanelProps {
  translations: Verse["translations"];
  verseKey: string;
  verseNote: VerseNote | undefined;
  onSaveVerseNote: (verseKey: string, blocks: PartialBlock[]) => void;
  surahId: number;
  surahNote: SurahNote | undefined;
  onSaveSurahNote: (surahId: number, blocks: PartialBlock[]) => void;
  theme: "light" | "dark";
  onNavigateToVerse?: (surahId: number, verseNumber?: number) => void;
  getSurahName?: (surahId: number) => string | undefined;
}

function BottomPanelComponent({
  translations,
  verseKey,
  verseNote,
  onSaveVerseNote,
  surahId,
  surahNote,
  onSaveSurahNote,
  theme,
  onNavigateToVerse,
  getSurahName,
}: BottomPanelProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<BottomPanelTab>("translations");
  const containerRef = useRef<HTMLDivElement>(null);

  // Height resize — percentage is "how much of the canvas the panel takes from the bottom"
  // We invert it: the handle position from top = (100 - panelHeight)%
  const { percentage: handlePosition, startResizing } = useResizablePanel({
    initial: 65, // handle at 65% from top = 35% panel height
    min: 40, // max panel height = 60%
    max: 85, // min panel height = 15%
    direction: "vertical",
    containerRef,
  });

  const panelHeight = `${100 - handlePosition}%`;

  // Debounced verse note save
  const verseNoteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const verseKeyRef = useRef(verseKey);
  verseKeyRef.current = verseKey;

  const handleVerseNoteChange = useCallback(
    (blocks: PartialBlock[]) => {
      if (verseNoteTimerRef.current) clearTimeout(verseNoteTimerRef.current);
      verseNoteTimerRef.current = setTimeout(() => {
        onSaveVerseNote(verseKeyRef.current, blocks);
      }, 1000);
    },
    [onSaveVerseNote]
  );

  // Debounced surah note save
  const surahNoteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const surahIdRef = useRef(surahId);
  surahIdRef.current = surahId;

  const handleSurahNoteChange = useCallback(
    (blocks: PartialBlock[]) => {
      if (surahNoteTimerRef.current) clearTimeout(surahNoteTimerRef.current);
      surahNoteTimerRef.current = setTimeout(() => {
        onSaveSurahNote(surahIdRef.current, blocks);
      }, 1000);
    },
    [onSaveSurahNote]
  );

  // Flush on unmount
  useEffect(() => {
    return () => {
      if (verseNoteTimerRef.current) clearTimeout(verseNoteTimerRef.current);
      if (surahNoteTimerRef.current) clearTimeout(surahNoteTimerRef.current);
    };
  }, []);

  // Stop keyboard events from propagating when inside editor
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft" || e.key === "ArrowRight" || e.key === "Escape") {
      e.stopPropagation();
    }
  }, []);

  const tabs: {
    id: BottomPanelTab;
    label: string;
    icon: React.ReactNode;
    hasIndicator: boolean;
  }[] = [
    {
      id: "translations",
      label: "Translations",
      icon: <BookOpen size={14} />,
      hasIndicator: false,
    },
    {
      id: "verseNotes",
      label: "Verse Notes",
      icon: <FileText size={14} />,
      hasIndicator: !!verseNote,
    },
    {
      id: "surahNotes",
      label: "Surah Notes",
      icon: <FolderOpen size={14} />,
      hasIndicator: !!surahNote,
    },
  ];

  if (!isOpen) {
    return (
      <div className="absolute bottom-0 left-0 right-0 z-10">
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 px-3 py-1.5 mx-auto mb-2 rounded-full bg-slate-800/90 backdrop-blur text-slate-400 hover:text-slate-200 text-xs transition-colors border border-slate-700/50"
        >
          <ChevronUp size={14} />
          <span>Panel</span>
          {(verseNote || surahNote) && <span className="w-1.5 h-1.5 rounded-full bg-yellow-400" />}
        </button>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="absolute inset-0 z-10 pointer-events-none">
      {/* Invisible area above panel — lets clicks pass through to canvas */}
      <div style={{ height: `calc(100% - ${panelHeight})` }} />

      {/* Resize handle */}
      <div
        onMouseDown={startResizing}
        className="h-2 cursor-row-resize flex items-center justify-center pointer-events-auto bg-transparent hover:bg-slate-700/30 transition-colors"
      >
        <div className="w-10 h-0.5 rounded-full bg-slate-500" />
      </div>

      {/* Panel content */}
      <div
        className="flex-1 flex flex-col pointer-events-auto bg-slate-900/95 backdrop-blur border-t border-slate-700/50"
        style={{ height: `calc(${panelHeight} - 0.5rem)` }}
        onKeyDown={handleKeyDown}
      >
        {/* Tab bar */}
        <div className="flex items-center gap-1 px-3 py-1.5 border-b border-slate-800 shrink-0">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-bold transition-all shrink-0 ${
                activeTab === tab.id
                  ? "bg-slate-700 text-slate-100 shadow-sm"
                  : "text-slate-500 hover:text-slate-300"
              }`}
            >
              {tab.icon}
              {tab.label}
              {tab.hasIndicator && (
                <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 shrink-0" />
              )}
            </button>
          ))}
          <div className="flex-1" />
          <button
            onClick={() => setIsOpen(false)}
            className="p-1.5 rounded-full hover:bg-slate-800 text-slate-500 hover:text-slate-300 transition-colors"
            aria-label="Close panel"
          >
            <X size={14} />
          </button>
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {activeTab === "translations" && translations.length > 0 && (
            <div className="p-4">
              <TranslationTabs translations={translations} compact />
            </div>
          )}
          {activeTab === "translations" && translations.length === 0 && (
            <div className="flex items-center justify-center h-full text-slate-500 text-sm">
              No translations available
            </div>
          )}
          {activeTab === "verseNotes" && (
            <div className="p-4 h-full">
              <Suspense
                fallback={
                  <div className="flex items-center justify-center py-8 text-slate-500 text-sm">
                    Loading editor...
                  </div>
                }
              >
                <RichNoteEditor
                  key={verseKey}
                  initialBlocks={verseNote?.blocks}
                  onChange={handleVerseNoteChange}
                  theme={theme}
                  onNavigateToVerse={onNavigateToVerse}
                  getSurahName={getSurahName}
                />
              </Suspense>
            </div>
          )}
          {activeTab === "surahNotes" && (
            <div className="p-4 h-full">
              <Suspense
                fallback={
                  <div className="flex items-center justify-center py-8 text-slate-500 text-sm">
                    Loading editor...
                  </div>
                }
              >
                <RichNoteEditor
                  key={`surah-${surahId}`}
                  initialBlocks={surahNote?.blocks}
                  onChange={handleSurahNoteChange}
                  theme={theme}
                  onNavigateToVerse={onNavigateToVerse}
                  getSurahName={getSurahName}
                />
              </Suspense>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export const BottomPanel = memo(BottomPanelComponent);
