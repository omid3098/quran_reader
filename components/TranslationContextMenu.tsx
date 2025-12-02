import React, { useEffect, useRef } from "react";
import { Languages } from "lucide-react";
import { TranslationService, TRANSLATION_SERVICES } from "../services/translationServices";

interface TranslationContextMenuProps {
  position: { top: number; left: number };
  word: string;
  verseKey?: string;
  targetLanguage: string;
  onClose: () => void;
  onTranslate: (service: TranslationService, word: string) => void;
}

export const TranslationContextMenu: React.FC<TranslationContextMenuProps> = ({
  position,
  word,
  verseKey: _verseKey,
  targetLanguage: _targetLanguage,
  onClose,
  onTranslate,
}) => {
  const ref = useRef<HTMLDivElement>(null);

  // Click-outside handler with delay (prevents immediate close)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        onClose();
      }
    };
    const timer = setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside);
    }, 100);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [onClose]);

  return (
    <div
      ref={ref}
      style={{ top: position.top, left: position.left }}
      className="absolute z-50 w-60 bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-100 dark:border-slate-700 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150"
    >
      {/* Header */}
      <div className="bg-slate-50 dark:bg-slate-950/50 p-3 border-b border-slate-100 dark:border-slate-800">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
          Translation Menu
        </span>
        <div className="font-quran text-lg text-slate-800 dark:text-slate-100 truncate dir-rtl text-right">
          {word}
        </div>
      </div>

      {/* Services */}
      <div className="p-1.5 space-y-0.5">
        {TRANSLATION_SERVICES.map((service) => {
          return (
            <button
              key={service.id}
              type="button"
              onClick={() => onTranslate(service, word)}
              className="w-full flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 text-slate-700 dark:text-slate-200 transition-colors group text-left"
            >
              <div className="p-1.5 rounded-md bg-slate-100 dark:bg-slate-800 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/50 text-slate-500 dark:text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                <Languages size={16} />
              </div>
              <span className="font-medium">{service.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
