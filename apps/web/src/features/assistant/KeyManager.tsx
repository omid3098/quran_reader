'use client'

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
        <label key={f.key} className="text-sm">
          {f.label}
          <input
            className="w-full border rounded p-1"
            placeholder={f.placeholder ?? ''}
            value={keys[f.key] ?? ''}
            onChange={(e) => onSave({ ...keys, [f.key]: e.target.value })}
          />
        </label>
      ))}
    </div>
  );
}
