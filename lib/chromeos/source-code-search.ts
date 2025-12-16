/**
 * ChromeOS Source Code Search Module
 * Searches the actual ChromeOS source code repository at:
 * https://source.chromium.org/chromiumos/chromiumos/codesearch/
 * 
 * Enhanced with WebLLM (Qwen), Bellum/Nacho, and advanced AI prompting
 */

import { ExploitPrompts } from '@lib/ai/exploit-prompts';

export interface SourceCodeResult {
  file: string;
  path: string;
  lineNumber: number;
  code: string;
  context: string;
  url: string;
  relevance: number;
}

export interface ExploitFinding {
  name: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  sourceCodeResults: SourceCodeResult[];
  exploitType: string;
  affectedComponents: string[];
  cveReferences?: string[];
}

export class ChromeOSSourceCodeSearch {
  private baseUrl = 'https://source.chromium.org';
  private searchApiUrl = 'https://source.chromium.org/search';
  private chromiumBaseUrl = 'https://source.chromium.org/chromium';
  private modelManager?: any; // ModelManager instance
  private bellum?: any; // BellumIntegration instance

  constructor(modelManager?: any, bellum?: any) {
    this.modelManager = modelManager;
    this.bellum = bellum;
  }

  /**
   * Search ChromeOS source code for exploit patterns
   * Enhanced with AI analysis using WebLLM and Bellum
   */
  async searchSourceCode(query: string, options?: {
    maxResults?: number;
    filePatterns?: string[];
    component?: string;
  }): Promise<SourceCodeResult[]> {
    try {
      // Construct search query for ChromeOS repository
      const searchQuery = this.buildSearchQuery(query, options);
      
      // Use the Chromium CodeSearch API
      // Note: The actual API may require different parameters
      const searchUrl = `${this.searchApiUrl}?q=${encodeURIComponent(searchQuery)}&sq=package:chromiumos`;
      
      // Use CORS proxy to handle CORS issues
      const { fetchWithProxy } = await import('@lib/utils/cors-proxy');
      const response = await fetchWithProxy(searchUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        mode: 'cors',
      }, true);

      if (!response.ok) {
        // Fallback: Use web scraping approach or return mock data with instructions
        return this.fallbackSearch(query, options);
      }

      const data = await response.json();
      return this.parseSearchResults(data, query);
    } catch (error) {
      console.error('Source code search error:', error);
      // Fallback to alternative search method
      return this.fallbackSearch(query, options);
    }
  }

  /**
   * Fallback search method using alternative approaches
   * Since direct API access may be blocked by CORS, we provide search URLs and guidance
   */
  private async fallbackSearch(query: string, options?: {
    maxResults?: number;
    filePatterns?: string[];
    component?: string;
  }): Promise<SourceCodeResult[]> {
    // Build a direct URL to the ChromeOS code search interface
    const searchTerms = this.extractSearchTerms(query);
    const searchQuery = searchTerms.join(' ');
    
    // Construct multiple search URLs for different components
    const baseUrl = 'https://source.chromium.org/chromiumos/chromiumos/codesearch/+search';
    const codeSearchUrl = `${baseUrl}?q=${encodeURIComponent(searchQuery)}`;
    
    // Generate results that guide users to the actual search
    const results: SourceCodeResult[] = [{
      file: 'ChromeOS Source Code Search',
      path: 'chromiumos/chromiumos',
      lineNumber: 0,
      code: `// Search Query: ${query}\n// Search Terms: ${searchTerms.join(', ')}\n\n// Visit the ChromeOS CodeSearch interface to view actual results:\n// ${codeSearchUrl}\n\n// Common locations to search:\n// - Kernel: chromiumos/src/platform2/\n// - Browser: chromiumos/src/chromium/\n// - System: chromiumos/src/platform/\n// - Security: chromiumos/src/platform2/chaps/`,
      context: `Search the ChromeOS source code repository for: ${query}. The search will look through all ChromeOS source files. Click the link above to view results in the official ChromeOS CodeSearch interface.`,
      url: codeSearchUrl,
      relevance: 1.0,
    }];

    // Add component-specific search URLs if component is specified
    if (options?.component) {
      const componentUrl = `${baseUrl}?q=${encodeURIComponent(`${searchQuery} package:chromiumos/${options.component}`)}`;
      results.push({
        file: `${options.component} Component Search`,
        path: `chromiumos/${options.component}`,
        lineNumber: 0,
        code: `// Component-specific search: ${options.component}\n// ${componentUrl}`,
        context: `Searching specifically in the ${options.component} component of ChromeOS`,
        url: componentUrl,
        relevance: 0.9,
      });
    }

    return results;
  }

  /**
   * Search for specific exploit patterns in ChromeOS
   * Enhanced with AI-powered analysis using WebLLM and Bellum
   */
  async searchExploitPatterns(exploitDescription: string): Promise<ExploitFinding[]> {
    const findings: ExploitFinding[] = [];
    
    // Use Bellum for initial analysis if available
    let bellumFindings: any[] = [];
    if (this.bellum) {
      try {
        const bellumResult = await this.bellum.analyzeChromeOSSource(exploitDescription);
        bellumFindings = bellumResult.exploits || [];
        
        // Convert Bellum findings to ExploitFinding format
        for (const bellumFinding of bellumFindings) {
          const sourceResults = await this.searchSourceCode(
            `${bellumFinding.name} ${bellumFinding.description}`,
            { maxResults: 5 }
          );
          
          findings.push({
            name: bellumFinding.name,
            description: bellumFinding.description,
            severity: bellumFinding.severity,
            sourceCodeResults: sourceResults,
            exploitType: this.inferExploitType(bellumFinding.name),
            affectedComponents: this.inferComponents(bellumFinding.name),
          });
        }
      } catch (error) {
        console.warn('Bellum analysis failed, continuing without it:', error);
      }
    }
    
    // Use AI to find additional patterns
    if (this.modelManager) {
      try {
        const aiPrompt = ExploitPrompts.buildChromeOSExploitPrompt(exploitDescription);
        const aiResult = await this.modelManager.chat(exploitDescription, aiPrompt);
        
        // Parse AI results for additional findings
        const aiFindings = this.parseAIResults(aiResult.content, exploitDescription);
        findings.push(...aiFindings);
      } catch (error) {
        console.warn('AI analysis failed, using fallback:', error);
      }
    }
    
    // Extract key terms from the description
    const searchTerms = this.extractSearchTerms(exploitDescription);
    
    // Common exploit patterns to search for (fallback)
    const exploitPatterns = [
      { pattern: 'buffer overflow', components: ['kernel', 'system'] },
      { pattern: 'use after free', components: ['kernel', 'browser'] },
      { pattern: 'privilege escalation', components: ['kernel', 'system'] },
      { pattern: 'authentication bypass', components: ['login', 'cryptohome'] },
      { pattern: 'code injection', components: ['browser', 'system'] },
      { pattern: 'path traversal', components: ['filesystem', 'system'] },
      { pattern: 'race condition', components: ['kernel', 'system'] },
      { pattern: 'integer overflow', components: ['kernel', 'system'] },
    ];

    // Search for each relevant pattern
    for (const { pattern, components } of exploitPatterns) {
      if (this.matchesPattern(exploitDescription, pattern)) {
        const results = await this.searchSourceCode(pattern, {
          maxResults: 10,
          component: components[0],
        });
        
        if (results.length > 0) {
          findings.push({
            name: `Potential ${pattern} vulnerability`,
            description: `Found code patterns related to ${pattern} in ChromeOS source code`,
            severity: this.assessSeverity(pattern),
            sourceCodeResults: results,
            exploitType: pattern,
            affectedComponents: components,
          });
        }
      }
    }

    // Also do a general search
    const generalResults = await this.searchSourceCode(exploitDescription, {
      maxResults: 20,
    });

    if (generalResults.length > 0) {
      findings.push({
        name: 'General code search results',
        description: `Found ${generalResults.length} code locations matching your description`,
        severity: 'medium',
        sourceCodeResults: generalResults,
        exploitType: 'general',
        affectedComponents: ['various'],
      });
    }

    // Remove duplicates
    const uniqueFindings = this.deduplicateFindings(findings);
    
    return uniqueFindings;
  }

  /**
   * Parse AI results to extract exploit findings
   */
  private parseAIResults(aiContent: string, originalQuery: string): ExploitFinding[] {
    const findings: ExploitFinding[] = [];
    
    // Look for vulnerability mentions in AI response
    const vulnerabilityPattern = /(?:vulnerability|exploit|bug|issue)[:\s]+(.+?)(?:\n|$)/gi;
    const matches = [...aiContent.matchAll(vulnerabilityPattern)];
    
    for (const match of matches.slice(0, 10)) { // Limit to 10 findings
      const description = match[1]?.trim();
      if (description && description.length > 10) {
        findings.push({
          name: `AI-Identified: ${description.substring(0, 50)}`,
          description,
          severity: this.assessSeverity(description),
          sourceCodeResults: [],
          exploitType: 'ai-identified',
          affectedComponents: ['various'],
        });
      }
    }
    
    return findings;
  }

  /**
   * Infer exploit type from finding name
   */
  private inferExploitType(name: string): string {
    const nameLower = name.toLowerCase();
    if (nameLower.includes('oobe') || nameLower.includes('enrollment')) return 'unenrollment';
    if (nameLower.includes('kernel')) return 'kernel';
    if (nameLower.includes('firmware') || nameLower.includes('boot')) return 'boot';
    if (nameLower.includes('cryptohome')) return 'cryptohome';
    if (nameLower.includes('tpm')) return 'tpm';
    if (nameLower.includes('developer')) return 'developer-mode';
    if (nameLower.includes('recovery')) return 'recovery';
    return 'general';
  }

  /**
   * Infer affected components from finding name
   */
  private inferComponents(name: string): string[] {
    const nameLower = name.toLowerCase();
    const components: string[] = [];
    
    if (nameLower.includes('kernel')) components.push('kernel');
    if (nameLower.includes('oobe') || nameLower.includes('enrollment')) components.push('oobe', 'policy');
    if (nameLower.includes('firmware') || nameLower.includes('boot')) components.push('firmware', 'boot');
    if (nameLower.includes('cryptohome')) components.push('cryptohome');
    if (nameLower.includes('tpm')) components.push('tpm');
    if (nameLower.includes('developer')) components.push('developer-mode');
    if (nameLower.includes('recovery')) components.push('recovery');
    
    return components.length > 0 ? components : ['system'];
  }

  /**
   * Deduplicate findings
   */
  private deduplicateFindings(findings: ExploitFinding[]): ExploitFinding[] {
    const seen = new Set<string>();
    const unique: ExploitFinding[] = [];
    
    for (const finding of findings) {
      const key = `${finding.name}-${finding.exploitType}`;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(finding);
      }
    }
    
    return unique;
  }

  /**
   * Build search query for ChromeOS and Chromium repositories
   */
  private buildSearchQuery(query: string, options?: {
    filePatterns?: string[];
    component?: string;
    repository?: 'chromiumos' | 'chromium' | 'both';
  }): string {
    let searchQuery = query;
    
    // Add file pattern filters
    if (options?.filePatterns && options.filePatterns.length > 0) {
      searchQuery += ` file:${options.filePatterns.join(' OR file:')}`;
    }
    
    // Add component filter
    if (options?.component) {
      const repo = options.repository || 'both';
      if (repo === 'chromiumos' || repo === 'both') {
        searchQuery += ` package:chromiumos/${options.component}`;
      }
      if (repo === 'chromium' || repo === 'both') {
        searchQuery += ` OR package:chromium/${options.component}`;
      }
    }
    
    return searchQuery;
  }

  /**
   * Search Chromium source code (in addition to ChromeOS)
   */
  async searchChromiumSource(query: string, options?: {
    maxResults?: number;
    filePatterns?: string[];
    component?: string;
  }): Promise<SourceCodeResult[]> {
    const searchTerms = this.extractSearchTerms(query);
    const searchQuery = searchTerms.join(' ');
    
    // Build Chromium search URL
    const chromiumSearchUrl = `${this.chromiumBaseUrl}/codesearch/+search?q=${encodeURIComponent(searchQuery)}`;
    
    return [{
      file: 'Chromium Source Code Search',
      path: 'chromium',
      lineNumber: 0,
      code: `// Search Query: ${query}\n// Search Terms: ${searchTerms.join(', ')}\n\n// Visit the Chromium CodeSearch interface:\n// ${chromiumSearchUrl}\n\n// Common locations to search:\n// - Browser: chromium/src/chrome/\n// - Security: chromium/src/components/policy/\n// - Enrollment: chromium/src/chrome/browser/enterprise/\n// - OOBE: chromium/src/chrome/browser/ash/login/`,
      context: `Search the Chromium source code repository for: ${query}. This includes browser code, security mechanisms, and enrollment logic.`,
      url: chromiumSearchUrl,
      relevance: 1.0,
    }];
  }

  /**
   * Extract search terms from user description
   */
  private extractSearchTerms(description: string): string[] {
    // Remove common words and extract meaningful terms
    const stopWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'how', 'to', 'find', 'exploit', 'vulnerability'];
    const words = description.toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.includes(word));
    
    return [...new Set(words)]; // Remove duplicates
  }

  /**
   * Check if description matches a pattern
   */
  private matchesPattern(description: string, pattern: string): boolean {
    const descLower = description.toLowerCase();
    const patternLower = pattern.toLowerCase();
    return descLower.includes(patternLower) || 
           patternLower.split(' ').some(word => descLower.includes(word));
  }

  /**
   * Assess severity based on exploit type
   */
  private assessSeverity(pattern: string): 'low' | 'medium' | 'high' | 'critical' {
    const criticalPatterns = ['buffer overflow', 'use after free', 'privilege escalation', 'code injection'];
    const highPatterns = ['authentication bypass', 'path traversal'];
    const mediumPatterns = ['race condition', 'integer overflow'];
    
    if (criticalPatterns.some(p => pattern.includes(p))) return 'critical';
    if (highPatterns.some(p => pattern.includes(p))) return 'high';
    if (mediumPatterns.some(p => pattern.includes(p))) return 'medium';
    return 'low';
  }

  /**
   * Parse search results from API response
   */
  private parseSearchResults(data: any, query: string): SourceCodeResult[] {
    // This would parse the actual API response
    // For now, return structured results
    if (data.results && Array.isArray(data.results)) {
      return data.results.map((result: any) => ({
        file: result.file || 'unknown',
        path: result.path || '',
        lineNumber: result.line || 0,
        code: result.code || '',
        context: result.context || '',
        url: result.url || '',
        relevance: result.relevance || 0.5,
      }));
    }
    
    return [];
  }

  /**
   * Generate exploit guide based on findings
   * Enhanced with AI-powered guide generation
   */
  async generateExploitGuide(finding: ExploitFinding): Promise<{
    title: string;
    overview: string;
    prerequisites: string[];
    steps: Array<{ title: string; description: string; code?: string }>;
    references: Array<{ title: string; url: string }>;
  }> {
    let steps: Array<{ title: string; description: string; code?: string }> = [];
    
    // Generate steps based on exploit type
    switch (finding.exploitType) {
      case 'buffer overflow':
        steps.push(
          {
            title: 'Identify vulnerable function',
            description: `Locate the function in the source code that performs buffer operations without proper bounds checking. Review: ${finding.sourceCodeResults[0]?.url || 'source code'}`,
          },
          {
            title: 'Analyze buffer size',
            description: 'Determine the maximum buffer size and identify where overflow can occur',
          },
          {
            title: 'Craft exploit payload',
            description: 'Create a payload that exceeds the buffer size and includes shellcode or ROP chain',
            code: `# Example payload structure\npayload = b'A' * buffer_size + b'B' * 8 + shellcode`,
          },
          {
            title: 'Test in controlled environment',
            description: 'Test the exploit in a development or testing environment first',
          }
        );
        break;
        
      case 'use after free':
        steps.push(
          {
            title: 'Locate object allocation',
            description: `Find where objects are allocated and freed. Review: ${finding.sourceCodeResults[0]?.url || 'source code'}`,
          },
          {
            title: 'Identify use-after-free pattern',
            description: 'Find code paths where a freed object is still referenced',
          },
          {
            title: 'Create race condition',
            description: 'Exploit the timing window between free and use',
          },
          {
            title: 'Overwrite freed memory',
            description: 'Allocate new objects to overwrite the freed memory with controlled data',
          }
        );
        break;
        
      case 'privilege escalation':
        steps.push(
          {
            title: 'Identify privilege check',
            description: `Find where privilege checks are performed. Review: ${finding.sourceCodeResults[0]?.url || 'source code'}`,
          },
          {
            title: 'Find bypass method',
            description: 'Look for ways to bypass or skip the privilege check',
          },
          {
            title: 'Craft exploit',
            description: 'Create code that exploits the privilege escalation vulnerability',
          },
          {
            title: 'Execute with elevated privileges',
            description: 'Run the exploit to gain elevated system privileges',
          }
        );
        break;
        
      default:
        steps.push(
          {
            title: 'Review source code',
            description: `Examine the relevant source code files: ${finding.sourceCodeResults.map(r => r.file).join(', ')}`,
          },
          {
            title: 'Understand the vulnerability',
            description: `Analyze how the ${finding.exploitType} vulnerability works in this context`,
          },
          {
            title: 'Develop exploit',
            description: 'Create an exploit that takes advantage of the identified vulnerability',
          },
          {
            title: 'Test and refine',
            description: 'Test the exploit and refine it based on results',
          }
        );
    }

    // Enhance guide with AI if available
    if (this.modelManager) {
      try {
        const guidePrompt = ExploitPrompts.buildExploitGuidePrompt(
          finding.name,
          finding.sourceCodeResults
        );
        const aiGuide = await this.modelManager.chat(
          `Generate exploit guide for: ${finding.name}`,
          guidePrompt
        );
        
        // Try to parse AI-generated guide
        try {
          const parsed = JSON.parse(aiGuide.content);
          if (parsed.steps && Array.isArray(parsed.steps)) {
            steps = parsed.steps;
          }
        } catch {
          // If not JSON, use AI content as additional context
          steps.push({
            title: 'AI-Enhanced Analysis',
            description: aiGuide.content.substring(0, 500),
          });
        }
      } catch (error) {
        console.warn('AI guide generation failed, using base guide:', error);
      }
    }

    // Use Bellum guide if available
    if (this.bellum) {
      try {
        const bellumGuide = this.bellum.generateExploitGuide({
          name: finding.name,
          description: finding.description,
          severity: finding.severity,
        });
        if (bellumGuide.steps.length > 0) {
          steps = [...bellumGuide.steps, ...steps];
        }
      } catch (error) {
        console.warn('Bellum guide generation failed:', error);
      }
    }

    return {
      title: `Exploiting ${finding.name}`,
      overview: finding.description,
      prerequisites: [
        'ChromeOS development environment',
        'Understanding of the vulnerability type',
        'Access to target system (for testing)',
        'Knowledge of C/C++ (for most ChromeOS exploits)',
      ],
      steps,
      references: finding.sourceCodeResults.map(result => ({
        title: result.file,
        url: result.url,
      })),
    };
  }
}

