/**
 * Event-driven architecture system for Maestro
 * Enables agents to communicate via events and webhooks
 */

/**
 * Event handler function signature
 */
export type EventHandler<T = any> = (data: T) => void | Promise<void>;

/**
 * Event metadata for logging and debugging
 */
export interface EventMetadata {
  timestamp: string;
  source: string;
  eventId: string;
}

/**
 * Event payload with metadata
 */
export interface EventPayload<T = any> {
  event: string;
  data: T;
  metadata: EventMetadata;
}

/**
 * Event history record
 */
export interface EventRecord extends EventPayload {
  handlers_executed: number;
  errors: string[];
  duration_ms: number;
}

/**
 * Event Bus - Central event management system
 * Singleton pattern for coordinating events across the application
 */
class EventBusClass {
  private listeners: Map<string, EventHandler[]>;
  private history: EventRecord[];
  private maxHistorySize: number;

  constructor(maxHistorySize: number = 500) {
    this.listeners = new Map();
    this.history = [];
    this.maxHistorySize = maxHistorySize;
  }

  /**
   * Register an event handler
   */
  on<T = any>(event: string, handler: EventHandler<T>): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(handler as EventHandler);
  }

  /**
   * Remove an event handler
   */
  off(event: string, handler: EventHandler): void {
    const handlers = this.listeners.get(event);
    if (!handlers) return;

    const index = handlers.indexOf(handler);
    if (index > -1) {
      handlers.splice(index, 1);
    }

    // Clean up empty listener arrays
    if (handlers.length === 0) {
      this.listeners.delete(event);
    }
  }

  /**
   * Register a one-time event handler
   */
  once<T = any>(event: string, handler: EventHandler<T>): void {
    const wrappedHandler: EventHandler<T> = async (data: T) => {
      await handler(data);
      this.off(event, wrappedHandler as EventHandler);
    };
    this.on(event, wrappedHandler);
  }

  /**
   * Emit an event to all registered handlers
   */
  async emit<T = any>(
    event: string,
    data: T,
    source: string = 'system'
  ): Promise<void> {
    const startTime = Date.now();
    const handlers = this.listeners.get(event) || [];
    const errors: string[] = [];

    // Generate event metadata
    const metadata: EventMetadata = {
      timestamp: new Date().toISOString(),
      source,
      eventId: this.generateEventId(),
    };

    const payload: EventPayload<T> = {
      event,
      data,
      metadata,
    };

    // Execute all handlers
    await Promise.allSettled(
      handlers.map(async (handler) => {
        try {
          await handler(data);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          errors.push(errorMessage);
          console.error(`Event handler error for "${event}":`, error);
        }
      })
    );

    const duration = Date.now() - startTime;

    // Record event in history
    this.addToHistory({
      ...payload,
      handlers_executed: handlers.length,
      errors,
      duration_ms: duration,
    });

    // Log if event took too long
    if (duration > 1000) {
      console.warn(
        `⚠️ Event "${event}" took ${duration}ms to process (${handlers.length} handlers)`
      );
    }
  }

  /**
   * Generate unique event ID
   */
  private generateEventId(): string {
    return `evt-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }

  /**
   * Add event to history
   */
  private addToHistory(record: EventRecord): void {
    this.history.push(record);

    // Keep history size under control
    if (this.history.length > this.maxHistorySize) {
      this.history.shift();
    }
  }

  /**
   * Get event history
   */
  getHistory(filter?: {
    event?: string;
    source?: string;
    limit?: number;
  }): EventRecord[] {
    let filtered = [...this.history];

    if (filter?.event) {
      filtered = filtered.filter((r) => r.event === filter.event);
    }

    if (filter?.source) {
      filtered = filtered.filter((r) => r.metadata.source === filter.source);
    }

    if (filter?.limit) {
      filtered = filtered.slice(-filter.limit);
    }

    return filtered.reverse();
  }

  /**
   * Get events with errors
   */
  getFailedEvents(limit: number = 20): EventRecord[] {
    return this.history
      .filter((r) => r.errors.length > 0)
      .slice(-limit)
      .reverse();
  }

  /**
   * Get event statistics
   */
  getStats(): {
    total_events: number;
    total_listeners: number;
    events_by_type: Record<string, number>;
    avg_handlers_per_event: number;
    failed_events: number;
  } {
    const eventCounts: Record<string, number> = {};

    this.history.forEach((record) => {
      eventCounts[record.event] = (eventCounts[record.event] || 0) + 1;
    });

    const totalHandlers = this.history.reduce(
      (sum, r) => sum + r.handlers_executed,
      0
    );

    const failedEvents = this.history.filter((r) => r.errors.length > 0).length;

    return {
      total_events: this.history.length,
      total_listeners: Array.from(this.listeners.values()).reduce(
        (sum, handlers) => sum + handlers.length,
        0
      ),
      events_by_type: eventCounts,
      avg_handlers_per_event:
        this.history.length > 0 ? totalHandlers / this.history.length : 0,
      failed_events: failedEvents,
    };
  }

  /**
   * Clear all event listeners
   */
  clearListeners(): void {
    this.listeners.clear();
  }

  /**
   * Clear event history
   */
  clearHistory(): void {
    this.history = [];
  }

  /**
   * Get all registered event types
   */
  getEventTypes(): string[] {
    return Array.from(this.listeners.keys());
  }

  /**
   * Get number of listeners for an event
   */
  getListenerCount(event: string): number {
    return this.listeners.get(event)?.length || 0;
  }
}

/**
 * Singleton instance
 */
export const EventBus = new EventBusClass();

/**
 * Common event types for Maestro
 */
export const EventTypes = {
  // Task events
  TASK_CREATED: 'task.created',
  TASK_UPDATED: 'task.updated',
  TASK_COMPLETED: 'task.completed',
  TASK_FAILED: 'task.failed',
  TASK_ASSIGNED: 'task.assigned',

  // Agent events
  AGENT_REGISTERED: 'agent.registered',
  AGENT_STATUS_CHANGED: 'agent.status_changed',
  AGENT_TASK_STARTED: 'agent.task_started',
  AGENT_TASK_COMPLETED: 'agent.task_completed',
  AGENT_ERROR: 'agent.error',
  AGENT_HEALTH_WARNING: 'agent.health_warning',

  // Improvement events
  IMPROVEMENT_SUGGESTED: 'improvement.suggested',
  IMPROVEMENT_APPROVED: 'improvement.approved',
  IMPROVEMENT_REJECTED: 'improvement.rejected',
  IMPROVEMENT_IMPLEMENTED: 'improvement.implemented',

  // Project events
  PROJECT_CREATED: 'project.created',
  PROJECT_STATUS_CHANGED: 'project.status_changed',

  // System events
  SYSTEM_ERROR: 'system.error',
  SYSTEM_WARNING: 'system.warning',
  PERFORMANCE_ALERT: 'performance.alert',
} as const;

/**
 * Type-safe event data interfaces
 */
export interface TaskEventData {
  task_id: string;
  project_id: string;
  agent_id?: string;
  status?: string;
  title?: string;
}

export interface AgentEventData {
  agent_id: string;
  project_id: string;
  status?: string;
  health_score?: number;
  error?: string;
}

export interface ImprovementEventData {
  improvement_id: string;
  project_id: string;
  suggested_by: string;
  status?: string;
  converted_to_task_id?: string;
}

export interface ProjectEventData {
  project_id: string;
  status?: string;
  name?: string;
}

/**
 * Helper function to emit typed events
 */
export function emitEvent<T = any>(
  event: string,
  data: T,
  source: string = 'system'
): Promise<void> {
  return EventBus.emit(event, data, source);
}
