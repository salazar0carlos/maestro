/**
 * Core type definitions for Maestro orchestration platform
 */

export type ProjectStatus = 'active' | 'paused' | 'complete';
export type TaskStatus = 'todo' | 'in-progress' | 'done' | 'blocked';
export type AgentStatus = 'active' | 'idle' | 'offline';
export type TaskPriority = 1 | 2 | 3 | 4 | 5;
export type ImprovementStatus = 'pending' | 'approved' | 'rejected' | 'implemented';

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
 * Improvement suggestion from agents or automated analysis
 */
export interface ImprovementSuggestion {
  improvement_id: string;
  project_id: string;
  title: string;
  description: string;
  suggested_by: string; // agent_id or 'system'
  status: ImprovementStatus;
  priority: TaskPriority;
  estimated_impact: 'low' | 'medium' | 'high';
  created_date: string;
  reviewed_date?: string;
  reviewed_by?: string;
  rejection_reason?: string;
  converted_to_task_id?: string;
}
