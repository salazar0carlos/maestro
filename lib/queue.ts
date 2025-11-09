/**
 * BullMQ Task Queue System
 *
 * Production-grade task queue with:
 * - Automatic retries with exponential backoff
 * - Priority queues
 * - Rate limiting
 * - Progress tracking
 * - Dead letter queue for failed tasks
 * - Persistent storage (survives crashes)
 */

import { Queue, QueueOptions } from 'bullmq';
import IORedis from 'ioredis';
import type { MaestroTask } from './types';

// Redis connection configuration
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD || undefined,
  db: parseInt(process.env.REDIS_DB || '0'),
  maxRetriesPerRequest: null,  // Required for BullMQ
  enableReadyCheck: false,
};

// Lazy connection and queue initialization (avoid build-time Redis connection)
let redisConnection: IORedis | null = null;
let _queues: Record<string, Queue> | null = null;

function getRedisConnection(): IORedis {
  if (!redisConnection) {
    redisConnection = new IORedis(redisConfig);
  }
  return redisConnection;
}

function getQueueOptions(): QueueOptions {
  return {
    connection: getRedisConnection(),
    defaultJobOptions: {
      attempts: parseInt(process.env.QUEUE_MAX_RETRIES || '3'),
      backoff: {
        type: 'exponential',
        delay: parseInt(process.env.QUEUE_RETRY_DELAY || '2000'),
      },
      removeOnComplete: {
        age: 86400, // Keep completed jobs for 24 hours
        count: 1000, // Keep max 1000 completed jobs
      },
      removeOnFail: {
        age: 604800, // Keep failed jobs for 7 days
        count: 5000, // Keep max 5000 failed jobs
      },
    },
  };
}

// Lazy queue initialization
export const queues = new Proxy({} as Record<string, Queue>, {
  get(_target, prop: string) {
    if (!_queues) {
      const queueOptions = getQueueOptions();
      _queues = {
        frontend: new Queue('maestro-frontend', queueOptions),
        backend: new Queue('maestro-backend', queueOptions),
        testing: new Queue('maestro-testing', queueOptions),
        devops: new Queue('maestro-devops', queueOptions),
        documentation: new Queue('maestro-documentation', queueOptions),
        data: new Queue('maestro-data', queueOptions),
        security: new Queue('maestro-security', queueOptions),
      };
    }
    return _queues[prop];
  }
});

// Type for agent types
export type AgentType = keyof typeof queues;

/**
 * Add a task to the appropriate queue
 */
export async function enqueueTask(task: MaestroTask): Promise<void> {
  try {
    // Determine agent type from task
    const agentType = (task.assigned_to_agent_type?.toLowerCase() || 'backend') as AgentType;

    // Get the appropriate queue
    const queue = queues[agentType] || queues.backend;

    // Add task to queue with options
    await queue.add(
      'execute',  // Job name
      {
        taskId: task.task_id,
        task,
      },
      {
        jobId: task.task_id,  // Use task ID as job ID for idempotency
        priority: task.priority || 3,  // Higher number = lower priority
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      }
    );

    console.log(`[Queue] Enqueued task ${task.task_id} to ${agentType} queue`);

  } catch (error) {
    console.error('[Queue] Failed to enqueue task:', error);
    throw error;
  }
}

/**
 * Remove a task from all queues
 */
export async function removeTask(taskId: string): Promise<void> {
  try {
    for (const queue of Object.values(queues)) {
      const job = await queue.getJob(taskId);
      if (job) {
        await job.remove();
        console.log(`[Queue] Removed task ${taskId} from queue`);
      }
    }
  } catch (error) {
    console.error('[Queue] Failed to remove task:', error);
    throw error;
  }
}

/**
 * Get task status from queue
 */
export async function getTaskStatus(taskId: string): Promise<{
  state: string;
  progress: number;
  attempts: number;
  error?: string;
} | null> {
  try {
    for (const queue of Object.values(queues)) {
      const job = await queue.getJob(taskId);
      if (job) {
        const state = await job.getState();
        return {
          state,
          progress: typeof job.progress === 'number' ? job.progress : 0,
          attempts: job.attemptsMade,
          error: job.failedReason,
        };
      }
    }
    return null;
  } catch (error) {
    console.error('[Queue] Failed to get task status:', error);
    return null;
  }
}

/**
 * Pause all queues
 */
export async function pauseAllQueues(): Promise<void> {
  for (const queue of Object.values(queues)) {
    await queue.pause();
  }
  console.log('[Queue] All queues paused');
}

/**
 * Resume all queues
 */
export async function resumeAllQueues(): Promise<void> {
  for (const queue of Object.values(queues)) {
    await queue.resume();
  }
  console.log('[Queue] All queues resumed');
}

/**
 * Get queue statistics
 */
export async function getQueueStats(agentType: AgentType) {
  const queue = queues[agentType];

  const [waiting, active, completed, failed, delayed] = await Promise.all([
    queue.getWaitingCount(),
    queue.getActiveCount(),
    queue.getCompletedCount(),
    queue.getFailedCount(),
    queue.getDelayedCount(),
  ]);

  return {
    agentType,
    waiting,
    active,
    completed,
    failed,
    delayed,
    total: waiting + active + completed + failed + delayed,
  };
}

/**
 * Get all queue statistics
 */
export async function getAllQueueStats() {
  const stats = await Promise.all(
    Object.keys(queues).map(type => getQueueStats(type as AgentType))
  );

  return stats;
}

/**
 * Clean old jobs from all queues
 */
export async function cleanAllQueues(): Promise<void> {
  for (const queue of Object.values(queues)) {
    await queue.clean(86400000, 1000, 'completed');  // 24 hours, max 1000 jobs
    await queue.clean(604800000, 5000, 'failed');    // 7 days, max 5000 jobs
  }
  console.log('[Queue] All queues cleaned');
}

/**
 * Graceful shutdown - close all connections
 */
export async function closeQueues(): Promise<void> {
  if (_queues) {
    for (const queue of Object.values(_queues)) {
      await queue.close();
    }
  }
  if (redisConnection) {
    await redisConnection.quit();
  }
  console.log('[Queue] All queues closed');
}

// Export queue names for workers
export const QUEUE_NAMES = {
  FRONTEND: 'maestro-frontend',
  BACKEND: 'maestro-backend',
  TESTING: 'maestro-testing',
  DEVOPS: 'maestro-devops',
  DOCUMENTATION: 'maestro-documentation',
  DATA: 'maestro-data',
  SECURITY: 'maestro-security',
} as const;
