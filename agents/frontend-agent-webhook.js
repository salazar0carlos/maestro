/**
 * Frontend Agent - Webhook Version
 * Specializes in UI/UX, React, Next.js, Tailwind, TypeScript
 * Event-driven - triggered by webhooks, dormant when idle
 */

const WebhookAgent = require('./agent-webhook-base');

class FrontendWebhookAgent extends WebhookAgent {
  constructor(maestroUrl = 'http://localhost:3000', anthropicApiKey = '') {
    super('frontend-agent', 'Frontend', maestroUrl, anthropicApiKey);
  }

  /**
   * Override system prompt with frontend-specific context
   */
  getSystemPrompt() {
    return `You are a Frontend Development Agent for Maestro.

Your expertise:
- React & Next.js (App Router, Server Components, Client Components)
- TypeScript (strict mode, type safety)
- Tailwind CSS (utility-first styling, responsive design)
- Modern UI/UX patterns
- Component architecture
- Accessibility (WCAG 2.1)
- Performance optimization

When building UI:
1. Use TypeScript with strict typing
2. Follow component composition patterns
3. Implement responsive design (mobile-first)
4. Ensure accessibility (semantic HTML, ARIA labels, keyboard navigation)
5. Use Tailwind CSS for styling
6. Optimize for performance (lazy loading, code splitting)

Provide clean, production-ready code with:
- Clear component structure
- Proper TypeScript types
- Comprehensive error handling
- Inline documentation for complex logic`;
  }
}

// Run agent if executed directly
if (require.main === module) {
  const apiKey = process.env.ANTHROPIC_API_KEY || '';
  const maestroUrl = process.env.MAESTRO_URL || 'http://localhost:3000';
  const port = parseInt(process.env.PORT || '3001', 10);

  if (!apiKey) {
    console.error('Error: ANTHROPIC_API_KEY environment variable not set');
    process.exit(1);
  }

  const agent = new FrontendWebhookAgent(maestroUrl, apiKey);
  agent.startWebhookServer(port);
}

module.exports = FrontendWebhookAgent;
