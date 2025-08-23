"use client"

import { Ollama } from 'ollama/browser'

export class OllamaClient {
  private client: Ollama
  private host: string

  constructor(host: string) {
    this.client = new Ollama({ host })
    this.host = host
  }

  async listModels(): Promise<string[]> {
    const res = await this.client.list()
    return res.models?.map((m: any) => m.name) ?? []
  }

  async getRoot(word: string, verse: string, model: string, signal?: AbortSignal): Promise<string> {
    try {
      const res = await fetch(`${this.host}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          prompt: `You are a concise morphological analyzer. Given the Quranic verse "${verse}", determine the three-letter Arabic root of the word "${word}" in that verse. Reply with only the root letters in Arabic, separated by spaces, and no other text. Do not explain your reasoning.`,
          stream: false,
        }),
        signal,
      })
      const data = await res.json()
      let answer = (data.response || '').trim()
      answer = answer.replace(/<think>[\s\S]*?<\/think>/i, '').trim()
      return answer
    } catch {
      return ''
    }
  }
}
