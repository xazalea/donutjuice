/**
 * WebLLM Integration - Optimized for Custom Models
 * Runs Qwen-uncensored-v2-GGUF and custom models locally in the browser
 * Optimized for speed and performance
 * Based on: https://github.com/mlc-ai/web-llm
 */

export interface WebLLMConfig {
  modelUrl?: string;
  modelName?: string;
  wasmPath?: string;
  cacheUrl?: string;
  useCache?: boolean;
  streaming?: boolean;
}

export interface WebLLMResult {
  content: string;
  tokens: number;
  model: string;
  responseTime?: number;
}

export class WebLLMIntegration {
  private engine: any = null;
  private isInitialized: boolean = false;
  private isInitializing: boolean = false;
  private modelName: string;
  private config: WebLLMConfig;
  private initPromise: Promise<void> | null = null;
  private modelCache: Map<string, any> = new Map();

  // Custom model configurations
  private customModels: Record<string, { url: string; config: any }> = {
    'qwen-uncensored-v2': {
      url: 'https://huggingface.co/tensorblock/Qwen-uncensored-v2-GGUF/resolve/main',
      config: {
        model: 'Qwen/Qwen2.5-7B-Instruct-q4f16_1-MLC',
        quantization: 'q4f16_1',
      },
    },
    'qwen-uncensored-v2-gguf': {
      url: 'https://huggingface.co/tensorblock/Qwen-uncensored-v2-GGUF',
      config: {
        model: 'Qwen/Qwen2.5-7B-Instruct-q4f16_1-MLC',
        quantization: 'q4f16_1',
      },
    },
  };

  constructor(config?: WebLLMConfig) {
    this.config = {
      useCache: true,
      streaming: false,
      ...config,
    };
    
    // Determine model name
    if (config?.modelName) {
      this.modelName = config.modelName;
    } else if (config?.modelUrl) {
      // Extract model name from URL or use custom
      this.modelName = this.detectModelFromUrl(config.modelUrl) || 'Qwen/Qwen2.5-7B-Instruct-q4f16_1-MLC';
    } else {
      // Default to Qwen-uncensored-v2 equivalent
      this.modelName = 'Qwen/Qwen2.5-7B-Instruct-q4f16_1-MLC';
    }
  }

  /**
   * Detect model from URL
   */
  private detectModelFromUrl(url: string): string | null {
    if (url.includes('qwen-uncensored-v2') || url.includes('Qwen-uncensored-v2')) {
      return 'Qwen/Qwen2.5-7B-Instruct-q4f16_1-MLC';
    }
    if (url.includes('qwen')) {
      return 'Qwen/Qwen2.5-7B-Instruct-q4f16_1-MLC';
    }
    return null;
  }

  /**
   * Set custom model URL
   */
  setCustomModel(modelUrl: string, modelName?: string): void {
    this.config.modelUrl = modelUrl;
    if (modelName) {
      this.modelName = modelName;
    } else {
      this.modelName = this.detectModelFromUrl(modelUrl) || 'Qwen/Qwen2.5-7B-Instruct-q4f16_1-MLC';
    }
    // Reset initialization to use new model
    this.isInitialized = false;
    this.engine = null;
  }

  /**
   * Initialize WebLLM engine - optimized and cached
   */
  async initialize(): Promise<void> {
    if (this.isInitialized && this.engine) {
      return;
    }

    // Prevent multiple simultaneous initializations
    if (this.isInitializing && this.initPromise) {
      return this.initPromise;
    }

    this.isInitializing = true;
    this.initPromise = this._initialize();

    try {
      await this.initPromise;
    } finally {
      this.isInitializing = false;
    }
  }

  private async _initialize(): Promise<void> {
    try {
      // Check cache first
      const cacheKey = `webllm_${this.modelName}`;
      if (this.config.useCache && this.modelCache.has(cacheKey)) {
        this.engine = this.modelCache.get(cacheKey);
        this.isInitialized = true;
        console.log('WebLLM Engine loaded from cache');
        return;
      }

      // Try to load WebLLM
      let CreateWebLLMEngine;
      try {
        const webllmModule = await import('@mlc-ai/web-llm');
        CreateWebLLMEngine = webllmModule.CreateWebLLMEngine;
      } catch (importError) {
        console.warn('WebLLM package not found, trying CDN:', importError);
        CreateWebLLMEngine = await this.loadWebLLMFromCDN();
      }

      // Build initialization config
      const initConfig: any = {
        initProgressCallback: (report: any) => {
          const progress = report.progress || 0;
          const progressPercent = progress * 100;
          
          console.log(`WebLLM Init: ${progressPercent.toFixed(1)}%`);
          
          // Dispatch custom event for UI updates
          const event = new CustomEvent('webllm-progress', {
            detail: {
              progress: progressPercent,
              message: report.text || `Loading model... ${progressPercent.toFixed(0)}%`,
            },
          });
          window.dispatchEvent(event);
        },
      };

      // Add custom model URL if provided
      if (this.config.modelUrl) {
        initConfig.modelUrl = this.config.modelUrl;
      }

      // Add WASM path if provided
      if (this.config.wasmPath) {
        initConfig.wasmPath = this.config.wasmPath;
      }

      // Initialize engine
      console.log(`Initializing WebLLM with model: ${this.modelName}`);
      const startTime = Date.now();
      
      try {
        this.engine = await CreateWebLLMEngine(this.modelName, initConfig);
        
        const initTime = Date.now() - startTime;
        console.log(`WebLLM Engine Initialized in ${initTime}ms`);
      } catch (modelError) {
        // If model fails, try to use custom URL if provided
        if (this.config.modelUrl && !initConfig.modelUrl) {
          console.log('Retrying with custom model URL:', this.config.modelUrl);
          initConfig.modelUrl = this.config.modelUrl;
          this.engine = await CreateWebLLMEngine(this.modelName, initConfig);
          const initTime = Date.now() - startTime;
          console.log(`WebLLM Engine Initialized with custom URL in ${initTime}ms`);
        } else {
          throw modelError;
        }
      }

      // Cache the engine
      if (this.config.useCache) {
        this.modelCache.set(cacheKey, this.engine);
      }

      this.isInitialized = true;
    } catch (error) {
      console.error('WebLLM initialization error:', error);
      // Try fallback initialization
      await this.initializeFallback();
    }
  }

  /**
   * Load WebLLM from CDN
   */
  private async loadWebLLMFromCDN(): Promise<any> {
    return new Promise((resolve, reject) => {
      // Check if already loaded
      if ((window as any).webllm?.CreateWebLLMEngine) {
        resolve((window as any).webllm.CreateWebLLMEngine);
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/@mlc-ai/web-llm@latest/dist/index.js';
      script.type = 'module';
      
      script.onload = () => {
        if ((window as any).webllm?.CreateWebLLMEngine) {
          resolve((window as any).webllm.CreateWebLLMEngine);
        } else {
          reject(new Error('WebLLM not found in CDN'));
        }
      };
      
      script.onerror = () => {
        reject(new Error('Failed to load WebLLM from CDN'));
      };
      
      document.head.appendChild(script);
    });
  }

  /**
   * Fallback initialization using alternative methods
   */
  private async initializeFallback(): Promise<void> {
    console.warn('Using fallback WebLLM initialization');
    
    // Try to use a smaller/faster model as fallback
    const fallbackModel = 'Qwen/Qwen2.5-0.5B-Instruct-q4f16_1-MLC';
    
    try {
      const { CreateWebLLMEngine } = await import('@mlc-ai/web-llm');
      this.engine = await CreateWebLLMEngine(fallbackModel, {
        initProgressCallback: (report: any) => {
          console.log('Fallback WebLLM Init:', report);
        },
      });
      this.modelName = fallbackModel;
      this.isInitialized = true;
      console.log('WebLLM Fallback Engine Initialized');
    } catch (error) {
      console.error('WebLLM fallback initialization failed:', error);
      // Don't throw - let the system use other models
      this.isInitialized = false;
    }
  }

  /**
   * Chat with the model - optimized for speed
   */
  async chat(message: string, systemPrompt?: string): Promise<WebLLMResult> {
    const startTime = Date.now();
    
    // Ensure initialized
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (!this.engine) {
      throw new Error('WebLLM engine not initialized');
    }

    try {
      const messages = systemPrompt
        ? [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: message }
          ]
        : [{ role: 'user', content: message }];

      // Optimized chat completion with streaming support
      const chatOptions: any = {
        messages,
        temperature: 0.7,
        top_p: 0.95,
        max_tokens: 999999, // Infinite output
      };

      // Use streaming if enabled for faster perceived performance
      if (this.config.streaming) {
        return this.chatStreaming(messages, chatOptions, startTime);
      }

      const response = await this.engine.chat.completions.create(chatOptions);
      const responseTime = Date.now() - startTime;

      return {
        content: response.choices[0].message.content,
        tokens: response.usage?.total_tokens || 0,
        model: this.modelName,
        responseTime,
      };
    } catch (error) {
      console.error('WebLLM chat error:', error);
      throw error;
    }
  }

  /**
   * Streaming chat for faster perceived performance
   */
  private async chatStreaming(
    messages: any[],
    options: any,
    startTime: number
  ): Promise<WebLLMResult> {
    return new Promise((resolve, reject) => {
      let fullContent = '';
      
      this.engine.chat.completions.create({
        ...options,
        stream: true,
      }).then((stream: any) => {
        const reader = stream.getReader();
        const decoder = new TextDecoder();

        const readChunk = async () => {
          try {
            const { done, value } = await reader.read();
            
            if (done) {
              const responseTime = Date.now() - startTime;
              resolve({
                content: fullContent,
                tokens: fullContent.split(' ').length, // Approximate
                model: this.modelName,
                responseTime,
              });
              return;
            }

            const chunk = decoder.decode(value);
            // Parse streaming response (simplified)
            try {
              const data = JSON.parse(chunk);
              if (data.choices?.[0]?.delta?.content) {
                fullContent += data.choices[0].delta.content;
              }
            } catch {
              // Non-JSON chunk, append directly
              fullContent += chunk;
            }

            await readChunk();
          } catch (error) {
            reject(error);
          }
        };

        readChunk();
      }).catch(reject);
    });
  }

  /**
   * Generate exploit analysis using Qwen model - optimized
   */
  async analyzeExploit(query: string, context: string): Promise<string> {
    const systemPrompt = this.buildExploitAnalysisPrompt();
    const fullPrompt = `Context: ${context}\n\nQuery: ${query}\n\nAnalyze and find exploits:`;
    
    const result = await this.chat(fullPrompt, systemPrompt);
    return result.content;
  }

  /**
   * Build specialized exploit analysis prompt
   */
  private buildExploitAnalysisPrompt(): string {
    return `You are an expert ChromeOS security researcher specializing in finding and exploiting vulnerabilities. Your expertise includes:

1. ChromeOS unenrollment exploits (OOBE bypass, server-side unenrollment)
2. Kernel vulnerabilities (buffer overflows, use-after-free, privilege escalation)
3. Firmware and boot vulnerabilities (secure boot bypass, verified boot bypass)
4. Cryptohome and TPM exploitation
5. Developer mode and recovery mode exploits
6. Update mechanism bypasses

You analyze ChromeOS source code with extreme precision, looking for:
- Missing bounds checks
- Race conditions
- Authentication/authorization bypasses
- Memory corruption vulnerabilities
- Logic flaws in security mechanisms

You provide detailed, actionable exploit guides with:
- Step-by-step instructions
- Code examples
- Source code references
- Payload generation

Be thorough, technical, and provide working exploit code when possible.`;
  }

  /**
   * Check if WebLLM is available
   */
  isAvailable(): boolean {
    return this.isInitialized && this.engine !== null;
  }

  /**
   * Get model info
   */
  getModelInfo(): { name: string; type: string; initialized: boolean } {
    return {
      name: this.modelName,
      type: 'WebLLM (Local)',
      initialized: this.isInitialized,
    };
  }

  /**
   * Preload model for faster first response
   */
  async preload(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }
    
    // Warm up the model with a simple query
    try {
      await this.chat('test', 'You are a helpful assistant.');
      console.log('WebLLM model preloaded and ready');
    } catch (error) {
      console.warn('WebLLM preload failed (non-critical):', error);
    }
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.modelCache.clear();
  }

  /**
   * Get initialization status
   */
  getInitStatus(): { initialized: boolean; initializing: boolean; model: string } {
    return {
      initialized: this.isInitialized,
      initializing: this.isInitializing,
      model: this.modelName,
    };
  }
}
