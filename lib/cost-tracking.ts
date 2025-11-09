/**
 * Cost tracking and analytics for AI API usage
 * Tracks token usage, costs, and generates insights
 */

/**
 * AI model pricing (as of 2024)
 * Prices per million tokens
 */
const MODEL_PRICING = {
  'claude-3-5-sonnet-20241022': {
    input: 3.0, // $3 per million input tokens
    output: 15.0, // $15 per million output tokens
  },
  'claude-3-5-haiku-20241022': {
    input: 0.8, // $0.80 per million input tokens
    output: 4.0, // $4 per million output tokens
  },
  'claude-3-opus-20240229': {
    input: 15.0,
    output: 75.0,
  },
} as const;

/**
 * API call record
 */
export interface APICallRecord {
  call_id: string;
  timestamp: string;
  agent_id: string;
  model: string;
  tokens_input: number;
  tokens_output: number;
  tokens_total: number;
  cost_usd: number;
  task_id?: string;
  operation: string;
  duration_ms?: number;
  success: boolean;
  error?: string;
}

/**
 * Cost statistics
 */
export interface CostStats {
  total_calls: number;
  total_tokens: number;
  total_cost_usd: number;
  avg_tokens_per_call: number;
  avg_cost_per_call: number;
  by_agent: Record<string, AgentCostStats>;
  by_model: Record<string, ModelCostStats>;
  failed_calls: number;
}

export interface AgentCostStats {
  agent_id: string;
  total_calls: number;
  total_tokens: number;
  total_cost_usd: number;
  failed_calls: number;
}

export interface ModelCostStats {
  model: string;
  total_calls: number;
  total_tokens: number;
  total_cost_usd: number;
}

/**
 * Cost tracking class
 */
class CostTrackerClass {
  private records: APICallRecord[];
  private maxRecords: number;

  constructor(maxRecords: number = 10000) {
    this.records = [];
    this.maxRecords = maxRecords;
    this.loadFromStorage();
  }

  /**
   * Calculate cost for a model and token usage
   */
  calculateCost(
    model: string,
    inputTokens: number,
    outputTokens: number
  ): number {
    const pricing = MODEL_PRICING[model as keyof typeof MODEL_PRICING];

    if (!pricing) {
      console.warn(`Unknown model pricing: ${model}, using default rates`);
      return ((inputTokens * 3.0) + (outputTokens * 15.0)) / 1_000_000;
    }

    const inputCost = (inputTokens * pricing.input) / 1_000_000;
    const outputCost = (outputTokens * pricing.output) / 1_000_000;

    return inputCost + outputCost;
  }

  /**
   * Track an API call
   */
  trackAPICall(params: {
    agent_id: string;
    model: string;
    tokens_input: number;
    tokens_output: number;
    task_id?: string;
    operation: string;
    duration_ms?: number;
    success?: boolean;
    error?: string;
  }): APICallRecord {
    const totalTokens = params.tokens_input + params.tokens_output;
    const cost = this.calculateCost(
      params.model,
      params.tokens_input,
      params.tokens_output
    );

    const record: APICallRecord = {
      call_id: this.generateCallId(),
      timestamp: new Date().toISOString(),
      agent_id: params.agent_id,
      model: params.model,
      tokens_input: params.tokens_input,
      tokens_output: params.tokens_output,
      tokens_total: totalTokens,
      cost_usd: cost,
      task_id: params.task_id,
      operation: params.operation,
      duration_ms: params.duration_ms,
      success: params.success !== false,
      error: params.error,
    };

    this.addRecord(record);

    // Log expensive calls
    if (cost > 0.10) {
      console.warn(
        `💰 Expensive API call: $${cost.toFixed(4)} (${totalTokens.toLocaleString()} tokens) - ${params.operation}`
      );
    }

    return record;
  }

  /**
   * Generate unique call ID
   */
  private generateCallId(): string {
    return `call-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }

  /**
   * Add record to history
   */
  private addRecord(record: APICallRecord): void {
    this.records.push(record);

    // Keep records size under control
    if (this.records.length > this.maxRecords) {
      this.records.shift();
    }

    // Persist to storage
    this.saveToStorage();
  }

  /**
   * Get all records with optional filtering
   */
  getRecords(filter?: {
    agent_id?: string;
    task_id?: string;
    model?: string;
    success?: boolean;
    from_date?: string;
    to_date?: string;
    limit?: number;
  }): APICallRecord[] {
    let filtered = [...this.records];

    if (filter?.agent_id) {
      filtered = filtered.filter((r) => r.agent_id === filter.agent_id);
    }

    if (filter?.task_id) {
      filtered = filtered.filter((r) => r.task_id === filter.task_id);
    }

    if (filter?.model) {
      filtered = filtered.filter((r) => r.model === filter.model);
    }

    if (filter?.success !== undefined) {
      filtered = filtered.filter((r) => r.success === filter.success);
    }

    if (filter?.from_date) {
      filtered = filtered.filter((r) => r.timestamp >= filter.from_date!);
    }

    if (filter?.to_date) {
      filtered = filtered.filter((r) => r.timestamp <= filter.to_date!);
    }

    if (filter?.limit) {
      filtered = filtered.slice(-filter.limit);
    }

    return filtered.reverse();
  }

  /**
   * Get cost statistics
   */
  getStats(filter?: {
    agent_id?: string;
    from_date?: string;
    to_date?: string;
  }): CostStats {
    const records = this.getRecords(filter);

    const totalCalls = records.length;
    const totalTokens = records.reduce((sum, r) => sum + r.tokens_total, 0);
    const totalCost = records.reduce((sum, r) => sum + r.cost_usd, 0);
    const failedCalls = records.filter((r) => !r.success).length;

    // By agent
    const byAgent: Record<string, AgentCostStats> = {};
    records.forEach((record) => {
      if (!byAgent[record.agent_id]) {
        byAgent[record.agent_id] = {
          agent_id: record.agent_id,
          total_calls: 0,
          total_tokens: 0,
          total_cost_usd: 0,
          failed_calls: 0,
        };
      }

      const agentStats = byAgent[record.agent_id];
      agentStats.total_calls++;
      agentStats.total_tokens += record.tokens_total;
      agentStats.total_cost_usd += record.cost_usd;
      if (!record.success) agentStats.failed_calls++;
    });

    // By model
    const byModel: Record<string, ModelCostStats> = {};
    records.forEach((record) => {
      if (!byModel[record.model]) {
        byModel[record.model] = {
          model: record.model,
          total_calls: 0,
          total_tokens: 0,
          total_cost_usd: 0,
        };
      }

      const modelStats = byModel[record.model];
      modelStats.total_calls++;
      modelStats.total_tokens += record.tokens_total;
      modelStats.total_cost_usd += record.cost_usd;
    });

    return {
      total_calls: totalCalls,
      total_tokens: totalTokens,
      total_cost_usd: totalCost,
      avg_tokens_per_call: totalCalls > 0 ? totalTokens / totalCalls : 0,
      avg_cost_per_call: totalCalls > 0 ? totalCost / totalCalls : 0,
      by_agent: byAgent,
      by_model: byModel,
      failed_calls: failedCalls,
    };
  }

  /**
   * Get most expensive operations
   */
  getMostExpensive(limit: number = 10): APICallRecord[] {
    return [...this.records]
      .sort((a, b) => b.cost_usd - a.cost_usd)
      .slice(0, limit);
  }

  /**
   * Get cost trend over time (daily aggregation)
   */
  getCostTrend(days: number = 7): Array<{
    date: string;
    total_cost: number;
    total_tokens: number;
    total_calls: number;
  }> {
    const now = new Date();
    const trends: Record<string, any> = {};

    // Initialize all days
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      trends[dateStr] = {
        date: dateStr,
        total_cost: 0,
        total_tokens: 0,
        total_calls: 0,
      };
    }

    // Aggregate data
    this.records.forEach((record) => {
      const dateStr = record.timestamp.split('T')[0];
      if (trends[dateStr]) {
        trends[dateStr].total_cost += record.cost_usd;
        trends[dateStr].total_tokens += record.tokens_total;
        trends[dateStr].total_calls++;
      }
    });

    return Object.values(trends);
  }

  /**
   * Clear all records
   */
  clearRecords(): void {
    this.records = [];
    this.saveToStorage();
  }

  /**
   * Save to localStorage
   */
  private saveToStorage(): void {
    if (typeof window === 'undefined') return;

    try {
      localStorage.setItem('maestro:cost_records', JSON.stringify(this.records));
    } catch (error) {
      console.error('Failed to save cost records:', error);
    }
  }

  /**
   * Load from localStorage
   */
  private loadFromStorage(): void {
    if (typeof window === 'undefined') return;

    try {
      const data = localStorage.getItem('maestro:cost_records');
      if (data) {
        this.records = JSON.parse(data);
      }
    } catch (error) {
      console.error('Failed to load cost records:', error);
    }
  }

  /**
   * Export records as CSV
   */
  exportCSV(): string {
    const headers = [
      'Call ID',
      'Timestamp',
      'Agent ID',
      'Model',
      'Input Tokens',
      'Output Tokens',
      'Total Tokens',
      'Cost USD',
      'Operation',
      'Success',
    ];

    const rows = this.records.map((r) => [
      r.call_id,
      r.timestamp,
      r.agent_id,
      r.model,
      r.tokens_input,
      r.tokens_output,
      r.tokens_total,
      r.cost_usd.toFixed(6),
      r.operation,
      r.success,
    ]);

    return [headers, ...rows].map((row) => row.join(',')).join('\n');
  }
}

/**
 * Singleton instance
 */
export const CostTracker = new CostTrackerClass();

/**
 * Helper function to track API calls
 */
export function trackAPICall(
  agentId: string,
  model: string,
  inputTokens: number,
  outputTokens: number,
  operation: string,
  options?: {
    taskId?: string;
    durationMs?: number;
    success?: boolean;
    error?: string;
  }
): APICallRecord {
  return CostTracker.trackAPICall({
    agent_id: agentId,
    model,
    tokens_input: inputTokens,
    tokens_output: outputTokens,
    operation,
    task_id: options?.taskId,
    duration_ms: options?.durationMs,
    success: options?.success,
    error: options?.error,
  });
}
