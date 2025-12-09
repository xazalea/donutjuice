/**
 * OpenMemory Integration
 * Enhanced memory management for exploit research
 * Based on: https://github.com/CaviraOSS/OpenMemory
 */

export interface MemoryEntry {
  id: string;
  content: string;
  metadata: Record<string, any>;
  timestamp: string;
  importance: number;
  tags: string[];
}

export interface MemoryQuery {
  query: string;
  tags?: string[];
  minImportance?: number;
  limit?: number;
}

export class OpenMemory {
  private memories: Map<string, MemoryEntry> = new Map();
  private maxMemories: number = 10000;

  /**
   * Store a memory entry
   */
  store(content: string, metadata?: Record<string, any>, tags?: string[]): string {
    const id = this.generateId();
    const entry: MemoryEntry = {
      id,
      content,
      metadata: metadata || {},
      timestamp: new Date().toISOString(),
      importance: this.calculateImportance(content, metadata),
      tags: tags || [],
    };
    
    this.memories.set(id, entry);
    
    // Evict least important memories if over limit
    if (this.memories.size > this.maxMemories) {
      this.evictLeastImportant();
    }
    
    return id;
  }

  /**
   * Retrieve memories by query
   */
  retrieve(query: MemoryQuery): MemoryEntry[] {
    let results: MemoryEntry[] = Array.from(this.memories.values());
    
    // Filter by tags
    if (query.tags && query.tags.length > 0) {
      results = results.filter(entry =>
        query.tags!.some(tag => entry.tags.includes(tag))
      );
    }
    
    // Filter by importance
    if (query.minImportance !== undefined) {
      results = results.filter(entry => entry.importance >= query.minImportance!);
    }
    
    // Search by content
    if (query.query) {
      const queryLower = query.query.toLowerCase();
      results = results
        .filter(entry => 
          entry.content.toLowerCase().includes(queryLower) ||
          entry.tags.some(tag => tag.toLowerCase().includes(queryLower))
        )
        .sort((a, b) => {
          // Sort by relevance (content match > tag match)
          const aRelevance = a.content.toLowerCase().includes(queryLower) ? 2 : 1;
          const bRelevance = b.content.toLowerCase().includes(queryLower) ? 2 : 1;
          return bRelevance - aRelevance || b.importance - a.importance;
        });
    } else {
      // Sort by importance if no query
      results.sort((a, b) => b.importance - a.importance);
    }
    
    // Apply limit
    if (query.limit) {
      results = results.slice(0, query.limit);
    }
    
    return results;
  }

  /**
   * Store exploit research findings
   */
  storeExploitFinding(
    vulnerability: string,
    exploitVector: string,
    severity: string,
    tags?: string[]
  ): string {
    return this.store(
      `Vulnerability: ${vulnerability}\nExploit Vector: ${exploitVector}\nSeverity: ${severity}`,
      {
        type: 'exploit',
        vulnerability,
        exploitVector,
        severity,
      },
      ['exploit', severity, ...(tags || [])]
    );
  }

  /**
   * Retrieve unenrollment exploit memories
   */
  retrieveUnenrollmentExploits(limit: number = 20): MemoryEntry[] {
    return this.retrieve({
      query: 'unenrollment',
      tags: ['exploit', 'unenrollment', 'oobe', 'server-side'],
      limit,
    });
  }

  /**
   * Store OOBE exploit finding
   */
  storeOOBEExploit(method: string, description: string, severity: string): string {
    return this.storeExploitFinding(
      `OOBE Unenrollment: ${method}`,
      description,
      severity,
      ['oobe', 'unenrollment', method.toLowerCase().replace(/\s+/g, '-')]
    );
  }

  /**
   * Store server-side exploit finding
   */
  storeServerSideExploit(method: string, description: string, severity: string): string {
    return this.storeExploitFinding(
      `Server-Side Unenrollment: ${method}`,
      description,
      severity,
      ['server-side', 'unenrollment', method.toLowerCase().replace(/\s+/g, '-')]
    );
  }

  /**
   * Calculate importance score
   */
  private calculateImportance(content: string, metadata?: Record<string, any>): number {
    let score = 0.5; // Base score
    
    // Increase score for exploit-related content
    const exploitKeywords = ['exploit', 'vulnerability', 'bypass', 'critical', 'high'];
    for (const keyword of exploitKeywords) {
      if (content.toLowerCase().includes(keyword)) {
        score += 0.1;
      }
    }
    
    // Increase score based on severity
    if (metadata?.severity) {
      const severityScores: Record<string, number> = {
        'critical': 0.3,
        'high': 0.2,
        'medium': 0.1,
        'low': 0.05,
      };
      score += severityScores[metadata.severity] || 0;
    }
    
    // Increase score for recent entries
    const age = Date.now() - new Date(metadata?.timestamp || Date.now()).getTime();
    const daysOld = age / (1000 * 60 * 60 * 24);
    score += Math.max(0, 0.2 - daysOld * 0.01);
    
    return Math.min(1.0, score);
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `mem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Evict least important memories
   */
  private evictLeastImportant(): void {
    const entries = Array.from(this.memories.entries());
    entries.sort((a, b) => a[1].importance - b[1].importance);
    
    // Remove bottom 10%
    const toRemove = Math.floor(this.memories.size * 0.1);
    for (let i = 0; i < toRemove; i++) {
      this.memories.delete(entries[i][0]);
    }
  }

  /**
   * Get memory statistics
   */
  getStats(): {
    total: number;
    byTag: Record<string, number>;
    bySeverity: Record<string, number>;
  } {
    const byTag: Record<string, number> = {};
    const bySeverity: Record<string, number> = {};
    
    for (const entry of this.memories.values()) {
      // Count by tags
      for (const tag of entry.tags) {
        byTag[tag] = (byTag[tag] || 0) + 1;
      }
      
      // Count by severity
      const severity = entry.metadata?.severity || 'unknown';
      bySeverity[severity] = (bySeverity[severity] || 0) + 1;
    }
    
    return {
      total: this.memories.size,
      byTag,
      bySeverity,
    };
  }
}

