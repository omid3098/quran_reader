export interface TranslationMeta {
  id: string;
  name: string;
  language: string;
  translator?: string | null;
  source?: string | null;
  lastUpdate?: string | null;
}
