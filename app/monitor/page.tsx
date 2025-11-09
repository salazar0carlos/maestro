'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Activity, AlertTriangle, CheckCircle, Clock, Zap, RefreshCw } from 'lucide-react';
import { SpawnAgentModal } from '@/components/SpawnAgentModal';

interface AgentMonitorData {
  agent_id: string;
  agent_name: string;
  project_id: string;
  project_name: string;
  status: 'active' | 'idle' | 'stuck' | 'offline';
  health_score: number;
  current_task: string | null;
  tasks_completed_today: number;
  tasks_completed_week: number;
  success_rate: number;
  error_rate: number;
  last_activity: string;
  uptime_percentage: number;
  average_task_time: number;
  tasks_in_queue: number;
  is_bottleneck: boolean;
  health_issues: string[];
}

interface MonitoringStats {
  total_agents: number;
  active_agents: number;
  idle_agents: number;
  stuck_agents: number;
  offline_agents: number;
  total_tasks: number;
  tasks_completed_today: number;
  tasks_completed_week: number;
  average_health_score: number;
  bottlenecks_count: number;
}

interface MonitoringResponse {
  agents: AgentMonitorData[];
  stats: MonitoringStats;
  timestamp: string;
}

export default function MonitorPage() {
  const [data, setData] = useState<MonitoringResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedAgentType, setSelectedAgentType] = useState<string>('all');
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSpawnModalOpen, setIsSpawnModalOpen] = useState(false);

  const fetchMonitoringData = useCallback(async () => {
    try {
      setIsRefreshing(true);
      const response = await fetch('/api/monitor');
      const result = await response.json();
      setData(result);
      setLastRefresh(new Date());
    } catch (error) {
      console.error('Failed to fetch monitoring data:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchMonitoringData();
  }, [fetchMonitoringData]);

  // Auto-refresh every 10 seconds
  useEffect(() => {
    const interval = setInterval(fetchMonitoringData, 10000);
    return () => clearInterval(interval);
  }, [fetchMonitoringData]);

  if (isLoading || !data) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-slate-400">Loading monitoring data...</p>
        </div>
      </div>
    );
  }

  // Filter agents
  const filteredAgents = data.agents.filter(agent => {
    if (selectedProject !== 'all' && agent.project_id !== selectedProject) return false;
    if (selectedStatus !== 'all' && agent.status !== selectedStatus) return false;
    if (selectedAgentType !== 'all' && !agent.agent_name.toLowerCase().includes(selectedAgentType.toLowerCase())) return false;
    return true;
  });

  // Get unique projects and agent types
  const projects = Array.from(new Set(data.agents.map(a => ({ id: a.project_id, name: a.project_name }))));
  const agentTypes = Array.from(new Set(data.agents.map(a => {
    // Extract agent type from name (e.g., "Frontend Agent" -> "Frontend")
    return a.agent_name.replace(' Agent', '').replace('Agent', '').trim();
  })));

  // Prepare chart data
  const statusData = [
    { name: 'Active', value: data.stats.active_agents, color: '#10b981' },
    { name: 'Idle', value: data.stats.idle_agents, color: '#eab308' },
    { name: 'Stuck', value: data.stats.stuck_agents, color: '#f97316' },
    { name: 'Offline', value: data.stats.offline_agents, color: '#64748b' },
  ];

  const healthData = filteredAgents.map(agent => ({
    name: agent.agent_name,
    health: agent.health_score,
    success: agent.success_rate * 100,
  }));

  const performanceData = filteredAgents.map(agent => ({
    name: agent.agent_name.substring(0, 10),
    'Today': agent.tasks_completed_today,
    'This Week': agent.tasks_completed_week,
  }));

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-600';
      case 'idle': return 'bg-yellow-600';
      case 'stuck': return 'bg-orange-600';
      case 'offline': return 'bg-slate-600';
      default: return 'bg-slate-600';
    }
  };

  const getHealthColor = (score: number) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    if (score >= 40) return 'text-orange-400';
    return 'text-red-400';
  };

  const formatTaskTime = (ms: number) => {
    if (ms === 0) return 'N/A';
    const minutes = Math.floor(ms / 60000);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ${minutes % 60}m`;
  };

  const handleSpawnAgent = () => {
    setIsSpawnModalOpen(true);
  };

  const handleSpawnSuccess = () => {
    fetchMonitoringData();
  };

  return (
    <div className="max-w-[1600px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-50 mb-2">
            Real-Time Agent Monitor
          </h1>
          <div className="flex items-center gap-4 text-sm text-slate-400">
            <span>Last updated: {lastRefresh.toLocaleTimeString()}</span>
            <button
              onClick={fetchMonitoringData}
              className="flex items-center gap-1 hover:text-slate-300 transition"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
        <Button variant="primary" onClick={handleSpawnAgent}>
          <Zap className="w-4 h-4 mr-2" />
          Spawn Agent
        </Button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="text-center">
          <div className="text-sm text-slate-400 mb-1">Total Agents</div>
          <div className="text-3xl font-bold text-blue-400">{data.stats.total_agents}</div>
        </Card>
        <Card className="text-center">
          <div className="text-sm text-slate-400 mb-1">Active</div>
          <div className="text-3xl font-bold text-green-400">{data.stats.active_agents}</div>
        </Card>
        <Card className="text-center">
          <div className="text-sm text-slate-400 mb-1">Avg Health</div>
          <div className={`text-3xl font-bold ${getHealthColor(data.stats.average_health_score)}`}>
            {data.stats.average_health_score}
          </div>
        </Card>
        <Card className="text-center">
          <div className="text-sm text-slate-400 mb-1">Today</div>
          <div className="text-3xl font-bold text-purple-400">{data.stats.tasks_completed_today}</div>
          <div className="text-xs text-slate-500">tasks completed</div>
        </Card>
        <Card className="text-center">
          <div className="text-sm text-slate-400 mb-1">Bottlenecks</div>
          <div className="text-3xl font-bold text-orange-400">{data.stats.bottlenecks_count}</div>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <div className="flex flex-wrap gap-4">
          <div>
            <label className="block text-sm text-slate-400 mb-1">Project</label>
            <select
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              className="bg-slate-700 border border-slate-600 text-slate-200 rounded px-3 py-2 text-sm"
            >
              <option value="all">All Projects</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-1">Agent Type</label>
            <select
              value={selectedAgentType}
              onChange={(e) => setSelectedAgentType(e.target.value)}
              className="bg-slate-700 border border-slate-600 text-slate-200 rounded px-3 py-2 text-sm"
            >
              <option value="all">All Types</option>
              {agentTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-1">Status</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="bg-slate-700 border border-slate-600 text-slate-200 rounded px-3 py-2 text-sm"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="idle">Idle</option>
              <option value="stuck">Stuck</option>
              <option value="offline">Offline</option>
            </select>
          </div>

          <div className="flex items-end">
            <div className="text-sm text-slate-400">
              Showing {filteredAgents.length} of {data.agents.length} agents
            </div>
          </div>
        </div>
      </Card>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Distribution */}
        <Card>
          <h3 className="text-lg font-semibold text-slate-50 mb-4">Status Distribution</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={statusData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => `${name}: ${value}`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {statusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        {/* Health Scores */}
        <Card>
          <h3 className="text-lg font-semibold text-slate-50 mb-4">Agent Health Scores</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={healthData.slice(0, 6)}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="name" stroke="#94a3b8" tick={{ fontSize: 12 }} />
              <YAxis stroke="#94a3b8" />
              <Tooltip
                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569' }}
              />
              <Bar dataKey="health" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Task Performance */}
        <Card className="lg:col-span-2">
          <h3 className="text-lg font-semibold text-slate-50 mb-4">Task Completion Performance</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={performanceData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="name" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <Tooltip
                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569' }}
              />
              <Legend />
              <Bar dataKey="Today" fill="#8b5cf6" />
              <Bar dataKey="This Week" fill="#06b6d4" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Agent Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredAgents.map(agent => (
          <Card
            key={agent.agent_id}
            className="relative overflow-hidden hover:shadow-lg transition"
          >
            {/* Bottleneck indicator */}
            {agent.is_bottleneck && (
              <div className="absolute top-0 right-0 bg-orange-600 text-white px-2 py-1 text-xs font-bold rounded-bl">
                BOTTLENECK
              </div>
            )}

            {/* Agent Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-slate-50">{agent.agent_name}</h3>
                <p className="text-sm text-slate-400">{agent.project_name}</p>
              </div>
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${getStatusColor(agent.status)}`} />
                <span className="text-sm text-slate-300 capitalize">{agent.status}</span>
              </div>
            </div>

            {/* Health Score */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-slate-400">Health Score</span>
                <span className={`text-xl font-bold ${getHealthColor(agent.health_score)}`}>
                  {agent.health_score}
                </span>
              </div>
              <div className="w-full bg-slate-700 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${
                    agent.health_score >= 80 ? 'bg-green-500' :
                    agent.health_score >= 60 ? 'bg-yellow-500' :
                    agent.health_score >= 40 ? 'bg-orange-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${agent.health_score}%` }}
                />
              </div>
            </div>

            {/* Current Task */}
            <div className="mb-4">
              <div className="flex items-start gap-2">
                <Activity className="w-4 h-4 text-blue-400 mt-1 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-slate-400 mb-1">Current Task</div>
                  <div className="text-sm text-slate-200 truncate">
                    {agent.current_task || 'No active task'}
                  </div>
                </div>
              </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <div className="text-xs text-slate-400">Today</div>
                <div className="text-lg font-bold text-slate-100">
                  {agent.tasks_completed_today}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-400">This Week</div>
                <div className="text-lg font-bold text-slate-100">
                  {agent.tasks_completed_week}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-400">Success Rate</div>
                <div className="text-lg font-bold text-green-400">
                  {(agent.success_rate * 100).toFixed(0)}%
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-400">Error Rate</div>
                <div className="text-lg font-bold text-red-400">
                  {(agent.error_rate * 100).toFixed(0)}%
                </div>
              </div>
            </div>

            {/* Additional Info */}
            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-2 text-slate-400">
                <Clock className="w-3 h-3" />
                <span>Avg task time: {formatTaskTime(agent.average_task_time)}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-400">
                <CheckCircle className="w-3 h-3" />
                <span>Uptime: {agent.uptime_percentage.toFixed(0)}%</span>
              </div>
              {agent.tasks_in_queue > 0 && (
                <div className="flex items-center gap-2 text-yellow-400">
                  <AlertTriangle className="w-3 h-3" />
                  <span>{agent.tasks_in_queue} tasks in queue</span>
                </div>
              )}
            </div>

            {/* Health Issues */}
            {agent.health_issues.length > 0 && (
              <div className="mt-4 pt-4 border-t border-slate-700">
                <div className="text-xs font-semibold text-red-400 mb-2">Issues:</div>
                <ul className="space-y-1">
                  {agent.health_issues.map((issue, idx) => (
                    <li key={idx} className="text-xs text-red-300 flex items-start gap-1">
                      <span>•</span>
                      <span>{issue}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Last Activity */}
            <div className="mt-4 pt-4 border-t border-slate-700">
              <div className="text-xs text-slate-500">
                Last activity: {new Date(agent.last_activity).toLocaleString()}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {filteredAgents.length === 0 && (
        <Card className="text-center py-12">
          <div className="text-5xl mb-4">🔍</div>
          <p className="text-slate-400">No agents match the selected filters</p>
          <Button
            variant="ghost"
            onClick={() => {
              setSelectedProject('all');
              setSelectedStatus('all');
              setSelectedAgentType('all');
            }}
            className="mt-4"
          >
            Clear Filters
          </Button>
        </Card>
      )}

      {/* Spawn Agent Modal */}
      <SpawnAgentModal
        isOpen={isSpawnModalOpen}
        onClose={() => setIsSpawnModalOpen(false)}
        onSuccess={handleSpawnSuccess}
      />
    </div>
  );
}
