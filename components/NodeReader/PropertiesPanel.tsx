import React, { memo, useState } from "react";
import { Info } from "lucide-react";
import type { PropertiesPanelSelection, Verse, Chapter } from "../../types";

interface PropertiesPanelProps {
  selection: PropertiesPanelSelection;
  verse: Verse;
  chapter: Chapter;
}

function PropertiesPanelComponent({ selection, verse, chapter }: PropertiesPanelProps) {
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
          <RootInfo data={selection.data} analysis={selection.analysis} />
        )}
        {selection?.type === "verseKey" && <VerseKeyInfo data={selection.data} />}
      </div>
    </div>
  );
}

function VerseInfo({ verse, chapter }: { verse: Verse; chapter: Chapter }) {
  return (
    <>
      <div>
        <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Verse</div>
        <div className="text-lg text-emerald-400 font-bold">{verse.verse_key}</div>
        <div className="text-sm text-slate-400">{chapter.name_simple}</div>
        <div className="text-sm text-slate-500">{chapter.name_arabic}</div>
      </div>
      <div>
        <div className="text-xs text-slate-500 uppercase tracking-wider mb-2">Arabic Text</div>
        <p className="font-quran text-lg text-slate-200 leading-[2] dir-rtl" dir="rtl">
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
      <div>
        <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Word</div>
        <div className="font-quran text-3xl text-slate-100 dir-rtl" dir="rtl">
          {data.word}
        </div>
      </div>
      {data.root && (
        <div>
          <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Root</div>
          <div className="font-quran text-xl text-indigo-300">{data.root.split("").join(" ")}</div>
        </div>
      )}
      {data.lemma && (
        <div>
          <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Lemma</div>
          <div className="font-quran text-lg text-slate-300">{data.lemma}</div>
        </div>
      )}
      <div>
        <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Position</div>
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
}: {
  data: NonNullable<Extract<PropertiesPanelSelection, { type: "root" }>["data"]>;
  analysis?: NonNullable<Extract<PropertiesPanelSelection, { type: "root" }>["analysis"]>;
}) {
  return (
    <>
      <div>
        <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Root</div>
        <div className="font-quran text-2xl text-indigo-300">{data.root.split("").join(" ")}</div>
      </div>
      {analysis && (
        <>
          <div>
            <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Occurrences</div>
            <div className="text-sm text-slate-300">{analysis.occurrences} verses</div>
          </div>
          {analysis.wordForms.length > 0 && (
            <div>
              <div className="text-xs text-slate-500 uppercase tracking-wider mb-2">Word Forms</div>
              <div className="flex flex-wrap gap-2" dir="rtl">
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
            </div>
          )}
        </>
      )}
    </>
  );
}

function TranslationTabs({ translations }: { translations: Verse["translations"] }) {
  const [activeTab, setActiveTab] = useState(0);
  const current = translations[activeTab];

  return (
    <div>
      <div className="text-xs text-slate-500 uppercase tracking-wider mb-2">Translation</div>
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

function VerseKeyInfo({
  data,
}: {
  data: NonNullable<Extract<PropertiesPanelSelection, { type: "verseKey" }>["data"]>;
}) {
  return (
    <div>
      <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Verse Reference</div>
      <div className="text-lg text-emerald-400 font-mono">{data.verseKey}</div>
      <div className="text-xs text-slate-500 mt-2">Click to navigate to this verse</div>
    </div>
  );
}

export const PropertiesPanel = memo(PropertiesPanelComponent);
