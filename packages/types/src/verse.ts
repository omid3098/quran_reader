export type VerseRef = { surah: number; ayah: number };

export interface VerseDTO {
  id?: string;
  ref: VerseRef;
  text_ar_uthmani?: string;
  text_ar_simple?: string;
  translations?: { translationId: string; text: string }[];
}
