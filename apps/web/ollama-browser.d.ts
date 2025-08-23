declare module 'ollama/browser' {
  export class Ollama {
    constructor(init: { host?: string })
    list(): Promise<any>
    generate(options: any): Promise<any>
  }
}
