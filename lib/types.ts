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
