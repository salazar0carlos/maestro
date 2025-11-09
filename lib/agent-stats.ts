/**
 * Agent statistics tracking and health monitoring
 * Tracks agent performance, success rates, and health scores
 */

import { Agent, MaestroTask } from './types';
import { getAgent, updateAgent, getTasks } from './storage-adapter';

/**
 * Extended agent with calculated stats
 */
export interface AgentWithStats extends Agent {
  success_rate: number;
  failure_rate: number;
  average_task_time: number; // in milliseconds
  health_score: number; // 0-100
  uptime_percentage: number;
  total_tasks: number;
  tasks_failed: number;
}

/**
 * Task completion result
 */
export interface TaskResult {
  success: boolean;
  duration: number; // in milliseconds
  error?: string;
}

/**
 * Update agent statistics after task completion
 * Note: taskResult is reserved for future use with incremental stats updates
 */
export async function updateAgentStats(
  agentId: string,
  _taskResult: TaskResult
): Promise<AgentWithStats | null> {
  const agent = await getAgent(agentId);
  if (!agent) return null;

  const allTasks = await getTasks();
  const tasks = allTasks.filter(t => t.assigned_to_agent === agentId);
  const completedTasks = tasks.filter(t => t.status === 'done');
  const failedTasks = tasks.filter(t => t.status === 'blocked');

  const tasksCompleted = completedTasks.length;
  const tasksFailed = failedTasks.length;
  const totalTasks = tasksCompleted + tasksFailed;

  // Calculate success rate
  const successRate = totalTasks > 0 ? tasksCompleted / totalTasks : 1.0;

  // Calculate average task time
  const averageTaskTime = calculateAverageTaskTime(completedTasks);

  // Calculate uptime
  const uptimePercentage = calculateUptime(agent);

  // Calculate health score
  const healthScore = calculateHealthScore({
    successRate,
    uptimePercentage,
    averageTaskTime,
  });

  // Update agent record
  await updateAgent(agentId, {
    tasks_completed: tasksCompleted,
    last_poll_date: new Date().toISOString(),
  });

  return {
    ...agent,
    tasks_completed: tasksCompleted,
    tasks_failed: tasksFailed,
    success_rate: successRate,
    failure_rate: 1 - successRate,
    average_task_time: averageTaskTime,
    health_score: healthScore,
    uptime_percentage: uptimePercentage,
    total_tasks: totalTasks,
  };
}

/**
 * Calculate average task completion time
 */
export function calculateAverageTaskTime(tasks: MaestroTask[]): number {
  const completedWithTimes = tasks.filter(
    t => t.started_date && t.completed_date
  );

  if (completedWithTimes.length === 0) return 0;

  const totalTime = completedWithTimes.reduce((sum, task) => {
    const start = new Date(task.started_date!).getTime();
    const end = new Date(task.completed_date!).getTime();
    return sum + (end - start);
  }, 0);

  return totalTime / completedWithTimes.length;
}

/**
 * Calculate agent uptime percentage
 * Based on last poll date and expected polling interval
 */
export function calculateUptime(agent: Agent): number {
  if (!agent.last_poll_date) return 0;

  const now = Date.now();
  const lastPoll = new Date(agent.last_poll_date).getTime();
  const timeSinceLastPoll = now - lastPoll;

  // Expected polling interval: 30 seconds
  const expectedInterval = 30 * 1000;

  // If last poll was within expected interval, 100% uptime
  if (timeSinceLastPoll <= expectedInterval) {
    return 100;
  }

  // If last poll was within 2x expected interval, partial uptime
  if (timeSinceLastPoll <= expectedInterval * 2) {
    return 50;
  }

  // Otherwise, considered offline
  return 0;
}

/**
 * Calculate overall health score (0-100)
 * Weighted average of success rate, uptime, and task speed
 */
export function calculateHealthScore(metrics: {
  successRate: number;
  uptimePercentage: number;
  averageTaskTime: number;
}): number {
  const { successRate, uptimePercentage, averageTaskTime } = metrics;

  // Weight factors
  const SUCCESS_WEIGHT = 0.6;
  const UPTIME_WEIGHT = 0.3;
  const SPEED_WEIGHT = 0.1;

  // Success score (0-100)
  const successScore = successRate * 100;

  // Uptime score (already 0-100)
  const uptimeScore = uptimePercentage;

  // Speed score (0-100)
  // Good: < 30 minutes (1800000ms)
  // Acceptable: < 60 minutes (3600000ms)
  // Poor: > 60 minutes
  let speedScore = 100;
  if (averageTaskTime > 3600000) {
    speedScore = 30;
  } else if (averageTaskTime > 1800000) {
    speedScore = 70;
  }

  // Weighted average
  const healthScore =
    successScore * SUCCESS_WEIGHT +
    uptimeScore * UPTIME_WEIGHT +
    speedScore * SPEED_WEIGHT;

  return Math.round(healthScore);
}

/**
 * Get comprehensive agent statistics
 */
export async function getAgentStatistics(agentId: string): Promise<AgentWithStats | null> {
  const agent = await getAgent(agentId);
  if (!agent) return null;

  const allTasks = await getTasks();
  const tasks = allTasks.filter(t => t.assigned_to_agent === agentId);
  const completedTasks = tasks.filter(t => t.status === 'done');
  const failedTasks = tasks.filter(t => t.status === 'blocked');
  const inProgressTasks = tasks.filter(t => t.status === 'in-progress');

  const tasksCompleted = completedTasks.length;
  const tasksFailed = failedTasks.length;
  const totalTasks = tasksCompleted + tasksFailed;

  const successRate = totalTasks > 0 ? tasksCompleted / totalTasks : 1.0;
  const averageTaskTime = calculateAverageTaskTime(completedTasks);
  const uptimePercentage = calculateUptime(agent);
  const healthScore = calculateHealthScore({
    successRate,
    uptimePercentage,
    averageTaskTime,
  });

  return {
    ...agent,
    tasks_completed: tasksCompleted,
    tasks_in_progress: inProgressTasks.length,
    tasks_failed: tasksFailed,
    success_rate: successRate,
    failure_rate: 1 - successRate,
    average_task_time: averageTaskTime,
    health_score: healthScore,
    uptime_percentage: uptimePercentage,
    total_tasks: totalTasks,
  };
}

/**
 * Get statistics for all agents in a project
 */
export async function getProjectAgentStatistics(projectId: string): Promise<AgentWithStats[]> {
  const allTasks = await getTasks();
  const tasks = allTasks.filter(t => t.project_id === projectId);
  const agentIds = new Set(tasks.map(t => t.assigned_to_agent));

  const stats: AgentWithStats[] = [];

  for (const agentId of agentIds) {
    const agentStats = await getAgentStatistics(agentId);
    if (agentStats) {
      stats.push(agentStats);
    }
  }

  // Sort by health score descending
  return stats.sort((a, b) => b.health_score - a.health_score);
}

/**
 * Check if agent needs attention (low health score)
 */
export async function checkAgentHealth(agentId: string): Promise<{
  healthy: boolean;
  score: number;
  issues: string[];
}> {
  const stats = await getAgentStatistics(agentId);
  if (!stats) {
    return {
      healthy: false,
      score: 0,
      issues: ['Agent not found'],
    };
  }

  const issues: string[] = [];

  // Check health score
  if (stats.health_score < 50) {
    issues.push('Overall health score is low');
  }

  // Check success rate
  if (stats.success_rate < 0.7) {
    issues.push(`Success rate is low: ${(stats.success_rate * 100).toFixed(1)}%`);
  }

  // Check uptime
  if (stats.uptime_percentage < 50) {
    issues.push('Agent appears to be offline or not polling regularly');
  }

  // Check task speed
  if (stats.average_task_time > 3600000) {
    issues.push('Average task completion time is very high');
  }

  return {
    healthy: stats.health_score >= 70 && issues.length === 0,
    score: stats.health_score,
    issues,
  };
}

/**
 * Mark task as started (update agent in-progress count)
 */
export async function trackTaskStart(agentId: string, _taskId: string): Promise<void> {
  const agent = await getAgent(agentId);
  if (!agent) return;

  await updateAgent(agentId, {
    tasks_in_progress: agent.tasks_in_progress + 1,
    status: 'active',
    last_poll_date: new Date().toISOString(),
  });
}

/**
 * Mark task as completed (update agent stats)
 */
export async function trackTaskCompletion(
  agentId: string,
  _taskId: string,
  success: boolean = true
): Promise<void> {
  const agent = await getAgent(agentId);
  if (!agent) return;

  await updateAgent(agentId, {
    tasks_in_progress: Math.max(0, agent.tasks_in_progress - 1),
    tasks_completed: success ? agent.tasks_completed + 1 : agent.tasks_completed,
    status: agent.tasks_in_progress > 1 ? 'active' : 'idle',
    last_poll_date: new Date().toISOString(),
  });
}
