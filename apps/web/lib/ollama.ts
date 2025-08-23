"use client"

export class OllamaClient {
  private readonly host: string
  private clientPromise: Promise<any> | null = null

  constructor(host: string) {
    this.host = host
  }

  private async getClient(): Promise<any> {
    if (!this.clientPromise) {
      this.clientPromise = import('ollama/browser').then(({ Ollama }) => new Ollama({ host: this.host }))
    }
    return this.clientPromise
  }

  async listModels(): Promise<string[]> {
    try {
      const client = await this.getClient()
      const res = await client.list()
      return res.models?.map((m: any) => m.name) ?? []
    } catch {
      return []
    }
  }

  async getRoot(word: string, model: string): Promise<string> {
    try {
      const client = await this.getClient()
      const res = await client.generate({
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
