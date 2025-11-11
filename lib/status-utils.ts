/**
 * Status and color utility functions
 * Centralized mapping for consistent UI across the app
 */

import type { TaskStatus, HealthStatus, AgentStatus } from './constants';

// Task Status Colors
export function getTaskStatusColor(status: TaskStatus | string): string {
  switch (status) {
    case 'done':
      return 'text-green-400 bg-green-900/20 border-green-500';
    case 'in-progress':
      return 'text-blue-400 bg-blue-900/20 border-blue-500';
    case 'blocked':
      return 'text-red-400 bg-red-900/20 border-red-500';
    case 'todo':
    default:
      return 'text-slate-400 bg-slate-800/20 border-slate-600';
  }
}

export function getTaskStatusLabel(status: TaskStatus | string): string {
  switch (status) {
    case 'in-progress':
      return 'In Progress';
    case 'done':
      return 'Done';
    case 'blocked':
      return 'Blocked';
    case 'todo':
    default:
      return 'To Do';
  }
}

// Health Status Colors
export function getHealthColor(status: HealthStatus | string): string {
  switch (status) {
    case 'healthy':
      return 'text-green-400 bg-green-900/20 border-green-500';
    case 'warning':
      return 'text-yellow-400 bg-yellow-900/20 border-yellow-500';
    case 'critical':
      return 'text-red-400 bg-red-900/20 border-red-500';
    default:
      return 'text-slate-400 bg-slate-800/20 border-slate-600';
  }
}

// Health Status Icons (emoji)
export function getHealthIcon(status: HealthStatus | string): string {
  switch (status) {
    case 'healthy':
      return '✓';
    case 'warning':
      return '⚠';
    case 'critical':
      return '⚠';
    default:
      return '•';
  }
}

// Agent Status Colors
export function getAgentStatusColor(status: AgentStatus | string): string {
  switch (status) {
    case 'active':
      return 'text-green-400 bg-green-900/20 border-green-500';
    case 'idle':
      return 'text-yellow-400 bg-yellow-900/20 border-yellow-500';
    case 'offline':
      return 'text-slate-400 bg-slate-800/20 border-slate-600';
    default:
      return 'text-slate-400 bg-slate-800/20 border-slate-600';
  }
}

// Activity Type Icons
export function getActivityIcon(type: string): string {
  switch (type) {
    case 'task':
      return '✓';
    case 'project':
      return '📁';
    case 'agent':
      return '🤖';
    case 'improvement':
      return '💡';
    default:
      return '•';
  }
}

// Priority Colors
export function getPriorityColor(priority: number): string {
  switch (priority) {
    case 1:
      return 'text-red-400 bg-red-900/20 border-red-500';
    case 2:
      return 'text-orange-400 bg-orange-900/20 border-orange-500';
    case 3:
      return 'text-yellow-400 bg-yellow-900/20 border-yellow-500';
    case 4:
      return 'text-blue-400 bg-blue-900/20 border-blue-500';
    case 5:
      return 'text-slate-400 bg-slate-800/20 border-slate-600';
    default:
      return 'text-slate-400 bg-slate-800/20 border-slate-600';
  }
}

export function getPriorityLabel(priority: number): string {
  switch (priority) {
    case 1:
      return 'Critical';
    case 2:
      return 'High';
    case 3:
      return 'Medium';
    case 4:
      return 'Low';
    case 5:
      return 'Minimal';
    default:
      return 'Unknown';
  }
}

// Impact Level Colors
export function getImpactColor(impact: string): string {
  switch (impact) {
    case 'high':
      return 'text-red-400';
    case 'medium':
      return 'text-amber-400';
    case 'low':
      return 'text-green-400';
    default:
      return 'text-slate-400';
  }
}
