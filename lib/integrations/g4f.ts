export class G4FIntegration {
  private client: any;
  private isReady: boolean = false;

  constructor() {
    if ((window as any).g4fReady) {
      this.initClient();
    } else {
      window.addEventListener('g4f-ready', () => this.initClient());
    }
  }

  private initClient() {
    const Client = (window as any).G4FClient;
    if (Client) {
      this.client = new Client();
      this.isReady = true;
      console.log('G4F Client Initialized');
    }
  }

  async chat(message: string, systemPrompt: string, model: string = 'gpt-4o'): Promise<string> {
    if (!this.isReady || !this.client) {
      // Fallback or wait logic could go here, for now throw or return error
      if ((window as any).G4FClient) {
         this.initClient();
      } else {
         return "Initializing AI connection... please try again in a moment.";
      }
    }

    try {
      const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message }
      ];

      const response = await this.client.chat.completions.create({
        model: model,
        messages: messages
      });

      return response.choices[0].message.content;
    } catch (error) {
      console.error('G4F Chat Error:', error);
      return `Connection Error: ${(error as Error).message}. Try a different model.`;
    }
  }

  getAvailableModels() {
    return [
      { id: 'gpt-4o', name: 'GPT-4o (OpenAI)' },
      { id: 'gpt-4.1', name: 'GPT-4.1 (Experimental)' },
      { id: 'deepseek-v3', name: 'DeepSeek v3' },
      { id: 'llama-3.3-70b', name: 'Llama 3.3 70B' },
      { id: 'gemini-2.0-pro', name: 'Gemini 2.0 Pro' },
    ];
  }
}

