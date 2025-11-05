/**
 * Base Worker Class for BullMQ Agents
 *
 * Replaces webhook architecture with queue-based workers
 * - Automatic retries
 * - Progress tracking
 * - Error handling
 * - API key management
 */

import { Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import Anthropic from '@anthropic-ai/sdk';
import type { MaestroTask } from './types';
import fs from 'fs';
import path from 'path';

// Redis connection configuration
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD || undefined,
  db: parseInt(process.env.REDIS_DB || '0'),
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
};

export interface WorkerConfig {
  agentType: string;
  queueName: string;
  concurrency?: number;
  capabilities: string[];
}

export class BaseWorker {
  protected worker: Worker;
  protected agentType: string;
  protected capabilities: string[];
  protected anthropic: Anthropic | null = null;

  constructor(config: WorkerConfig) {
    this.agentType = config.agentType;
    this.capabilities = config.capabilities;

    // Create worker
    this.worker = new Worker(
      config.queueName,
      async (job: Job) => await this.processJob(job),
      {
        connection: new IORedis(redisConfig),
        concurrency: config.concurrency || parseInt(process.env.QUEUE_CONCURRENCY || '5'),
        limiter: {
          max: 10,  // Max 10 jobs
          duration: 60000,  // Per minute
        },
      }
    );

    // Initialize Anthropic client
    this.initializeAnthropicClient();

    // Setup event listeners
    this.setupEventListeners();

    this.log(`Worker initialized for ${config.agentType}`, 'info');
  }

  /**
   * Initialize Anthropic client with API key from environment or settings
   */
  protected initializeAnthropicClient(): void {
    try {
      // First try environment variable
      let apiKey = process.env.ANTHROPIC_API_KEY;

      // If not in env, try to read from settings file (where UI saves it)
      if (!apiKey) {
        const settingsPath = path.join(process.cwd(), 'data', 'settings.json');
        if (fs.existsSync(settingsPath)) {
          const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
          apiKey = settings.anthropic_api_key;
        }
      }

      // Try localStorage path (for browser-saved keys) - read from Next.js data dir
      if (!apiKey && typeof window === 'undefined') {
        // Server-side: try to read from a shared config
        const configPath = path.join(process.cwd(), '.maestro-config.json');
        if (fs.existsSync(configPath)) {
          const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
          apiKey = config.anthropic_api_key;
        }
      }

      if (!apiKey) {
        this.log('WARNING: No Anthropic API key found. Set ANTHROPIC_API_KEY environment variable or save in UI settings.', 'warn');
        return;
      }

      this.anthropic = new Anthropic({ apiKey });
      this.log('Anthropic client initialized', 'info');

    } catch (error) {
      this.log(`Failed to initialize Anthropic client: ${error}`, 'error');
    }
  }

  /**
   * Process a job from the queue
   */
  protected async processJob(job: Job): Promise<any> {
    const { taskId, task } = job.data;

    this.log(`Processing task ${taskId}`, 'info');

    try {
      // Update task status to in-progress
      await job.updateProgress(10);
      this.updateTaskStatus(taskId, 'in-progress');

      // Execute task with Claude
      await job.updateProgress(30);
      const result = await this.executeTask(task, job);

      // Update task status to completed
      await job.updateProgress(100);
      this.updateTaskStatus(taskId, 'done', result);

      this.log(`Task ${taskId} completed successfully`, 'info');

      return { success: true, taskId, result };

    } catch (error) {
      this.log(`Task ${taskId} failed: ${error}`, 'error');

      // Update task status to blocked
      this.updateTaskStatus(taskId, 'blocked', {
        error: error instanceof Error ? error.message : 'Unknown error',
        attempt: job.attemptsMade,
      });

      throw error;  // Let BullMQ handle retries
    }
  }

  /**
   * Execute task using Claude API
   * Override this in subclasses for agent-specific behavior
   */
  protected async executeTask(task: MaestroTask, job: Job): Promise<any> {
    if (!this.anthropic) {
      throw new Error('Anthropic client not initialized. Please set API key.');
    }

    await job.updateProgress(50);

    // Call Claude API
    const response = await this.anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 4096,
      messages: [{
        role: 'user',
        content: this.buildPrompt(task),
      }],
    });

    await job.updateProgress(80);

    // Extract response
    const result = response.content[0].type === 'text'
      ? response.content[0].text
      : 'No text response';

    return {
      response: result,
      usage: response.usage,
    };
  }

  /**
   * Build prompt for Claude
   * Override this in subclasses for agent-specific prompts
   */
  protected buildPrompt(task: MaestroTask): string {
    return `
You are a ${this.agentType} Agent with expertise in: ${this.capabilities.join(', ')}.

Task: ${task.title}
Description: ${task.description}

${task.ai_prompt}

Please complete this task and provide detailed output.
    `.trim();
  }

  /**
   * Update task status in storage
   */
  protected updateTaskStatus(taskId: string, status: string, metadata?: any): void {
    try {
      // Note: This will need to be called from a browser context or API route
      // For now, just log it. The API routes will handle actual updates.
      this.log(`Update task ${taskId} status: ${status}`, 'info');

      if (metadata) {
        this.log(`Metadata: ${JSON.stringify(metadata)}`, 'debug');
      }

    } catch (error) {
      this.log(`Failed to update task status: ${error}`, 'error');
    }
  }

  /**
   * Setup event listeners for worker
   */
  protected setupEventListeners(): void {
    this.worker.on('completed', (job) => {
      this.log(`Job ${job.id} completed`, 'info');
    });

    this.worker.on('failed', (job, error) => {
      this.log(`Job ${job?.id} failed: ${error.message}`, 'error');
    });

    this.worker.on('error', (error) => {
      this.log(`Worker error: ${error.message}`, 'error');
    });

    this.worker.on('stalled', (jobId) => {
      this.log(`Job ${jobId} stalled`, 'warn');
    });
  }

  /**
   * Logging helper
   */
  protected log(message: string, level: 'info' | 'warn' | 'error' | 'debug' = 'info'): void {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${this.agentType} Worker]`;

    switch (level) {
      case 'error':
        console.error(`${prefix} ❌ ${message}`);
        break;
      case 'warn':
        console.warn(`${prefix} ⚠️  ${message}`);
        break;
      case 'debug':
        if (process.env.LOG_LEVEL === 'debug') {
          console.log(`${prefix} 🔍 ${message}`);
        }
        break;
      default:
        console.log(`${prefix} ${message}`);
    }
  }

  /**
   * Graceful shutdown
   */
  async close(): Promise<void> {
    await this.worker.close();
    this.log('Worker closed', 'info');
  }
}
