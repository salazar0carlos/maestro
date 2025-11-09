#!/usr/bin/env node

const { Worker } = require('bullmq');
const Anthropic = require('@anthropic-ai/sdk');
require('dotenv').config();

const AGENT_TYPE = 'Testing';
const QUEUE_NAME = 'maestro-testing';
const API_KEY = process.env.ANTHROPIC_API_KEY;

if (!API_KEY) {
  console.error('[Testing Agent] ERROR: ANTHROPIC_API_KEY not set');
  process.exit(1);
}

const anthropic = new Anthropic({ apiKey: API_KEY });

const redisConnection = {
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  maxRetriesPerRequest: null,
};

console.log(`[${AGENT_TYPE} Agent] Starting worker...`);
console.log(`[${AGENT_TYPE} Agent] Queue: ${QUEUE_NAME}`);

const worker = new Worker(
  QUEUE_NAME,
  async (job) => {
    const { task } = job.data;

    console.log(`\n[${AGENT_TYPE} Agent] 🔨 Processing task: ${task.task_id}`);
    console.log(`[${AGENT_TYPE} Agent] Title: ${task.title}`);

    try {
      await updateTaskStatus(task.task_id, 'in-progress');

      const prompt = `You are a Testing Agent specialized in writing comprehensive tests.

Task: ${task.title}
${task.description ? `Description: ${task.description}` : ''}

${task.ai_prompt || 'Please create comprehensive tests for this functionality.'}

Provide:
- Unit tests with high coverage
- Integration tests where applicable
- Edge cases and error scenarios
- Clear test descriptions
- Mock data and fixtures as needed
`;

      console.log(`[${AGENT_TYPE} Agent] 🤖 Calling Claude API...`);

      const message = await anthropic.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 4096,
        messages: [{ role: 'user', content: prompt }]
      });

      const response = message.content[0].text;

      console.log(`[${AGENT_TYPE} Agent] ✅ Task completed`);
      console.log(`[${AGENT_TYPE} Agent] Response preview: ${response.substring(0, 200)}...`);

      await updateTaskStatus(task.task_id, 'done', response);

      return { success: true, response };

    } catch (error) {
      console.error(`[${AGENT_TYPE} Agent] ❌ Error:`, error.message);
      await updateTaskStatus(task.task_id, 'blocked', null, error.message);
      throw error;
    }
  },
  { connection: redisConnection, concurrency: 1 }
);

async function updateTaskStatus(taskId, status, aiResponse = null, blockedReason = null) {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
    const body = { status };
    if (aiResponse) body.ai_response = aiResponse;
    if (blockedReason) body.blocked_reason = blockedReason;

    const response = await fetch(`${apiUrl}/api/tasks/${taskId}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      console.error(`[${AGENT_TYPE} Agent] Failed to update task status`);
    }
  } catch (error) {
    console.error(`[${AGENT_TYPE} Agent] Error updating task status:`, error.message);
  }
}

worker.on('completed', (job) => console.log(`[${AGENT_TYPE} Agent] ✓ Job ${job.id} completed`));
worker.on('failed', (job, err) => console.error(`[${AGENT_TYPE} Agent] ✗ Job ${job?.id} failed:`, err.message));
worker.on('error', (err) => console.error(`[${AGENT_TYPE} Agent] Worker error:`, err));

process.on('SIGTERM', async () => {
  console.log(`\n[${AGENT_TYPE} Agent] Shutting down...`);
  await worker.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log(`\n[${AGENT_TYPE} Agent] Shutting down...`);
  await worker.close();
  process.exit(0);
});

console.log(`[${AGENT_TYPE} Agent] ✓ Worker started successfully, waiting for jobs...`);
