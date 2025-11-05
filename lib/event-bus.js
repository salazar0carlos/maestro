/**
 * Event Bus System
 * Central event system for triggering testing and other actions
 */

class EventBus {
  constructor() {
    this.listeners = new Map();
    this.eventHistory = [];
    this.maxHistorySize = 100;
  }

  /**
   * Register an event listener
   * @param {string} event - Event name
   * @param {Function} handler - Handler function
   * @returns {Function} Unsubscribe function
   */
  on(event, handler) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }

    this.listeners.get(event).push(handler);

    // Return unsubscribe function
    return () => {
      const handlers = this.listeners.get(event);
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    };
  }

  /**
   * Register a one-time event listener
   * @param {string} event - Event name
   * @param {Function} handler - Handler function
   */
  once(event, handler) {
    const onceHandler = async (...args) => {
      await handler(...args);
      this.off(event, onceHandler);
    };
    this.on(event, onceHandler);
  }

  /**
   * Remove an event listener
   * @param {string} event - Event name
   * @param {Function} handler - Handler function to remove
   */
  off(event, handler) {
    if (!this.listeners.has(event)) {
      return;
    }

    const handlers = this.listeners.get(event);
    const index = handlers.indexOf(handler);
    if (index > -1) {
      handlers.splice(index, 1);
    }
  }

  /**
   * Emit an event
   * @param {string} event - Event name
   * @param {*} data - Event data
   */
  async emit(event, data) {
    // Record event in history
    this.eventHistory.push({
      event,
      data,
      timestamp: new Date().toISOString(),
    });

    // Limit history size
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.shift();
    }

    // Get listeners for this event
    const handlers = this.listeners.get(event) || [];

    // Execute all handlers
    const results = [];
    for (const handler of handlers) {
      try {
        const result = await handler(data);
        results.push({ success: true, result });
      } catch (error) {
        console.error(`Error in event handler for ${event}:`, error);
        results.push({ success: false, error: error.message });
      }
    }

    return results;
  }

  /**
   * Remove all listeners for an event
   * @param {string} event - Event name
   */
  removeAllListeners(event) {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
  }

  /**
   * Get all events being listened to
   * @returns {Array} Array of event names
   */
  getEvents() {
    return Array.from(this.listeners.keys());
  }

  /**
   * Get listener count for an event
   * @param {string} event - Event name
   * @returns {number} Number of listeners
   */
  listenerCount(event) {
    return (this.listeners.get(event) || []).length;
  }

  /**
   * Get event history
   * @param {number} limit - Max number of events to return
   * @returns {Array} Recent events
   */
  getHistory(limit = 10) {
    return this.eventHistory.slice(-limit);
  }

  /**
   * Clear event history
   */
  clearHistory() {
    this.eventHistory = [];
  }
}

// Create singleton instance
const eventBus = new EventBus();

// Event names constants
export const Events = {
  // Task events
  TASK_CREATED: 'task_created',
  TASK_STARTED: 'task_started',
  TASK_COMPLETED: 'task_completed',
  TASK_FAILED: 'task_failed',
  TASK_BLOCKED: 'task_blocked',

  // Agent events
  AGENT_SPAWNED: 'agent_spawned',
  AGENT_IDLE: 'agent_idle',
  AGENT_ERROR: 'agent_error',

  // Testing events
  TEST_RUN_STARTED: 'test_run_started',
  TEST_RUN_COMPLETED: 'test_run_completed',
  TEST_FAILED: 'test_failed',
  BUG_FOUND: 'bug_found',

  // GitHub events
  PR_CREATED: 'pr_created',
  PR_UPDATED: 'pr_updated',
  PR_MERGED: 'pr_merged',
  COMMIT_PUSHED: 'commit_pushed',

  // System events
  BUILD_STARTED: 'build_started',
  BUILD_COMPLETED: 'build_completed',
  BUILD_FAILED: 'build_failed',
  DEPLOYMENT_STARTED: 'deployment_started',
  DEPLOYMENT_COMPLETED: 'deployment_completed',
};

export default eventBus;
