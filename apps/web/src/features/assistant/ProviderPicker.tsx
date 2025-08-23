'use client'

import { listProviders } from '@openquran/ai/registry';
import { Sparkles, Share2, Cpu, Smile } from 'lucide-react';

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
  const icons: Record<string, any> = {
    gemini: Sparkles,
    openrouter: Share2,
    ollama: Cpu,
    huggingface: Smile,
  };
  return (
    <div className="grid gap-2">
      {providers.map((p) => {
        const Icon = icons[p.id];
        const isActive = value === p.id;
        return (
          <button
            key={p.id}
            type="button"
            className="button w-full flex items-center gap-2 justify-start"
            onClick={() => onChange(p.id)}
            aria-label={p.label}
            disabled={p.id === 'ollama' && disableOllama}
            style={
              isActive
                ? { borderColor: 'var(--accent)', color: 'var(--accent)' }
                : undefined
            }
          >
            <Icon className="icon" aria-hidden />
            <span>{p.label}</span>
          </button>
        );
      })}
    </div>
  );
}
