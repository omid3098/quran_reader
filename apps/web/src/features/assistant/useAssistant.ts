import { getProvider } from '@openquran/ai/registry';
import type { ChatMessage } from '@openquran/ai/types';

export type ProviderConfig = {
  selected: string;
  keys: Record<string, string>;
};

export function createAssistant(cfg: ProviderConfig) {
  const p = getProvider(cfg.selected);
  p.configure(cfg.keys);

  async function ask(
    messages: ChatMessage[],
    opts?: { json?: boolean; model?: string }
  ) {
    const res = await (p as any).chat({
      model: opts?.model,
      messages,
      responseFormat: opts?.json ? 'json' : 'text',
    });
    return res.text ?? '';
  }

  async function listModels() {
    if (typeof (p as any).listModels === 'function') return (p as any).listModels();
    return [];
  }

  return { ask, listModels, provider: p };
}
