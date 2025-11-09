/**
 * Agent Health Monitoring
 * Detects stuck, idle, and offline agents
 * Calculates overall system health metrics
 */

import { Agent, SystemHealth } from './types';
import { getAllAgents, getAgentById } from './agent-registry';
import { getTask } from './storage-adapter';

/**
 * Agent Health Monitor - Main class for health monitoring
 */
export class AgentHealthMonitor {
  /**
   * Detect agents that are stuck (in progress >30 min with no updates)
   */
  static async getStuckAgents(): Promise<Agent[]> {
    const agents = await getAllAgents();
    const stuckAgents: Agent[] = [];

    for (const agent of agents) {
      if (agent.status !== 'active' || !agent.current_task_id) continue;

      const task = await getTask(agent.current_task_id);
      if (!task) continue;

      // Check if task is in progress for >30 minutes
      if (task.status === 'in-progress' && task.started_date) {
        const thirtyMinAgo = Date.now() - 30 * 60 * 1000;
        const startedAt = new Date(task.started_date).getTime();

        if (startedAt < thirtyMinAgo) {
          // Consider stuck if no recent updates
          // (for now, we consider any task in progress >30 min as potentially stuck)
          stuckAgents.push(agent);
        }
      }
    }

    return stuckAgents;
  }

  /**
   * Detect idle agents (active status but no current task)
   */
  static async getIdleAgents(): Promise<Agent[]> {
    const agents = await getAllAgents();

    return agents.filter(agent => agent.status === 'active' && !agent.current_task_id);
  }

  /**
   * Detect offline agents (no poll in last 5 minutes)
   */
  static async getOfflineAgents(): Promise<Agent[]> {
    const agents = await getAllAgents();
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;

    return agents.filter(agent => {
      if (!agent.last_poll_date) return true; // Never polled = offline

      const lastPoll = new Date(agent.last_poll_date).getTime();
      return lastPoll < fiveMinutesAgo;
    });
  }

  /**
   * Get healthy agents (health score > 70, not offline, not stuck)
   */
  static async getHealthyAgents(): Promise<Agent[]> {
    const agents = await getAllAgents();
    const offlineAgents = new Set((await this.getOfflineAgents()).map(a => a.agent_id));
    const stuckAgents = new Set((await this.getStuckAgents()).map(a => a.agent_id));

    return agents.filter(agent => {
      if (offlineAgents.has(agent.agent_id)) return false;
      if (stuckAgents.has(agent.agent_id)) return false;

      const healthScore = agent.health_score || 0;
      return healthScore > 70;
    });
  }

  /**
   * Get overall system health
   */
  static async getSystemHealth(): Promise<SystemHealth> {
    const allAgents = await getAllAgents();

    if (allAgents.length === 0) {
      return {
        total_agents: 0,
        healthy: 0,
        stuck: 0,
        offline: 0,
        health_percentage: 0,
        status: 'critical',
      };
    }

    const healthy = (await this.getHealthyAgents()).length;
    const stuck = (await this.getStuckAgents()).length;
    const offline = (await this.getOfflineAgents()).length;

    const healthPercentage = (healthy / allAgents.length) * 100;

    let status: 'healthy' | 'degraded' | 'critical';
    if (healthPercentage >= 80) {
      status = 'healthy';
    } else if (healthPercentage >= 50) {
      status = 'degraded';
    } else {
      status = 'critical';
    }

    return {
      total_agents: allAgents.length,
      healthy,
      stuck,
      offline,
      health_percentage: Math.round(healthPercentage),
      status,
    };
  }

  /**
   * Get detailed health report for a specific agent
   */
  static async getAgentHealthReport(agentId: string): Promise<{
    agent: Agent | null;
    status: 'healthy' | 'idle' | 'stuck' | 'offline';
    issues: string[];
    recommendations: string[];
  }> {
    const agent = await getAgentById(agentId);

    if (!agent) {
      return {
        agent: null,
        status: 'offline',
        issues: ['Agent not found'],
        recommendations: ['Check if agent was deleted or deregistered'],
      };
    }

    const issues: string[] = [];
    const recommendations: string[] = [];
    let status: 'healthy' | 'idle' | 'stuck' | 'offline' = 'healthy';

    // Check if offline
    const offlineAgents = await this.getOfflineAgents();
    if (offlineAgents.some(a => a.agent_id === agentId)) {
      status = 'offline';
      issues.push('Agent has not polled in over 5 minutes');
      recommendations.push('Restart the agent process');
      recommendations.push('Check network connectivity');
    }

    // Check if stuck
    const stuckAgents = await this.getStuckAgents();
    if (stuckAgents.some(a => a.agent_id === agentId)) {
      status = 'stuck';
      issues.push('Agent has been working on a task for >30 minutes');
      recommendations.push('Review the current task for complexity or errors');
      recommendations.push('Consider reassigning the task to another agent');
    }

    // Check if idle
    const idleAgents = await this.getIdleAgents();
    if (idleAgents.some(a => a.agent_id === agentId)) {
      status = 'idle';
      issues.push('Agent is active but has no tasks assigned');
      recommendations.push('Assign tasks to this agent');
      recommendations.push('Consider if this agent type is needed');
    }

    // Check health score
    const healthScore = agent.health_score || 0;
    if (healthScore < 50) {
      issues.push(`Low health score: ${healthScore}/100`);
      recommendations.push('Review agent performance metrics');
      recommendations.push('Check for recurring errors or failures');
    }

    // Check success rate
    const successRate = agent.success_rate || 0;
    if (successRate < 0.7) {
      issues.push(`Low success rate: ${Math.round(successRate * 100)}%`);
      recommendations.push('Investigate common failure patterns');
      recommendations.push('Review task assignments for complexity');
    }

    return {
      agent,
      status,
      issues,
      recommendations,
    };
  }

  /**
   * Run health check on all agents and return summary
   */
  static async runHealthCheck(): Promise<{
    systemHealth: SystemHealth;
    healthyAgents: Agent[];
    idleAgents: Agent[];
    stuckAgents: Agent[];
    offlineAgents: Agent[];
    criticalIssues: string[];
  }> {
    const systemHealth = await this.getSystemHealth();
    const healthyAgents = await this.getHealthyAgents();
    const idleAgents = await this.getIdleAgents();
    const stuckAgents = await this.getStuckAgents();
    const offlineAgents = await this.getOfflineAgents();

    const criticalIssues: string[] = [];

    // Identify critical issues
    if (offlineAgents.length === systemHealth.total_agents && systemHealth.total_agents > 0) {
      criticalIssues.push('ALL AGENTS OFFLINE - System is not operational');
    }

    if (systemHealth.status === 'critical') {
      criticalIssues.push(`System health is critical: ${systemHealth.health_percentage}%`);
    }

    if (stuckAgents.length > systemHealth.total_agents * 0.5) {
      criticalIssues.push(`Over 50% of agents are stuck (${stuckAgents.length}/${systemHealth.total_agents})`);
    }

    return {
      systemHealth,
      healthyAgents,
      idleAgents,
      stuckAgents,
      offlineAgents,
      criticalIssues,
    };
  }

  /**
   * Check if a specific agent needs attention
   */
  static async agentNeedsAttention(agentId: string): Promise<boolean> {
    const report = await this.getAgentHealthReport(agentId);
    return report.issues.length > 0;
  }

  /**
   * Get agents that need attention
   */
  static async getAgentsNeedingAttention(): Promise<Agent[]> {
    const allAgents = await getAllAgents();
    const needsAttention: Agent[] = [];
    for (const agent of allAgents) {
      if (await this.agentNeedsAttention(agent.agent_id)) {
        needsAttention.push(agent);
      }
    }
    return needsAttention;
  }

  /**
   * Calculate uptime percentage for an agent
   */
  static calculateUptime(agent: Agent): number {
    if (!agent.created_at) return 100; // Assume 100% if no creation date

    const createdAt = new Date(agent.created_at).getTime();
    const now = Date.now();
    const totalTime = now - createdAt;

    if (totalTime <= 0) return 100;

    // Simple calculation: if last poll was recent, consider uptime good
    if (agent.last_poll_date) {
      const lastPoll = new Date(agent.last_poll_date).getTime();
      const timeSinceLastPoll = now - lastPoll;

      // If polled in last 5 minutes, consider 100% uptime
      if (timeSinceLastPoll < 5 * 60 * 1000) {
        return 100;
      }

      // Otherwise, calculate based on downtime
      const downtimePercentage = (timeSinceLastPoll / totalTime) * 100;
      return Math.max(0, Math.min(100, 100 - downtimePercentage));
    }

    // Never polled = 0% uptime
    return 0;
  }
}

/**
 * Quick helper to get system health
 */
export async function getSystemHealth(): Promise<SystemHealth> {
  return await AgentHealthMonitor.getSystemHealth();
}

/**
 * Quick helper to get stuck agents
 */
export async function getStuckAgents(): Promise<Agent[]> {
  return await AgentHealthMonitor.getStuckAgents();
}

/**
 * Quick helper to get offline agents
 */
export async function getOfflineAgents(): Promise<Agent[]> {
  return await AgentHealthMonitor.getOfflineAgents();
}

/**
 * Quick helper to get idle agents
 */
export async function getIdleAgents(): Promise<Agent[]> {
  return await AgentHealthMonitor.getIdleAgents();
}

/**
 * Quick helper to run full health check
 */
export async function runHealthCheck() {
  return await AgentHealthMonitor.runHealthCheck();
}
