"use client"

import { Ollama } from 'ollama/browser'

export class OllamaClient {
  private client: Ollama
  private host: string

  constructor(endpoint: string) {
    // Ensure the endpoint includes a protocol and no trailing slash
    if (!/^https?:\/\//i.test(endpoint)) endpoint = `http://${endpoint}`
    this.host = endpoint.replace(/\/+$/, '')
    this.client = new Ollama({ host: this.host })
  }

  async listModels(): Promise<string[]> {
    try {
      const res = await fetch(`${this.host}/api/tags`)
      if (!res.ok) return []
      const data = await res.json()
      return data.models?.map((m: any) => m.name) ?? []
    } catch {
      return []
    }
  }

  async getRoot(word: string, model: string, signal?: AbortSignal): Promise<string> {
    try {
      const res = await this.client.generate({
        model,
        prompt: `You are a concise morphological analyzer. Determine the three-letter Arabic root of the word "${word}". Reply with only the root letters in Arabic, separated by spaces, and no other text. Do not explain your reasoning.`,
        stream: false,
        signal,
      })
      let answer = (res.response || '').trim()
      answer = answer.replace(/<think>[\s\S]*?<\/think>/i, '').trim()
      return answer
    } catch (err: any) {
      if (err?.name === 'AbortError') throw err
      return ''
    }
  }
}
