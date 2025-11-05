/**
 * Integration Health Monitor for Maestro
 * Monitors health and status of all integrations
 *
 * Features:
 * - GitHub API health monitoring
 * - Rate limit tracking
 * - Agent communication health
 * - Knowledge base health
 * - Overall system status
 */

import { GitHubIntegration } from './github-integration';
import { AgentCommunication } from './agent-communication';
import { KnowledgeBase } from './knowledge-base';

export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy' | 'offline';

export interface IntegrationHealth {
  integration: string;
  status: HealthStatus;
  message?: string;
  details?: Record<string, any>;
  last_check: string;
  last_success?: string;
  error_rate?: number;
  response_time?: number;
}

export interface GitHubHealth extends IntegrationHealth {
  integration: 'github';
  details: {
    rate_limit_remaining?: number;
    rate_limit_limit?: number;
    rate_limit_reset?: string;
    authenticated?: boolean;
    repo_accessible?: boolean;
  };
}

export interface AgentCommHealth extends IntegrationHealth {
  integration: 'agent_communication';
  details: {
    total_messages: number;
    unread_messages: number;
    agents_active: number;
    last_message_time?: string;
  };
}

export interface KnowledgeBaseHealth extends IntegrationHealth {
  integration: 'knowledge_base';
  details: {
    total_entries: number;
    verified_entries: number;
    storage_size?: number;
    last_update?: string;
  };
}

export interface SystemHealth {
  overall_status: HealthStatus;
  timestamp: string;
  integrations: (GitHubHealth | AgentCommHealth | KnowledgeBaseHealth)[];
  summary: {
    healthy: number;
    degraded: number;
    unhealthy: number;
    offline: number;
  };
}

const HEALTH_STORAGE_KEY = 'maestro:integration-health';
const CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes

/**
 * Check if we're in browser environment
 */
function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

/**
 * Get cached health data
 */
function getCachedHealth(): SystemHealth | null {
  if (!isBrowser()) return null;

  try {
    const data = localStorage.getItem(HEALTH_STORAGE_KEY);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

/**
 * Cache health data
 */
function cacheHealth(health: SystemHealth): void {
  if (!isBrowser()) return;

  try {
    localStorage.setItem(HEALTH_STORAGE_KEY, JSON.stringify(health));
  } catch (error) {
    console.error('Failed to cache health data:', error);
  }
}

export class IntegrationHealth {
  /**
   * Check GitHub integration health
   */
  static async checkGitHub(): Promise<GitHubHealth> {
    const baseHealth: GitHubHealth = {
      integration: 'github',
      status: 'offline',
      last_check: new Date().toISOString(),
      details: {},
    };

    try {
      // Check if GitHub token is configured
      if (!process.env.GITHUB_TOKEN) {
        return {
          ...baseHealth,
          status: 'offline',
          message: 'GitHub token not configured',
          details: {
            authenticated: false,
          },
        };
      }

      const github = GitHubIntegration.fromEnv();

      if (!github) {
        return {
          ...baseHealth,
          status: 'offline',
          message: 'GitHub integration not configured',
        };
      }

      // Check rate limit
      const startTime = Date.now();
      const rateLimit = await github.getRateLimit();
      const responseTime = Date.now() - startTime;

      const status: HealthStatus =
        rateLimit.remaining > 100 ? 'healthy' :
        rateLimit.remaining > 10 ? 'degraded' : 'unhealthy';

      return {
        integration: 'github',
        status,
        message: `${rateLimit.remaining}/${rateLimit.limit} requests remaining`,
        details: {
          rate_limit_remaining: rateLimit.remaining,
          rate_limit_limit: rateLimit.limit,
          rate_limit_reset: rateLimit.reset.toISOString(),
          authenticated: true,
          repo_accessible: true,
        },
        last_check: new Date().toISOString(),
        last_success: new Date().toISOString(),
        response_time: responseTime,
      };
    } catch (error) {
      return {
        ...baseHealth,
        status: 'unhealthy',
        message: error instanceof Error ? error.message : 'Unknown error',
        details: {
          authenticated: false,
        },
      };
    }
  }

  /**
   * Check Agent Communication health
   */
  static async checkAgentCommunication(): Promise<AgentCommHealth> {
    try {
      const stats = AgentCommunication.getStats();
      const recentMessages = AgentCommunication.getRecentMessages(1);

      const status: HealthStatus = 'healthy';

      return {
        integration: 'agent_communication',
        status,
        message: `${stats.total} messages, ${stats.unread} unread`,
        details: {
          total_messages: stats.total,
          unread_messages: stats.unread,
          agents_active: Object.keys(stats.byAgent).length,
          last_message_time: recentMessages.length > 0
            ? recentMessages[0].timestamp
            : undefined,
        },
        last_check: new Date().toISOString(),
        last_success: new Date().toISOString(),
      };
    } catch (error) {
      return {
        integration: 'agent_communication',
        status: 'unhealthy',
        message: error instanceof Error ? error.message : 'Unknown error',
        details: {
          total_messages: 0,
          unread_messages: 0,
          agents_active: 0,
        },
        last_check: new Date().toISOString(),
      };
    }
  }

  /**
   * Check Knowledge Base health
   */
  static async checkKnowledgeBase(): Promise<KnowledgeBaseHealth> {
    try {
      const stats = KnowledgeBase.getStats();

      // Estimate storage size
      const exportData = KnowledgeBase.export();
      const storageSize = new Blob([exportData]).size;

      const status: HealthStatus =
        storageSize < 4.5 * 1024 * 1024 ? 'healthy' : 'degraded'; // 4.5MB threshold

      return {
        integration: 'knowledge_base',
        status,
        message: `${stats.total} entries (${stats.verified} verified)`,
        details: {
          total_entries: stats.total,
          verified_entries: stats.verified,
          storage_size: storageSize,
          last_update: stats.recentlyAdded.length > 0
            ? stats.recentlyAdded[0].timestamp
            : undefined,
        },
        last_check: new Date().toISOString(),
        last_success: new Date().toISOString(),
      };
    } catch (error) {
      return {
        integration: 'knowledge_base',
        status: 'unhealthy',
        message: error instanceof Error ? error.message : 'Unknown error',
        details: {
          total_entries: 0,
          verified_entries: 0,
        },
        last_check: new Date().toISOString(),
      };
    }
  }

  /**
   * Check all integrations
   */
  static async checkAll(useCache = true): Promise<SystemHealth> {
    // Check cache first
    if (useCache) {
      const cached = getCachedHealth();
      if (cached) {
        const cacheAge = Date.now() - new Date(cached.timestamp).getTime();
        if (cacheAge < CHECK_INTERVAL) {
          return cached;
        }
      }
    }

    // Run all health checks in parallel
    const [github, agentComm, knowledgeBase] = await Promise.all([
      this.checkGitHub(),
      this.checkAgentCommunication(),
      this.checkKnowledgeBase(),
    ]);

    const integrations = [github, agentComm, knowledgeBase];

    // Calculate summary
    const summary = {
      healthy: integrations.filter(i => i.status === 'healthy').length,
      degraded: integrations.filter(i => i.status === 'degraded').length,
      unhealthy: integrations.filter(i => i.status === 'unhealthy').length,
      offline: integrations.filter(i => i.status === 'offline').length,
    };

    // Determine overall status
    let overall_status: HealthStatus = 'healthy';
    if (summary.offline > 0 || summary.unhealthy > 0) {
      overall_status = 'unhealthy';
    } else if (summary.degraded > 0) {
      overall_status = 'degraded';
    }

    const health: SystemHealth = {
      overall_status,
      timestamp: new Date().toISOString(),
      integrations,
      summary,
    };

    // Cache the results
    cacheHealth(health);

    return health;
  }

  /**
   * Get integration status by name
   */
  static async getIntegrationStatus(
    name: 'github' | 'agent_communication' | 'knowledge_base'
  ): Promise<IntegrationHealth> {
    switch (name) {
      case 'github':
        return this.checkGitHub();
      case 'agent_communication':
        return this.checkAgentCommunication();
      case 'knowledge_base':
        return this.checkKnowledgeBase();
    }
  }

  /**
   * Start periodic health monitoring
   */
  static startMonitoring(interval: number = CHECK_INTERVAL): () => void {
    if (!isBrowser()) {
      console.warn('Health monitoring only available in browser');
      return () => {};
    }

    console.log(`[HealthMonitor] Starting health monitoring (every ${interval / 1000}s)`);

    // Initial check
    this.checkAll(false);

    // Periodic checks
    const intervalId = setInterval(() => {
      this.checkAll(false).then(health => {
        console.log(`[HealthMonitor] Status: ${health.overall_status}`);

        // Log any issues
        health.integrations.forEach(integration => {
          if (integration.status !== 'healthy') {
            console.warn(
              `[HealthMonitor] ${integration.integration}: ${integration.status} - ${integration.message}`
            );
          }
        });
      });
    }, interval);

    // Return cleanup function
    return () => {
      clearInterval(intervalId);
      console.log('[HealthMonitor] Stopped health monitoring');
    };
  }

  /**
   * Get health history (if stored)
   */
  static getHistory(): SystemHealth[] {
    if (!isBrowser()) return [];

    try {
      const data = localStorage.getItem('maestro:health-history');
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  /**
   * Record health check in history
   */
  static recordHistory(health: SystemHealth): void {
    if (!isBrowser()) return;

    try {
      const history = this.getHistory();
      history.push(health);

      // Keep last 100 entries
      const trimmed = history.slice(-100);

      localStorage.setItem('maestro:health-history', JSON.stringify(trimmed));
    } catch (error) {
      console.error('Failed to record health history:', error);
    }
  }

  /**
   * Get uptime percentage for integration
   */
  static getUptime(integrationName: string, hours: number = 24): number {
    const history = this.getHistory();
    const cutoff = new Date();
    cutoff.setHours(cutoff.getHours() - hours);

    const relevantChecks = history.filter(
      h => new Date(h.timestamp) > cutoff
    );

    if (relevantChecks.length === 0) return 100;

    const healthyChecks = relevantChecks.filter(h => {
      const integration = h.integrations.find(i => i.integration === integrationName);
      return integration && integration.status === 'healthy';
    });

    return (healthyChecks.length / relevantChecks.length) * 100;
  }

  /**
   * Clear health cache
   */
  static clearCache(): void {
    if (!isBrowser()) return;
    localStorage.removeItem(HEALTH_STORAGE_KEY);
  }

  /**
   * Clear health history
   */
  static clearHistory(): void {
    if (!isBrowser()) return;
    localStorage.removeItem('maestro:health-history');
  }
}
