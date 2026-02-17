import React, { memo, useState, useCallback } from "react";
import { Info, ChevronDown, Link2 } from "lucide-react";
import type {
  PropertiesPanelSelection,
  PhraseMatch,
  PhraseMatchType,
  Verse,
  Chapter,
  SurahGroup,
} from "../../types";

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
        {selection?.type === "word" && (
          <WordInfo
            data={selection.data}
            phraseMatches={selection.phraseMatches}
            onNavigateToVerse={onNavigateToVerse}
          />
        )}
        {selection?.type === "root" && (
          <RootInfo
            data={selection.data}
            analysis={selection.analysis}
            surahGroups={selection.surahGroups}
            rootNote={selection.rootNote}
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
  phraseMatches,
  onNavigateToVerse,
}: {
  data: NonNullable<Extract<PropertiesPanelSelection, { type: "word" }>["data"]>;
  phraseMatches?: PhraseMatch[];
  onNavigateToVerse: (surahId: number, verseNumber?: number) => void;
}) {
  const handleVerseClick = useCallback(
    (verseKey: string) => {
      const [surahStr, verseStr] = verseKey.split(":");
      onNavigateToVerse(parseInt(surahStr, 10), parseInt(verseStr, 10));
    },
    [onNavigateToVerse]
  );

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

      {/* Phrase Matches — grouped by match type */}
      {phraseMatches && phraseMatches.length > 0 && (
        <>
          {(["lemma", "root"] as PhraseMatchType[]).map((type) => {
            const grouped = phraseMatches.filter((m) => m.matchType === type);
            if (grouped.length === 0) return null;
            return (
              <PhraseMatchesSection
                key={type}
                matchType={type}
                matches={grouped}
                onNavigateToVerse={handleVerseClick}
              />
            );
          })}
        </>
      )}
    </>
  );
}

function RootInfo({
  data,
  analysis,
  surahGroups,
  rootNote,
  onNavigateToVerse,
}: {
  data: NonNullable<Extract<PropertiesPanelSelection, { type: "root" }>["data"]>;
  analysis?: NonNullable<Extract<PropertiesPanelSelection, { type: "root" }>["analysis"]>;
  surahGroups?: SurahGroup[];
  rootNote?: string;
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
      {rootNote && (
        <div className="border border-yellow-700/50 rounded-lg p-4 bg-yellow-900/10">
          <div className="text-xs text-yellow-500 tracking-wider mb-1">Note</div>
          <p className="text-sm text-yellow-200/80 font-vazir leading-relaxed" dir="rtl">
            {rootNote}
          </p>
        </div>
      )}
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

const PHRASE_SECTION_STYLES: Record<
  PhraseMatchType,
  {
    border: string;
    bg: string;
    icon: string;
    label: string;
    text: string;
    textMuted: string;
    btnText: string;
    btnBg: string;
    btnBorder: string;
    btnHover: string;
    divider: string;
    hoverBg: string;
  }
> = {
  lemma: {
    border: "border-amber-800/50",
    bg: "bg-amber-950/10",
    icon: "text-amber-500",
    label: "Shared Phrases",
    text: "text-amber-200",
    textMuted: "text-amber-500/60",
    btnText: "text-amber-400",
    btnBg: "bg-amber-950/50",
    btnBorder: "border-amber-800/50",
    btnHover: "hover:border-amber-500 hover:bg-amber-900/30",
    divider: "divide-amber-900/30",
    hoverBg: "hover:bg-amber-900/10",
  },
  root: {
    border: "border-teal-800/50",
    bg: "bg-teal-950/10",
    icon: "text-teal-500",
    label: "Shared Patterns (root)",
    text: "text-teal-200",
    textMuted: "text-teal-500/60",
    btnText: "text-teal-400",
    btnBg: "bg-teal-950/50",
    btnBorder: "border-teal-800/50",
    btnHover: "hover:border-teal-500 hover:bg-teal-900/30",
    divider: "divide-teal-900/30",
    hoverBg: "hover:bg-teal-900/10",
  },
};

function PhraseMatchesSection({
  matchType,
  matches,
  onNavigateToVerse,
}: {
  matchType: PhraseMatchType;
  matches: PhraseMatch[];
  onNavigateToVerse: (verseKey: string) => void;
}) {
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const s = PHRASE_SECTION_STYLES[matchType];

  return (
    <div className={`border ${s.border} rounded-lg overflow-hidden ${s.bg}`}>
      <div className="px-4 py-3 flex items-center gap-2">
        <Link2 size={14} className={s.icon} />
        <span className={`text-xs ${s.icon} tracking-wider`}>
          {s.label} ({matches.length})
        </span>
      </div>
      <div className={`divide-y ${s.divider}`}>
        {matches.map((match, idx) => {
          const isOpen = expandedIdx === idx;
          return (
            <div key={idx}>
              <button
                onClick={() => setExpandedIdx(isOpen ? null : idx)}
                className={`w-full flex items-center justify-between px-4 py-2.5 text-left ${s.hoverBg} transition-colors`}
              >
                <span className={`font-quran text-sm ${s.text}`} dir="rtl">
                  {match.keys.join(" ")}
                </span>
                <span className="flex items-center gap-1.5">
                  <span className={`text-xs ${s.textMuted}`}>
                    {match.otherOccurrences.length} other
                  </span>
                  <ChevronDown
                    size={14}
                    className={`${s.textMuted} transition-transform ${isOpen ? "rotate-180" : ""}`}
                  />
                </span>
              </button>
              {isOpen && (
                <div className="px-4 pb-3 flex flex-wrap gap-1.5">
                  {match.otherOccurrences.map((occ) => (
                    <button
                      key={occ.verse}
                      onClick={() => onNavigateToVerse(occ.verse)}
                      className={`px-2 py-1 rounded text-xs font-mono ${s.btnText} ${s.btnBg} border ${s.btnBorder} ${s.btnHover} transition-colors`}
                    >
                      {occ.verse}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
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
