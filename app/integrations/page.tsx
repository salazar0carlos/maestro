'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { IntegrationHealth, SystemHealth, HealthStatus } from '@/lib/integration-health';
import { AgentCommunication, AgentMessage } from '@/lib/agent-communication';
import { KnowledgeBase } from '@/lib/knowledge-base';
import { getTasks } from '@/lib/storage';
import { DependencyDetector } from '@/lib/dependency-detection';

export default function IntegrationsPage() {
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [knowledgeStats, setKnowledgeStats] = useState<any>(null);
  const [dependencies, setDependencies] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  // Auto-refresh every 30 seconds when enabled
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      loadData();
    }, 30000);

    return () => clearInterval(interval);
  }, [autoRefresh]);

  const loadData = async () => {
    try {
      // Load health status
      const healthStatus = await IntegrationHealth.checkAll(false);
      setHealth(healthStatus);

      // Load recent messages
      const recentMessages = AgentCommunication.getRecentMessages(10);
      setMessages(recentMessages);

      // Load knowledge base stats
      const kbStats = KnowledgeBase.getStats();
      setKnowledgeStats(kbStats);

      // Load task dependencies
      const tasks = getTasks();
      const deps = DependencyDetector.analyzeDependencies(tasks);
      setDependencies(deps);

      setIsLoading(false);
    } catch (error) {
      console.error('Failed to load integration data:', error);
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: HealthStatus): string => {
    switch (status) {
      case 'healthy':
        return 'bg-green-900 text-green-200';
      case 'degraded':
        return 'bg-yellow-900 text-yellow-200';
      case 'unhealthy':
        return 'bg-red-900 text-red-200';
      case 'offline':
        return 'bg-slate-700 text-slate-300';
      default:
        return 'bg-slate-700 text-slate-300';
    }
  };

  const getStatusIcon = (status: HealthStatus): string => {
    switch (status) {
      case 'healthy':
        return '✅';
      case 'degraded':
        return '⚠️';
      case 'unhealthy':
        return '❌';
      case 'offline':
        return '⭕';
      default:
        return '❓';
    }
  };

  const getMessageTypeIcon = (type: string): string => {
    switch (type) {
      case 'task_complete':
        return '✅';
      case 'need_info':
        return '❓';
      case 'context_share':
        return '📤';
      case 'dependency_alert':
        return '⚠️';
      case 'error_report':
        return '❌';
      default:
        return '📨';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="text-3xl mb-4">⏳</div>
          <p className="text-slate-400">Loading integration status...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-50 mb-2">Agent Coordination</h1>
          <p className="text-slate-400">
            Integration health and agent communication status
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={autoRefresh ? 'primary' : 'secondary'}
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            {autoRefresh ? '🔄 Auto-refresh ON' : '⏸️ Auto-refresh OFF'}
          </Button>
          <Button variant="secondary" onClick={loadData}>
            🔄 Refresh Now
          </Button>
        </div>
      </div>

      {/* Overall Status */}
      {health && (
        <Card className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-50 mb-2">System Status</h2>
              <div className="flex items-center gap-2">
                <span className="text-3xl">{getStatusIcon(health.overall_status)}</span>
                <span className={`px-3 py-1 rounded text-sm font-medium ${getStatusColor(health.overall_status)}`}>
                  {health.overall_status.toUpperCase()}
                </span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-slate-400">Last Updated</div>
              <div className="text-slate-200">
                {new Date(health.timestamp).toLocaleTimeString()}
              </div>
            </div>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-700">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-400">{health.summary.healthy}</div>
              <div className="text-sm text-slate-400">Healthy</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-400">{health.summary.degraded}</div>
              <div className="text-sm text-slate-400">Degraded</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-400">{health.summary.unhealthy}</div>
              <div className="text-sm text-slate-400">Unhealthy</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-slate-400">{health.summary.offline}</div>
              <div className="text-sm text-slate-400">Offline</div>
            </div>
          </div>
        </Card>
      )}

      {/* Integration Health Cards */}
      {health && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {health.integrations.map((integration) => (
            <Card key={integration.integration}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-bold text-slate-50 capitalize">
                  {integration.integration.replace('_', ' ')}
                </h3>
                <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(integration.status)}`}>
                  {integration.status}
                </span>
              </div>

              {integration.message && (
                <p className="text-sm text-slate-300 mb-3">{integration.message}</p>
              )}

              {/* Integration-specific details */}
              {integration.integration === 'github' && integration.details && (
                <div className="space-y-2 text-sm">
                  {integration.details.rate_limit_remaining !== undefined && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">Rate Limit:</span>
                      <span className="text-slate-200">
                        {integration.details.rate_limit_remaining}/{integration.details.rate_limit_limit}
                      </span>
                    </div>
                  )}
                  {integration.details.authenticated !== undefined && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">Authenticated:</span>
                      <span className="text-slate-200">
                        {integration.details.authenticated ? '✅ Yes' : '❌ No'}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {integration.integration === 'agent_communication' && integration.details && (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Total Messages:</span>
                    <span className="text-slate-200">{integration.details.total_messages}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Unread:</span>
                    <span className="text-slate-200">{integration.details.unread_messages}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Active Agents:</span>
                    <span className="text-slate-200">{integration.details.agents_active}</span>
                  </div>
                </div>
              )}

              {integration.integration === 'knowledge_base' && integration.details && (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Total Entries:</span>
                    <span className="text-slate-200">{integration.details.total_entries}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Verified:</span>
                    <span className="text-slate-200">{integration.details.verified_entries}</span>
                  </div>
                  {integration.details.storage_size !== undefined && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">Storage:</span>
                      <span className="text-slate-200">
                        {(integration.details.storage_size / 1024).toFixed(1)} KB
                      </span>
                    </div>
                  )}
                </div>
              )}

              <div className="text-xs text-slate-500 mt-3 pt-3 border-t border-slate-700">
                Last check: {new Date(integration.last_check).toLocaleTimeString()}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Recent Messages */}
      <Card className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-slate-50">Recent Agent Messages</h2>
          <span className="text-sm text-slate-400">{messages.length} messages</span>
        </div>

        {messages.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-2">📭</div>
            <p className="text-slate-400">No messages yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`p-3 rounded-md border ${
                  msg.read
                    ? 'border-slate-700 bg-slate-800/50'
                    : 'border-blue-700 bg-blue-900/20'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{getMessageTypeIcon(msg.type)}</span>
                    <div>
                      <div className="text-sm font-medium text-slate-200">
                        {msg.from} → {msg.to}
                      </div>
                      <div className="text-xs text-slate-400">
                        {msg.type.replace('_', ' ')}
                      </div>
                    </div>
                  </div>
                  <div className="text-xs text-slate-500">
                    {new Date(msg.timestamp).toLocaleTimeString()}
                  </div>
                </div>

                {msg.payload && Object.keys(msg.payload).length > 0 && (
                  <div className="text-sm text-slate-300 mt-2 pl-7">
                    {JSON.stringify(msg.payload, null, 2).substring(0, 200)}
                    {JSON.stringify(msg.payload).length > 200 && '...'}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Knowledge Base Stats */}
      {knowledgeStats && (
        <Card className="mb-8">
          <h2 className="text-xl font-bold text-slate-50 mb-4">Knowledge Base</h2>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div>
              <div className="text-2xl font-bold text-blue-400">{knowledgeStats.total}</div>
              <div className="text-sm text-slate-400">Total Entries</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-400">{knowledgeStats.verified}</div>
              <div className="text-sm text-slate-400">Verified</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-purple-400">
                {Object.keys(knowledgeStats.byAgent).length}
              </div>
              <div className="text-sm text-slate-400">Contributing Agents</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-yellow-400">
                {knowledgeStats.mostUsed.length}
              </div>
              <div className="text-sm text-slate-400">Popular Entries</div>
            </div>
          </div>

          {knowledgeStats.recentlyAdded.length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-slate-300 mb-2">Recently Added</h3>
              <div className="space-y-1">
                {knowledgeStats.recentlyAdded.slice(0, 5).map((entry: any) => (
                  <div key={entry.id} className="text-sm p-2 rounded bg-slate-800">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-200">{entry.topic}</span>
                      <span className="text-xs text-slate-500">{entry.agent}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Task Dependencies */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-slate-50">Task Dependencies</h2>
          <span className="text-sm text-slate-400">{dependencies.length} dependencies</span>
        </div>

        {dependencies.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-2">🔗</div>
            <p className="text-slate-400">No task dependencies detected</p>
          </div>
        ) : (
          <div className="space-y-2">
            {dependencies.slice(0, 10).map((dep, index) => (
              <div key={index} className="p-3 rounded-md bg-slate-800 border border-slate-700">
                <div className="text-sm text-slate-200 mb-1">
                  Task: <span className="font-mono text-blue-400">{dep.task}</span>
                </div>
                <div className="text-sm text-slate-300">
                  → Depends on: <span className="font-mono text-green-400">{dep.depends_on}</span>
                </div>
                <div className="text-xs text-slate-500 mt-2">
                  {dep.reason} ({dep.type})
                </div>
              </div>
            ))}
            {dependencies.length > 10 && (
              <div className="text-center text-sm text-slate-400 pt-2">
                ... and {dependencies.length - 10} more dependencies
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
