'use client';

import { useState, useEffect } from 'react';
import { Agent, SystemHealth, Bottleneck, Alert, MaestroTask } from '@/lib/types';
import { getTasks } from '@/lib/storage-adapter';
import { Card } from '@/components/Card';
import { getSystemHealth, getStuckAgents, getIdleAgents, getOfflineAgents } from '@/lib/agent-health';
import { detectBottlenecks } from '@/lib/bottleneck-detection';
import { generateAlerts } from '@/lib/alerts';
import { registerAgent, getAllAgents, calculateHealthScore } from '@/lib/agent-registry';

interface AgentWithMetrics extends Agent {
  healthScore: number;
  successRate: number;
  avgTaskTime: number;
  currentStatus: 'healthy' | 'stuck' | 'idle' | 'offline';
}

export default function AgentsPage() {
  const [agents, setAgents] = useState<AgentWithMetrics[]>([]);
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [bottlenecks, setBottlenecks] = useState<Bottleneck[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedAgent, setSelectedAgent] = useState<AgentWithMetrics | null>(null);
  const [taskHistory, setTaskHistory] = useState<MaestroTask[]>([]);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const loadData = async () => {
    const allAgents = await getAllAgents();
    const stuckAgents = await getStuckAgents();
    const idleAgents = await getIdleAgents();
    const offlineAgents = await getOfflineAgents();

    const stuckAgentIds = new Set(stuckAgents.map((a: Agent) => a.agent_id));
    const idleAgentIds = new Set(idleAgents.map((a: Agent) => a.agent_id));
    const offlineAgentIds = new Set(offlineAgents.map((a: Agent) => a.agent_id));

    // Enhance agents with metrics and current status
    const enhancedAgents: AgentWithMetrics[] = allAgents.map((agent: Agent) => {
      const healthScore = calculateHealthScore(agent);
      const currentStatus = offlineAgentIds.has(agent.agent_id)
        ? 'offline'
        : stuckAgentIds.has(agent.agent_id)
        ? 'stuck'
        : idleAgentIds.has(agent.agent_id)
        ? 'idle'
        : 'healthy';

      return {
        ...agent,
        healthScore,
        successRate: agent.success_rate || 1.0,
        avgTaskTime: agent.average_task_time || 0,
        currentStatus,
      };
    });

    setAgents(enhancedAgents);

    // Load supervisor data
    setSystemHealth(await getSystemHealth());
    setBottlenecks(await detectBottlenecks());
    setAlerts(await generateAlerts());

    // Load task history (last 50 tasks) - now async
    const allTasks = await getTasks();
    const sortedTasks = allTasks.sort((a, b) =>
      new Date(b.created_date).getTime() - new Date(a.created_date).getTime()
    );
    setTaskHistory(sortedTasks.slice(0, 50));

    setLastUpdate(new Date());
    setIsLoading(false);
  };

  useEffect(() => {
    loadData();

    // Refresh every 5 seconds for real-time monitoring
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, []);

  const getAgentStats = (agentId: string) => {
    // Use taskHistory instead of calling getTasks() to avoid async issues
    const tasks = taskHistory.filter(t => t.assigned_to_agent === agentId);
    return {
      total: tasks.length,
      todo: tasks.filter(t => t.status === 'todo').length,
      inProgress: tasks.filter(t => t.status === 'in-progress').length,
      done: tasks.filter(t => t.status === 'done').length,
      blocked: tasks.filter(t => t.status === 'blocked').length,
    };
  };

  const getStatusIndicator = (agent: AgentWithMetrics) => {
    switch (agent.currentStatus) {
      case 'healthy':
        return { color: 'bg-green-600', textColor: 'text-green-400', label: 'Healthy', ring: 'ring-green-600' };
      case 'stuck':
        return { color: 'bg-yellow-600', textColor: 'text-yellow-400', label: 'Stuck', ring: 'ring-yellow-600' };
      case 'idle':
        return { color: 'bg-blue-600', textColor: 'text-blue-400', label: 'Idle', ring: 'ring-blue-600' };
      case 'offline':
        return { color: 'bg-slate-600', textColor: 'text-slate-400', label: 'Offline', ring: 'ring-slate-600' };
      default:
        return { color: 'bg-slate-600', textColor: 'text-slate-400', label: 'Unknown', ring: 'ring-slate-600' };
    }
  };

  const formatTime = (ms: number) => {
    if (ms === 0) return 'N/A';
    const minutes = Math.floor(ms / 60000);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  };

  const formatTimeSince = (date?: string) => {
    if (!date) return 'Never';
    const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

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

  const getRecentTasksForAgent = (agentId: string) => {
    return taskHistory
      .filter(t => t.assigned_to_agent === agentId)
      .slice(0, 5);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-slate-400">Loading agent health dashboard...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header with Last Update */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-50 mb-2">Agent Health Dashboard</h1>
          <p className="text-slate-400">
            {agents.length} agent{agents.length !== 1 ? 's' : ''} • Real-time monitoring
          </p>
        </div>
        <div className="text-right">
          <div className="text-xs text-slate-500">Last updated</div>
          <div className="text-sm text-slate-300">{lastUpdate.toLocaleTimeString()}</div>
          <div className="mt-1 flex items-center gap-2 justify-end">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-xs text-green-400">Live</span>
          </div>
        </div>
      </div>

      {/* System Health Card */}
      {systemHealth && (
        <Card className="mb-6 border-2 border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-slate-50">System Health</h2>
            <div className={`text-4xl font-bold ${getHealthColor(systemHealth.status)}`}>
              {systemHealth.health_percentage}%
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-slate-800 rounded-lg">
              <div className="text-3xl font-bold text-blue-400">{systemHealth.total_agents}</div>
              <div className="text-sm text-slate-400 mt-1">Total Agents</div>
            </div>
            <div className="text-center p-4 bg-slate-800 rounded-lg">
              <div className="text-3xl font-bold text-green-400">{systemHealth.healthy}</div>
              <div className="text-sm text-slate-400 mt-1">Healthy</div>
            </div>
            <div className="text-center p-4 bg-slate-800 rounded-lg">
              <div className="text-3xl font-bold text-yellow-400">{systemHealth.stuck}</div>
              <div className="text-sm text-slate-400 mt-1">Stuck</div>
            </div>
            <div className="text-center p-4 bg-slate-800 rounded-lg">
              <div className="text-3xl font-bold text-red-400">{systemHealth.offline}</div>
              <div className="text-sm text-slate-400 mt-1">Offline</div>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${
                systemHealth.status === 'healthy' ? 'bg-green-600' :
                systemHealth.status === 'degraded' ? 'bg-yellow-600' :
                'bg-red-600'
              }`} />
              <span className="text-sm text-slate-300 capitalize font-medium">
                System Status: {systemHealth.status}
              </span>
            </div>
            <div className="text-xs text-slate-500">
              Auto-refresh every 5s
            </div>
          </div>
        </Card>
      )}

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="mb-6">
          <h2 className="text-xl font-bold text-slate-50 mb-3">Active Alerts ({alerts.length})</h2>
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
                      <span className="text-xs text-slate-600">•</span>
                      <span className="text-xs text-slate-500">
                        {new Date(alert.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-slate-200 mb-2 font-medium">{alert.message}</p>
                    <p className="text-sm text-slate-400">
                      <span className="font-semibold">Action:</span> {alert.action}
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
          <h2 className="text-xl font-bold text-slate-50 mb-3">Bottlenecks Detected ({bottlenecks.length})</h2>
          <div className="space-y-3">
            {bottlenecks.map((bottleneck, idx) => (
              <Card key={idx} className="border-l-4 border-orange-600 bg-orange-950">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="font-bold text-slate-50 mb-2 text-lg">
                      {bottleneck.agent_type} Agents Overloaded
                    </h3>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="bg-orange-900 p-3 rounded-lg">
                        <div className="text-xs text-orange-300">Backlog</div>
                        <div className="text-2xl font-bold text-orange-200">
                          {bottleneck.backlog}
                        </div>
                        <div className="text-xs text-orange-400">tasks waiting</div>
                      </div>
                      <div className="bg-orange-900 p-3 rounded-lg">
                        <div className="text-xs text-orange-300">Utilization</div>
                        <div className="text-2xl font-bold text-orange-200">
                          {bottleneck.utilization}%
                        </div>
                        <div className="text-xs text-orange-400">capacity used</div>
                      </div>
                      <div className="bg-orange-900 p-3 rounded-lg">
                        <div className="text-xs text-orange-300">Est. Delay</div>
                        <div className="text-2xl font-bold text-orange-200">
                          ~{bottleneck.estimated_delay}h
                        </div>
                        <div className="text-xs text-orange-400">until cleared</div>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleSpawnAgent(bottleneck.agent_type)}
                    className="ml-6 px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm font-bold transition shadow-lg hover:shadow-xl"
                  >
                    Spawn Agent
                  </button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Performance Metrics Overview */}
      {agents.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="text-center bg-gradient-to-br from-blue-950 to-slate-900">
            <p className="text-sm text-blue-300 mb-2">Avg Success Rate</p>
            <p className="text-3xl font-bold text-blue-400">
              {Math.round(agents.reduce((sum, a) => sum + (a.successRate || 0), 0) / agents.length * 100)}%
            </p>
          </Card>
          <Card className="text-center bg-gradient-to-br from-green-950 to-slate-900">
            <p className="text-sm text-green-300 mb-2">Total Completed</p>
            <p className="text-3xl font-bold text-green-400">
              {agents.reduce((sum, a) => sum + (a.tasks_completed || 0), 0)}
            </p>
          </Card>
          <Card className="text-center bg-gradient-to-br from-yellow-950 to-slate-900">
            <p className="text-sm text-yellow-300 mb-2">Avg Task Time</p>
            <p className="text-3xl font-bold text-yellow-400">
              {formatTime(agents.reduce((sum, a) => sum + (a.avgTaskTime || 0), 0) / agents.length)}
            </p>
          </Card>
          <Card className="text-center bg-gradient-to-br from-purple-950 to-slate-900">
            <p className="text-sm text-purple-300 mb-2">Avg Health Score</p>
            <p className="text-3xl font-bold text-purple-400">
              {Math.round(agents.reduce((sum, a) => sum + a.healthScore, 0) / agents.length)}/100
            </p>
          </Card>
        </div>
      )}

      {/* Agents Table */}
      <h2 className="text-xl font-bold text-slate-50 mb-3">All Agents</h2>
      {agents.length === 0 ? (
        <Card className="text-center py-12">
          <div className="text-5xl mb-4">🤖</div>
          <p className="text-slate-400 mb-4">No agents yet. Create a project or spawn an agent.</p>
          <button
            onClick={() => handleSpawnAgent('Backend')}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition"
          >
            Spawn Backend Agent
          </button>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700 bg-slate-800">
                  <th className="text-left px-4 py-3 font-bold text-slate-300">Agent</th>
                  <th className="text-left px-4 py-3 font-bold text-slate-300">Status</th>
                  <th className="text-center px-4 py-3 font-bold text-slate-300">Health</th>
                  <th className="text-center px-4 py-3 font-bold text-slate-300">Success Rate</th>
                  <th className="text-center px-4 py-3 font-bold text-slate-300">Avg Time</th>
                  <th className="text-center px-4 py-3 font-bold text-slate-300">Tasks</th>
                  <th className="text-left px-4 py-3 font-bold text-slate-300">Last Seen</th>
                </tr>
              </thead>
              <tbody>
                {agents.map(agent => {
                  const stats = getAgentStats(agent.agent_id);
                  const statusIndicator = getStatusIndicator(agent);

                  return (
                    <tr
                      key={agent.agent_id}
                      onClick={() => setSelectedAgent(agent)}
                      className="border-b border-slate-700 hover:bg-slate-750 transition cursor-pointer"
                    >
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-3 h-3 rounded-full ${statusIndicator.color} animate-pulse`} />
                          <div>
                            <div className="font-medium text-slate-50">{agent.agent_name}</div>
                            <div className="text-xs text-slate-500">{agent.agent_type || 'General'}</div>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusIndicator.textColor} bg-opacity-10 bg-current ring-1 ${statusIndicator.ring}`}>
                          {statusIndicator.label}
                        </span>
                      </td>

                      <td className="px-4 py-4">
                        <div className="text-center">
                          <div className={`text-lg font-bold ${
                            agent.healthScore >= 80 ? 'text-green-400' :
                            agent.healthScore >= 50 ? 'text-yellow-400' :
                            'text-red-400'
                          }`}>
                            {agent.healthScore}
                          </div>
                          <div className="text-xs text-slate-500">/100</div>
                        </div>
                      </td>

                      <td className="px-4 py-4">
                        <div className="text-center">
                          <div className={`text-lg font-bold ${
                            agent.successRate >= 0.9 ? 'text-green-400' :
                            agent.successRate >= 0.7 ? 'text-yellow-400' :
                            'text-red-400'
                          }`}>
                            {Math.round(agent.successRate * 100)}%
                          </div>
                          <div className="text-xs text-slate-500">
                            {stats.done}/{stats.done + stats.blocked}
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-4">
                        <div className="text-center text-slate-300 font-medium">
                          {formatTime(agent.avgTaskTime)}
                        </div>
                      </td>

                      <td className="px-4 py-4">
                        <div className="text-center">
                          <div className="font-bold text-slate-50">{stats.total}</div>
                          <div className="text-xs text-slate-500 space-x-2">
                            <span className="text-blue-400">{stats.inProgress} active</span>
                            <span>•</span>
                            <span className="text-yellow-400">{stats.todo} todo</span>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-4">
                        <div className="text-sm text-slate-400">
                          {formatTimeSince(agent.last_poll_date)}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Task Assignment History */}
      {taskHistory.length > 0 && (
        <div className="mt-8">
          <h2 className="text-xl font-bold text-slate-50 mb-3">Recent Task Assignments ({taskHistory.length})</h2>
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-700 bg-slate-800">
                    <th className="text-left px-4 py-3 font-bold text-slate-300">Task</th>
                    <th className="text-left px-4 py-3 font-bold text-slate-300">Agent</th>
                    <th className="text-left px-4 py-3 font-bold text-slate-300">Status</th>
                    <th className="text-left px-4 py-3 font-bold text-slate-300">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {taskHistory.slice(0, 10).map(task => {
                    const agent = agents.find(a => a.agent_id === task.assigned_to_agent);
                    const statusColors = {
                      'todo': 'text-yellow-400 bg-yellow-950',
                      'in-progress': 'text-blue-400 bg-blue-950',
                      'done': 'text-green-400 bg-green-950',
                      'blocked': 'text-red-400 bg-red-950',
                    };

                    return (
                      <tr key={task.task_id} className="border-b border-slate-700 hover:bg-slate-750 transition">
                        <td className="px-4 py-3">
                          <div className="font-medium text-slate-200">{task.title}</div>
                          <div className="text-xs text-slate-500">Priority: {task.priority}</div>
                        </td>
                        <td className="px-4 py-3 text-slate-300">
                          {agent ? agent.agent_name : task.assigned_to_agent || 'Unassigned'}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${statusColors[task.status]}`}>
                            {task.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-400">
                          {formatTimeSince(task.created_date)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* Agent Detail Modal */}
      {selectedAgent && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedAgent(null)}
        >
          <Card
            className="max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-2xl font-bold text-slate-50">{selectedAgent.agent_name}</h2>
                <p className="text-slate-400">{selectedAgent.agent_id}</p>
              </div>
              <button
                onClick={() => setSelectedAgent(null)}
                className="text-slate-400 hover:text-slate-200 text-2xl"
              >
                ×
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-slate-800 p-4 rounded-lg">
                <div className="text-sm text-slate-400">Status</div>
                <div className={`text-xl font-bold ${getStatusIndicator(selectedAgent).textColor}`}>
                  {getStatusIndicator(selectedAgent).label}
                </div>
              </div>
              <div className="bg-slate-800 p-4 rounded-lg">
                <div className="text-sm text-slate-400">Health Score</div>
                <div className={`text-xl font-bold ${
                  selectedAgent.healthScore >= 80 ? 'text-green-400' :
                  selectedAgent.healthScore >= 50 ? 'text-yellow-400' :
                  'text-red-400'
                }`}>
                  {selectedAgent.healthScore}/100
                </div>
              </div>
              <div className="bg-slate-800 p-4 rounded-lg">
                <div className="text-sm text-slate-400">Success Rate</div>
                <div className="text-xl font-bold text-slate-50">
                  {Math.round(selectedAgent.successRate * 100)}%
                </div>
              </div>
              <div className="bg-slate-800 p-4 rounded-lg">
                <div className="text-sm text-slate-400">Avg Task Time</div>
                <div className="text-xl font-bold text-slate-50">
                  {formatTime(selectedAgent.avgTaskTime)}
                </div>
              </div>
            </div>

            <div className="mb-4">
              <h3 className="text-lg font-bold text-slate-50 mb-2">Capabilities</h3>
              <div className="flex flex-wrap gap-2">
                {selectedAgent.capabilities && selectedAgent.capabilities.length > 0 ? (
                  selectedAgent.capabilities.map((cap, idx) => (
                    <span key={idx} className="px-3 py-1 bg-blue-900 text-blue-300 rounded-full text-sm">
                      {cap}
                    </span>
                  ))
                ) : (
                  <span className="text-slate-500">No capabilities listed</span>
                )}
              </div>
            </div>

            <div>
              <h3 className="text-lg font-bold text-slate-50 mb-2">Recent Tasks</h3>
              <div className="space-y-2">
                {getRecentTasksForAgent(selectedAgent.agent_id).map(task => (
                  <div key={task.task_id} className="bg-slate-800 p-3 rounded">
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-slate-200">{task.title}</div>
                      <span className={`text-xs px-2 py-1 rounded ${
                        task.status === 'done' ? 'bg-green-900 text-green-300' :
                        task.status === 'in-progress' ? 'bg-blue-900 text-blue-300' :
                        task.status === 'blocked' ? 'bg-red-900 text-red-300' :
                        'bg-yellow-900 text-yellow-300'
                      }`}>
                        {task.status}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      {formatTimeSince(task.created_date)}
                    </div>
                  </div>
                ))}
                {getRecentTasksForAgent(selectedAgent.agent_id).length === 0 && (
                  <p className="text-slate-500 text-sm">No recent tasks</p>
                )}
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
