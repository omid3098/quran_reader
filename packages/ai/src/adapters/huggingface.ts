import { AIProvider, ChatParams, ChatResult } from '../types';

let TOKEN = '';
const DEFAULT_MODEL = 'HuggingFaceH4/zephyr-7b-beta';

export const huggingface: AIProvider = {
  id: 'huggingface',
  label: 'Hugging Face',
  capabilities: {
    streaming: false,
    jsonMode: false,
    toolUse: false,
    imagesIn: false,
    listModels: false,
  },

  configure(cfg) {
    TOKEN = cfg.HF_API_TOKEN || '';
  },

  async chat(params: ChatParams, signal?: AbortSignal): Promise<ChatResult> {
    const text = params.messages
      .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
      .join('\n');
    const r = await fetch(
      `https://api-inference.huggingface.co/models/${params.model || DEFAULT_MODEL}`,
      {
        method: 'POST',
        signal,
        headers: {
          Authorization: `Bearer ${TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ inputs: text, parameters: { max_new_tokens: 400 } }),
      }
    );
    const data = await r.json();
    const out = Array.isArray(data)
      ? data[0]?.generated_text
      : data?.generated_text ?? '';
    return { text: out };
  },
};
