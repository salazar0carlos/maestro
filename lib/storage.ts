/**
 * localStorage wrapper for Maestro data persistence
 * Provides type-safe CRUD operations for projects, tasks, and agents
 * Future: Easy migration to PostgreSQL by replacing this file
 */

import {
  Project,
  MaestroTask,
  Agent,
  ImprovementSuggestion,
  SystemHealth,
  Bottleneck,
  Notification,
  EventResult,
  AgentMetrics
} from './types';

const STORAGE_KEYS = {
  PROJECTS: 'maestro:projects',
  TASKS: 'maestro:tasks',
  AGENTS: 'maestro:agents',
  SUGGESTIONS: 'maestro:suggestions',
  SYSTEM_HEALTH: 'maestro:system_health',
  BOTTLENECKS: 'maestro:bottlenecks',
  NOTIFICATIONS: 'maestro:notifications',
  EVENT_RESULTS: 'maestro:event_results',
  AGENT_METRICS: 'maestro:agent_metrics',
};

/**
 * Safe JSON parsing with fallback
 */
function safeJsonParse<T>(json: string | null, fallback: T): T {
  if (!json) return fallback;
  try {
    return JSON.parse(json);
  } catch {
    return fallback;
  }
}

/**
 * Safe JSON stringify
 */
function safeJsonStringify<T>(obj: T): string {
  try {
    return JSON.stringify(obj);
  } catch {
    return '[]';
  }
}

/**
 * Check if we're in browser environment
 */
function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

// ============ PROJECT STORAGE ============

/**
 * Get all projects
 */
export function getProjects(): Project[] {
  if (!isBrowser()) return [];
  const data = localStorage.getItem(STORAGE_KEYS.PROJECTS);
  return safeJsonParse(data, []);
}

/**
 * Get project by ID
 */
export function getProject(projectId: string): Project | null {
  const projects = getProjects();
  return projects.find(p => p.project_id === projectId) || null;
}

/**
 * Create new project
 */
export function createProject(project: Project): Project {
  if (!isBrowser()) return project;
  const projects = getProjects();
  projects.push(project);
  localStorage.setItem(STORAGE_KEYS.PROJECTS, safeJsonStringify(projects));
  return project;
}

/**
 * Update project
 */
export function updateProject(projectId: string, updates: Partial<Project>): Project | null {
  if (!isBrowser()) return null;
  const projects = getProjects();
  const index = projects.findIndex(p => p.project_id === projectId);
  if (index === -1) return null;

  projects[index] = { ...projects[index], ...updates };
  localStorage.setItem(STORAGE_KEYS.PROJECTS, safeJsonStringify(projects));
  return projects[index];
}

/**
 * Delete project and all its tasks
 */
export function deleteProject(projectId: string): boolean {
  if (!isBrowser()) return false;
  const projects = getProjects();
  const filtered = projects.filter(p => p.project_id !== projectId);

  if (filtered.length === projects.length) return false;

  // Also delete all tasks for this project
  const tasks = getTasks().filter(t => t.project_id !== projectId);
  const agents = getAgents().filter(a => a.project_id !== projectId);

  localStorage.setItem(STORAGE_KEYS.PROJECTS, safeJsonStringify(filtered));
  localStorage.setItem(STORAGE_KEYS.TASKS, safeJsonStringify(tasks));
  localStorage.setItem(STORAGE_KEYS.AGENTS, safeJsonStringify(agents));

  return true;
}

// ============ TASK STORAGE ============

/**
 * Get all tasks
 */
export function getTasks(): MaestroTask[] {
  if (!isBrowser()) return [];
  const data = localStorage.getItem(STORAGE_KEYS.TASKS);
  return safeJsonParse(data, []);
}

/**
 * Get tasks for a specific project
 */
export function getProjectTasks(projectId: string): MaestroTask[] {
  return getTasks().filter(t => t.project_id === projectId);
}

/**
 * Get task by ID
 */
export function getTask(taskId: string): MaestroTask | null {
  const tasks = getTasks();
  return tasks.find(t => t.task_id === taskId) || null;
}

/**
 * Get tasks for a specific agent in a project
 */
export function getAgentTasks(projectId: string, agentId: string): MaestroTask[] {
  return getTasks().filter(
    t => t.project_id === projectId && t.assigned_to_agent === agentId
  );
}

/**
 * Get tasks by status
 */
export function getTasksByStatus(projectId: string, status: string): MaestroTask[] {
  return getTasks().filter(
    t => t.project_id === projectId && t.status === status
  );
}

/**
 * Create new task
 */
export function createTask(task: MaestroTask): MaestroTask {
  if (!isBrowser()) return task;

  const tasks = getTasks();
  tasks.push(task);
  localStorage.setItem(STORAGE_KEYS.TASKS, safeJsonStringify(tasks));

  // Update project task count
  const project = getProject(task.project_id);
  if (project) {
    updateProject(task.project_id, {
      task_count: (project.task_count || 0) + 1,
    });
  }

  return task;
}

/**
 * Update task
 */
export function updateTask(taskId: string, updates: Partial<MaestroTask>): MaestroTask | null {
  if (!isBrowser()) return null;

  const tasks = getTasks();
  const index = tasks.findIndex(t => t.task_id === taskId);
  if (index === -1) return null;

  tasks[index] = { ...tasks[index], ...updates };
  localStorage.setItem(STORAGE_KEYS.TASKS, safeJsonStringify(tasks));

  return tasks[index];
}

/**
 * Delete task
 */
export function deleteTask(taskId: string): boolean {
  if (!isBrowser()) return false;

  const task = getTask(taskId);
  if (!task) return false;

  const tasks = getTasks().filter(t => t.task_id !== taskId);
  localStorage.setItem(STORAGE_KEYS.TASKS, safeJsonStringify(tasks));

  // Update project task count
  const project = getProject(task.project_id);
  if (project && project.task_count) {
    updateProject(task.project_id, {
      task_count: Math.max(0, project.task_count - 1),
    });
  }

  return true;
}

// ============ AGENT STORAGE ============

/**
 * Get all agents
 */
export function getAgents(): Agent[] {
  if (!isBrowser()) return [];
  const data = localStorage.getItem(STORAGE_KEYS.AGENTS);
  return safeJsonParse(data, []);
}

/**
 * Get agent by ID
 */
export function getAgent(agentId: string): Agent | null {
  const agents = getAgents();
  return agents.find(a => a.agent_id === agentId) || null;
}

/**
 * Get agents for a project
 */
export function getProjectAgents(projectId: string): Agent[] {
  return getAgents().filter(a => a.project_id === projectId);
}

/**
 * Create agent
 */
export function createAgent(agent: Agent): Agent {
  if (!isBrowser()) return agent;

  const agents = getAgents();
  agents.push(agent);
  localStorage.setItem(STORAGE_KEYS.AGENTS, safeJsonStringify(agents));

  return agent;
}

/**
 * Update agent
 */
export function updateAgent(agentId: string, updates: Partial<Agent>): Agent | null {
  if (!isBrowser()) return null;

  const agents = getAgents();
  const index = agents.findIndex(a => a.agent_id === agentId);
  if (index === -1) return null;

  agents[index] = { ...agents[index], ...updates };
  localStorage.setItem(STORAGE_KEYS.AGENTS, safeJsonStringify(agents));

  return agents[index];
}

/**
 * Delete agent
 */
export function deleteAgent(agentId: string): boolean {
  if (!isBrowser()) return false;

  const agents = getAgents().filter(a => a.agent_id !== agentId);
  localStorage.setItem(STORAGE_KEYS.AGENTS, safeJsonStringify(agents));

  return true;
}

/**
 * Calculate agent stats
 */
export function getAgentStats(agentId: string) {
  const agent = getAgent(agentId);
  if (!agent) return null;

  const tasks = getTasks().filter(t => t.assigned_to_agent === agentId);
  const completed = tasks.filter(t => t.status === 'done').length;
  const inProgress = tasks.filter(t => t.status === 'in-progress').length;
  const todo = tasks.filter(t => t.status === 'todo').length;
  const blocked = tasks.filter(t => t.status === 'blocked').length;

  return {
    ...agent,
    total_tasks: tasks.length,
    completed,
    in_progress: inProgress,
    todo,
    blocked,
  };
}

// ============ SEED DATA ============

/**
 * Initialize with seed data (for development)
 */
export function seedData(): void {
  if (!isBrowser()) return;

  // Only seed if empty
  if (getProjects().length > 0) return;

  const now = new Date().toISOString();

  // Create sample project
  const project: Project = {
    project_id: 'sample-project-1',
    name: 'TestApp',
    description: 'Sample project for testing Maestro',
    status: 'active',
    created_date: now,
    agent_count: 3,
    task_count: 0,
  };

  createProject(project);

  // Create sample agents
  for (let i = 1; i <= 3; i++) {
    createAgent({
      agent_id: `agent-${i}`,
      project_id: project.project_id,
      agent_name: `agent-${i}`,
      status: i === 1 ? 'active' : 'idle',
      tasks_completed: Math.floor(Math.random() * 10),
      tasks_in_progress: i === 1 ? 1 : 0,
      last_poll_date: i === 1 ? now : undefined,
    });
  }
}

/**
 * Clear all data
 */
export function clearAllData(): void {
  if (!isBrowser()) return;

  localStorage.removeItem(STORAGE_KEYS.PROJECTS);
  localStorage.removeItem(STORAGE_KEYS.TASKS);
  localStorage.removeItem(STORAGE_KEYS.AGENTS);
  localStorage.removeItem(STORAGE_KEYS.SUGGESTIONS);
}

// ============ IMPROVEMENT SUGGESTIONS STORAGE ============

/**
 * Get all improvement suggestions
 */
export function getSuggestions(): ImprovementSuggestion[] {
  if (!isBrowser()) return [];
  const data = localStorage.getItem(STORAGE_KEYS.SUGGESTIONS);
  return safeJsonParse(data, []);
}

/**
 * Get suggestions for a specific project
 */
export function getProjectSuggestions(projectId: string): ImprovementSuggestion[] {
  return getSuggestions().filter(s => s.project_id === projectId);
}

/**
 * Get suggestion by ID
 */
export function getSuggestion(suggestionId: string): ImprovementSuggestion | null {
  const suggestions = getSuggestions();
  return suggestions.find(s => s.suggestion_id === suggestionId) || null;
}

/**
 * Get suggestions by status
 */
export function getSuggestionsByStatus(projectId: string, status: string): ImprovementSuggestion[] {
  return getSuggestions().filter(
    s => s.project_id === projectId && s.status === status
  );
}

/**
 * Create new suggestion
 */
export function createSuggestion(suggestion: ImprovementSuggestion): ImprovementSuggestion {
  if (!isBrowser()) return suggestion;

  const suggestions = getSuggestions();
  suggestions.push(suggestion);
  localStorage.setItem(STORAGE_KEYS.SUGGESTIONS, safeJsonStringify(suggestions));

  return suggestion;
}

/**
 * Update suggestion
 */
export function updateSuggestion(
  suggestionId: string,
  updates: Partial<ImprovementSuggestion>
): ImprovementSuggestion | null {
  if (!isBrowser()) return null;

  const suggestions = getSuggestions();
  const index = suggestions.findIndex(s => s.suggestion_id === suggestionId);
  if (index === -1) return null;

  suggestions[index] = { ...suggestions[index], ...updates };
  localStorage.setItem(STORAGE_KEYS.SUGGESTIONS, safeJsonStringify(suggestions));

  return suggestions[index];
}

/**
 * Delete suggestion
 */
export function deleteSuggestion(suggestionId: string): boolean {
  if (!isBrowser()) return false;

  const suggestions = getSuggestions().filter(s => s.suggestion_id !== suggestionId);
  localStorage.setItem(STORAGE_KEYS.SUGGESTIONS, safeJsonStringify(suggestions));

  return true;
}

// ============ SUPERVISOR DATA STORAGE ============

/**
 * Calculate system health from current agents
 */
export function calculateSystemHealth(): SystemHealth {
  const agents = getAgents();
  const total = agents.length;

  // Define health criteria
  const healthy = agents.filter(a => a.status === 'active').length;
  const stuck = agents.filter(a => a.status === 'idle').length;
  const offline = agents.filter(a => a.status === 'offline').length;

  const healthPercentage = total > 0 ? Math.round((healthy / total) * 100) : 100;

  const systemHealth: SystemHealth = {
    total_agents: total,
    healthy,
    stuck,
    offline,
    health_percentage: healthPercentage,
    last_updated: new Date().toISOString(),
  };

  if (isBrowser()) {
    localStorage.setItem(STORAGE_KEYS.SYSTEM_HEALTH, safeJsonStringify(systemHealth));
  }

  return systemHealth;
}

/**
 * Get system health
 */
export function getSystemHealth(): SystemHealth {
  if (!isBrowser()) {
    return {
      total_agents: 0,
      healthy: 0,
      stuck: 0,
      offline: 0,
      health_percentage: 100,
      last_updated: new Date().toISOString(),
    };
  }

  const data = localStorage.getItem(STORAGE_KEYS.SYSTEM_HEALTH);
  if (!data) {
    return calculateSystemHealth();
  }
  return safeJsonParse(data, calculateSystemHealth());
}

/**
 * Detect bottlenecks from agent data
 */
export function detectBottlenecks(): Bottleneck[] {
  const agents = getAgents();
  const now = new Date().getTime();
  const bottlenecks: Bottleneck[] = [];

  agents.forEach(agent => {
    // Check if agent is stuck (idle with tasks in progress)
    if (agent.status === 'idle' && agent.tasks_in_progress > 0) {
      const lastPollTime = agent.last_poll_date ? new Date(agent.last_poll_date).getTime() : 0;
      const stuckMinutes = Math.round((now - lastPollTime) / (1000 * 60));

      if (stuckMinutes > 10) {
        bottlenecks.push({
          agent_type: agent.agent_name,
          agent_id: agent.agent_id,
          issue: `Agent has ${agent.tasks_in_progress} task(s) in progress but has been idle for ${stuckMinutes} minutes`,
          severity: stuckMinutes > 30 ? 'high' : stuckMinutes > 20 ? 'medium' : 'low',
          stuck_duration_minutes: stuckMinutes,
          recommended_action: 'Check agent logs and restart if necessary',
        });
      }
    }

    // Check if agent is offline with pending tasks
    if (agent.status === 'offline') {
      const tasks = getTasks().filter(
        t => t.assigned_to_agent === agent.agent_id && t.status !== 'done'
      );

      if (tasks.length > 0) {
        bottlenecks.push({
          agent_type: agent.agent_name,
          agent_id: agent.agent_id,
          issue: `Agent is offline with ${tasks.length} pending task(s)`,
          severity: 'high',
          stuck_duration_minutes: 0,
          recommended_action: 'Start agent or reassign tasks',
        });
      }
    }
  });

  if (isBrowser()) {
    localStorage.setItem(STORAGE_KEYS.BOTTLENECKS, safeJsonStringify(bottlenecks));
  }

  return bottlenecks;
}

/**
 * Get detected bottlenecks
 */
export function getBottlenecks(): Bottleneck[] {
  if (!isBrowser()) return [];

  const data = localStorage.getItem(STORAGE_KEYS.BOTTLENECKS);
  if (!data) {
    return detectBottlenecks();
  }
  return safeJsonParse(data, []);
}

// ============ NOTIFICATIONS STORAGE ============

/**
 * Get all notifications
 */
export function getNotifications(): Notification[] {
  if (!isBrowser()) return [];
  const data = localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS);
  return safeJsonParse(data, []);
}

/**
 * Get unread notifications
 */
export function getUnreadNotifications(): Notification[] {
  return getNotifications().filter(n => !n.read);
}

/**
 * Create notification
 */
export function createNotification(notification: Notification): Notification {
  if (!isBrowser()) return notification;

  const notifications = getNotifications();
  notifications.unshift(notification); // Add to beginning

  // Keep only last 100 notifications
  const trimmed = notifications.slice(0, 100);
  localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, safeJsonStringify(trimmed));

  return notification;
}

/**
 * Mark notification as read
 */
export function markNotificationRead(notificationId: string): boolean {
  if (!isBrowser()) return false;

  const notifications = getNotifications();
  const notification = notifications.find(n => n.notification_id === notificationId);

  if (!notification) return false;

  notification.read = true;
  localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, safeJsonStringify(notifications));

  return true;
}

/**
 * Mark all notifications as read
 */
export function markAllNotificationsRead(): void {
  if (!isBrowser()) return;

  const notifications = getNotifications();
  notifications.forEach(n => n.read = true);
  localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, safeJsonStringify(notifications));
}

/**
 * Delete notification
 */
export function deleteNotification(notificationId: string): boolean {
  if (!isBrowser()) return false;

  const notifications = getNotifications().filter(n => n.notification_id !== notificationId);
  localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, safeJsonStringify(notifications));

  return true;
}

/**
 * Clear all notifications
 */
export function clearAllNotifications(): void {
  if (!isBrowser()) return;
  localStorage.removeItem(STORAGE_KEYS.NOTIFICATIONS);
}

// ============ EVENT RESULTS STORAGE ============

/**
 * Get all event results
 */
export function getEventResults(): EventResult[] {
  if (!isBrowser()) return [];
  const data = localStorage.getItem(STORAGE_KEYS.EVENT_RESULTS);
  return safeJsonParse(data, []);
}

/**
 * Get event results for a project
 */
export function getProjectEventResults(projectId: string): EventResult[] {
  return getEventResults().filter(e => e.projectId === projectId);
}

/**
 * Create event result
 */
export function createEventResult(eventResult: EventResult): EventResult {
  if (!isBrowser()) return eventResult;

  const events = getEventResults();
  events.unshift(eventResult);

  // Keep only last 100 events
  const trimmed = events.slice(0, 100);
  localStorage.setItem(STORAGE_KEYS.EVENT_RESULTS, safeJsonStringify(trimmed));

  return eventResult;
}

/**
 * Update event result
 */
export function updateEventResult(
  eventId: string,
  updates: Partial<EventResult>
): EventResult | null {
  if (!isBrowser()) return null;

  const events = getEventResults();
  const index = events.findIndex(e => e.event_id === eventId);
  if (index === -1) return null;

  events[index] = { ...events[index], ...updates };
  localStorage.setItem(STORAGE_KEYS.EVENT_RESULTS, safeJsonStringify(events));

  return events[index];
}

// ============ AGENT METRICS STORAGE ============

/**
 * Get all agent metrics
 */
export function getAllAgentMetrics(): AgentMetrics[] {
  if (!isBrowser()) return [];
  const data = localStorage.getItem(STORAGE_KEYS.AGENT_METRICS);
  return safeJsonParse(data, []);
}

/**
 * Get metrics for a specific agent
 */
export function getAgentMetrics(agentId: string): AgentMetrics | null {
  const metrics = getAllAgentMetrics();
  return metrics.find(m => m.agent_id === agentId) || null;
}

/**
 * Update agent metrics
 */
export function updateAgentMetrics(
  agentId: string,
  updates: Partial<AgentMetrics>
): AgentMetrics {
  if (!isBrowser()) {
    return {
      agent_id: agentId,
      tasks_completed_today: 0,
      tasks_completed_total: 0,
      cost_metrics: {
        api_calls_today: 0,
        tokens_used_today: 0,
        estimated_cost_today_usd: 0,
      },
      ...updates,
    };
  }

  const metrics = getAllAgentMetrics();
  const index = metrics.findIndex(m => m.agent_id === agentId);

  if (index === -1) {
    // Create new metrics
    const newMetrics: AgentMetrics = {
      agent_id: agentId,
      tasks_completed_today: 0,
      tasks_completed_total: 0,
      cost_metrics: {
        api_calls_today: 0,
        tokens_used_today: 0,
        estimated_cost_today_usd: 0,
      },
      ...updates,
    };
    metrics.push(newMetrics);
  } else {
    // Update existing metrics
    metrics[index] = { ...metrics[index], ...updates };
  }

  localStorage.setItem(STORAGE_KEYS.AGENT_METRICS, safeJsonStringify(metrics));

  return metrics[index];
}

/**
 * Reset daily metrics (should be called daily)
 */
export function resetDailyMetrics(): void {
  if (!isBrowser()) return;

  const metrics = getAllAgentMetrics();
  metrics.forEach(m => {
    m.cost_metrics.api_calls_today = 0;
    m.cost_metrics.tokens_used_today = 0;
    m.cost_metrics.estimated_cost_today_usd = 0;
    m.tasks_completed_today = 0;
  });

  localStorage.setItem(STORAGE_KEYS.AGENT_METRICS, safeJsonStringify(metrics));
}
