import React, { useEffect, useRef } from "react";
import { Search, BookOpen, Copy, Languages } from "lucide-react";
import { SelectionContext, UserLanguage } from "../types";
import { getServicesForLanguage, TranslationService } from "../services/translationServices";

interface SmartContextMenuProps {
  context: SelectionContext;
  onClose: () => void;
  onAnalyzeRoot: () => void;
  onSearchPhrase: () => void;
  onCopy: () => void;
  onTranslate: (service: TranslationService, word: string) => void;
  userLanguage: UserLanguage;
  hideCopy?: boolean;
}

export const SmartContextMenu: React.FC<SmartContextMenuProps> = ({
  context,
  onClose,
  onAnalyzeRoot,
  onSearchPhrase,
  onCopy,
  onTranslate,
  userLanguage,
  hideCopy,
}) => {
  const ref = useRef<HTMLDivElement>(null);

  // Get translation services available for user's language
  const translationServices = getServicesForLanguage(userLanguage);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  // Calculate Position (keep it within viewport)
  const left = Math.min(context.rect.left, window.innerWidth - 240);
  const top = context.rect.bottom + 10;

  // Ensure it doesn't go off bottom
  const correctedTop = top + 200 > window.innerHeight ? context.rect.top - 200 : top;

  return (
    <div
      ref={ref}
      style={{ top: correctedTop, left }}
      className="fixed z-50 w-60 bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-100 dark:border-slate-700 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150"
    >
      <div className="bg-slate-50 dark:bg-slate-950/50 p-3 border-b border-slate-100 dark:border-slate-800">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
          {context.type === "single" ? "Word" : "Phrase"}
        </span>
        <div className="font-quran text-lg text-slate-800 dark:text-slate-100 truncate dir-rtl text-right">
          {context.text}
        </div>
      </div>

      <div className="p-1.5 space-y-0.5">
        {context.type === "single" ? (
          <button
            onClick={onAnalyzeRoot}
            className="w-full flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-900/20 text-slate-700 dark:text-slate-200 transition-colors group"
          >
            <div className="p-1.5 rounded-md bg-slate-100 dark:bg-slate-800 group-hover:bg-emerald-100 dark:group-hover:bg-emerald-900/50 text-slate-500 dark:text-slate-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
              <BookOpen size={16} />
            </div>
            <div className="flex flex-col items-start">
              <span className="font-medium">Analyze</span>
              <span className="text-[10px] text-slate-400">View word details & root</span>
            </div>
          </button>
        ) : (
          <button
            onClick={onSearchPhrase}
            className="w-full flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-900/20 text-slate-700 dark:text-slate-200 transition-colors group"
          >
            <div className="p-1.5 rounded-md bg-slate-100 dark:bg-slate-800 group-hover:bg-emerald-100 dark:group-hover:bg-emerald-900/50 text-slate-500 dark:text-slate-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
              <Search size={16} />
            </div>
            <div className="flex flex-col items-start">
              <span className="font-medium">Search Phrase</span>
              <span className="text-[10px] text-slate-400">Find exact matches</span>
            </div>
          </button>
        )}

        {/* Translation options - only for single words */}
        {context.type === "single" &&
          translationServices.map((service) => (
            <button
              key={service.id}
              onClick={() => onTranslate(service, context.text)}
              className="w-full flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 text-slate-700 dark:text-slate-200 transition-colors group"
            >
              <div className="p-1.5 rounded-md bg-slate-100 dark:bg-slate-800 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/50 text-slate-500 dark:text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                <Languages size={16} />
              </div>
              <span className="font-medium">{service.name}</span>
            </button>
          ))}

        {!hideCopy && (
          <button
            onClick={onCopy}
            className="w-full flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors group"
          >
            <div className="p-1.5 rounded-md bg-slate-100 dark:bg-slate-800 group-hover:bg-slate-200 dark:group-hover:bg-slate-700 text-slate-500 dark:text-slate-400 transition-colors">
              <Copy size={16} />
            </div>
            <span className="font-medium">Copy with Citation</span>
          </button>
        )}
      </div>
    </div>
  );
};
