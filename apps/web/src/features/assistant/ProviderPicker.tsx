'use client'

import { listProviders } from '@openquran/ai/registry';
import { HelpCircle, Sparkles, Share2, Cpu, Smile } from 'lucide-react';

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
  const infoLinks: Record<string, string> = {
    gemini: 'https://aistudio.google.com/app/apikey',
    openrouter: 'https://openrouter.ai/docs/api-reference/authentication',
    huggingface: 'https://huggingface.co/settings/tokens',
    ollama: 'https://ollama.com/download',
  };
  return (
    <div className="flex items-center gap-2">
      {providers.map((p) => {
        const Icon = icons[p.id];
        return (
          <div key={p.id} className="flex flex-col items-center gap-1">
            <button
              type="button"
              className={`icon-btn${value === p.id ? ' active' : ''}`}
              onClick={() => onChange(p.id)}
              aria-label={p.label}
              disabled={p.id === 'ollama' && disableOllama}
            >
              <Icon className="icon" aria-hidden />
            </button>
            <a
              href={infoLinks[p.id]}
              target="_blank"
              rel="noreferrer"
              className="icon-btn text-xs"
              aria-label={`Get ${p.label} key / install`}
            >
              <HelpCircle className="icon" aria-hidden />
            </a>
          </div>
        );
      })}
    </div>
  );
}
