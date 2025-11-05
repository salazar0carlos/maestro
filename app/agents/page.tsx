'use client';

import { useState, useEffect } from 'react';
import { Agent, Project, SystemHealth, Bottleneck, Alert } from '@/lib/types';
import { getAgents, getProject, getTasks } from '@/lib/storage';
import { Card } from '@/components/Card';
import { getSystemHealth } from '@/lib/agent-health';
import { detectBottlenecks } from '@/lib/bottleneck-detection';
import { generateAlerts } from '@/lib/alerts';
import { registerAgent } from '@/lib/agent-registry';

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [projectMap, setProjectMap] = useState<Record<string, Project>>({});
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [bottlenecks, setBottlenecks] = useState<Bottleneck[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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

    // Load supervisor data
    setSystemHealth(getSystemHealth());
    setBottlenecks(detectBottlenecks());
    setAlerts(generateAlerts());

    setIsLoading(false);
  };

  useEffect(() => {
    loadData();

    // Refresh every 10 seconds
    const interval = setInterval(loadData, 10000);
    return () => clearInterval(interval);
  }, []);

  const getAgentStats = (agentId: string) => {
    const tasks = getTasks().filter(t => t.assigned_to_agent === agentId);
    return {
      total: tasks.length,
      todo: tasks.filter(t => t.status === 'todo').length,
      inProgress: tasks.filter(t => t.status === 'in-progress').length,
      done: tasks.filter(t => t.status === 'done').length,
      blocked: tasks.filter(t => t.status === 'blocked').length,
    };
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

  const handleSpawnAgent = (agentType: string) => {
    try {
      const capabilities = agentType === 'Frontend'
        ? ['React', 'Next.js', 'Tailwind', 'TypeScript']
        : agentType === 'Backend'
        ? ['Node.js', 'API', 'Database', 'TypeScript']
        : agentType === 'Testing'
        ? ['Jest', 'Cypress', 'Testing', 'QA']
        : [];

      registerAgent({
        agent_id: `${agentType.toLowerCase()}-${Date.now()}`,
        agent_name: `${agentType} Agent`,
        project_id: 'maestro-system',
        status: 'idle',
        tasks_completed: 0,
        tasks_in_progress: 0,
        agent_type: agentType,
        capabilities,
      });

      loadData(); // Refresh
      alert(`${agentType} agent spawned successfully!`);
    } catch (error) {
      alert('Failed to spawn agent: ' + (error as Error).message);
    }
  };

  const getHealthColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-400';
      case 'degraded': return 'text-yellow-400';
      case 'critical': return 'text-red-400';
      default: return 'text-slate-400';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'border-red-600 bg-red-950';
      case 'high': return 'border-orange-600 bg-orange-950';
      case 'medium': return 'border-yellow-600 bg-yellow-950';
      case 'low': return 'border-blue-600 bg-blue-950';
      default: return 'border-slate-600 bg-slate-800';
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-50 mb-2">Supervisor Dashboard</h1>
        <p className="text-slate-400">
          {agents.length} agent{agents.length !== 1 ? 's' : ''} across all projects
        </p>
      </div>

      {/* System Health Card */}
      {systemHealth && (
        <Card className="mb-6 border-2 border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-slate-50">System Health</h2>
            <div className={`text-3xl font-bold ${getHealthColor(systemHealth.status)}`}>
              {systemHealth.health_percentage}%
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-400">{systemHealth.total_agents}</div>
              <div className="text-xs text-slate-400">Total Agents</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-400">{systemHealth.healthy}</div>
              <div className="text-xs text-slate-400">Healthy</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-400">{systemHealth.stuck}</div>
              <div className="text-xs text-slate-400">Stuck</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-400">{systemHealth.offline}</div>
              <div className="text-xs text-slate-400">Offline</div>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${
              systemHealth.status === 'healthy' ? 'bg-green-600' :
              systemHealth.status === 'degraded' ? 'bg-yellow-600' :
              'bg-red-600'
            }`} />
            <span className="text-sm text-slate-300 capitalize">
              {systemHealth.status}
            </span>
          </div>
        </Card>
      )}

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="mb-6">
          <h2 className="text-xl font-bold text-slate-50 mb-3">Active Alerts</h2>
          <div className="space-y-3">
            {alerts.slice(0, 3).map((alert, idx) => (
              <Card key={idx} className={`border-l-4 ${getSeverityColor(alert.severity)}`}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold uppercase text-slate-400">
                        {alert.severity}
                      </span>
                      <span className="text-xs text-slate-500">{alert.type}</span>
                    </div>
                    <p className="text-slate-200 mb-2">{alert.message}</p>
                    <p className="text-sm text-slate-400">
                      Action: {alert.action}
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Bottlenecks */}
      {bottlenecks.length > 0 && (
        <div className="mb-6">
          <h2 className="text-xl font-bold text-slate-50 mb-3">Bottlenecks Detected</h2>
          <div className="space-y-3">
            {bottlenecks.map((bottleneck, idx) => (
              <Card key={idx} className="border-l-4 border-orange-600 bg-orange-950">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="font-bold text-slate-50 mb-2">
                      {bottleneck.agent_type} Agents
                    </h3>
                    <div className="grid grid-cols-3 gap-4 mb-3">
                      <div>
                        <div className="text-xs text-slate-400">Backlog</div>
                        <div className="text-lg font-bold text-orange-300">
                          {bottleneck.backlog} tasks
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-slate-400">Utilization</div>
                        <div className="text-lg font-bold text-orange-300">
                          {bottleneck.utilization}%
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-slate-400">Est. Delay</div>
                        <div className="text-lg font-bold text-orange-300">
                          ~{bottleneck.estimated_delay}h
                        </div>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleSpawnAgent(bottleneck.agent_type)}
                    className="ml-4 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm font-medium transition"
                  >
                    Spawn Agent
                  </button>
                </div>
              </Card>
            ))}
          </div>
        </div>
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
                <th className="text-center px-6 py-3 font-bold text-slate-300">Tasks</th>
                <th className="text-center px-6 py-3 font-bold text-slate-300">Progress</th>
                <th className="text-left px-6 py-3 font-bold text-slate-300">Last Poll</th>
              </tr>
            </thead>
            <tbody>
              {agents.map(agent => {
                const stats = getAgentStats(agent.agent_id);
                const statusIndicator = getStatusIndicator(agent);
                const project = projectMap[agent.project_id];

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
                        <div className="font-bold text-slate-50">{stats.total}</div>
                        <div className="text-xs text-slate-500">total</div>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-blue-400">●</span>
                          <span className="text-slate-300">
                            {stats.inProgress} in progress
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-green-400">●</span>
                          <span className="text-slate-300">
                            {stats.done} done
                          </span>
                        </div>
                        {stats.blocked > 0 && (
                          <div className="flex items-center gap-2 text-xs">
                            <span className="text-red-400">●</span>
                            <span className="text-slate-300">
                              {stats.blocked} blocked
                            </span>
                          </div>
                        )}
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <div className="text-xs text-slate-500">
                        {agent.last_poll_date
                          ? new Date(agent.last_poll_date).toLocaleTimeString()
                          : 'Never'}
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
