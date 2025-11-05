/**
 * Webhook Types for Maestro Event-Driven Architecture
 * Enables distributed agent system with webhook communication
 */

export type WebhookEventType =
  | 'task.assigned'
  | 'task.updated'
  | 'task.completed'
  | 'task.failed'
  | 'github.push'
  | 'github.pull_request'
  | 'github.issue'
  | 'agent.wake'
  | 'agent.status'
  | 'cost.alert';

export type WebhookStatus = 'pending' | 'delivered' | 'failed' | 'retrying';

export interface WebhookPayload {
  event: WebhookEventType;
  timestamp: string;
  data: Record<string, any>;
  metadata?: {
    source?: string;
    triggeredBy?: string;
    priority?: 'low' | 'medium' | 'high' | 'critical';
  };
}

export interface WebhookDelivery {
  id: string;
  webhook_id: string;
  event: WebhookEventType;
  payload: WebhookPayload;
  target_url: string;
  status: WebhookStatus;
  attempts: number;
  max_attempts: number;
  last_attempt?: string;
  next_retry?: string;
  response?: {
    status: number;
    body?: any;
    error?: string;
  };
  created_at: string;
  delivered_at?: string;
}

export interface AgentWebhookConfig {
  agent_id: string;
  agent_name: string;
  webhook_url: string;
  secret: string;
  enabled: boolean;
  events: WebhookEventType[];
  retry_config?: {
    max_attempts: number;
    backoff_multiplier: number;
    initial_delay: number;
  };
  headers?: Record<string, string>;
  timeout?: number;
}

export interface GitHubWebhookPayload {
  action?: string;
  repository?: {
    name: string;
    full_name: string;
    owner: { login: string };
  };
  sender?: {
    login: string;
  };
  // Push event
  ref?: string;
  commits?: Array<{
    id: string;
    message: string;
    author: { name: string; email: string };
    modified: string[];
    added: string[];
    removed: string[];
  }>;
  // Pull request event
  pull_request?: {
    number: number;
    title: string;
    state: string;
    merged: boolean;
    head: { ref: string };
    base: { ref: string };
  };
  // Issue event
  issue?: {
    number: number;
    title: string;
    state: string;
    labels: Array<{ name: string }>;
  };
}

export interface CostTrackingEvent {
  id: string;
  event_type: 'webhook' | 'api_call' | 'agent_execution';
  timestamp: string;
  agent_id?: string;
  agent_name?: string;
  cost_usd: number;
  details: {
    provider?: 'anthropic' | 'openai' | 'github' | 'vercel';
    endpoint?: string;
    tokens_used?: number;
    model?: string;
    duration_ms?: number;
  };
  project_id?: string;
  task_id?: string;
}

export interface CostSummary {
  total_cost: number;
  period_start: string;
  period_end: string;
  by_agent: Record<string, number>;
  by_provider: Record<string, number>;
  by_event_type: Record<string, number>;
  webhook_count: number;
  api_call_count: number;
  agent_execution_count: number;
}

export interface WebhookSubscription {
  id: string;
  name: string;
  url: string;
  events: WebhookEventType[];
  secret: string;
  enabled: boolean;
  created_at: string;
  last_triggered?: string;
  success_count: number;
  failure_count: number;
}

export interface TaskExecutionRequest {
  task_id: string;
  task_title: string;
  task_description: string;
  ai_prompt: string;
  priority: number;
  project_id: string;
  metadata?: Record<string, any>;
}

export interface TaskExecutionResponse {
  success: boolean;
  task_id: string;
  result?: {
    files_changed?: string[];
    output?: string;
    summary?: string;
    cost_usd?: number;
  };
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  execution_time_ms?: number;
  timestamp: string;
}

export interface AgentStatusUpdate {
  agent_id: string;
  status: 'online' | 'offline' | 'busy' | 'idle';
  current_task_id?: string;
  last_seen: string;
  health: {
    cpu_percent?: number;
    memory_percent?: number;
    uptime_seconds?: number;
  };
  metadata?: Record<string, any>;
}
