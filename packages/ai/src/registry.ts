import { AIProvider } from './types';
import { gemini } from './adapters/gemini';
import { openrouter } from './adapters/openrouter';
import { ollama } from './adapters/ollama';
import { huggingface } from './adapters/huggingface';

const providers: Record<string, AIProvider> = {
  gemini,
  openrouter,
  ollama,
  huggingface,
};

export function getProvider(id: string) {
  return providers[id];
}

export function listProviders() {
  return Object.values(providers);
}
