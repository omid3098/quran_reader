import React, { memo, useState, useCallback } from "react";
import { Info, ChevronDown } from "lucide-react";
import type { PropertiesPanelSelection, Verse, Chapter, SurahGroup } from "../../types";

interface PropertiesPanelProps {
  selection: PropertiesPanelSelection;
  verse: Verse;
  chapter: Chapter;
  onNavigateToVerse: (surahId: number, verseNumber?: number) => void;
}

function PropertiesPanelComponent({
  selection,
  verse,
  chapter,
  onNavigateToVerse,
}: PropertiesPanelProps) {
  return (
    <div className="w-80 md:w-96 border-l border-slate-800 bg-slate-900/50 overflow-y-auto custom-scrollbar flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 flex items-center gap-2 text-emerald-500 bg-slate-900/50">
        <Info size={18} />
        <h2 className="font-bold text-sm tracking-tight">Properties</h2>
      </div>

      {/* Content */}
      <div className="flex-1 p-5 space-y-4">
        {(!selection || selection.type === "verse") && (
          <VerseInfo verse={verse} chapter={chapter} />
        )}
        {selection?.type === "word" && <WordInfo data={selection.data} />}
        {selection?.type === "root" && (
          <RootInfo
            data={selection.data}
            analysis={selection.analysis}
            surahGroups={selection.surahGroups}
            onNavigateToVerse={onNavigateToVerse}
          />
        )}
      </div>
    </div>
  );
}

function VerseInfo({ verse }: { verse: Verse; chapter: Chapter }) {
  return (
    <>
      <div className="border border-slate-700/50 rounded-lg p-4">
        <p className="font-quran text-lg text-slate-200 leading-[2]" dir="rtl">
          {verse.text_uthmani}
        </p>
      </div>
      {verse.translations.length > 0 && <TranslationTabs translations={verse.translations} />}
    </>
  );
}

function WordInfo({
  data,
}: {
  data: NonNullable<Extract<PropertiesPanelSelection, { type: "word" }>["data"]>;
}) {
  return (
    <>
      <div className="border border-slate-700/50 rounded-lg p-4">
        <div className="text-xs text-slate-500 tracking-wider mb-1">Word</div>
        <div className="font-quran text-3xl text-slate-100 dir-rtl" dir="rtl">
          {data.word}
        </div>
      </div>
      {data.root && (
        <div className="border border-slate-700/50 rounded-lg p-4">
          <div className="text-xs text-slate-500 tracking-wider mb-1">Root</div>
          <div className="font-quran text-xl text-indigo-300">{data.root.split("").join(" ")}</div>
        </div>
      )}
      {data.lemma && (
        <div className="border border-slate-700/50 rounded-lg p-4">
          <div className="text-xs text-slate-500 tracking-wider mb-1">Lemma</div>
          <div className="font-quran text-lg text-slate-300">{data.lemma}</div>
        </div>
      )}
      <div className="border border-slate-700/50 rounded-lg p-4">
        <div className="text-xs text-slate-500 tracking-wider mb-1">Position</div>
        <div className="text-sm text-slate-400">
          Word {data.wordIndex + 1} in {data.verseKey}
        </div>
      </div>
    </>
  );
}

function RootInfo({
  data,
  analysis,
  surahGroups,
  onNavigateToVerse,
}: {
  data: NonNullable<Extract<PropertiesPanelSelection, { type: "root" }>["data"]>;
  analysis?: NonNullable<Extract<PropertiesPanelSelection, { type: "root" }>["analysis"]>;
  surahGroups?: SurahGroup[];
  onNavigateToVerse: (surahId: number, verseNumber?: number) => void;
}) {
  const [wordFormsOpen, setWordFormsOpen] = useState(false);
  const [versesOpen, setVersesOpen] = useState(false);
  const [expandedSurahs, setExpandedSurahs] = useState<Set<number>>(new Set());

  const toggleSurah = useCallback((surahId: number) => {
    setExpandedSurahs((prev) => {
      const next = new Set(prev);
      if (next.has(surahId)) next.delete(surahId);
      else next.add(surahId);
      return next;
    });
  }, []);

  const handleVerseKeyClick = useCallback(
    (verseKey: string) => {
      const [surahStr, verseStr] = verseKey.split(":");
      onNavigateToVerse(parseInt(surahStr, 10), parseInt(verseStr, 10));
    },
    [onNavigateToVerse]
  );

  return (
    <>
      <div className="border border-slate-700/50 rounded-lg p-4">
        <div className="text-xs text-slate-500 tracking-wider mb-1">Root</div>
        <div className="font-quran text-2xl text-indigo-300">{data.root.split("").join(" ")}</div>
      </div>
      {analysis && (
        <>
          <div className="border border-slate-700/50 rounded-lg p-4">
            <div className="text-xs text-slate-500 tracking-wider mb-1">Occurrences</div>
            <div className="text-sm text-slate-300">{analysis.occurrences} verses</div>
          </div>
          {analysis.wordForms.length > 0 && (
            <div className="border border-slate-700/50 rounded-lg overflow-hidden">
              <button
                onClick={() => setWordFormsOpen((v) => !v)}
                className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-slate-800/50 transition-colors"
              >
                <span className="text-xs text-slate-500 tracking-wider">Word Forms</span>
                <ChevronDown
                  size={16}
                  className={`text-slate-500 transition-transform ${wordFormsOpen ? "rotate-180" : ""}`}
                />
              </button>
              {wordFormsOpen && (
                <div className="px-4 pb-3 flex flex-wrap gap-2" dir="rtl">
                  {analysis.wordForms.slice(0, 15).map((wf, i) => (
                    <span
                      key={i}
                      className="px-2 py-1 rounded bg-slate-800 text-sm font-quran text-slate-300"
                    >
                      {wf.form}
                      <span className="text-xs text-slate-500 ml-1">({wf.occurrences})</span>
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Surah accordion */}
      {surahGroups && surahGroups.length > 0 && (
        <div className="border border-slate-700/50 rounded-lg overflow-hidden">
          <button
            onClick={() => setVersesOpen((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-slate-800/50 transition-colors"
          >
            <span className="text-xs text-slate-500 tracking-wider">
              Verses by Surah ({surahGroups.length})
            </span>
            <ChevronDown
              size={16}
              className={`text-slate-500 transition-transform ${versesOpen ? "rotate-180" : ""}`}
            />
          </button>
          {versesOpen && (
            <div className="divide-y divide-slate-700/30">
              {surahGroups.map((group) => {
                const isOpen = expandedSurahs.has(group.surahId);
                return (
                  <div key={group.surahId}>
                    <button
                      onClick={() => toggleSurah(group.surahId)}
                      className="w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-slate-800/50 transition-colors"
                    >
                      <span className="text-sm text-slate-200">
                        {group.surahName}
                        <span className="text-xs text-slate-500 ml-1.5">
                          ({group.verseKeys.length})
                        </span>
                      </span>
                      <ChevronDown
                        size={16}
                        className={`text-slate-500 transition-transform ${isOpen ? "rotate-180" : ""}`}
                      />
                    </button>
                    {isOpen && (
                      <div className="px-4 pb-3 flex flex-wrap gap-1.5">
                        {group.verseKeys.map((vk) => (
                          <button
                            key={vk}
                            onClick={() => handleVerseKeyClick(vk)}
                            className="px-2 py-1 rounded text-xs font-mono text-emerald-400 bg-slate-800/80 border border-slate-700 hover:border-emerald-500 hover:bg-emerald-900/20 transition-colors"
                          >
                            {vk}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </>
  );
}

function TranslationTabs({ translations }: { translations: Verse["translations"] }) {
  const [activeTab, setActiveTab] = useState(0);
  const current = translations[activeTab];

  return (
    <div className="border border-slate-700/50 rounded-lg p-4">
      <div className="text-xs text-slate-500 tracking-wider mb-2">Translation</div>
      {/* Tab buttons — single line, scrollable */}
      <div className="flex gap-1 overflow-x-auto bg-slate-800/50 p-1 rounded-lg mb-3 custom-scrollbar">
        {translations.map((t, idx) => (
          <button
            key={t.id || idx}
            onClick={() => setActiveTab(idx)}
            className={`px-2.5 py-1.5 rounded-md text-xs font-bold transition-all font-vazir shrink-0 ${
              activeTab === idx
                ? "bg-slate-700 text-slate-100 shadow-sm"
                : "text-slate-500 hover:text-slate-300"
            }`}
          >
            {t.resource_name || `Translation ${idx + 1}`}
          </button>
        ))}
      </div>
      {/* Active translation */}
      {current && (
        <p
          className="text-sm text-slate-300 leading-relaxed font-vazir"
          dir={current.direction === "rtl" ? "rtl" : "ltr"}
        >
          {current.text.replace(/<[^>]*>/g, "")}
        </p>
      )}
    </div>
  );
}

export const PropertiesPanel = memo(PropertiesPanelComponent);
