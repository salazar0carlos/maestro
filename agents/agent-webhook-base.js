/**
 * Webhook-Based Agent Base Class
 *
 * Event-driven architecture - agents are dormant until triggered by webhooks
 * Zero cost when idle, instant response when work arrives
 *
 * Usage:
 *   const agent = new WebhookAgent('frontend-agent', 'Frontend', anthropicApiKey);
 *   agent.startWebhookServer(3001);
 */

const http = require('http');

class WebhookAgent {
  constructor(agentName, agentType, maestroUrl = 'http://localhost:3000', anthropicApiKey = '') {
    this.agentName = agentName;
    this.agentType = agentType;
    this.maestroUrl = maestroUrl;
    this.anthropicApiKey = anthropicApiKey;
    this.tasksProcessed = 0;
    this.tasksFailed = 0;
    this.startTime = new Date();
    this.server = null;
  }

  /**
   * Start webhook server to receive task triggers
   * @param {number} port - Port to listen on
   */
  startWebhookServer(port = 3001) {
    this.server = http.createServer(async (req, res) => {
      // CORS headers
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Maestro-Task-Id, X-Maestro-Agent-Type');

      // Handle OPTIONS preflight
      if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
      }

      // Only accept POST to /execute
      if (req.method !== 'POST' || req.url !== '/execute') {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Not found' }));
        return;
      }

      // Parse request body
      let body = '';
      req.on('data', chunk => {
        body += chunk.toString();
      });

      req.on('end', async () => {
        try {
          const payload = JSON.parse(body);
          const { taskId, task } = payload;

          if (!taskId || !task) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Missing taskId or task' }));
            return;
          }

          this.log(`Received webhook trigger for task: ${taskId}`, 'info');

          // Execute task asynchronously
          this.executeTaskAsync(task).catch(error => {
            this.log(`Async execution error: ${error.message}`, 'error');
          });

          // Return immediately (webhook pattern)
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: true,
            message: 'Task execution started',
            taskId,
            agent: this.agentName,
          }));

        } catch (error) {
          this.log(`Webhook error: ${error.message}`, 'error');
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: error.message }));
        }
      });
    });

    this.server.listen(port, () => {
      this.log(`Webhook server listening on port ${port}`, 'info');
      this.log(`Endpoint: http://localhost:${port}/execute`, 'info');
      this.log('Agent is dormant. Waiting for webhook triggers...', 'info');
    });

    // Handle graceful shutdown
    process.on('SIGINT', () => {
      this.log('Received SIGINT, shutting down gracefully...', 'warn');
      this.logStats();
      this.server.close(() => {
        this.log('Server closed', 'info');
        process.exit(0);
      });
    });
  }

  /**
   * Execute task asynchronously (non-blocking)
   */
  async executeTaskAsync(task) {
    try {
      this.log(`Executing task ${task.task_id}...`, 'info');

      // Mark task as in-progress
      await this.updateTaskStatus(task.task_id, 'in-progress');

      // Execute with retry logic
      const result = await this.executeTaskWithRetry(task, 3);

      // Mark task as complete
      await this.completeTask(task.task_id, result);

      this.log(`Task ${task.task_id} completed successfully`, 'info');
    } catch (error) {
      this.log(`Task ${task.task_id} failed: ${error.message}`, 'error');
      this.tasksFailed++;
    }
  }

  /**
   * Execute a task using Claude API
   */
  async executeTask(task) {
    try {
      const systemPrompt = this.getSystemPrompt();

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.anthropicApiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 8000,
          system: systemPrompt,
          messages: [
            {
              role: 'user',
              content: task.ai_prompt || task.description || task.title,
            },
          ],
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || `HTTP ${response.status}`);
      }

      const data = await response.json();
      const content = data.content?.[0]?.text || '';

      return {
        status: 'success',
        content: content,
        taskId: task.task_id,
      };
    } catch (error) {
      this.log(`Error executing task ${task.task_id}: ${error.message}`, 'error');
      return {
        status: 'error',
        error: error.message,
        taskId: task.task_id,
      };
    }
  }

  /**
   * Get agent-specific system prompt
   * Override in subclasses
   */
  getSystemPrompt() {
    return `You are a ${this.agentType} agent. Execute tasks efficiently and accurately.`;
  }

  /**
   * Execute task with retry logic
   */
  async executeTaskWithRetry(task, maxRetries = 3) {
    let lastError;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await this.executeTask(task);

        if (result.status === 'success') {
          return result;
        }

        lastError = result.error;

        if (attempt < maxRetries) {
          const delayMs = Math.pow(2, attempt - 1) * 1000;
          this.log(`Retry in ${delayMs}ms`, 'warn');
          await this.delay(delayMs);
        }
      } catch (error) {
        lastError = error.message;
        if (attempt < maxRetries) {
          const delayMs = Math.pow(2, attempt - 1) * 1000;
          await this.delay(delayMs);
        }
      }
    }

    return {
      status: 'error',
      error: `Failed after ${maxRetries} attempts: ${lastError}`,
      taskId: task.task_id,
    };
  }

  /**
   * Update task status in Maestro
   */
  async updateTaskStatus(taskId, status) {
    try {
      const response = await fetch(`${this.maestroUrl}/api/tasks/${taskId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      this.log(`Failed to update task status: ${error.message}`, 'error');
    }
  }

  /**
   * Mark task as complete
   */
  async completeTask(taskId, result) {
    try {
      const response = await fetch(`${this.maestroUrl}/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: result.status === 'success' ? 'done' : 'blocked',
          ai_response: result.content || result.error || '',
          completed_by_agent: this.agentName,
          completed_date: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      this.tasksProcessed++;
    } catch (error) {
      this.log(`Failed to complete task: ${error.message}`, 'error');
      this.tasksFailed++;
    }
  }

  /**
   * Utility delay function
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Log message with timestamp
   */
  log(message, level = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${this.agentName}] [${level.toUpperCase()}]`;
    console.log(`${prefix} ${message}`);
  }

  /**
   * Get agent statistics
   */
  getStats() {
    const uptime = new Date() - this.startTime;
    return {
      agentName: this.agentName,
      agentType: this.agentType,
      tasksProcessed: this.tasksProcessed,
      tasksFailed: this.tasksFailed,
      uptime: `${Math.floor(uptime / 1000)}s`,
    };
  }

  /**
   * Log statistics
   */
  logStats() {
    const stats = this.getStats();
    this.log(
      `STATS: Processed ${stats.tasksProcessed}, Failed ${stats.tasksFailed}, Uptime ${stats.uptime}`,
      'info'
    );
  }
}

module.exports = WebhookAgent;
