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
    
    // Configure WebLLM for Qwen-uncensored-v2-GGUF
    // Supports both MLC format and custom GGUF URLs
    this.webllm = new WebLLMIntegration({
      modelName: 'Qwen/Qwen2.5-7B-Instruct-q4f16_1-MLC', // Qwen-uncensored-v2 equivalent (MLC format)
      // Can also use: modelUrl: 'https://huggingface.co/tensorblock/Qwen-uncensored-v2-GGUF' for direct GGUF
      useCache: true, // Cache model for faster subsequent loads
      streaming: false, // Disable streaming for now - can enable for faster perceived performance
    });
    
    // Pass WebLLM to Donut engine so it can use it
    this.donutEngine = new AIInferenceEngine(undefined, this.webllm);
    
    this.bellum = new BellumIntegration({ useNacho: true });
    this.memory = new OpenMemory();
    this.reasoner = new OpenReason();
    
    // Initialize async components in background (non-blocking)
    this.initializeAsync();
  }

  private async initializeAsync() {
    try {
      // Initialize WebLLM in background - don't block
      this.webllm.initialize().catch(err => {
        console.warn('WebLLM initialization failed (will retry on use):', err);
      });
      
      // Initialize Bellum
      await this.bellum.initialize();
      
      // Preload WebLLM for faster first response
      setTimeout(() => {
        if (this.webllm.isAvailable()) {
          this.webllm.preload().catch(() => {
            // Non-critical, ignore
          });
        }
      }, 2000);
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
        // Ensure it's initialized (will initialize if not already)
        if (!this.webllm.isAvailable()) {
          try {
            await this.webllm.initialize();
          } catch (initError) {
            console.warn('WebLLM init failed, using fallback:', initError);
            // Fallback to Donut model
            const combinedPrompt = isExploitQuery
              ? ExploitPrompts.buildChromeOSExploitPrompt(message)
              : `${systemPrompt}\n\nUser: ${message}\nAssistant:`;
            const result = await this.donutEngine.analyzeSystemDeeply(combinedPrompt, 'Chat Context');
            content = result.rawResponse || result.vulnerabilities.join('\n');
          }
        }
        
        if (this.webllm.isAvailable()) {
          const enhancedPrompt = isExploitQuery 
            ? ExploitPrompts.buildChromeOSExploitPrompt(message)
            : systemPrompt;
          const result = await this.webllm.chat(message, enhancedPrompt);
          content = result.content;
          console.log(`WebLLM response time: ${result.responseTime}ms`);
        } else {
          // Fallback to Donut
          const combinedPrompt = isExploitQuery
            ? ExploitPrompts.buildChromeOSExploitPrompt(message)
            : `${systemPrompt}\n\nUser: ${message}\nAssistant:`;
          const result = await this.donutEngine.analyzeSystemDeeply(combinedPrompt, 'Chat Context');
          content = result.rawResponse || result.vulnerabilities.join('\n');
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
      const errorMsg = (error as Error).message;
      
      // Provide helpful fallback response instead of just error message
      if (errorMsg.includes('fetch') || errorMsg.includes('network') || errorMsg.includes('CORS')) {
        content = `I'm having trouble connecting to the AI service right now. However, based on your query "${message}", I can help you find ChromeOS exploits:

1. **Unenrollment Exploits**: Check OOBE (Out-of-Box Experience) flow for bypass opportunities. Look for network configuration requirements that can be skipped.

2. **Source Code Search**: Visit https://source.chromium.org/chromiumos/chromiumos/codesearch/ and search for terms like "enrollment", "unenrollment", "OOBE", or "policy".

3. **Chromebook Utilities**: Review techniques at chromebook-utilities.pages.dev for similar exploit patterns.

4. **Common Vectors**:
   - OOBE network requirement bypass
   - Server-side enrollment API manipulation
   - Developer mode exploitation
   - Policy enforcement bypass

Would you like me to help you refine your search query, or would you like to proceed directly to the source code search?`;
      } else {
        content = `I encountered an error: ${errorMsg}. Let me try a different approach...\n\nBased on your query, here are some ChromeOS exploit research directions:\n\n1. Search ChromeOS source code for the vulnerability type you mentioned\n2. Review chromebook-utilities.pages.dev for similar techniques\n3. Check for authentication/authorization bypass opportunities\n4. Look for policy enforcement weaknesses\n\nWould you like to start the analysis now?`;
      }
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
      (async () => {
        if (!this.webllm.isAvailable()) {
          try {
            await this.webllm.initialize();
          } catch (err) {
            return { content: '', tokens: 0, model: '' };
          }
        }
        if (this.webllm.isAvailable()) {
          return await this.webllm.chat(message, enhancedPrompt);
        }
        return { content: '', tokens: 0, model: '' };
      })(),
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
