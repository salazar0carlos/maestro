/**
 * Testing Worker
 *
 * Handles testing tasks: unit tests, integration tests, E2E tests
 */

import { BaseWorker } from '../lib/worker-base';
import { QUEUE_NAMES } from '../lib/queue';
import type { MaestroTask } from '../lib/types';

export class TestingWorker extends BaseWorker {
  constructor() {
    super({
      agentType: 'Testing',
      queueName: QUEUE_NAMES.TESTING,
      concurrency: 2,  // Process 2 testing tasks simultaneously
      capabilities: [
        'Jest',
        'React Testing Library',
        'Cypress',
        'Unit Testing',
        'Integration Testing',
        'E2E Testing',
        'Test Coverage',
        'TDD/BDD',
      ],
    });
  }

  /**
   * Build specialized prompt for testing tasks
   */
  protected buildPrompt(task: MaestroTask): string {
    return `
You are an expert QA Engineer and Test Automation Specialist.

Your expertise includes:
- Jest for unit and integration testing
- React Testing Library for component tests
- Cypress for E2E testing
- Test-driven development (TDD)
- Behavior-driven development (BDD)
- Test coverage analysis
- Mocking and stubbing
- Performance testing

Task: ${task.title}
Description: ${task.description}

${task.ai_prompt}

Guidelines:
1. Write comprehensive, maintainable tests
2. Follow AAA pattern (Arrange, Act, Assert)
3. Test edge cases and error scenarios
4. Mock external dependencies properly
5. Aim for meaningful test coverage
6. Write clear test descriptions
7. Ensure tests are isolated and independent

Please complete this testing task with thorough, production-quality tests.
    `.trim();
  }
}

// Start the worker if running directly
if (require.main === module) {
  const worker = new TestingWorker();

  console.log('🧪 Testing Worker started');
  console.log('   Queue: maestro:testing');
  console.log('   Concurrency: 2');
  console.log('   Waiting for tasks...\n');

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    console.log('Shutting down Testing Worker...');
    await worker.close();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    console.log('Shutting down Testing Worker...');
    await worker.close();
    process.exit(0);
  });
}

export default TestingWorker;
