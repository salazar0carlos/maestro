/**
 * PM2 Configuration for BullMQ Workers
 *
 * Manages all BullMQ worker processes with:
 * - Auto-restart on crash
 * - Resource limits
 * - Logging
 * - Graceful shutdown
 */

module.exports = {
  apps: [
    // Frontend Worker
    {
      name: 'frontend-worker',
      script: './workers/frontend-worker.js',  // Compiled JavaScript
      instances: 2,
      exec_mode: 'cluster',
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
        QUEUE_CONCURRENCY: 3,
      },
      error_file: './logs/frontend-worker-error.log',
      out_file: './logs/frontend-worker-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    },

    // Backend Worker
    {
      name: 'backend-worker',
      script: './workers/backend-worker.js',
      instances: 2,
      exec_mode: 'cluster',
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
        QUEUE_CONCURRENCY: 3,
      },
      error_file: './logs/backend-worker-error.log',
      out_file: './logs/backend-worker-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    },

    // Testing Worker
    {
      name: 'testing-worker',
      script: './workers/testing-worker.js',
      instances: 1,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      max_memory_restart: '400M',
      env: {
        NODE_ENV: 'production',
        QUEUE_CONCURRENCY: 2,
      },
      error_file: './logs/testing-worker-error.log',
      out_file: './logs/testing-worker-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    },
  ],
};
