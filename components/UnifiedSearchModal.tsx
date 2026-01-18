import React, { useState, useEffect } from "react";
import { X, Search } from "lucide-react";
import { useUnifiedSearch, SearchResult, SearchTab } from "../hooks/useUnifiedSearch";
import { Verse } from "../types";
import { NoteSearchResult } from "../hooks/useNotes";

interface UnifiedSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (surahId: number, ayahNum: number) => void;
  currentVerses: Verse[];
  currentChapterId: number | null;
  currentChapterName?: string;
  noteSearchResults: NoteSearchResult[];
  onSearchNotes: (query: string) => void;
  getSurahName?: (surahId: number) => string | undefined;
}

/**
 * UnifiedSearchModal component
 *
 * A modal with 3 tabs for searching:
 * - Current Surah: Search in currently loaded verses
 * - Whole Quran: Search across entire Quran
 * - My Notes: Search in user notes
 *
 * Replaces browser Ctrl+F which breaks with virtual scrolling.
 */
export const UnifiedSearchModal: React.FC<UnifiedSearchModalProps> = ({
  isOpen,
  onClose,
  onNavigate,
  currentVerses,
  currentChapterId,
  currentChapterName,
  noteSearchResults,
  onSearchNotes,
  getSurahName,
}) => {
  const [inputQuery, setInputQuery] = useState("");

  const { query, setQuery, activeTab, setActiveTab, results } = useUnifiedSearch({
    currentVerses,
    currentChapterId,
    getSurahName,
  });

  // Update search when input changes (debounced in hook)
  useEffect(() => {
    setQuery(inputQuery);
    if (activeTab === "notes") {
      onSearchNotes(inputQuery);
    }
  }, [inputQuery, setQuery, activeTab, onSearchNotes]);

  // Reset query when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setInputQuery("");
      setQuery("");
    }
  }, [isOpen, setQuery]);

  if (!isOpen) return null;

  const handleResultClick = (result: SearchResult | NoteSearchResult) => {
    const [surahId, ayahNum] = result.verseKey.split(":").map(Number);
    onNavigate(surahId, ayahNum);
    onClose();
  };

  const tabs: { id: SearchTab; label: string; disabled?: boolean }[] = [
    {
      id: "current",
      label: currentChapterName ? `Current: ${currentChapterName}` : "Current Surah",
    },
    { id: "quran", label: "Whole Quran", disabled: true }, // Disabled until implemented
    { id: "notes", label: "My Notes" },
  ];

  const displayResults: (SearchResult | NoteSearchResult)[] =
    activeTab === "notes" ? noteSearchResults : results;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200 cursor-pointer"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-900 w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh] cursor-default"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-500">
            <Search size={20} />
            <h3 className="font-semibold">Search</h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-500 dark:text-slate-400"
            aria-label="Close search"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => !tab.disabled && setActiveTab(tab.id)}
              disabled={tab.disabled}
              className={`
                flex-1 px-4 py-3 font-medium text-sm transition-colors border-b-2
                ${
                  activeTab === tab.id
                    ? "border-emerald-600 text-emerald-700 dark:text-emerald-500"
                    : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
                }
                ${tab.disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
              `}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="p-6 bg-white dark:bg-slate-900">
          <div className="relative">
            <input
              type="text"
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              placeholder={
                activeTab === "current"
                  ? "Search in current surah..."
                  : activeTab === "quran"
                    ? "Search across all surahs..."
                    : "Search in your notes..."
              }
              className="w-full pl-5 pr-14 py-4 text-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all shadow-inner text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500"
              autoFocus
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-slate-400 dark:text-slate-500">
              <Search size={20} />
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/30 dark:bg-slate-950/30">
          {!query.trim() ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400 dark:text-slate-500">
              <Search size={48} className="mb-4 opacity-50" />
              <p>Start typing to search...</p>
              <p className="text-sm mt-2">Tip: Use Ctrl+F (or Cmd+F) to open this search</p>
            </div>
          ) : displayResults.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400 dark:text-slate-500">
              <p>No results found for "{query}"</p>
            </div>
          ) : (
            <div className="space-y-3">
              {displayResults.map((result, index) => (
                <button
                  key={`${result.verseKey}-${index}`}
                  onClick={() => handleResultClick(result)}
                  className="w-full p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl hover:border-emerald-500 dark:hover:border-emerald-600 hover:shadow-md transition-all text-left group"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm font-medium text-emerald-700 dark:text-emerald-500">
                          {result.verseKey}
                        </span>
                        {"matchType" in result && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                            {result.matchType}
                          </span>
                        )}
                      </div>
                      <p
                        className="text-slate-700 dark:text-slate-300 line-clamp-2 text-sm"
                        dangerouslySetInnerHTML={{
                          __html: result.excerpt,
                        }}
                      />
                    </div>
                    <div className="text-slate-400 dark:text-slate-500 group-hover:text-emerald-600 dark:group-hover:text-emerald-500 transition-colors">
                      →
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center justify-between text-sm text-slate-500 dark:text-slate-400">
            <span>
              {displayResults.length > 0
                ? `${displayResults.length} result${displayResults.length === 1 ? "" : "s"} found`
                : ""}
            </span>
            <span className="text-xs">Press Esc to close</span>
          </div>
        </div>
      </div>
    </div>
  );
};
