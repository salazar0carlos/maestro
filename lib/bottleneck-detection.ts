/**
 * Bottleneck Detection
 * Identifies when agent types are overloaded and need additional capacity
 * Detects task dependency bottlenecks that cause delays
 */

import { Bottleneck, MaestroTask } from './types';
import { getAgentsByType, getAllAgents } from './agent-registry';
import { getTasks } from './storage';

/**
 * Bottleneck Detector - Main class for bottleneck detection
 */
export class BottleneckDetector {
  /**
   * Detect bottlenecks across all agent types
   */
  static detectBottlenecks(): Bottleneck[] {
    const agentTypes = this.getActiveAgentTypes();
    const bottlenecks: Bottleneck[] = [];

    for (const type of agentTypes) {
      const bottleneck = this.detectBottleneckForType(type);
      if (bottleneck) {
        bottlenecks.push(bottleneck);
      }
    }

    return bottlenecks;
  }

  /**
   * Detect bottleneck for specific agent type
   */
  static detectBottleneckForType(agentType: string): Bottleneck | null {
    const agents = getAgentsByType(agentType);
    const tasks = getTasks();

    // Filter tasks for this agent type
    const typeTasks = tasks.filter(task => {
      // If task has agent assigned, check agent type
      if (task.assigned_to_agent) {
        const taskAgent = agents.find(a => a.agent_id === task.assigned_to_agent);
        return taskAgent !== undefined;
      }

      // Otherwise, infer from task content (simple heuristic)
      const content = (task.title + ' ' + task.description).toLowerCase();
      return this.matchesAgentType(content, agentType);
    });

    const todoTasks = typeTasks.filter(t => t.status === 'todo');
    const inProgressTasks = typeTasks.filter(t => t.status === 'in-progress');

    // Bottleneck criteria: >10 tasks waiting AND agents at >90% capacity
    if (todoTasks.length <= 10) {
      return null; // Not enough backlog to be concerned
    }

    // Calculate capacity
    const totalCapacity = agents.length * 3; // Assume 3 tasks per agent max
    const currentLoad = inProgressTasks.length;

    if (currentLoad < totalCapacity * 0.9) {
      return null; // Agents not at capacity
    }

    const utilization = (currentLoad / totalCapacity) * 100;
    const estimatedDelay = this.calculateDelay(todoTasks.length, agents.length);

    return {
      agent_type: agentType,
      backlog: todoTasks.length,
      current_agents: agents.length,
      utilization: Math.round(utilization),
      recommendation: 'spawn_agent',
      estimated_delay: estimatedDelay,
    };
  }

  /**
   * Calculate estimated delay (in hours) until backlog is cleared
   */
  static calculateDelay(backlog: number, agentCount: number): number {
    if (agentCount === 0) return 999; // Infinite delay

    // Assume agents can work on 2 tasks per hour (avg 30 min per task)
    const tasksPerHour = agentCount * 2;

    if (tasksPerHour === 0) return 999;

    return Math.ceil(backlog / tasksPerHour);
  }

  /**
   * Get all active agent types
   */
  static getActiveAgentTypes(): string[] {
    const agents = getAllAgents();
    const types = new Set<string>();

    for (const agent of agents) {
      if (agent.agent_type) {
        types.add(agent.agent_type);
      }
    }

    // Add default types if not present
    const defaultTypes = ['Frontend', 'Backend', 'Testing', 'Integration'];
    for (const type of defaultTypes) {
      types.add(type);
    }

    return Array.from(types);
  }

  /**
   * Simple heuristic to match task content to agent type
   */
  static matchesAgentType(content: string, agentType: string): boolean {
    const lowerContent = content.toLowerCase();
    const lowerType = agentType.toLowerCase();

    switch (lowerType) {
      case 'frontend':
        return (
          lowerContent.includes('ui') ||
          lowerContent.includes('frontend') ||
          lowerContent.includes('react') ||
          lowerContent.includes('component') ||
          lowerContent.includes('style')
        );

      case 'backend':
        return (
          lowerContent.includes('api') ||
          lowerContent.includes('backend') ||
          lowerContent.includes('database') ||
          lowerContent.includes('server') ||
          lowerContent.includes('endpoint')
        );

      case 'testing':
        return (
          lowerContent.includes('test') ||
          lowerContent.includes('testing') ||
          lowerContent.includes('spec') ||
          lowerContent.includes('qa')
        );

      case 'integration':
        return (
          lowerContent.includes('integration') ||
          lowerContent.includes('deploy') ||
          lowerContent.includes('ci/cd') ||
          lowerContent.includes('docker')
        );

      default:
        return false;
    }
  }

  /**
   * Detect task dependency bottlenecks
   * (Tasks blocked by other tasks, creating critical path delays)
   */
  static detectDependencyBottlenecks(): Array<{
    task: MaestroTask;
    blockingTasks: string[];
    estimatedDelay: number;
  }> {
    const tasks = getTasks();
    const blockedTasks = tasks.filter(t => t.status === 'blocked');

    const bottlenecks = blockedTasks.map(task => {
      // Parse blocked_reason to find blocking task IDs
      const blockingTasks: string[] = [];

      if (task.blocked_reason) {
        // Simple parsing: look for task IDs in blocked_reason
        const taskIdPattern = /task-[a-zA-Z0-9-]+/g;
        const matches = task.blocked_reason.match(taskIdPattern);
        if (matches) {
          blockingTasks.push(...matches);
        }
      }

      // Estimate delay based on blocking tasks
      let estimatedDelay = 0;
      for (const blockingTaskId of blockingTasks) {
        const blockingTask = tasks.find(t => t.task_id === blockingTaskId);
        if (blockingTask) {
          if (blockingTask.status === 'in-progress') {
            estimatedDelay += 1; // 1 hour if in progress
          } else if (blockingTask.status === 'todo') {
            estimatedDelay += 2; // 2 hours if not started
          }
        }
      }

      return {
        task,
        blockingTasks,
        estimatedDelay,
      };
    });

    // Sort by estimated delay (highest first)
    return bottlenecks.sort((a, b) => b.estimatedDelay - a.estimatedDelay);
  }

  /**
   * Get recommendation for spawning new agents
   */
  static getSpawnRecommendations(): Array<{
    agent_type: string;
    reason: string;
    priority: 'high' | 'medium' | 'low';
    suggested_count: number;
  }> {
    const bottlenecks = this.detectBottlenecks();
    const recommendations = [];

    for (const bottleneck of bottlenecks) {
      let priority: 'high' | 'medium' | 'low';
      let suggestedCount = 1;

      if (bottleneck.utilization >= 95 && bottleneck.backlog > 20) {
        priority = 'high';
        suggestedCount = Math.ceil(bottleneck.backlog / 10); // 1 agent per 10 tasks
      } else if (bottleneck.utilization >= 90 && bottleneck.backlog > 15) {
        priority = 'medium';
        suggestedCount = Math.ceil(bottleneck.backlog / 15);
      } else {
        priority = 'low';
        suggestedCount = 1;
      }

      recommendations.push({
        agent_type: bottleneck.agent_type,
        reason: `${bottleneck.backlog} tasks waiting, ${bottleneck.utilization}% capacity, ~${bottleneck.estimated_delay}h delay`,
        priority,
        suggested_count: Math.min(suggestedCount, 3), // Max 3 at once
      });
    }

    // Sort by priority
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    recommendations.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    return recommendations;
  }

  /**
   * Check if system needs more capacity overall
   */
  static needsMoreCapacity(): boolean {
    const bottlenecks = this.detectBottlenecks();
    return bottlenecks.length > 0;
  }

  /**
   * Get capacity utilization across all agent types
   */
  static getCapacityUtilization(): Record<
    string,
    {
      agents: number;
      capacity: number;
      inProgress: number;
      todo: number;
      utilization: number;
    }
  > {
    const agentTypes = this.getActiveAgentTypes();
    const utilization: Record<string, any> = {};

    for (const type of agentTypes) {
      const agents = getAgentsByType(type);
      const tasks = getTasks();

      const typeTasks = tasks.filter(task => {
        if (task.assigned_to_agent) {
          const taskAgent = agents.find(a => a.agent_id === task.assigned_to_agent);
          return taskAgent !== undefined;
        }
        return false;
      });

      const inProgress = typeTasks.filter(t => t.status === 'in-progress').length;
      const todo = typeTasks.filter(t => t.status === 'todo').length;
      const capacity = agents.length * 3;

      utilization[type] = {
        agents: agents.length,
        capacity,
        inProgress,
        todo,
        utilization: capacity > 0 ? Math.round((inProgress / capacity) * 100) : 0,
      };
    }

    return utilization;
  }
}

/**
 * Quick helper to detect bottlenecks
 */
export function detectBottlenecks(): Bottleneck[] {
  return BottleneckDetector.detectBottlenecks();
}

/**
 * Quick helper to get spawn recommendations
 */
export function getSpawnRecommendations() {
  return BottleneckDetector.getSpawnRecommendations();
}

/**
 * Quick helper to check if system needs more capacity
 */
export function needsMoreCapacity(): boolean {
  return BottleneckDetector.needsMoreCapacity();
}

/**
 * Quick helper to get capacity utilization
 */
export function getCapacityUtilization() {
  return BottleneckDetector.getCapacityUtilization();
}
