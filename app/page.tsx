'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Modal } from '@/components/Modal';
import { createProject } from '@/lib/storage-adapter';
import { Project } from '@/lib/types';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  TrendingUp,
  Activity,
  AlertCircle,
  CheckCircle,
  Clock,
  Zap,
  Plus,
  BarChart3,
  ListTodo,
  Sparkles,
  Shield,
  ArrowRight,
} from 'lucide-react';

interface DashboardData {
  summary: {
    active_projects: number;
    total_projects: number;
    tasks_in_progress: number;
    total_tasks: number;
    active_agents: number;
    total_agents: number;
    overall_health_score: number;
    completion_rate: number;
  };
  project_health: Array<{
    project_id: string;
    name: string;
    status: string;
    health_score: number;
    health_status: 'healthy' | 'warning' | 'critical';
    tasks_total: number;
    tasks_completed: number;
    tasks_in_progress: number;
    tasks_blocked: number;
    active_agents: number;
    completion_rate: number;
  }>;
  recent_activity: Array<{
    id: string;
    type: 'task' | 'agent' | 'project' | 'improvement';
    title: string;
    description: string;
    timestamp: string;
    status?: string;
  }>;
  weekly_tasks: Array<{
    date: string;
    completed: number;
    created: number;
  }>;
  agent_productivity: Array<{
    agent_name: string;
    tasks_completed: number;
    success_rate: number;
  }>;
  top_improvements: Array<{
    title: string;
    estimated_impact: string;
    priority: number;
    status: string;
  }>;
  system_health: {
    status: 'healthy' | 'warning' | 'critical';
    message: string;
    critical_issues: number;
  };
}

export default function Dashboard() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isNewProjectOpen, setIsNewProjectOpen] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [projectDescription, setProjectDescription] = useState('');

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const response = await fetch('/api/dashboard');
      const dashboardData = await response.json();
      setData(dashboardData);
    } catch (error) {
      console.error('Failed to fetch dashboard:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!projectName.trim()) {
      alert('Project name is required');
      return;
    }

    const newProject: Project = {
      project_id: `project-${Date.now()}`,
      name: projectName,
      description: projectDescription,
      status: 'active',
      created_date: new Date().toISOString(),
      agent_count: 0,
      task_count: 0,
    };

    await createProject(newProject);
    setProjectName('');
    setProjectDescription('');
    setIsNewProjectOpen(false);

    // Redirect to projects page to see the new project
    router.push('/projects');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="text-3xl mb-4">⏳</div>
          <p className="text-slate-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="text-3xl mb-4">⚠️</div>
          <p className="text-slate-400">Failed to load dashboard</p>
        </div>
      </div>
    );
  }

  const getHealthColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'text-green-400 bg-green-900/20 border-green-500';
      case 'warning':
        return 'text-yellow-400 bg-yellow-900/20 border-yellow-500';
      case 'critical':
        return 'text-red-400 bg-red-900/20 border-red-500';
      default:
        return 'text-slate-400 bg-slate-800/20 border-slate-600';
    }
  };

  const getHealthIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="w-5 h-5" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5" />;
      case 'critical':
        return <AlertCircle className="w-5 h-5" />;
      default:
        return <Activity className="w-5 h-5" />;
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'task':
        return '✓';
      case 'project':
        return '📁';
      case 'agent':
        return '🤖';
      case 'improvement':
        return '💡';
      default:
        return '•';
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-slate-50 mb-2">Dashboard</h1>
          <p className="text-slate-400">
            Welcome back! Here&apos;s what&apos;s happening with your projects.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${getHealthColor(data.system_health.status)}`}>
            {getHealthIcon(data.system_health.status)}
            <span className="text-sm font-medium">
              System {data.system_health.status}
            </span>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-blue-900/20 rounded-lg">
              <BarChart3 className="w-6 h-6 text-blue-400" />
            </div>
            <TrendingUp className="w-4 h-4 text-green-400" />
          </div>
          <div className="space-y-1">
            <p className="text-sm text-slate-400">Active Projects</p>
            <p className="text-3xl font-bold text-slate-50">
              {data.summary.active_projects}
            </p>
            <p className="text-xs text-slate-500">
              {data.summary.total_projects} total
            </p>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-purple-900/20 rounded-lg">
              <Clock className="w-6 h-6 text-purple-400" />
            </div>
            <Activity className="w-4 h-4 text-purple-400" />
          </div>
          <div className="space-y-1">
            <p className="text-sm text-slate-400">Tasks in Progress</p>
            <p className="text-3xl font-bold text-slate-50">
              {data.summary.tasks_in_progress}
            </p>
            <p className="text-xs text-slate-500">
              {data.summary.total_tasks} total
            </p>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-green-900/20 rounded-lg">
              <Zap className="w-6 h-6 text-green-400" />
            </div>
            <Activity className="w-4 h-4 text-green-400" />
          </div>
          <div className="space-y-1">
            <p className="text-sm text-slate-400">Active Agents</p>
            <p className="text-3xl font-bold text-slate-50">
              {data.summary.active_agents}
            </p>
            <p className="text-xs text-slate-500">
              {data.summary.total_agents} total
            </p>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-amber-900/20 rounded-lg">
              <CheckCircle className="w-6 h-6 text-amber-400" />
            </div>
            <TrendingUp className="w-4 h-4 text-green-400" />
          </div>
          <div className="space-y-1">
            <p className="text-sm text-slate-400">Completion Rate</p>
            <p className="text-3xl font-bold text-slate-50">
              {data.summary.completion_rate}%
            </p>
            <p className="text-xs text-slate-500">
              Health: {data.summary.overall_health_score}/100
            </p>
          </div>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="p-6">
        <h2 className="text-xl font-bold text-slate-50 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Button
            onClick={() => setIsNewProjectOpen(true)}
            variant="primary"
            className="flex items-center justify-center gap-2 h-16 text-base"
          >
            <Plus className="w-5 h-5" />
            Create Project
          </Button>
          <Link href="/improvements">
            <Button
              variant="secondary"
              className="flex items-center justify-center gap-2 h-16 text-base w-full"
            >
              <Sparkles className="w-5 h-5" />
              Generate Improvements
            </Button>
          </Link>
          <Link href="/analytics">
            <Button
              variant="secondary"
              className="flex items-center justify-center gap-2 h-16 text-base w-full"
            >
              <ListTodo className="w-5 h-5" />
              View All Analytics
            </Button>
          </Link>
        </div>
      </Card>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Project Health & Charts */}
        <div className="lg:col-span-2 space-y-8">
          {/* Project Health Overview */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-slate-50">Project Health</h2>
              <Link href="/analytics">
                <Button variant="ghost" className="text-sm">
                  View All <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {data.project_health.slice(0, 4).map(project => (
                <Link key={project.project_id} href={`/projects/${project.project_id}`}>
                  <Card hover className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-slate-50 mb-1">
                          {project.name}
                        </h3>
                        <div className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium border ${getHealthColor(project.health_status)}`}>
                          {getHealthIcon(project.health_status)}
                          <span>{project.health_status}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-slate-50">
                          {project.health_score}
                        </div>
                        <div className="text-xs text-slate-400">health</div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-400">Progress</span>
                        <span className="text-slate-50 font-medium">
                          {project.completion_rate}%
                        </span>
                      </div>
                      <div className="w-full bg-slate-700 rounded-full h-2">
                        <div
                          className="bg-blue-500 h-2 rounded-full transition-all"
                          style={{ width: `${project.completion_rate}%` }}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-slate-700">
                      <div>
                        <div className="text-xs text-slate-400">Tasks</div>
                        <div className="text-sm font-bold text-slate-50">
                          {project.tasks_completed}/{project.tasks_total}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-slate-400">Active</div>
                        <div className="text-sm font-bold text-blue-400">
                          {project.tasks_in_progress}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-slate-400">Agents</div>
                        <div className="text-sm font-bold text-green-400">
                          {project.active_agents}
                        </div>
                      </div>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          </div>

          {/* Analytics Snapshot - Tasks Chart */}
          <Card className="p-6">
            <h2 className="text-xl font-bold text-slate-50 mb-6">
              Tasks This Week
            </h2>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={data.weekly_tasks}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis
                  dataKey="date"
                  stroke="#94a3b8"
                  fontSize={12}
                />
                <YAxis stroke="#94a3b8" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="completed"
                  stroke="#10b981"
                  strokeWidth={2}
                  name="Completed"
                />
                <Line
                  type="monotone"
                  dataKey="created"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  name="Created"
                />
              </LineChart>
            </ResponsiveContainer>
          </Card>

          {/* Agent Productivity Chart */}
          <Card className="p-6">
            <h2 className="text-xl font-bold text-slate-50 mb-6">
              Agent Productivity
            </h2>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={data.agent_productivity}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis
                  dataKey="agent_name"
                  stroke="#94a3b8"
                  fontSize={12}
                />
                <YAxis stroke="#94a3b8" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                  }}
                />
                <Legend />
                <Bar
                  dataKey="tasks_completed"
                  fill="#3b82f6"
                  name="Tasks Completed"
                />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>

        {/* Right Column - Activity & System Status */}
        <div className="space-y-8">
          {/* System Status */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-slate-50">System Status</h2>
              <Link href="/health">
                <Button variant="ghost" className="text-sm">
                  Details <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </div>

            <div className={`p-4 rounded-lg border ${getHealthColor(data.system_health.status)} mb-4`}>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-current/10 rounded-lg">
                  {data.system_health.status === 'healthy' ? (
                    <Shield className="w-6 h-6" />
                  ) : (
                    <AlertCircle className="w-6 h-6" />
                  )}
                </div>
                <div>
                  <div className="font-bold capitalize">
                    {data.system_health.status}
                  </div>
                  <div className="text-sm opacity-80">
                    {data.system_health.message}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-slate-800/50 rounded-lg">
                <span className="text-sm text-slate-400">Critical Issues</span>
                <span className="text-lg font-bold text-slate-50">
                  {data.system_health.critical_issues}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-slate-800/50 rounded-lg">
                <span className="text-sm text-slate-400">Health Score</span>
                <span className="text-lg font-bold text-slate-50">
                  {data.summary.overall_health_score}/100
                </span>
              </div>
            </div>

            <Link href="/health">
              <Button variant="secondary" className="w-full mt-4">
                View Health Dashboard
              </Button>
            </Link>
          </Card>

          {/* Recent Activity */}
          <Card className="p-6">
            <h2 className="text-xl font-bold text-slate-50 mb-4">
              Recent Activity
            </h2>
            <div className="space-y-3">
              {data.recent_activity.slice(0, 8).map(activity => (
                <div
                  key={activity.id}
                  className="flex gap-3 p-3 rounded-lg bg-slate-800/50 hover:bg-slate-800 transition-colors"
                >
                  <div className="text-xl">{getActivityIcon(activity.type)}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-50 truncate">
                      {activity.title}
                    </p>
                    <p className="text-xs text-slate-400 truncate">
                      {activity.description}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      {new Date(activity.timestamp).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Top Improvements */}
          {data.top_improvements.length > 0 && (
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-slate-50">
                  Top Improvements
                </h2>
                <Link href="/improvements">
                  <Button variant="ghost" className="text-sm">
                    View All <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </Link>
              </div>
              <div className="space-y-3">
                {data.top_improvements.slice(0, 5).map((imp, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-lg bg-slate-800/50"
                  >
                    <div className="flex items-start justify-between mb-1">
                      <p className="text-sm font-medium text-slate-50 flex-1">
                        {imp.title}
                      </p>
                      <span className={`text-xs font-bold ml-2 ${
                        imp.estimated_impact === 'high' ? 'text-red-400' :
                        imp.estimated_impact === 'medium' ? 'text-amber-400' :
                        'text-green-400'
                      }`}>
                        {imp.estimated_impact}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs px-2 py-0.5 rounded bg-blue-900/30 text-blue-300">
                        Priority {imp.priority}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded bg-green-900/30 text-green-300">
                        {imp.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* New Project Modal */}
      <Modal
        isOpen={isNewProjectOpen}
        onClose={() => setIsNewProjectOpen(false)}
        title="Create New Project"
      >
        <form onSubmit={handleCreateProject} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Project Name *
            </label>
            <input
              type="text"
              value={projectName}
              onChange={e => setProjectName(e.target.value)}
              placeholder="e.g., HomesteadIQ"
              className="w-full rounded-md border border-slate-600 bg-slate-800 px-3 py-2 text-slate-50 placeholder-slate-500 focus:border-blue-500 focus:outline-none"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Description
            </label>
            <textarea
              value={projectDescription}
              onChange={e => setProjectDescription(e.target.value)}
              placeholder="What is this project building?"
              rows={3}
              className="w-full rounded-md border border-slate-600 bg-slate-800 px-3 py-2 text-slate-50 placeholder-slate-500 focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="ghost"
              onClick={() => setIsNewProjectOpen(false)}
            >
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Create Project
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
