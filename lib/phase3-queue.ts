/**
 * Phase 3: Queue functions for ProductImprovementAgent
 */

import { Queue } from 'bullmq';

let productImprovementQueue: Queue | null = null;

/**
 * Get or create the product improvement queue
 */
function getProductImprovementQueue(): Queue {
  if (productImprovementQueue) {
    return productImprovementQueue;
  }

  const redisConnection = {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: parseInt(process.env.REDIS_PORT || '6379'),
  };

  productImprovementQueue = new Queue('maestro-product-improvement', {
    connection: redisConnection,
  });

  return productImprovementQueue;
}

/**
 * Enqueue an analysis job
 */
export async function enqueueAnalysis(analysisId: string, projectId: string) {
  const queue = getProductImprovementQueue();
  
  await queue.add('analyze-project', {
    analysis_id: analysisId,
    project_id: projectId,
  }, {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
  });

  console.log('[phase3-queue] Enqueued analysis:', analysisId);
}
