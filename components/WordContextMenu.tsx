import React, { useEffect, useRef } from "react";
import { Search, Calculator } from "lucide-react";

interface WordContextMenuProps {
  position: { x: number; y: number };
  word: string;
  onClose: () => void;
  onSelectVajehyab: () => void;
  onSelectAbjad: () => void;
}

export const WordContextMenu: React.FC<WordContextMenuProps> = ({
  position,
  word,
  onClose,
  onSelectVajehyab,
  onSelectAbjad,
}) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        onClose();
      }
    };
    // Small delay to prevent immediate closing if the click that opened it propagates
    const timer = setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside);
    }, 100);

    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [onClose]);

  // Adjust position to keep within viewport (basic logic)
  const style: React.CSSProperties = {
    top: Math.min(position.y, window.innerHeight - 150),
    left: Math.min(position.x, window.innerWidth - 220),
  };

  return (
    <div
      ref={ref}
      className="fixed z-[55] bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-100 dark:border-slate-700 py-1 min-w-[220px] animate-in fade-in zoom-in-95 duration-100 overflow-hidden"
      style={style}
    >
      <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700 mb-1 bg-slate-50/50 dark:bg-slate-900/50">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
          Selected Word
        </span>
        <div className="font-quran text-xl text-emerald-600 dark:text-emerald-400 truncate mt-1 text-center">
          {word}
        </div>
      </div>
      <button
        onClick={() => {
          onSelectVajehyab();
          onClose();
        }}
        className="w-full text-left px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-3 text-slate-700 dark:text-slate-200 transition-colors"
      >
        <Search size={18} className="text-slate-400" />
        <span className="font-medium">Translation (Vajehyab)</span>
      </button>
      <button
        onClick={() => {
          onSelectAbjad();
          onClose();
        }}
        className="w-full text-left px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-3 text-slate-700 dark:text-slate-200 transition-colors"
      >
        <Calculator size={18} className="text-slate-400" />
        <span className="font-medium">Abjad Calculation</span>
      </button>
    </div>
  );
};
