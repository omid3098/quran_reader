import React from "react";
import { PartialBlock } from "@blocknote/core";
import { BookOpen } from "lucide-react";
import { parseQuranReference, getQuranLinkTooltip } from "./QuranLinkInline";

interface NotePreviewProps {
  blocks: PartialBlock[];
  onNavigateToVerse?: (surahId: number, verseNumber?: number) => void;
  getSurahName?: (surahId: number) => string | undefined;
  fontSize?: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type InlineContent = any;

// Render inline content (text, styled text, quranLink)
function renderInlineContent(
  content: InlineContent,
  onNavigateToVerse?: (surahId: number, verseNumber?: number) => void,
  getSurahName?: (surahId: number) => string | undefined
): React.ReactNode {
  if (!content) return null;

  if (typeof content === "string") {
    return content;
  }

  if (!Array.isArray(content)) {
    // Handle table content or other non-array content types
    return null;
  }

  return content.map((item, index) => {
    // Plain string
    if (typeof item === "string") {
      return <span key={index}>{item}</span>;
    }

    // QuranLink inline content
    if (item?.type === "quranLink") {
      const reference = item.props?.reference || "";
      const parsed = parseQuranReference(reference);
      const isValid = parsed.surahId !== null;
      const tooltip = getQuranLinkTooltip(
        parsed.surahId,
        parsed.verseNumber,
        reference,
        getSurahName
      );

      const handleClick = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (parsed.surahId && onNavigateToVerse) {
          onNavigateToVerse(parsed.surahId, parsed.verseNumber ?? undefined);
        }
      };

      return (
        <span
          key={index}
          className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-sm font-medium cursor-pointer transition-colors ${
            isValid
              ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:hover:bg-emerald-900/50"
              : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
          }`}
          onClick={handleClick}
          title={tooltip}
        >
          <BookOpen size={12} />
          <span>{parsed.displayText}</span>
        </span>
      );
    }

    // Text with optional styles
    if (item?.type === "text" || item?.text !== undefined) {
      const text = item.text ?? "";
      const styles = item.styles || {};

      let nodeContent: React.ReactNode = text;

      if (styles.bold) {
        nodeContent = <strong>{nodeContent}</strong>;
      }
      if (styles.italic) {
        nodeContent = <em>{nodeContent}</em>;
      }
      if (styles.underline) {
        nodeContent = <u>{nodeContent}</u>;
      }
      if (styles.strike) {
        nodeContent = <s>{nodeContent}</s>;
      }
      if (styles.code) {
        nodeContent = (
          <code className="px-1 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-sm font-mono">
            {nodeContent}
          </code>
        );
      }

      return <span key={index}>{nodeContent}</span>;
    }

    // Link
    if (item?.type === "link") {
      return (
        <a
          key={index}
          href={item.href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-emerald-600 dark:text-emerald-400 hover:underline"
        >
          {renderInlineContent(item.content, onNavigateToVerse, getSurahName)}
        </a>
      );
    }

    return null;
  });
}

// Render heading with specific level
function renderHeading(
  level: number,
  content: React.ReactNode,
  children: React.ReactNode[] | undefined,
  index: number
): React.ReactElement {
  const className = "font-bold mb-2";
  const props = { key: index, className };

  switch (level) {
    case 1:
      return (
        <h1 {...props}>
          {content}
          {children}
        </h1>
      );
    case 2:
      return (
        <h2 {...props}>
          {content}
          {children}
        </h2>
      );
    case 3:
      return (
        <h3 {...props}>
          {content}
          {children}
        </h3>
      );
    case 4:
      return (
        <h4 {...props}>
          {content}
          {children}
        </h4>
      );
    case 5:
      return (
        <h5 {...props}>
          {content}
          {children}
        </h5>
      );
    default:
      return (
        <h6 {...props}>
          {content}
          {children}
        </h6>
      );
  }
}

// Render a single block
function renderBlock(
  block: PartialBlock,
  index: number,
  onNavigateToVerse?: (surahId: number, verseNumber?: number) => void,
  getSurahName?: (surahId: number) => string | undefined
): React.ReactNode {
  const type = block.type || "paragraph";
  const content = renderInlineContent(block.content, onNavigateToVerse, getSurahName);
  const children = block.children?.map((child, childIndex) =>
    renderBlock(child, childIndex, onNavigateToVerse, getSurahName)
  );

  switch (type) {
    case "paragraph":
      return (
        <p key={index} className="mb-2 last:mb-0">
          {content}
          {children}
        </p>
      );

    case "heading": {
      const level = (block.props as { level?: number })?.level || 1;
      return renderHeading(level, content, children, index);
    }

    case "bulletListItem":
      return (
        <li key={index} className="ml-4 list-disc">
          {content}
          {children && <ul className="mt-1">{children}</ul>}
        </li>
      );

    case "numberedListItem":
      return (
        <li key={index} className="ml-4 list-decimal">
          {content}
          {children && <ol className="mt-1">{children}</ol>}
        </li>
      );

    case "checkListItem": {
      const checked = (block.props as { checked?: boolean })?.checked || false;
      return (
        <div key={index} className="flex items-start gap-2 mb-1">
          <input type="checkbox" checked={checked} readOnly className="mt-1" />
          <span className={checked ? "line-through opacity-60" : ""}>{content}</span>
          {children}
        </div>
      );
    }

    default:
      // Fallback for unknown block types
      return (
        <div key={index} className="mb-2">
          {content}
          {children}
        </div>
      );
  }
}

// Group consecutive list items into proper list containers
function groupListItems(
  blocks: PartialBlock[],
  onNavigateToVerse?: (surahId: number, verseNumber?: number) => void,
  getSurahName?: (surahId: number) => string | undefined
): React.ReactNode[] {
  const result: React.ReactNode[] = [];
  let currentBulletList: React.ReactNode[] = [];
  let currentNumberedList: React.ReactNode[] = [];
  let listKey = 0;

  const flushBulletList = () => {
    if (currentBulletList.length > 0) {
      result.push(
        <ul key={`ul-${listKey++}`} className="mb-2 list-disc">
          {currentBulletList}
        </ul>
      );
      currentBulletList = [];
    }
  };

  const flushNumberedList = () => {
    if (currentNumberedList.length > 0) {
      result.push(
        <ol key={`ol-${listKey++}`} className="mb-2 list-decimal">
          {currentNumberedList}
        </ol>
      );
      currentNumberedList = [];
    }
  };

  blocks.forEach((block, index) => {
    const type = block.type || "paragraph";

    if (type === "bulletListItem") {
      flushNumberedList();
      currentBulletList.push(renderBlock(block, index, onNavigateToVerse, getSurahName));
    } else if (type === "numberedListItem") {
      flushBulletList();
      currentNumberedList.push(renderBlock(block, index, onNavigateToVerse, getSurahName));
    } else {
      flushBulletList();
      flushNumberedList();
      result.push(renderBlock(block, index, onNavigateToVerse, getSurahName));
    }
  });

  flushBulletList();
  flushNumberedList();

  return result;
}

/**
 * Lightweight read-only renderer for BlockNote blocks.
 * Used in AyahCard to display notes without creating full editor instances.
 */
export function NotePreview({
  blocks,
  onNavigateToVerse,
  getSurahName,
  fontSize,
}: NotePreviewProps) {
  if (!blocks || blocks.length === 0) {
    return null;
  }

  return (
    <div
      className="note-preview font-vazir text-slate-700 dark:text-slate-300"
      dir="auto"
      style={{ fontSize: fontSize ? `${fontSize}px` : undefined }}
    >
      {groupListItems(blocks, onNavigateToVerse, getSurahName)}
    </div>
  );
}
