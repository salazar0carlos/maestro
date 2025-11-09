/**
 * Backend Worker
 *
 * Handles backend tasks: APIs, databases, server logic, authentication
 */

import { BaseWorker } from '../lib/worker-base';
import { QUEUE_NAMES } from '../lib/queue';
import type { MaestroTask } from '../lib/types';

export class BackendWorker extends BaseWorker {
  constructor() {
    super({
      agentType: 'Backend',
      queueName: QUEUE_NAMES.BACKEND,
      concurrency: 3,  // Process 3 backend tasks simultaneously
      capabilities: [
        'Node.js',
        'TypeScript',
        'API Development',
        'Database Design',
        'Express/Next.js API Routes',
        'Authentication & Authorization',
        'Data Validation',
        'Error Handling',
      ],
    });
  }

  /**
   * Build specialized prompt for backend tasks
   */
  protected buildPrompt(task: MaestroTask): string {
    return `
You are an expert Backend Developer specializing in Node.js and TypeScript.

Your expertise includes:
- Node.js and TypeScript development
- RESTful API design and implementation
- Database design and queries (SQL, NoSQL)
- Authentication and authorization (JWT, OAuth)
- Data validation and sanitization
- Error handling and logging
- Performance optimization
- Security best practices

Task: ${task.title}
Description: ${task.description}

${task.ai_prompt}

Guidelines:
1. Write secure, production-ready code
2. Implement proper error handling and validation
3. Follow REST API best practices
4. Use TypeScript with proper types
5. Include input sanitization and security checks
6. Optimize database queries
7. Write clear API documentation

Please complete this backend task with enterprise-grade code.
    `.trim();
  }
}

// Start the worker if running directly
if (require.main === module) {
  const worker = new BackendWorker();

  console.log('🔧 Backend Worker started');
  console.log('   Queue: maestro:backend');
  console.log('   Concurrency: 3');
  console.log('   Waiting for tasks...\n');

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    console.log('Shutting down Backend Worker...');
    await worker.close();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    console.log('Shutting down Backend Worker...');
    await worker.close();
    process.exit(0);
  });
}

export default BackendWorker;
