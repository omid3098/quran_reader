
import React from 'react';
import { X, Database, BookOpen, Search, ArrowRight } from 'lucide-react';
import { RootAnalysis, SearchResult } from '../types';
import { Spinner } from './Spinner';

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

              {/* Concordance List */}
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                    <Search size={16} className="text-emerald-500" />
                    Concordance
                </h3>
                <div className="space-y-2">
                  {rootData.verses.length > 0 ? (
                    rootData.verses.map((v, idx) => (
                      <button
                        key={idx}
                        onClick={() => onNavigate(v.verse_key)}
                        className="w-full text-left p-3 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-emerald-400 hover:shadow-sm transition-all bg-white dark:bg-slate-900 group"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded">
                              {v.verse_key}
                          </span>
                          <ArrowRight size={14} className="opacity-0 group-hover:opacity-100 text-emerald-500 transition-opacity" />
                        </div>
                        <p className="font-quran text-right text-slate-700 dark:text-slate-300 text-sm line-clamp-2 leading-loose dir-rtl">
                          {v.text.replace(/<[^>]*>/g, '')}
                        </p>
                      </button>
                    ))
                  ) : (
                    <div className="text-center py-8 text-slate-400 dark:text-slate-500 text-sm bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800">
                      No occurrences found.
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
