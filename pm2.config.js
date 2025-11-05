/**
 * PM2 Configuration for Maestro Agent System
 *
 * This configuration manages all agent processes with:
 * - Auto-restart on crash
 * - Log management
 * - Load balancing
 * - Health monitoring
 *
 * Usage:
 *   pm2 start pm2.config.js
 *   pm2 logs          # View all logs
 *   pm2 monit         # Monitor processes
 *   pm2 save          # Save process list
 *   pm2 startup       # Auto-start on boot
 */

module.exports = {
  apps: [
    // Frontend Agent - Handles UI, components, React tasks
    {
      name: 'frontend-agent',
      script: './agents/frontend-agent-webhook.js',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      min_uptime: '5s',
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
        AGENT_TYPE: 'Frontend',
        LOG_LEVEL: 'info'
      },
      error_file: './logs/frontend-agent-error.log',
      out_file: './logs/frontend-agent-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      watch: false,
    },

    // Backend Agent - Handles APIs, database, server tasks
    {
      name: 'backend-agent',
      script: './agents/backend-agent-webhook.js',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      min_uptime: '5s',
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
        AGENT_TYPE: 'Backend',
        LOG_LEVEL: 'info'
      },
      error_file: './logs/backend-agent-error.log',
      out_file: './logs/backend-agent-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      watch: false,
    },

    // Testing Agent - Handles test writing and execution
    {
      name: 'testing-agent',
      script: './agents/testing-agent-webhook.js',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      min_uptime: '5s',
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
        AGENT_TYPE: 'Testing',
        LOG_LEVEL: 'info'
      },
      error_file: './logs/testing-agent-error.log',
      out_file: './logs/testing-agent-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      watch: false,
    },

    // Supervisor Agent - Orchestrates all agents
    {
      name: 'supervisor-agent',
      script: './agents/supervisor-agent.js',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      min_uptime: '5s',
      max_memory_restart: '300M',
      cron_restart: '0 */6 * * *',  // Restart every 6 hours for health
      env: {
        NODE_ENV: 'production',
        AGENT_TYPE: 'Supervisor',
        LOG_LEVEL: 'info',
        HEALTH_CHECK_INTERVAL: 60000,  // 1 minute
      },
      error_file: './logs/supervisor-agent-error.log',
      out_file: './logs/supervisor-agent-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      watch: false,
    }
  ],

  // Deployment configuration for remote servers
  deploy: {
    production: {
      user: 'node',
      host: 'your-server.com',
      ref: 'origin/main',
      repo: 'git@github.com:your-repo/maestro.git',
      path: '/var/www/maestro',
      'post-deploy': 'npm install && pm2 reload pm2.config.js --env production'
    }
  }
};
