/**
 * Webhook Delivery System
 * Handles sending webhooks to agents with retry logic and tracking
 */

import crypto from 'crypto';
import {
  WebhookPayload,
  WebhookDelivery,
  AgentWebhookConfig,
  WebhookStatus,
  TaskExecutionResponse,
} from './webhook-types';

const STORAGE_KEY = 'maestro:webhook-deliveries';
const CONFIG_KEY = 'maestro:webhook-configs';

/**
 * Check if we're in browser environment
 */
function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
}

/**
 * Generate unique ID
 */
function generateId(): string {
  return `whd-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Get webhook deliveries from storage
 */
function getDeliveries(): WebhookDelivery[] {
  if (!isBrowser()) return [];
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

/**
 * Save webhook deliveries to storage
 */
function saveDeliveries(deliveries: WebhookDelivery[]): void {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(deliveries));
  } catch (error) {
    console.error('Failed to save webhook deliveries:', error);
  }
}

/**
 * Get webhook configurations
 */
function getConfigs(): AgentWebhookConfig[] {
  if (!isBrowser()) return [];
  try {
    const data = localStorage.getItem(CONFIG_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

/**
 * Save webhook configurations
 */
function saveConfigs(configs: AgentWebhookConfig[]): void {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(configs));
  } catch (error) {
    console.error('Failed to save webhook configs:', error);
  }
}

/**
 * Generate HMAC signature for webhook
 */
function generateSignature(payload: string, secret: string): string {
  return crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
}

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export class WebhookDeliveryService {
  /**
   * Register agent webhook configuration
   */
  static registerAgent(config: AgentWebhookConfig): void {
    const configs = getConfigs();
    const existing = configs.findIndex(c => c.agent_id === config.agent_id);

    if (existing >= 0) {
      configs[existing] = config;
    } else {
      configs.push(config);
    }

    saveConfigs(configs);
    console.log(`[Webhook] Registered agent: ${config.agent_name} -> ${config.webhook_url}`);
  }

  /**
   * Update agent webhook configuration
   */
  static updateAgentConfig(
    agentId: string,
    updates: Partial<AgentWebhookConfig>
  ): AgentWebhookConfig | null {
    const configs = getConfigs();
    const index = configs.findIndex(c => c.agent_id === agentId);

    if (index === -1) return null;

    configs[index] = { ...configs[index], ...updates };
    saveConfigs(configs);

    return configs[index];
  }

  /**
   * Get agent webhook configuration
   */
  static getAgentConfig(agentId: string): AgentWebhookConfig | null {
    const configs = getConfigs();
    return configs.find(c => c.agent_id === agentId) || null;
  }

  /**
   * Get all agent configurations
   */
  static getAllConfigs(): AgentWebhookConfig[] {
    return getConfigs();
  }

  /**
   * Delete agent webhook configuration
   */
  static deleteAgentConfig(agentId: string): boolean {
    const configs = getConfigs();
    const filtered = configs.filter(c => c.agent_id !== agentId);

    if (filtered.length === configs.length) return false;

    saveConfigs(filtered);
    return true;
  }

  /**
   * Send webhook to agent
   */
  static async sendWebhook(
    config: AgentWebhookConfig,
    payload: WebhookPayload,
    webhookId?: string
  ): Promise<WebhookDelivery> {
    const id = webhookId || generateId();
    const payloadString = JSON.stringify(payload);
    const signature = generateSignature(payloadString, config.secret);

    const delivery: WebhookDelivery = {
      id,
      webhook_id: config.agent_id,
      event: payload.event,
      payload,
      target_url: config.webhook_url,
      status: 'pending',
      attempts: 0,
      max_attempts: config.retry_config?.max_attempts || 3,
      created_at: new Date().toISOString(),
    };

    // Save initial delivery record
    const deliveries = getDeliveries();
    deliveries.push(delivery);
    saveDeliveries(deliveries);

    // Attempt delivery
    await this.attemptDelivery(delivery, config, signature);

    return delivery;
  }

  /**
   * Attempt webhook delivery with retry logic
   */
  private static async attemptDelivery(
    delivery: WebhookDelivery,
    config: AgentWebhookConfig,
    signature: string
  ): Promise<void> {
    const retryConfig = config.retry_config || {
      max_attempts: 3,
      backoff_multiplier: 2,
      initial_delay: 1000,
    };

    for (let attempt = 1; attempt <= delivery.max_attempts; attempt++) {
      delivery.attempts = attempt;
      delivery.last_attempt = new Date().toISOString();
      delivery.status = 'pending';

      this.updateDelivery(delivery);

      try {
        const response = await fetch(config.webhook_url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Maestro-Signature': `sha256=${signature}`,
            'X-Maestro-Event': delivery.event,
            'X-Maestro-Delivery-ID': delivery.id,
            'User-Agent': 'Maestro-Webhook/1.0',
            ...config.headers,
          },
          body: JSON.stringify(delivery.payload),
          signal: AbortSignal.timeout(config.timeout || 30000),
        });

        const responseBody = await response.json().catch(() => null);

        delivery.response = {
          status: response.status,
          body: responseBody,
        };

        if (response.ok) {
          delivery.status = 'delivered';
          delivery.delivered_at = new Date().toISOString();
          this.updateDelivery(delivery);

          console.log(`[Webhook] ✓ Delivered to ${config.agent_name}: ${delivery.event}`);
          return;
        } else {
          delivery.response.error = `HTTP ${response.status}`;
        }
      } catch (error) {
        delivery.response = {
          status: 0,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }

      // If not last attempt, schedule retry
      if (attempt < delivery.max_attempts) {
        const delay = retryConfig.initial_delay * Math.pow(retryConfig.backoff_multiplier, attempt - 1);
        delivery.status = 'retrying';
        delivery.next_retry = new Date(Date.now() + delay).toISOString();
        this.updateDelivery(delivery);

        console.log(
          `[Webhook] ✗ Failed (attempt ${attempt}/${delivery.max_attempts}), retrying in ${delay}ms...`
        );
        await sleep(delay);
      }
    }

    // All attempts failed
    delivery.status = 'failed';
    this.updateDelivery(delivery);

    console.error(
      `[Webhook] ✗ Failed to deliver to ${config.agent_name} after ${delivery.max_attempts} attempts`
    );
  }

  /**
   * Update delivery record
   */
  private static updateDelivery(delivery: WebhookDelivery): void {
    const deliveries = getDeliveries();
    const index = deliveries.findIndex(d => d.id === delivery.id);

    if (index >= 0) {
      deliveries[index] = delivery;
      saveDeliveries(deliveries);
    }
  }

  /**
   * Get delivery by ID
   */
  static getDelivery(deliveryId: string): WebhookDelivery | null {
    const deliveries = getDeliveries();
    return deliveries.find(d => d.id === deliveryId) || null;
  }

  /**
   * Get deliveries for agent
   */
  static getAgentDeliveries(
    agentId: string,
    limit?: number
  ): WebhookDelivery[] {
    const deliveries = getDeliveries();
    const filtered = deliveries.filter(d => d.webhook_id === agentId);

    const sorted = filtered.sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    return limit ? sorted.slice(0, limit) : sorted;
  }

  /**
   * Get recent deliveries
   */
  static getRecentDeliveries(limit: number = 50): WebhookDelivery[] {
    const deliveries = getDeliveries();
    return deliveries
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
      .slice(0, limit);
  }

  /**
   * Get delivery statistics
   */
  static getStats(): {
    total: number;
    delivered: number;
    failed: number;
    pending: number;
    success_rate: number;
    by_event: Record<string, number>;
    by_agent: Record<string, { delivered: number; failed: number }>;
  } {
    const deliveries = getDeliveries();

    const stats = {
      total: deliveries.length,
      delivered: deliveries.filter(d => d.status === 'delivered').length,
      failed: deliveries.filter(d => d.status === 'failed').length,
      pending: deliveries.filter(d => d.status === 'pending' || d.status === 'retrying').length,
      success_rate: 0,
      by_event: {} as Record<string, number>,
      by_agent: {} as Record<string, { delivered: number; failed: number }>,
    };

    stats.success_rate = stats.total > 0 ? (stats.delivered / stats.total) * 100 : 0;

    deliveries.forEach(d => {
      // Count by event
      stats.by_event[d.event] = (stats.by_event[d.event] || 0) + 1;

      // Count by agent
      if (!stats.by_agent[d.webhook_id]) {
        stats.by_agent[d.webhook_id] = { delivered: 0, failed: 0 };
      }
      if (d.status === 'delivered') {
        stats.by_agent[d.webhook_id].delivered++;
      } else if (d.status === 'failed') {
        stats.by_agent[d.webhook_id].failed++;
      }
    });

    return stats;
  }

  /**
   * Retry failed delivery
   */
  static async retryDelivery(deliveryId: string): Promise<WebhookDelivery | null> {
    const delivery = this.getDelivery(deliveryId);
    if (!delivery) return null;

    const config = this.getAgentConfig(delivery.webhook_id);
    if (!config) return null;

    const signature = generateSignature(
      JSON.stringify(delivery.payload),
      config.secret
    );

    // Reset delivery for retry
    delivery.attempts = 0;
    delivery.status = 'pending';
    delivery.response = undefined;

    await this.attemptDelivery(delivery, config, signature);

    return delivery;
  }

  /**
   * Clear old deliveries
   */
  static clearOldDeliveries(daysOld: number): number {
    const deliveries = getDeliveries();
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - daysOld);

    const filtered = deliveries.filter(
      d => new Date(d.created_at) > cutoff
    );

    const deletedCount = deliveries.length - filtered.length;

    if (deletedCount > 0) {
      saveDeliveries(filtered);
      console.log(`[Webhook] Cleared ${deletedCount} old deliveries`);
    }

    return deletedCount;
  }

  /**
   * Broadcast event to all agents that subscribe to it
   */
  static async broadcast(payload: WebhookPayload): Promise<WebhookDelivery[]> {
    const configs = getConfigs();
    const subscribedAgents = configs.filter(
      c => c.enabled && c.events.includes(payload.event)
    );

    console.log(
      `[Webhook] Broadcasting ${payload.event} to ${subscribedAgents.length} agents`
    );

    const deliveries = await Promise.all(
      subscribedAgents.map(config => this.sendWebhook(config, payload))
    );

    return deliveries;
  }
}
