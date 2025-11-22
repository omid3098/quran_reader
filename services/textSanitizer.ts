// Utility to strip Quranic annotation and ornamental characters that should not appear in verse text.
// We intentionally keep regular letters, diacritics, and small high waw/yeh (06E5/06E6) because they
// are part of the Uthmani orthography, while removing stop signs, rub-el-hizb, sajdah markers, and
// other decorative symbols.
const NON_TEXT_QURAN_CHARS = /[\u0610-\u061A\u06D6-\u06E4\u06E7-\u06ED\u08D4-\u08E1\u08E3-\u08FF]/g;

export const sanitizeQuranText = (text: string): string => {
  if (!text) return '';

  return text
    .replace(NON_TEXT_QURAN_CHARS, '')
    .replace(/\s+/g, ' ')
    .trim();
};
