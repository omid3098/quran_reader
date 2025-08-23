"use client"

import { Ollama } from 'ollama/browser'

export class OllamaClient {
  private client: Ollama

  constructor(host: string) {
    this.client = new Ollama({ host })
  }

  async listModels(): Promise<string[]> {
    try {
      const res = await this.client.list()
      return res.models?.map((m: any) => m.name) ?? []
    } catch {
      return []
    }
  }

  async getRoot(word: string, model: string): Promise<string> {
    try {
      const res = await this.client.generate({
        model,
        prompt: `You are a concise morphological analyzer. Determine the three-letter Arabic root of the word "${word}". Reply with only the root letters in Arabic, separated by spaces, and no other text. Do not explain your reasoning.`,
        stream: false,
      })
      let answer = (res.response || '').trim()
      answer = answer.replace(/<think>[\s\S]*?<\/think>/i, '').trim()
      return answer
    } catch {
      return ''
    }
  }
}
