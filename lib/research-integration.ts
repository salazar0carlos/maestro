/**
 * Research Integration
 * Triggers Research Agent when ProductImprovementAgent encounters unfamiliar patterns
 */

import { EventBus } from './event-system';

export interface ResearchRequest {
  topic: string;
  context: any;
  trigger_reason: string;
  improvement_id?: string;
  project_id: string;
}

export interface ResearchResult {
  request_id: string;
  topic: string;
  research: any;
  cached: boolean;
  timestamp: string;
}

/**
 * Research Integration Service
 * Connects ProductImprovementAgent with Research Agent
 */
export class ResearchIntegrationService {
  private pendingRequests: Map<string, ResearchRequest>;
  private researchResults: Map<string, ResearchResult>;

  constructor() {
    this.pendingRequests = new Map();
    this.researchResults = new Map();
    this.setupEventListeners();
  }

  /**
   * Setup event listeners for research completion
   */
  private setupEventListeners(): void {
    // Listen for research completion events
    EventBus.on('research_complete', (data: any) => {
      this.handleResearchComplete(data);
    });

    EventBus.on('research_error', (data: any) => {
      this.handleResearchError(data);
    });
  }

  /**
   * Request research on unfamiliar pattern
   */
  async requestResearch(request: ResearchRequest): Promise<string> {
    const requestId = this.generateRequestId();

    console.log(`🔬 Requesting research: ${request.topic}`);

    // Store pending request
    this.pendingRequests.set(requestId, request);

    // Emit research request event
    await EventBus.emit('research_needed', {
      topic: request.topic,
      context: {
        type: 'unfamiliar-pattern',
        ...request.context,
        trigger_reason: request.trigger_reason,
        improvement_id: request.improvement_id,
        project_id: request.project_id,
      },
      requestedBy: 'product-improvement-agent',
      requestId: requestId,
      priority: 'normal',
    });

    return requestId;
  }

  /**
   * Request immediate research (bypass queue)
   */
  async requestImmediateResearch(request: ResearchRequest): Promise<string> {
    const requestId = this.generateRequestId();

    console.log(`🔬⚡ Requesting immediate research: ${request.topic}`);

    // Store pending request
    this.pendingRequests.set(requestId, request);

    // Emit immediate research request event
    await EventBus.emit('research_immediate', {
      topic: request.topic,
      context: {
        type: 'unfamiliar-pattern',
        ...request.context,
        trigger_reason: request.trigger_reason,
        improvement_id: request.improvement_id,
        project_id: request.project_id,
      },
      requestedBy: 'product-improvement-agent',
      requestId: requestId,
    });

    return requestId;
  }

  /**
   * Handle research completion
   */
  private handleResearchComplete(data: any): void {
    const { requestId, topic, research, cached } = data;

    console.log(`✓ Research complete: ${topic} (cached: ${cached})`);

    const result: ResearchResult = {
      request_id: requestId,
      topic,
      research,
      cached,
      timestamp: new Date().toISOString(),
    };

    // Store result
    this.researchResults.set(requestId, result);

    // Remove from pending
    this.pendingRequests.delete(requestId);

    // Emit custom event for ProductImprovementAgent
    EventBus.emit('research.completed', result);
  }

  /**
   * Handle research error
   */
  private handleResearchError(data: any): void {
    const { requestId, error } = data;

    console.error(`❌ Research error for ${requestId}:`, error);

    // Remove from pending
    this.pendingRequests.delete(requestId);

    // Emit error event
    EventBus.emit('research.failed', {
      request_id: requestId,
      error,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Get research result
   */
  getResult(requestId: string): ResearchResult | null {
    return this.researchResults.get(requestId) || null;
  }

  /**
   * Wait for research to complete (with timeout)
   */
  async waitForResearch(requestId: string, timeoutMs: number = 30000): Promise<ResearchResult | null> {
    return new Promise((resolve) => {
      const startTime = Date.now();

      const checkInterval = setInterval(() => {
        const result = this.researchResults.get(requestId);

        if (result) {
          clearInterval(checkInterval);
          resolve(result);
          return;
        }

        if (Date.now() - startTime > timeoutMs) {
          clearInterval(checkInterval);
          console.warn(`⚠️ Research timeout for ${requestId}`);
          resolve(null);
        }
      }, 100);
    });
  }

  /**
   * Check if pattern should trigger research
   */
  shouldTriggerResearch(
    _patternName: string,
    confidence: number,
    matchCount: number
  ): boolean {
    // Trigger research if:
    // 1. No pattern matches found
    // 2. Low confidence match (< 0.4)
    // 3. Conflicting patterns (multiple matches with similar confidence)

    if (matchCount === 0) {
      return true; // No known patterns
    }

    if (confidence < 0.4) {
      return true; // Low confidence
    }

    return false;
  }

  /**
   * Generate research topic from pattern
   */
  generateResearchTopic(patternName: string, _codeContext: string): string {
    // Extract key terms from pattern name
    const terms = patternName
      .split(/[-_\s]+/)
      .filter(t => t.length > 3)
      .join(' ');

    return `Best practices for ${terms} in modern software development`;
  }

  /**
   * Get pending research requests
   */
  getPendingRequests(): ResearchRequest[] {
    return Array.from(this.pendingRequests.values());
  }

  /**
   * Get completed research count
   */
  getCompletedCount(): number {
    return this.researchResults.size;
  }

  /**
   * Clear old results (cleanup)
   */
  clearOldResults(maxAge: number = 3600000): void {
    const now = Date.now();

    for (const [requestId, result] of this.researchResults.entries()) {
      const resultTime = new Date(result.timestamp).getTime();

      if (now - resultTime > maxAge) {
        this.researchResults.delete(requestId);
      }
    }
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `research-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }

  /**
   * Get statistics
   */
  getStats(): {
    pending_requests: number;
    completed_requests: number;
    cached_results: number;
  } {
    const cachedCount = Array.from(this.researchResults.values()).filter(
      r => r.cached
    ).length;

    return {
      pending_requests: this.pendingRequests.size,
      completed_requests: this.researchResults.size,
      cached_results: cachedCount,
    };
  }
}

// Singleton instance
let researchIntegrationInstance: ResearchIntegrationService | null = null;

export function getResearchIntegration(): ResearchIntegrationService {
  if (!researchIntegrationInstance) {
    researchIntegrationInstance = new ResearchIntegrationService();
  }
  return researchIntegrationInstance;
}
