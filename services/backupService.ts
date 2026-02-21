import { textToBlocks } from "./noteContent";
import {
  BackupData,
  BackupDataV1,
  BackupDataV2,
  KnowledgeBase,
  NoteExportTuple,
  SurahNote,
  SurahNoteExport,
  VerseNote,
  VerseRef,
} from "../types";
import type { PartialBlock } from "@blocknote/core";

export interface ParsedBackupData {
  notes: Record<string, VerseNote>;
  surahNotes: Record<number, SurahNote>;
  bookmark?: VerseRef;
  knowledgeBase?: KnowledgeBase;
}

// Defensive clone to strip functions/undefined while keeping JSON-serializable data
const safeClone = <T>(value: unknown): T | undefined => {
  try {
    return JSON.parse(JSON.stringify(value)) as T;
  } catch {
    return undefined;
  }
};

const sanitizeBlocks = (blocks: unknown) => {
  if (!Array.isArray(blocks)) return [];
  const cloned = safeClone<PartialBlock[]>(blocks);
  if (!Array.isArray(cloned)) return [];

  // Ensure each block has a type; drop anything malformed
  return cloned
    .map((block) => {
      if (!block || typeof block !== "object" || typeof block.type !== "string") {
        return null;
      }

      // Recursively sanitize children if present
      if (block.children) {
        block.children = sanitizeBlocks(block.children);
      }

      return block;
    })
    .filter(Boolean) as PartialBlock[];
};

const parseVerseKey = (verseKey: string | undefined): VerseRef | undefined => {
  if (!verseKey || typeof verseKey !== "string") return undefined;
  const [surah, verse] = verseKey.split(":").map((val) => Number(val));
  if (Number.isNaN(surah) || Number.isNaN(verse)) return undefined;
  return { surahId: surah, verseNumber: verse, verseKey };
};

const createVerseNoteFromTuple = (tuple: NoteExportTuple, fallbackDate: string): VerseNote => {
  const [key, text, updatedAt] = tuple;
  const timestamp = updatedAt || fallbackDate;
  return {
    verseKey: key,
    blocks: textToBlocks(text),
    updatedAt: timestamp,
    createdAt: timestamp,
  };
};

const normalizeSurahNotes = (surahNotes: SurahNoteExport[] | undefined, fallbackDate: string) => {
  const normalized: Record<number, SurahNote> = {};
  (surahNotes || []).forEach((note) => {
    if (!note || typeof note.surahId !== "number" || !note.blocks) return;
    const blocks = sanitizeBlocks(note.blocks);
    normalized[note.surahId] = {
      surahId: note.surahId,
      blocks,
      updatedAt: note.updatedAt || fallbackDate,
      createdAt: note.createdAt || fallbackDate,
    };
  });
  return normalized;
};

const sanitizeKnowledgeBase = (kb: unknown): KnowledgeBase | undefined => {
  if (!kb || typeof kb !== "object") return undefined;
  const cloned = safeClone<KnowledgeBase>(kb);
  if (!cloned || typeof cloned !== "object") return undefined;
  // Ensure required structure exists
  if (!cloned.roots || typeof cloned.roots !== "object") cloned.roots = {};
  if (!cloned.lemmas || typeof cloned.lemmas !== "object") cloned.lemmas = {};
  if (!Array.isArray(cloned.connections)) cloned.connections = [];
  if (!Array.isArray(cloned.patterns)) cloned.patterns = [];
  if (!cloned._meta) cloned._meta = { author: "user", version: 1 };
  return cloned;
};

export const mergeKnowledgeBases = (
  current: KnowledgeBase | null | undefined,
  incoming: KnowledgeBase
): KnowledgeBase => {
  if (!current) return incoming;

  const mergedRoots = { ...current.roots, ...incoming.roots };
  const mergedLemmas = { ...current.lemmas, ...incoming.lemmas };

  // Deduplicate connections by from.verse + to.verse
  const connKey = (c: { from: { verse: string }; to: { verse: string } }) =>
    `${c.from.verse}|${c.to.verse}`;
  const connMap = new Map(current.connections.map((c) => [connKey(c), c]));
  for (const c of incoming.connections) {
    connMap.set(connKey(c), c);
  }

  // Deduplicate patterns by id
  const patternMap = new Map(current.patterns.map((p) => [p.id, p]));
  for (const p of incoming.patterns) {
    patternMap.set(p.id, p);
  }

  return {
    _meta: incoming._meta,
    roots: mergedRoots,
    lemmas: mergedLemmas,
    connections: [...connMap.values()],
    patterns: [...patternMap.values()],
  };
};

const parseV1 = (data: BackupDataV1 & { surahNotes?: SurahNoteExport[] }): ParsedBackupData => {
  if (!Array.isArray(data.notes)) {
    throw new Error("Invalid v1 backup: missing notes array");
  }
  const now = new Date().toISOString();
  const notes: Record<string, VerseNote> = {};
  data.notes.forEach((item) => {
    if (Array.isArray(item) && item.length >= 2) {
      const note = createVerseNoteFromTuple(item as NoteExportTuple, now);
      notes[note.verseKey] = note;
    }
  });

  const bookmark = parseVerseKey(data.bookmarks?.[0]);
  const surahNotes = normalizeSurahNotes(data.surahNotes, now);

  return { notes, surahNotes, bookmark };
};

const parseV2 = (data: BackupDataV2): ParsedBackupData => {
  const now = new Date().toISOString();
  const notes: Record<string, VerseNote> = {};

  if (Array.isArray(data.notes)) {
    data.notes.forEach((note) => {
      if (!note?.key || !note.blocks) return;
      const blocks = sanitizeBlocks(note.blocks);
      if (blocks.length === 0) return;
      const timestamp = note.updatedAt || now;
      notes[note.key] = {
        verseKey: note.key,
        blocks,
        updatedAt: timestamp,
        createdAt: note.createdAt || timestamp,
      };
    });
  }

  // Include legacy tuples if provided and not already set
  if (Array.isArray(data.legacyNotes)) {
    data.legacyNotes.forEach((tuple) => {
      if (!Array.isArray(tuple) || tuple.length < 2) return;
      const [key] = tuple as NoteExportTuple;
      if (notes[key]) return;
      const note = createVerseNoteFromTuple(tuple as NoteExportTuple, now);
      notes[key] = note;
    });
  }

  const surahNotes = normalizeSurahNotes(data.surahNotes, now);
  const bookmark = parseVerseKey(data.bookmarks?.[0]);
  const knowledgeBase = sanitizeKnowledgeBase(data.knowledgeBase);

  return { notes, surahNotes, bookmark, ...(knowledgeBase ? { knowledgeBase } : {}) };
};

export const parseBackupData = (
  raw: BackupData | (BackupData & { surahNotes?: SurahNoteExport[] }) | unknown
): ParsedBackupData => {
  if (!raw || typeof raw !== "object") {
    throw new Error("Invalid backup data");
  }

  const version = (raw as { v?: number }).v ?? 1;
  if (version === 2) {
    return parseV2(raw as BackupDataV2);
  }
  return parseV1(raw as BackupDataV1 & { surahNotes?: SurahNoteExport[] });
};

export const mergeParsedBackupData = (
  current: {
    notes: Record<string, VerseNote>;
    surahNotes: Record<number, SurahNote>;
    bookmark?: VerseRef | null;
    knowledgeBase?: KnowledgeBase | null;
  },
  incoming: ParsedBackupData
): ParsedBackupData => {
  const mergedNotes = { ...current.notes };
  Object.entries(incoming.notes).forEach(([key, note]) => {
    mergedNotes[key] = note;
  });

  const mergedSurahNotes = { ...current.surahNotes };
  Object.entries(incoming.surahNotes).forEach(([key, note]) => {
    mergedSurahNotes[Number(key)] = note;
  });

  const bookmark = incoming.bookmark ?? current.bookmark ?? undefined;

  const knowledgeBase = incoming.knowledgeBase
    ? mergeKnowledgeBases(current.knowledgeBase, incoming.knowledgeBase)
    : (current.knowledgeBase ?? undefined);

  return {
    notes: mergedNotes,
    surahNotes: mergedSurahNotes,
    bookmark,
    ...(knowledgeBase ? { knowledgeBase } : {}),
  };
};
