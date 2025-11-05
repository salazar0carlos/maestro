/**
 * localStorage wrapper for Maestro data persistence
 * Provides type-safe CRUD operations for projects, tasks, and agents
 * Future: Easy migration to PostgreSQL by replacing this file
 */

import { Project, MaestroTask, Agent } from './types';

const STORAGE_KEYS = {
  PROJECTS: 'maestro:projects',
  TASKS: 'maestro:tasks',
  AGENTS: 'maestro:agents',
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
 * Create new task and trigger agent via webhook
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

  // Enqueue task for agent execution (queue-based architecture)
  if (task.assigned_to_agent && task.status === 'todo') {
    enqueueTaskForAgent(task).catch(error => {
      console.error('[createTask] Failed to enqueue task:', error);
    });
  }

  return task;
}

/**
 * Enqueue task for agent execution via BullMQ
 */
async function enqueueTaskForAgent(task: MaestroTask): Promise<void> {
  if (!isBrowser()) return;

  try {
    // Infer agent type from assigned agent or task content
    const agentType = inferAgentTypeFromTask(task);

    if (!agentType) {
      console.warn('[enqueueTaskForAgent] Could not infer agent type for task:', task.task_id);
      return;
    }

    // Call API to enqueue task
    const response = await fetch('/api/tasks/enqueue', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ taskId: task.task_id, task, agentType }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      console.error('[triggerAgentForTask] Webhook trigger failed:', error);
    } else {
      console.log('[triggerAgentForTask] Successfully triggered agent for task:', task.task_id);
    }
  } catch (error) {
    console.error('[triggerAgentForTask] Error:', error);
  }
}

/**
 * Infer agent type from task
 */
function inferAgentTypeFromTask(task: MaestroTask): string | null {
  const content = (task.title + ' ' + task.description + ' ' + (task.ai_prompt || '')).toLowerCase();

  // Frontend patterns
  if (
    content.includes('ui') ||
    content.includes('frontend') ||
    content.includes('react') ||
    content.includes('component') ||
    content.includes('css') ||
    content.includes('style') ||
    content.includes('tailwind')
  ) {
    return 'Frontend';
  }

  // Backend patterns
  if (
    content.includes('api') ||
    content.includes('backend') ||
    content.includes('database') ||
    content.includes('server') ||
    content.includes('endpoint') ||
    content.includes('route')
  ) {
    return 'Backend';
  }

  // Testing patterns
  if (
    content.includes('test') ||
    content.includes('testing') ||
    content.includes('spec') ||
    content.includes('jest') ||
    content.includes('cypress')
  ) {
    return 'Testing';
  }

  // Integration patterns
  if (
    content.includes('integration') ||
    content.includes('deploy') ||
    content.includes('ci/cd') ||
    content.includes('docker')
  ) {
    return 'Integration';
  }

  // Default to Backend
  return 'Backend';
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
}
