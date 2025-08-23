export type Role = 'system' | 'user' | 'assistant' | 'tool';

export type ChatMessage = {
  role: Role;
  content: string;
  name?: string; // for tool messages
};

export type ChatParams = {
  model?: string;
  messages: ChatMessage[];
  stream?: boolean;
  responseFormat?: 'text' | 'json';
  jsonSchema?: any; // optional JSON Schema for structured output
};

export type StreamDelta =
  | { type: 'text'; token: string }
  | { type: 'error'; error: string };

export interface ChatResult {
  text?: string;
  toolCalls?: Array<{ name: string; arguments: unknown }>;
}

export interface AIProvider {
  id: string;
  label: string;
  capabilities: {
    streaming: boolean;
    jsonMode: boolean;
    toolUse: boolean;
    imagesIn: boolean;
    maxInputTokens?: number;
    listModels?: boolean; // supports dynamic model listing in UI
  };
  configure(config: Record<string, string>): void;
  chat(
    params: ChatParams,
    signal?: AbortSignal
  ): Promise<ChatResult> | AsyncIterable<StreamDelta>;
  listModels?(): Promise<Array<{ id: string; name?: string; free?: boolean; note?: string }>>;
}
