'use client';

import { useEffect, useState } from 'react';
import {
  LineChart,
  Line,
  PieChart,
  Pie,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell
} from 'recharts';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';

type DateRange = 'today' | 'week' | 'month' | 'all';

interface AnalyticsMetrics {
  summary: {
    total_tasks: number;
    completed_tasks: number;
    in_progress_tasks: number;
    blocked_tasks: number;
    todo_tasks: number;
    total_cost: number;
    avg_cost_per_task: number;
    tasks_per_day: number;
    tasks_per_hour: number;
    success_rate: number;
  };
  agent_productivity: Array<{
    agent_id: string;
    agent_name: string;
    status: string;
    tasks_completed: number;
    tasks_in_progress: number;
    avg_completion_hours: number;
    total_cost: number;
    success_rate: number;
  }>;
  agent_utilization: {
    active: number;
    idle: number;
    offline: number;
  };
  task_trends: Array<{
    date: string;
    completed: number;
    created: number;
  }>;
  task_status_distribution: {
    todo: number;
    'in-progress': number;
    done: number;
    blocked: number;
  };
  cost_by_model: Array<{
    model: string;
    cost: number;
  }>;
  cost_by_agent: Array<{
    agent_id: string;
    cost: number;
    calls: number;
  }>;
  top_failure_reasons: Array<{
    reason: string;
    count: number;
  }>;
  date_range: {
    start: string;
    end: string;
    range: string;
  };
}

const COLORS = {
  primary: '#3b82f6',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  purple: '#8b5cf6',
  teal: '#14b8a6',
  pink: '#ec4899',
  indigo: '#6366f1'
};

export default function AnalyticsPage() {
  const [metrics, setMetrics] = useState<AnalyticsMetrics | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>('week');
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    fetchMetrics();
  }, [dateRange]);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/analytics/metrics?range=${dateRange}`);
      if (!response.ok) throw new Error('Failed to fetch metrics');
      const data = await response.json();
      setMetrics(data);
    } catch (error) {
      console.error('Error fetching metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = async () => {
    if (!metrics) return;

    setExporting(true);
    try {
      const rows = [
        ['Maestro Analytics Report'],
        [`Generated: ${new Date().toLocaleString()}`],
        [`Date Range: ${dateRange}`],
        [''],
        ['SUMMARY METRICS'],
        ['Metric', 'Value'],
        ['Total Tasks', metrics.summary.total_tasks],
        ['Completed Tasks', metrics.summary.completed_tasks],
        ['In Progress Tasks', metrics.summary.in_progress_tasks],
        ['Blocked Tasks', metrics.summary.blocked_tasks],
        ['Todo Tasks', metrics.summary.todo_tasks],
        ['Total Cost ($)', metrics.summary.total_cost],
        ['Avg Cost Per Task ($)', metrics.summary.avg_cost_per_task],
        ['Tasks Per Day', metrics.summary.tasks_per_day],
        ['Tasks Per Hour', metrics.summary.tasks_per_hour],
        ['Success Rate (%)', metrics.summary.success_rate],
        [''],
        ['AGENT PRODUCTIVITY'],
        ['Agent ID', 'Agent Name', 'Status', 'Tasks Completed', 'In Progress', 'Avg Completion (hrs)', 'Total Cost ($)', 'Success Rate (%)'],
        ...metrics.agent_productivity.map(a => [
          a.agent_id,
          a.agent_name,
          a.status,
          a.tasks_completed,
          a.tasks_in_progress,
          a.avg_completion_hours,
          a.total_cost,
          a.success_rate
        ]),
        [''],
        ['COST BY MODEL'],
        ['Model', 'Cost ($)'],
        ...metrics.cost_by_model.map(c => [c.model, c.cost]),
        [''],
        ['TOP FAILURE REASONS'],
        ['Reason', 'Count'],
        ...metrics.top_failure_reasons.map(f => [f.reason, f.count])
      ];

      const csv = rows.map(row => row.join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `maestro-analytics-${dateRange}-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting CSV:', error);
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-slate-50 text-center py-12">Loading analytics...</div>
        </div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="min-h-screen bg-slate-950 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-red-400 text-center py-12">Failed to load analytics</div>
        </div>
      </div>
    );
  }

  const utilizationData = [
    { name: 'Active', value: metrics.agent_utilization.active, color: COLORS.success },
    { name: 'Idle', value: metrics.agent_utilization.idle, color: COLORS.warning },
    { name: 'Offline', value: metrics.agent_utilization.offline, color: COLORS.danger }
  ];

  const statusDistributionData = [
    { name: 'Todo', value: metrics.task_status_distribution.todo, color: COLORS.primary },
    { name: 'In Progress', value: metrics.task_status_distribution['in-progress'], color: COLORS.warning },
    { name: 'Done', value: metrics.task_status_distribution.done, color: COLORS.success },
    { name: 'Blocked', value: metrics.task_status_distribution.blocked, color: COLORS.danger }
  ];

  return (
    <div className="min-h-screen bg-slate-950 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-50 mb-2">Analytics & Reporting</h1>
            <p className="text-slate-400">Agent performance and task metrics</p>
          </div>
          <div className="flex gap-4">
            {/* Date Range Filter */}
            <div className="flex gap-2 bg-slate-900 rounded-lg p-1">
              {(['today', 'week', 'month', 'all'] as DateRange[]).map((range) => (
                <button
                  key={range}
                  onClick={() => setDateRange(range)}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    dateRange === range
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {range.charAt(0).toUpperCase() + range.slice(1)}
                </button>
              ))}
            </div>
            <Button onClick={exportToCSV} disabled={exporting}>
              {exporting ? 'Exporting...' : 'Export CSV'}
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <div className="p-6">
              <div className="text-slate-400 text-sm mb-1">Total Tasks</div>
              <div className="text-3xl font-bold text-slate-50">{metrics.summary.total_tasks}</div>
              <div className="text-green-400 text-sm mt-2">
                {metrics.summary.completed_tasks} completed ({metrics.summary.success_rate}%)
              </div>
            </div>
          </Card>

          <Card>
            <div className="p-6">
              <div className="text-slate-400 text-sm mb-1">Tasks/Day</div>
              <div className="text-3xl font-bold text-slate-50">{metrics.summary.tasks_per_day}</div>
              <div className="text-slate-400 text-sm mt-2">
                {metrics.summary.tasks_per_hour} per hour
              </div>
            </div>
          </Card>

          <Card>
            <div className="p-6">
              <div className="text-slate-400 text-sm mb-1">Total Cost</div>
              <div className="text-3xl font-bold text-slate-50">${metrics.summary.total_cost}</div>
              <div className="text-slate-400 text-sm mt-2">
                ${metrics.summary.avg_cost_per_task} per task
              </div>
            </div>
          </Card>

          <Card>
            <div className="p-6">
              <div className="text-slate-400 text-sm mb-1">Success Rate</div>
              <div className="text-3xl font-bold text-slate-50">{metrics.summary.success_rate}%</div>
              <div className="text-red-400 text-sm mt-2">
                {metrics.summary.blocked_tasks} blocked
              </div>
            </div>
          </Card>
        </div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Tasks Over Time */}
          <Card>
            <div className="p-6">
              <h2 className="text-xl font-bold text-slate-50 mb-4">Tasks Over Time</h2>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={metrics.task_trends}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="date" stroke="#94a3b8" />
                  <YAxis stroke="#94a3b8" />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155' }}
                    labelStyle={{ color: '#e2e8f0' }}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="completed" stroke={COLORS.success} name="Completed" strokeWidth={2} />
                  <Line type="monotone" dataKey="created" stroke={COLORS.primary} name="Created" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Agent Utilization */}
          <Card>
            <div className="p-6">
              <h2 className="text-xl font-bold text-slate-50 mb-4">Agent Utilization</h2>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={utilizationData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {utilizationData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>

        {/* Charts Row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Task Status Distribution */}
          <Card>
            <div className="p-6">
              <h2 className="text-xl font-bold text-slate-50 mb-4">Task Status Distribution</h2>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={statusDistributionData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {statusDistributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Avg Completion Time by Agent */}
          <Card>
            <div className="p-6">
              <h2 className="text-xl font-bold text-slate-50 mb-4">Avg Completion Time (Hours)</h2>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={metrics.agent_productivity.slice(0, 5)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="agent_name" stroke="#94a3b8" />
                  <YAxis stroke="#94a3b8" />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155' }}
                    labelStyle={{ color: '#e2e8f0' }}
                  />
                  <Bar dataKey="avg_completion_hours" fill={COLORS.purple} name="Avg Hours" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>

        {/* Most Productive Agents */}
        <Card className="mb-6">
          <div className="p-6">
            <h2 className="text-xl font-bold text-slate-50 mb-4">Most Productive Agents</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-slate-700">
                  <tr className="text-left text-slate-400 text-sm">
                    <th className="pb-3 pr-4">Agent</th>
                    <th className="pb-3 pr-4">Status</th>
                    <th className="pb-3 pr-4 text-right">Completed</th>
                    <th className="pb-3 pr-4 text-right">In Progress</th>
                    <th className="pb-3 pr-4 text-right">Avg Time (hrs)</th>
                    <th className="pb-3 pr-4 text-right">Success Rate</th>
                    <th className="pb-3 text-right">Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.agent_productivity.slice(0, 10).map((agent) => (
                    <tr key={agent.agent_id} className="border-b border-slate-800 hover:bg-slate-900/50">
                      <td className="py-3 pr-4 text-slate-50">{agent.agent_name}</td>
                      <td className="py-3 pr-4">
                        <span
                          className={`px-2 py-1 rounded text-xs ${
                            agent.status === 'active'
                              ? 'bg-green-900/30 text-green-400'
                              : agent.status === 'idle'
                              ? 'bg-yellow-900/30 text-yellow-400'
                              : 'bg-slate-700 text-slate-400'
                          }`}
                        >
                          {agent.status}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-right text-slate-50">{agent.tasks_completed}</td>
                      <td className="py-3 pr-4 text-right text-slate-50">{agent.tasks_in_progress}</td>
                      <td className="py-3 pr-4 text-right text-slate-50">{agent.avg_completion_hours}</td>
                      <td className="py-3 pr-4 text-right text-slate-50">{agent.success_rate}%</td>
                      <td className="py-3 text-right text-slate-50">${agent.total_cost}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Card>

        {/* Failure Analysis */}
        {metrics.top_failure_reasons.length > 0 && (
          <Card>
            <div className="p-6">
              <h2 className="text-xl font-bold text-slate-50 mb-4">Top Failure Reasons</h2>
              <div className="space-y-3">
                {metrics.top_failure_reasons.map((failure, index) => (
                  <div key={index} className="flex justify-between items-center">
                    <span className="text-slate-50">{failure.reason}</span>
                    <span className="px-3 py-1 bg-red-900/30 text-red-400 rounded-full text-sm">
                      {failure.count} tasks
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
