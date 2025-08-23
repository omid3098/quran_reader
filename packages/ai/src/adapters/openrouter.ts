import { AIProvider, ChatParams, ChatResult } from '../types';

const DEFAULT_MODEL = 'google/gemma-2-9b-it:free';
let API_KEY = '';

export const openrouter: AIProvider = {
  id: 'openrouter',
  label: 'OpenRouter',
  capabilities: {
    streaming: true,
    jsonMode: true,
    toolUse: true,
    imagesIn: false,
    listModels: true,
  },

  configure(cfg) {
    API_KEY = cfg.OPENROUTER_API_KEY || '';
  },

  async listModels() {
    const r = await fetch('https://openrouter.ai/api/v1/models');
    const data = await r.json();
    const items = (data.data ?? []).map((m: any) => {
      const prompt = Number(m?.pricing?.prompt ?? '0');
      const completion = Number(m?.pricing?.completion ?? '0');
      const id = m.id || m.canonical_slug || m.name;
      const free = id?.includes(':free') || (prompt === 0 && completion === 0);
      return { id, name: m.name ?? id, free };
    });
    return items;
  },

  async chat(params: ChatParams, signal?: AbortSignal): Promise<ChatResult> {
    const url = 'https://openrouter.ai/api/v1/chat/completions';
    const r = await fetch(url, {
      method: 'POST',
      signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${API_KEY}`,
        'HTTP-Referer': location.origin,
        'X-Title': 'OpenQuranReader',
      },
      body: JSON.stringify({
        model: params.model || DEFAULT_MODEL,
        response_format:
          params.responseFormat === 'json' ? { type: 'json_object' } : undefined,
        messages: params.messages.map((m) => ({ role: m.role, content: m.content })),
      }),
    });
    const data = await r.json();
    const text = data?.choices?.[0]?.message?.content ?? '';
    return { text };
  },
};
