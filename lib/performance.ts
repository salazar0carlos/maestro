/**
 * Performance monitoring for API operations
 * Tracks operation timing and identifies slow queries/operations
 */

/**
 * Performance measurement record
 */
interface PerformanceMeasurement {
  operation: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  metadata?: Record<string, any>;
}

/**
 * Performance threshold configuration
 */
const THRESHOLDS = {
  FAST: 50, // < 50ms is fast
  ACCEPTABLE: 200, // < 200ms is acceptable
  SLOW: 1000, // < 1000ms is slow
  CRITICAL: 3000, // > 3000ms is critical
};

/**
 * Performance monitor class
 * Singleton pattern for tracking performance across the application
 */
class PerformanceMonitorClass {
  private measurements: Map<string, PerformanceMeasurement>;
  private history: PerformanceMeasurement[];
  private maxHistorySize: number;

  constructor(maxHistorySize: number = 1000) {
    this.measurements = new Map();
    this.history = [];
    this.maxHistorySize = maxHistorySize;
  }

  /**
   * Start measuring an operation
   */
  start(operation: string, metadata?: Record<string, any>): void {
    const measurement: PerformanceMeasurement = {
      operation,
      startTime: Date.now(),
      metadata,
    };

    this.measurements.set(operation, measurement);
  }

  /**
   * End measuring an operation and return duration
   */
  end(operation: string): number | null {
    const measurement = this.measurements.get(operation);
    if (!measurement) {
      console.warn(`Performance: No measurement found for operation: ${operation}`);
      return null;
    }

    const endTime = Date.now();
    const duration = endTime - measurement.startTime;

    measurement.endTime = endTime;
    measurement.duration = duration;

    // Log if slow
    this.logIfSlow(operation, duration);

    // Add to history
    this.addToHistory(measurement);

    // Remove from active measurements
    this.measurements.delete(operation);

    return duration;
  }

  /**
   * Log operation if it's slow
   */
  private logIfSlow(operation: string, duration: number): void {
    if (duration >= THRESHOLDS.CRITICAL) {
      console.error(
        `⚠️ CRITICAL: Operation "${operation}" took ${duration}ms (threshold: ${THRESHOLDS.CRITICAL}ms)`
      );
    } else if (duration >= THRESHOLDS.SLOW) {
      console.warn(
        `⚠️ SLOW: Operation "${operation}" took ${duration}ms (threshold: ${THRESHOLDS.SLOW}ms)`
      );
    } else if (duration >= THRESHOLDS.ACCEPTABLE) {
      if (process.env.NODE_ENV === 'development') {
        console.info(
          `ℹ️ Operation "${operation}" took ${duration}ms (acceptable but not fast)`
        );
      }
    }
  }

  /**
   * Add measurement to history
   */
  private addToHistory(measurement: PerformanceMeasurement): void {
    this.history.push(measurement);

    // Keep history size under control
    if (this.history.length > this.maxHistorySize) {
      this.history.shift();
    }
  }

  /**
   * Get statistics for a specific operation
   */
  getStats(operation: string): {
    count: number;
    average: number;
    min: number;
    max: number;
    p50: number;
    p95: number;
    p99: number;
  } | null {
    const measurements = this.history.filter(m => m.operation === operation);

    if (measurements.length === 0) {
      return null;
    }

    const durations = measurements
      .map(m => m.duration!)
      .filter(d => d !== undefined)
      .sort((a, b) => a - b);

    const sum = durations.reduce((a, b) => a + b, 0);
    const average = sum / durations.length;

    const getPercentile = (p: number) => {
      const index = Math.ceil((p / 100) * durations.length) - 1;
      return durations[index];
    };

    return {
      count: durations.length,
      average: Math.round(average),
      min: durations[0],
      max: durations[durations.length - 1],
      p50: getPercentile(50),
      p95: getPercentile(95),
      p99: getPercentile(99),
    };
  }

  /**
   * Get all operation statistics
   */
  getAllStats(): Record<string, any> {
    const operations = new Set(this.history.map(m => m.operation));
    const stats: Record<string, any> = {};

    operations.forEach(operation => {
      stats[operation] = this.getStats(operation);
    });

    return stats;
  }

  /**
   * Get recent slow operations
   */
  getRecentSlowOperations(limit: number = 10): PerformanceMeasurement[] {
    return this.history
      .filter(m => m.duration && m.duration >= THRESHOLDS.SLOW)
      .slice(-limit)
      .reverse();
  }

  /**
   * Clear history
   */
  clearHistory(): void {
    this.history = [];
  }

  /**
   * Get current active measurements (not yet ended)
   */
  getActiveMeasurements(): string[] {
    return Array.from(this.measurements.keys());
  }
}

/**
 * Singleton instance
 */
export const PerformanceMonitor = new PerformanceMonitorClass();

/**
 * Decorator/wrapper function for measuring async operations
 */
export async function measureAsync<T>(
  operation: string,
  fn: () => Promise<T>,
  metadata?: Record<string, any>
): Promise<T> {
  PerformanceMonitor.start(operation, metadata);
  try {
    const result = await fn();
    return result;
  } finally {
    PerformanceMonitor.end(operation);
  }
}

/**
 * Decorator/wrapper function for measuring sync operations
 */
export function measureSync<T>(
  operation: string,
  fn: () => T,
  metadata?: Record<string, any>
): T {
  PerformanceMonitor.start(operation, metadata);
  try {
    const result = fn();
    return result;
  } finally {
    PerformanceMonitor.end(operation);
  }
}

/**
 * Express-style middleware for API route performance tracking
 */
export function withPerformanceTracking(
  operation: string,
  handler: (...args: any[]) => Promise<any>
) {
  return async (...args: any[]) => {
    return await measureAsync(operation, () => handler(...args));
  };
}

/**
 * Get performance report
 */
export function getPerformanceReport(): {
  stats: Record<string, any>;
  recentSlowOps: PerformanceMeasurement[];
  summary: {
    totalOperations: number;
    slowOperations: number;
    criticalOperations: number;
  };
} {
  const stats = PerformanceMonitor.getAllStats();
  const recentSlowOps = PerformanceMonitor.getRecentSlowOperations(20);

  const totalOperations = Object.values(stats).reduce(
    (sum: number, stat: any) => sum + (stat?.count || 0),
    0
  );

  const slowOperations = recentSlowOps.filter(
    m => m.duration && m.duration >= THRESHOLDS.SLOW && m.duration < THRESHOLDS.CRITICAL
  ).length;

  const criticalOperations = recentSlowOps.filter(
    m => m.duration && m.duration >= THRESHOLDS.CRITICAL
  ).length;

  return {
    stats,
    recentSlowOps,
    summary: {
      totalOperations,
      slowOperations,
      criticalOperations,
    },
  };
}

/**
 * Example usage in API routes:
 *
 * import { PerformanceMonitor } from '@/lib/performance';
 *
 * export async function GET(request: NextRequest) {
 *   PerformanceMonitor.start('fetch_tasks');
 *   const tasks = getTasks();
 *   PerformanceMonitor.end('fetch_tasks');
 *
 *   return NextResponse.json(tasks);
 * }
 *
 * // Or use the wrapper:
 * import { measureAsync } from '@/lib/performance';
 *
 * export async function GET(request: NextRequest) {
 *   const tasks = await measureAsync('fetch_tasks', async () => {
 *     return getTasks();
 *   });
 *
 *   return NextResponse.json(tasks);
 * }
 */
