import React, { memo, useState, useCallback, useEffect, useRef } from "react";
import {
  Info,
  ChevronDown,
  Link2,
  Pencil,
  Check,
  X,
  Plus,
  MousePointer,
  Trash2,
} from "lucide-react";
import type {
  PropertiesPanelSelection,
  PhraseMatch,
  PhraseMatchType,
  Verse,
  SurahGroup,
  NoteBacklink,
} from "../../types";
import type { VerseFamiliarityInfo } from "../../services/verseFamiliarityService";
import {
  saveRootNote,
  saveLemmaNote,
  saveConnection,
  deleteConnection,
  getConnectionsForVerse,
} from "../../services/knowledgeBaseService";
import { getVerseByKey } from "../../services/quranService";
import { TranslationTabs } from "./TranslationTabs";
import { useResizablePanel } from "../../hooks/useResizablePanel";

interface PropertiesPanelProps {
  selection: PropertiesPanelSelection;
  verse: Verse;
  verseFamiliarity?: VerseFamiliarityInfo;
  noteBacklinks?: NoteBacklink[];
  onNavigateToVerse: (surahId: number, verseNumber?: number) => void;
  onTogglePhraseOnCanvas?: (match: PhraseMatch, show: boolean) => void;
}

function PropertiesPanelComponent({
  selection,
  verse,
  verseFamiliarity,
  noteBacklinks,
  onNavigateToVerse,
  onTogglePhraseOnCanvas,
}: PropertiesPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { percentage: propertiesPercent, startResizing } = useResizablePanel({
    initial: 60,
    min: 30,
    max: 85,
    direction: "vertical",
    containerRef,
  });

  const hasSelection = selection && selection.type !== "verse";

  return (
    <div
      ref={containerRef}
      className="w-80 md:w-96 border-r border-slate-800 bg-slate-900/50 flex flex-col"
    >
      {/* Header */}
      <div className="p-4 border-b border-slate-800 flex items-center gap-2 text-emerald-500 bg-slate-900/50">
        <Info size={18} />
        <h2 className="font-bold text-sm tracking-tight">Properties</h2>
      </div>

      {/* Properties content (resizable top section) */}
      <div
        className="overflow-y-auto custom-scrollbar p-5 space-y-4"
        style={{ height: `${propertiesPercent}%` }}
      >
        {!hasSelection && verseFamiliarity?.hasConnections && (
          <div className="space-y-3">
            <div className="text-xs text-yellow-500 tracking-wider flex items-center gap-1.5">
              <Link2 size={14} /> Connections ({verseFamiliarity.connections.length})
            </div>
            {verseFamiliarity.connections.map((conn, i) => {
              const otherVerse =
                conn.from.verse === verse.verse_key ? conn.to.verse : conn.from.verse;
              const [surahStr, verseStr] = otherVerse.split(":");
              return (
                <div
                  key={i}
                  className="border border-yellow-700/50 rounded-lg p-3 bg-yellow-950/10"
                >
                  <button
                    onClick={() =>
                      onNavigateToVerse(parseInt(surahStr, 10), parseInt(verseStr, 10))
                    }
                    className="text-xs text-yellow-400 tracking-wider hover:underline flex items-center gap-1 mb-1.5"
                  >
                    <Link2 size={12} />
                    {otherVerse}
                  </button>
                  <p className="text-sm text-yellow-200/80 font-vazir leading-relaxed" dir="rtl">
                    {conn.reason}
                  </p>
                </div>
              );
            })}
          </div>
        )}
        {!hasSelection && noteBacklinks && noteBacklinks.length > 0 && (
          <div className="space-y-3">
            <div className="text-xs text-yellow-500 tracking-wider flex items-center gap-1.5">
              <Link2 size={14} /> Mentioned in Notes ({noteBacklinks.length})
            </div>
            {noteBacklinks.map((backlink, i) => {
              const [surahStr, verseStr] = backlink.sourceVerseKey.split(":");
              return (
                <div
                  key={i}
                  className="border border-yellow-700/50 rounded-lg p-3 bg-yellow-950/10"
                >
                  <button
                    onClick={() =>
                      onNavigateToVerse(parseInt(surahStr, 10), parseInt(verseStr, 10))
                    }
                    className="text-xs text-yellow-400 tracking-wider hover:underline flex items-center gap-1 mb-1.5"
                  >
                    <Link2 size={12} />
                    {backlink.sourceVerseKey}
                  </button>
                  <p className="text-sm text-yellow-200/60 font-vazir leading-relaxed" dir="rtl">
                    {backlink.excerpt}
                  </p>
                </div>
              );
            })}
          </div>
        )}
        {!hasSelection &&
          !verseFamiliarity?.hasConnections &&
          (!noteBacklinks || noteBacklinks.length === 0) && (
            <div className="flex flex-col items-center justify-center h-full text-slate-500 gap-3">
              <MousePointer size={24} className="text-slate-600" />
              <p className="text-sm text-center leading-relaxed">
                Click a word on the canvas
                <br />
                to see its properties
              </p>
            </div>
          )}
        {selection?.type === "word" && (
          <WordInfo
            data={selection.data}
            phraseMatches={selection.phraseMatches}
            rootNote={selection.rootNote}
            lemmaNote={selection.lemmaNote}
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
            currentVerseKey={verse.verse_key}
            matchType={selection.matchType}
            patternKeys={selection.patternKeys}
            translationIds={verse.translations.map((t) => t.resource_id)}
            onNavigateToVerse={onNavigateToVerse}
          />
        )}
      </div>

      {/* Resize handle */}
      <div
        onMouseDown={startResizing}
        className="h-2 flex-shrink-0 cursor-row-resize border-t border-b border-slate-800 bg-slate-900/80 hover:bg-slate-700/50 transition-colors flex items-center justify-center"
      >
        <div className="w-8 h-0.5 rounded-full bg-slate-600" />
      </div>

      {/* Webcam zone (clear area at bottom) */}
      <div className="flex-1" />
    </div>
  );
}

function PhraseVerseInfo({
  verseKey,
  currentVerseKey,
  matchType,
  patternKeys,
  translationIds,
  onNavigateToVerse,
}: {
  verseKey: string;
  currentVerseKey: string;
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

      {/* Connection save */}
      <ConnectionSaveField
        currentVerseKey={currentVerseKey}
        targetVerseKey={verseKey}
        matchType={matchType}
        patternKeys={patternKeys}
      />
    </>
  );
}

function ConnectionSaveField({
  currentVerseKey,
  targetVerseKey,
  matchType,
  patternKeys,
}: {
  currentVerseKey: string;
  targetVerseKey: string;
  matchType: PhraseMatchType;
  patternKeys: string[];
}) {
  const [status, setStatus] = useState<"loading" | "none" | "exists" | "editing">("loading");
  const [reason, setReason] = useState("");
  const [existingConn, setExistingConn] = useState<{
    from: string;
    to: string;
    reason: string;
  } | null>(null);

  // Check for existing connection on mount
  useEffect(() => {
    setStatus("loading");
    getConnectionsForVerse(currentVerseKey).then((connections) => {
      const existing = connections.find(
        (c) =>
          (c.from.verse === currentVerseKey && c.to.verse === targetVerseKey) ||
          (c.from.verse === targetVerseKey && c.to.verse === currentVerseKey)
      );
      if (existing) {
        setExistingConn({
          from: existing.from.verse,
          to: existing.to.verse,
          reason: existing.reason,
        });
        setStatus("exists");
      } else {
        setExistingConn(null);
        setStatus("none");
      }
    });
  }, [currentVerseKey, targetVerseKey]);

  const handleStartEditing = useCallback(() => {
    setReason(`${matchType} match: ${patternKeys.join(" ")}`);
    setStatus("editing");
  }, [matchType, patternKeys]);

  const handleSave = useCallback(async () => {
    const trimmed = reason.trim();
    if (!trimmed) return;
    await saveConnection({
      from: { verse: currentVerseKey, words: null },
      to: { verse: targetVerseKey, words: null },
      reason: trimmed,
    });
    setExistingConn({ from: currentVerseKey, to: targetVerseKey, reason: trimmed });
    setStatus("exists");
  }, [reason, currentVerseKey, targetVerseKey]);

  const handleDelete = useCallback(async () => {
    if (existingConn) {
      await deleteConnection(existingConn.from, existingConn.to);
    }
    setExistingConn(null);
    setStatus("none");
  }, [existingConn]);

  const handleCancel = useCallback(() => {
    setStatus(existingConn ? "exists" : "none");
  }, [existingConn]);

  if (status === "loading") return null;

  if (status === "editing") {
    return (
      <div className="border border-yellow-700/50 rounded-lg p-3 bg-yellow-950/10">
        <div className="text-xs text-yellow-500 tracking-wider mb-2">Save Connection</div>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="w-full rounded border border-yellow-700/50 bg-yellow-950/20 text-sm text-yellow-100 font-vazir p-2 focus:outline-none focus:border-yellow-500 resize-y min-h-[60px]"
          dir="rtl"
          placeholder="Connection reason..."
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

  if (status === "exists") {
    return (
      <div className="border border-yellow-700/50 rounded-lg p-3 bg-yellow-950/10 group">
        <div className="flex items-center justify-between mb-1">
          <div className="text-xs text-yellow-500 tracking-wider flex items-center gap-1">
            <Link2 size={12} /> Connected
          </div>
          <button
            onClick={handleDelete}
            className="opacity-0 group-hover:opacity-100 p-1 rounded text-red-500/60 hover:text-red-400 transition-all"
            title="Remove connection"
          >
            <Trash2 size={12} />
          </button>
        </div>
        <p className="text-sm text-yellow-200/80 font-vazir leading-relaxed" dir="rtl">
          {existingConn?.reason}
        </p>
      </div>
    );
  }

  // status === "none"
  return (
    <button
      onClick={handleStartEditing}
      className="flex items-center gap-1.5 text-xs text-yellow-600/50 hover:text-yellow-500 transition-colors"
    >
      <Plus size={12} /> Save connection to {currentVerseKey}
    </button>
  );
}

function WordInfo({
  data,
  phraseMatches,
  rootNote: initialRootNote,
  lemmaNote: initialLemmaNote,
  onTogglePhraseOnCanvas,
}: {
  data: NonNullable<Extract<PropertiesPanelSelection, { type: "word" }>["data"]>;
  phraseMatches?: PhraseMatch[];
  rootNote?: string;
  lemmaNote?: string;
  onTogglePhraseOnCanvas?: (match: PhraseMatch, show: boolean) => void;
}) {
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
  onTogglePhraseOnCanvas,
}: {
  matchType: PhraseMatchType;
  matches: PhraseMatch[];
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

export const PropertiesPanel = memo(PropertiesPanelComponent);
