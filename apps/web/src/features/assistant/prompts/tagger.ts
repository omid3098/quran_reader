import type { ChatMessage } from '@openquran/ai/types';

export async function tagVerse(
  assistant: ReturnType<typeof import('../useAssistant').createAssistant>,
  verseText: string
) {
  const messages: ChatMessage[] = [
    { role: 'system', content: 'You return ONLY JSON: {"tags": string[] }' },
    {
      role: 'user',
      content: `Verse:\n${verseText}\nReturn JSON object with "tags".`,
    },
  ];
  const out = await assistant.ask(messages, { json: true });
  try {
    return (JSON.parse(out).tags as string[]) ?? [];
  } catch {
    return [];
  }
}
