'use client';

import { useState } from 'react';
import { Agent, MaestroTask } from '@/lib/types';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';

interface AgentsTabProps {
  agents: Agent[];
  tasks: MaestroTask[];
  onReassignAgent: (agentId: string, newTasks: string[]) => void;
}

export function AgentsTab({ agents, tasks, onReassignAgent }: AgentsTabProps) {
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);

  // Calculate agent metrics
  const getAgentMetrics = (agent: Agent) => {
    const agentTasks = tasks.filter((t) => t.assigned_to_agent === agent.agent_id);
    const completedTasks = agentTasks.filter((t) => t.status === 'done');
    const activeTasks = agentTasks.filter((t) => t.status === 'in-progress');
    const todoTasks = agentTasks.filter((t) => t.status === 'todo');
    const blockedTasks = agentTasks.filter((t) => t.status === 'blocked');

    // Calculate success rate
    const successRate = agent.success_rate ??
      (agentTasks.length > 0 ? (completedTasks.length / agentTasks.length) * 100 : 0);

    // Calculate average completion time (mock if not available)
    const avgTime = agent.average_task_time ?? 0;

    // Health score
    const healthScore = agent.health_score ?? 100;

    return {
      total: agentTasks.length,
      completed: completedTasks.length,
      active: activeTasks.length,
      todo: todoTasks.length,
      blocked: blockedTasks.length,
      successRate,
      avgTime,
      healthScore,
    };
  };

  const formatTime = (ms: number) => {
    if (ms === 0) return 'N/A';
    const hours = Math.floor(ms / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-900 text-green-200';
      case 'idle':
        return 'bg-yellow-900 text-yellow-200';
      case 'offline':
        return 'bg-red-900 text-red-200';
      default:
        return 'bg-slate-700 text-slate-300';
    }
  };

  const getHealthColor = (score: number) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-400">{agents.length}</div>
            <div className="text-sm text-slate-400 mt-1">Total Agents</div>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <div className="text-3xl font-bold text-green-400">
              {agents.filter((a) => a.status === 'active').length}
            </div>
            <div className="text-sm text-slate-400 mt-1">Active</div>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <div className="text-3xl font-bold text-yellow-400">
              {agents.filter((a) => a.status === 'idle').length}
            </div>
            <div className="text-sm text-slate-400 mt-1">Idle</div>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <div className="text-3xl font-bold text-purple-400">
              {agents.reduce((sum, a) => sum + a.tasks_completed, 0)}
            </div>
            <div className="text-sm text-slate-400 mt-1">Total Completed</div>
          </div>
        </Card>
      </div>

      {/* Agents List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {agents.map((agent) => {
          const metrics = getAgentMetrics(agent);

          return (
            <Card
              key={agent.agent_id}
              className="cursor-pointer hover:border-blue-500 transition"
              onClick={() => setSelectedAgent(agent)}
            >
              <div className="space-y-4">
                {/* Agent Header */}
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-slate-50">{agent.agent_name}</h3>
                    {agent.agent_type && (
                      <p className="text-sm text-slate-400 mt-1">{agent.agent_type}</p>
                    )}
                  </div>
                  <span className={`px-2 py-1 rounded text-xs ${getStatusColor(agent.status)}`}>
                    {agent.status}
                  </span>
                </div>

                {/* Health Score */}
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-400">Health Score</span>
                    <span className={`font-bold ${getHealthColor(metrics.healthScore)}`}>
                      {metrics.healthScore}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-700 rounded-full h-2">
                    <div
                      className={`h-full rounded-full transition-all ${
                        metrics.healthScore >= 80
                          ? 'bg-green-500'
                          : metrics.healthScore >= 60
                          ? 'bg-yellow-500'
                          : 'bg-red-500'
                      }`}
                      style={{ width: `${metrics.healthScore}%` }}
                    />
                  </div>
                </div>

                {/* Task Breakdown */}
                <div className="grid grid-cols-4 gap-2 text-center">
                  <div>
                    <div className="text-lg font-bold text-green-400">{metrics.completed}</div>
                    <div className="text-xs text-slate-400">Done</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-yellow-400">{metrics.active}</div>
                    <div className="text-xs text-slate-400">Active</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-slate-400">{metrics.todo}</div>
                    <div className="text-xs text-slate-400">Todo</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-red-400">{metrics.blocked}</div>
                    <div className="text-xs text-slate-400">Blocked</div>
                  </div>
                </div>

                {/* Performance Metrics */}
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-700">
                  <div>
                    <div className="text-xs text-slate-400 mb-1">Success Rate</div>
                    <div className="text-sm font-bold text-slate-50">
                      {metrics.successRate.toFixed(1)}%
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-400 mb-1">Avg. Time</div>
                    <div className="text-sm font-bold text-slate-50">
                      {formatTime(metrics.avgTime)}
                    </div>
                  </div>
                </div>

                {/* Capabilities */}
                {agent.capabilities && agent.capabilities.length > 0 && (
                  <div>
                    <div className="text-xs text-slate-400 mb-2">Capabilities</div>
                    <div className="flex flex-wrap gap-1">
                      {agent.capabilities.map((cap) => (
                        <span
                          key={cap}
                          className="px-2 py-1 bg-slate-700 text-slate-300 rounded text-xs"
                        >
                          {cap}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Current Task */}
                {agent.current_task_id && (
                  <div className="text-xs text-slate-400">
                    Currently working on: <span className="text-blue-400">{agent.current_task_id}</span>
                  </div>
                )}

                {/* Last Poll */}
                {agent.last_poll_date && (
                  <div className="text-xs text-slate-400">
                    Last active: {new Date(agent.last_poll_date).toLocaleString()}
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {agents.length === 0 && (
        <Card>
          <div className="text-center py-12">
            <p className="text-slate-400 mb-4">No agents assigned to this project</p>
            <Button variant="primary">Spawn New Agent</Button>
          </div>
        </Card>
      )}

      {/* Agent Detail Modal (simplified version) */}
      {selectedAgent && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedAgent(null)}
        >
          <div
            className="bg-slate-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-slate-50">{selectedAgent.agent_name}</h2>
                  {selectedAgent.agent_type && (
                    <p className="text-slate-400 mt-1">{selectedAgent.agent_type}</p>
                  )}
                </div>
                <button
                  onClick={() => setSelectedAgent(null)}
                  className="text-slate-400 hover:text-slate-300 text-2xl"
                >
                  ×
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-50 mb-2">Assigned Tasks</h3>
                  <div className="space-y-2">
                    {tasks
                      .filter((t) => t.assigned_to_agent === selectedAgent.agent_id)
                      .map((task) => (
                        <div
                          key={task.task_id}
                          className="bg-slate-700 rounded p-3 flex justify-between items-center"
                        >
                          <div>
                            <div className="text-slate-50 font-medium">{task.title}</div>
                            <div className="text-xs text-slate-400">{task.status}</div>
                          </div>
                          <span
                            className={`px-2 py-1 rounded text-xs ${
                              task.priority === 1 || task.priority === 2
                                ? 'bg-red-900 text-red-200'
                                : task.priority === 3
                                ? 'bg-yellow-900 text-yellow-200'
                                : 'bg-green-900 text-green-200'
                            }`}
                          >
                            P{task.priority}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="primary"
                    onClick={() => {
                      const taskIds = prompt('Enter task IDs to reassign (comma-separated):');
                      if (taskIds) {
                        onReassignAgent(
                          selectedAgent.agent_id,
                          taskIds.split(',').map((id) => id.trim())
                        );
                        setSelectedAgent(null);
                      }
                    }}
                  >
                    Reassign Tasks
                  </Button>
                  <Button variant="secondary" onClick={() => setSelectedAgent(null)}>
                    Close
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
