#!/bin/bash

# Maestro Agent Startup Script
# Starts all agents using PM2 for process management

set -e

echo "🚀 Starting Maestro Agent System with PM2..."
echo ""

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    echo "❌ PM2 is not installed. Installing now..."
    npm install -g pm2
fi

# Create logs directory if it doesn't exist
mkdir -p logs

# Check if .env file exists
if [ ! -f .env ]; then
    echo "⚠️  Warning: .env file not found"
    echo "Creating .env from .env.example..."
    if [ -f .env.example ]; then
        cp .env.example .env
        echo "✅ Created .env file. Please add your ANTHROPIC_API_KEY"
    else
        echo "⚠️  Please create .env file with ANTHROPIC_API_KEY"
    fi
fi

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Check if ANTHROPIC_API_KEY is set
if [ -z "$ANTHROPIC_API_KEY" ]; then
    echo "❌ Error: ANTHROPIC_API_KEY not found in environment"
    echo "Please add it to .env file:"
    echo "  echo 'ANTHROPIC_API_KEY=your-key-here' >> .env"
    exit 1
fi

echo "✅ Environment configured"
echo ""

# Stop existing PM2 processes (if any)
echo "🛑 Stopping existing agents..."
pm2 delete all 2>/dev/null || true

# Start agents with PM2
echo "▶️  Starting agents with PM2..."
pm2 start pm2.config.js

echo ""
echo "✅ All agents started!"
echo ""
echo "📊 Agent Status:"
pm2 list

echo ""
echo "📝 Useful Commands:"
echo "  pm2 list          - Show all processes"
echo "  pm2 logs          - View all logs (Ctrl+C to exit)"
echo "  pm2 monit         - Monitor processes in real-time"
echo "  pm2 restart all   - Restart all agents"
echo "  pm2 stop all      - Stop all agents"
echo "  pm2 delete all    - Remove all agents from PM2"
echo "  pm2 save          - Save current process list"
echo "  pm2 startup       - Enable auto-start on system boot"
echo ""
echo "🌐 Agent Endpoints:"
echo "  Frontend Agent:  http://localhost:3001"
echo "  Backend Agent:   http://localhost:3002"
echo "  Testing Agent:   http://localhost:3003"
echo ""
echo "🎯 Next Steps:"
echo "  1. Run 'pm2 logs' to see agent activity"
echo "  2. Open Maestro UI and assign tasks"
echo "  3. Watch agents execute tasks automatically"
echo ""
