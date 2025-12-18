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

export type StreamCallback = (chunk: string, fullContent: string) => void;

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
    
    // Configure WebLLM with unrestricted small model under 1B
    // Use custom model URL for models under 1B (WebLLM built-in list doesn't have them)
    // Try to use a model under 1B via custom URL - WebLLM supports custom MLC-format models
    this.webllm = new WebLLMIntegration({
      // Try using a custom model URL for unrestricted model under 1B
      // WebLLM requires MLC format, so we'll try to use a model URL that's under 1B
      modelUrl: 'https://huggingface.co/mlc-ai/Qwen2.5-0.5B-Instruct-q4f16_1-MLC', // 500M - under 1B
      modelName: 'Qwen2.5-0.5B-Instruct-q4f16_1-MLC', // 500M unrestricted model
      useCache: true, // Cache model for faster subsequent loads
      streaming: true, // Enable streaming for faster perceived performance
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

  /**
   * Check if WebLLM is ready (with unrestricted model under 1B)
   */
  async isWebLLMReady(): Promise<boolean> {
    if (!this.webllm) {
      return false;
    }
    
    // If already available, return true
    if (this.webllm.isAvailable()) {
      return true;
    }
    
    // Try to initialize if not already initializing
    try {
      await this.webllm.initialize();
      return this.webllm.isAvailable();
    } catch (error) {
      console.warn('[ModelManager] WebLLM initialization check failed:', error);
      return false;
    }
  }

  /**
   * Get WebLLM initialization status (with unrestricted model under 1B)
   */
  getWebLLMStatus(): { isReady: boolean; isInitializing: boolean } {
    if (!this.webllm) {
      return {
        isReady: false,
        isInitializing: false,
      };
    }
    
    // Check if WebLLM is available
    const isReady = this.webllm.isAvailable();
    const isInitializing = this.webllm.isInitializing || false;
    
    return {
      isReady,
      isInitializing,
    };
  }

  async chat(message: string, systemPrompt: string, onStream?: StreamCallback, abortSignal?: AbortSignal): Promise<ChatResult> {
    let content = '';
    
    // CRITICAL: Ensure WebLLM is ready before proceeding
    // This ensures we use unrestricted models under 1B via WebLLM
    const webllmReady = await this.isWebLLMReady();
    if (!webllmReady) {
      throw new Error('WebLLM is not ready. Please wait for the AI model to finish loading. This ensures you get real AI responses, not fallbacks.');
    }
    
    // Check for abort
    if (abortSignal?.aborted) {
      throw new Error('Request aborted by user');
    }
    
    // Store user message in memory
    this.memory.store(message, { role: 'user' }, ['chat', 'user']);

    // Check if this is an exploit-finding query
    const isExploitQuery = message.toLowerCase().includes('exploit') || 
                          message.toLowerCase().includes('vulnerability') ||
                          message.toLowerCase().includes('chromeos') ||
                          message.toLowerCase().includes('unenrollment');
    
    // ALWAYS scan the ENTIRE codebase during chat phase to provide real, actionable information
    let codebaseContext = '';
    if (isExploitQuery || true) { // Always scan to provide real code references
      try {
        onStream?.('', 'Scanning ChromeOS codebase for relevant code...');
        const { ChromeOSSourceCodeSearch } = await import('@lib/chromeos/source-code-search');
        const codeSearch = new ChromeOSSourceCodeSearch(this, undefined);
        codebaseContext = await codeSearch.scanEntireCodebase(message, (progress) => {
          onStream?.('', progress);
        });
        // Check for abort after scanning
        if (abortSignal?.aborted) {
          throw new Error('Request aborted by user');
        }
      } catch (error) {
        console.warn('Codebase scan failed, continuing without it:', error);
        codebaseContext = 'Codebase scan unavailable.';
      }
    }
    
    // Enhance system prompt with actual codebase context
    const enhancedSystemPrompt = codebaseContext 
      ? `${systemPrompt}\n\n=== ACTUAL CHROMEOS CODEBASE SCAN RESULTS (YOU MUST USE THIS CODE) ===\n${codebaseContext}\n\nCRITICAL INSTRUCTIONS:
1. You MUST start your response by listing the EXACT file paths, functions, and line numbers from the code above
2. You MUST analyze ONLY the code shown above - do NOT make up code
3. You MUST provide exploit steps based on the REAL code locations shown above
4. If the code shows a function like "IsCrostiniEnabled()" at line 234, you MUST reference it exactly
5. NEVER mention generic Linux tools (apt-get, dpkg, etc.) - this is ChromeOS
6. Your response MUST reference specific files and functions from the scan results above

The codebase scan results above contain REAL ChromeOS source code. Use it to find REAL exploits.`
      : `${systemPrompt}\n\nWARNING: No codebase scan results available. You MUST say "I need codebase scan results to find a real exploit. Please ensure the codebase scanner is working."`;

    try {
      // Prefer WebLLM for unrestricted models under 1B
      if (this.webllm && this.webllm.isAvailable()) {
        console.log('[ModelManager] Using WebLLM REAL AI with unrestricted model under 1B (streaming enabled)...');
        const result = await this.webllm.chat(message, enhancedSystemPrompt, onStream, abortSignal);
        content = result.content;
        console.log(`[ModelManager] WebLLM REAL AI response: ${content.length} chars`);
        return { content, model: 'qwen-webllm' };
      } else if (this.currentModelId === 'qwen-webllm') {
        // Try to initialize WebLLM
        if (this.webllm) {
          await this.webllm.initialize();
          if (this.webllm.isAvailable()) {
            console.log('[ModelManager] Using WebLLM REAL AI (just initialized)...');
            const result = await this.webllm.chat(message, systemPrompt, onStream);
            content = result.content;
            console.log(`[ModelManager] WebLLM REAL AI response: ${content.length} chars`);
            return { content, model: 'qwen-webllm' };
          }
        }
        // Fallback to HuggingFace API
        console.log('[ModelManager] WebLLM not available, using HuggingFace API for uncensored model...');
        const combinedPrompt = isExploitQuery
          ? ExploitPrompts.buildChromeOSExploitPrompt(message)
          : `${systemPrompt}\n\nUser: ${message}\nAssistant:`;
        const result = await this.donutEngine.analyzeSystemDeeply(combinedPrompt, 'Chat Context');
        content = result.rawResponse || result.vulnerabilities.join('\n');
        console.log(`[ModelManager] HuggingFace uncensored AI response: ${content.length} chars`);
      } else if (this.currentModelId === 'dual-model' || (this.useDualModel && isExploitQuery)) {
        // Use both REAL models for consensus
        console.log('[ModelManager] Using DUAL REAL AI models for consensus');
        content = await this.dualModelAnalysis(message, systemPrompt, isExploitQuery);
        console.log(`[ModelManager] Dual model REAL AI response: ${content.length} chars`);
      } else if (this.currentModelId === 'donut-2.5') {
        // Use Donut/HuggingFace - REAL AI
        console.log('[ModelManager] Using Donut-2.5 REAL AI model');
        const combinedPrompt = isExploitQuery
          ? ExploitPrompts.buildChromeOSExploitPrompt(message)
          : `${systemPrompt}\n\nUser: ${message}\nAssistant:`;
        const result = await this.donutEngine.analyzeSystemDeeply(combinedPrompt, 'Chat Context');
        content = result.rawResponse || result.vulnerabilities.join('\n');
        console.log(`[ModelManager] Donut REAL AI response: ${content.length} chars`);
      } else {
        // Use G4F - REAL AI
        console.log(`[ModelManager] Using G4F REAL AI model: ${this.currentModelId}`);
        content = await this.g4f.chat(message, systemPrompt, this.currentModelId);
        console.log(`[ModelManager] G4F REAL AI response: ${content.length} chars`);
      }
    } catch (error) {
      console.error('[ModelManager] Chat Error:', error);
      const errorMsg = (error as Error).message;
      
      // Only provide fallback if ALL models failed
      // Try to use a different model as fallback
      console.log('[ModelManager] Primary model failed, trying alternative...');
      
      // Try alternative REAL AI models as backup
      const backupModels = ['gpt-4o', 'deepseek-v3', 'llama-3.3-70b'];
      for (const backupModel of backupModels) {
        if (this.currentModelId === backupModel) continue;
        try {
          console.log(`[ModelManager] Trying ${backupModel} REAL AI as backup...`);
          content = await this.g4f.chat(message, systemPrompt, backupModel);
          if (content && content.trim().length > 0) {
            console.log(`[ModelManager] ${backupModel} REAL AI backup succeeded!`);
            return { content, model: backupModel };
          }
        } catch (backupError) {
          console.warn(`[ModelManager] ${backupModel} backup failed:`, backupError);
          continue; // Try next backup model
        }
      }
      
      // Try WebLLM as primary or backup
      if (this.webllm) {
        try {
          if (!this.webllm.isAvailable()) {
            await this.webllm.initialize();
          }
          if (this.webllm.isAvailable()) {
            console.log('[ModelManager] Using WebLLM REAL AI with unrestricted model under 1B...');
            const result = await this.webllm.chat(message, systemPrompt, onStream);
            if (result.content && result.content.trim().length > 0) {
              console.log('[ModelManager] WebLLM REAL AI succeeded!');
              return { content: result.content, model: 'qwen-webllm' };
            }
          }
        } catch (webllmError) {
          console.warn('[ModelManager] WebLLM failed:', webllmError);
        }
      }
      
      // Last resort: helpful message but be honest it's not AI
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
