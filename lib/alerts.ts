/**
 * Alert System
 * Generates alerts for critical issues requiring human intervention
 * Manages alert history and rate limiting to prevent spam
 */

import { Alert } from './types';
import { AgentHealthMonitor } from './agent-health';
import { BottleneckDetector } from './bottleneck-detection';
import { getAllAgents } from './agent-registry';
import { getTasks } from './storage-adapter';

const ALERTS_STORAGE_KEY = 'maestro:alerts';
const ALERT_RATE_LIMIT_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Alert System - Main class for alert generation and management
 */
export class AlertSystem {
  /**
   * Generate all alerts based on current system state
   */
  static async generateAlerts(): Promise<Alert[]> {
    const alerts: Alert[] = [];
    const now = new Date().toISOString();

    // Critical: All agents offline
    const allAgents = await getAllAgents();
    const offlineAgents = await AgentHealthMonitor.getOfflineAgents();

    if (allAgents.length > 0 && offlineAgents.length === allAgents.length) {
      const alert: Alert = {
        severity: 'critical',
        type: 'all_agents_offline',
        message: 'All agents are offline. System is not operational.',
        action: 'Restart agent manager or check infrastructure',
        timestamp: now,
      };

      if (this.shouldSendAlert(alert)) {
        alerts.push(alert);
        this.saveAlert(alert);
      }
    }

    // High: Critical tasks blocked >24h
    const blockedTasks = (await getTasks()).filter(t => t.status === 'blocked');
    const criticalBlockedTasks = blockedTasks.filter(task => {
      const dayAgo = Date.now() - 24 * 60 * 60 * 1000;

      // Check if high priority (1 or 2)
      if (task.priority > 2) return false;

      // Check if blocked for >24h
      if (task.started_date) {
        const startedAt = new Date(task.started_date).getTime();
        return startedAt < dayAgo;
      }

      return false;
    });

    if (criticalBlockedTasks.length > 0) {
      const alert: Alert = {
        severity: 'high',
        type: 'critical_task_blocked',
        message: `${criticalBlockedTasks.length} critical task${
          criticalBlockedTasks.length > 1 ? 's' : ''
        } blocked >24h`,
        tasks: criticalBlockedTasks.map(t => t.task_id),
        action: 'Review blocked tasks and provide guidance',
        timestamp: now,
      };

      if (this.shouldSendAlert(alert)) {
        alerts.push(alert);
        this.saveAlert(alert);
      }
    }

    // Medium: Error rate >50%
    const recentTasks = await this.getRecentTasks(24); // last 24h
    if (recentTasks.length > 10) {
      const failed = recentTasks.filter(t => t.status === 'blocked').length;
      const errorRate = failed / recentTasks.length;

      if (errorRate > 0.5) {
        const alert: Alert = {
          severity: 'medium',
          type: 'high_error_rate',
          message: `Error rate at ${Math.round(errorRate * 100)}%`,
          failed_count: failed,
          total_count: recentTasks.length,
          action: 'Review error logs and fix common issues',
          timestamp: now,
        };

        if (this.shouldSendAlert(alert)) {
          alerts.push(alert);
          this.saveAlert(alert);
        }
      }
    }

    // Low: Bottleneck detected
    const bottlenecks = await BottleneckDetector.detectBottlenecks();
    if (bottlenecks.length > 0) {
      const alert: Alert = {
        severity: 'low',
        type: 'bottleneck',
        message: `${bottlenecks.length} agent type${
          bottlenecks.length > 1 ? 's' : ''
        } overloaded`,
        bottlenecks: bottlenecks,
        action: 'Consider spawning additional agents',
        timestamp: now,
      };

      if (this.shouldSendAlert(alert)) {
        alerts.push(alert);
        this.saveAlert(alert);
      }
    }

    // High: Multiple stuck agents
    const stuckAgents = await AgentHealthMonitor.getStuckAgents();
    if (stuckAgents.length >= 3) {
      const alert: Alert = {
        severity: 'high',
        type: 'multiple_stuck_agents',
        message: `${stuckAgents.length} agents stuck on tasks`,
        action: 'Review stuck tasks and consider reassigning',
        timestamp: now,
      };

      if (this.shouldSendAlert(alert)) {
        alerts.push(alert);
        this.saveAlert(alert);
      }
    }

    // Critical: System health critical
    const systemHealth = await AgentHealthMonitor.getSystemHealth();
    if (systemHealth.status === 'critical') {
      const alert: Alert = {
        severity: 'critical',
        type: 'system_health_critical',
        message: `System health critical: ${systemHealth.health_percentage}%`,
        action: 'Investigate agent failures and restore system health',
        timestamp: now,
      };

      if (this.shouldSendAlert(alert)) {
        alerts.push(alert);
        this.saveAlert(alert);
      }
    }

    return alerts;
  }

  /**
   * Get recent tasks (within last N hours)
   */
  static async getRecentTasks(hours: number) {
    const cutoff = Date.now() - hours * 60 * 60 * 1000;
    const tasks = await getTasks();

    return tasks.filter(task => {
      const taskDate = new Date(task.created_date).getTime();
      return taskDate > cutoff;
    });
  }

  /**
   * Check if alert should be sent (rate limiting)
   */
  static shouldSendAlert(alert: Alert): boolean {
    const recentAlerts = this.getRecentAlerts();

    // Check if same alert type was sent recently
    const similarAlert = recentAlerts.find(a => {
      if (a.type !== alert.type) return false;

      const alertTime = new Date(a.timestamp).getTime();
      const now = Date.now();

      return now - alertTime < ALERT_RATE_LIMIT_MS;
    });

    return !similarAlert;
  }

  /**
   * Save alert to history
   */
  static saveAlert(alert: Alert): void {
    if (typeof window === 'undefined') return;

    try {
      const alerts = this.getAlerts();
      alerts.unshift(alert);

      // Keep last 100 alerts
      const trimmed = alerts.slice(0, 100);

      localStorage.setItem(ALERTS_STORAGE_KEY, JSON.stringify(trimmed));
    } catch (error) {
      console.error('Failed to save alert:', error);
    }
  }

  /**
   * Get all alerts from history
   */
  static getAlerts(): Alert[] {
    if (typeof window === 'undefined') return [];

    try {
      const data = localStorage.getItem(ALERTS_STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  /**
   * Get recent alerts (within last N hours)
   */
  static getRecentAlerts(hours: number = 24): Alert[] {
    const cutoff = Date.now() - hours * 60 * 60 * 1000;
    const alerts = this.getAlerts();

    return alerts.filter(alert => {
      const alertTime = new Date(alert.timestamp).getTime();
      return alertTime > cutoff;
    });
  }

  /**
   * Get alerts by severity
   */
  static getAlertsBySeverity(severity: 'critical' | 'high' | 'medium' | 'low'): Alert[] {
    return this.getAlerts().filter(a => a.severity === severity);
  }

  /**
   * Get alerts by type
   */
  static getAlertsByType(type: string): Alert[] {
    return this.getAlerts().filter(a => a.type === type);
  }

  /**
   * Clear old alerts (older than N days)
   */
  static clearOldAlerts(days: number = 7): void {
    if (typeof window === 'undefined') return;

    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    const alerts = this.getAlerts();

    const filtered = alerts.filter(alert => {
      const alertTime = new Date(alert.timestamp).getTime();
      return alertTime > cutoff;
    });

    try {
      localStorage.setItem(ALERTS_STORAGE_KEY, JSON.stringify(filtered));
    } catch (error) {
      console.error('Failed to clear old alerts:', error);
    }
  }

  /**
   * Get alert summary
   */
  static getAlertSummary(): {
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    last24h: number;
  } {
    const allAlerts = this.getAlerts();
    const recentAlerts = this.getRecentAlerts(24);

    return {
      total: allAlerts.length,
      critical: allAlerts.filter(a => a.severity === 'critical').length,
      high: allAlerts.filter(a => a.severity === 'high').length,
      medium: allAlerts.filter(a => a.severity === 'medium').length,
      low: allAlerts.filter(a => a.severity === 'low').length,
      last24h: recentAlerts.length,
    };
  }

  /**
   * Check if there are any active critical alerts
   */
  static hasCriticalAlerts(): boolean {
    const recentAlerts = this.getRecentAlerts(1); // Last hour
    return recentAlerts.some(a => a.severity === 'critical');
  }

  /**
   * Dismiss/acknowledge an alert
   */
  static dismissAlert(timestamp: string): void {
    if (typeof window === 'undefined') return;

    try {
      const alerts = this.getAlerts();
      const filtered = alerts.filter(a => a.timestamp !== timestamp);

      localStorage.setItem(ALERTS_STORAGE_KEY, JSON.stringify(filtered));
    } catch (error) {
      console.error('Failed to dismiss alert:', error);
    }
  }

  /**
   * Clear all alerts
   */
  static clearAllAlerts(): void {
    if (typeof window === 'undefined') return;

    try {
      localStorage.removeItem(ALERTS_STORAGE_KEY);
    } catch (error) {
      console.error('Failed to clear alerts:', error);
    }
  }
}

/**
 * Quick helper to generate alerts
 */
export async function generateAlerts(): Promise<Alert[]> {
  return await AlertSystem.generateAlerts();
}

/**
 * Quick helper to get alerts
 */
export function getAlerts(): Alert[] {
  return AlertSystem.getAlerts();
}

/**
 * Quick helper to get alert summary
 */
export function getAlertSummary() {
  return AlertSystem.getAlertSummary();
}

/**
 * Quick helper to check for critical alerts
 */
export function hasCriticalAlerts(): boolean {
  return AlertSystem.hasCriticalAlerts();
}
