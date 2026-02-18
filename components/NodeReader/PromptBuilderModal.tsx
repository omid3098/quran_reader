import React, { useState, useEffect, useCallback } from "react";
import { X, Copy, Check } from "lucide-react";
import { Spinner } from "../Spinner";
import { gatherPromptContext, buildPromptText } from "../../services/promptBuilderService";
import type { Verse, Chapter, QuranWord, VerseNote, SurahNote } from "../../types";

interface PromptBuilderModalProps {
  verse: Verse;
  chapter: Chapter;
  words: QuranWord[];
  verseNote: VerseNote | undefined;
  surahNote: SurahNote | undefined;
  onClose: () => void;
}

export const PromptBuilderModal: React.FC<PromptBuilderModalProps> = ({
  verse,
  chapter,
  words,
  verseNote,
  surahNote,
  onClose,
}) => {
  const [promptText, setPromptText] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Gather context and build prompt on mount
  useEffect(() => {
    let cancelled = false;
    gatherPromptContext(verse, chapter, words, verseNote?.blocks, surahNote?.blocks).then((ctx) => {
      if (cancelled) return;
      setPromptText(buildPromptText(ctx));
    });
    return () => {
      cancelled = true;
    };
  }, [verse, chapter, words, verseNote, surahNote]);

  // Close on Escape — stop propagation so NodeReader doesn't exit
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [onClose]);

  const handleCopy = useCallback(async () => {
    if (!promptText) return;
    try {
      await navigator.clipboard.writeText(promptText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy prompt", error);
    }
  }, [promptText]);

  // Backdrop click
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) onClose();
    },
    [onClose]
  );

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <div className="relative w-full max-w-2xl max-h-[80vh] mx-4 flex flex-col bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-700">
          <h2 className="text-sm font-semibold text-slate-200">
            Prompt Builder — {verse.verse_key}
          </h2>
          <div className="flex items-center gap-2">
            {promptText && (
              <button
                onClick={handleCopy}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  copied
                    ? "bg-emerald-900/50 text-emerald-400"
                    : "bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-slate-100"
                }`}
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                {copied ? "Copied!" : "Copy"}
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
              aria-label="Close prompt builder"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 min-h-0">
          {promptText === null ? (
            <div className="flex items-center justify-center py-16">
              <Spinner />
            </div>
          ) : (
            <pre className="whitespace-pre-wrap text-sm text-slate-300 font-vazir leading-relaxed select-all">
              {promptText}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
};

export default PromptBuilderModal;
