# Event-Driven Testing System

## Overview

The Maestro Testing Agent uses an **event-triggered** architecture that runs tests **when needed**, not on a schedule.

### Philosophy

**Test on events, not timers.**

- ✅ Task completed → Validate it worked
- ✅ PR created → Run full test suite
- ✅ Build failed → Create bug report
- ❌ Every 5 minutes → Wasteful

---

## How It Works

### 1. Event Bus System

Central event system that connects triggers to actions.

```javascript
import eventBus, { Events } from './lib/event-bus';

// Listen for task completion
eventBus.on(Events.TASK_COMPLETED, async (task) => {
  const validation = await TestingAgent.validateTask(task);
  if (!validation.passed) {
    await createBugTask(validation.issues);
  }
});
```

### 2. Test Levels

#### Quick Tests (Run Always)
- ✅ Build completes without errors
- ✅ No TypeScript errors
- ✅ Linting passes
- ✅ Basic functionality works
- ✅ No critical dependency vulnerabilities

**When:** Task completion, PR updates, manual trigger

**Duration:** ~30 seconds

#### Deep Tests (Run On Demand)
- ✅ Full integration testing
- ✅ Edge case detection
- ✅ Performance testing
- ✅ Security validation

**When:** PR creation, manual trigger

**Duration:** ~2-5 minutes

---

## Triggers

### Automatic Triggers

#### Task Completed
```javascript
// When agent marks task as done
eventBus.emit(Events.TASK_COMPLETED, task);

// → Runs quick validation tests
// → If fails, creates bug reports
// → Auto-creates fix tasks for critical/high bugs
```

#### PR Created
```javascript
// GitHub webhook receives PR event
POST /api/webhooks/github/pr

// → Runs full deep tests
// → Posts results as PR comment
// → Blocks merge if tests fail
```

#### PR Updated
```javascript
// New commits pushed to PR
POST /api/webhooks/github/pr

// → Runs quick tests
// → Updates PR comment with results
```

#### Build Failed
```javascript
eventBus.emit(Events.BUILD_FAILED, buildData);

// → Creates bug report
// → Auto-creates fix task
```

### Manual Triggers

#### Run Quick Tests
```bash
POST /api/testing/run-tests
```

```javascript
// From UI
const response = await fetch('/api/testing/run-tests', {
  method: 'POST',
  body: JSON.stringify({ mode: 'quick' })
});
```

#### Run Integration Tests
```bash
POST /api/testing/run-integration-tests
```

```javascript
// From UI
const response = await fetch('/api/testing/run-integration-tests', {
  method: 'POST'
});
```

---

## Setup

### 1. Initialize System

```javascript
import { initializeTestingSystem } from './lib/init-testing-system';

// Start event listeners
initializeTestingSystem();
```

### 2. Configure GitHub Webhook

**Repository Settings → Webhooks → Add webhook**

- **Payload URL:** `https://your-domain.com/api/webhooks/github/pr`
- **Content type:** `application/json`
- **Events:** Pull requests, Pushes
- **Secret:** (optional) Set `GITHUB_WEBHOOK_SECRET` env var

### 3. Environment Variables

```bash
# .env
MAESTRO_URL=http://localhost:3000
GITHUB_TOKEN=ghp_xxxxxxxxxxxxx  # For posting PR comments
GITHUB_WEBHOOK_SECRET=your_secret  # Optional
ANTHROPIC_API_KEY=sk-ant-xxxxx  # For Testing Agent
```

### 4. Add to Task Completion Flow

```javascript
// When marking task complete
async function completeTask(taskId) {
  const task = await getTask(taskId);
  task.status = 'done';
  await saveTask(task);

  // Trigger validation
  await eventBus.emit(Events.TASK_COMPLETED, task);
}
```

---

## Architecture

```
┌─────────────────┐
│  Event Trigger  │
│  (Task, PR, etc)│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Event Bus     │
│  (event-bus.js) │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Event Listener  │
│ (event-listeners│
│      .js)       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Test Executor   │
│ (test-executor  │
│      .js)       │
└────────┬────────┘
         │
    ┌────┴────┐
    ▼         ▼
┌────────┐ ┌──────┐
│ Quick  │ │ Deep │
│ Tests  │ │Tests │
└───┬────┘ └───┬──┘
    │          │
    ▼          ▼
┌──────────────────┐
│  Test Results    │
│  • Pass/Fail     │
│  • Bug Reports   │
│  • PR Comments   │
└──────────────────┘
```

---

## File Structure

```
lib/
├── event-bus.js              # Central event system
├── event-listeners.js        # Event → Action mappings
├── test-executor.js          # Test orchestration
├── quick-tests.js            # Fast validation tests
├── deep-tests.js             # Comprehensive tests
├── bug-tracker.js            # Bug management
├── integration-tests.js      # Workflow tests
├── edge-case-detector.js     # Edge case testing
└── init-testing-system.js    # System initialization

app/api/
├── testing/
│   ├── run-tests/route.ts              # Manual quick tests
│   └── run-integration-tests/route.ts  # Manual deep tests
└── webhooks/
    └── github/
        └── pr/route.ts                  # GitHub PR webhook

agents/
└── testing-agent.js          # Testing Agent implementation
```

---

## Events Reference

### Task Events
- `TASK_CREATED` - New task created
- `TASK_STARTED` - Agent started working on task
- `TASK_COMPLETED` - Task marked complete ⚡ **Triggers validation**
- `TASK_FAILED` - Task execution failed
- `TASK_BLOCKED` - Task blocked by dependency

### GitHub Events
- `PR_CREATED` - Pull request opened ⚡ **Triggers deep tests**
- `PR_UPDATED` - New commits pushed ⚡ **Triggers quick tests**
- `PR_MERGED` - Pull request merged
- `COMMIT_PUSHED` - Commits pushed to branch

### Testing Events
- `TEST_RUN_STARTED` - Test execution started
- `TEST_RUN_COMPLETED` - All tests passed
- `TEST_FAILED` - One or more tests failed
- `BUG_FOUND` - Bug discovered ⚡ **May create task**

### Build Events
- `BUILD_STARTED` - Build process started
- `BUILD_COMPLETED` - Build succeeded
- `BUILD_FAILED` - Build failed ⚡ **Creates bug report**

---

## Usage Examples

### Example 1: Task Completion with Validation

```javascript
import eventBus, { Events } from './lib/event-bus';

// Complete a task
const task = {
  task_id: 'task-123',
  title: 'Build user profile page',
  status: 'done'
};

// Emit completion event
await eventBus.emit(Events.TASK_COMPLETED, task);

// Event listener automatically:
// 1. Runs quick tests (build, types, lint)
// 2. If tests fail, creates bug reports
// 3. Converts critical bugs to tasks
// 4. Assigns to appropriate agent
```

### Example 2: PR Testing Flow

```javascript
// GitHub sends webhook when PR created
POST /api/webhooks/github/pr
{
  "action": "opened",
  "pull_request": {
    "number": 42,
    "title": "Add authentication",
    ...
  }
}

// System automatically:
// 1. Triggers PR_CREATED event
// 2. Runs full integration tests
// 3. Runs edge case tests
// 4. Runs performance tests
// 5. Posts results as PR comment

// PR Comment:
// ## ✅ Test Results
// **Status:** PASS
// **Duration:** 2.3s
//
// ### Integration Tests
// ✅ Product Improvement Flow
// ✅ Task Creation Flow
// ✅ Agent Communication Flow
//
// ### Edge Cases
// ✅ Empty Input (passed)
// ✅ Large Dataset (passed)
```

### Example 3: Manual Test Execution

```javascript
// From Testing Dashboard UI
async function runTests() {
  const response = await fetch('/api/testing/run-tests', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mode: 'quick' })
  });

  const result = await response.json();

  if (result.passed) {
    console.log('✅ All tests passed!');
  } else {
    console.log('❌ Tests failed:', result.results);
  }
}
```

---

## Best Practices

### ✅ Do

- **Emit events for all important actions**
  ```javascript
  await eventBus.emit(Events.TASK_COMPLETED, task);
  ```

- **Run quick tests on task completion**
  - Fast feedback loop
  - Catches issues early

- **Run deep tests on PR creation**
  - Comprehensive validation
  - Before code review

- **Auto-create tasks from critical bugs**
  - Immediate action on serious issues

### ❌ Don't

- **Don't poll for changes**
  - Use events instead

- **Don't run deep tests on every commit**
  - Too slow, run quick tests instead

- **Don't ignore test failures**
  - Fix or create bug task

---

## Monitoring

### View Event History

```javascript
import eventBus from './lib/event-bus';

// Get recent events
const recentEvents = eventBus.getHistory(10);

console.log(recentEvents);
// [
//   { event: 'TASK_COMPLETED', data: {...}, timestamp: '...' },
//   { event: 'TEST_RUN_STARTED', data: {...}, timestamp: '...' },
//   ...
// ]
```

### View Listener Stats

```javascript
import { getEventListenerStats } from './lib/event-listeners';

const stats = getEventListenerStats();

console.log(stats);
// {
//   registered_events: ['TASK_COMPLETED', 'PR_CREATED', ...],
//   listener_counts: [
//     { event: 'TASK_COMPLETED', count: 1 },
//     { event: 'PR_CREATED', count: 1 },
//     ...
//   ],
//   recent_events: [...]
// }
```

### View Test Statistics

```javascript
const response = await fetch('/api/testing/run-tests');
const { statistics } = await response.json();

console.log(statistics);
// {
//   total_test_runs: 42,
//   quick_tests: 30,
//   deep_tests: 12,
//   passed: 38,
//   failed: 4,
//   last_run: '2025-11-05T10:30:00Z'
// }
```

---

## Troubleshooting

### Tests Not Running

1. Check event listeners are initialized:
   ```javascript
   import { initializeTestingSystem } from './lib/init-testing-system';
   initializeTestingSystem();
   ```

2. Verify events are being emitted:
   ```javascript
   const history = eventBus.getHistory(10);
   console.log(history);
   ```

3. Check console for errors:
   ```bash
   [EventListeners] Task completed: task-123
   [EventListeners] Quick tests PASSED
   ```

### PR Comments Not Posting

1. Verify `GITHUB_TOKEN` is set
2. Token needs `repo` scope
3. Check webhook is configured correctly
4. Look for errors in webhook handler

### Slow Test Execution

1. Use quick tests for frequent checks
2. Save deep tests for PR creation
3. Optimize test timeouts
4. Run tests in parallel where possible

---

## Summary

The event-driven testing system ensures **quality without waste**:

- ✅ Tests run when they matter
- ✅ Fast feedback on task completion
- ✅ Comprehensive validation on PR
- ✅ Automatic bug tracking and task creation
- ✅ No polling, no scheduled jobs
- ✅ Scales with your workflow

**Next:** Set up GitHub webhook and watch tests trigger automatically! 🚀
