/**
 * Core type definitions for Maestro orchestration platform
 */

export type ProjectStatus = 'active' | 'paused' | 'complete';
export type TaskStatus = 'todo' | 'in-progress' | 'done' | 'blocked';
export type AgentStatus = 'active' | 'idle' | 'offline';
export type TaskPriority = 1 | 2 | 3 | 4 | 5;

/**
 * Project representing an autonomous app being built by agents
 */
export interface Project {
  project_id: string;
  name: string;
  description: string;
  github_repo?: string;
  local_path?: string;
  status: ProjectStatus;
  created_date: string;
  agent_count: number;
  task_count?: number;
}

/**
 * Task assigned to agents for execution
 */
export interface MaestroTask {
  task_id: string;
  project_id: string;
  title: string;
  description: string;
  ai_prompt: string;
  assigned_to_agent: string;
  priority: TaskPriority;
  status: TaskStatus;
  created_date: string;
  started_date?: string;
  completed_date?: string;
  blocked_reason?: string;
}

/**
 * Agent working on project tasks
 */
export interface Agent {
  agent_id: string;
  project_id: string;
  agent_name: string;
  status: AgentStatus;
  last_poll_date?: string;
  tasks_completed: number;
  tasks_in_progress: number;
}

/**
 * Request to generate a task prompt via AI
 */
export interface GeneratePromptRequest {
  title: string;
  description?: string;
}

/**
 * Response from AI prompt generator
 */
export interface GeneratePromptResponse {
  prompt: string;
}

/**
 * Pagination helpers
 */
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  per_page: number;
}

/**
 * API error response
 */
export interface ApiError {
  error: string;
  message: string;
  status: number;
}

/**
 * Improvement suggestion status
 */
export type SuggestionStatus = 'pending' | 'approved' | 'rejected' | 'implemented';

/**
 * Improvement suggestion created by Product Improvement Agent
 */
export interface ImprovementSuggestion {
  suggestion_id: string;
  project_id: string;
  title: string;
  description: string;
  reasoning: string;
  impact_score: 1 | 2 | 3 | 4 | 5;
  effort_estimate: 'low' | 'medium' | 'high';
  status: SuggestionStatus;
  created_date: string;
  reviewed_date?: string;
  reviewed_by?: string;
}

/**
 * System health status from Supervisor Agent
 */
export interface SystemHealth {
  total_agents: number;
  healthy: number;
  stuck: number;
  offline: number;
  health_percentage: number;
  last_updated: string;
}

/**
 * Bottleneck detection from Supervisor Agent
 */
export interface Bottleneck {
  agent_type: string;
  agent_id: string;
  issue: string;
  severity: 'low' | 'medium' | 'high';
  stuck_duration_minutes: number;
  recommended_action: string;
}

/**
 * Event types that can be triggered
 */
export type EventType =
  | 'analyze_project'
  | 'generate_tests'
  | 'review_code'
  | 'optimize_performance';

/**
 * Event trigger request
 */
export interface EventTrigger {
  event: EventType;
  projectId: string;
  metadata?: Record<string, unknown>;
  triggered_by?: string;
  triggered_at: string;
}

/**
 * Event result/completion
 */
export interface EventResult {
  event_id: string;
  event: EventType;
  projectId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  result?: unknown;
  error?: string;
  started_at: string;
  completed_at?: string;
  duration_ms?: number;
  cost_metrics?: {
    api_calls: number;
    tokens_used: number;
    estimated_cost_usd: number;
  };
}

/**
 * Notification types
 */
export type NotificationType = 'success' | 'error' | 'info' | 'warning';

/**
 * User notification
 */
export interface Notification {
  notification_id: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  link_text?: string;
  read: boolean;
  created_at: string;
  metadata?: Record<string, unknown>;
}

/**
 * Agent metrics for event-driven architecture
 */
export interface AgentMetrics {
  agent_id: string;
  last_triggered?: string;
  tasks_completed_today: number;
  tasks_completed_total: number;
  cost_metrics: {
    api_calls_today: number;
    tokens_used_today: number;
    estimated_cost_today_usd: number;
  };
}

/**
 * Message priority levels
 */
export type MessagePriority = 'low' | 'normal' | 'high' | 'urgent';

/**
 * Message types for agent communication
 */
export type MessageType =
  | 'task_assignment'
  | 'task_complete'
  | 'request_help'
  | 'status_update'
  | 'error_report'
  | 'coordination'
  | 'info';

/**
 * Agent-to-agent message
 */
export interface AgentMessage {
  message_id: string;
  from_agent_id: string;
  from_agent_name: string;
  to_agent_id: string;
  to_agent_name: string;
  message_type: MessageType;
  priority: MessagePriority;
  subject: string;
  content: string;
  metadata?: Record<string, unknown>;
  read: boolean;
  created_at: string;
  read_at?: string;
}
