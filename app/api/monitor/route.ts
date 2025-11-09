/**
 * Agent Monitoring API
 * Provides comprehensive real-time metrics for all agents
 */

import { NextResponse } from 'next/server';
import { getAgents, getTasks, getProjects } from '@/lib/storage-adapter';
import { getAgentStatistics, checkAgentHealth } from '@/lib/agent-stats';
import { Agent, MaestroTask, Project } from '@/lib/types';

export interface AgentMonitorData {
  agent_id: string;
  agent_name: string;
  project_id: string;
  project_name: string;
  status: 'active' | 'idle' | 'stuck' | 'offline';
  health_score: number;
  current_task: string | null;
  tasks_completed_today: number;
  tasks_completed_week: number;
  success_rate: number;
  error_rate: number;
  last_activity: string;
  uptime_percentage: number;
  average_task_time: number;
  tasks_in_queue: number;
  is_bottleneck: boolean;
  health_issues: string[];
}

export interface MonitoringStats {
  total_agents: number;
  active_agents: number;
  idle_agents: number;
  stuck_agents: number;
  offline_agents: number;
  total_tasks: number;
  tasks_completed_today: number;
  tasks_completed_week: number;
  average_health_score: number;
  bottlenecks_count: number;
}

export interface MonitoringResponse {
  agents: AgentMonitorData[];
  stats: MonitoringStats;
  timestamp: string;
}

/**
 * Get agent status with stuck detection
 */
function getAgentStatus(agent: Agent, tasks: MaestroTask[]): 'active' | 'idle' | 'stuck' | 'offline' {
  // Check if offline (no poll in last 5 minutes)
  if (agent.last_poll_date) {
    const lastPoll = new Date(agent.last_poll_date).getTime();
    const now = Date.now();
    const timeSinceLastPoll = now - lastPoll;

    if (timeSinceLastPoll > 5 * 60 * 1000) {
      return 'offline';
    }
  } else {
    return 'offline';
  }

  // Check if stuck (has in-progress task for more than 2 hours)
  const inProgressTasks = tasks.filter(t =>
    t.assigned_to_agent === agent.agent_id &&
    t.status === 'in-progress'
  );

  for (const task of inProgressTasks) {
    if (task.started_date) {
      const startedAt = new Date(task.started_date).getTime();
      const now = Date.now();
      const duration = now - startedAt;

      // Stuck if task running for more than 2 hours
      if (duration > 2 * 60 * 60 * 1000) {
        return 'stuck';
      }
    }
  }

  // Active if has in-progress tasks
  if (inProgressTasks.length > 0) {
    return 'active';
  }

  return 'idle';
}

/**
 * Get current task being worked on
 */
function getCurrentTask(agent: Agent, tasks: MaestroTask[]): string | null {
  const inProgressTasks = tasks.filter(t =>
    t.assigned_to_agent === agent.agent_id &&
    t.status === 'in-progress'
  );

  if (inProgressTasks.length === 0) return null;

  // Return the most recently started task
  const latestTask = inProgressTasks.sort((a, b) => {
    const aTime = a.started_date ? new Date(a.started_date).getTime() : 0;
    const bTime = b.started_date ? new Date(b.started_date).getTime() : 0;
    return bTime - aTime;
  })[0];

  return latestTask.title;
}

/**
 * Count tasks completed in a time period
 */
function countTasksInPeriod(tasks: MaestroTask[], hoursAgo: number): number {
  const cutoff = Date.now() - (hoursAgo * 60 * 60 * 1000);

  return tasks.filter(t => {
    if (t.status !== 'done' || !t.completed_date) return false;
    const completedAt = new Date(t.completed_date).getTime();
    return completedAt >= cutoff;
  }).length;
}

/**
 * Detect if agent is a bottleneck
 */
function isBottleneck(agent: Agent, tasks: MaestroTask[]): boolean {
  const agentTasks = tasks.filter(t => t.assigned_to_agent === agent.agent_id);
  const todoTasks = agentTasks.filter(t => t.status === 'todo');
  const inProgressTasks = agentTasks.filter(t => t.status === 'in-progress');

  // Bottleneck if more than 5 tasks waiting or multiple in-progress
  return todoTasks.length > 5 || inProgressTasks.length > 3;
}

export async function GET() {
  try {
    const agents = await getAgents();
    const allTasks = await getTasks();
    const projects = await getProjects();

    const projectMap = new Map<string, Project>();
    projects.forEach(p => projectMap.set(p.project_id, p));

    // Build monitoring data for each agent
    const monitorData: AgentMonitorData[] = await Promise.all(agents.map(async (agent) => {
      const stats = await getAgentStatistics(agent.agent_id);
      const health = await checkAgentHealth(agent.agent_id);
      const agentTasks = allTasks.filter(t => t.assigned_to_agent === agent.agent_id);
      const project = projectMap.get(agent.project_id);

      const status = getAgentStatus(agent, agentTasks);
      const currentTask = getCurrentTask(agent, agentTasks);
      const tasksCompletedToday = countTasksInPeriod(agentTasks, 24);
      const tasksCompletedWeek = countTasksInPeriod(agentTasks, 24 * 7);
      const tasksInQueue = agentTasks.filter(t => t.status === 'todo').length;
      const bottleneck = isBottleneck(agent, agentTasks);

      return {
        agent_id: agent.agent_id,
        agent_name: agent.agent_name,
        project_id: agent.project_id,
        project_name: project?.name || 'Unknown Project',
        status,
        health_score: stats?.health_score || 0,
        current_task: currentTask,
        tasks_completed_today: tasksCompletedToday,
        tasks_completed_week: tasksCompletedWeek,
        success_rate: stats?.success_rate || 0,
        error_rate: stats?.failure_rate || 0,
        last_activity: agent.last_poll_date || 'Never',
        uptime_percentage: stats?.uptime_percentage || 0,
        average_task_time: stats?.average_task_time || 0,
        tasks_in_queue: tasksInQueue,
        is_bottleneck: bottleneck,
        health_issues: health.issues,
      };
    }));

    // Calculate overall stats
    const stats: MonitoringStats = {
      total_agents: agents.length,
      active_agents: monitorData.filter(a => a.status === 'active').length,
      idle_agents: monitorData.filter(a => a.status === 'idle').length,
      stuck_agents: monitorData.filter(a => a.status === 'stuck').length,
      offline_agents: monitorData.filter(a => a.status === 'offline').length,
      total_tasks: allTasks.length,
      tasks_completed_today: monitorData.reduce((sum, a) => sum + a.tasks_completed_today, 0),
      tasks_completed_week: monitorData.reduce((sum, a) => sum + a.tasks_completed_week, 0),
      average_health_score: monitorData.length > 0
        ? Math.round(monitorData.reduce((sum, a) => sum + a.health_score, 0) / monitorData.length)
        : 0,
      bottlenecks_count: monitorData.filter(a => a.is_bottleneck).length,
    };

    const response: MonitoringResponse = {
      agents: monitorData,
      stats,
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching monitoring data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch monitoring data' },
      { status: 500 }
    );
  }
}
