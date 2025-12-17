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
      // Try to initialize if G4F is available
      if ((window as any).G4FClient) {
         this.initClient();
      } else {
         throw new Error('G4F client not available - AI models not initialized');
      }
    }

    if (!this.isReady || !this.client) {
      throw new Error('G4F client initialization failed');
    }

    try {
      console.log(`[G4F] Calling REAL AI model: ${model}`);
      const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message }
      ];

      const response = await this.client.chat.completions.create({
        model: model,
        messages: messages
      });

      const content = response.choices[0].message.content;
      console.log(`[G4F] Received ${content.length} characters from REAL AI model`);
      
      if (!content || content.trim().length === 0) {
        throw new Error('Empty response from G4F model');
      }

      return content;
    } catch (error) {
      console.error('[G4F] Chat Error:', error);
      throw error; // Don't return fake responses - throw so caller knows it failed
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

