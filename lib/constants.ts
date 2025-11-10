/**
 * Application-wide constants
 * Centralized location for magic strings and numbers
 */

// Task Statuses
export const TASK_STATUS = {
  TODO: 'todo',
  IN_PROGRESS: 'in-progress',
  DONE: 'done',
  BLOCKED: 'blocked',
} as const;

export type TaskStatus = (typeof TASK_STATUS)[keyof typeof TASK_STATUS];

// Project Statuses
export const PROJECT_STATUS = {
  ACTIVE: 'active',
  PAUSED: 'paused',
  COMPLETE: 'complete',
} as const;

export type ProjectStatus = (typeof PROJECT_STATUS)[keyof typeof PROJECT_STATUS];

// Agent Statuses
export const AGENT_STATUS = {
  ACTIVE: 'active',
  IDLE: 'idle',
  OFFLINE: 'offline',
} as const;

export type AgentStatus = (typeof AGENT_STATUS)[keyof typeof AGENT_STATUS];

// Priority Levels
export const PRIORITY = {
  CRITICAL: 1,
  HIGH: 2,
  MEDIUM: 3,
  LOW: 4,
  MINIMAL: 5,
} as const;

export type Priority = (typeof PRIORITY)[keyof typeof PRIORITY];

// Health Statuses
export const HEALTH_STATUS = {
  HEALTHY: 'healthy',
  WARNING: 'warning',
  CRITICAL: 'critical',
} as const;

export type HealthStatus = (typeof HEALTH_STATUS)[keyof typeof HEALTH_STATUS];

// Improvement Statuses
export const IMPROVEMENT_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  IMPLEMENTED: 'implemented',
} as const;

export type ImprovementStatus = (typeof IMPROVEMENT_STATUS)[keyof typeof IMPROVEMENT_STATUS];

// Impact Levels
export const IMPACT_LEVEL = {
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low',
} as const;

export type ImpactLevel = (typeof IMPACT_LEVEL)[keyof typeof IMPACT_LEVEL];

// Agent Types
export const AGENT_TYPE = {
  FRONTEND: 'frontend',
  BACKEND: 'backend',
  TESTING: 'testing',
  RESEARCH: 'research',
  PRODUCT_IMPROVEMENT: 'product-improvement',
  SUPERVISOR: 'supervisor',
} as const;

export type AgentType = (typeof AGENT_TYPE)[keyof typeof AGENT_TYPE];

// Activity Types
export const ACTIVITY_TYPE = {
  TASK: 'task',
  AGENT: 'agent',
  PROJECT: 'project',
  IMPROVEMENT: 'improvement',
} as const;

export type ActivityType = (typeof ACTIVITY_TYPE)[keyof typeof ACTIVITY_TYPE];
