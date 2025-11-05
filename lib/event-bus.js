/**
 * EventBus - Pub/Sub Event System for Maestro Agents
 * Enables event-driven communication between agents without tight coupling
 */

class EventBus {
  constructor() {
    this.events = new Map();
    this.listeners = new Map();
    this.eventHistory = [];
    this.maxHistorySize = 1000;
  }

  /**
   * Subscribe to an event
   * @param {string} eventName - Event name
   * @param {Function} callback - Callback function
   * @returns {Function} Unsubscribe function
   */
  on(eventName, callback) {
    if (!this.listeners.has(eventName)) {
      this.listeners.set(eventName, []);
    }

    const listeners = this.listeners.get(eventName);
    listeners.push(callback);

    // Return unsubscribe function
    return () => {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    };
  }

  /**
   * Subscribe to an event once (auto-unsubscribe after first call)
   * @param {string} eventName - Event name
   * @param {Function} callback - Callback function
   */
  once(eventName, callback) {
    const unsubscribe = this.on(eventName, (...args) => {
      unsubscribe();
      callback(...args);
    });
    return unsubscribe;
  }

  /**
   * Emit an event
   * @param {string} eventName - Event name
   * @param {*} data - Event data
   */
  async emit(eventName, data = {}) {
    const timestamp = new Date().toISOString();

    // Record event in history
    this.recordEvent(eventName, data, timestamp);

    // Get listeners for this event
    const listeners = this.listeners.get(eventName) || [];

    // Call all listeners
    const promises = listeners.map(callback => {
      try {
        return Promise.resolve(callback(data));
      } catch (error) {
        console.error(`[EventBus] Error in listener for ${eventName}:`, error);
        return Promise.resolve();
      }
    });

    await Promise.all(promises);

    console.log(`[EventBus] Event emitted: ${eventName} (${listeners.length} listeners)`);
  }

  /**
   * Emit event synchronously
   * @param {string} eventName - Event name
   * @param {*} data - Event data
   */
  emitSync(eventName, data = {}) {
    const timestamp = new Date().toISOString();

    // Record event in history
    this.recordEvent(eventName, data, timestamp);

    // Get listeners for this event
    const listeners = this.listeners.get(eventName) || [];

    // Call all listeners synchronously
    listeners.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error(`[EventBus] Error in listener for ${eventName}:`, error);
      }
    });

    console.log(`[EventBus] Event emitted (sync): ${eventName} (${listeners.length} listeners)`);
  }

  /**
   * Remove all listeners for an event
   * @param {string} eventName - Event name
   */
  off(eventName) {
    this.listeners.delete(eventName);
  }

  /**
   * Remove all listeners for all events
   */
  clear() {
    this.listeners.clear();
  }

  /**
   * Record event in history
   * @param {string} eventName - Event name
   * @param {*} data - Event data
   * @param {string} timestamp - Timestamp
   */
  recordEvent(eventName, data, timestamp) {
    this.eventHistory.push({
      eventName,
      data,
      timestamp,
    });

    // Trim history if too large
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.shift();
    }
  }

  /**
   * Get event history
   * @param {string} eventName - Optional event name filter
   * @param {number} limit - Maximum number of events to return
   * @returns {Array} Event history
   */
  getHistory(eventName = null, limit = 100) {
    let history = this.eventHistory;

    if (eventName) {
      history = history.filter(event => event.eventName === eventName);
    }

    return history.slice(-limit);
  }

  /**
   * Get statistics about events
   * @returns {Object} Event statistics
   */
  getStats() {
    const stats = {
      total_events: this.eventHistory.length,
      total_listeners: 0,
      events_by_name: {},
      listeners_by_event: {},
    };

    // Count listeners by event
    for (const [eventName, listeners] of this.listeners.entries()) {
      stats.total_listeners += listeners.length;
      stats.listeners_by_event[eventName] = listeners.length;
    }

    // Count events by name
    for (const event of this.eventHistory) {
      stats.events_by_name[event.eventName] =
        (stats.events_by_name[event.eventName] || 0) + 1;
    }

    return stats;
  }

  /**
   * Wait for a specific event to be emitted
   * @param {string} eventName - Event name
   * @param {number} timeout - Timeout in milliseconds
   * @returns {Promise<*>} Event data
   */
  waitFor(eventName, timeout = 30000) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        unsubscribe();
        reject(new Error(`Timeout waiting for event: ${eventName}`));
      }, timeout);

      const unsubscribe = this.once(eventName, (data) => {
        clearTimeout(timer);
        resolve(data);
      });
    });
  }

  /**
   * Check if there are any listeners for an event
   * @param {string} eventName - Event name
   * @returns {boolean} True if there are listeners
   */
  hasListeners(eventName) {
    const listeners = this.listeners.get(eventName);
    return listeners && listeners.length > 0;
  }

  /**
   * Get number of listeners for an event
   * @param {string} eventName - Event name
   * @returns {number} Number of listeners
   */
  listenerCount(eventName) {
    const listeners = this.listeners.get(eventName);
    return listeners ? listeners.length : 0;
  }

  /**
   * Get all event names that have listeners
   * @returns {Array<string>} Event names
   */
  eventNames() {
    return Array.from(this.listeners.keys());
  }
}

// Create singleton instance
const eventBus = new EventBus();

module.exports = eventBus;
module.exports.EventBus = EventBus;
