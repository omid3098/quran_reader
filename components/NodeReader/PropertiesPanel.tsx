import React, { memo, useState, useCallback, useEffect, useRef } from "react";
import { Info, ChevronDown, Link2, Pencil, Check, X, Plus } from "lucide-react";
import type {
  PropertiesPanelSelection,
  PhraseMatch,
  PhraseMatchType,
  Verse,
  Chapter,
  SurahGroup,
} from "../../types";
import { saveRootNote, saveLemmaNote } from "../../services/knowledgeBaseService";
import { getVerseByKey } from "../../services/quranService";

interface PropertiesPanelProps {
  selection: PropertiesPanelSelection;
  verse: Verse;
  chapter: Chapter;
  onNavigateToVerse: (surahId: number, verseNumber?: number) => void;
  onTogglePhraseOnCanvas?: (match: PhraseMatch, show: boolean) => void;
}

function PropertiesPanelComponent({
  selection,
  verse,
  chapter,
  onNavigateToVerse,
  onTogglePhraseOnCanvas,
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
            rootNote={selection.rootNote}
            lemmaNote={selection.lemmaNote}
            onNavigateToVerse={onNavigateToVerse}
            onTogglePhraseOnCanvas={onTogglePhraseOnCanvas}
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
        {selection?.type === "phraseVerse" && (
          <PhraseVerseInfo
            verseKey={selection.verseKey}
            matchType={selection.matchType}
            patternKeys={selection.patternKeys}
            translationIds={verse.translations.map((t) => t.resource_id)}
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

function PhraseVerseInfo({
  verseKey,
  matchType,
  patternKeys,
  translationIds,
  onNavigateToVerse,
}: {
  verseKey: string;
  matchType: PhraseMatchType;
  patternKeys: string[];
  translationIds: string[];
  onNavigateToVerse: (surahId: number, verseNumber?: number) => void;
}) {
  const [verse, setVerse] = useState<Verse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getVerseByKey(verseKey, translationIds).then((v) => {
      setVerse(v);
      setLoading(false);
    });
  }, [verseKey, translationIds]);

  const handleNavigate = useCallback(() => {
    const [surahStr, verseStr] = verseKey.split(":");
    onNavigateToVerse(parseInt(surahStr, 10), parseInt(verseStr, 10));
  }, [verseKey, onNavigateToVerse]);

  const s = PHRASE_SECTION_STYLES[matchType];

  return (
    <>
      {/* Header badge */}
      <div className={`border ${s.border} rounded-lg p-3 ${s.bg} flex items-center gap-2`}>
        <button
          onClick={handleNavigate}
          className={`text-xs ${s.icon} tracking-wider hover:underline flex items-center gap-1`}
        >
          <Link2 size={12} />
          {verseKey}
        </button>
        <span className="text-slate-600 mx-1">·</span>
        <span className={`font-quran text-sm ${s.text}`} dir="rtl">
          {patternKeys.join(" ")}
        </span>
      </div>

      {/* Verse content */}
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="w-5 h-5 border-2 border-slate-600 border-t-slate-300 rounded-full animate-spin" />
        </div>
      ) : verse ? (
        <>
          <div className="border border-slate-700/50 rounded-lg p-4">
            <p className="font-quran text-lg text-slate-200 leading-[2]" dir="rtl">
              {verse.text_uthmani}
            </p>
          </div>
          {verse.translations.length > 0 && <TranslationTabs translations={verse.translations} />}
        </>
      ) : (
        <div className="text-sm text-slate-500 text-center py-4">Could not load verse</div>
      )}
    </>
  );
}

function WordInfo({
  data,
  phraseMatches,
  rootNote: initialRootNote,
  lemmaNote: initialLemmaNote,
  onNavigateToVerse,
  onTogglePhraseOnCanvas,
}: {
  data: NonNullable<Extract<PropertiesPanelSelection, { type: "word" }>["data"]>;
  phraseMatches?: PhraseMatch[];
  rootNote?: string;
  lemmaNote?: string;
  onNavigateToVerse: (surahId: number, verseNumber?: number) => void;
  onTogglePhraseOnCanvas?: (match: PhraseMatch, show: boolean) => void;
}) {
  const handleVerseClick = useCallback(
    (verseKey: string) => {
      const [surahStr, verseStr] = verseKey.split(":");
      onNavigateToVerse(parseInt(surahStr, 10), parseInt(verseStr, 10));
    },
    [onNavigateToVerse]
  );

  const handleSaveRootNote = useCallback(
    (note: string) => {
      if (data.root) saveRootNote(data.root, note, data.verseKey);
    },
    [data.root, data.verseKey]
  );

  const handleSaveLemmaNote = useCallback(
    (note: string) => {
      if (data.lemma) saveLemmaNote(data.lemma, note, data.root, data.verseKey);
    },
    [data.lemma, data.root, data.verseKey]
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
          <KBNoteField
            label="Root note"
            initialNote={initialRootNote}
            onSave={handleSaveRootNote}
          />
        </div>
      )}
      {data.lemma && (
        <div className="border border-slate-700/50 rounded-lg p-4">
          <div className="text-xs text-slate-500 tracking-wider mb-1">Lemma</div>
          <div className="font-quran text-lg text-slate-300">{data.lemma}</div>
          <KBNoteField
            label="Lemma note"
            initialNote={initialLemmaNote}
            onSave={handleSaveLemmaNote}
          />
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
                onTogglePhraseOnCanvas={onTogglePhraseOnCanvas}
              />
            );
          })}
        </>
      )}
    </>
  );
}

function KBNoteField({
  label,
  initialNote,
  onSave,
}: {
  label: string;
  initialNote?: string;
  onSave: (note: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(initialNote || "");
  const [savedNote, setSavedNote] = useState(initialNote);

  // Sync with new props when a different word is clicked
  const noteToShow = editing ? undefined : (savedNote ?? initialNote);

  const handleEdit = useCallback(() => {
    setDraft(savedNote ?? initialNote ?? "");
    setEditing(true);
  }, [savedNote, initialNote]);

  const handleCancel = useCallback(() => {
    setEditing(false);
  }, []);

  const handleSave = useCallback(() => {
    const trimmed = draft.trim();
    onSave(trimmed);
    setSavedNote(trimmed || undefined);
    setEditing(false);
  }, [draft, onSave]);

  if (editing) {
    return (
      <div className="mt-2">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          className="w-full rounded border border-yellow-700/50 bg-yellow-950/20 text-sm text-yellow-100 font-vazir p-2 focus:outline-none focus:border-yellow-500 resize-y min-h-[60px]"
          dir="rtl"
          placeholder={`${label}...`}
          autoFocus
        />
        <div className="flex gap-1.5 mt-1.5">
          <button
            onClick={handleSave}
            className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-yellow-700/30 text-yellow-300 hover:bg-yellow-700/50 transition-colors"
          >
            <Check size={12} /> Save
          </button>
          <button
            onClick={handleCancel}
            className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-slate-700/30 text-slate-400 hover:bg-slate-700/50 transition-colors"
          >
            <X size={12} /> Cancel
          </button>
        </div>
      </div>
    );
  }

  if (noteToShow) {
    return (
      <div className="mt-2 group">
        <div className="flex items-start gap-1.5">
          <p className="text-sm text-yellow-200/80 font-vazir leading-relaxed flex-1" dir="rtl">
            {noteToShow}
          </p>
          <button
            onClick={handleEdit}
            className="opacity-0 group-hover:opacity-100 p-1 rounded text-yellow-500/60 hover:text-yellow-400 transition-all"
            title="Edit note"
          >
            <Pencil size={12} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={handleEdit}
      className="mt-2 flex items-center gap-1 text-xs text-yellow-600/50 hover:text-yellow-500 transition-colors"
    >
      <Plus size={12} /> {label}
    </button>
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
    label: "Shared Lemma Patterns",
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
    label: "Shared Root Patterns",
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

const TOGGLE_STYLES = {
  lemma: { track: "bg-amber-600", knob: "bg-amber-200" },
  root: { track: "bg-teal-600", knob: "bg-teal-200" },
} as const;

function PhraseToggle({ on, matchType }: { on: boolean; matchType: PhraseMatchType }) {
  const ts = TOGGLE_STYLES[matchType];
  return (
    <div
      className={`w-8 h-4 rounded-full transition-colors duration-200 relative flex-shrink-0 ${
        on ? ts.track : "bg-slate-700"
      }`}
    >
      <div
        className={`w-3 h-3 rounded-full absolute top-0.5 transition-all duration-200 ${
          on ? `${ts.knob} left-[18px]` : "bg-slate-500 left-0.5"
        }`}
      />
    </div>
  );
}

function PhraseMatchesSection({
  matchType,
  matches,
  onNavigateToVerse,
  onTogglePhraseOnCanvas,
}: {
  matchType: PhraseMatchType;
  matches: PhraseMatch[];
  onNavigateToVerse: (verseKey: string) => void;
  onTogglePhraseOnCanvas?: (match: PhraseMatch, show: boolean) => void;
}) {
  const [toggledSet, setToggledSet] = useState<Set<number>>(new Set());
  const s = PHRASE_SECTION_STYLES[matchType];

  // Reset toggles when matches change (new word selected)
  const matchesKeyRef = useRef("");
  const newKey = matches.map((m) => m.keys.join(",")).join("|");
  if (newKey !== matchesKeyRef.current) {
    matchesKeyRef.current = newKey;
    if (toggledSet.size > 0) setToggledSet(new Set());
  }

  const handleToggle = useCallback(
    (idx: number, match: PhraseMatch) => {
      setToggledSet((prev) => {
        const next = new Set(prev);
        const isOn = next.has(idx);
        if (isOn) {
          next.delete(idx);
          onTogglePhraseOnCanvas?.(match, false);
        } else {
          next.add(idx);
          onTogglePhraseOnCanvas?.(match, true);
        }
        return next;
      });
    },
    [onTogglePhraseOnCanvas]
  );

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
          const isOn = toggledSet.has(idx);
          return (
            <div key={idx}>
              <button
                onClick={() => handleToggle(idx, match)}
                className={`w-full flex items-center justify-between px-4 py-2.5 text-left ${s.hoverBg} transition-colors`}
              >
                <span className={`font-quran text-sm ${s.text}`} dir="rtl">
                  {match.keys.join(" ")}
                </span>
                <span className="flex items-center gap-2">
                  <span className={`text-xs ${s.textMuted}`}>
                    {match.otherOccurrences.length} other
                  </span>
                  <PhraseToggle on={isOn} matchType={matchType} />
                </span>
              </button>
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
