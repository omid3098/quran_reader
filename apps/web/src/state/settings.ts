'use client'

import { useSyncedStorage } from '../../hooks/use-synced-storage';

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
  return useSyncedStorage<AISettings>(STORAGE_KEY, DEFAULT);
}
