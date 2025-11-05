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
 * Integration types for Maestro Intelligence Layer
 */

// Agent Communication
export type MessageType =
  | 'task_complete'
  | 'need_info'
  | 'context_share'
  | 'dependency_alert'
  | 'error_report'
  | 'status_update';

export interface AgentMessage {
  id: string;
  from: string;
  to: string;
  type: MessageType;
  payload: Record<string, any>;
  timestamp: string;
  read: boolean;
  priority?: 'low' | 'medium' | 'high';
}

// Knowledge Base
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

// Integration Health
export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy' | 'offline';

export interface IntegrationHealthStatus {
  integration: string;
  status: HealthStatus;
  message?: string;
  details?: Record<string, any>;
  last_check: string;
  last_success?: string;
  error_rate?: number;
  response_time?: number;
}

// Task Dependencies
export interface TaskDependency {
  task: string;
  depends_on: string;
  reason: string;
  type: 'explicit' | 'inferred';
}
