# Maestro Webhook Infrastructure Guide

## Overview

Maestro's webhook infrastructure enables **event-driven, distributed agent architecture**. Agents run as separate services (Railway, Render, etc.) and respond to events via webhooks.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Maestro Orchestrator                     │
│                                                              │
│  ┌───────────────┐    ┌──────────────┐    ┌─────────────┐  │
│  │   GitHub      │───→│   Webhook    │───→│   Cost      │  │
│  │   Webhooks    │    │   Router     │    │   Tracker   │  │
│  └───────────────┘    └──────────────┘    └─────────────┘  │
│                              │                               │
└──────────────────────────────┼───────────────────────────────┘
                               │
         ┌─────────────────────┼─────────────────────┐
         │                     │                     │
         ▼                     ▼                     ▼
┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐
│ Frontend Agent  │   │ Backend Agent   │   │ Testing Agent   │
│ (Railway)       │   │ (Render)        │   │ (Fly.io)       │
│                 │   │                 │   │                 │
│ POST /execute   │   │ POST /execute   │   │ POST /execute   │
│ POST /status    │   │ POST /status    │   │ POST /status    │
│ GET  /health    │   │ GET  /health    │   │ GET  /health    │
└─────────────────┘   └─────────────────┘   └─────────────────┘
         │                     │                     │
         └─────────────────────┼─────────────────────┘
                               │
                               ▼
                    Report back to Maestro
                    POST /api/tasks/complete
```

## Key Features

✅ **Event-Driven** - Agents wake on demand, dormant when idle
✅ **Distributed** - Deploy agents anywhere (Railway, Render, Fly.io, etc.)
✅ **Cost Efficient** - Pay only for agent execution time
✅ **Secure** - HMAC signature verification on all webhooks
✅ **Reliable** - Automatic retry with exponential backoff
✅ **Observable** - Full delivery tracking and cost monitoring

---

## Core Components

### 1. Webhook Delivery System (`/lib/webhook-delivery.ts`)

Manages sending webhooks to agents with retry logic.

**Features:**
- Agent registration and configuration
- Signature generation (HMAC-SHA256)
- Retry logic with exponential backoff
- Delivery tracking
- Broadcasting to multiple agents

**Usage:**

```typescript
import { WebhookDeliveryService } from '@/lib/webhook-delivery';

// Register agent
WebhookDeliveryService.registerAgent({
  agent_id: 'frontend-agent',
  agent_name: 'Frontend Agent',
  webhook_url: 'https://my-agent.railway.app/execute',
  secret: 'your-secret-key',
  enabled: true,
  events: ['task.assigned', 'github.push'],
});

// Send webhook
const delivery = await WebhookDeliveryService.sendWebhook(config, payload);

// Broadcast to all agents
const deliveries = await WebhookDeliveryService.broadcast(payload);

// Get stats
const stats = WebhookDeliveryService.getStats();
```

---

### 2. GitHub Webhook Handler (`/app/api/webhooks/github/route.ts`)

Receives events from GitHub and routes them to agents.

**Supported Events:**
- `push` - Code pushed to repository
- `pull_request` - PR opened, updated, merged
- `issues` - Issue opened, closed

**Setup:**

1. Go to GitHub repo → Settings → Webhooks
2. Add webhook:
   - **Payload URL:** `https://your-maestro.com/api/webhooks/github`
   - **Content type:** `application/json`
   - **Secret:** Set `GITHUB_WEBHOOK_SECRET` in `.env`
   - **Events:** Choose which events to receive

**Event Routing:**

```typescript
// Push event → Triggers relevant agents based on files changed
- Frontend files (.tsx, .jsx, .css) → Frontend Agent
- Backend files (api/, server/) → Backend Agent
- Database files (migrations/, schema.sql) → Database Agent
- Test files (*.test.*, *.spec.*) → Testing Agent

// Pull Request → Triggers code review
- PR opened/updated → Code Review Agent
- PR merged → Deployment Agent

// Issue opened → Creates task
- Bug label → Bug Fix Agent
- Feature label → Feature Agent
```

---

### 3. Task Completion Webhook (`/app/api/tasks/complete/route.ts`)

Receives completion reports from agents.

**Agent Flow:**

```javascript
// 1. Agent receives task
POST /execute
{
  "event": "task.assigned",
  "data": {
    "task_id": "task-123",
    "ai_prompt": "Build login form..."
  }
}

// 2. Agent executes task using Claude

// 3. Agent reports back to Maestro
POST https://maestro.app/api/tasks/complete
{
  "task_id": "task-123",
  "success": true,
  "result": {
    "files_changed": ["components/LoginForm.tsx"],
    "summary": "Created login form with validation",
    "cost_usd": 0.0034
  },
  "execution_time_ms": 2341
}
```

---

### 4. Cost Tracking (`/lib/cost-tracker.ts`)

Monitors costs across all webhooks and API calls.

**Tracked Events:**
- Webhook deliveries
- API calls (Anthropic, GitHub)
- Agent executions

**Cost Estimates:**

| Service | Cost |
|---------|------|
| Webhook delivery | $0.000001 per delivery |
| GitHub API call | $0.00001 per call |
| Claude Haiku (500 tokens) | ~$0.0015 |
| Claude Haiku (2000 tokens) | ~$0.006 |
| Claude Sonnet (2000 tokens) | ~$0.024 |

**Usage:**

```typescript
import { CostTracker } from '@/lib/cost-tracker';

// Track events
CostTracker.trackWebhook(agentId, agentName);
CostTracker.trackAPICall('anthropic', '/messages', { tokens_used: 2000, model: 'claude-3-5-haiku' });
CostTracker.trackAgentExecution(agentId, agentName, 0.0034, taskId);

// Get summaries
const monthSummary = CostTracker.getCurrentMonthSummary();
const todaySummary = CostTracker.getTodaySummary();

// Set alerts
CostTracker.setAlertThreshold(100); // Alert at $100/month

// Get projections
const projection = CostTracker.getMonthlyProjection();
console.log(`Projected: $${projection.projected.toFixed(2)}`);
```

---

### 5. Webhook Management Dashboard (`/app/webhooks/page.tsx`)

Visual interface for managing webhooks.

**Features:**
- View all agent configurations
- Add/remove/enable/disable agents
- View recent deliveries
- Monitor success rates
- Track costs

**Access:** `http://localhost:3000/webhooks`

---

## Deploying Agents

### Option 1: Railway

1. **Create Template Directory:**
```bash
cp -r agent-templates/webhook-agent my-frontend-agent
cd my-frontend-agent
```

2. **Configure:**
```bash
cp .env.example .env
# Edit .env with your values
```

3. **Deploy:**
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Deploy
railway up
```

4. **Get URL:**
```bash
railway domain
# Returns: https://my-frontend-agent-production.up.railway.app
```

5. **Register in Maestro:**
- Go to `/webhooks` in Maestro
- Click "Add Agent Webhook"
- Enter agent details and Railway URL
- Save the generated secret

### Option 2: Render

1. Create new Web Service
2. Connect GitHub repo
3. Configure:
   - Build: `npm install`
   - Start: `npm start`
4. Add environment variables
5. Deploy
6. Register in Maestro with Render URL

### Option 3: Fly.io

1. Install flyctl: `curl -L https://fly.io/install.sh | sh`
2. Login: `fly auth login`
3. Launch: `fly launch`
4. Deploy: `fly deploy`
5. Register in Maestro

---

## Agent Template Structure

```
agent-templates/webhook-agent/
├── server.js           # Main webhook server
├── package.json        # Dependencies
├── .env.example        # Environment template
├── railway.json        # Railway config
├── render.yaml         # Render config
└── README.md          # Deployment guide
```

**Key Endpoints:**

- `POST /execute` - Receive task from Maestro
- `POST /status` - Status check from Maestro
- `GET /health` - Health check
- `GET /` - Agent information

---

## Security

### Signature Verification

All webhooks use HMAC-SHA256 signatures:

```javascript
// Maestro generates signature
const signature = crypto
  .createHmac('sha256', WEBHOOK_SECRET)
  .update(JSON.stringify(payload))
  .digest('hex');

// Sends header: X-Maestro-Signature: sha256=<signature>

// Agent verifies signature
function verifySignature(payload, signature) {
  const expected = crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(payload)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature.replace('sha256=', '')),
    Buffer.from(expected)
  );
}
```

### Best Practices

1. **Never commit secrets**
   - Use environment variables
   - Rotate secrets every 90 days

2. **Use HTTPS**
   - Always use HTTPS in production
   - Railway/Render provide free SSL

3. **Validate payloads**
   - Check signature on every request
   - Validate event types

4. **Set timeouts**
   - Default: 30 seconds
   - Adjust based on task complexity

5. **Monitor costs**
   - Set cost alerts
   - Review monthly summaries

---

## Event Types

| Event | Trigger | Agents Notified |
|-------|---------|----------------|
| `task.assigned` | Task assigned to agent | Specific agent |
| `task.updated` | Task updated | Assigned agent |
| `task.completed` | Task marked complete | All agents (broadcast) |
| `task.failed` | Task failed | Supervisor agent |
| `github.push` | Code pushed | Agents based on files |
| `github.pull_request` | PR opened/updated/merged | Code review agent |
| `github.issue` | Issue opened | Bug fix/feature agents |
| `agent.wake` | Manual agent wake | Specific agent |
| `agent.status` | Status check | Specific agent |
| `cost.alert` | Cost threshold exceeded | Supervisor agent |

---

## Cost Optimization

### Use Haiku for Cost Efficiency

```javascript
// Claude 3.5 Haiku - Cost-efficient ($0.80/$4.00 per M tokens)
const CONFIG = {
  MODEL: 'claude-3-5-haiku-20241022',
};

// VS Claude 3.5 Sonnet - More powerful ($3.00/$15.00 per M tokens)
```

### Batch Operations

```typescript
// Instead of triggering agents individually
for (const task of tasks) {
  await triggerAgent(task);
}

// Batch and send together
const payload = {
  event: 'task.batch',
  data: { tasks }
};
await WebhookDeliveryService.broadcast(payload);
```

### Cache Results

```javascript
// In agent, cache common responses
const cache = new Map();

async function executeTask(taskRequest) {
  const cacheKey = hash(taskRequest.ai_prompt);

  if (cache.has(cacheKey)) {
    return cache.get(cacheKey);
  }

  const result = await callClaude(taskRequest);
  cache.set(cacheKey, result);

  return result;
}
```

---

## Monitoring & Debugging

### View Delivery Logs

```typescript
// Get recent deliveries
const deliveries = WebhookDeliveryService.getRecentDeliveries(50);

// Get deliveries for specific agent
const agentDeliveries = WebhookDeliveryService.getAgentDeliveries('frontend-agent', 20);

// Get failed deliveries
const failed = deliveries.filter(d => d.status === 'failed');
```

### Check Agent Health

```bash
# Call health endpoint
curl https://your-agent.railway.app/health

# Response
{
  "status": "healthy",
  "agent": "Frontend Agent",
  "uptime": 3600,
  "model": "claude-3-5-haiku-20241022"
}
```

### Monitor Costs

```typescript
// Get cost trend
const trend = CostTracker.getCostTrend(30); // Last 30 days

// Get high-cost events
const expensive = CostTracker.getHighCostEvents(0.10); // >= $0.10

// Get projection
const projection = CostTracker.getMonthlyProjection();
console.log(`Current: $${projection.current.toFixed(2)}`);
console.log(`Projected: $${projection.projected.toFixed(2)}`);
```

---

## Troubleshooting

### Webhook Not Received

1. **Check agent is enabled**
```typescript
const config = WebhookDeliveryService.getAgentConfig('frontend-agent');
console.log(config.enabled); // Should be true
```

2. **Verify URL is accessible**
```bash
curl -X POST https://your-agent.railway.app/execute \
  -H "Content-Type: application/json" \
  -d '{"test": true}'
```

3. **Check delivery status**
```typescript
const delivery = WebhookDeliveryService.getDelivery(deliveryId);
console.log(delivery.status);
console.log(delivery.response);
```

### Signature Verification Failing

1. **Ensure secret matches** - Must be identical in Maestro and agent
2. **Check payload is not modified** - Send raw body to verification
3. **Verify header format** - Should be `sha256=<hex>`

### High Costs

1. **Switch to Haiku model**
2. **Reduce max_tokens**
3. **Batch similar requests**
4. **Cache common results**
5. **Set cost alerts**

---

## Examples

### Example 1: Frontend Agent

```javascript
// Specialized agent for UI/UX tasks
const CONFIG = {
  AGENT_ID: 'frontend-agent',
  AGENT_NAME: 'Frontend Agent',
  MODEL: 'claude-3-5-haiku-20241022',
};

// Custom execution logic
async function executeTask(taskRequest) {
  // Add frontend-specific context
  const context = `
    You are a frontend developer specializing in React and TypeScript.
    Use modern UI patterns and accessibility best practices.
  `;

  const message = await anthropic.messages.create({
    model: CONFIG.MODEL,
    system: context,
    messages: [{ role: 'user', content: taskRequest.ai_prompt }],
  });

  return { success: true, result: { output: message.content[0].text } };
}
```

### Example 2: GitHub Push Handler

```typescript
// In Maestro, handle GitHub push event
async function handlePushEvent(payload: GitHubWebhookPayload) {
  const frontendChanged = payload.commits.some(c =>
    c.modified.some(f => f.match(/\.(tsx?|jsx?|css)$/))
  );

  if (frontendChanged) {
    const webhookPayload: WebhookPayload = {
      event: 'github.push',
      data: {
        commits: payload.commits,
        branch: payload.ref,
      },
    };

    const config = WebhookDeliveryService.getAgentConfig('frontend-agent');
    await WebhookDeliveryService.sendWebhook(config, webhookPayload);
  }
}
```

---

## API Reference

### Webhook Delivery Service

- `registerAgent(config)` - Register agent webhook
- `updateAgentConfig(agentId, updates)` - Update configuration
- `deleteAgentConfig(agentId)` - Remove configuration
- `sendWebhook(config, payload)` - Send webhook to agent
- `broadcast(payload)` - Send to all subscribed agents
- `getAgentDeliveries(agentId, limit)` - Get delivery history
- `retryDelivery(deliveryId)` - Retry failed delivery
- `getStats()` - Get delivery statistics

### Cost Tracker

- `trackWebhook(agentId, agentName)` - Track webhook cost
- `trackAPICall(provider, endpoint, details)` - Track API cost
- `trackAgentExecution(agentId, name, cost)` - Track execution cost
- `getCurrentMonthSummary()` - Get month summary
- `getTodaySummary()` - Get today's summary
- `setAlertThreshold(amount)` - Set cost alert
- `getMonthlyProjection()` - Project end-of-month cost

---

## Next Steps

1. **Deploy first agent** - Use Railway template
2. **Configure webhooks** - Register agent in Maestro
3. **Set up GitHub webhooks** - Connect repository
4. **Monitor costs** - Set alerts and track usage
5. **Scale agents** - Add more specialized agents

---

For issues and questions, see the main [README.md](./README.md) or open an issue on GitHub.
