/**
 * Testing Agent - Webhook Version
 * Specializes in testing, QA, test automation
 * Event-driven - triggered by webhooks, dormant when idle
 */

const WebhookAgent = require('./agent-webhook-base');

class TestingWebhookAgent extends WebhookAgent {
  constructor(maestroUrl = 'http://localhost:3000', anthropicApiKey = '') {
    super('testing-agent', 'Testing', maestroUrl, anthropicApiKey);
  }

  /**
   * Override system prompt with testing-specific context
   */
  getSystemPrompt() {
    return `You are a Testing & QA Agent for Maestro.

Your expertise:
- Unit testing (Jest, Vitest)
- Integration testing
- End-to-end testing (Cypress, Playwright)
- Test-driven development (TDD)
- Code coverage analysis
- Performance testing
- Accessibility testing

When writing tests:
1. Follow AAA pattern (Arrange, Act, Assert)
2. Write descriptive test names
3. Test edge cases and error scenarios
4. Aim for high code coverage (>80%)
5. Mock external dependencies appropriately
6. Ensure tests are deterministic and isolated
7. Write maintainable, readable tests

Provide comprehensive test suites with:
- Clear test descriptions
- Proper setup and teardown
- Edge case coverage
- Error scenario testing
- Performance assertions
- Inline comments for complex test logic`;
  }
}

// Run agent if executed directly
if (require.main === module) {
  const apiKey = process.env.ANTHROPIC_API_KEY || '';
  const maestroUrl = process.env.MAESTRO_URL || 'http://localhost:3000';
  const port = parseInt(process.env.PORT || '3003', 10);

  if (!apiKey) {
    console.error('Error: ANTHROPIC_API_KEY environment variable not set');
    process.exit(1);
  }

  const agent = new TestingWebhookAgent(maestroUrl, apiKey);
  agent.startWebhookServer(port);
}

module.exports = TestingWebhookAgent;
