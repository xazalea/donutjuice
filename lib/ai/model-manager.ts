import { G4FIntegration } from '@lib/integrations/g4f'
import { OpenMemory } from '@lib/integrations/openmemory'
import { OpenReason } from '@lib/integrations/openreason'
import { AIInferenceEngine } from '@lib/ai/inference'

export interface AIModel {
  id: string;
  name: string;
}

export interface ChatResult {
  content: string;
  model: string;
  reasoning?: any;
}

export class ModelManager {
  private g4f: G4FIntegration;
  private donutEngine: AIInferenceEngine;
  private memory: OpenMemory;
  private reasoner: OpenReason;
  private currentModelId: string = 'donut-2.5'; // Default to donut-2.5 as requested

  constructor() {
    this.g4f = new G4FIntegration();
    this.donutEngine = new AIInferenceEngine();
    this.memory = new OpenMemory();
    this.reasoner = new OpenReason();
  }

  getCurrentModel(): AIModel {
    const models = this.getAvailableModels();
    return models.find(m => m.id === this.currentModelId) || models[0];
  }

  setCurrentModel(modelId: string) {
    this.currentModelId = modelId;
  }

  getAvailableModels(): AIModel[] {
    const g4fModels = this.g4f.getAvailableModels();
    return [
      { id: 'donut-2.5', name: 'Donut-2.5 (Uncensored Qwen)' },
      ...g4fModels
    ];
  }

  getOpenMemory(): OpenMemory {
    return this.memory;
  }

  getOpenReason(): OpenReason {
    return this.reasoner;
  }

  async chat(message: string, systemPrompt: string): Promise<ChatResult> {
    let content = '';
    
    // Store user message in memory
    this.memory.store(message, { role: 'user' }, ['chat', 'user']);

    try {
      if (this.currentModelId === 'donut-2.5') {
        // Use Donut/HuggingFace Logic
        // We adapt the chat interface to the inference engine's "analyze" style
        // or we just use the raw prompt.
        const combinedPrompt = `${systemPrompt}\n\nUser: ${message}\nAssistant:`;
        const result = await this.donutEngine.analyzeSystemDeeply(combinedPrompt, 'Chat Context');
        content = result.rawResponse || result.vulnerabilities.join('\n');
      } else {
        // Use G4F
        content = await this.g4f.chat(message, systemPrompt, this.currentModelId);
      }
    } catch (error) {
      console.error('Chat Error:', error);
      content = `Error with model ${this.currentModelId}: ${(error as Error).message}`;
    }

    // Store assistant response
    this.memory.store(content, { role: 'assistant', model: this.currentModelId }, ['chat', 'assistant']);

    // Optional: Trigger reasoning if it looks like an exploit query
    let reasoningResult = null;
    if (message.toLowerCase().includes('exploit') || message.toLowerCase().includes('vulnerability')) {
        reasoningResult = await this.reasoner.reasonAboutUnenrollmentExploit(message, { context: content });
    }

    return {
      content,
      model: this.currentModelId,
      reasoning: reasoningResult
    };
  }
}
