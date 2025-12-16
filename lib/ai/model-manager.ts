import { G4FIntegration } from '@lib/integrations/g4f'
import { OpenMemory } from '@lib/integrations/openmemory'
import { OpenReason } from '@lib/integrations/openreason'
import { AIInferenceEngine } from '@lib/ai/inference'
import { WebLLMIntegration } from '@lib/integrations/webllm'
import { BellumIntegration } from '@lib/integrations/bellum'
import { ExploitPrompts } from '@lib/ai/exploit-prompts'

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
  private webllm: WebLLMIntegration;
  private bellum: BellumIntegration;
  private memory: OpenMemory;
  private reasoner: OpenReason;
  private currentModelId: string = 'donut-2.5'; // Default to donut-2.5 as requested
  private useDualModel: boolean = true; // Use both models by default

  constructor() {
    this.g4f = new G4FIntegration();
    this.donutEngine = new AIInferenceEngine();
    this.webllm = new WebLLMIntegration({
      modelName: 'Qwen/Qwen2.5-7B-Instruct-q4f16_1-MLC', // Qwen-uncensored-v2 equivalent
    });
    this.bellum = new BellumIntegration({ useNacho: true });
    this.memory = new OpenMemory();
    this.reasoner = new OpenReason();
    
    // Initialize async components
    this.initializeAsync();
  }

  private async initializeAsync() {
    try {
      await this.webllm.initialize();
      await this.bellum.initialize();
    } catch (error) {
      console.warn('Some integrations failed to initialize:', error);
    }
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
      { id: 'qwen-webllm', name: 'Qwen-uncensored-v2 (WebLLM Local)' },
      { id: 'dual-model', name: 'Dual Model (Donut + Qwen)' },
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

    // Check if this is an exploit-finding query
    const isExploitQuery = message.toLowerCase().includes('exploit') || 
                          message.toLowerCase().includes('vulnerability') ||
                          message.toLowerCase().includes('chromeos') ||
                          message.toLowerCase().includes('unenrollment');

    try {
      if (this.currentModelId === 'qwen-webllm') {
        // Use WebLLM with Qwen model
        if (this.webllm.isAvailable()) {
          const enhancedPrompt = isExploitQuery 
            ? ExploitPrompts.buildChromeOSExploitPrompt(message)
            : systemPrompt;
          const result = await this.webllm.chat(message, enhancedPrompt);
          content = result.content;
        } else {
          throw new Error('WebLLM not initialized');
        }
      } else if (this.currentModelId === 'dual-model' || (this.useDualModel && isExploitQuery)) {
        // Use both models for consensus
        content = await this.dualModelAnalysis(message, systemPrompt, isExploitQuery);
      } else if (this.currentModelId === 'donut-2.5') {
        // Use Donut/HuggingFace Logic
        const combinedPrompt = isExploitQuery
          ? ExploitPrompts.buildChromeOSExploitPrompt(message)
          : `${systemPrompt}\n\nUser: ${message}\nAssistant:`;
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
    if (isExploitQuery) {
        reasoningResult = await this.reasoner.reasonAboutUnenrollmentExploit(message, { context: content });
    }

    return {
      content,
      model: this.currentModelId,
      reasoning: reasoningResult
    };
  }

  /**
   * Use both models for consensus analysis
   */
  private async dualModelAnalysis(message: string, systemPrompt: string, isExploitQuery: boolean): Promise<string> {
    const enhancedPrompt = isExploitQuery
      ? ExploitPrompts.buildChromeOSExploitPrompt(message)
      : systemPrompt;

    // Run both models in parallel
    const [donutResult, qwenResult, bellumResult] = await Promise.allSettled([
      this.donutEngine.analyzeSystemDeeply(
        isExploitQuery ? ExploitPrompts.buildChromeOSExploitPrompt(message) : `${systemPrompt}\n\nUser: ${message}\nAssistant:`,
        'Chat Context'
      ),
      this.webllm.isAvailable() 
        ? this.webllm.chat(message, enhancedPrompt)
        : Promise.resolve({ content: '', tokens: 0, model: '' }),
      isExploitQuery
        ? this.bellum.analyzeChromeOSSource(message)
        : Promise.resolve({ exploits: [], confidence: 0, source: '' }),
    ]);

    const donutContent = donutResult.status === 'fulfilled' 
      ? (donutResult.value.rawResponse || donutResult.value.vulnerabilities.join('\n'))
      : '';

    const qwenContent = qwenResult.status === 'fulfilled' && qwenResult.value.content
      ? qwenResult.value.content
      : '';

    const bellumFindings = bellumResult.status === 'fulfilled' && bellumResult.value.exploits
      ? bellumResult.value.exploits
      : [];

    // If we have results from both models, synthesize them
    if (donutContent && qwenContent) {
      const consensusPrompt = ExploitPrompts.buildConsensusPrompt(message, donutContent, qwenContent);
      
      // Use the primary model to synthesize
      try {
        const synthesis = await this.donutEngine.analyzeSystemDeeply(consensusPrompt, 'Consensus Synthesis');
        return synthesis.rawResponse || `Dual Model Analysis:\n\nDonut-2.5:\n${donutContent}\n\nQwen:\n${qwenContent}\n\n${synthesis.vulnerabilities.join('\n')}`;
      } catch (error) {
        // Fallback to combining results
        return `Dual Model Analysis:\n\n=== Donut-2.5 Analysis ===\n${donutContent}\n\n=== Qwen Analysis ===\n${qwenContent}${bellumFindings.length > 0 ? `\n\n=== Bellum Findings ===\n${bellumFindings.map(f => `- ${f.name} (${f.severity}): ${f.description}`).join('\n')}` : ''}`;
      }
    }

    // Return the best available result
    return donutContent || qwenContent || 'Analysis unavailable';
  }

  /**
   * Get Bellum integration
   */
  getBellum(): BellumIntegration {
    return this.bellum;
  }

  /**
   * Get WebLLM integration
   */
  getWebLLM(): WebLLMIntegration {
    return this.webllm;
  }

  /**
   * Enable/disable dual model mode
   */
  setDualModelMode(enabled: boolean) {
    this.useDualModel = enabled;
  }
}
