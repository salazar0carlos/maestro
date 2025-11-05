#!/bin/bash

# Maestro BullMQ Worker Startup Script
# Starts all BullMQ workers with PM2

set -e

echo "🚀 Starting Maestro BullMQ Workers with PM2..."
echo ""

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    echo "❌ PM2 is not installed. Installing now..."
    npm install -g pm2
fi

# Check if Redis is running
echo "🔍 Checking Redis connection..."
if ! redis-cli ping > /dev/null 2>&1; then
    echo "❌ Redis is not running!"
    echo ""
    echo "Please start Redis first:"
    echo "  Option 1 (Docker): docker-compose up -d redis"
    echo "  Option 2 (Local):  redis-server"
    echo ""
    exit 1
fi

echo "✅ Redis is running"
echo ""

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Check if ANTHROPIC_API_KEY is set
if [ -z "$ANTHROPIC_API_KEY" ]; then
    echo "⚠️  Warning: ANTHROPIC_API_KEY not found in environment"
    echo "Please add it to .env file or the workers won't be able to execute tasks"
fi

# Build TypeScript workers
echo "🔨 Building workers..."
npm run build:workers || npx tsc --project tsconfig.workers.json

# Stop existing worker processes (if any)
echo "🛑 Stopping existing workers..."
pm2 delete maestro-workers 2>/dev/null || true

# Start workers with PM2
echo "▶️  Starting BullMQ workers with PM2..."
pm2 start workers/pm2.workers.config.js

echo ""
echo "✅ All workers started!"
echo ""
echo "📊 Worker Status:"
pm2 list

echo ""
echo "📝 Useful Commands:"
echo "  pm2 list                  - Show all processes"
echo "  pm2 logs                  - View all logs"
echo "  pm2 logs frontend-worker  - View specific worker logs"
echo "  pm2 monit                 - Monitor processes in real-time"
echo "  pm2 restart maestro-workers - Restart all workers"
echo "  pm2 stop maestro-workers    - Stop all workers"
echo ""
echo "📈 Queue Monitoring:"
echo "  API: http://localhost:3000/api/queues"
echo "  Redis UI: http://localhost:8081 (if using docker-compose)"
echo ""
echo "🎯 Next Steps:"
echo "  1. Start Next.js app: npm run dev"
echo "  2. Open Maestro UI and assign tasks"
echo "  3. Watch workers process tasks: pm2 logs"
echo ""
