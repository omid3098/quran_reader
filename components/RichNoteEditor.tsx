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
import { QuranLink, quranLinkSpec } from "./QuranLinkInline";

interface RichNoteEditorProps {
  initialBlocks?: PartialBlock[];
  onChange?: (blocks: PartialBlock[]) => void;
  theme?: "light" | "dark";
  onNavigateToVerse?: (surahId: number, verseNumber?: number) => void;
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
  editable = true,
}: RichNoteEditorProps) {
  // Create editor with schema
  const editor = useCreateBlockNote({
    schema,
    initialContent:
      initialBlocks && initialBlocks.length > 0
        ? (initialBlocks as (typeof schema.PartialBlock)[])
        : undefined,
  });

  // Track the serialized initial content to detect external changes
  const lastInitialContentRef = useRef<string>("");

  // Sync editor content only when initialBlocks changes externally (not from our own onChange)
  useEffect(() => {
    const newContentSerialized = JSON.stringify(initialBlocks || []);

    // Only replace if the initial content is different from what we last received
    // This prevents the loop: onChange -> parent setState -> initialBlocks change -> replaceBlocks
    if (newContentSerialized !== lastInitialContentRef.current) {
      lastInitialContentRef.current = newContentSerialized;

      const newContent =
        initialBlocks && initialBlocks.length > 0
          ? (initialBlocks as (typeof schema.PartialBlock)[])
          : [{ type: "paragraph" as const, content: "" }];

      // Replace all blocks with new content
      editor.replaceBlocks(editor.document, newContent);
    }
  }, [editor, initialBlocks]);

  // Handle content changes
  const handleChange = useCallback(() => {
    if (onChange) {
      const blocks = editor.document as PartialBlock[];
      onChange(blocks);
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
    }),
    [onNavigateToVerse]
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

// Helper to convert plain text to blocks
export function textToBlocks(text: string): PartialBlock[] {
  if (!text || text.trim() === "") {
    return [];
  }

  // Split by newlines and create paragraph blocks
  const lines = text.split("\n");
  return lines.map((line) => ({
    type: "paragraph" as const,
    content: line || "",
  }));
}

// Helper to extract plain text from blocks (for preview)
export function blocksToText(blocks: PartialBlock[]): string {
  if (!blocks || blocks.length === 0) {
    return "";
  }

  return blocks
    .map((block) => {
      if (typeof block.content === "string") {
        return block.content;
      }
      if (Array.isArray(block.content)) {
        return block.content
          .map((item) => {
            if (typeof item === "string") return item;
            if (item && typeof item === "object" && "text" in item) return item.text;
            return "";
          })
          .join("");
      }
      return "";
    })
    .join("\n");
}
