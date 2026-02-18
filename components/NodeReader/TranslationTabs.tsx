import React, { memo, useState } from "react";
import type { Verse } from "../../types";

interface TranslationTabsProps {
  translations: Verse["translations"];
  /** When true, removes the outer border/label wrapper (used inside BottomPanel) */
  compact?: boolean;
}

function TranslationTabsComponent({ translations, compact }: TranslationTabsProps) {
  const [activeTab, setActiveTab] = useState(0);
  const current = translations[activeTab];

  const content = (
    <>
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
    </>
  );

  if (compact) return <div>{content}</div>;

  return (
    <div className="border border-slate-700/50 rounded-lg p-4">
      <div className="text-xs text-slate-500 tracking-wider mb-2">Translation</div>
      {content}
    </div>
  );
}

export const TranslationTabs = memo(TranslationTabsComponent);
