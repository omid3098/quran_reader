import React from "react";
import type { UserLanguage } from "@/types";

interface LanguageSelectionModalProps {
  isOpen: boolean;
  onSelectLanguage: (language: UserLanguage) => void;
}

export const LanguageSelectionModal: React.FC<LanguageSelectionModalProps> = ({
  isOpen,
  onSelectLanguage,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 ring-1 ring-slate-200 dark:ring-slate-800"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-8 text-center">
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-2">Welcome</h2>
          <p className="text-slate-600 dark:text-slate-400 mb-8">
            Please select your preferred language
          </p>

          <div className="flex flex-col gap-4">
            <button
              onClick={() => onSelectLanguage("en")}
              className="w-full py-4 px-6 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl text-lg font-medium text-slate-800 dark:text-slate-200 transition-colors border border-slate-200 dark:border-slate-700"
            >
              English
            </button>
            <button
              onClick={() => onSelectLanguage("fa")}
              className="w-full py-4 px-6 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl text-lg font-medium text-slate-800 dark:text-slate-200 transition-colors border border-slate-200 dark:border-slate-700 font-vazir"
              dir="rtl"
            >
              فارسی
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
