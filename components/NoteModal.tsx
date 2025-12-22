import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Save, Trash2 } from "lucide-react";
import { PartialBlock } from "@blocknote/core";
import { RichNoteEditor } from "./RichNoteEditor";
import { normalizeQuranLinkBlocks } from "./QuranLinkInline";
import { VerseNote } from "../types";

interface NoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  verseKey: string;
  initialNote?: VerseNote;
  onSave: (blocks: PartialBlock[]) => void;
  onDelete: () => void;
  theme: "light" | "dark";
  onNavigateToVerse?: (surahId: number, verseNumber?: number) => void;
  getSurahName?: (surahId: number) => string | undefined;
}

export const NoteModal: React.FC<NoteModalProps> = ({
  isOpen,
  onClose,
  verseKey,
  initialNote,
  onSave,
  onDelete,
  theme,
  onNavigateToVerse,
  getSurahName,
}) => {
  const normalizedInitialBlocks = useMemo(
    () => normalizeQuranLinkBlocks(initialNote?.blocks || []),
    [initialNote]
  );

  const [blocks, setBlocks] = useState<PartialBlock[]>(normalizedInitialBlocks);
  const [hasChanges, setHasChanges] = useState(false);
  const initialBlocksRef = useRef<string>(JSON.stringify(normalizedInitialBlocks));

  // Reset state when modal opens with new content
  useEffect(() => {
    if (isOpen) {
      const newBlocks = normalizedInitialBlocks;
      setBlocks(newBlocks);
      setHasChanges(false);
      // Store serialized initial state to compare against
      initialBlocksRef.current = JSON.stringify(newBlocks);
    }
  }, [isOpen, normalizedInitialBlocks, verseKey]);

  const handleChange = useCallback((newBlocks: PartialBlock[]) => {
    setBlocks(newBlocks);
    // Only mark as changed if content actually differs from initial
    const currentSerialized = JSON.stringify(newBlocks);
    setHasChanges(currentSerialized !== initialBlocksRef.current);
  }, []);

  const handleSave = () => {
    onSave(blocks);
    setHasChanges(false);
    onClose();
  };

  const handleDelete = () => {
    if (window.confirm("Delete this note?")) {
      onDelete();
      onClose();
    }
  };

  const handleClose = () => {
    if (hasChanges) {
      if (window.confirm("You have unsaved changes. Are you sure you want to close?")) {
        onClose();
      }
    } else {
      onClose();
    }
  };

  // Handle navigation from wikilinks
  const handleNavigate = useCallback(
    (targetSurahId: number, verseNumber?: number) => {
      if (onNavigateToVerse) {
        onClose();
        setTimeout(() => {
          onNavigateToVerse(targetSurahId, verseNumber);
        }, 100);
      }
    },
    [onNavigateToVerse, onClose]
  );

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-200 cursor-pointer"
      onClick={handleClose}
    >
      <div
        className={`w-full max-w-2xl h-[50vh] md:h-[60vh] rounded-2xl shadow-2xl overflow-hidden relative animate-in zoom-in-95 duration-200 ring-1 ring-slate-200 dark:ring-slate-800 flex flex-col cursor-default
          ${theme === "dark" ? "bg-slate-900" : "bg-white"}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Editor area */}
        <div className="flex-1 overflow-auto px-2 py-4 pb-24">
          <RichNoteEditor
            initialBlocks={normalizedInitialBlocks}
            onChange={handleChange}
            theme={theme}
            onNavigateToVerse={handleNavigate}
            getSurahName={getSurahName}
            editable={true}
          />
        </div>

        {/* Bottom Left: Verse Key Indicator */}
        <div className="absolute bottom-6 left-8 pointer-events-none select-none">
          <span
            className={`text-xl font-bold font-sans ${
              theme === "dark" ? "text-slate-800" : "text-slate-200"
            }`}
          >
            {verseKey}
          </span>
        </div>

        {/* Bottom Right: Actions */}
        <div className="absolute bottom-6 right-6 flex items-center gap-3">
          {initialNote && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDelete();
              }}
              className={`p-3 text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 backdrop-blur-sm rounded-full shadow-sm border transition-colors
                ${theme === "dark" ? "bg-slate-800/50 border-slate-700" : "bg-white/50 border-slate-200"}`}
              title="Delete Note"
            >
              <Trash2 size={20} />
            </button>
          )}

          <button
            onClick={(e) => {
              e.stopPropagation();
              handleClose();
            }}
            className={`px-5 py-2.5 backdrop-blur-sm rounded-full shadow-sm border text-sm font-medium transition-colors
              ${
                theme === "dark"
                  ? "bg-slate-800/80 text-slate-300 hover:bg-slate-700 border-slate-700"
                  : "bg-white/80 text-slate-600 hover:bg-slate-100 border-slate-200"
              }`}
          >
            Cancel
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              handleSave();
            }}
            disabled={!hasChanges}
            className={`flex items-center gap-2 px-6 py-2.5 text-sm font-bold rounded-full shadow-lg transition-all
              ${
                hasChanges
                  ? "bg-yellow-400 hover:bg-yellow-500 text-yellow-950 hover:shadow-xl transform hover:-translate-y-0.5"
                  : theme === "dark"
                    ? "bg-slate-700 text-slate-500 cursor-not-allowed shadow-none"
                    : "bg-slate-200 text-slate-400 cursor-not-allowed shadow-none"
              }`}
          >
            <Save size={18} />
            Save
          </button>
        </div>
      </div>
    </div>
  );
};
