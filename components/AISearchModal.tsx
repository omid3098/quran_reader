import React, { useState } from "react";
import { X, Search, ArrowRight, Sparkles } from "lucide-react";
import { searchQuran } from "../services/geminiService";
import { SearchResult } from "../types";
import { Spinner } from "./Spinner";

interface AISearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (surah: number, ayah: number) => void;
}

export const AISearchModal: React.FC<AISearchModalProps> = ({ isOpen, onClose, onNavigate }) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  if (!isOpen) return null;

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setResults([]);
    setHasSearched(true);

    const data = await searchQuran(query);
    setResults(data);
    setLoading(false);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200 cursor-pointer"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh] cursor-default"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-500">
            <Sparkles size={20} />
            <h3 className="font-semibold">AI Smart Search</h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-500 dark:text-slate-400"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 bg-white dark:bg-slate-900">
          <form onSubmit={handleSearch} className="relative">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Describe what you are looking for..."
              className="w-full pl-5 pr-14 py-4 text-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all shadow-inner text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500"
              autoFocus
            />
            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? <Spinner className="w-5 h-5" /> : <Search size={20} />}
            </button>
          </form>
        </div>

        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/30 dark:bg-slate-950/30">
          {loading && (
            <div className="flex flex-col items-center justify-center py-12 space-y-4 text-slate-400 dark:text-slate-500">
              <Spinner className="w-8 h-8 text-emerald-500" />
              <p>Consulting the knowledge base...</p>
            </div>
          )}

          {!loading && hasSearched && results.length === 0 && (
            <div className="text-center py-12 text-slate-500 dark:text-slate-400">
              <p>No direct matches found. Try rephrasing your query.</p>
            </div>
          )}

          <div className="space-y-3">
            {results.map((result, idx) => (
              <button
                key={idx}
                onClick={() => {
                  onNavigate(result.surah, result.ayah);
                  onClose();
                }}
                className="w-full flex items-start gap-4 p-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl hover:border-emerald-300 dark:hover:border-emerald-700 hover:shadow-md transition-all text-left group"
              >
                <div className="flex flex-col items-center justify-center w-12 h-12 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 rounded-lg shrink-0">
                  <span className="text-xs font-medium uppercase">Surah</span>
                  <span className="font-bold text-lg">{result.surah}</span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="font-medium text-slate-800 dark:text-slate-200">
                      Ayah {result.ayah}
                    </h4>
                    <ArrowRight
                      size={16}
                      className="text-slate-300 dark:text-slate-600 group-hover:text-emerald-500 transition-colors"
                    />
                  </div>
                  <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                    {result.context}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
