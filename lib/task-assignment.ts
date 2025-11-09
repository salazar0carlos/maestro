/**
 * Task Assignment Logic
 * Intelligent routing of tasks to agents based on capabilities, workload, and performance
 * Implements weighted scoring algorithm for optimal agent selection
 */

import { Agent, MaestroTask } from './types';
import { getAgentsByType, getAgentWorkload, getAgentById, setAgentCurrentTask } from './agent-registry';
import { getTasks, updateTask } from './storage-adapter';

/**
 * Result of task assignment attempt
 */
export interface AssignmentResult {
  success: boolean;
  agent?: Agent;
  error?: string;
  recommendation?: string;
  score?: number;
}

/**
 * Task Router - Main class for task assignment logic
 */
export class TaskRouter {
  /**
   * Find best agent for task and assign it
   */
  static async assignTaskToAgent(task: MaestroTask): Promise<AssignmentResult> {
    // Get agent type from task (or infer from task description)
    const agentType = await this.inferAgentType(task);

    // Get all available agents of this type
    const availableAgents = (await getAgentsByType(agentType)).filter(
      agent => agent.status !== 'offline'
    );

    if (availableAgents.length === 0) {
      return {
        success: false,
        error: `No available agents of type: ${agentType}`,
        recommendation: 'spawn_agent',
      };
    }

    // Score each agent
    const scored = await Promise.all(availableAgents.map(async agent => ({
      agent,
      score: await this.calculateAgentScore(agent, task),
      breakdown: await this.getScoreBreakdown(agent, task),
    })));

    // Sort by score (highest first)
    scored.sort((a, b) => b.score - a.score);

    const best = scored[0];

    // Assign task to best agent
    const updated = await updateTask(task.task_id, {
      assigned_to_agent: best.agent.agent_id,
      status: 'todo',
    });

    if (!updated) {
      return {
        success: false,
        error: 'Failed to update task',
      };
    }

    return {
      success: true,
      agent: best.agent,
      score: best.score,
    };
  }

  /**
   * Calculate agent score for task assignment (0-100)
   */
  static async calculateAgentScore(agent: Agent, task: MaestroTask): Promise<number> {
    const breakdown = await this.getScoreBreakdown(agent, task);

    return (
      breakdown.workload +
      breakdown.successRate +
      breakdown.capabilities +
      breakdown.speed
    );
  }

  /**
   * Get detailed score breakdown
   */
  static async getScoreBreakdown(agent: Agent, task: MaestroTask): Promise<{
    workload: number;
    successRate: number;
    capabilities: number;
    speed: number;
  }> {
    // Workload score (0-40 points) - prefer agents with lower workload
    const workload = await getAgentWorkload(agent.agent_id);
    const workloadScore = Math.max(0, (10 - Math.min(workload.todo, 10)) * 4);

    // Success rate score (0-30 points)
    const successRate = (agent.success_rate || 1.0) * 30;

    // Capabilities score (0-20 points)
    let capabilitiesScore = 0;
    if (task.ai_prompt && agent.capabilities && agent.capabilities.length > 0) {
      // Check if task requires specific capabilities (simple keyword matching)
      const taskLower = (task.title + ' ' + task.description + ' ' + task.ai_prompt).toLowerCase();

      const matchingCaps = agent.capabilities.filter(cap =>
        taskLower.includes(cap.toLowerCase())
      );

      capabilitiesScore = Math.min(20, matchingCaps.length * 10);
    } else {
      // If no specific capabilities required or agent has none, give neutral score
      capabilitiesScore = 10;
    }

    // Speed score (0-10 points) - prefer faster agents
    const avgTime = agent.average_task_time || 3600000;
    let speedScore = 0;
    if (avgTime < 1800000) {
      // < 30 min
      speedScore = 10;
    } else if (avgTime < 3600000) {
      // < 1 hour
      speedScore = 7;
    } else if (avgTime < 7200000) {
      // < 2 hours
      speedScore = 5;
    } else {
      speedScore = 2;
    }

    return {
      workload: workloadScore,
      successRate: successRate,
      capabilities: capabilitiesScore,
      speed: speedScore,
    };
  }

  /**
   * Infer agent type from task
   */
  static async inferAgentType(task: MaestroTask): Promise<string> {
    // If task already has an agent assigned, use that agent's type
    if (task.assigned_to_agent) {
      const agent = await getAgentById(task.assigned_to_agent);
      if (agent && agent.agent_type) {
        return agent.agent_type;
      }
    }

    // Otherwise, infer from task content
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

    // Default to general purpose
    return 'Backend'; // Backend as default since it's most common
  }

  /**
   * Re-assign stuck tasks to different agents
   */
  static async reassignStuckTasks(): Promise<AssignmentResult[]> {
    const results: AssignmentResult[] = [];

    // Find tasks stuck in progress for >2 hours
    const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000;
    const tasks = await getTasks();

    const stuckTasks = tasks.filter(task => {
      if (task.status !== 'in-progress') return false;
      if (!task.started_date) return false;

      const startedAt = new Date(task.started_date).getTime();
      return startedAt < twoHoursAgo;
    });

    // Re-assign each stuck task
    for (const task of stuckTasks) {
      // Mark original agent as having an issue
      if (task.assigned_to_agent) {
        const originalAgent = await getAgentById(task.assigned_to_agent);
        if (originalAgent) {
          // Clear current task
          await setAgentCurrentTask(task.assigned_to_agent, undefined);
        }
      }

      // Reset task to todo status
      await updateTask(task.task_id, {
        status: 'todo',
        assigned_to_agent: '', // Clear assignment
      });

      // Assign to new agent
      const result = await this.assignTaskToAgent(task);
      results.push(result);
    }

    return results;
  }

  /**
   * Batch assign multiple tasks
   */
  static async batchAssignTasks(tasks: MaestroTask[]): Promise<AssignmentResult[]> {
    return await Promise.all(tasks.map(task => this.assignTaskToAgent(task)));
  }

  /**
   * Get task assignment recommendations for unassigned tasks
   */
  static async getAssignmentRecommendations(): Promise<Array<{
    task: MaestroTask;
    recommendedAgent: Agent | null;
    score: number;
    reason: string;
  }>> {
    const unassignedTasks = (await getTasks()).filter(
      task => task.status === 'todo' && !task.assigned_to_agent
    );

    return await Promise.all(unassignedTasks.map(async task => {
      const agentType = await this.inferAgentType(task);
      const availableAgents = await getAgentsByType(agentType);

      if (availableAgents.length === 0) {
        return {
          task,
          recommendedAgent: null,
          score: 0,
          reason: `No agents available for type: ${agentType}`,
        };
      }

      const scored = await Promise.all(availableAgents.map(async agent => ({
        agent,
        score: await this.calculateAgentScore(agent, task),
      })));

      scored.sort((a, b) => b.score - a.score);
      const best = scored[0];

      return {
        task,
        recommendedAgent: best.agent,
        score: best.score,
        reason: `Best match based on workload, success rate, and capabilities`,
      };
    }));
  }
}

/**
 * Quick helper to assign a single task
 */
export async function assignTask(taskId: string): Promise<AssignmentResult> {
  const tasks = await getTasks();
  const task = tasks.find(t => t.task_id === taskId);

  if (!task) {
    return {
      success: false,
      error: 'Task not found',
    };
  }

  return await TaskRouter.assignTaskToAgent(task);
}

/**
 * Quick helper to reassign stuck tasks
 */
export async function reassignStuckTasks(): Promise<AssignmentResult[]> {
  return await TaskRouter.reassignStuckTasks();
}
