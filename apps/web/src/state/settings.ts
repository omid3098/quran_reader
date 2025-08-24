'use client'

import { useEffect, useState } from 'react';

export interface AISettings {
  enabled: boolean;
  selected: string;
  keys: Record<string, string>;
  models: Record<string, string>;
}

const STORAGE_KEY = 'oqr.ai.settings.v1';
const DEFAULT: AISettings = {
  enabled: false,
  selected: 'gemini',
  keys: {},
  models: {},
};

export function useAISettings() {
  const [settings, setSettings] = useState<AISettings>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? { ...DEFAULT, ...JSON.parse(raw) } : DEFAULT;
    } catch {
      return DEFAULT;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {}
  }, [settings]);

  return [settings, setSettings] as const;
}
