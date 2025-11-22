
import React, { useEffect, useState } from 'react';
import { X, Database, BookOpen, Search, ArrowRight, ChevronDown } from 'lucide-react';
import { RootAnalysis, SearchResult } from '../types';
import { Spinner } from './Spinner';

// Truncate verse text to ~6-7 words around the matched word position and wrap with ellipses when truncated
const truncateAroundWord = (text: string, wordIndex?: number): string => {
  if (!text) return '';

  const words = text.split(/\s+/).filter(Boolean);
  const totalWords = words.length;

  // If verse is short enough (6 words or less), show all
  if (totalWords <= 6) {
    return words.join(' ');
  }

  // Clamp target index and center the window around the matched word when provided
  const targetIndex = Math.min(
    Math.max(wordIndex ?? Math.floor(totalWords / 2), 0),
    totalWords - 1
  );

  const windowSize = 3; // 3 words on each side for context
  let start = Math.max(0, targetIndex - windowSize);
  let end = Math.min(totalWords, targetIndex + windowSize + 1);

  // Ensure at least 6 words in the snippet by expanding toward available context
  const desiredLength = 6;
  const currentLength = end - start;
  if (currentLength < desiredLength) {
    const shortage = desiredLength - currentLength;
    const expandBefore = Math.min(start, Math.ceil(shortage / 2));
    start -= expandBefore;
    const expandAfter = Math.min(totalWords - end, shortage - expandBefore);
    end += expandAfter;

    // If we still don't have enough words, expand in the remaining direction
    const remaining = desiredLength - (end - start);
    if (remaining > 0 && start > 0) {
      start = Math.max(0, start - remaining);
    } else if (remaining > 0 && end < totalWords) {
      end = Math.min(totalWords, end + remaining);
    }
  }

  const selectedWords = words.slice(start, end);

  // Always wrap truncated snippets with ellipses to indicate there is more context
  return `... ${selectedWords.join(' ')} ...`;
};

interface AnalysisSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  loading: boolean;
  rootData: RootAnalysis | null;
  phraseData: { count: number; verses: any[] } | null;
  mode: 'root' | 'phrase' | null;
  onNavigate: (verseKey: string) => void;
}

export const AnalysisSidebar: React.FC<AnalysisSidebarProps> = ({
  isOpen,
  onClose,
  loading,
  rootData,
  phraseData,
  mode,
  onNavigate
}) => {
  const [isConcordanceOpen, setIsConcordanceOpen] = useState(true);
  const [isWordFormsOpen, setIsWordFormsOpen] = useState(true);

  useEffect(() => {
    setIsConcordanceOpen(true);
    setIsWordFormsOpen(true);
  }, [rootData?.root]);

  return (
    <div className={`
      fixed inset-y-0 right-0 z-40 w-80 md:w-96 bg-white dark:bg-slate-950 border-l border-slate-200 dark:border-slate-800 transform transition-transform duration-300 ease-in-out shadow-2xl
      ${isOpen ? 'translate-x-0' : 'translate-x-full'}
    `}>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-500">
            <Database size={20} />
            <h2 className="font-bold text-lg tracking-tight">Research Panel</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-400">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {loading && (
            <div className="flex flex-col items-center justify-center h-64 space-y-4 text-slate-400">
              <Spinner className="w-8 h-8 text-emerald-600" />
              <p className="text-sm">Querying Corpus...</p>
            </div>
          )}

          {!loading && mode === 'root' && rootData && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              
              {/* Root Header */}
              <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl p-6 text-center border border-emerald-100 dark:border-emerald-800/50">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">ROOT FOR</span>
                  <span className="font-quran text-lg text-emerald-700 dark:text-emerald-300 leading-none pt-1">
                      {rootData.debugInfo?.normalizedText}
                  </span>
                </div>
                
                <div className="font-quran text-5xl text-emerald-800 dark:text-emerald-200 mt-2 mb-4 dir-rtl">
                  {rootData.root}
                </div>
                
                {rootData.root !== 'Not Found' && (
                    <div className="inline-flex items-center gap-2 bg-white dark:bg-slate-900 px-3 py-1 rounded-full shadow-sm text-sm text-slate-600 dark:text-slate-400 border border-emerald-100 dark:border-emerald-900">
                      <BookOpen size={14} />
                      <span>Occurs {rootData.occurrences} times</span>
                    </div>
                )}
              </div>

              {/* Collapsible Sections */}
              <div className="space-y-4">
                <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
                  <button
                    onClick={() => setIsConcordanceOpen(prev => !prev)}
                    className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors rounded-2xl"
                  >
                    <div className="flex items-center gap-2">
                      <Search size={16} className="text-emerald-500" />
                      <div>
                        <p className="text-sm font-bold text-slate-900 dark:text-white leading-tight">Concordance</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">All verses with this root</p>
                      </div>
                    </div>
                    <ChevronDown
                      size={18}
                      className={`text-slate-400 transition-transform ${isConcordanceOpen ? 'rotate-180' : ''}`}
                    />
                  </button>
                  {isConcordanceOpen && (
                    <div className="px-4 pb-4 space-y-1.5">
                      {rootData.verses.length > 0 ? (
                        rootData.verses.map((v, idx) => (
                        <button
                          key={idx}
                          onClick={() => onNavigate(v.verse_key)}
                          className="w-full text-right p-2 px-3 rounded-lg border border-slate-100 dark:border-slate-800 hover:border-emerald-400 hover:bg-emerald-50/50 dark:hover:bg-emerald-900/20 transition-all bg-white dark:bg-slate-900 group"
                        >
                            <div className="flex items-start justify-between gap-3">
                              <p className="flex-1 font-quran text-slate-700 dark:text-slate-300 text-sm leading-relaxed text-right dir-rtl">
                                {truncateAroundWord(v.text.replace(/<[^>]*>/g, ''), v.wordIndex)}
                              </p>
                              <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 inline-block min-w-[3rem] text-right">
                                [{v.verse_key}]
                              </span>
                            </div>
                          </button>
                        ))
                      ) : (
                        <div className="text-center py-6 text-slate-400 dark:text-slate-500 text-sm bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800">
                          No occurrences found.
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
                  <button
                    onClick={() => setIsWordFormsOpen(prev => !prev)}
                    className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors rounded-2xl"
                  >
                    <div className="flex items-center gap-2">
                      <BookOpen size={16} className="text-emerald-500" />
                      <div>
                        <p className="text-sm font-bold text-slate-900 dark:text-white leading-tight">Word Forms</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Other words sharing this root ({rootData.wordForms.length})
                        </p>
                      </div>
                    </div>
                    <ChevronDown
                      size={18}
                      className={`text-slate-400 transition-transform ${isWordFormsOpen ? 'rotate-180' : ''}`}
                    />
                  </button>
                  {isWordFormsOpen && (
                    <div className="px-4 pb-4">
                      {rootData.wordForms.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {rootData.wordForms.map(form => (
                            <div
                              key={form.normalizedForm}
                              className="p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/60"
                            >
                              <div className="flex items-center justify-between gap-2 mb-1">
                                <span className="font-quran text-lg text-slate-800 dark:text-slate-100 dir-rtl leading-none">
                                  {form.form}
                                </span>
                                <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200">
                                  {form.occurrences}x
                                </span>
                              </div>
                              {form.lemma && (
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                                  Lemma: {form.lemma}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-6 text-slate-400 dark:text-slate-500 text-sm bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800">
                          No word forms found for this root.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {!loading && mode === 'phrase' && phraseData && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
               <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl p-6 text-center border border-indigo-100 dark:border-indigo-800/50">
                <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">EXACT PHRASE</span>
                <div className="font-bold text-3xl text-indigo-900 dark:text-indigo-200 mt-2 mb-2">
                  {phraseData.count} Match{phraseData.count !== 1 ? 'es' : ''}
                </div>
              </div>

              <div className="space-y-2">
                  {phraseData.verses.map((v, idx) => (
                    <button
                      key={idx}
                      onClick={() => onNavigate(v.verse_key)}
                      className="w-full text-left p-3 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-indigo-400 hover:shadow-sm transition-all bg-white dark:bg-slate-900 group"
                    >
                      <div className="flex items-center justify-between mb-2">
                         <span className="text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded">
                            {v.verse_key}
                         </span>
                         <ArrowRight size={14} className="opacity-0 group-hover:opacity-100 text-indigo-500 transition-opacity" />
                      </div>
                      <p className="font-quran text-right text-slate-700 dark:text-slate-300 text-sm line-clamp-2 leading-loose dir-rtl">
                         {v.text}
                      </p>
                    </button>
                  ))}
              </div>
            </div>
          )}
          
          {!loading && !mode && (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 text-center p-4">
                 <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-full mb-4">
                    <Database size={32} className="text-slate-300 dark:text-slate-600" />
                 </div>
                 <h3 className="font-medium text-slate-600 dark:text-slate-300 mb-1">Ready for Research</h3>
                 <p className="text-sm">Select text in the Quran to analyze roots or search for phrases.</p>
              </div>
          )}
        </div>
      </div>
    </div>
  );
};
