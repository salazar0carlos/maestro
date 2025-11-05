# Maestro Webhook Agent Template

Deploy this agent to Railway, Render, or any Node.js hosting platform to create a distributed, event-driven agent that responds to tasks from Maestro.

## Features

- ✅ Webhook-based task execution
- ✅ Claude AI integration (Haiku for cost-efficiency)
- ✅ Signature verification for security
- ✅ Automatic cost tracking
- ✅ Health check endpoints
- ✅ Graceful shutdown
- ✅ Ready for Railway/Render deployment

## Quick Start

### 1. Local Development

```bash
# Install dependencies
npm install

# Copy environment configuration
cp .env.example .env

# Edit .env with your values
# - Set MAESTRO_URL to your Maestro instance
# - Set WEBHOOK_SECRET (shared with Maestro)
# - Set AGENT_ID and AGENT_NAME
# - Set ANTHROPIC_API_KEY

# Start server
npm start

# Or use nodemon for development
npm run dev
```

### 2. Deploy to Railway

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new)

1. Click "Deploy on Railway"
2. Connect your GitHub repository
3. Set environment variables:
   - `MAESTRO_URL`: Your Maestro instance URL
   - `WEBHOOK_SECRET`: Shared secret key
   - `AGENT_ID`: Unique agent identifier (e.g., `frontend-agent`)
   - `AGENT_NAME`: Human-readable name (e.g., `Frontend Agent`)
   - `ANTHROPIC_API_KEY`: Your Claude API key
4. Deploy!

Railway will automatically:
- Install dependencies
- Start the server
- Assign a public URL (e.g., `https://maestro-agent-production.up.railway.app`)

### 3. Deploy to Render

1. Create new Web Service on Render
2. Connect repository
3. Configure:
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
4. Add environment variables (same as Railway)
5. Deploy!

### 4. Register Agent with Maestro

Once deployed, register your agent in Maestro:

```bash
# In Maestro dashboard, go to /webhooks/manage
# Add new agent webhook:

Agent ID: frontend-agent
Agent Name: Frontend Agent
Webhook URL: https://your-agent.railway.app/execute
Secret: your-webhook-secret
Events: task.assigned
```

## API Endpoints

### POST /execute
Main webhook endpoint for task execution.

**Headers:**
- `X-Maestro-Signature`: HMAC signature
- `Content-Type`: application/json

**Body:**
```json
{
  "event": "task.assigned",
  "timestamp": "2025-11-05T...",
  "data": {
    "task_id": "task-123",
    "task_title": "Build login form",
    "ai_prompt": "Create a login form with...",
    "priority": 3,
    "project_id": "project-1"
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Task received, executing...",
  "agent": "Frontend Agent"
}
```

### POST /status
Status update endpoint.

**Response:**
```json
{
  "agent_id": "frontend-agent",
  "status": "online",
  "last_seen": "2025-11-05T...",
  "health": {
    "uptime_seconds": 3600,
    "memory_percent": 45.2
  }
}
```

### GET /health
Health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "agent": "Frontend Agent",
  "uptime": 3600,
  "model": "claude-3-5-haiku-20241022"
}
```

## Security

### Signature Verification

All webhooks are signed with HMAC-SHA256:

```javascript
const signature = crypto
  .createHmac('sha256', WEBHOOK_SECRET)
  .update(JSON.stringify(payload))
  .digest('hex');

// Maestro sends: X-Maestro-Signature: sha256=<signature>
```

### Best Practices

1. **Never commit secrets** - Use environment variables
2. **Rotate webhook secret** - Change every 90 days
3. **Use HTTPS** - Always in production
4. **Monitor costs** - Track Claude API usage
5. **Set up alerts** - Get notified of failures

## Cost Optimization

This template uses **Claude 3.5 Haiku** for cost-efficiency:

- **Input:** $0.80 per million tokens
- **Output:** $4.00 per million tokens

Example task costs:
- Simple task (500 tokens): ~$0.0015
- Medium task (2000 tokens): ~$0.006
- Complex task (5000 tokens): ~$0.015

**Monthly estimate** (100 tasks/day):
- Simple: $4.50/month
- Medium: $18/month
- Complex: $45/month

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `MAESTRO_URL` | Yes | - | Maestro orchestrator URL |
| `WEBHOOK_SECRET` | Yes | - | Webhook signature secret |
| `AGENT_ID` | Yes | - | Unique agent identifier |
| `AGENT_NAME` | Yes | - | Human-readable name |
| `ANTHROPIC_API_KEY` | Yes | - | Claude API key |
| `CLAUDE_MODEL` | No | `claude-3-5-haiku-20241022` | Claude model |
| `PORT` | No | `3000` | Server port |
| `AUTO_REGISTER` | No | `false` | Auto-register on startup |

## Customization

### Using Different AI Models

Edit `server.js` to use different models:

```javascript
// For more powerful responses (higher cost)
const CONFIG = {
  MODEL: 'claude-3-5-sonnet-20241022',
  // ...
};
```

### Adding Custom Logic

Modify the `executeTask` function:

```javascript
async function executeTask(taskRequest) {
  // Pre-processing
  const context = await loadContext();

  // Execute with Claude
  const result = await anthropic.messages.create({...});

  // Post-processing
  const processed = await processResult(result);

  return processed;
}
```

### Specialized Agents

Create specialized agents for different roles:

- **Frontend Agent**: UI/UX tasks
- **Backend Agent**: API/database tasks
- **Testing Agent**: Test generation
- **Bug Fix Agent**: Debugging
- **Code Review Agent**: PR reviews

## Monitoring

### Logs

Railway/Render provide built-in logging:

```
[Agent] Executing task: Build login form
[Agent] Task completed in 2341ms, cost: $0.0034
[Agent] Reported task task-123 completion to Maestro
```

### Health Checks

Set up health check monitoring:

```bash
# Railway/Render health check URL
GET https://your-agent.railway.app/health
```

### Cost Tracking

Monitor costs in Maestro dashboard at `/webhooks/costs`

## Troubleshooting

### Agent not receiving tasks

1. Check webhook URL is correct
2. Verify webhook secret matches
3. Check agent is enabled in Maestro
4. Review Railway/Render logs

### Signature verification failing

1. Ensure webhook secret matches Maestro
2. Check payload is not modified
3. Verify signature header format

### High costs

1. Switch to Haiku model
2. Reduce max_tokens
3. Add request caching
4. Set cost alerts

## Support

- GitHub Issues: https://github.com/salazar0carlos/maestro/issues
- Documentation: See main Maestro README
- Railway Docs: https://docs.railway.app
- Render Docs: https://render.com/docs

## License

MIT
