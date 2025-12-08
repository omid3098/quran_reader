import React from "react";
import { Bookmark, ChevronRight } from "lucide-react";
import { VerseRef, BreadcrumbEntry } from "../types";

interface BreadcrumbPanelProps {
  bookmarkedVerse: VerseRef | null;
  breadcrumbs: BreadcrumbEntry[];
  currentVerseKey: string | null;
  onNavigateToBookmark: () => void;
  onBreadcrumbClick: (index: number) => void;
}

export const BreadcrumbPanel: React.FC<BreadcrumbPanelProps> = ({
  bookmarkedVerse,
  breadcrumbs,
  currentVerseKey,
  onNavigateToBookmark,
  onBreadcrumbClick,
}) => {
  // Show when user has navigated away from bookmark (even with no intermediate breadcrumbs)
  const isAwayFromBookmark =
    bookmarkedVerse && currentVerseKey && bookmarkedVerse.verseKey !== currentVerseKey;

  if (!isAwayFromBookmark && breadcrumbs.length === 0) return null;

  return (
    <div className="fixed bottom-24 left-4 right-4 md:left-1/2 md:-translate-x-1/2 md:right-auto z-20 pointer-events-none">
      <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-full px-4 py-2 shadow-lg border border-slate-200 dark:border-slate-700 flex items-center gap-1 overflow-x-auto max-w-lg mx-auto pointer-events-auto">
        {/* Bookmark (home) */}
        {bookmarkedVerse && (
          <button
            onClick={onNavigateToBookmark}
            className="flex items-center gap-1 px-2 py-1 rounded-full bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 text-sm font-medium hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors whitespace-nowrap flex-shrink-0"
            title="Return to bookmark"
          >
            <Bookmark size={14} fill="currentColor" />
            <span>{bookmarkedVerse.verseKey}</span>
          </button>
        )}

        {/* Breadcrumb trail */}
        {breadcrumbs.map((entry, idx) => (
          <React.Fragment key={`${entry.verseRef.verseKey}-${entry.timestamp}`}>
            <ChevronRight size={14} className="text-slate-300 dark:text-slate-600 flex-shrink-0" />
            <button
              onClick={() => onBreadcrumbClick(idx)}
              className="px-2 py-1 rounded-full text-slate-600 dark:text-slate-400 text-sm hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap flex-shrink-0"
              title={`Go to ${entry.verseRef.verseKey}`}
            >
              {entry.verseRef.verseKey}
            </button>
          </React.Fragment>
        ))}

        {/* Current position indicator */}
        {currentVerseKey && (
          <>
            <ChevronRight size={14} className="text-slate-300 dark:text-slate-600 flex-shrink-0" />
            <span className="px-2 py-1 text-emerald-600 dark:text-emerald-400 text-sm font-medium whitespace-nowrap flex-shrink-0">
              {currentVerseKey}
            </span>
          </>
        )}
      </div>
    </div>
  );
};
