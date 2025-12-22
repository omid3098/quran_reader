export interface Chapter {
  id: number;
  revelation_place: string;
  revelation_order: number;
  bismillah_pre: boolean;
  name_simple: string;
  name_complex: string;
  name_arabic: string;
  verses_count: number;
  translated_name: {
    language_name: string;
    name: string;
  };
}

export interface Verse {
  id: number;
  verse_key: string; // "1:1"
  text_uthmani: string;
  text_simple: string;
  translations: {
    id: string;
    resource_id: string;
    text: string;
    direction?: string;
    resource_name?: string;
  }[];
}

export interface AudioResponse {
  audio_file: {
    id: number;
    chapter_id: number;
    file_size: number;
    format: string;
    audio_url: string;
  };
}

export interface SearchResult {
  surah: number;
  ayah: number;
  context: string;
}

export interface ExplanationResult {
  text: string;
}

export interface Reciter {
  id: string;
  name: string;
  subfolder: string; // used for audio url construction
  style?: string;
}

export interface TranslationResource {
  id: string;
  name: string;
  author_name: string;
  slug: string;
  language_name: string;
}

export type UserLanguage = "en" | "fa";

export interface AppSettings {
  fontSize: number;
  translationIds: string[];
  reciterId: string;
  scriptType: "uthmani" | "simple";
  showTranslation: boolean;
  autoPlay: boolean;
  theme: "light" | "dark";
  userLanguage?: UserLanguage;
}

// Internal Note Structure (Legacy - plain text)
export interface Note {
  text: string;
  updatedAt: string;
}

// Rich Note Structure (BlockNote-based)
export interface RichNote {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  blocks: any[]; // BlockNote PartialBlock[] - using any to avoid tight coupling
  updatedAt: string;
  createdAt: string;
}

// Verse-level rich notes
export interface VerseNote extends RichNote {
  verseKey: string;
}

// Surah-level notes
export interface SurahNote extends RichNote {
  surahId: number;
}

// For Import/Export JSON Structure
export type NoteExportTuple = [string, string, string]; // [verseKey, text, updatedAt] - Legacy

// Rich note export format
export interface RichNoteExport {
  key: string; // verse_key for verse notes
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  blocks: any[];
  updatedAt: string;
  createdAt: string;
}

export interface SurahNoteExport {
  surahId: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  blocks: any[];
  updatedAt: string;
  createdAt: string;
}

// Backup data v1 (legacy)
export interface BackupDataV1 {
  v: 1;
  bookmarks: string[];
  notes: NoteExportTuple[];
  surahNotes?: SurahNoteExport[];
  exportedAt: string;
}

// Backup data v2 (rich notes)
export interface BackupDataV2 {
  v: 2;
  bookmarks: string[];
  notes: RichNoteExport[]; // Rich verse notes
  surahNotes: SurahNoteExport[]; // Surah-level notes
  legacyNotes?: NoteExportTuple[]; // For migration support
  meta?: {
    editor?: string;
    schemaVersion?: string;
  };
  exportedAt: string;
}

// Union type for import compatibility
export type BackupData = BackupDataV1 | BackupDataV2;

// --- Analysis & Research Types ---

export interface QuranWord {
  id: number;
  position: number;
  text_uthmani: string;
  text_simple?: string; // sometimes provided
  root?: string; // The raw Arabic root e.g. "كتب"
  lemma?: string; // The lemma/base form of the word
}

export interface RootWordForm {
  form: string; // Display form of the word in the Quranic text
  normalizedForm: string; // Normalized form for matching/deduplication
  lemma?: string;
  occurrences: number;
}

export interface RootAnalysis {
  root: string;
  occurrences: number;
  verses: {
    verse_key: string;
    text: string; // full verse text
    wordIndex?: number; // position of the matched word (for truncation)
  }[];
  debugInfo?: {
    selectedText: string;
    normalizedText: string;
    abjadValue: number;
    sameAbjadWords?: string[];
    verseWords?: {
      text: string;
      normalized: string;
      root: string | null;
    }[];
  };
  wordForms: RootWordForm[];
}

export interface SelectionContext {
  text: string;
  verseKey?: string; // "1:1" - optional for standalone words
  rect: DOMRect;
  type: "single" | "phrase";
  wordIndex?: number; // The 0-based index of the word in the verse
}

// --- Bookmark & Navigation Types ---

export interface VerseRef {
  surahId: number;
  verseNumber: number;
  verseKey: string; // "2:255"
}

export interface BreadcrumbEntry {
  verseRef: VerseRef;
  timestamp: number;
}
