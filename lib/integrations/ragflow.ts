/**
 * RAGFlow Integration
 * Advanced RAG engine for exploit research and knowledge retrieval
 * Based on: https://github.com/infiniflow/ragflow
 */

export interface RAGFlowDocument {
  id: string;
  content: string;
  metadata: Record<string, any>;
  embedding?: number[];
}

export interface RAGFlowSearchResult {
  content: string;
  score: number;
  source: string;
  metadata?: Record<string, any>;
}

export interface RAGFlowConversation {
  messages: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: string;
  }>;
  scanPlan?: ScanPlan;
}

export interface ScanPlan {
  target: string;
  scanTypes: string[];
  techniques: string[];
  aggressiveness: 'low' | 'medium' | 'high' | 'extreme';
  invasiveness: 'low' | 'medium' | 'high' | 'extreme';
  description: string;
  estimatedDuration: number;
}

export class RAGFlowIntegration {
  private baseUrl: string;
  private apiKey?: string;
  private conversation: RAGFlowConversation;

  constructor(baseUrl: string = 'http://localhost:9380', apiKey?: string) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
    this.conversation = {
      messages: [
        {
          role: 'system',
          content: 'You are an expert security researcher specializing in ChromeOS exploit discovery. Help users identify and plan comprehensive security scans. Be thorough, aggressive, and leave no stone unturned.',
          timestamp: new Date().toISOString(),
        },
      ],
    };
  }

  /**
   * Add message to conversation
   */
  addMessage(role: 'user' | 'assistant', content: string): void {
    this.conversation.messages.push({
      role,
      content,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Get conversation history
   */
  getConversation(): RAGFlowConversation {
    return this.conversation;
  }

  /**
   * Chat with RAGFlow to plan scan
   */
  async chat(message: string): Promise<string> {
    this.addMessage('user', message);

    try {
      // Use RAGFlow API for chat
      const response = await fetch(`${this.baseUrl}/api/v1/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.apiKey && { 'Authorization': `Bearer ${this.apiKey}` }),
        },
        body: JSON.stringify({
          messages: this.conversation.messages.map(m => ({
            role: m.role,
            content: m.content,
          })),
          stream: false,
        }),
      });

      if (!response.ok) {
        // Fallback to local reasoning if RAGFlow unavailable
        return this.localReasoning(message);
      }

      const data = await response.json();
      const assistantMessage = data.choices?.[0]?.message?.content || data.content || '';

      this.addMessage('assistant', assistantMessage);

      // Try to extract scan plan from conversation
      this.extractScanPlan(assistantMessage);

      return assistantMessage;
    } catch (error) {
      console.error('RAGFlow chat error:', error);
      return this.localReasoning(message);
    }
  }

  /**
   * Local reasoning fallback
   */
  private localReasoning(message: string): string {
    const lowerMessage = message.toLowerCase();

    // Analyze user intent
    if (lowerMessage.includes('scan') || lowerMessage.includes('find') || lowerMessage.includes('exploit')) {
      const response = `I understand you want to find exploits. Let me help you create an aggressive, comprehensive scan plan.

To create the most thorough scan possible, I need to know:
1. What is your target? (URL, device, system, etc.)
2. What types of exploits are you most interested in? (unenrollment, privilege escalation, data exfiltration, etc.)
3. How aggressive should we be? (I recommend EXTREME for maximum coverage)
4. Any specific attack vectors you want to focus on?

Once we agree on these details, I'll generate a custom scan button that will execute a comprehensive, invasive scan designed to find 100% of possible exploits.`;
      
      this.addMessage('assistant', response);
      return response;
    }

    // Default response
    const response = `I'm here to help you find ChromeOS exploits. Tell me what you want to scan, and I'll create an aggressive, comprehensive scan plan that leaves nothing unchecked.`;
    this.addMessage('assistant', response);
    return response;
  }

  /**
   * Extract scan plan from conversation
   */
  private extractScanPlan(message: string): void {
    // Look for scan plan indicators
    if (message.includes('scan plan') || message.includes('scan button') || message.includes('ready to scan')) {
      const plan: ScanPlan = {
        target: this.extractTarget() || 'comprehensive',
        scanTypes: this.extractScanTypes(message),
        techniques: this.extractTechniques(message),
        aggressiveness: this.extractAggressiveness(message) || 'extreme',
        invasiveness: this.extractInvasiveness(message) || 'extreme',
        description: message,
        estimatedDuration: this.estimateDuration(message),
      };

      this.conversation.scanPlan = plan;
    }
  }

  /**
   * Extract target from conversation
   */
  private extractTarget(): string | null {
    for (const msg of this.conversation.messages) {
      if (msg.role === 'user') {
        // Look for URLs, IPs, or device identifiers
        const urlMatch = msg.content.match(/https?:\/\/[^\s]+/);
        if (urlMatch) return urlMatch[0];

        const ipMatch = msg.content.match(/\d+\.\d+\.\d+\.\d+/);
        if (ipMatch) return ipMatch[0];
      }
    }
    return null;
  }

  /**
   * Extract scan types from message
   */
  private extractScanTypes(message: string): string[] {
    const types: string[] = [];
    const lower = message.toLowerCase();

    if (lower.includes('unenrollment') || lower.includes('un-enroll')) types.push('unenrollment');
    if (lower.includes('oobe') || lower.includes('out-of-box')) types.push('oobe');
    if (lower.includes('server') || lower.includes('api')) types.push('server-side');
    if (lower.includes('client') || lower.includes('local')) types.push('client-side');
    if (lower.includes('kernel')) types.push('kernel');
    if (lower.includes('firmware')) types.push('firmware');
    if (lower.includes('boot')) types.push('boot');
    if (lower.includes('xss')) types.push('xss');
    if (lower.includes('sql') || lower.includes('injection')) types.push('sql-injection');
    if (lower.includes('csrf')) types.push('csrf');
    if (lower.includes('session')) types.push('session');
    if (lower.includes('storage')) types.push('storage');
    if (lower.includes('network')) types.push('network');
    if (lower.includes('privilege') || lower.includes('escalation')) types.push('privilege-escalation');
    if (lower.includes('memory')) types.push('memory');
    if (lower.includes('race') || lower.includes('condition')) types.push('race-condition');
    if (lower.includes('buffer') || lower.includes('overflow')) types.push('buffer-overflow');
    if (lower.includes('format') || lower.includes('string')) types.push('format-string');
    if (lower.includes('integer')) types.push('integer-overflow');
    if (lower.includes('use-after-free') || lower.includes('uaf')) types.push('use-after-free');
    if (lower.includes('double-free')) types.push('double-free');
    if (lower.includes('heap')) types.push('heap-corruption');
    if (lower.includes('stack')) types.push('stack-corruption');

    // If no specific types, include all
    if (types.length === 0) {
      types.push('comprehensive', 'all-exploits', 'deep-scan');
    }

    return types;
  }

  /**
   * Extract techniques from message
   */
  private extractTechniques(message: string): string[] {
    const techniques: string[] = [];
    const lower = message.toLowerCase();

    if (lower.includes('fuzzing') || lower.includes('fuzz')) techniques.push('fuzzing');
    if (lower.includes('brute') || lower.includes('force')) techniques.push('brute-force');
    if (lower.includes('dictionary')) techniques.push('dictionary-attack');
    if (lower.includes('rainbow') || lower.includes('table')) techniques.push('rainbow-table');
    if (lower.includes('timing')) techniques.push('timing-attack');
    if (lower.includes('side-channel')) techniques.push('side-channel');
    if (lower.includes('speculative')) techniques.push('speculative-execution');
    if (lower.includes('cache')) techniques.push('cache-attack');
    if (lower.includes('spectre') || lower.includes('meltdown')) techniques.push('cpu-vulnerability');
    if (lower.includes('rowhammer')) techniques.push('rowhammer');
    if (lower.includes('dram')) techniques.push('dram-attack');

    // Always include aggressive techniques
    techniques.push('deep-packet-inspection', 'memory-dump', 'process-injection', 'hook-injection', 'dll-injection');

    return techniques;
  }

  /**
   * Extract aggressiveness level
   */
  private extractAggressiveness(message: string): 'low' | 'medium' | 'high' | 'extreme' | null {
    const lower = message.toLowerCase();
    if (lower.includes('extreme') || lower.includes('maximum') || lower.includes('100%')) return 'extreme';
    if (lower.includes('high') || lower.includes('aggressive')) return 'high';
    if (lower.includes('medium') || lower.includes('moderate')) return 'medium';
    if (lower.includes('low') || lower.includes('gentle')) return 'low';
    return null;
  }

  /**
   * Extract invasiveness level
   */
  private extractInvasiveness(message: string): 'low' | 'medium' | 'high' | 'extreme' | null {
    const lower = message.toLowerCase();
    if (lower.includes('extreme') || lower.includes('invasive') || lower.includes('deep')) return 'extreme';
    if (lower.includes('high')) return 'high';
    if (lower.includes('medium')) return 'medium';
    if (lower.includes('low')) return 'low';
    return null;
  }

  /**
   * Estimate scan duration
   */
  private estimateDuration(message: string): number {
    // Base duration in seconds
    let duration = 300; // 5 minutes base

    const lower = message.toLowerCase();
    if (lower.includes('comprehensive') || lower.includes('all')) duration *= 3;
    if (lower.includes('extreme') || lower.includes('deep')) duration *= 2;
    if (lower.includes('quick') || lower.includes('fast')) duration /= 2;

    return duration;
  }

  /**
   * Get current scan plan
   */
  getScanPlan(): ScanPlan | null {
    return this.conversation.scanPlan || null;
  }

  /**
   * Search RAGFlow knowledge base
   */
  async searchKnowledgeBase(query: string, limit: number = 10): Promise<RAGFlowSearchResult[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.apiKey && { 'Authorization': `Bearer ${this.apiKey}` }),
        },
        body: JSON.stringify({
          query,
          limit,
        }),
      });

      if (!response.ok) {
        return [];
      }

      const data = await response.json();
      return (data.results || []).map((result: any) => ({
        content: result.content || '',
        score: result.score || 0,
        source: result.source || '',
        metadata: result.metadata,
      }));
    } catch (error) {
      console.error('RAGFlow search error:', error);
      return [];
    }
  }

  /**
   * Add document to knowledge base
   */
  async addDocument(content: string, metadata?: Record<string, any>): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/documents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.apiKey && { 'Authorization': `Bearer ${this.apiKey}` }),
        },
        body: JSON.stringify({
          content,
          metadata: metadata || {},
        }),
      });

      return response.ok;
    } catch (error) {
      console.error('RAGFlow add document error:', error);
      return false;
    }
  }
}

