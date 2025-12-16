/**
 * SearXNG Integration
 * Metasearch engine integration for comprehensive exploit research
 * Based on: https://github.com/searxng/searxng
 */

import { fetchWithProxy } from '@lib/utils/cors-proxy';

export interface SearXNGResult {
  title: string;
  url: string;
  content: string;
  engine: string;
  score?: number;
}

export interface SearXNGSearchOptions {
  query: string;
  engines?: string[];
  categories?: string[];
  language?: string;
  timeRange?: string;
  safesearch?: '0' | '1' | '2';
}

export class SearXNGIntegration {
  private baseUrl: string;
  private defaultEngines: string[];

  constructor(baseUrl: string = 'https://searx.be', engines?: string[]) {
    this.baseUrl = baseUrl;
    this.defaultEngines = engines || [
      'google', 'bing', 'duckduckgo', 'startpage', 
      'qwant', 'brave', 'yahoo'
    ];
  }

  /**
   * Search using SearXNG
   */
  async search(options: SearXNGSearchOptions): Promise<SearXNGResult[]> {
    try {
      const params = new URLSearchParams({
        q: options.query,
        format: 'json',
        engines: (options.engines || this.defaultEngines).join(','),
        ...(options.categories && { categories: options.categories.join(',') }),
        ...(options.language && { language: options.language }),
        ...(options.timeRange && { time_range: options.timeRange }),
        ...(options.safesearch && { safesearch: options.safesearch }),
      });

      const response = await fetchWithProxy(
        `${this.baseUrl}/search?${params.toString()}`,
        {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
        },
        true // Use CORS proxy
      );

      if (!response.ok) {
        throw new Error(`SearXNG request failed: ${response.statusText}`);
      }

      const data = await response.json();
      return this.parseResults(data);
    } catch (error) {
      console.error('SearXNG search error:', error);
      // Fallback: try alternative SearXNG instances
      return this.searchFallback(options);
    }
  }

  /**
   * Fallback to alternative SearXNG instances
   */
  private async searchFallback(options: SearXNGSearchOptions): Promise<SearXNGResult[]> {
    const instances = [
      'https://searx.be',
      'https://search.sapti.me',
      'https://searx.tiekoetter.com',
    ];

    for (const instance of instances) {
      try {
        const params = new URLSearchParams({
          q: options.query,
          format: 'json',
        });

        const response = await fetchWithProxy(
          `${instance}/search?${params.toString()}`,
          {
            method: 'GET',
            headers: {
              'Accept': 'application/json',
            },
          },
          true // Use CORS proxy
        );
        if (response.ok) {
          const data = await response.json();
          return this.parseResults(data);
        }
      } catch (error) {
        console.warn(`SearXNG instance ${instance} failed:`, error);
        continue;
      }
    }

    return [];
  }

  /**
   * Parse SearXNG results
   */
  private parseResults(data: any): SearXNGResult[] {
    if (!data.results || !Array.isArray(data.results)) {
      return [];
    }

    return data.results.map((result: any) => ({
      title: result.title || '',
      url: result.url || '',
      content: result.content || '',
      engine: result.engine || 'unknown',
      score: result.score || 0,
    }));
  }

  /**
   * Search specifically for ChromeOS exploits
   */
  async searchChromeOSExploits(query: string): Promise<SearXNGResult[]> {
    const enhancedQuery = `ChromeOS ${query} exploit vulnerability CVE`;
    
    return this.search({
      query: enhancedQuery,
      engines: ['google', 'duckduckgo', 'startpage', 'qwant'],
      safesearch: '0',
    });
  }

  /**
   * Search chromebook-utilities.pages.dev related content
   */
  async searchChromebookUtilities(query: string): Promise<SearXNGResult[]> {
    return this.search({
      query: `site:chromebook-utilities.pages.dev OR "chromebook utilities" ${query}`,
      engines: ['google', 'duckduckgo'],
      safesearch: '0',
    });
  }

  /**
   * Search ChromeOS source code references
   */
  async searchChromeOSSource(query: string): Promise<SearXNGResult[]> {
    return this.search({
      query: `site:source.chromium.org OR site:chromium.googlesource.com ChromeOS ${query}`,
      engines: ['google', 'duckduckgo'],
      safesearch: '0',
    });
  }

  /**
   * Comprehensive exploit search across all sources
   */
  async comprehensiveExploitSearch(query: string): Promise<{
    webResults: SearXNGResult[];
    chromebookUtilities: SearXNGResult[];
    sourceCode: SearXNGResult[];
  }> {
    const [webResults, chromebookUtilities, sourceCode] = await Promise.all([
      this.searchChromeOSExploits(query),
      this.searchChromebookUtilities(query),
      this.searchChromeOSSource(query),
    ]);

    return {
      webResults,
      chromebookUtilities,
      sourceCode,
    };
  }
}

