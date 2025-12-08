/**
 * AI Model Manager
 * Handles automatic model switching with fallback
 * Integrates OpenMemory and OpenReasoning
 */

import { DeepInfraIntegration, DeepInfraModel } from '@lib/integrations/deepinfra';
import { OpenMemory } from '@lib/integrations/openmemory';
import { OpenReason } from '@lib/integrations/openreason';

export interface ModelSwitchEvent {
  from: string;
  to: string;
  reason: string;
  timestamp: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  model?: string;
  timestamp: string;
}

export class ModelManager {
  private deepinfra: DeepInfraIntegration;
  private memory: OpenMemory;
  private reasoner: OpenReason;
  private currentModel: DeepInfraModel;
  private autoSwitch: boolean = true;
  private switchHistory: ModelSwitchEvent[] = [];
  private conversationHistory: ChatMessage[] = [];

  constructor(
    deepinfraBaseUrl?: string,
    apiKey?: string
  ) {
    this.deepinfra = new DeepInfraIntegration(deepinfraBaseUrl, apiKey);
    this.memory = new OpenMemory();
    this.reasoner = new OpenReason();
    this.currentModel = this.deepinfra.getDefaultModel();
  }

  /**
   * Set auto-switch mode
   */
  setAutoSwitch(enabled: boolean): void {
    this.autoSwitch = enabled;
  }

  /**
   * Get auto-switch status
   */
  getAutoSwitch(): boolean {
    return this.autoSwitch;
  }

  /**
   * Get current model
   */
  getCurrentModel(): DeepInfraModel {
    return this.currentModel;
  }

  /**
   * Get available models
   */
  getAvailableModels(): DeepInfraModel[] {
    return this.deepinfra.getAvailableModels();
  }

  /**
   * Set current model manually
   */
  setCurrentModel(modelId: string): void {
    const model = this.deepinfra.getAvailableModels().find(m => m.id === modelId);
    if (model) {
      this.currentModel = model;
    }
  }

  /**
   * Chat with automatic model switching
   */
  async chat(
    userMessage: string,
    systemPrompt?: string
  ): Promise<{ content: string; model: string; switched: boolean }> {
    // Add user message to conversation
    this.conversationHistory.push({
      role: 'user',
      content: userMessage,
      timestamp: new Date().toISOString(),
    });

    // Retrieve relevant memory
    const relevantMemory = this.memory.retrieve({
      query: userMessage,
      limit: 5,
    });

    // Build messages with memory context
    const messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }> = [];
    
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }

    // Add memory context
    if (relevantMemory.length > 0) {
      const memoryContext = relevantMemory
        .map(m => `[Memory] ${m.content}`)
        .join('\n');
      messages.push({
        role: 'system',
        content: `Previous context:\n${memoryContext}`,
      });
    }

    // Add conversation history
    for (const msg of this.conversationHistory.slice(-10)) {
      messages.push({
        role: msg.role,
        content: msg.content,
      });
    }

    // Try current model first
    let response: string;
    let switched = false;

    try {
      const result = await this.deepinfra.chat(this.currentModel.id, messages);
      response = result.content;

      // Check for refusal
      if (this.autoSwitch && this.deepinfra.isRefusal(response)) {
        // Switch to more relaxed model
        const relaxedModels = this.deepinfra.getRelaxedModels();
        const fallbackModel = relaxedModels.find(m => m.id !== this.currentModel.id) || relaxedModels[0];

        if (fallbackModel) {
          this.switchHistory.push({
            from: this.currentModel.id,
            to: fallbackModel.id,
            reason: 'Model refused to continue',
            timestamp: new Date().toISOString(),
          });

          this.currentModel = fallbackModel;
          switched = true;

          // Retry with relaxed model
          const relaxedResult = await this.deepinfra.chat(fallbackModel.id, messages, {
            temperature: 0.9, // Higher temperature for more relaxed responses
          });
          response = relaxedResult.content;
        }
      }
    } catch (error) {
      // If current model fails, try fallback
      if (this.autoSwitch) {
        const relaxedModels = this.deepinfra.getRelaxedModels();
        const fallbackModel = relaxedModels[0];

        if (fallbackModel) {
          this.switchHistory.push({
            from: this.currentModel.id,
            to: fallbackModel.id,
            reason: `Model error: ${(error as Error).message}`,
            timestamp: new Date().toISOString(),
          });

          this.currentModel = fallbackModel;
          switched = true;

          // Retry with fallback
          const fallbackResult = await this.deepinfra.chat(fallbackModel.id, messages);
          response = fallbackResult.content;
        } else {
          throw error;
        }
      } else {
        throw error;
      }
    }

    // Add assistant response to conversation
    this.conversationHistory.push({
      role: 'assistant',
      content: response,
      model: this.currentModel.id,
      timestamp: new Date().toISOString(),
    });

    // Store important information in memory
    this.memory.store(
      `User: ${userMessage}\nAssistant: ${response}`,
      {
        model: this.currentModel.id,
        switched,
      },
      ['conversation', this.currentModel.name.toLowerCase()]
    );

    // Use reasoning to analyze the response
    if (userMessage.toLowerCase().includes('exploit') || userMessage.toLowerCase().includes('scan')) {
      const reasoning = await this.reasoner.reasonAboutUnenrollmentExploit(
        userMessage,
        { response, model: this.currentModel.id }
      );

      // Store reasoning in memory
      this.memory.store(
        `Reasoning: ${reasoning.conclusion}`,
        {
          type: 'reasoning',
          steps: reasoning.steps.length,
          confidence: reasoning.confidence,
        },
        ['reasoning', 'exploit-analysis']
      );
    }

    return {
      content: response,
      model: this.currentModel.id,
      switched,
    };
  }

  /**
   * Get switch history
   */
  getSwitchHistory(): ModelSwitchEvent[] {
    return this.switchHistory;
  }

  /**
   * Get conversation history
   */
  getConversationHistory(): ChatMessage[] {
    return this.conversationHistory;
  }

  /**
   * Get memory statistics
   */
  getMemoryStats() {
    return this.memory.getStats();
  }

  /**
   * Clear conversation history
   */
  clearConversation(): void {
    this.conversationHistory = [];
  }

  /**
   * Reset to default model
   */
  resetToDefault(): void {
    this.currentModel = this.deepinfra.getDefaultModel();
  }

  /**
   * Get OpenMemory instance
   */
  getOpenMemory(): OpenMemory {
    return this.memory;
  }

  /**
   * Get OpenReason instance
   */
  getOpenReason(): OpenReason {
    return this.reasoner;
  }
}

