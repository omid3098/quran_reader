import { describe, it, expect, vi } from 'vitest';
import { openrouter } from '../src/adapters/openrouter';
import { ollama } from '../src/adapters/ollama';

// minimal unit tests for adapters

describe('openrouter adapter', () => {
  it('maps listModels and marks free models', async () => {
    const mock = vi
      .spyOn(global, 'fetch')
      .mockResolvedValue({
        json: async () => ({
          data: [
            { id: 'a', name: 'A', pricing: { prompt: '0', completion: '0' } },
            { id: 'b', name: 'B', pricing: { prompt: '1', completion: '1' } },
          ],
        }),
      } as any);
    const models = await openrouter.listModels!();
    expect(models).toEqual([
      { id: 'a', name: 'A', free: true },
      { id: 'b', name: 'B', free: false },
    ]);
    mock.mockRestore();
  });
});

describe('ollama adapter', () => {
  it('sends chat request and returns text', async () => {
    const mock = vi
      .spyOn(global, 'fetch')
      .mockResolvedValue({ json: async () => ({ message: { content: 'hi' } }) } as any);
    const res = await ollama.chat({ messages: [{ role: 'user', content: 'hi' }] });
    expect(res.text).toBe('hi');
    mock.mockRestore();
  });
});
