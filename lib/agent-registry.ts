/**
 * Agent Registry System
 * Manages the extended agent registry with capabilities, health scores, and performance metrics
 * Provides CRUD operations and utility functions for agent orchestration
 */

import { Agent, AgentWorkload } from './types';
import { getTasks, getAgents, updateAgent as updateAgentStorage, createAgent as createAgentStorage } from './storage';

const STORAGE_KEY = 'maestro:agent_registry';

/**
 * Get all agents from registry with extended fields
 */
export function getAllAgents(): Agent[] {
  if (typeof window === 'undefined') return [];

  // Get agents from main storage
  const agents = getAgents();

  // Merge with extended registry data
  const registry = getExtendedRegistry();

  return agents.map(agent => ({
    ...agent,
    ...registry[agent.agent_id],
  }));
}

/**
 * Get extended registry data (capabilities, health scores, etc.)
 */
function getExtendedRegistry(): Record<string, Partial<Agent>> {
  if (typeof window === 'undefined') return {};

  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : {};
  } catch {
    return {};
  }
}

/**
 * Save extended registry data
 */
function saveExtendedRegistry(registry: Record<string, Partial<Agent>>): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(registry));
  } catch (error) {
    console.error('Failed to save agent registry:', error);
  }
}

/**
 * Register a new agent with full capabilities
 */
export function registerAgent(agent: Agent): Agent {
  // Validate required fields
  if (!agent.agent_id || !agent.agent_name || !agent.project_id) {
    throw new Error('Missing required agent fields: agent_id, agent_name, project_id');
  }

  // Generate ID if not provided
  if (!agent.agent_id) {
    agent.agent_id = `agent-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // Set defaults
  const fullAgent: Agent = {
    ...agent,
    status: agent.status || 'idle',
    tasks_completed: agent.tasks_completed || 0,
    tasks_in_progress: agent.tasks_in_progress || 0,
    tasks_failed: agent.tasks_failed || 0,
    success_rate: agent.success_rate || 1.0,
    health_score: agent.health_score || 100,
    created_at: agent.created_at || new Date().toISOString(),
    capabilities: agent.capabilities || [],
    average_task_time: agent.average_task_time || 1800000, // 30 min default
  };

  // Save to main storage
  createAgentStorage(fullAgent);

  // Save extended data
  const registry = getExtendedRegistry();
  registry[fullAgent.agent_id] = {
    agent_type: fullAgent.agent_type,
    capabilities: fullAgent.capabilities,
    success_rate: fullAgent.success_rate,
    tasks_failed: fullAgent.tasks_failed,
    average_task_time: fullAgent.average_task_time,
    created_at: fullAgent.created_at,
    health_score: fullAgent.health_score,
    current_task_id: fullAgent.current_task_id,
  };
  saveExtendedRegistry(registry);

  return fullAgent;
}

/**
 * Get agents by type (Frontend, Backend, Testing, etc.)
 */
export function getAgentsByType(type: string): Agent[] {
  const agents = getAllAgents();

  // Filter by type and exclude offline agents (no poll in last 10 minutes)
  const tenMinutesAgo = Date.now() - (10 * 60 * 1000);

  return agents.filter(agent => {
    if (agent.agent_type !== type) return false;

    // Check if offline
    if (agent.last_poll_date) {
      const lastPoll = new Date(agent.last_poll_date).getTime();
      if (lastPoll < tenMinutesAgo) return false;
    }

    return true;
  });
}

/**
 * Update agent status and metadata
 */
export function updateAgentStatus(agentId: string, status: 'active' | 'idle' | 'offline'): Agent | null {
  const agent = getAllAgents().find(a => a.agent_id === agentId);
  if (!agent) return null;

  // Update main storage
  const updated = updateAgentStorage(agentId, {
    status,
    last_poll_date: new Date().toISOString(),
  });

  if (!updated) return null;

  // Return full agent with extended data
  return getAllAgents().find(a => a.agent_id === agentId) || null;
}

/**
 * Get agent workload (tasks assigned to this agent)
 */
export function getAgentWorkload(agentId: string): AgentWorkload {
  const tasks = getTasks().filter(t => t.assigned_to_agent === agentId);

  return {
    total: tasks.length,
    in_progress: tasks.filter(t => t.status === 'in-progress').length,
    todo: tasks.filter(t => t.status === 'todo').length,
  };
}

/**
 * Calculate health score based on success rate, response time, and uptime
 */
export function calculateHealthScore(agent: Agent): number {
  let score = 0;

  // Success rate (60% of score)
  const successRate = agent.success_rate || 0;
  score += successRate * 60;

  // Response time (20% of score)
  // Consider agents with avg task time < 1 hour as good (20 points)
  // < 2 hours as okay (10 points), > 2 hours as slow (5 points)
  const avgTime = agent.average_task_time || 3600000;
  if (avgTime < 3600000) {
    score += 20;
  } else if (avgTime < 7200000) {
    score += 10;
  } else {
    score += 5;
  }

  // Uptime (20% of score)
  // Check if agent has polled recently
  if (agent.last_poll_date) {
    const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
    const lastPoll = new Date(agent.last_poll_date).getTime();

    if (lastPoll > fiveMinutesAgo) {
      score += 20; // Active and polling
    } else {
      const tenMinutesAgo = Date.now() - (10 * 60 * 1000);
      if (lastPoll > tenMinutesAgo) {
        score += 10; // Recently active
      } else {
        score += 0; // Inactive
      }
    }
  }

  return Math.round(Math.min(100, Math.max(0, score)));
}

/**
 * Update agent health score
 */
export function updateAgentHealthScore(agentId: string): number {
  const agent = getAllAgents().find(a => a.agent_id === agentId);
  if (!agent) return 0;

  const healthScore = calculateHealthScore(agent);

  // Update in extended registry
  const registry = getExtendedRegistry();
  if (!registry[agentId]) {
    registry[agentId] = {};
  }
  registry[agentId].health_score = healthScore;
  saveExtendedRegistry(registry);

  return healthScore;
}

/**
 * Update agent performance metrics after task completion
 */
export function updateAgentPerformance(
  agentId: string,
  taskSuccess: boolean,
  taskDuration: number
): Agent | null {
  const agent = getAllAgents().find(a => a.agent_id === agentId);
  if (!agent) return null;

  const tasksCompleted = agent.tasks_completed || 0;
  const tasksFailed = agent.tasks_failed || 0;
  const totalTasks = tasksCompleted + tasksFailed + (taskSuccess ? 1 : 0);

  // Calculate new success rate
  const newSuccessRate = totalTasks > 0
    ? (tasksCompleted + (taskSuccess ? 1 : 0)) / totalTasks
    : 1.0;

  // Calculate new average task time (exponential moving average)
  const currentAvg = agent.average_task_time || taskDuration;
  const alpha = 0.3; // Weight for new value
  const newAvgTime = Math.round(currentAvg * (1 - alpha) + taskDuration * alpha);

  // Update storage
  updateAgentStorage(agentId, {
    tasks_completed: taskSuccess ? tasksCompleted + 1 : tasksCompleted,
    tasks_failed: taskSuccess ? tasksFailed : tasksFailed + 1,
  });

  // Update extended registry
  const registry = getExtendedRegistry();
  if (!registry[agentId]) {
    registry[agentId] = {};
  }

  registry[agentId].success_rate = newSuccessRate;
  registry[agentId].average_task_time = newAvgTime;
  registry[agentId].tasks_failed = taskSuccess ? tasksFailed : tasksFailed + 1;

  saveExtendedRegistry(registry);

  // Update health score
  updateAgentHealthScore(agentId);

  return getAllAgents().find(a => a.agent_id === agentId) || null;
}

/**
 * Get agent by ID with extended data
 */
export function getAgentById(agentId: string): Agent | null {
  return getAllAgents().find(a => a.agent_id === agentId) || null;
}

/**
 * Update agent's current task
 */
export function setAgentCurrentTask(agentId: string, taskId: string | undefined): Agent | null {
  const registry = getExtendedRegistry();

  if (!registry[agentId]) {
    registry[agentId] = {};
  }

  registry[agentId].current_task_id = taskId;
  saveExtendedRegistry(registry);

  // Update status
  if (taskId) {
    updateAgentStorage(agentId, { status: 'active' });
  } else {
    updateAgentStorage(agentId, { status: 'idle' });
  }

  return getAgentById(agentId);
}
