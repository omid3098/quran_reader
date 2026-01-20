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
import { MantineProvider } from "@mantine/core";
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

  // Sync editor content only when initialBlocks changes externally (not from our own onChange)
  useEffect(() => {
    const newContent = normalizeQuranLinkBlocks(initialBlocks || []);
    const newContentSerialized = JSON.stringify(newContent || []);

    // Only replace if the initial content is different from what we last received
    // This prevents the loop: onChange -> parent setState -> initialBlocks change -> replaceBlocks
    if (newContentSerialized !== lastInitialContentRef.current) {
      lastInitialContentRef.current = newContentSerialized;

      const contentToApply =
        newContent && newContent.length > 0
          ? (newContent as (typeof schema.PartialBlock)[])
          : [{ type: "paragraph" as const, content: "" }];

      // Replace all blocks with new content
      editor.replaceBlocks(editor.document, contentToApply);
    }
  }, [editor, initialBlocks]);

  // Handle content changes
  const handleChange = useCallback(() => {
    const blocks = editor.document as PartialBlock[];
    const normalized = normalizeQuranLinkBlocks(blocks);

    const needsUpdate = JSON.stringify(normalized) !== JSON.stringify(blocks);
    if (needsUpdate) {
      // Save cursor position before replacing blocks
      const selection = editor.getSelection();
      const textCursor = editor.getTextCursorPosition();

      editor.replaceBlocks(editor.document, normalized as (typeof schema.PartialBlock)[]);

      // Restore cursor position after replacing blocks
      // Use requestAnimationFrame to ensure DOM has updated
      requestAnimationFrame(() => {
        try {
          if (selection) {
            editor.setSelection(selection.blocks[0], selection.blocks[selection.blocks.length - 1]);
          } else if (textCursor?.block) {
            editor.setTextCursorPosition(textCursor.block, textCursor.prevBlock ? "start" : "end");
          }
        } catch {
          // Cursor restoration may fail if blocks changed significantly, that's ok
        }
      });

      // Update ref to prevent useEffect from re-triggering
      lastInitialContentRef.current = JSON.stringify(normalized);
      return;
    }

    // Update ref to prevent useEffect from re-triggering after parent saves
    lastInitialContentRef.current = JSON.stringify(normalized);

    if (onChange) {
      onChange(normalized);
    }
  }, [editor, onChange]);

  // Set up change listener
  useEffect(() => {
    if (onChange) {
      // BlockNote doesn't have a direct onChange, we use the editor's onChange
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
    <MantineProvider forceColorScheme={theme}>
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
    </MantineProvider>
  );
}

// Re-export note helpers for convenience
export { textToBlocks, blocksToText } from "../services/noteContent";
