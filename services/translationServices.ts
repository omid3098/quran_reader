/**
 * Translation Services Registry
 *
 * A generic, extensible registry for external translation services.
 * Each service specifies which target languages it supports.
 */

export interface TranslationService {
  id: string;
  name: string;
  /** Array of supported target language codes, or ['*'] for all languages */
  supportedTargetLanguages: string[];
  /** Generate URL for translating the given word to the target language */
  getUrl: (word: string, targetLanguage: string) => string;
  /** Whether the service can be embedded in an iframe */
  supportsIframe: boolean;
}

/**
 * Registry of all available translation services.
 * To add a new service, simply add an entry to this array.
 */
export const TRANSLATION_SERVICES: TranslationService[] = [
  {
    id: "vajehyab",
    name: "Vajehyab",
    supportedTargetLanguages: ["fa"], // Persian only
    getUrl: (word: string) => {
      return `https://www.vajehyab.com/?q=${encodeURIComponent(word)}`;
    },
    supportsIframe: false, // Blocks iframe embedding
  },
  {
    id: "almaany",
    name: "Almaany",
    // Almaany supports Arabic-to-English and Arabic-to-Persian translations
    supportedTargetLanguages: ["en", "fa"],
    getUrl: (word: string, targetLanguage: string) => {
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
    getUrl: (word: string, targetLanguage: string) => {
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
