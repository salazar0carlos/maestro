'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Modal } from '@/components/Modal';
import { WebhookDeliveryService } from '@/lib/webhook-delivery';
import { CostTracker } from '@/lib/cost-tracker';
import { AgentWebhookConfig, WebhookDelivery } from '@/lib/webhook-types';

export default function WebhooksPage() {
  const [configs, setConfigs] = useState<AgentWebhookConfig[]>([]);
  const [deliveries, setDeliveries] = useState<WebhookDelivery[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [costSummary, setCostSummary] = useState<any>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<AgentWebhookConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Form state
  const [formData, setFormData] = useState({
    agent_id: '',
    agent_name: '',
    webhook_url: '',
    events: ['task.assigned'],
    enabled: true,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    try {
      const allConfigs = WebhookDeliveryService.getAllConfigs();
      const recentDeliveries = WebhookDeliveryService.getRecentDeliveries(20);
      const deliveryStats = WebhookDeliveryService.getStats();
      const costs = CostTracker.getCurrentMonthSummary();

      setConfigs(allConfigs);
      setDeliveries(recentDeliveries);
      setStats(deliveryStats);
      setCostSummary(costs);
      setIsLoading(false);
    } catch (error) {
      console.error('Failed to load webhook data:', error);
      setIsLoading(false);
    }
  };

  const handleAddConfig = () => {
    if (!formData.agent_id || !formData.agent_name || !formData.webhook_url) {
      alert('Please fill in all required fields');
      return;
    }

    const secret = crypto.randomUUID(); // Generate secret

    const config: AgentWebhookConfig = {
      agent_id: formData.agent_id,
      agent_name: formData.agent_name,
      webhook_url: formData.webhook_url,
      secret,
      enabled: formData.enabled,
      events: formData.events as any[],
      retry_config: {
        max_attempts: 3,
        backoff_multiplier: 2,
        initial_delay: 1000,
      },
      timeout: 30000,
    };

    WebhookDeliveryService.registerAgent(config);
    loadData();
    setIsAddModalOpen(false);

    // Reset form
    setFormData({
      agent_id: '',
      agent_name: '',
      webhook_url: '',
      events: ['task.assigned'],
      enabled: true,
    });

    // Show secret to user
    alert(`Agent registered!\n\nAgent ID: ${config.agent_id}\nSecret: ${secret}\n\nSave this secret - you won't see it again!`);
  };

  const handleToggleAgent = (agentId: string, enabled: boolean) => {
    WebhookDeliveryService.updateAgentConfig(agentId, { enabled });
    loadData();
  };

  const handleRetryDelivery = async (deliveryId: string) => {
    await WebhookDeliveryService.retryDelivery(deliveryId);
    loadData();
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'delivered':
        return 'bg-green-900 text-green-200';
      case 'failed':
        return 'bg-red-900 text-red-200';
      case 'pending':
        return 'bg-blue-900 text-blue-200';
      case 'retrying':
        return 'bg-yellow-900 text-yellow-200';
      default:
        return 'bg-slate-700 text-slate-300';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="text-3xl mb-4">⏳</div>
          <p className="text-slate-400">Loading webhook configurations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-50 mb-2">Webhook Management</h1>
          <p className="text-slate-400">
            Configure agent webhooks and monitor deliveries
          </p>
        </div>
        <Button variant="primary" onClick={() => setIsAddModalOpen(true)}>
          + Add Agent Webhook
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <div className="text-sm text-slate-400">Total Deliveries</div>
          <div className="text-3xl font-bold text-blue-400">{stats?.total || 0}</div>
        </Card>
        <Card>
          <div className="text-sm text-slate-400">Success Rate</div>
          <div className="text-3xl font-bold text-green-400">
            {stats?.success_rate ? stats.success_rate.toFixed(1) : 0}%
          </div>
        </Card>
        <Card>
          <div className="text-sm text-slate-400">Failed</div>
          <div className="text-3xl font-bold text-red-400">{stats?.failed || 0}</div>
        </Card>
        <Card>
          <div className="text-sm text-slate-400">Monthly Cost</div>
          <div className="text-3xl font-bold text-purple-400">
            ${costSummary?.total_cost ? costSummary.total_cost.toFixed(2) : '0.00'}
          </div>
        </Card>
      </div>

      {/* Agent Configurations */}
      <Card className="mb-8">
        <h2 className="text-xl font-bold text-slate-50 mb-4">Agent Webhooks</h2>

        {configs.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-2">🔗</div>
            <p className="text-slate-400 mb-4">No agent webhooks configured</p>
            <Button variant="primary" onClick={() => setIsAddModalOpen(true)}>
              Add First Webhook
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {configs.map((config) => (
              <div
                key={config.agent_id}
                className="p-4 rounded-md bg-slate-800 border border-slate-700"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-bold text-slate-50">{config.agent_name}</h3>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        config.enabled ? 'bg-green-900 text-green-200' : 'bg-slate-700 text-slate-300'
                      }`}>
                        {config.enabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>

                    <div className="text-sm text-slate-400 mb-2">
                      <span className="font-mono">{config.agent_id}</span>
                    </div>

                    <div className="text-sm text-slate-300 mb-2">
                      URL: <span className="font-mono text-blue-400">{config.webhook_url}</span>
                    </div>

                    <div className="flex flex-wrap gap-1">
                      {config.events.map((event) => (
                        <span
                          key={event}
                          className="px-2 py-1 rounded text-xs bg-slate-700 text-slate-300"
                        >
                          {event}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant={config.enabled ? 'secondary' : 'primary'}
                      onClick={() => handleToggleAgent(config.agent_id, !config.enabled)}
                    >
                      {config.enabled ? 'Disable' : 'Enable'}
                    </Button>
                  </div>
                </div>

                {stats?.by_agent[config.agent_id] && (
                  <div className="mt-3 pt-3 border-t border-slate-700 flex gap-4 text-sm">
                    <div>
                      <span className="text-slate-400">Delivered:</span>{' '}
                      <span className="text-green-400 font-bold">
                        {stats.by_agent[config.agent_id].delivered}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400">Failed:</span>{' '}
                      <span className="text-red-400 font-bold">
                        {stats.by_agent[config.agent_id].failed}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Recent Deliveries */}
      <Card>
        <h2 className="text-xl font-bold text-slate-50 mb-4">Recent Deliveries</h2>

        {deliveries.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-slate-400">No deliveries yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {deliveries.map((delivery) => (
              <div
                key={delivery.id}
                className="p-3 rounded-md bg-slate-800 border border-slate-700"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-slate-200">{delivery.event}</span>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(delivery.status)}`}>
                        {delivery.status}
                      </span>
                    </div>

                    <div className="text-xs text-slate-400 mb-1">
                      To: <span className="text-slate-300">{delivery.webhook_id}</span>
                    </div>

                    <div className="text-xs text-slate-500">
                      {new Date(delivery.created_at).toLocaleString()}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <span className="text-xs text-slate-400">
                      Attempts: {delivery.attempts}/{delivery.max_attempts}
                    </span>
                    {delivery.status === 'failed' && (
                      <Button
                        variant="secondary"
                        onClick={() => handleRetryDelivery(delivery.id)}
                      >
                        Retry
                      </Button>
                    )}
                  </div>
                </div>

                {delivery.response && delivery.response.error && (
                  <div className="mt-2 p-2 rounded bg-red-900/20 border border-red-800">
                    <div className="text-xs text-red-300">
                      Error: {delivery.response.error}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Add Webhook Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add Agent Webhook"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleAddConfig();
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Agent ID *
            </label>
            <input
              type="text"
              value={formData.agent_id}
              onChange={(e) => setFormData({ ...formData, agent_id: e.target.value })}
              placeholder="frontend-agent"
              className="w-full rounded-md border border-slate-600 bg-slate-800 px-3 py-2 text-slate-50 placeholder-slate-500 focus:border-blue-500 focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Agent Name *
            </label>
            <input
              type="text"
              value={formData.agent_name}
              onChange={(e) => setFormData({ ...formData, agent_name: e.target.value })}
              placeholder="Frontend Agent"
              className="w-full rounded-md border border-slate-600 bg-slate-800 px-3 py-2 text-slate-50 placeholder-slate-500 focus:border-blue-500 focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Webhook URL *
            </label>
            <input
              type="url"
              value={formData.webhook_url}
              onChange={(e) => setFormData({ ...formData, webhook_url: e.target.value })}
              placeholder="https://your-agent.railway.app/execute"
              className="w-full rounded-md border border-slate-600 bg-slate-800 px-3 py-2 text-slate-50 placeholder-slate-500 focus:border-blue-500 focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Events
            </label>
            <div className="space-y-2">
              {['task.assigned', 'task.updated', 'github.push', 'github.pull_request'].map(
                (event) => (
                  <label key={event} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.events.includes(event)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFormData({ ...formData, events: [...formData.events, event] });
                        } else {
                          setFormData({
                            ...formData,
                            events: formData.events.filter((e) => e !== event),
                          });
                        }
                      }}
                      className="mr-2"
                    />
                    <span className="text-sm text-slate-300">{event}</span>
                  </label>
                )
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="ghost" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Add Webhook
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
