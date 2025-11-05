/**
 * Agent Base Class
 * Provides shared functionality for all Maestro agents
 * Handles task polling, execution via Claude API, and task completion
 */

class Agent {
  constructor(agentName, agentType, maestroUrl = 'http://localhost:3000', anthropicApiKey = '') {
    this.agentName = agentName;
    this.agentType = agentType;
    this.maestroUrl = maestroUrl;
    this.anthropicApiKey = anthropicApiKey;
    this.isRunning = false;
    this.lastPollTime = null;
    this.tasksProcessed = 0;
    this.tasksFailed = 0;
    this.startTime = new Date();
  }

  /**
   * Poll Maestro API for available tasks assigned to this agent
   * @returns {Promise<Array>} Array of tasks
   */
  async pollForTasks() {
    try {
      const response = await fetch(`${this.maestroUrl}/api/tasks?assigned_to=${this.agentName}&status=todo`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Failed to poll tasks`);
      }

      const data = await response.json();
      this.lastPollTime = new Date();
      return data.tasks || [];
    } catch (error) {
      this.log(`Error polling tasks: ${error.message}`, 'error');
      return [];
    }
  }

  /**
   * Execute a task using Claude API
   * @param {Object} task - Task object with title, description, ai_prompt
   * @returns {Promise<Object>} Result object with status and content
   */
  async executeTask(task) {
    try {
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
   * Mark a task as complete in Maestro API
   * @param {string} taskId - Task ID to complete
   * @param {Object} result - Result object with content/status
   * @returns {Promise<boolean>} Success status
   */
  async completeTask(taskId, result) {
    try {
      const response = await fetch(`${this.maestroUrl}/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: result.status === 'success' ? 'done' : 'blocked',
          ai_response: result.content || result.error || '',
          completed_by_agent: this.agentName,
          completed_date: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Failed to complete task`);
      }

      this.log(`Task ${taskId} completed successfully`, 'info');
      this.tasksProcessed++;
      return true;
    } catch (error) {
      this.log(`Error completing task ${taskId}: ${error.message}`, 'error');
      this.tasksFailed++;
      return false;
    }
  }

  /**
   * Execute a task with retry logic and rate limit handling
   * @param {Object} task - Task object
   * @param {number} maxRetries - Maximum retry attempts
   * @returns {Promise<Object>} Result object
   */
  async executeTaskWithRetry(task, maxRetries = 3) {
    let lastError;
    let isRateLimit = false;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        this.log(`Executing task ${task.task_id} (attempt ${attempt}/${maxRetries})`, 'info');
        const result = await this.executeTask(task);

        if (result.status === 'success') {
          return result;
        }

        lastError = result.error;
        // Check if rate limited (HTTP 429)
        isRateLimit = result.error && result.error.includes('429');

        // Exponential backoff before retry
        if (attempt < maxRetries) {
          // Longer backoff for rate limits (add 1s base delay)
          const baseDelay = isRateLimit ? 2000 : 1000;
          const delayMs = baseDelay + Math.pow(2, attempt - 1) * 1000;
          this.log(`Retry in ${delayMs}ms${isRateLimit ? ' (rate limited)' : ''}`, 'warn');
          await this.delay(delayMs);
          isRateLimit = false; // Reset for next attempt
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
   * Main agent loop - continuously poll for and execute tasks
   * @param {number} pollIntervalMs - Milliseconds between polls (default 60000)
   */
  async run(pollIntervalMs = 60000) {
    this.isRunning = true;
    this.log(`Agent started. Polling every ${pollIntervalMs}ms`, 'info');

    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      this.log('Received SIGINT, shutting down gracefully...', 'warn');
      this.isRunning = false;
      this.logStats();
      process.exit(0);
    });

    while (this.isRunning) {
      try {
        // Poll for tasks
        const tasks = await this.pollForTasks();

        if (tasks.length > 0) {
          this.log(`Found ${tasks.length} task(s)`, 'info');

          // Execute each task with retry logic
          for (const task of tasks) {
            if (!this.isRunning) break;

            const result = await this.executeTaskWithRetry(task, 3);
            await this.completeTask(task.task_id, result);
          }
        }

        // Wait before next poll
        await this.delay(pollIntervalMs);
      } catch (error) {
        this.log(`Unexpected error in agent loop: ${error.message}`, 'error');
        await this.delay(5000); // Wait 5 seconds before retrying
      }
    }
  }

  /**
   * Utility function to add delay
   * @param {number} ms - Milliseconds to delay
   * @returns {Promise}
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Log a message with timestamp and level
   * @param {string} message - Message to log
   * @param {string} level - Log level (info, warn, error)
   */
  log(message, level = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${this.agentName}] [${level.toUpperCase()}]`;
    console.log(`${prefix} ${message}`);
  }

  /**
   * Get agent statistics
   * @returns {Object} Statistics object
   */
  getStats() {
    const uptime = new Date() - this.startTime;
    return {
      agentName: this.agentName,
      agentType: this.agentType,
      isRunning: this.isRunning,
      tasksProcessed: this.tasksProcessed,
      tasksFailed: this.tasksFailed,
      uptime: `${Math.floor(uptime / 1000)}s`,
      lastPoll: this.lastPollTime?.toISOString() || 'never',
    };
  }

  /**
   * Log current statistics
   */
  logStats() {
    const stats = this.getStats();
    this.log(`STATS: Processed ${stats.tasksProcessed}, Failed ${stats.tasksFailed}, Uptime ${stats.uptime}`, 'info');
  }
}

module.exports = Agent;
