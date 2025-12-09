import { G4FIntegration } from '@lib/integrations/g4f'

export interface AIModel {
  id: string;
  name: string;
}

export interface ChatResult {
  content: string;
  model: string;
}

export class ModelManager {
  private g4f: G4FIntegration;
  private currentModelId: string = 'gpt-4o';

  constructor() {
    this.g4f = new G4FIntegration();
  }

  getCurrentModel(): AIModel {
    const models = this.getAvailableModels();
    return models.find(m => m.id === this.currentModelId) || models[0];
  }

  setCurrentModel(modelId: string) {
    this.currentModelId = modelId;
  }

  getAvailableModels(): AIModel[] {
    return this.g4f.getAvailableModels();
  }

  async chat(message: string, systemPrompt: string): Promise<ChatResult> {
    const content = await this.g4f.chat(message, systemPrompt, this.currentModelId);
    return {
      content,
      model: this.currentModelId
    };
  }
}
