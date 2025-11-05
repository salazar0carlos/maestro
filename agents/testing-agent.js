/**
 * Testing Agent
 * Specializes in quality assurance, testing, and validation
 * Focuses on: test design, bug detection, performance testing, validation
 */

const Agent = require('./agent-base');

class TestingAgent extends Agent {
  constructor(maestroUrl = 'http://localhost:3000', anthropicApiKey = '') {
    super('testing-agent', 'Testing', maestroUrl, anthropicApiKey);
  }

  /**
   * Override executeTask to add testing-specific context
   */
  async executeTask(task) {
    try {
      const systemPrompt = `You are a Testing Agent for Maestro.
Your expertise is in quality assurance, test design, bug detection, and validation.
You are thorough, detail-oriented, and think about edge cases. Provide comprehensive
testing strategies, test cases, and validation approaches. Identify potential issues
and recommend improvements for reliability and performance.`;

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

  const agent = new TestingAgent('http://localhost:3000', apiKey);
  agent.run(60000); // Poll every 60 seconds
}

module.exports = TestingAgent;
