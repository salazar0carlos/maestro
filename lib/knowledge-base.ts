/**
 * Knowledge Base for Maestro Agents
 * Stores and retrieves agent learnings, patterns, and insights
 *
 * Features:
 * - Store agent learnings and discoveries
 * - Search knowledge by topic, tags, agent
 * - Retrieve relevant knowledge for tasks
 * - Track knowledge evolution over time
 */

export interface KnowledgeEntry {
  id: string;
  agent: string;
  topic: string;
  content: string;
  type: 'learning' | 'pattern' | 'solution' | 'insight' | 'warning';
  tags: string[];
  timestamp: string;
  project_id?: string;
  task_id?: string;
  confidence?: 'low' | 'medium' | 'high';
  verified?: boolean;
  usageCount?: number;
}

export interface KnowledgeQuery {
  topic?: string;
  agent?: string;
  tags?: string[];
  type?: KnowledgeEntry['type'];
  project_id?: string;
  minConfidence?: 'low' | 'medium' | 'high';
}

const STORAGE_KEY = 'maestro:knowledge-base';

/**
 * Check if we're in browser environment
 */
function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
}

/**
 * Generate unique ID
 */
function generateId(): string {
  return `kb-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Get knowledge base from storage
 */
function getKnowledgeBase(): KnowledgeEntry[] {
  if (!isBrowser()) return [];

  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

/**
 * Save knowledge base to storage
 */
function saveKnowledgeBase(entries: KnowledgeEntry[]): void {
  if (!isBrowser()) return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch (error) {
    console.error('Failed to save knowledge base:', error);
  }
}

/**
 * Extract tags from content
 */
function extractTags(content: string): string[] {
  const text = content.toLowerCase();
  const tags: Set<string> = new Set();

  // Common technical terms to tag
  const patterns = [
    /\b(react|vue|angular|nextjs|typescript|javascript)\b/g,
    /\b(api|endpoint|database|schema|migration)\b/g,
    /\b(component|hook|service|utility|helper)\b/g,
    /\b(bug|error|warning|issue|fix)\b/g,
    /\b(performance|optimization|security|testing)\b/g,
    /\b(frontend|backend|fullstack|devops)\b/g,
  ];

  patterns.forEach(pattern => {
    const matches = text.match(pattern);
    if (matches) {
      matches.forEach(match => tags.add(match));
    }
  });

  return Array.from(tags);
}

export class KnowledgeBase {
  /**
   * Save knowledge to knowledge base
   */
  static saveKnowledge(
    agent: string,
    topic: string,
    content: string,
    type: KnowledgeEntry['type'] = 'learning',
    options: {
      project_id?: string;
      task_id?: string;
      confidence?: 'low' | 'medium' | 'high';
      customTags?: string[];
    } = {}
  ): KnowledgeEntry {
    const autoTags = extractTags(`${topic} ${content}`);
    const tags = [...new Set([...autoTags, ...(options.customTags || [])])];

    const entry: KnowledgeEntry = {
      id: generateId(),
      agent,
      topic,
      content,
      type,
      tags,
      timestamp: new Date().toISOString(),
      project_id: options.project_id,
      task_id: options.task_id,
      confidence: options.confidence || 'medium',
      verified: false,
      usageCount: 0,
    };

    const kb = getKnowledgeBase();
    kb.push(entry);
    saveKnowledgeBase(kb);

    console.log(`[KnowledgeBase] ${agent} saved ${type}: ${topic}`);

    return entry;
  }

  /**
   * Search knowledge base
   */
  static search(query: string): KnowledgeEntry[] {
    const kb = getKnowledgeBase();
    const lowerQuery = query.toLowerCase();

    return kb
      .filter(entry => {
        const searchText = `
          ${entry.topic}
          ${entry.content}
          ${entry.tags.join(' ')}
          ${entry.agent}
        `.toLowerCase();

        return searchText.includes(lowerQuery);
      })
      .sort((a, b) => {
        // Sort by usage count, then timestamp
        if (a.usageCount !== b.usageCount) {
          return (b.usageCount || 0) - (a.usageCount || 0);
        }
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      });
  }

  /**
   * Advanced search with filters
   */
  static advancedSearch(query: KnowledgeQuery): KnowledgeEntry[] {
    const kb = getKnowledgeBase();
    const confidenceLevels = { low: 1, medium: 2, high: 3 };

    return kb
      .filter(entry => {
        // Filter by topic
        if (query.topic && !entry.topic.toLowerCase().includes(query.topic.toLowerCase())) {
          return false;
        }

        // Filter by agent
        if (query.agent && entry.agent !== query.agent) {
          return false;
        }

        // Filter by type
        if (query.type && entry.type !== query.type) {
          return false;
        }

        // Filter by project
        if (query.project_id && entry.project_id !== query.project_id) {
          return false;
        }

        // Filter by tags
        if (query.tags && query.tags.length > 0) {
          const hasMatchingTag = query.tags.some(tag =>
            entry.tags.some(entryTag => entryTag.includes(tag.toLowerCase()))
          );
          if (!hasMatchingTag) return false;
        }

        // Filter by confidence
        if (query.minConfidence && entry.confidence) {
          const entryLevel = confidenceLevels[entry.confidence];
          const minLevel = confidenceLevels[query.minConfidence];
          if (entryLevel < minLevel) return false;
        }

        return true;
      })
      .sort((a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
  }

  /**
   * Get relevant knowledge for agent working on task
   */
  static getRelevantKnowledge(
    agentType: string,
    task: { title: string; description: string; project_id?: string }
  ): KnowledgeEntry[] {
    const kb = getKnowledgeBase();

    // Extract keywords from task
    const taskText = `${task.title} ${task.description}`.toLowerCase();
    const keywords = taskText.match(/\b\w{4,}\b/g) || [];

    return kb
      .filter(entry => {
        // Same project
        if (task.project_id && entry.project_id === task.project_id) {
          return true;
        }

        // Same agent type
        if (entry.agent === agentType) {
          return true;
        }

        // Matching keywords in content or tags
        const entryText = `${entry.topic} ${entry.content} ${entry.tags.join(' ')}`.toLowerCase();
        const matchingKeywords = keywords.filter(kw => entryText.includes(kw));

        return matchingKeywords.length >= 2;
      })
      .sort((a, b) => {
        // Prioritize verified and high-usage entries
        const scoreA = (a.verified ? 100 : 0) + (a.usageCount || 0);
        const scoreB = (b.verified ? 100 : 0) + (b.usageCount || 0);

        if (scoreA !== scoreB) {
          return scoreB - scoreA;
        }

        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      })
      .slice(0, 10); // Return top 10 most relevant
  }

  /**
   * Get knowledge by ID
   */
  static getById(id: string): KnowledgeEntry | null {
    const kb = getKnowledgeBase();
    return kb.find(entry => entry.id === id) || null;
  }

  /**
   * Update knowledge entry
   */
  static updateKnowledge(
    id: string,
    updates: Partial<KnowledgeEntry>
  ): KnowledgeEntry | null {
    const kb = getKnowledgeBase();
    const index = kb.findIndex(entry => entry.id === id);

    if (index === -1) return null;

    kb[index] = { ...kb[index], ...updates };
    saveKnowledgeBase(kb);

    return kb[index];
  }

  /**
   * Mark knowledge as verified
   */
  static verify(id: string): boolean {
    return this.updateKnowledge(id, { verified: true }) !== null;
  }

  /**
   * Increment usage count
   */
  static recordUsage(id: string): void {
    const entry = this.getById(id);
    if (entry) {
      this.updateKnowledge(id, {
        usageCount: (entry.usageCount || 0) + 1,
      });
    }
  }

  /**
   * Delete knowledge entry
   */
  static deleteKnowledge(id: string): boolean {
    const kb = getKnowledgeBase();
    const filtered = kb.filter(entry => entry.id !== id);

    if (filtered.length === kb.length) {
      return false;
    }

    saveKnowledgeBase(filtered);
    return true;
  }

  /**
   * Get knowledge by agent
   */
  static getByAgent(agent: string): KnowledgeEntry[] {
    const kb = getKnowledgeBase();
    return kb
      .filter(entry => entry.agent === agent)
      .sort((a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
  }

  /**
   * Get knowledge by project
   */
  static getByProject(projectId: string): KnowledgeEntry[] {
    const kb = getKnowledgeBase();
    return kb
      .filter(entry => entry.project_id === projectId)
      .sort((a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
  }

  /**
   * Get all topics
   */
  static getAllTopics(): string[] {
    const kb = getKnowledgeBase();
    const topics = new Set(kb.map(entry => entry.topic));
    return Array.from(topics).sort();
  }

  /**
   * Get all tags
   */
  static getAllTags(): string[] {
    const kb = getKnowledgeBase();
    const tags = new Set<string>();
    kb.forEach(entry => entry.tags.forEach(tag => tags.add(tag)));
    return Array.from(tags).sort();
  }

  /**
   * Get knowledge statistics
   */
  static getStats(): {
    total: number;
    verified: number;
    byType: Record<KnowledgeEntry['type'], number>;
    byAgent: Record<string, number>;
    mostUsed: KnowledgeEntry[];
    recentlyAdded: KnowledgeEntry[];
  } {
    const kb = getKnowledgeBase();

    const byType: Record<string, number> = {};
    const byAgent: Record<string, number> = {};

    kb.forEach(entry => {
      byType[entry.type] = (byType[entry.type] || 0) + 1;
      byAgent[entry.agent] = (byAgent[entry.agent] || 0) + 1;
    });

    const mostUsed = kb
      .filter(e => e.usageCount && e.usageCount > 0)
      .sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0))
      .slice(0, 10);

    const recentlyAdded = kb
      .sort((a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      )
      .slice(0, 10);

    return {
      total: kb.length,
      verified: kb.filter(e => e.verified).length,
      byType: byType as Record<KnowledgeEntry['type'], number>,
      byAgent,
      mostUsed,
      recentlyAdded,
    };
  }

  /**
   * Clear all knowledge
   */
  static clearAll(): void {
    if (!isBrowser()) return;
    localStorage.removeItem(STORAGE_KEY);
  }

  /**
   * Export knowledge base
   */
  static export(): string {
    const kb = getKnowledgeBase();
    return JSON.stringify(kb, null, 2);
  }

  /**
   * Import knowledge base
   */
  static import(jsonData: string): { success: boolean; count: number; error?: string } {
    try {
      const entries = JSON.parse(jsonData) as KnowledgeEntry[];

      if (!Array.isArray(entries)) {
        return { success: false, count: 0, error: 'Invalid format: not an array' };
      }

      const kb = getKnowledgeBase();
      const imported = entries.filter(entry =>
        entry.id && entry.agent && entry.topic && entry.content
      );

      saveKnowledgeBase([...kb, ...imported]);

      return { success: true, count: imported.length };
    } catch (error) {
      return {
        success: false,
        count: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}
