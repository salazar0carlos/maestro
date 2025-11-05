# Maestro Integration Layer Guide

## Overview

The Integration Agent provides Maestro with external system connections and inter-agent communication capabilities.

## Features

### 1. GitHub Integration (`/lib/github-integration.ts`)

Enables agents to interact with GitHub repositories.

**Capabilities:**
- Create branches for agent work
- Commit files and changes
- Create pull requests for human review
- Merge PRs (with approval)
- Rate limit handling and retry logic

**Usage:**

```typescript
import { GitHubIntegration } from '@/lib/github-integration';

// Initialize from environment variables
const github = GitHubIntegration.fromEnv();

// Create a new branch
await github.createBranch('feature/new-feature', 'main');

// Commit a file
await github.commitFile(
  'feature/new-feature',
  'src/new-feature.ts',
  'export const feature = () => {}',
  'Add new feature implementation'
);

// Create pull request
const pr = await github.createPullRequest(
  'feature/new-feature',
  'Add new feature',
  'This PR adds a new feature...'
);
```

**Configuration:**

Set environment variables in `.env.local`:

```bash
GITHUB_TOKEN=ghp_your_token
GITHUB_OWNER=your-username
GITHUB_REPO=your-repo
```

**Security:**
- ✅ Tokens stored in environment variables
- ✅ Automatic retry with exponential backoff
- ✅ Rate limit detection and handling
- ✅ Never logs sensitive credentials

---

### 2. Agent Communication (`/lib/agent-communication.ts`)

Enables agents to send messages and coordinate work.

**Message Types:**
- `task_complete` - Agent finished task
- `need_info` - Agent needs information
- `context_share` - Agent shares knowledge
- `dependency_alert` - Task has dependencies
- `error_report` - Agent encountered error

**Usage:**

```typescript
import { AgentCommunication, sendTaskComplete } from '@/lib/agent-communication';

// Send message between agents
AgentCommunication.sendMessage(
  'Backend Agent',
  'Frontend Agent',
  'context_share',
  {
    topic: 'api_endpoints',
    endpoints: [
      { path: '/api/tasks', method: 'GET' }
    ]
  }
);

// Get unread messages
const messages = AgentCommunication.getMessagesFor('Frontend Agent');

// Mark as read
AgentCommunication.markRead(messageId);

// Broadcast to all agents
AgentCommunication.broadcast(
  'Supervisor Agent',
  'status_update',
  { status: 'deployment_ready' }
);
```

---

### 3. Context Sharing (`/lib/context-sharing.ts`)

High-level API for sharing specific types of context between agents.

**Use Cases:**
- Backend shares API endpoints with Frontend
- Frontend shares component patterns
- Product Improvement shares findings
- Testing shares test results

**Usage:**

```typescript
import { ContextSharing } from '@/lib/context-sharing';

// Backend shares API endpoints
ContextSharing.shareAPIEndpoints('Backend Agent', [
  {
    path: '/api/tasks',
    method: 'GET',
    response: { tasks: [] }
  }
]);

// Frontend shares component patterns
ContextSharing.shareComponentPatterns('Frontend Agent', [
  {
    name: 'TaskCard',
    type: 'component',
    path: 'components/TaskCard.tsx',
    props: { task: 'MaestroTask' }
  }
]);

// Product Improvement shares findings
ContextSharing.shareImprovements('Product Agent', [
  {
    id: 'imp-1',
    category: 'performance',
    severity: 'high',
    title: 'Optimize database queries',
    description: 'Queries are slow...'
  }
]);

// Retrieve shared context
const apiEndpoints = ContextSharing.getLatestContext('api_endpoints');
```

---

### 4. Dependency Detection (`/lib/dependency-detection.ts`)

Analyzes task dependencies and determines optimal execution order.

**Features:**
- Automatic dependency detection
- Topological sorting
- Circular dependency detection
- Parallel execution grouping
- Critical path calculation

**Usage:**

```typescript
import { DependencyDetector } from '@/lib/dependency-detection';
import { getTasks } from '@/lib/storage';

const tasks = getTasks();

// Analyze dependencies
const deps = DependencyDetector.analyzeDependencies(tasks);

// Order tasks by dependencies
const ordered = DependencyDetector.orderByDependencies(tasks);

// Get execution groups (for parallel execution)
const groups = DependencyDetector.getExecutionGroups(tasks);

// Get tasks that can start now
const ready = DependencyDetector.getReadyTasks(tasks);

// Get critical path
const criticalPath = DependencyDetector.getCriticalPath(tasks);

// Estimate completion time
const estimate = DependencyDetector.estimateCompletionTime(tasks);
console.log(`Sequential: ${estimate.sequential}h, Parallel: ${estimate.parallel}h`);
```

---

### 5. Knowledge Base (`/lib/knowledge-base.ts`)

Stores and retrieves agent learnings and insights.

**Entry Types:**
- `learning` - Agent learned something
- `pattern` - Reusable pattern discovered
- `solution` - Solution to a problem
- `insight` - Valuable insight
- `warning` - Something to avoid

**Usage:**

```typescript
import { KnowledgeBase } from '@/lib/knowledge-base';

// Save knowledge
KnowledgeBase.saveKnowledge(
  'Backend Agent',
  'Database Connection Pattern',
  'Use connection pooling for better performance...',
  'pattern',
  {
    project_id: 'project-1',
    confidence: 'high',
    customTags: ['database', 'performance']
  }
);

// Search knowledge
const results = KnowledgeBase.search('database');

// Advanced search
const filtered = KnowledgeBase.advancedSearch({
  topic: 'database',
  type: 'pattern',
  minConfidence: 'high'
});

// Get relevant knowledge for a task
const relevant = KnowledgeBase.getRelevantKnowledge(
  'Backend Agent',
  {
    title: 'Optimize database queries',
    description: 'Improve query performance'
  }
);

// Mark as verified
KnowledgeBase.verify(knowledgeId);

// Get statistics
const stats = KnowledgeBase.getStats();
```

---

### 6. Integration Health (`/lib/integration-health.ts`)

Monitors health of all integrations.

**Monitored Integrations:**
- GitHub API
- Agent Communication
- Knowledge Base

**Usage:**

```typescript
import { IntegrationHealth } from '@/lib/integration-health';

// Check all integrations
const health = await IntegrationHealth.checkAll();

console.log(health.overall_status); // 'healthy' | 'degraded' | 'unhealthy'

// Check specific integration
const github = await IntegrationHealth.checkGitHub();
console.log(github.details.rate_limit_remaining);

// Start monitoring (checks every 5 minutes)
const stopMonitoring = IntegrationHealth.startMonitoring();

// Stop monitoring
stopMonitoring();

// Get uptime percentage
const uptime = IntegrationHealth.getUptime('github', 24); // last 24 hours
console.log(`GitHub uptime: ${uptime}%`);
```

---

## Integration Dashboard

Visit `/integrations` to see:
- Overall system status
- Integration health cards
- Recent agent messages
- Knowledge base statistics
- Task dependencies

**Features:**
- Real-time status updates
- Auto-refresh toggle
- Color-coded health indicators
- Detailed integration metrics

---

## Security Best Practices

### GitHub Integration

1. **Never commit tokens** - Use `.env.local` (git-ignored)
2. **Use minimal scopes** - Only request required permissions
3. **Rotate tokens regularly** - Change tokens every 90 days
4. **Monitor rate limits** - Watch for approaching limits
5. **Enable 2FA** - Protect your GitHub account

### Agent Communication

1. **Validate messages** - Check message structure
2. **Sanitize payloads** - Don't trust message content
3. **Rate limit** - Prevent message flooding
4. **Audit logs** - Track all communications

### Knowledge Base

1. **Verify entries** - Mark trusted knowledge as verified
2. **Regular cleanup** - Remove outdated entries
3. **Access control** - Implement read/write permissions (future)
4. **Backup data** - Export knowledge regularly

---

## Troubleshooting

### GitHub Integration Issues

**Problem:** "GitHub token not configured"

**Solution:**
```bash
# Add to .env.local
GITHUB_TOKEN=ghp_your_token
GITHUB_OWNER=your-username
GITHUB_REPO=your-repo
```

**Problem:** "Rate limit exceeded"

**Solution:** Wait for rate limit reset (shown in health check) or use a different token.

---

### Agent Communication Issues

**Problem:** Messages not appearing

**Solution:**
```typescript
// Clear message cache
AgentCommunication.clearAllMessages();

// Or clear old messages
AgentCommunication.clearOldMessages(30); // 30 days
```

---

### Knowledge Base Issues

**Problem:** Storage quota exceeded

**Solution:**
```typescript
// Clear old entries
const kb = KnowledgeBase.export();
// Save backup
// Then clear
KnowledgeBase.clearAll();
```

---

## Architecture

```
┌─────────────────────────────────────────┐
│         Maestro Intelligence Layer       │
├─────────────────────────────────────────┤
│                                         │
│  ┌──────────────┐    ┌──────────────┐  │
│  │   GitHub     │    │    Agent     │  │
│  │ Integration  │    │Communication │  │
│  └──────────────┘    └──────────────┘  │
│                                         │
│  ┌──────────────┐    ┌──────────────┐  │
│  │   Context    │    │ Dependency   │  │
│  │   Sharing    │    │  Detection   │  │
│  └──────────────┘    └──────────────┘  │
│                                         │
│  ┌──────────────┐    ┌──────────────┐  │
│  │  Knowledge   │    │ Integration  │  │
│  │     Base     │    │   Health     │  │
│  └──────────────┘    └──────────────┘  │
│                                         │
└─────────────────────────────────────────┘
```

---

## Future Enhancements

- [ ] Slack integration for notifications
- [ ] Discord webhook support
- [ ] Database persistence (PostgreSQL)
- [ ] GraphQL API for integrations
- [ ] Real-time WebSocket updates
- [ ] Metrics and analytics dashboard
- [ ] Integration plugin system
- [ ] OAuth for secure auth

---

## Contributing

When adding new integrations:

1. Create module in `/lib/`
2. Add health check to `integration-health.ts`
3. Update types in `types.ts`
4. Add UI in `/app/integrations/page.tsx`
5. Document in this guide
6. Add tests (future)

---

## Support

For issues and questions:
- GitHub Issues: https://github.com/salazar0carlos/maestro/issues
- Documentation: See README.md
- Examples: See `/examples` (future)
