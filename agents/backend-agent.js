/**
 * Backend Agent
 * Specializes in backend development, APIs, and server-side implementation
 * Focuses on: Node.js/Next.js APIs, database design, data processing, integrations
 */

const Agent = require('./agent-base');

class BackendAgent extends Agent {
  constructor(maestroUrl = 'http://localhost:3000', anthropicApiKey = '') {
    super('backend-agent', 'Backend', maestroUrl, anthropicApiKey);
  }

  /**
   * Override executeTask to add backend-specific context
   */
  async executeTask(task) {
    try {
      const systemPrompt = `You are a Backend Agent for Maestro.
Your expertise includes: Node.js, Next.js API routes, database design, authentication,
data validation, error handling, performance optimization, and API best practices.
Write secure, scalable code with proper logging and error handling.`;

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.anthropicApiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-3-5-haiku-20241022',
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
}

// Run agent if executed directly
if (require.main === module) {
  const apiKey = process.env.ANTHROPIC_API_KEY || '';
  if (!apiKey) {
    console.error('Error: ANTHROPIC_API_KEY environment variable not set');
    process.exit(1);
  }

  const agent = new BackendAgent('http://localhost:3000', apiKey);
  agent.run(60000); // Poll every 60 seconds
}

module.exports = BackendAgent;
