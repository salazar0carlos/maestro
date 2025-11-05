'use client';

import { useState, useEffect } from 'react';
import { Agent, Project } from '@/lib/types';
import { getAgents, getProject, getTasks } from '@/lib/storage';
import { Card } from '@/components/Card';

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [projectMap, setProjectMap] = useState<Record<string, Project>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
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
    setIsLoading(false);
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

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-50 mb-2">Agent Monitor</h1>
        <p className="text-slate-400">
          {agents.length} agent{agents.length !== 1 ? 's' : ''} across all projects
        </p>
      </div>

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
