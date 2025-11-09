#!/usr/bin/env node

/**
 * Analysis Scheduler
 * 
 * Runs ProductImprovementAgent analysis every 24 hours
 * Can also be triggered manually via API
 */

const { Queue } = require('bullmq');
require('dotenv').config();

const SCHEDULE_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
const DEFAULT_PROJECT_ID = 'maestro-intelligence-layer';

// Redis connection
const redisConnection = {
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: parseInt(process.env.REDIS_PORT || '6379'),
};

// Create queue
const queue = new Queue('maestro-product-improvement', {
  connection: redisConnection,
});

console.log('[Scheduler] Analysis Scheduler started');
console.log('[Scheduler] Running analysis every 24 hours');
console.log('[Scheduler] Project:', DEFAULT_PROJECT_ID);

/**
 * Trigger an analysis
 */
async function triggerAnalysis() {
  const analysisId = `analysis-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    console.log(`\n[Scheduler] 🕐 Triggering scheduled analysis: ${analysisId}`);
    
    await queue.add('analyze-project', {
      analysis_id: analysisId,
      project_id: DEFAULT_PROJECT_ID,
    }, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
    });
    
    console.log('[Scheduler] ✅ Analysis enqueued successfully');
    console.log('[Scheduler] Next analysis in 24 hours');
    
  } catch (error) {
    console.error('[Scheduler] ❌ Failed to trigger analysis:', error.message);
  }
}

// Run initial analysis
triggerAnalysis();

// Schedule recurring analysis
setInterval(triggerAnalysis, SCHEDULE_INTERVAL);

process.on('SIGTERM', async () => {
  console.log('\n[Scheduler] Received SIGTERM, shutting down...');
  await queue.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('\n[Scheduler] Received SIGINT, shutting down...');
  await queue.close();
  process.exit(0);
});
