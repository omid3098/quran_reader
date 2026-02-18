import type { VerseNote, NoteBacklink } from "../types";
import { blocksToText } from "./noteContent";

const STORAGE_KEY = "luminaNotes";
const VERSE_REF_PATTERN = /\[(\d{1,3}:\d{1,3})\]/g;

/**
 * Extract all [x:y] verse references from BlockNote blocks.
 * Uses blocksToText() for serialization, then regex to find numeric verse refs.
 * Naturally ignores hyperlinks ([text](url)) since those don't match \d:\d pattern.
 */
export function extractVerseRefs(blocks: unknown[]): string[] {
  if (!blocks || blocks.length === 0) return [];
  const text = blocksToText(blocks);
  const refs = new Set<string>();
  for (const match of text.matchAll(VERSE_REF_PATTERN)) {
    refs.add(match[1]);
  }
  return [...refs];
}

/**
 * Build a short excerpt from note text around a verse reference.
 */
function buildExcerpt(blocks: unknown[], targetVerseKey: string): string {
  const text = blocksToText(blocks);
  const pattern = `[${targetVerseKey}]`;
  const idx = text.indexOf(pattern);
  if (idx === -1) {
    return text.slice(0, 60) + (text.length > 60 ? "…" : "");
  }
  const start = Math.max(0, idx - 30);
  const end = Math.min(text.length, idx + pattern.length + 30);
  return (start > 0 ? "…" : "") + text.slice(start, end) + (end < text.length ? "…" : "");
}

/**
 * Pure function: scan all notes and find which ones reference targetVerseKey.
 */
export function computeBacklinks(
  targetVerseKey: string,
  allNotes: Record<string, VerseNote>
): NoteBacklink[] {
  const backlinks: NoteBacklink[] = [];

  for (const [sourceVerseKey, note] of Object.entries(allNotes)) {
    if (sourceVerseKey === targetVerseKey) continue;
    if (!note.blocks || note.blocks.length === 0) continue;

    const refs = extractVerseRefs(note.blocks);
    if (refs.includes(targetVerseKey)) {
      backlinks.push({
        sourceVerseKey,
        targetVerseKey,
        excerpt: buildExcerpt(note.blocks, targetVerseKey),
      });
    }
  }

  return backlinks.sort((a, b) => {
    const [aSurah, aVerse] = a.sourceVerseKey.split(":").map(Number);
    const [bSurah, bVerse] = b.sourceVerseKey.split(":").map(Number);
    if (aSurah !== bSurah) return aSurah - bSurah;
    return aVerse - bVerse;
  });
}

/**
 * Convenience function: reads notes from localStorage and computes backlinks.
 */
export function getBacklinksForVerse(verseKey: string): NoteBacklink[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    const allNotes = JSON.parse(stored) as Record<string, VerseNote>;
    return computeBacklinks(verseKey, allNotes);
  } catch {
    return [];
  }
}
