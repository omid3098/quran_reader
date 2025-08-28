import en from './en';
import fa from './fa';

export type Locale = 'en' | 'fa';
export type UIKey = keyof typeof en;

const translations: Record<Locale, Record<UIKey, string>> = {
  en,
  fa,
};

export function t(locale: Locale, key: UIKey): string {
  return translations[locale][key] || translations.en[key] || key;
}
