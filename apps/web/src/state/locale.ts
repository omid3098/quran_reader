'use client'

import { useEffect, useState } from 'react';
import type { Locale } from '../i18n';

const STORAGE_KEY = 'oqr.locale.v1';
const DEFAULT_LOCALE: Locale = 'en';

export function useLocale() {
  const [locale, setLocale] = useState<Locale>(DEFAULT_LOCALE);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as Locale | null;
      if (stored === 'en' || stored === 'fa') {
        setLocale(stored);
        return;
      }
      const nav = navigator.language.slice(0, 2);
      if (nav === 'fa') setLocale('fa');
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, locale);
    } catch {}
  }, [locale]);

  return [locale, setLocale] as const;
}
