# Webhook-Based Agent Architecture

## Overview

Maestro agents now use **event-driven webhook architecture** instead of polling. Agents are dormant until triggered by incoming webhooks, resulting in:

- ✅ **Zero cost when idle** - Agents only run when there's work
- ✅ **Instant response** - No polling delay
- ✅ **Scalable** - Easily deploy agents across multiple servers
- ✅ **Decoupled** - Agents run independently from Maestro

---

## Architecture

```
Task Created → Maestro → Webhook Trigger → Agent → Execute Task → Update Maestro
```

### Flow:
1. User creates task in Maestro
2. Maestro automatically triggers agent via webhook
3. Agent receives webhook, executes task asynchronously
4. Agent updates task status in Maestro
5. Agent goes back to dormant state

---

## Running Webhook Agents

### Prerequisites

```bash
export ANTHROPIC_API_KEY="your-api-key"
export MAESTRO_URL="http://localhost:3000"  # Optional, defaults to localhost:3000
```

### Start Agents

Each agent runs on its own port:

```bash
# Frontend Agent (port 3001)
node agents/frontend-agent-webhook.js

# Backend Agent (port 3002)
node agents/backend-agent-webhook.js

# Testing Agent (port 3003)
node agents/testing-agent-webhook.js
```

### Custom Ports

```bash
PORT=8001 node agents/frontend-agent-webhook.js
```

---

## Agent Configuration

Webhook URLs are configured in `lib/agent-config.ts`:

```typescript
{
  'Frontend': {
    webhook: 'http://localhost:3001/execute',
    enabled: true,
  },
  'Backend': {
    webhook: 'http://localhost:3002/execute',
    enabled: true,
  },
  // ...
}
```

### Environment Variables

Override default webhooks with environment variables:

```bash
export FRONTEND_AGENT_WEBHOOK="http://your-server:3001/execute"
export BACKEND_AGENT_WEBHOOK="http://your-server:3002/execute"
export TESTING_AGENT_WEBHOOK="http://your-server:3003/execute"
```

---

## Production Deployment

### Option 1: Docker Compose

```yaml
version: '3.8'
services:
  frontend-agent:
    build: .
    command: node agents/frontend-agent-webhook.js
    environment:
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
      - MAESTRO_URL=http://maestro:3000
      - PORT=3001
    ports:
      - "3001:3001"

  backend-agent:
    build: .
    command: node agents/backend-agent-webhook.js
    environment:
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
      - MAESTRO_URL=http://maestro:3000
      - PORT=3002
    ports:
      - "3002:3002"
```

### Option 2: Serverless (Cloud Run / Lambda)

Deploy each agent as a serverless function:

```bash
# Cloud Run example
gcloud run deploy frontend-agent \
  --source . \
  --command "node agents/frontend-agent-webhook.js" \
  --set-env-vars ANTHROPIC_API_KEY=$ANTHROPIC_API_KEY \
  --set-env-vars MAESTRO_URL=https://your-maestro.com \
  --port 3001
```

Then configure webhooks:

```bash
export FRONTEND_AGENT_WEBHOOK="https://frontend-agent-xxx.run.app/execute"
```

### Option 3: PM2 Process Manager

```bash
# Install PM2
npm install -g pm2

# Start all agents
pm2 start agents/frontend-agent-webhook.js --name frontend-agent
pm2 start agents/backend-agent-webhook.js --name backend-agent
pm2 start agents/testing-agent-webhook.js --name testing-agent

# Save configuration
pm2 save

# Auto-restart on server reboot
pm2 startup
```

---

## Testing Webhooks

### Manual Trigger

```bash
curl -X POST http://localhost:3001/execute \
  -H "Content-Type: application/json" \
  -d '{
    "taskId": "task-123",
    "task": {
      "task_id": "task-123",
      "title": "Build login form",
      "description": "Create a login form with email and password",
      "ai_prompt": "Build a React login form component..."
    }
  }'
```

### Expected Response

```json
{
  "success": true,
  "message": "Task execution started",
  "taskId": "task-123",
  "agent": "frontend-agent"
}
```

---

## Monitoring

### Agent Logs

Each agent logs webhook triggers and task execution:

```
[2025-11-05T10:30:00.000Z] [frontend-agent] [INFO] Webhook server listening on port 3001
[2025-11-05T10:30:00.000Z] [frontend-agent] [INFO] Endpoint: http://localhost:3001/execute
[2025-11-05T10:30:00.000Z] [frontend-agent] [INFO] Agent is dormant. Waiting for webhook triggers...
[2025-11-05T10:35:12.000Z] [frontend-agent] [INFO] Received webhook trigger for task: task-123
[2025-11-05T10:35:12.000Z] [frontend-agent] [INFO] Executing task task-123...
[2025-11-05T10:35:45.000Z] [frontend-agent] [INFO] Task task-123 completed successfully
```

### Health Check

```bash
# Check if agent is running
curl http://localhost:3001/execute -X OPTIONS
```

### PM2 Monitoring

```bash
pm2 status
pm2 logs frontend-agent
pm2 monit
```

---

## Troubleshooting

### Agent Not Receiving Webhooks

1. **Check agent is running:**
   ```bash
   curl -X OPTIONS http://localhost:3001/execute
   ```

2. **Check webhook configuration:**
   ```bash
   # In Node REPL
   node
   > const { getAgentConfig } = require('./lib/agent-config.ts')
   > console.log(getAgentConfig())
   ```

3. **Check network connectivity:**
   - Ensure Maestro can reach agent webhook URLs
   - Check firewall rules if running on different servers

### Task Not Executing

1. **Check Maestro logs** for webhook trigger attempts
2. **Check agent logs** for errors
3. **Verify ANTHROPIC_API_KEY** is set correctly
4. **Check task assignment** - ensure task has correct agent_type

### CORS Errors

Agents include CORS headers by default. If issues persist:
- Ensure webhook URL is accessible from browser (if testing from UI)
- Check browser console for specific CORS errors

---

## Migration from Polling

### Old Architecture (Polling)
```javascript
// Agent continuously polls Maestro
while (true) {
  const tasks = await pollForTasks();
  // ...
  await delay(60000);
}
```

### New Architecture (Webhooks)
```javascript
// Agent listens for webhooks, dormant when idle
agent.startWebhookServer(3001);

// Maestro triggers agent when task created
fetch('/api/agents/trigger/Frontend', {
  method: 'POST',
  body: JSON.stringify({ taskId: 'task-123' })
});
```

### Benefits
- **Cost:** Polling agents run 24/7. Webhook agents run only when triggered.
- **Latency:** Polling has up to 60s delay. Webhooks are instant.
- **Scalability:** Polling requires coordination. Webhooks are fully decoupled.

---

## Advanced Configuration

### Multiple Agents per Type

Run multiple frontend agents for load balancing:

```bash
# Agent 1
PORT=3001 node agents/frontend-agent-webhook.js

# Agent 2
PORT=3011 node agents/frontend-agent-webhook.js
```

Configure load balancer (nginx, HAProxy, etc.) to distribute webhooks.

### Custom Agent Types

Create custom agents by extending `WebhookAgent`:

```javascript
const WebhookAgent = require('./agent-webhook-base');

class CustomAgent extends WebhookAgent {
  constructor(maestroUrl, anthropicApiKey) {
    super('custom-agent', 'Custom', maestroUrl, anthropicApiKey);
  }

  getSystemPrompt() {
    return 'Your custom system prompt here...';
  }
}

module.exports = CustomAgent;
```

---

## Security

### Webhook Authentication

Add authentication to webhook endpoints:

```javascript
// In agent-webhook-base.js
if (req.headers['x-maestro-secret'] !== process.env.WEBHOOK_SECRET) {
  res.writeHead(401);
  res.end(JSON.stringify({ error: 'Unauthorized' }));
  return;
}
```

Configure in Maestro:
```javascript
// In lib/agent-config.ts
headers: {
  'X-Maestro-Secret': process.env.WEBHOOK_SECRET
}
```

### HTTPS

Always use HTTPS in production:

```bash
export FRONTEND_AGENT_WEBHOOK="https://frontend-agent.yourdomain.com/execute"
```

---

## FAQ

**Q: Can I still use polling agents?**
A: Yes, the old polling agents still work, but webhook agents are recommended for production.

**Q: Do agents need to be on the same server as Maestro?**
A: No! Agents can run anywhere as long as Maestro can reach their webhook URLs.

**Q: Can I run multiple instances of the same agent?**
A: Yes! Use a load balancer to distribute webhooks across multiple agent instances.

**Q: What happens if an agent crashes mid-task?**
A: The task remains "in-progress" in Maestro. The Supervisor Agent will detect it as stuck and reassign it.

**Q: How do I scale agents?**
A: Deploy agents as containers/serverless functions and configure webhook URLs to point to your scaled infrastructure.

---

## Next Steps

1. Start agents: `node agents/frontend-agent-webhook.js`
2. Create a task in Maestro UI
3. Watch agent logs for webhook trigger
4. See task complete automatically

For production deployments, see the Docker Compose or Cloud Run examples above.
