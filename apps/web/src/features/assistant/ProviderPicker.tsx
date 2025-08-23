'use client'

import { listProviders } from '@openquran/ai/registry';

export function ProviderPicker({
  value,
  onChange,
  disableOllama,
}: {
  value: string;
  onChange: (v: string) => void;
  disableOllama?: boolean;
}) {
  const providers = listProviders();
  return (
    <div className="flex gap-2 items-center">
      <label className="text-sm">Provider</label>
      <select
        className="border rounded p-1"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {providers.map((p) => (
          <option key={p.id} value={p.id} disabled={p.id === 'ollama' && disableOllama}>
            {p.label}
          </option>
        ))}
      </select>
      <a
        className="text-blue-500 underline text-xs"
        href=
          {value === 'gemini'
            ? 'https://aistudio.google.com/app/apikey'
            : value === 'openrouter'
            ? 'https://openrouter.ai/docs/api-reference/authentication'
            : value === 'huggingface'
            ? 'https://huggingface.co/settings/tokens'
            : 'https://ollama.com/download'}
        target="_blank"
        rel="noreferrer"
        title="Where to get an API key / install"
      >
        ℹ︎ Get key / Install
      </a>
    </div>
  );
}
