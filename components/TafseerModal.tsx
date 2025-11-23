import React from "react";
import { X, Sparkles } from "lucide-react";
import { Spinner } from "./Spinner";

interface TafseerModalProps {
  isOpen: boolean;
  onClose: () => void;
  loading: boolean;
  content: string;
  surahName: string;
  verseKey: string;
}

export const TafseerModal: React.FC<TafseerModalProps> = ({
  isOpen,
  onClose,
  loading,
  content,
  surahName,
  verseKey,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200 cursor-pointer"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden relative cursor-default"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="h-2 bg-gradient-to-r from-emerald-400 to-emerald-600 w-full"></div>
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
        >
          <X size={20} />
        </button>

        <div className="p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-emerald-50 dark:bg-emerald-900/30 rounded-full text-emerald-600 dark:text-emerald-400">
              <Sparkles size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
                Tafseer & Insight
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Surah {surahName}, Ayah {verseKey.split(":")[1]}
              </p>
            </div>
          </div>

          <div className="min-h-[200px] bg-slate-50 dark:bg-slate-800/50 rounded-xl p-6 border border-slate-100 dark:border-slate-800">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-full space-y-4 text-slate-400 dark:text-slate-500">
                <Spinner className="w-8 h-8 text-emerald-500" />
                <p className="text-sm animate-pulse">Generating explanation...</p>
              </div>
            ) : (
              <div className="prose prose-slate dark:prose-invert prose-sm md:prose-base">
                <p className="text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                  {content}
                </p>
              </div>
            )}
          </div>

          <div className="mt-6 flex justify-end">
            <button
              onClick={onClose}
              className="px-5 py-2 bg-slate-800 dark:bg-slate-700 text-white text-sm font-medium rounded-lg hover:bg-slate-700 dark:hover:bg-slate-600 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
