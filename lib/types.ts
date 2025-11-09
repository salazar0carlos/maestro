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

/**
 * Phase 3: Maestro Intelligence Layer Types
 */

export type AnalysisStatus = 'running' | 'completed' | 'failed';
export type SuggestionStatus = 'pending' | 'approved' | 'rejected' | 'implemented' | 'archived';
export type SuggestionCategory = 'performance' | 'ux' | 'security' | 'architecture' | 'code_quality';
export type ImplementationEffort = 'small' | 'medium' | 'large';
export type ImpactAssessment = 'positive' | 'neutral' | 'negative' | 'mixed';
export type PatternType = 'error_pattern' | 'usage_pattern' | 'performance_pattern' | 'security_pattern';
export type ScheduleType = 'daily' | 'weekly' | 'monthly' | 'manual';

/**
 * Analysis run by ProductImprovementAgent
 */
export interface Analysis {
  analysis_id: string;
  project_id: string;
  triggered_at: string;
  completed_at?: string;
  status: AnalysisStatus;
  agent_insights?: any; // JSON from Claude
  suggestions_count: number;
  patterns_detected_count: number;
  error_message?: string;
  execution_time_ms?: number;
  created_by: string;
}

/**
 * Improvement suggestion from an analysis
 */
export interface ImprovementSuggestion {
  suggestion_id: string;
  analysis_id: string;
  title: string;
  description?: string;
  category?: SuggestionCategory;
  priority: TaskPriority;
  status: SuggestionStatus;
  impact_score?: number; // 0.00 to 1.00
  implementation_effort?: ImplementationEffort;
  estimated_hours?: number;
  code_location?: string;
  created_at: string;
  approved_at?: string;
  approved_by?: string;
  implemented_at?: string;
  implemented_by?: string;
  rejection_reason?: string;
}

/**
 * Pattern detected and learned by the system
 */
export interface Pattern {
  pattern_id: string;
  pattern_type: PatternType;
  pattern_name: string;
  pattern_description?: string;
  pattern_data: any; // JSON
  confidence_score?: number; // 0.00 to 1.00
  times_observed: number;
  first_seen: string;
  last_seen: string;
  related_analyses?: string[];
  actionable: boolean;
  tags?: string[];
}

/**
 * Impact tracking for implemented suggestions
 */
export interface ImpactTracking {
  tracking_id: string;
  suggestion_id: string;
  approval_date?: string;
  implementation_date?: string;
  before_metrics?: any; // JSON
  after_metrics?: any; // JSON
  impact_assessment?: ImpactAssessment;
  impact_score?: number; // Measured impact 0.00 to 1.00
  notes?: string;
  measured_at: string;
  measured_by?: string;
}

/**
 * Analysis schedule configuration
 */
export interface AnalysisSchedule {
  schedule_id: string;
  project_id: string;
  schedule_type: ScheduleType;
  cron_expression: string;
  enabled: boolean;
  last_run_at?: string;
  last_run_status?: string;
  next_run_at?: string;
  created_at: string;
  updated_at: string;
}
