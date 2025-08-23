import { AIProvider, ChatParams, ChatResult } from '../types';

let API_KEY = '';
const DEFAULT_MODEL = 'gemini-2.0-flash';

export const gemini: AIProvider = {
  id: 'gemini',
  label: 'Google (AI Studio)',
  capabilities: {
    streaming: true,
    jsonMode: true,
    toolUse: true,
    imagesIn: true,
    maxInputTokens: 1_000_000,
    listModels: true,
  },

  configure(cfg) {
    API_KEY = cfg.GEMINI_API_KEY || '';
  },

  async listModels() {
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`;
    const r = await fetch(url);
    const data = await r.json();
    const items = (data.models ?? data.data ?? []).map((m: any) => ({
      id: m.name?.replace('models/', '') ?? m.id,
      name: m.displayName || m.name,
    }));
    return items;
  },

  async chat(params: ChatParams, signal?: AbortSignal): Promise<ChatResult> {
    const model = params.model || DEFAULT_MODEL;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${API_KEY}`;

    const contents = params.messages.map((m) => ({ role: m.role, parts: [{ text: m.content }] }));
    const generationConfig: Record<string, any> = {};
    if (params.responseFormat === 'json') {
      generationConfig.response_mime_type = 'application/json';
    }

    const r = await fetch(url, {
      method: 'POST',
      signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents, generationConfig }),
    });
    const data = await r.json();
    const text =
      data?.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join('') ?? '';
    return { text };
  },
};
