# Research Agent Integration Guide - Event-Driven Architecture

## Overview

The Research Agent operates as an **on-demand intelligence layer** for the Maestro platform, triggered by events from other agents or the UI. This document describes the event-driven architecture and integration patterns.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Maestro Platform                         │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────┐                                        │
│  │ Product          │                                        │
│  │ Improvement      │                                        │
│  │ Agent            │                                        │
│  └────────┬─────────┘                                        │
│           │ emit('research_needed')                          │
│           ▼                                                  │
│  ┌──────────────────────────────────────────┐               │
│  │          EventBus (Pub/Sub)              │               │
│  └──────────────┬───────────────────────────┘               │
│                 │ research_needed event                      │
│                 ▼                                            │
│  ┌──────────────────────────────────────────┐               │
│  │ Research Agent                            │               │
│  │  ┌────────────────────────────┐          │               │
│  │  │ Smart Cache Check          │          │               │
│  │  │ (Knowledge Base)           │          │               │
│  │  └───────┬────────────────────┘          │               │
│  │          │ if cache miss                  │               │
│  │          ▼                                 │               │
│  │  ┌────────────────────────────┐          │               │
│  │  │ Research Queue             │          │               │
│  │  │ Batch: 5 req OR 6 hours    │          │               │
│  │  └───────┬────────────────────┘          │               │
│  │          │                                 │               │
│  │          ▼                                 │               │
│  │  ┌────────────────────────────┐          │               │
│  │  │ Execute Batch              │          │               │
│  │  │ (Claude API)               │          │               │
│  │  └───────┬────────────────────┘          │               │
│  │          │                                 │               │
│  └──────────┼─────────────────────────────────┘               │
│             │ emit('research_complete')                      │
│             ▼                                                 │
│  ┌──────────────────┐         ┌──────────────────┐          │
│  │ Requesting       │ ◄────── │ Knowledge        │          │
│  │ Agent            │         │ Base             │          │
│  └──────────────────┘         └──────────────────┘          │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## Key Features

### 1. Event-Driven Architecture
- **No Continuous Polling**: Research Agent only activates when triggered
- **EventBus Communication**: Loose coupling between agents
- **Asynchronous Processing**: Non-blocking research requests

### 2. Smart Batching & Queue System
- **Batch Size Trigger**: Executes when 5 requests accumulated
- **Time-Based Trigger**: Executes after 6 hours if batch not full
- **Reduces API Costs**: Fewer, more efficient API calls

### 3. Intelligent Caching
- **Knowledge Base Check**: Searches cache before new research
- **Instant Cache Hits**: Returns cached results immediately
- **API Call Reduction**: Avoids duplicate research

---

## Available Events

### Events Emitted BY Research Agent

| Event | Data | Description |
|-------|------|-------------|
| `research_complete` | `{ requestId, topic, research, cached }` | Research completed successfully |
| `research_error` | `{ requestId, error }` | Research request failed |
| `research_batch_start` | `{ batch_size, requests }` | Batch execution started |
| `research_batch_complete` | `{ batch_size, processed }` | Batch execution completed |
| `research_queue_status_response` | `{ queue_size, next_execution, stats }` | Queue status response |

### Events Listened TO by Research Agent

| Event | Data | Description |
|-------|------|-------------|
| `research_needed` | `{ topic, context, requestedBy, requestId }` | Request research (queued) |
| `research_immediate` | `{ topic, context, requestedBy, requestId }` | Request immediate research (bypasses queue) |
| `research_queue_status` | `{}` | Request queue status |
| `research_execute_batch` | `{}` | Force batch execution now |

---

## Integration Pattern: Product Improvement Agent

### Example: Triggering Research on Unknown Pattern

```javascript
const Agent = require('./agent-base');
const EventBus = require('../lib/event-bus');

class ProductImprovementAgent extends Agent {
  constructor(maestroUrl = 'http://localhost:3000', anthropicApiKey = '') {
    super('product-improvement-agent', 'Product Improvement', maestroUrl, anthropicApiKey);

    // Setup research result listener
    this.setupResearchListeners();
  }

  setupResearchListeners() {
    // Listen for research completion
    EventBus.on('research_complete', (data) => {
      if (data.requestedBy === 'product-improvement-agent') {
        this.handleResearchResult(data);
      }
    });
  }

  /**
   * Analyze unknown pattern with event-driven research
   */
  async analyzeUnknownPattern(pattern, codeExample) {
    try {
      this.log(`Analyzing unfamiliar pattern: ${pattern}`, 'info');

      // Generate request ID for tracking
      const requestId = `pia-${Date.now()}`;

      // Trigger research via event
      EventBus.emit('research_needed', {
        topic: `Best practices for ${pattern}`,
        context: {
          type: 'best-practices',
          codeExample: codeExample,
          requirements: 'Identify industry standards and recommended approaches'
        },
        requestedBy: 'product-improvement-agent',
        requestId: requestId,
        priority: 'normal'
      });

      this.log(`Research requested (ID: ${requestId}), continuing with other work...`, 'info');

      // Agent can continue with other work while research is queued
      // Result will come via 'research_complete' event

      return {
        pattern,
        research_requested: true,
        requestId: requestId,
        status: 'research_queued'
      };
    } catch (error) {
      this.log(`Error analyzing pattern: ${error.message}`, 'error');
      throw error;
    }
  }

  /**
   * Handle research results when they arrive
   */
  handleResearchResult(data) {
    const { requestId, topic, research, cached } = data;

    this.log(`Research complete: ${topic} (cached: ${cached})`, 'info');

    // Use research findings
    const recommendations = research.recommendations || [];
    const findings = research.findings || [];

    // Apply recommendations to product improvements
    this.applyResearchFindings(topic, findings, recommendations);
  }

  applyResearchFindings(topic, findings, recommendations) {
    // Implementation logic here
    this.log(`Applying ${findings.length} findings and ${recommendations.length} recommendations`, 'info');
  }
}

module.exports = ProductImprovementAgent;
```

---

## Integration Pattern: Wait for Research

### Example: Immediate Research with Wait

```javascript
const EventBus = require('../lib/event-bus');

class BackendAgent extends Agent {
  async implementFeature(featureSpec) {
    // Request immediate research (bypasses queue)
    const requestId = `backend-${Date.now()}`;

    EventBus.emit('research_immediate', {
      topic: `${featureSpec.technology} implementation patterns`,
      context: {
        type: 'best-practices',
        requirements: featureSpec.requirements
      },
      requestedBy: 'backend-agent',
      requestId: requestId
    });

    // Wait for research to complete
    try {
      const result = await EventBus.waitFor('research_complete', 30000);

      if (result.requestId === requestId) {
        this.log(`Research received: ${result.research.confidence} confidence`, 'info');

        // Use research in implementation
        return this.implementWithGuidance(featureSpec, result.research);
      }
    } catch (error) {
      this.log(`Research timeout: ${error.message}`, 'warn');
      // Proceed without research guidance
      return this.implementWithoutGuidance(featureSpec);
    }
  }
}
```

---

## Integration Pattern: UI Triggering Research

### Example: User Requests Research from Frontend

```javascript
// In a React component or API endpoint

async function requestResearch(topic, context) {
  const EventBus = require('../lib/event-bus');

  const requestId = `ui-${Date.now()}`;

  // Listen for completion
  const unsubscribe = EventBus.on('research_complete', (data) => {
    if (data.requestId === requestId) {
      unsubscribe(); // Remove listener
      displayResearchResults(data.research);
    }
  });

  // Trigger research
  EventBus.emit('research_needed', {
    topic: topic,
    context: context,
    requestedBy: 'ui',
    requestId: requestId,
    priority: 'normal'
  });

  // Show user that research is queued
  showNotification(`Research queued: ${topic}`);
}

function displayResearchResults(research) {
  // Display research report to user
  console.log('Research complete:', research);
}
```

---

## Queue Management

### Check Queue Status

```javascript
const EventBus = require('../lib/event-bus');

// Request queue status
EventBus.emit('research_queue_status');

// Listen for response
EventBus.once('research_queue_status_response', (data) => {
  console.log('Queue size:', data.queue_size);
  console.log('Next execution:', data.next_execution);
  console.log('Stats:', data.stats);
});
```

### Force Batch Execution

```javascript
// Force immediate batch execution (useful for testing or high priority)
EventBus.emit('research_execute_batch');
```

---

## Batch Configuration

### Default Settings

```javascript
{
  batchSize: 5,              // Execute when 5 requests queued
  batchInterval: 21600000    // 6 hours in milliseconds
}
```

### Execution Triggers

1. **Batch Size Reached**: Queue reaches 5 research requests
2. **Time Elapsed**: 6 hours since first request in batch
3. **Manual Trigger**: `research_execute_batch` event
4. **Immediate Research**: `research_immediate` event (bypasses queue)

---

## Statistics & Monitoring

### Get Research Agent Statistics

```javascript
const EventBus = require('../lib/event-bus');

// Listen for statistics
EventBus.on('research_queue_status_response', (data) => {
  const stats = data.stats;

  console.log(`Events received: ${stats.events_received}`);
  console.log(`Requests queued: ${stats.requests_queued}`);
  console.log(`Requests processed: ${stats.requests_processed}`);
  console.log(`Cache hits: ${stats.requests_cached}`);
  console.log(`API calls saved: ${stats.api_calls_saved}`);
  console.log(`Batches executed: ${stats.batches_executed}`);
});

// Request status
EventBus.emit('research_queue_status');
```

---

## Smart Caching

### How It Works

1. **Event Received**: `research_needed` event triggered
2. **Cache Check**: Search Knowledge Base for existing research
3. **Cache Hit**: Return cached result immediately via `research_complete` event
4. **Cache Miss**: Add to queue for batch processing

### Benefits

- **Instant Results**: Cached research returned in <10ms
- **Zero API Costs**: No API calls for cached results
- **API Call Reduction**: Typical 30-50% reduction in API calls
- **Knowledge Accumulation**: Knowledge base grows over time

### Cache Statistics

```javascript
const researchAgent = new ResearchAgent();
const stats = researchAgent.getResearchStats();

console.log('Cache hit rate:',
  (stats.requests_cached / (stats.requests_cached + stats.requests_processed) * 100).toFixed(2) + '%'
);
```

---

## Running the Research Agent

### Event-Driven Mode (Default)

```bash
# Start Research Agent in event-driven mode
node agents/research-agent.js event-driven

# Or simply (defaults to event-driven)
node agents/research-agent.js
```

### Legacy Polling Mode

```bash
# For backward compatibility with task-based system
node agents/research-agent.js polling
```

---

## Complete Example: End-to-End Flow

```javascript
const EventBus = require('../lib/event-bus');

// 1. Product Improvement Agent encounters unknown pattern
class ProductImprovementAgent {
  async analyzeCodePattern(code) {
    const pattern = this.detectPattern(code);

    if (this.isUnknownPattern(pattern)) {
      // 2. Trigger research
      EventBus.emit('research_needed', {
        topic: `Best practices for ${pattern}`,
        context: {
          type: 'best-practices',
          codeExample: code
        },
        requestedBy: 'product-improvement-agent',
        requestId: 'pia-001'
      });

      // 3. Continue with other work (non-blocking)
      this.log('Research queued, continuing with other tasks');
    }
  }
}

// 4. Research Agent processes request (when batch triggers)
// - Checks cache (miss)
// - Adds to queue
// - Waits for batch trigger (5 requests or 6 hours)
// - Executes batch
// - Calls Claude API
// - Saves to Knowledge Base
// - Emits 'research_complete'

// 5. Product Improvement Agent receives result
EventBus.on('research_complete', (data) => {
  if (data.requestId === 'pia-001') {
    console.log('Research complete:', data.research.recommendations);
    // Apply recommendations to product improvements
  }
});
```

---

## EventBus API Reference

### Core Methods

#### `EventBus.on(eventName, callback)`
Subscribe to an event.

**Returns:** Unsubscribe function

```javascript
const unsubscribe = EventBus.on('research_complete', (data) => {
  console.log(data);
});

// Later: unsubscribe()
```

#### `EventBus.once(eventName, callback)`
Subscribe to an event (auto-unsubscribe after first call).

```javascript
EventBus.once('research_complete', (data) => {
  console.log('This will only fire once');
});
```

#### `EventBus.emit(eventName, data)`
Emit an event (async).

```javascript
await EventBus.emit('research_needed', {
  topic: 'React hooks best practices',
  requestedBy: 'frontend-agent'
});
```

#### `EventBus.waitFor(eventName, timeout)`
Wait for a specific event (Promise-based).

```javascript
try {
  const result = await EventBus.waitFor('research_complete', 30000);
  console.log(result);
} catch (error) {
  console.log('Timeout waiting for event');
}
```

#### `EventBus.getStats()`
Get EventBus statistics.

```javascript
const stats = EventBus.getStats();
console.log('Total events:', stats.total_events);
console.log('Total listeners:', stats.total_listeners);
```

---

## Best Practices

### 1. Always Include Request ID
```javascript
EventBus.emit('research_needed', {
  topic: 'GraphQL best practices',
  requestId: `agent-${Date.now()}`, // Track this request
  requestedBy: 'backend-agent'
});
```

### 2. Handle Both Cache Hits and Misses
```javascript
EventBus.on('research_complete', (data) => {
  if (data.cached) {
    console.log('Got instant cached result');
  } else {
    console.log('Got fresh research from API');
  }
});
```

### 3. Use Priority Appropriately
```javascript
// Normal priority (queued)
EventBus.emit('research_needed', { topic: 'CSS animations', priority: 'normal' });

// High priority (use research_immediate)
EventBus.emit('research_immediate', { topic: 'Security vulnerability fix' });
```

### 4. Monitor Queue Growth
```javascript
// Periodic queue status checks
setInterval(() => {
  EventBus.emit('research_queue_status');
}, 60000); // Every minute
```

### 5. Clean Up Event Listeners
```javascript
const unsubscribe = EventBus.on('research_complete', handler);

// When done
unsubscribe();
```

---

## Troubleshooting

### Research Not Executing

**Issue**: Queue has items but batch doesn't execute

**Solutions**:
- Check if batch size reached (need 5 requests)
- Check if 6 hours elapsed since first request
- Force execution: `EventBus.emit('research_execute_batch')`
- Verify Research Agent is running

### No Research Complete Event

**Issue**: Triggered research but never received result

**Solutions**:
- Check requestId matches in event listener
- Verify Research Agent is running
- Check for errors in Research Agent logs
- Listen for `research_error` events

### Duplicate Research

**Issue**: Same research executed multiple times

**Solutions**:
- Knowledge Base cache should prevent this
- Verify Knowledge Base is properly initialized
- Check if topics are spelled exactly the same

---

## Performance Metrics

### Expected Performance

| Metric | Target |
|--------|--------|
| Cache hit response time | <10ms |
| Queue add time | <5ms |
| Batch execution time | 30-120s (5 requests) |
| API call reduction | 30-50% |
| Event propagation | <2ms |

### Monitoring

```javascript
// Log all events for debugging
EventBus.on('research_complete', (data) => {
  console.log('[PERF] Research complete:', {
    cached: data.cached,
    topic: data.topic,
    requestId: data.requestId
  });
});

EventBus.on('research_batch_complete', (data) => {
  console.log('[PERF] Batch complete:', {
    batch_size: data.batch_size,
    processed: data.processed
  });
});
```

---

## Migration from Direct API Integration

### Before (Direct Integration)

```javascript
const researchAgent = new ResearchAgent();
const research = await researchAgent.conductResearch(topic, context);
// Blocking call, immediate API usage
```

### After (Event-Driven)

```javascript
const EventBus = require('../lib/event-bus');

EventBus.emit('research_needed', {
  topic,
  context,
  requestedBy: 'my-agent'
});
// Non-blocking, batched, cached
```

---

## Future Enhancements

1. **Priority Queue**: High-priority requests jump the queue
2. **Research Scheduling**: Schedule research for specific times
3. **Distributed EventBus**: Multi-server event propagation
4. **Research Templates**: Pre-defined research types
5. **Webhooks**: External integrations via webhooks
6. **Research History**: Query past research requests
7. **Batch Analytics**: ML-based optimal batch sizing

---

## Support

For issues or questions about Research Agent integration:
- File an issue in the Maestro repository
- Check EventBus logs for debugging
- Monitor Research Agent statistics
- Review agent logs for errors

---

**Last Updated:** 2025-11-05
**Version:** 2.0.0 (Event-Driven Architecture)
**Maintainer:** Maestro Platform Team
