#!/usr/bin/env node

/**
 * Frontend Agent Worker
 *
 * Processes frontend-related tasks from BullMQ queue:
 * - UI components
 * - React development
 * - Styling and CSS
 * - Frontend architecture
 */

const { Worker } = require('bullmq');
const Anthropic = require('@anthropic-ai/sdk');
require('dotenv').config();

const AGENT_TYPE = 'Frontend';
const QUEUE_NAME = 'maestro-frontend';
const API_KEY = process.env.ANTHROPIC_API_KEY;

if (!API_KEY) {
  console.error('[Frontend Agent] ERROR: ANTHROPIC_API_KEY not set');
  process.exit(1);
}

const anthropic = new Anthropic({ apiKey: API_KEY });

// Redis connection configuration
const redisConnection = {
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  maxRetriesPerRequest: null,
};

console.log(`[${AGENT_TYPE} Agent] Starting worker...`);
console.log(`[${AGENT_TYPE} Agent] Queue: ${QUEUE_NAME}`);
console.log(`[${AGENT_TYPE} Agent] Redis: ${redisConnection.host}:${redisConnection.port}`);

// Create worker
const worker = new Worker(
  QUEUE_NAME,
  async (job) => {
    const { task } = job.data;

    console.log(`\n[${AGENT_TYPE} Agent] 🔨 Processing task: ${task.task_id}`);
    console.log(`[${AGENT_TYPE} Agent] Title: ${task.title}`);

    try {
      // Update task status to in-progress
      await updateTaskStatus(task.task_id, 'in-progress');

      // Build prompt for Claude
      const prompt = buildPrompt(task);

      console.log(`[${AGENT_TYPE} Agent] 🤖 Calling Claude API...`);

      // Call Claude API
      const message = await anthropic.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 4096,
        messages: [{
          role: 'user',
          content: prompt
        }]
      });

      const response = message.content[0].text;

      console.log(`[${AGENT_TYPE} Agent] ✅ Task completed`);
      console.log(`[${AGENT_TYPE} Agent] Response preview: ${response.substring(0, 200)}...`);

      // Update task status to done with AI response
      await updateTaskStatus(task.task_id, 'done', response);

      return { success: true, response };

    } catch (error) {
      console.error(`[${AGENT_TYPE} Agent] ❌ Error processing task:`, error.message);

      // Update task status to blocked
      await updateTaskStatus(task.task_id, 'blocked', null, error.message);

      throw error;
    }
  },
  {
    connection: redisConnection,
    concurrency: 2,
  }
);

function buildPrompt(task) {
  return `You are a Frontend Development Agent specialized in UI, React, and styling.

Task: ${task.title}
${task.description ? `Description: ${task.description}` : ''}

${task.ai_prompt || 'Please complete this task with high-quality frontend code and best practices.'}

Provide a detailed implementation with:
- Clean, well-structured code
- Best practices for React/frontend development
- Proper error handling
- Comments explaining key decisions
`;
}

async function updateTaskStatus(taskId, status, aiResponse = null, blockedReason = null) {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
    const url = `${apiUrl}/api/tasks/${taskId}/status`;

    const body = { status };
    if (aiResponse) body.ai_response = aiResponse;
    if (blockedReason) body.blocked_reason = blockedReason;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      console.error(`[${AGENT_TYPE} Agent] Failed to update task status:`, await response.text());
    }
  } catch (error) {
    console.error(`[${AGENT_TYPE} Agent] Error updating task status:`, error.message);
  }
}

worker.on('completed', (job) => {
  console.log(`[${AGENT_TYPE} Agent] ✓ Job ${job.id} completed successfully`);
});

worker.on('failed', (job, err) => {
  console.error(`[${AGENT_TYPE} Agent] ✗ Job ${job?.id} failed:`, err.message);
});

worker.on('error', (err) => {
  console.error(`[${AGENT_TYPE} Agent] Worker error:`, err);
});

process.on('SIGTERM', async () => {
  console.log(`\n[${AGENT_TYPE} Agent] Received SIGTERM, shutting down gracefully...`);
  await worker.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log(`\n[${AGENT_TYPE} Agent] Received SIGINT, shutting down gracefully...`);
  await worker.close();
  process.exit(0);
});

console.log(`[${AGENT_TYPE} Agent] ✓ Worker started successfully, waiting for jobs...`);
