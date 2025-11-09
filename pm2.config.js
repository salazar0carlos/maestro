module.exports = {
  "apps": [
    {
      "name": "frontend-agent",
      "script": "./agents/frontend-agent-webhook.js",
      "instances": 1,
      "exec_mode": "fork",
      "autorestart": true,
      "min_uptime": "5s",
      "max_memory_restart": "500M",
      "env": {
        "NODE_ENV": "production",
        "AGENT_TYPE": "Frontend",
        "LOG_LEVEL": "info"
      },
      "error_file": "./logs/frontend-agent-error.log",
      "out_file": "./logs/frontend-agent-out.log",
      "log_date_format": "YYYY-MM-DD HH:mm:ss Z",
      "watch": false
    },
    {
      "name": "backend-agent",
      "script": "./agents/backend-agent-webhook.js",
      "instances": 1,
      "exec_mode": "fork",
      "autorestart": true,
      "min_uptime": "5s",
      "max_memory_restart": "500M",
      "env": {
        "NODE_ENV": "production",
        "AGENT_TYPE": "Backend",
        "LOG_LEVEL": "info"
      },
      "error_file": "./logs/backend-agent-error.log",
      "out_file": "./logs/backend-agent-out.log",
      "log_date_format": "YYYY-MM-DD HH:mm:ss Z",
      "watch": false
    },
    {
      "name": "testing-agent",
      "script": "./agents/testing-agent-webhook.js",
      "instances": 1,
      "exec_mode": "fork",
      "autorestart": true,
      "min_uptime": "5s",
      "max_memory_restart": "500M",
      "env": {
        "NODE_ENV": "production",
        "AGENT_TYPE": "Testing",
        "LOG_LEVEL": "info"
      },
      "error_file": "./logs/testing-agent-error.log",
      "out_file": "./logs/testing-agent-out.log",
      "log_date_format": "YYYY-MM-DD HH:mm:ss Z",
      "watch": false
    },
    {
      "name": "supervisor-agent",
      "script": "./agents/supervisor-agent.js",
      "instances": 1,
      "exec_mode": "fork",
      "autorestart": true,
      "min_uptime": "5s",
      "max_memory_restart": "300M",
      "cron_restart": "0 */6 * * *",
      "env": {
        "NODE_ENV": "production",
        "AGENT_TYPE": "Supervisor",
        "LOG_LEVEL": "info",
        "HEALTH_CHECK_INTERVAL": 60000
      },
      "error_file": "./logs/supervisor-agent-error.log",
      "out_file": "./logs/supervisor-agent-out.log",
      "log_date_format": "YYYY-MM-DD HH:mm:ss Z",
      "watch": false
    },
    {
      "name": "product-improvement-agent",
      "script": "./agents/product-improvement-agent.js",
      "instances": 1,
      "exec_mode": "fork",
      "autorestart": true,
      "min_uptime": "5s",
      "max_memory_restart": "500M",
      "env": {
        "NODE_ENV": "production",
        "AGENT_TYPE": "ProductImprovement",
        "LOG_LEVEL": "info"
      },
      "error_file": "./logs/product-improvement-agent-error.log",
      "out_file": "./logs/product-improvement-agent-out.log",
      "log_date_format": "YYYY-MM-DD HH:mm:ss Z",
      "watch": false
    },
    {
      "name": "analysis-scheduler",
      "script": "./agents/analysis-scheduler.js",
      "instances": 1,
      "exec_mode": "fork",
      "autorestart": true,
      "min_uptime": "10s",
      "max_memory_restart": "200M",
      "env": {
        "NODE_ENV": "production",
        "LOG_LEVEL": "info"
      },
      "error_file": "./logs/analysis-scheduler-error.log",
      "out_file": "./logs/analysis-scheduler-out.log",
      "log_date_format": "YYYY-MM-DD HH:mm:ss Z",
      "watch": false
    }
  ],
  "deploy": {
    "production": {
      "user": "node",
      "host": "your-server.com",
      "ref": "origin/main",
      "repo": "git@github.com:your-repo/maestro.git",
      "path": "/var/www/maestro",
      "post-deploy": "npm install && pm2 reload pm2.config.js --env production"
    }
  }
};