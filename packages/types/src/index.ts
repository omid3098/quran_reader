export type VerseRef = { surah: number; ayah: number };

export interface VerseDTO {
  id?: string;
  ref: VerseRef;
  text_ar_uthmani?: string;
  text_ar_simple?: string;
  translations?: { translationId: string; text: string }[];
}

export interface TranslationMeta {
  id: string;
  name: string;
  language: string;
  translator?: string | null;
  source?: string | null;
  lastUpdate?: string | null;
}

export interface NoteDTO {
  id: string;
  verseId: string;
  bodyMd: string;
  visibility: 'private' | 'public';
  createdAt: string;
  updatedAt: string;
}

