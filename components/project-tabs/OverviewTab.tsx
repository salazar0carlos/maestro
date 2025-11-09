'use client';

import { Project, MaestroTask, Agent } from '@/lib/types';
import { Card } from '@/components/Card';

interface OverviewTabProps {
  project: Project;
  tasks: MaestroTask[];
  agents: Agent[];
}

export function OverviewTab({ project, tasks, agents }: OverviewTabProps) {
  // Calculate metrics
  const completedTasks = tasks.filter((t) => t.status === 'done').length;
  const inProgressTasks = tasks.filter((t) => t.status === 'in-progress').length;
  const todoTasks = tasks.filter((t) => t.status === 'todo').length;
  const blockedTasks = tasks.filter((t) => t.status === 'blocked').length;
  const completionRate = tasks.length > 0 ? (completedTasks / tasks.length) * 100 : 0;

  // Extract tech stack from project description or use defaults
  const techStack = ['React', 'Next.js', 'TypeScript', 'Tailwind CSS'];

  // Recent changes (last 5 completed tasks)
  const recentChanges = tasks
    .filter((t) => t.completed_date)
    .sort((a, b) => new Date(b.completed_date!).getTime() - new Date(a.completed_date!).getTime())
    .slice(0, 5);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="space-y-6">
      {/* Project Info Section */}
      <Card>
        <h2 className="text-xl font-bold text-slate-50 mb-4">Project Information</h2>

        <div className="space-y-4">
          <div>
            <label className="text-sm text-slate-400 block mb-1">Description</label>
            <p className="text-slate-50">{project.description}</p>
          </div>

          {project.github_repo && (
            <div>
              <label className="text-sm text-slate-400 block mb-1">Repository</label>
              <a
                href={project.github_repo}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 transition flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                </svg>
                {project.github_repo}
              </a>
            </div>
          )}

          {project.local_path && (
            <div>
              <label className="text-sm text-slate-400 block mb-1">Local Path</label>
              <p className="text-slate-300 font-mono text-sm">{project.local_path}</p>
            </div>
          )}

          <div>
            <label className="text-sm text-slate-400 block mb-2">Tech Stack</label>
            <div className="flex flex-wrap gap-2">
              {techStack.map((tech) => (
                <span
                  key={tech}
                  className="px-3 py-1 bg-slate-700 text-slate-200 rounded-full text-sm"
                >
                  {tech}
                </span>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm text-slate-400 block mb-1">Created</label>
            <p className="text-slate-300">{new Date(project.created_date).toLocaleDateString()}</p>
          </div>

          <div>
            <label className="text-sm text-slate-400 block mb-1">Status</label>
            <span
              className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                project.status === 'active'
                  ? 'bg-green-900 text-green-200'
                  : project.status === 'paused'
                  ? 'bg-yellow-900 text-yellow-200'
                  : 'bg-blue-900 text-blue-200'
              }`}
            >
              {project.status.charAt(0).toUpperCase() + project.status.slice(1)}
            </span>
          </div>
        </div>
      </Card>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-400">{tasks.length}</div>
            <div className="text-sm text-slate-400 mt-1">Total Tasks</div>
          </div>
        </Card>

        <Card>
          <div className="text-center">
            <div className="text-3xl font-bold text-green-400">{completedTasks}</div>
            <div className="text-sm text-slate-400 mt-1">Completed</div>
          </div>
        </Card>

        <Card>
          <div className="text-center">
            <div className="text-3xl font-bold text-yellow-400">{inProgressTasks}</div>
            <div className="text-sm text-slate-400 mt-1">In Progress</div>
          </div>
        </Card>

        <Card>
          <div className="text-center">
            <div className="text-3xl font-bold text-purple-400">{agents.length}</div>
            <div className="text-sm text-slate-400 mt-1">Active Agents</div>
          </div>
        </Card>
      </div>

      {/* Progress Bar */}
      <Card>
        <h2 className="text-lg font-bold text-slate-50 mb-4">Overall Progress</h2>
        <div className="space-y-3">
          <div className="flex justify-between text-sm text-slate-300">
            <span>Completion Rate</span>
            <span className="font-bold">{completionRate.toFixed(1)}%</span>
          </div>
          <div className="w-full bg-slate-700 rounded-full h-3 overflow-hidden">
            <div
              className="bg-gradient-to-r from-blue-500 to-green-500 h-full transition-all duration-500"
              style={{ width: `${completionRate}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-slate-400">
            <span>Todo: {todoTasks}</span>
            <span>In Progress: {inProgressTasks}</span>
            <span>Done: {completedTasks}</span>
            {blockedTasks > 0 && <span className="text-red-400">Blocked: {blockedTasks}</span>}
          </div>
        </div>
      </Card>

      {/* Recent Changes Timeline */}
      <Card>
        <h2 className="text-lg font-bold text-slate-50 mb-4">Recent Changes</h2>
        {recentChanges.length > 0 ? (
          <div className="space-y-3">
            {recentChanges.map((task) => (
              <div
                key={task.task_id}
                className="flex items-start gap-3 pb-3 border-b border-slate-700 last:border-b-0 last:pb-0"
              >
                <div className="w-2 h-2 rounded-full bg-green-400 mt-2 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-slate-50 font-medium truncate">{task.title}</div>
                  <div className="text-xs text-slate-400 mt-1">
                    Completed by {task.assigned_to_agent} • {formatDate(task.completed_date!)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-slate-400 text-sm text-center py-8">No completed tasks yet</p>
        )}
      </Card>
    </div>
  );
}
