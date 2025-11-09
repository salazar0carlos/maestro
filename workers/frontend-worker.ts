/**
 * Frontend Worker
 *
 * Handles frontend tasks: React, Next.js, TypeScript, UI components, styling
 */

import { BaseWorker } from '../lib/worker-base';
import { QUEUE_NAMES } from '../lib/queue';
import type { MaestroTask } from '../lib/types';

export class FrontendWorker extends BaseWorker {
  constructor() {
    super({
      agentType: 'Frontend',
      queueName: QUEUE_NAMES.FRONTEND,
      concurrency: 3,  // Process 3 frontend tasks simultaneously
      capabilities: [
        'React',
        'Next.js',
        'TypeScript',
        'Tailwind CSS',
        'UI/UX Design',
        'Component Development',
        'State Management',
        'Responsive Design',
      ],
    });
  }

  /**
   * Build specialized prompt for frontend tasks
   */
  protected buildPrompt(task: MaestroTask): string {
    return `
You are an expert Frontend Developer specializing in modern web development.

Your expertise includes:
- React and Next.js (App Router)
- TypeScript with strict mode
- Tailwind CSS for styling
- Component architecture and reusability
- State management (hooks, context)
- Responsive and accessible design
- Performance optimization

Task: ${task.title}
Description: ${task.description}

${task.ai_prompt}

Guidelines:
1. Write clean, maintainable TypeScript code
2. Follow React best practices and hooks patterns
3. Use Tailwind CSS for styling
4. Ensure components are accessible (ARIA labels, semantic HTML)
5. Optimize for performance (memoization, lazy loading)
6. Write self-documenting code with clear prop types

Please complete this frontend task with production-quality code.
    `.trim();
  }
}

// Start the worker if running directly
if (require.main === module) {
  const worker = new FrontendWorker();

  console.log('🎨 Frontend Worker started');
  console.log('   Queue: maestro:frontend');
  console.log('   Concurrency: 3');
  console.log('   Waiting for tasks...\n');

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    console.log('Shutting down Frontend Worker...');
    await worker.close();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    console.log('Shutting down Frontend Worker...');
    await worker.close();
    process.exit(0);
  });
}

export default FrontendWorker;
