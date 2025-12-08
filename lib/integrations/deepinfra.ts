/**
 * DeepInfra Integration
 * Access to multiple AI models through DeepInfra wrapper
 * Based on: https://github.com/metimol/deepinfra-wrapper
 */

export interface DeepInfraModel {
  id: string;
  name: string;
  description: string;
  relaxed: boolean; // More relaxed/less restrictive
  default?: boolean;
}

export interface DeepInfraResponse {
  content: string;
  model: string;
  finishReason?: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export class DeepInfraIntegration {
  private baseUrl: string;
  private apiKey?: string;
  private availableModels: DeepInfraModel[] = [
    {
      id: 'ICEPVP8977/Uncensoreed_Qwen2_0.5Test',
      name: 'donut-2.5',
      description: 'Default model - Comprehensive exploit analysis',
      relaxed: false,
      default: true,
    },
    {
      id: 'meta-llama/Llama-2-70b-chat-hf',
      name: 'Llama-2-70b',
      description: 'Large language model - More relaxed responses',
      relaxed: true,
    },
    {
      id: 'mistralai/Mixtral-8x7B-Instruct-v0.1',
      name: 'Mixtral-8x7B',
      description: 'Mixture of experts - Balanced responses',
      relaxed: true,
    },
    {
      id: 'deepseek-ai/DeepSeek-V2.5',
      name: 'DeepSeek-V2.5',
      description: 'Advanced reasoning - More permissive',
      relaxed: true,
    },
    {
      id: 'Qwen/Qwen2.5-72B-Instruct',
      name: 'Qwen2.5-72B',
      description: 'High capability - Less restrictive',
      relaxed: true,
    },
  ];

  constructor(baseUrl: string = 'http://localhost:8080', apiKey?: string) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
  }

  /**
   * Get available models
   */
  getAvailableModels(): DeepInfraModel[] {
    return this.availableModels;
  }

  /**
   * Get default model
   */
  getDefaultModel(): DeepInfraModel {
    return this.availableModels.find(m => m.default) || this.availableModels[0];
  }

  /**
   * Get more relaxed models (fallback options)
   */
  getRelaxedModels(): DeepInfraModel[] {
    return this.availableModels.filter(m => m.relaxed);
  }

  /**
   * Chat with a specific model
   */
  async chat(
    modelId: string,
    messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>,
    options?: {
      temperature?: number;
      maxTokens?: number;
      stream?: boolean;
    }
  ): Promise<DeepInfraResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.apiKey && { 'Authorization': `Bearer ${this.apiKey}` }),
        },
        body: JSON.stringify({
          model: modelId,
          messages,
          temperature: options?.temperature || 0.7,
          max_tokens: options?.maxTokens || 2048,
          stream: options?.stream || false,
        }),
      });

      if (!response.ok) {
        throw new Error(`DeepInfra API error: ${response.statusText}`);
      }

      const data = await response.json();
      
      return {
        content: data.choices?.[0]?.message?.content || '',
        model: modelId,
        finishReason: data.choices?.[0]?.finish_reason,
        usage: data.usage,
      };
    } catch (error) {
      console.error('DeepInfra chat error:', error);
      throw error;
    }
  }

  /**
   * Check if response indicates refusal
   */
  isRefusal(response: string): boolean {
    const refusalIndicators = [
      'i cannot',
      'i can\'t',
      'i\'m not able',
      'i\'m unable',
      'i don\'t',
      'i won\'t',
      'i will not',
      'refuse',
      'decline',
      'not appropriate',
      'not allowed',
      'against my',
      'against the',
      'harmful',
      'illegal',
      'unethical',
      'sorry, but',
      'i apologize',
      'i\'m sorry',
    ];

    const lowerResponse = response.toLowerCase();
    return refusalIndicators.some(indicator => lowerResponse.includes(indicator));
  }

  /**
   * List available models from DeepInfra
   */
  async listModels(): Promise<string[]> {
    try {
      const response = await fetch(`${this.baseUrl}/v1/models`, {
        headers: {
          ...(this.apiKey && { 'Authorization': `Bearer ${this.apiKey}` }),
        },
      });

      if (!response.ok) {
        return this.availableModels.map(m => m.id);
      }

      const data = await response.json();
      return data.data?.map((m: any) => m.id) || this.availableModels.map(m => m.id);
    } catch (error) {
      console.error('Failed to list models:', error);
      return this.availableModels.map(m => m.id);
    }
  }
}

