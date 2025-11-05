/**
 * Dependency Detection for Maestro Tasks
 * Analyzes tasks to detect dependencies and optimal execution order
 *
 * Features:
 * - Automatic dependency detection
 * - Topological sorting for task ordering
 * - Circular dependency detection
 * - Parallel execution groups
 */

import { MaestroTask } from './types';

export interface TaskDependency {
  task: string;
  depends_on: string;
  reason: string;
  type: 'explicit' | 'inferred';
}

export interface TaskNode {
  task: MaestroTask;
  dependencies: string[];
  dependents: string[];
  level: number;
}

export interface ExecutionGroup {
  level: number;
  tasks: MaestroTask[];
  canRunInParallel: boolean;
}

export class DependencyDetector {
  /**
   * Analyze dependencies between tasks
   */
  static analyzeDependencies(tasks: MaestroTask[]): TaskDependency[] {
    const dependencies: TaskDependency[] = [];

    tasks.forEach(task => {
      tasks.forEach(otherTask => {
        if (task.task_id === otherTask.task_id) return;

        // Check for dependency
        const dependencyReason = this.detectDependency(task, otherTask);
        if (dependencyReason) {
          dependencies.push({
            task: task.task_id,
            depends_on: otherTask.task_id,
            reason: dependencyReason,
            type: this.isExplicitDependency(task, otherTask) ? 'explicit' : 'inferred',
          });
        }
      });
    });

    return dependencies;
  }

  /**
   * Detect if task depends on another task
   */
  private static detectDependency(
    task: MaestroTask,
    otherTask: MaestroTask
  ): string | null {
    // Frontend depends on Backend API
    if (
      task.assigned_to_agent.includes('Frontend') &&
      otherTask.assigned_to_agent.includes('Backend') &&
      this.mentionsAPI(task) &&
      this.mentionsAPI(otherTask)
    ) {
      return 'Frontend task requires backend API endpoint';
    }

    // Testing depends on implementation
    if (
      task.assigned_to_agent.includes('Testing') &&
      !otherTask.assigned_to_agent.includes('Testing') &&
      this.sharesContext(task, otherTask)
    ) {
      return 'Testing requires implementation to be complete';
    }

    // Explicit mention in description
    if (
      task.description.toLowerCase().includes(otherTask.title.toLowerCase())
    ) {
      return `Task explicitly mentions "${otherTask.title}"`;
    }

    // Deployment depends on all other tasks
    if (
      task.title.toLowerCase().includes('deploy') &&
      !otherTask.title.toLowerCase().includes('deploy')
    ) {
      return 'Deployment requires all features to be complete';
    }

    // Database migration dependencies
    if (
      this.mentionsDatabase(task) &&
      this.mentionsDatabase(otherTask) &&
      otherTask.created_date < task.created_date
    ) {
      return 'Database changes must be applied in order';
    }

    // Component dependencies (parent before child)
    if (this.isChildComponent(task, otherTask)) {
      return 'Child component depends on parent component';
    }

    return null;
  }

  /**
   * Check if dependency is explicitly stated
   */
  private static isExplicitDependency(
    task: MaestroTask,
    otherTask: MaestroTask
  ): boolean {
    const description = task.description.toLowerCase();
    const title = otherTask.title.toLowerCase();
    return description.includes(title) || description.includes(otherTask.task_id);
  }

  /**
   * Check if task mentions API
   */
  private static mentionsAPI(task: MaestroTask): boolean {
    const text = `${task.title} ${task.description}`.toLowerCase();
    return text.includes('api') ||
           text.includes('endpoint') ||
           text.includes('fetch') ||
           text.includes('request');
  }

  /**
   * Check if task mentions database
   */
  private static mentionsDatabase(task: MaestroTask): boolean {
    const text = `${task.title} ${task.description}`.toLowerCase();
    return text.includes('database') ||
           text.includes('migration') ||
           text.includes('schema') ||
           text.includes('table');
  }

  /**
   * Check if tasks share context
   */
  private static sharesContext(task1: MaestroTask, task2: MaestroTask): boolean {
    const text1 = `${task1.title} ${task1.description}`.toLowerCase();
    const text2 = `${task2.title} ${task2.description}`.toLowerCase();

    // Extract keywords (words > 4 chars)
    const keywords1 = text1.match(/\b\w{5,}\b/g) || [];
    const keywords2 = text2.match(/\b\w{5,}\b/g) || [];

    // Check for common keywords
    const commonKeywords = keywords1.filter(k => keywords2.includes(k));
    return commonKeywords.length >= 2;
  }

  /**
   * Check if task is child component of another
   */
  private static isChildComponent(
    task: MaestroTask,
    potentialParent: MaestroTask
  ): boolean {
    const taskTitle = task.title.toLowerCase();
    const parentTitle = potentialParent.title.toLowerCase();

    // Check if task mentions parent component
    return taskTitle.includes(parentTitle) && taskTitle !== parentTitle;
  }

  /**
   * Build dependency graph
   */
  static buildDependencyGraph(tasks: MaestroTask[]): Map<string, TaskNode> {
    const dependencies = this.analyzeDependencies(tasks);
    const graph = new Map<string, TaskNode>();

    // Initialize nodes
    tasks.forEach(task => {
      graph.set(task.task_id, {
        task,
        dependencies: [],
        dependents: [],
        level: 0,
      });
    });

    // Add dependencies
    dependencies.forEach(dep => {
      const node = graph.get(dep.task);
      const depNode = graph.get(dep.depends_on);

      if (node && depNode) {
        node.dependencies.push(dep.depends_on);
        depNode.dependents.push(dep.task);
      }
    });

    // Calculate levels (topological sort depth)
    this.calculateLevels(graph);

    return graph;
  }

  /**
   * Calculate execution levels for tasks
   */
  private static calculateLevels(graph: Map<string, TaskNode>): void {
    const visited = new Set<string>();

    const calculateLevel = (taskId: string): number => {
      if (visited.has(taskId)) {
        const node = graph.get(taskId);
        return node ? node.level : 0;
      }

      visited.add(taskId);
      const node = graph.get(taskId);

      if (!node || node.dependencies.length === 0) {
        return 0;
      }

      const maxDepLevel = Math.max(
        ...node.dependencies.map(depId => calculateLevel(depId))
      );

      node.level = maxDepLevel + 1;
      return node.level;
    };

    graph.forEach((_, taskId) => calculateLevel(taskId));
  }

  /**
   * Detect circular dependencies
   */
  static detectCircularDependencies(tasks: MaestroTask[]): string[][] {
    const graph = this.buildDependencyGraph(tasks);
    const cycles: string[][] = [];
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const detectCycle = (taskId: string, path: string[]): void => {
      visited.add(taskId);
      recursionStack.add(taskId);
      path.push(taskId);

      const node = graph.get(taskId);
      if (node) {
        for (const depId of node.dependencies) {
          if (!visited.has(depId)) {
            detectCycle(depId, [...path]);
          } else if (recursionStack.has(depId)) {
            // Found cycle
            const cycleStart = path.indexOf(depId);
            cycles.push(path.slice(cycleStart));
          }
        }
      }

      recursionStack.delete(taskId);
    };

    graph.forEach((_, taskId) => {
      if (!visited.has(taskId)) {
        detectCycle(taskId, []);
      }
    });

    return cycles;
  }

  /**
   * Order tasks by dependencies (topological sort)
   */
  static orderByDependencies(tasks: MaestroTask[]): MaestroTask[] {
    const graph = this.buildDependencyGraph(tasks);
    const sorted: MaestroTask[] = [];
    const visited = new Set<string>();

    const visit = (taskId: string): void => {
      if (visited.has(taskId)) return;

      visited.add(taskId);
      const node = graph.get(taskId);

      if (node) {
        // Visit dependencies first
        node.dependencies.forEach(depId => visit(depId));
        sorted.push(node.task);
      }
    };

    // Start with tasks that have no dependencies
    graph.forEach((node, taskId) => {
      if (node.dependencies.length === 0) {
        visit(taskId);
      }
    });

    // Visit remaining tasks
    graph.forEach((_, taskId) => visit(taskId));

    return sorted;
  }

  /**
   * Group tasks into parallel execution groups
   */
  static getExecutionGroups(tasks: MaestroTask[]): ExecutionGroup[] {
    const graph = this.buildDependencyGraph(tasks);
    const groups: ExecutionGroup[] = [];
    const levelMap = new Map<number, MaestroTask[]>();

    // Group tasks by level
    graph.forEach(node => {
      const level = node.level;
      if (!levelMap.has(level)) {
        levelMap.set(level, []);
      }
      levelMap.get(level)!.push(node.task);
    });

    // Create execution groups
    Array.from(levelMap.keys())
      .sort((a, b) => a - b)
      .forEach(level => {
        const tasksAtLevel = levelMap.get(level)!;
        groups.push({
          level,
          tasks: tasksAtLevel,
          canRunInParallel: tasksAtLevel.length > 1,
        });
      });

    return groups;
  }

  /**
   * Get tasks that can start immediately (no dependencies)
   */
  static getReadyTasks(tasks: MaestroTask[]): MaestroTask[] {
    const graph = this.buildDependencyGraph(tasks);
    const ready: MaestroTask[] = [];

    graph.forEach(node => {
      // No dependencies and not done
      if (
        node.dependencies.length === 0 &&
        node.task.status !== 'done'
      ) {
        ready.push(node.task);
      }
    });

    return ready;
  }

  /**
   * Get next tasks that can be started after completing a task
   */
  static getUnblockedTasks(
    tasks: MaestroTask[],
    completedTaskId: string
  ): MaestroTask[] {
    const graph = this.buildDependencyGraph(tasks);
    const completedNode = graph.get(completedTaskId);

    if (!completedNode) return [];

    const unblocked: MaestroTask[] = [];

    // Check each dependent task
    completedNode.dependents.forEach(dependentId => {
      const dependentNode = graph.get(dependentId);

      if (dependentNode && dependentNode.task.status !== 'done') {
        // Check if all dependencies are complete
        const allDepsComplete = dependentNode.dependencies.every(depId => {
          const depTask = graph.get(depId);
          return depTask && depTask.task.status === 'done';
        });

        if (allDepsComplete) {
          unblocked.push(dependentNode.task);
        }
      }
    });

    return unblocked;
  }

  /**
   * Get critical path (longest path through dependencies)
   */
  static getCriticalPath(tasks: MaestroTask[]): MaestroTask[] {
    const graph = this.buildDependencyGraph(tasks);
    let longestPath: MaestroTask[] = [];

    const findPath = (taskId: string, path: MaestroTask[]): void => {
      const node = graph.get(taskId);
      if (!node) return;

      const newPath = [...path, node.task];

      if (node.dependents.length === 0) {
        // Leaf node, check if this is longest path
        if (newPath.length > longestPath.length) {
          longestPath = newPath;
        }
      } else {
        // Continue to dependents
        node.dependents.forEach(depId => findPath(depId, newPath));
      }
    };

    // Start from root nodes (no dependencies)
    graph.forEach((node, taskId) => {
      if (node.dependencies.length === 0) {
        findPath(taskId, []);
      }
    });

    return longestPath;
  }

  /**
   * Estimate project completion time based on dependencies
   */
  static estimateCompletionTime(
    tasks: MaestroTask[],
    avgTaskHours: number = 4
  ): {
    sequential: number;
    parallel: number;
    criticalPath: number;
  } {
    const groups = this.getExecutionGroups(tasks);
    const criticalPath = this.getCriticalPath(tasks);

    return {
      sequential: tasks.length * avgTaskHours,
      parallel: groups.length * avgTaskHours,
      criticalPath: criticalPath.length * avgTaskHours,
    };
  }
}
