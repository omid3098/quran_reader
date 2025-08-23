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
        prompt: `Provide the three-letter Arabic root of the word "${word}". Respond with only the root.`,
        stream: false,
      })
      return (res.response || '').trim()
    } catch {
      return ''
    }
  }
}
