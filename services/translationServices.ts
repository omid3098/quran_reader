/**
 * Translation Services Registry
 *
 * A generic, extensible registry for external translation services.
 * Each service specifies which target languages it supports.
 */

/**
 * Persian surah names for wiki.ahlolbait.com URLs
 * Array is 0-indexed: index 0 = Surah 1, index 113 = Surah 114
 * Names use underscores for multi-word surahs (e.g., "آل_عمران")
 */
const SURAH_NAMES_PERSIAN = [
  "فاتحه",
  "بقره",
  "آل_عمران",
  "نساء",
  "مائده", // 1-5
  "انعام",
  "اعراف",
  "انفال",
  "توبه",
  "یونس", // 6-10
  "هود",
  "یوسف",
  "رعد",
  "ابراهیم",
  "حجر", // 11-15
  "نحل",
  "اسراء",
  "کهف",
  "مریم",
  "طه", // 16-20
  "انبیاء",
  "حج",
  "مومنون",
  "نور",
  "فرقان", // 21-25
  "شعراء",
  "نمل",
  "قصص",
  "عنکبوت",
  "روم", // 26-30
  "لقمان",
  "سجده",
  "احزاب",
  "سبا",
  "فاطر", // 31-35
  "یس",
  "صافات",
  "ص",
  "زمر",
  "غافر", // 36-40
  "فصلت",
  "شورى",
  "زخرف",
  "دخان",
  "جاثیه", // 41-45
  "احقاف",
  "محمد",
  "فتح",
  "حجرات",
  "ق", // 46-50
  "ذاریات",
  "طور",
  "نجم",
  "قمر",
  "الرحمن", // 51-55
  "واقعه",
  "حدید",
  "مجادله",
  "حشر",
  "ممتحنه", // 56-60
  "صف",
  "جمعه",
  "منافقون",
  "تغابن",
  "طلاق", // 61-65
  "تحریم",
  "ملک",
  "قلم",
  "الحاقة",
  "معارج", // 66-70
  "نوح",
  "جن",
  "مزمل",
  "مدثر",
  "قیامة", // 71-75
  "انسان",
  "مرسلات",
  "نبا",
  "نازعات",
  "عبس", // 76-80
  "تکویر",
  "انفطار",
  "مطففین",
  "انشقاق",
  "بروج", // 81-85
  "الطارق",
  "الأعلى",
  "غاشیه",
  "فجر",
  "بلد", // 86-90
  "الشمس",
  "لیل",
  "ضحى",
  "انشراح",
  "التین", // 91-95
  "علق",
  "قدر",
  "بینه",
  "زلزال",
  "العادیات", // 96-100
  "القارعة",
  "تکاثر",
  "العصر",
  "همزه",
  "فیل", // 101-105
  "قریش",
  "ماعون",
  "کوثر",
  "کافرون",
  "نصر", // 106-110
  "مسد",
  "اخلاص",
  "فلق",
  "ناس", // 111-114
] as const;

/**
 * Parse verse key and return surah name for wiki URLs
 * @param verseKey - Format "surah:ayah" (e.g., "2:255")
 * @returns Surah and ayah numbers with Persian name, or null if invalid
 */
function parseVerseKeyForWiki(verseKey: string): {
  surahNumber: number;
  ayahNumber: number;
  surahNamePersian: string;
} | null {
  if (!verseKey || typeof verseKey !== "string") return null;

  const parts = verseKey.split(":");
  if (parts.length !== 2) return null;

  const surahNumber = parseInt(parts[0], 10);
  const ayahNumber = parseInt(parts[1], 10);

  if (isNaN(surahNumber) || surahNumber < 1 || surahNumber > 114) return null;
  if (isNaN(ayahNumber) || ayahNumber < 1) return null;

  return {
    surahNumber,
    ayahNumber,
    surahNamePersian: SURAH_NAMES_PERSIAN[surahNumber - 1],
  };
}

export interface TranslationService {
  id: string;
  name: string;
  /** Array of supported target language codes, or ['*'] for all languages */
  supportedTargetLanguages: string[];
  /**
   * Generate URL for translating the given word to the target language
   * @param word - The selected word/text
   * @param targetLanguage - The target language code (e.g., 'en', 'fa')
   * @param verseKey - Optional verse reference (e.g., "2:255")
   */
  getUrl: (word: string, targetLanguage: string, verseKey?: string) => string;
  /** Whether the service can be embedded in an iframe */
  supportsIframe: boolean;
}

/**
 * Registry of all available translation services.
 * To add a new service, simply add an entry to this array.
 */
export const TRANSLATION_SERVICES: TranslationService[] = [
  {
    id: "abadis",
    name: "Abadis",
    supportedTargetLanguages: ["fa"], // Persian only
    getUrl: (word: string, _targetLanguage: string, _verseKey?: string) => {
      return `https://abadis.ir/fatofa/${encodeURIComponent(word)}`;
    },
    supportsIframe: false, // Does not support iframe embedding
  },
  {
    id: "vajehyab",
    name: "Vajehyab",
    supportedTargetLanguages: ["fa"], // Persian only
    getUrl: (word: string, _targetLanguage: string, _verseKey?: string) => {
      return `https://www.vajehyab.com/?q=${encodeURIComponent(word)}`;
    },
    supportsIframe: false, // Blocks iframe embedding
  },
  {
    id: "wiki_ahlolbait",
    name: "Wiki Ahlolbait",
    supportedTargetLanguages: ["fa", "en"], // Available to both, content is Persian
    getUrl: (_word: string, _targetLanguage: string, verseKey?: string) => {
      if (!verseKey) {
        return "https://wiki.ahlolbait.com/";
      }

      const parsed = parseVerseKeyForWiki(verseKey);
      if (!parsed) {
        return "https://wiki.ahlolbait.com/";
      }

      const { ayahNumber, surahNamePersian } = parsed;
      // URL format: https://wiki.ahlolbait.com/آیه_{verse_number}_سوره_{surah_name}
      return `https://wiki.ahlolbait.com/آیه_${ayahNumber}_سوره_${surahNamePersian}`;
    },
    supportsIframe: false,
  },
  {
    id: "almaany",
    name: "Almaany",
    // Almaany supports Arabic-to-English and Arabic-to-Persian translations
    supportedTargetLanguages: ["en", "fa"],
    getUrl: (word: string, targetLanguage: string, _verseKey?: string) => {
      // Almaany uses language codes in URL path
      const langMap: Record<string, string> = {
        en: "en",
        fa: "fa",
      };
      const lang = langMap[targetLanguage] || "en";
      return `https://www.almaany.com/${lang}/dict/ar-${lang}/${encodeURIComponent(word)}`;
    },
    supportsIframe: false, // Blocks iframe embedding
  },
  {
    id: "google",
    name: "Google Translate",
    supportedTargetLanguages: ["*"], // All languages
    getUrl: (word: string, targetLanguage: string, _verseKey?: string) => {
      // Google Translate URL format: source language is always Arabic (ar)
      return `https://translate.google.com/?sl=ar&tl=${targetLanguage}&text=${encodeURIComponent(word)}&op=translate`;
    },
    supportsIframe: false, // Google blocks iframe embedding
  },
];

/**
 * Get translation services available for a specific target language.
 *
 * @param targetLanguage - The language code (e.g., 'en', 'fa')
 * @returns Array of services that support translating to that language
 */
export function getServicesForLanguage(targetLanguage: string): TranslationService[] {
  return TRANSLATION_SERVICES.filter(
    (service) =>
      service.supportedTargetLanguages.includes("*") ||
      service.supportedTargetLanguages.includes(targetLanguage)
  );
}
