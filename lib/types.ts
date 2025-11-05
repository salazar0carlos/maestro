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
  assigned_to_agent_type?: string; // Frontend, Backend, Testing, DevOps, etc.
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
  // Extended fields for supervisor orchestration
  agent_type?: string; // Frontend, Backend, Testing, etc.
  current_task_id?: string;
  capabilities?: string[];
  success_rate?: number; // 0-1 percentage
  tasks_failed?: number;
  average_task_time?: number; // milliseconds
  created_at?: string;
  health_score?: number; // 0-100
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
 * Supervisor-specific types for orchestration
 */

export interface Bottleneck {
  agent_type: string;
  backlog: number;
  current_agents: number;
  utilization: number;
  recommendation: string;
  estimated_delay: number; // hours
}

export interface Alert {
  severity: 'critical' | 'high' | 'medium' | 'low';
  type: string;
  message: string;
  action: string;
  timestamp: string;
  tasks?: string[];
  bottlenecks?: Bottleneck[];
  failed_count?: number;
  total_count?: number;
}

export interface SystemHealth {
  total_agents: number;
  healthy: number;
  stuck: number;
  offline: number;
  health_percentage: number;
  status: 'healthy' | 'degraded' | 'critical';
}

export interface AgentWorkload {
  total: number;
  in_progress: number;
  todo: number;
}
