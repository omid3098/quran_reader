import React, { useState, useEffect } from "react";
import { Save, Trash2 } from "lucide-react";

interface NoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  surahName: string;
  verseKey: string;
  initialText: string;
  onSave: (text: string) => void;
  onDelete: () => void;
  fontSize: number;
}

export const NoteModal: React.FC<NoteModalProps> = ({
  isOpen,
  onClose,
  initialText,
  onSave,
  onDelete,
  fontSize,
  verseKey,
}) => {
  const [text, setText] = useState(initialText);

  // Reset text when modal opens with new props
  useEffect(() => {
    if (isOpen) {
      setText(initialText);
    }
  }, [isOpen, initialText]);

  if (!isOpen) return null;

  const isRtl = /[\u0600-\u06FF]/.test(text);
  // Slightly larger base font for readability in the focused modal
  const noteFontSize = Math.max(16, Math.round(fontSize * 0.6));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-200 cursor-pointer"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-900 w-full max-w-2xl h-[50vh] md:h-[60vh] rounded-2xl shadow-2xl overflow-hidden relative animate-in zoom-in-95 duration-200 ring-1 ring-slate-200 dark:ring-slate-800 flex flex-col cursor-default"
        onClick={(e) => e.stopPropagation()}
      >
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          dir={isRtl ? "rtl" : "ltr"}
          placeholder="Write your reflections here..."
          style={{ fontSize: `${noteFontSize}px` }}
          className={`
            flex-1 w-full p-8 pb-24 bg-transparent border-none outline-none resize-none
            text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-600
            custom-scrollbar leading-relaxed
            ${isRtl ? "font-vazir" : "font-sans"}
          `}
          autoFocus
        />

        {/* Bottom Left: Surah:Verse Indicator */}
        <div className="absolute bottom-6 left-8 pointer-events-none select-none">
          <span className="text-xl font-bold text-slate-200 dark:text-slate-800 font-sans">
            {verseKey}
          </span>
        </div>

        {/* Bottom Right: Actions */}
        <div className="absolute bottom-6 right-6 flex items-center gap-3">
          {initialText && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (window.confirm("Delete this note?")) {
                  onDelete();
                  onClose();
                }
              }}
              className="p-3 text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm rounded-full shadow-sm border border-slate-200 dark:border-slate-700 transition-colors"
              title="Delete Note"
            >
              <Trash2 size={20} />
            </button>
          )}

          <button
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="px-5 py-2.5 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full shadow-sm border border-slate-200 dark:border-slate-700 text-sm font-medium transition-colors"
          >
            Cancel
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onSave(text);
              onClose();
            }}
            className="flex items-center gap-2 px-6 py-2.5 bg-yellow-400 hover:bg-yellow-500 text-yellow-950 text-sm font-bold rounded-full shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5"
          >
            <Save size={18} />
            Save Note
          </button>
        </div>
      </div>
    </div>
  );
};
