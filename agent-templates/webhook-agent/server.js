/**
 * Maestro Agent Webhook Server Template
 * Deploy this to Railway, Render, or any Node.js hosting platform
 *
 * Environment Variables Required:
 * - MAESTRO_URL: URL of Maestro orchestrator (e.g., https://maestro.app)
 * - WEBHOOK_SECRET: Secret for webhook signature verification
 * - AGENT_ID: Unique agent identifier
 * - AGENT_NAME: Human-readable agent name
 * - ANTHROPIC_API_KEY: Claude API key for AI execution
 * - PORT: Server port (default: 3000)
 */

const express = require('express');
const crypto = require('crypto');
const Anthropic = require('@anthropic-ai/sdk');

const app = express();
app.use(express.json());
app.use(express.raw({ type: 'application/json' }));

// Configuration
const CONFIG = {
  MAESTRO_URL: process.env.MAESTRO_URL || 'http://localhost:3000',
  WEBHOOK_SECRET: process.env.WEBHOOK_SECRET || 'default-secret-change-me',
  AGENT_ID: process.env.AGENT_ID || 'agent-1',
  AGENT_NAME: process.env.AGENT_NAME || 'Default Agent',
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
  PORT: process.env.PORT || 3000,
  MODEL: process.env.CLAUDE_MODEL || 'claude-3-5-haiku-20241022',
};

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: CONFIG.ANTHROPIC_API_KEY,
});

/**
 * Verify webhook signature
 */
function verifySignature(payload, signature) {
  if (!signature || !signature.startsWith('sha256=')) {
    return false;
  }

  const receivedSig = signature.replace('sha256=', '');
  const expectedSig = crypto
    .createHmac('sha256', CONFIG.WEBHOOK_SECRET)
    .update(payload)
    .digest('hex');

  try {
    return crypto.timingSafeEqual(
      Buffer.from(receivedSig),
      Buffer.from(expectedSig)
    );
  } catch {
    return false;
  }
}

/**
 * Execute task using Claude AI
 */
async function executeTask(taskRequest) {
  const startTime = Date.now();

  try {
    console.log(`[Agent] Executing task: ${taskRequest.task_title}`);

    // Call Claude API to execute the task
    const message = await anthropic.messages.create({
      model: CONFIG.MODEL,
      max_tokens: 4096,
      messages: [{
        role: 'user',
        content: taskRequest.ai_prompt,
      }],
    });

    const output = message.content[0].text;
    const executionTime = Date.now() - startTime;

    // Calculate cost (rough estimate)
    const inputTokens = message.usage.input_tokens;
    const outputTokens = message.usage.output_tokens;
    const cost = calculateCost(inputTokens, outputTokens);

    console.log(`[Agent] Task completed in ${executionTime}ms, cost: $${cost.toFixed(4)}`);

    return {
      success: true,
      result: {
        output,
        summary: `Task completed successfully using ${CONFIG.MODEL}`,
        cost_usd: cost,
      },
      execution_time_ms: executionTime,
    };
  } catch (error) {
    console.error(`[Agent] Task failed:`, error);

    return {
      success: false,
      error: {
        code: 'EXECUTION_FAILED',
        message: error.message,
        details: error.stack,
      },
      execution_time_ms: Date.now() - startTime,
    };
  }
}

/**
 * Calculate cost based on token usage
 */
function calculateCost(inputTokens, outputTokens) {
  // Claude 3.5 Haiku pricing
  const INPUT_COST_PER_MILLION = 0.80;
  const OUTPUT_COST_PER_MILLION = 4.00;

  const inputCost = (inputTokens / 1_000_000) * INPUT_COST_PER_MILLION;
  const outputCost = (outputTokens / 1_000_000) * OUTPUT_COST_PER_MILLION;

  return inputCost + outputCost;
}

/**
 * Report task completion back to Maestro
 */
async function reportToMaestro(taskId, result) {
  const payload = {
    task_id: taskId,
    timestamp: new Date().toISOString(),
    ...result,
  };

  const payloadString = JSON.stringify(payload);
  const signature = crypto
    .createHmac('sha256', CONFIG.WEBHOOK_SECRET)
    .update(payloadString)
    .digest('hex');

  try {
    const response = await fetch(`${CONFIG.MAESTRO_URL}/api/tasks/complete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Maestro-Signature': `sha256=${signature}`,
        'X-Agent-ID': CONFIG.AGENT_ID,
      },
      body: payloadString,
    });

    if (!response.ok) {
      console.error(`[Agent] Failed to report to Maestro: ${response.status}`);
    } else {
      console.log(`[Agent] Reported task ${taskId} completion to Maestro`);
    }
  } catch (error) {
    console.error(`[Agent] Error reporting to Maestro:`, error);
  }
}

/**
 * POST /execute
 * Main webhook endpoint - receives task from Maestro
 */
app.post('/execute', async (req, res) => {
  try {
    // Verify signature
    const signature = req.headers['x-maestro-signature'];
    const payload = JSON.stringify(req.body);

    if (!verifySignature(payload, signature)) {
      console.error('[Agent] Invalid webhook signature');
      return res.status(401).json({ error: 'Invalid signature' });
    }

    const webhookPayload = req.body;
    const taskRequest = webhookPayload.data;

    console.log(`[Agent] Received task: ${taskRequest.task_id}`);

    // Acknowledge receipt immediately
    res.json({
      success: true,
      message: 'Task received, executing...',
      agent: CONFIG.AGENT_NAME,
    });

    // Execute task asynchronously
    setImmediate(async () => {
      const result = await executeTask(taskRequest);
      await reportToMaestro(taskRequest.task_id, result);
    });
  } catch (error) {
    console.error('[Agent] Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /status
 * Status update endpoint
 */
app.post('/status', (req, res) => {
  const signature = req.headers['x-maestro-signature'];
  const payload = JSON.stringify(req.body);

  if (!verifySignature(payload, signature)) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  // Return agent status
  res.json({
    agent_id: CONFIG.AGENT_ID,
    status: 'online',
    last_seen: new Date().toISOString(),
    health: {
      uptime_seconds: process.uptime(),
      memory_percent: (process.memoryUsage().heapUsed / process.memoryUsage().heapTotal) * 100,
    },
  });
});

/**
 * GET /health
 * Health check endpoint
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    agent: CONFIG.AGENT_NAME,
    agent_id: CONFIG.AGENT_ID,
    uptime: process.uptime(),
    model: CONFIG.MODEL,
    timestamp: new Date().toISOString(),
  });
});

/**
 * GET /
 * Agent information
 */
app.get('/', (req, res) => {
  res.json({
    service: 'Maestro Agent Webhook Server',
    agent: CONFIG.AGENT_NAME,
    agent_id: CONFIG.AGENT_ID,
    model: CONFIG.MODEL,
    version: '1.0.0',
    endpoints: {
      execute: 'POST /execute',
      status: 'POST /status',
      health: 'GET /health',
    },
  });
});

// Start server
app.listen(CONFIG.PORT, () => {
  console.log('\n' + '='.repeat(50));
  console.log(`🤖 Maestro Agent: ${CONFIG.AGENT_NAME}`);
  console.log(`📍 Server: http://localhost:${CONFIG.PORT}`);
  console.log(`🔗 Maestro URL: ${CONFIG.MAESTRO_URL}`);
  console.log(`🧠 Model: ${CONFIG.MODEL}`);
  console.log('='.repeat(50) + '\n');

  // Register with Maestro on startup (optional)
  if (process.env.AUTO_REGISTER === 'true') {
    console.log('[Agent] Auto-registration enabled (not implemented yet)');
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[Agent] SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('[Agent] SIGINT received, shutting down gracefully...');
  process.exit(0);
});
