/**
 * Context Sharing Protocol for Maestro
 * Enables agents to share knowledge and coordinate their work
 *
 * Use Cases:
 * - Backend Agent shares API endpoints with Frontend Agent
 * - Frontend Agent shares component patterns with other agents
 * - Product Improvement Agent shares findings with team
 * - Testing Agent shares test results with developers
 */

import {
  AgentCommunication,
  broadcastContextShare,
  ContextSharePayload,
} from './agent-communication';

export interface APIEndpoint {
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  params?: Record<string, string>;
  query?: Record<string, string>;
  body?: Record<string, any>;
  response: Record<string, any>;
  description?: string;
}

export interface ComponentPattern {
  name: string;
  type: 'component' | 'hook' | 'utility';
  path: string;
  props?: Record<string, string>;
  usage?: string;
  dependencies?: string[];
}

export interface Improvement {
  id: string;
  category: 'bug' | 'performance' | 'security' | 'ux' | 'code-quality';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  location?: string;
  suggestion?: string;
  estimatedEffort?: 'low' | 'medium' | 'high';
}

export interface TestResult {
  suite: string;
  passed: number;
  failed: number;
  skipped: number;
  duration: number;
  failures?: Array<{
    test: string;
    error: string;
  }>;
}

export interface DatabaseSchema {
  table: string;
  columns: Array<{
    name: string;
    type: string;
    nullable?: boolean;
    default?: any;
  }>;
  indexes?: string[];
  relations?: Array<{
    table: string;
    type: 'one-to-one' | 'one-to-many' | 'many-to-many';
  }>;
}

export class ContextSharing {
  /**
   * Backend Agent shares API endpoints
   */
  static shareAPIEndpoints(
    fromAgent: string,
    endpoints: APIEndpoint[]
  ): void {
    const payload: ContextSharePayload = {
      topic: 'api_endpoints',
      info: {
        endpoints: endpoints.map(e => ({
          path: e.path,
          method: e.method,
          params: e.params,
          query: e.query,
          body: e.body,
          response: e.response,
          description: e.description,
        })),
        timestamp: new Date().toISOString(),
      },
      tags: ['backend', 'api', 'endpoints'],
    };

    broadcastContextShare(fromAgent, payload);
    console.log(`[ContextShare] ${fromAgent} shared ${endpoints.length} API endpoints`);
  }

  /**
   * Frontend Agent shares component patterns
   */
  static shareComponentPatterns(
    fromAgent: string,
    patterns: ComponentPattern[]
  ): void {
    const payload: ContextSharePayload = {
      topic: 'component_patterns',
      info: {
        patterns: patterns.map(p => ({
          name: p.name,
          type: p.type,
          path: p.path,
          props: p.props,
          usage: p.usage,
          dependencies: p.dependencies,
        })),
        timestamp: new Date().toISOString(),
      },
      tags: ['frontend', 'components', 'patterns'],
    };

    broadcastContextShare(fromAgent, payload);
    console.log(`[ContextShare] ${fromAgent} shared ${patterns.length} component patterns`);
  }

  /**
   * Product Improvement Agent shares findings
   */
  static shareImprovements(
    fromAgent: string,
    improvements: Improvement[]
  ): void {
    const criticalCount = improvements.filter(i => i.severity === 'critical').length;
    const highCount = improvements.filter(i => i.severity === 'high').length;

    const payload: ContextSharePayload = {
      topic: 'improvements_found',
      info: {
        improvements,
        summary: {
          total: improvements.length,
          critical: criticalCount,
          high: highCount,
          medium: improvements.filter(i => i.severity === 'medium').length,
          low: improvements.filter(i => i.severity === 'low').length,
        },
        timestamp: new Date().toISOString(),
      },
      tags: ['improvements', 'quality', 'analysis'],
    };

    broadcastContextShare(fromAgent, payload);
    console.log(`[ContextShare] ${fromAgent} shared ${improvements.length} improvements`);
  }

  /**
   * Testing Agent shares test results
   */
  static shareTestResults(
    fromAgent: string,
    results: TestResult[]
  ): void {
    const totalPassed = results.reduce((sum, r) => sum + r.passed, 0);
    const totalFailed = results.reduce((sum, r) => sum + r.failed, 0);
    const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);

    const payload: ContextSharePayload = {
      topic: 'test_results',
      info: {
        results,
        summary: {
          suites: results.length,
          totalPassed,
          totalFailed,
          totalDuration,
          passed: totalFailed === 0,
        },
        timestamp: new Date().toISOString(),
      },
      tags: ['testing', 'quality', 'results'],
    };

    broadcastContextShare(fromAgent, payload);
    console.log(`[ContextShare] ${fromAgent} shared test results: ${totalPassed} passed, ${totalFailed} failed`);
  }

  /**
   * Database Agent shares schema information
   */
  static shareDatabaseSchema(
    fromAgent: string,
    schemas: DatabaseSchema[]
  ): void {
    const payload: ContextSharePayload = {
      topic: 'database_schema',
      info: {
        schemas,
        tableCount: schemas.length,
        timestamp: new Date().toISOString(),
      },
      tags: ['database', 'schema', 'backend'],
    };

    broadcastContextShare(fromAgent, payload);
    console.log(`[ContextShare] ${fromAgent} shared ${schemas.length} database schemas`);
  }

  /**
   * Share project structure
   */
  static shareProjectStructure(
    fromAgent: string,
    structure: {
      directories: string[];
      files: string[];
      technologies: string[];
      frameworks: string[];
    }
  ): void {
    const payload: ContextSharePayload = {
      topic: 'project_structure',
      info: {
        ...structure,
        timestamp: new Date().toISOString(),
      },
      tags: ['project', 'structure', 'architecture'],
    };

    broadcastContextShare(fromAgent, payload);
    console.log(`[ContextShare] ${fromAgent} shared project structure`);
  }

  /**
   * Share configuration changes
   */
  static shareConfigChanges(
    fromAgent: string,
    changes: Array<{
      file: string;
      setting: string;
      oldValue?: any;
      newValue: any;
      reason: string;
    }>
  ): void {
    const payload: ContextSharePayload = {
      topic: 'config_changes',
      info: {
        changes,
        timestamp: new Date().toISOString(),
      },
      tags: ['config', 'changes', 'settings'],
    };

    broadcastContextShare(fromAgent, payload);
    console.log(`[ContextShare] ${fromAgent} shared ${changes.length} config changes`);
  }

  /**
   * Share dependencies added/removed
   */
  static shareDependencyChanges(
    fromAgent: string,
    changes: {
      added?: Array<{ name: string; version: string; reason?: string }>;
      removed?: Array<{ name: string; reason?: string }>;
      updated?: Array<{ name: string; from: string; to: string; reason?: string }>;
    }
  ): void {
    const payload: ContextSharePayload = {
      topic: 'dependency_changes',
      info: {
        ...changes,
        timestamp: new Date().toISOString(),
      },
      tags: ['dependencies', 'packages', 'changes'],
    };

    broadcastContextShare(fromAgent, payload);
    console.log(`[ContextShare] ${fromAgent} shared dependency changes`);
  }

  /**
   * Share error/warning alerts
   */
  static shareAlert(
    fromAgent: string,
    alert: {
      severity: 'info' | 'warning' | 'error' | 'critical';
      title: string;
      message: string;
      location?: string;
      stackTrace?: string;
      suggestedAction?: string;
    }
  ): void {
    const payload: ContextSharePayload = {
      topic: 'alert',
      info: {
        ...alert,
        timestamp: new Date().toISOString(),
      },
      tags: ['alert', alert.severity],
    };

    broadcastContextShare(fromAgent, payload);
    console.log(`[ContextShare] ${fromAgent} shared ${alert.severity} alert: ${alert.title}`);
  }

  /**
   * Share code review feedback
   */
  static shareCodeReview(
    fromAgent: string,
    toAgent: string,
    review: {
      file: string;
      line?: number;
      type: 'suggestion' | 'issue' | 'question' | 'praise';
      message: string;
      code?: string;
      suggestedCode?: string;
    }
  ): void {
    const payload: ContextSharePayload = {
      topic: 'code_review',
      info: {
        ...review,
        timestamp: new Date().toISOString(),
      },
      tags: ['code-review', 'feedback', review.type],
    };

    AgentCommunication.sendMessage(
      fromAgent,
      toAgent,
      'context_share',
      payload,
      review.type === 'issue' ? 'high' : 'medium'
    );

    console.log(`[ContextShare] ${fromAgent} sent code review to ${toAgent}`);
  }

  /**
   * Get shared context by topic
   */
  static getSharedContext(topic: string): any[] {
    const messages = AgentCommunication.getMessagesByType('context_share');
    return messages
      .filter(m => m.payload.topic === topic)
      .map(m => ({
        from: m.from,
        info: m.payload.info,
        timestamp: m.timestamp,
      }))
      .sort((a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
  }

  /**
   * Get latest shared context by topic
   */
  static getLatestContext(topic: string): any | null {
    const contexts = this.getSharedContext(topic);
    return contexts.length > 0 ? contexts[0] : null;
  }

  /**
   * Get all shared contexts
   */
  static getAllSharedContexts(): Record<string, any[]> {
    const messages = AgentCommunication.getMessagesByType('context_share');
    const contexts: Record<string, any[]> = {};

    messages.forEach(m => {
      const topic = m.payload.topic;
      if (!contexts[topic]) {
        contexts[topic] = [];
      }
      contexts[topic].push({
        from: m.from,
        info: m.payload.info,
        timestamp: m.timestamp,
      });
    });

    return contexts;
  }
}
