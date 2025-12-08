import { textToBlocks } from "./noteContent";
import {
  BackupData,
  BackupDataV1,
  BackupDataV2,
  NoteExportTuple,
  SurahNote,
  SurahNoteExport,
  VerseNote,
  VerseRef,
} from "../types";

export interface ParsedBackupData {
  notes: Record<string, VerseNote>;
  surahNotes: Record<number, SurahNote>;
  bookmark?: VerseRef;
}

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
    normalized[note.surahId] = {
      surahId: note.surahId,
      blocks: note.blocks,
      updatedAt: note.updatedAt || fallbackDate,
      createdAt: note.createdAt || fallbackDate,
    };
  });
  return normalized;
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
      const timestamp = note.updatedAt || now;
      notes[note.key] = {
        verseKey: note.key,
        blocks: note.blocks,
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

  return { notes, surahNotes, bookmark };
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

  return { notes: mergedNotes, surahNotes: mergedSurahNotes, bookmark };
};
