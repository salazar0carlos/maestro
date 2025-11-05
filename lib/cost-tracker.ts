/**
 * Cost Tracking System
 * Monitors and tracks costs across all webhook calls, API usage, and agent executions
 */

import {
  CostTrackingEvent,
  CostSummary,
} from './webhook-types';

const STORAGE_KEY = 'maestro:cost-tracking';
const ALERT_THRESHOLD_KEY = 'maestro:cost-alert-threshold';

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
  return `cost-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Get cost events from storage
 */
function getEvents(): CostTrackingEvent[] {
  if (!isBrowser()) return [];
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

/**
 * Save cost events to storage
 */
function saveEvents(events: CostTrackingEvent[]): void {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
  } catch (error) {
    console.error('Failed to save cost events:', error);
  }
}

/**
 * Get alert threshold
 */
function getAlertThreshold(): number {
  if (!isBrowser()) return 100; // Default $100
  try {
    const data = localStorage.getItem(ALERT_THRESHOLD_KEY);
    return data ? parseFloat(data) : 100;
  } catch {
    return 100;
  }
}

/**
 * Save alert threshold
 */
function saveAlertThreshold(threshold: number): void {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(ALERT_THRESHOLD_KEY, threshold.toString());
  } catch (error) {
    console.error('Failed to save alert threshold:', error);
  }
}

/**
 * Pricing for various services (USD)
 */
const PRICING = {
  anthropic: {
    // Claude 3.5 Haiku (cost-efficient)
    'claude-3-5-haiku-20241022': {
      input: 0.80 / 1_000_000, // $0.80 per million tokens
      output: 4.00 / 1_000_000, // $4.00 per million tokens
    },
    // Claude 3.5 Sonnet
    'claude-3-5-sonnet-20241022': {
      input: 3.00 / 1_000_000,
      output: 15.00 / 1_000_000,
    },
  },
  github: {
    api_call: 0.00001, // Nominal cost per API call
  },
  webhook: {
    delivery: 0.000001, // Nominal cost per webhook delivery
  },
};

export class CostTracker {
  /**
   * Track a cost event
   */
  static trackEvent(
    event: Omit<CostTrackingEvent, 'id' | 'timestamp'>
  ): CostTrackingEvent {
    const costEvent: CostTrackingEvent = {
      id: generateId(),
      timestamp: new Date().toISOString(),
      ...event,
    };

    const events = getEvents();
    events.push(costEvent);
    saveEvents(events);

    // Check if threshold exceeded
    this.checkThreshold();

    return costEvent;
  }

  /**
   * Track webhook delivery
   */
  static trackWebhook(agentId: string, agentName: string): void {
    this.trackEvent({
      event_type: 'webhook',
      agent_id: agentId,
      agent_name: agentName,
      cost_usd: PRICING.webhook.delivery,
      details: {},
    });
  }

  /**
   * Track API call
   */
  static trackAPICall(
    provider: 'anthropic' | 'github',
    endpoint: string,
    details: {
      tokens_used?: number;
      model?: string;
      duration_ms?: number;
    } = {}
  ): void {
    let cost = 0;

    if (provider === 'anthropic' && details.model && details.tokens_used) {
      const pricing = PRICING.anthropic[details.model as keyof typeof PRICING.anthropic];
      if (pricing) {
        // Estimate input/output split (60/40)
        const inputTokens = Math.floor(details.tokens_used * 0.6);
        const outputTokens = Math.floor(details.tokens_used * 0.4);
        cost = (inputTokens * pricing.input) + (outputTokens * pricing.output);
      }
    } else if (provider === 'github') {
      cost = PRICING.github.api_call;
    }

    this.trackEvent({
      event_type: 'api_call',
      cost_usd: cost,
      details: {
        provider,
        endpoint,
        ...details,
      },
    });
  }

  /**
   * Track agent execution
   */
  static trackAgentExecution(
    agentId: string,
    agentName: string,
    cost: number,
    taskId?: string,
    projectId?: string
  ): void {
    this.trackEvent({
      event_type: 'agent_execution',
      agent_id: agentId,
      agent_name: agentName,
      cost_usd: cost,
      details: {},
      task_id: taskId,
      project_id: projectId,
    });
  }

  /**
   * Get all cost events
   */
  static getAllEvents(): CostTrackingEvent[] {
    return getEvents();
  }

  /**
   * Get cost summary for a period
   */
  static getSummary(
    startDate?: Date,
    endDate?: Date
  ): CostSummary {
    const events = getEvents();
    const start = startDate || new Date(0);
    const end = endDate || new Date();

    const filtered = events.filter(e => {
      const eventDate = new Date(e.timestamp);
      return eventDate >= start && eventDate <= end;
    });

    const summary: CostSummary = {
      total_cost: 0,
      period_start: start.toISOString(),
      period_end: end.toISOString(),
      by_agent: {},
      by_provider: {},
      by_event_type: {},
      webhook_count: 0,
      api_call_count: 0,
      agent_execution_count: 0,
    };

    filtered.forEach(event => {
      summary.total_cost += event.cost_usd;

      // By agent
      if (event.agent_name) {
        summary.by_agent[event.agent_name] =
          (summary.by_agent[event.agent_name] || 0) + event.cost_usd;
      }

      // By provider
      if (event.details.provider) {
        summary.by_provider[event.details.provider] =
          (summary.by_provider[event.details.provider] || 0) + event.cost_usd;
      }

      // By event type
      summary.by_event_type[event.event_type] =
        (summary.by_event_type[event.event_type] || 0) + event.cost_usd;

      // Count by type
      if (event.event_type === 'webhook') {
        summary.webhook_count++;
      } else if (event.event_type === 'api_call') {
        summary.api_call_count++;
      } else if (event.event_type === 'agent_execution') {
        summary.agent_execution_count++;
      }
    });

    return summary;
  }

  /**
   * Get current month summary
   */
  static getCurrentMonthSummary(): CostSummary {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    return this.getSummary(start, end);
  }

  /**
   * Get today's summary
   */
  static getTodaySummary(): CostSummary {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const end = new Date(start);
    end.setDate(end.getDate() + 1);

    return this.getSummary(start, end);
  }

  /**
   * Get cost by project
   */
  static getCostByProject(projectId: string): number {
    const events = getEvents();
    return events
      .filter(e => e.project_id === projectId)
      .reduce((sum, e) => sum + e.cost_usd, 0);
  }

  /**
   * Get cost by task
   */
  static getCostByTask(taskId: string): number {
    const events = getEvents();
    return events
      .filter(e => e.task_id === taskId)
      .reduce((sum, e) => sum + e.cost_usd, 0);
  }

  /**
   * Set cost alert threshold
   */
  static setAlertThreshold(threshold: number): void {
    saveAlertThreshold(threshold);
    console.log(`[CostTracker] Alert threshold set to $${threshold}`);
  }

  /**
   * Get alert threshold
   */
  static getThreshold(): number {
    return getAlertThreshold();
  }

  /**
   * Check if costs exceed threshold
   */
  static checkThreshold(): boolean {
    const threshold = getAlertThreshold();
    const summary = this.getCurrentMonthSummary();

    if (summary.total_cost >= threshold) {
      console.warn(
        `[CostTracker] ⚠️  ALERT: Monthly costs ($${summary.total_cost.toFixed(2)}) ` +
        `exceed threshold ($${threshold})`
      );

      // Trigger webhook alert if configured
      if (typeof window !== 'undefined') {
        const event = new CustomEvent('maestro:cost-alert', {
          detail: { summary, threshold },
        });
        window.dispatchEvent(event);
      }

      return true;
    }

    return false;
  }

  /**
   * Get cost projection for end of month
   */
  static getMonthlyProjection(): {
    current: number;
    projected: number;
    days_elapsed: number;
    days_remaining: number;
  } {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const daysElapsed = Math.floor(
      (now.getTime() - monthStart.getTime()) / (1000 * 60 * 60 * 24)
    );
    const daysInMonth = monthEnd.getDate();
    const daysRemaining = daysInMonth - daysElapsed;

    const summary = this.getCurrentMonthSummary();
    const dailyAverage = daysElapsed > 0 ? summary.total_cost / daysElapsed : 0;
    const projected = dailyAverage * daysInMonth;

    return {
      current: summary.total_cost,
      projected,
      days_elapsed: daysElapsed,
      days_remaining: daysRemaining,
    };
  }

  /**
   * Clear old events
   */
  static clearOldEvents(daysOld: number): number {
    const events = getEvents();
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - daysOld);

    const filtered = events.filter(
      e => new Date(e.timestamp) > cutoff
    );

    const deletedCount = events.length - filtered.length;

    if (deletedCount > 0) {
      saveEvents(filtered);
      console.log(`[CostTracker] Cleared ${deletedCount} old events`);
    }

    return deletedCount;
  }

  /**
   * Export cost data
   */
  static export(): string {
    const events = getEvents();
    return JSON.stringify(events, null, 2);
  }

  /**
   * Clear all cost data
   */
  static clearAll(): void {
    if (!isBrowser()) return;
    localStorage.removeItem(STORAGE_KEY);
    console.log('[CostTracker] Cleared all cost data');
  }

  /**
   * Get recent high-cost events
   */
  static getHighCostEvents(threshold: number = 0.10, limit: number = 10): CostTrackingEvent[] {
    const events = getEvents();
    return events
      .filter(e => e.cost_usd >= threshold)
      .sort((a, b) => b.cost_usd - a.cost_usd)
      .slice(0, limit);
  }

  /**
   * Get cost trend (daily costs for last N days)
   */
  static getCostTrend(days: number = 30): Array<{ date: string; cost: number }> {
    const events = getEvents();
    const now = new Date();
    const trend: Array<{ date: string; cost: number }> = [];

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      const dayCost = events
        .filter(e => e.timestamp.startsWith(dateStr))
        .reduce((sum, e) => sum + e.cost_usd, 0);

      trend.push({ date: dateStr, cost: dayCost });
    }

    return trend;
  }
}
