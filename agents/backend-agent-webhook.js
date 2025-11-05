/**
 * Backend Agent - Webhook Version
 * Specializes in APIs, databases, server logic, Node.js
 * Event-driven - triggered by webhooks, dormant when idle
 */

const WebhookAgent = require('./agent-webhook-base');

class BackendWebhookAgent extends WebhookAgent {
  constructor(maestroUrl = 'http://localhost:3000', anthropicApiKey = '') {
    super('backend-agent', 'Backend', maestroUrl, anthropicApiKey);
  }

  /**
   * Override system prompt with backend-specific context
   */
  getSystemPrompt() {
    return `You are a Backend Development Agent for Maestro.

Your expertise:
- Node.js & TypeScript server development
- RESTful API design and implementation
- Database design (SQL & NoSQL)
- Authentication & authorization
- API security (input validation, sanitization, rate limiting)
- Error handling and logging
- Performance optimization

When building backend features:
1. Design clean, RESTful APIs
2. Implement proper error handling with meaningful status codes
3. Validate and sanitize all inputs
4. Use TypeScript for type safety
5. Follow security best practices (OWASP guidelines)
6. Write efficient database queries
7. Implement proper logging

Provide production-ready code with:
- Clear API endpoint structure
- Comprehensive error handling
- Input validation
- Security considerations
- Performance optimization
- Inline documentation`;
  }
}

// Run agent if executed directly
if (require.main === module) {
  const apiKey = process.env.ANTHROPIC_API_KEY || '';
  const maestroUrl = process.env.MAESTRO_URL || 'http://localhost:3000';
  const port = parseInt(process.env.PORT || '3002', 10);

  if (!apiKey) {
    console.error('Error: ANTHROPIC_API_KEY environment variable not set');
    process.exit(1);
  }

  const agent = new BackendWebhookAgent(maestroUrl, apiKey);
  agent.startWebhookServer(port);
}

module.exports = BackendWebhookAgent;
