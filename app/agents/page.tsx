'use client';

import { useState, useEffect } from 'react';
import { Agent, Project, SystemHealth, Bottleneck, AgentMetrics } from '@/lib/types';
import {
  getAgents,
  getProject,
  calculateSystemHealth,
  detectBottlenecks,
  getAgentMetrics
} from '@/lib/storage';
import { Card } from '@/components/Card';
import { AlertCircle } from 'lucide-react';

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [projectMap, setProjectMap] = useState<Record<string, Project>>({});
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [bottlenecks, setBottlenecks] = useState<Bottleneck[]>([]);
  const [agentMetricsMap, setAgentMetricsMap] = useState<Record<string, AgentMetrics>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();

    // Set up polling for real-time updates every 10 seconds (fallback)
    const interval = setInterval(loadData, 10000);

    return () => clearInterval(interval);
  }, []);

  const loadData = () => {
    const loaded = getAgents();
    setAgents(loaded);

    // Build project map
    const map: Record<string, Project> = {};
    loaded.forEach(agent => {
      const project = getProject(agent.project_id);
      if (project && !map[project.project_id]) {
        map[project.project_id] = project;
      }
    });
    setProjectMap(map);

    // Load agent metrics
    const metricsMap: Record<string, AgentMetrics> = {};
    loaded.forEach(agent => {
      const metrics = getAgentMetrics(agent.agent_id);
      if (metrics) {
        metricsMap[agent.agent_id] = metrics;
      }
    });
    setAgentMetricsMap(metricsMap);

    // Calculate system health
    setSystemHealth(calculateSystemHealth());

    // Detect bottlenecks
    setBottlenecks(detectBottlenecks());

    setIsLoading(false);
  };

  const getStatusIndicator = (agent: Agent) => {
    if (agent.status === 'active') {
      return { color: 'bg-green-600', label: 'Active' };
    } else if (agent.status === 'idle') {
      return { color: 'bg-yellow-600', label: 'Idle' };
    } else {
      return { color: 'bg-slate-600', label: 'Offline' };
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-slate-400">Loading agents...</p>
      </div>
    );
  }

  const getHealthColor = (percentage: number) => {
    if (percentage >= 80) return 'text-green-400';
    if (percentage >= 50) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'border-red-600 bg-red-950';
      case 'medium': return 'border-orange-600 bg-orange-950';
      case 'low': return 'border-yellow-600 bg-yellow-950';
      default: return 'border-slate-600 bg-slate-900';
    }
  };

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-50 mb-2">Agent Monitor</h1>
        <p className="text-slate-400">
          {agents.length} agent{agents.length !== 1 ? 's' : ''} across all projects
        </p>
      </div>

      {/* System Health Card */}
      {systemHealth && (
        <Card className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-slate-50">System Health</h2>
            <div className={`text-4xl font-bold ${getHealthColor(systemHealth.health_percentage)}`}>
              {systemHealth.health_percentage}%
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 bg-green-950 border border-green-800 rounded-lg">
              <div className="text-2xl font-bold text-green-400">{systemHealth.healthy}</div>
              <div className="text-sm text-green-300">Healthy</div>
            </div>
            <div className="text-center p-4 bg-yellow-950 border border-yellow-800 rounded-lg">
              <div className="text-2xl font-bold text-yellow-400">{systemHealth.stuck}</div>
              <div className="text-sm text-yellow-300">Idle</div>
            </div>
            <div className="text-center p-4 bg-red-950 border border-red-800 rounded-lg">
              <div className="text-2xl font-bold text-red-400">{systemHealth.offline}</div>
              <div className="text-sm text-red-300">Offline</div>
            </div>
          </div>
        </Card>
      )}

      {/* Bottleneck Alerts */}
      {bottlenecks.length > 0 && (
        <Card className="mb-6 border-orange-600 bg-orange-950">
          <div className="flex items-start gap-3 mb-4">
            <AlertCircle className="text-orange-400 mt-1" size={24} />
            <div>
              <h3 className="text-lg font-bold text-orange-400 mb-1">
                Bottlenecks Detected
              </h3>
              <p className="text-sm text-orange-200">
                {bottlenecks.length} agent{bottlenecks.length !== 1 ? 's need' : ' needs'} attention
              </p>
            </div>
          </div>
          <div className="space-y-3">
            {bottlenecks.map((bottleneck, index) => (
              <div
                key={`${bottleneck.agent_id}-${index}`}
                className={`p-4 rounded-lg border ${getSeverityColor(bottleneck.severity)}`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="font-bold text-slate-50">{bottleneck.agent_type}</div>
                    <div className="text-xs text-slate-400">{bottleneck.agent_id}</div>
                  </div>
                  <div className="px-2 py-1 bg-slate-800 rounded text-xs font-medium text-slate-300 uppercase">
                    {bottleneck.severity}
                  </div>
                </div>
                <p className="text-sm text-slate-300 mb-2">{bottleneck.issue}</p>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-400">Recommended:</span>
                  <span className="text-slate-300">{bottleneck.recommended_action}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Agents Table */}
      {agents.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-5xl mb-4">🤖</div>
          <p className="text-slate-400">No agents yet. Create a project to add agents.</p>
        </div>
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="text-left px-6 py-3 font-bold text-slate-300">Agent</th>
                <th className="text-left px-6 py-3 font-bold text-slate-300">Project</th>
                <th className="text-left px-6 py-3 font-bold text-slate-300">Status</th>
                <th className="text-center px-6 py-3 font-bold text-slate-300">Completed Today</th>
                <th className="text-center px-6 py-3 font-bold text-slate-300">Cost Today</th>
                <th className="text-left px-6 py-3 font-bold text-slate-300">Last Triggered</th>
              </tr>
            </thead>
            <tbody>
              {agents.map(agent => {
                const statusIndicator = getStatusIndicator(agent);
                const project = projectMap[agent.project_id];
                const metrics = agentMetricsMap[agent.agent_id];

                return (
                  <tr
                    key={agent.agent_id}
                    className="border-b border-slate-700 hover:bg-slate-700 transition"
                  >
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-50">{agent.agent_name}</div>
                      <div className="text-xs text-slate-500">{agent.agent_id}</div>
                    </td>

                    <td className="px-6 py-4">
                      <div className="text-slate-300">
                        {project ? project.name : 'Unknown'}
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-2 h-2 rounded-full ${statusIndicator.color}`}
                        />
                        <span className="text-slate-300">
                          {statusIndicator.label}
                        </span>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <div className="text-center">
                        <div className="font-bold text-slate-50">
                          {metrics?.tasks_completed_today || 0}
                        </div>
                        <div className="text-xs text-slate-500">
                          {metrics?.tasks_completed_total || 0} total
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <div className="text-center">
                        <div className="font-bold text-slate-50">
                          ${(metrics?.cost_metrics.estimated_cost_today_usd || 0).toFixed(2)}
                        </div>
                        <div className="text-xs text-slate-500">
                          {metrics?.cost_metrics.api_calls_today || 0} API calls
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <div className="text-xs text-slate-500">
                        {metrics?.last_triggered
                          ? new Date(metrics.last_triggered).toLocaleString()
                          : 'Never triggered'}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}

      {/* Summary Stats */}
      {agents.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
          {[
            { label: 'Total Agents', count: agents.length, color: 'text-blue-400' },
            {
              label: 'Active',
              count: agents.filter(a => a.status === 'active').length,
              color: 'text-green-400',
            },
            {
              label: 'Idle',
              count: agents.filter(a => a.status === 'idle').length,
              color: 'text-yellow-400',
            },
            {
              label: 'Offline',
              count: agents.filter(a => a.status === 'offline').length,
              color: 'text-slate-400',
            },
          ].map(stat => (
            <Card key={stat.label} className="text-center">
              <p className="text-sm text-slate-400 mb-2">{stat.label}</p>
              <p className={`text-2xl font-bold ${stat.color}`}>{stat.count}</p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
