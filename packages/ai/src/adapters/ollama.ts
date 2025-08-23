import { AIProvider, ChatParams, ChatResult } from '../types';

let BASE = 'http://localhost:11434';
const DEFAULT_MODEL = 'llama3.2:3b-instruct';

export const ollama: AIProvider = {
  id: 'ollama',
  label: 'Ollama (local)',
  capabilities: {
    streaming: true,
    jsonMode: true,
    toolUse: false,
    imagesIn: false,
    listModels: true,
  },

  configure(cfg) {
    BASE = cfg.OLLAMA_URL || BASE;
  },

  async listModels() {
    const r = await fetch(`${BASE}/api/tags`);
    const data = await r.json();
    return (data.models ?? []).map((m: any) => ({ id: m.name, name: m.name }));
  },

  async chat(params: ChatParams, signal?: AbortSignal): Promise<ChatResult> {
    const r = await fetch(`${BASE}/api/chat`, {
      method: 'POST',
      signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: params.model || DEFAULT_MODEL,
        messages: params.messages.map((m) => ({ role: m.role, content: m.content })),
        stream: false,
        format: params.responseFormat === 'json' ? 'json' : undefined,
      }),
    });
    const data = await r.json();
    const text = data?.message?.content ?? data?.response ?? '';
    return { text };
  },
};
