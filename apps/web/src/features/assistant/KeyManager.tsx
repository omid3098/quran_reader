'use client'

import { Key as KeyIcon } from 'lucide-react';

export function KeyManager({
  provider,
  keys,
  onSave,
}: {
  provider: string;
  keys: Record<string, string>;
  onSave: (k: Record<string, string>) => void;
}) {
  const fieldsByProvider: Record<
    string,
    Array<{ key: string; label: string; placeholder?: string }>
  > = {
    gemini: [{ key: 'GEMINI_API_KEY', label: 'Gemini API Key' }],
    openrouter: [{ key: 'OPENROUTER_API_KEY', label: 'OpenRouter API Key' }],
    huggingface: [{ key: 'HF_API_TOKEN', label: 'Hugging Face Access Token' }],
    ollama: [
      {
        key: 'OLLAMA_URL',
        label: 'Ollama URL',
        placeholder: 'http://localhost:11434',
      },
    ],
  };
  const fields = fieldsByProvider[provider] ?? [];
  return (
    <div className="grid gap-2">
      {fields.map((f) => (
        <div key={f.key} className="flex items-center gap-2">
          <KeyIcon className="icon" aria-hidden />
          <input
            type={f.key.includes('URL') ? 'text' : 'password'}
            className="input flex-1"
            placeholder={f.placeholder ?? f.label}
            value={keys[f.key] ?? ''}
            onChange={(e) => onSave({ ...keys, [f.key]: e.target.value })}
          />
        </div>
      ))}
    </div>
  );
}
