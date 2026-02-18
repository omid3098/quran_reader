import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";

import {
  BlockNoteSchema,
  defaultBlockSpecs,
  defaultInlineContentSpecs,
  PartialBlock,
} from "@blocknote/core";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import { useEffect, useMemo, useCallback, useRef } from "react";
import { QuranLink, normalizeQuranLinkBlocks, quranLinkSpec } from "./QuranLinkInline";

interface RichNoteEditorProps {
  initialBlocks?: PartialBlock[];
  onChange?: (blocks: PartialBlock[]) => void;
  theme?: "light" | "dark";
  onNavigateToVerse?: (surahId: number, verseNumber?: number) => void;
  getSurahName?: (surahId: number) => string | undefined;
  editable?: boolean;
}

// Create schema with custom inline content
const schema = BlockNoteSchema.create({
  blockSpecs: defaultBlockSpecs,
  inlineContentSpecs: {
    ...defaultInlineContentSpecs,
    quranLink: quranLinkSpec,
  },
});

export function RichNoteEditor({
  initialBlocks,
  onChange,
  theme = "light",
  onNavigateToVerse,
  getSurahName,
  editable = true,
}: RichNoteEditorProps) {
  const normalizedInitialBlocks = useMemo(
    () => normalizeQuranLinkBlocks(initialBlocks || []),
    [initialBlocks]
  );

  // Create editor with schema
  const editor = useCreateBlockNote({
    schema,
    initialContent:
      normalizedInitialBlocks && normalizedInitialBlocks.length > 0
        ? (normalizedInitialBlocks as (typeof schema.PartialBlock)[])
        : undefined,
  });

  // Track the serialized initial content to detect external changes
  const lastInitialContentRef = useRef<string>(JSON.stringify(normalizedInitialBlocks || []));
  // Guard to prevent onChange from firing during replaceBlocks
  const isReplacingRef = useRef(false);

  // Sync editor content only when initialBlocks changes externally (not from our own onChange)
  useEffect(() => {
    try {
      const newContent = normalizeQuranLinkBlocks(initialBlocks || []);
      const newContentSerialized = JSON.stringify(newContent || []);

      if (newContentSerialized !== lastInitialContentRef.current) {
        lastInitialContentRef.current = newContentSerialized;

        const contentToApply =
          newContent && newContent.length > 0
            ? (newContent as (typeof schema.PartialBlock)[])
            : [{ type: "paragraph" as const, content: "" }];

        isReplacingRef.current = true;
        try {
          editor.replaceBlocks(editor.document, contentToApply);
        } finally {
          isReplacingRef.current = false;
        }
      }
    } catch (e) {
      console.error("RichNoteEditor: content sync failed", e);
    }
  }, [editor, initialBlocks]);

  // Handle content changes — never call replaceBlocks here to avoid infinite loop
  const handleChange = useCallback(() => {
    if (isReplacingRef.current) return;
    try {
      const blocks = editor.document as PartialBlock[];
      const normalized = normalizeQuranLinkBlocks(blocks);
      lastInitialContentRef.current = JSON.stringify(normalized);
      if (onChange) {
        onChange(normalized);
      }
    } catch (e) {
      console.error("RichNoteEditor: onChange failed", e);
    }
  }, [editor, onChange]);

  // Set up change listener
  useEffect(() => {
    if (onChange) {
      const unsubscribe = editor.onChange(handleChange);
      return () => {
        if (typeof unsubscribe === "function") {
          unsubscribe();
        }
      };
    }
  }, [editor, onChange, handleChange]);

  // Memoize the navigation handler for QuranLink
  const navigationContext = useMemo(
    () => ({
      onNavigate: onNavigateToVerse,
      getSurahName,
    }),
    [getSurahName, onNavigateToVerse]
  );

  return (
    <QuranLink.Provider value={navigationContext}>
      <div
        className={`rich-note-editor font-vazir ${theme === "dark" ? "bn-dark" : ""}`}
        dir="auto"
      >
        <BlockNoteView
          editor={editor}
          theme={theme}
          editable={editable}
          data-theming-css-variables-demo
        />
      </div>
    </QuranLink.Provider>
  );
}

// Re-export note helpers for convenience
export { textToBlocks, blocksToText } from "../services/noteContent";
