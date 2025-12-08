/**
 * Crawl4AI RAG Integration
 * Web crawling and RAG capabilities for exploit research
 * Based on: https://github.com/coleam00/mcp-crawl4ai-rag
 */

export interface CrawlResult {
  url: string;
  content: string;
  metadata: Record<string, any>;
  timestamp: string;
}

export interface RAGSearchResult {
  content: string;
  score: number;
  source: string;
  metadata?: Record<string, any>;
}

export class Crawl4AIRAG {
  private baseUrl: string;
  private apiKey?: string;

  constructor(baseUrl: string = 'http://localhost:8051', apiKey?: string) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
  }

  /**
   * Crawl a URL for exploit research
   */
  async crawlURL(url: string, options?: {
    depth?: number;
    followLinks?: boolean;
    extractCode?: boolean;
  }): Promise<CrawlResult> {
    try {
      const response = await fetch(`${this.baseUrl}/crawl`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.apiKey && { 'Authorization': `Bearer ${this.apiKey}` }),
        },
        body: JSON.stringify({
          url,
          depth: options?.depth || 1,
          follow_links: options?.followLinks || false,
          extract_code: options?.extractCode || true,
        }),
      });

      if (!response.ok) {
        throw new Error(`Crawl failed: ${response.statusText}`);
      }

      const data = await response.json();
      
      return {
        url: data.url || url,
        content: data.content || '',
        metadata: data.metadata || {},
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Crawl error:', error);
      throw error;
    }
  }

  /**
   * Search RAG knowledge base for exploit information
   */
  async searchRAG(query: string, options?: {
    limit?: number;
    threshold?: number;
    useHybrid?: boolean;
  }): Promise<RAGSearchResult[]> {
    try {
      const response = await fetch(`${this.baseUrl}/rag/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.apiKey && { 'Authorization': `Bearer ${this.apiKey}` }),
        },
        body: JSON.stringify({
          query,
          limit: options?.limit || 10,
          threshold: options?.threshold || 0.7,
          use_hybrid: options?.useHybrid !== false,
        }),
      });

      if (!response.ok) {
        throw new Error(`RAG search failed: ${response.statusText}`);
      }

      const data = await response.json();
      
      return (data.results || []).map((result: any) => ({
        content: result.content || '',
        score: result.score || 0,
        source: result.source || '',
        metadata: result.metadata,
      }));
    } catch (error) {
      console.error('RAG search error:', error);
      throw error;
    }
  }

  /**
   * Add content to RAG knowledge base
   */
  async addToKnowledgeBase(content: string, metadata?: Record<string, any>): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/rag/add`, {
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
      console.error('Add to knowledge base error:', error);
      return false;
    }
  }

  /**
   * Crawl and index exploit documentation
   */
  async crawlAndIndexExploitDocs(urls: string[]): Promise<CrawlResult[]> {
    const results: CrawlResult[] = [];
    
    for (const url of urls) {
      try {
        const result = await this.crawlURL(url, {
          depth: 2,
          followLinks: true,
          extractCode: true,
        });
        
        results.push(result);
        
        // Add to knowledge base
        await this.addToKnowledgeBase(result.content, {
          url: result.url,
          ...result.metadata,
        });
      } catch (error) {
        console.error(`Failed to crawl ${url}:`, error);
      }
    }
    
    return results;
  }

  /**
   * Search for unenrollment exploit information
   */
  async searchUnenrollmentExploits(): Promise<RAGSearchResult[]> {
    const queries = [
      'ChromeOS unenrollment exploit',
      'OOBE bypass enrollment',
      'server-side unenrollment ChromeOS',
      'device management API bypass',
      'enrollment token manipulation',
    ];
    
    const allResults: RAGSearchResult[] = [];
    
    for (const query of queries) {
      try {
        const results = await this.searchRAG(query, {
          limit: 5,
          threshold: 0.6,
        });
        allResults.push(...results);
      } catch (error) {
        console.error(`RAG search failed for "${query}":`, error);
      }
    }
    
    // Deduplicate and sort by score
    const uniqueResults = Array.from(
      new Map(allResults.map(r => [r.source, r])).values()
    ).sort((a, b) => b.score - a.score);
    
    return uniqueResults;
  }
}

