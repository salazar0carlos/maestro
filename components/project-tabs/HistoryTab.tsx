'use client';

import { useMemo } from 'react';
import { MaestroTask, Agent } from '@/lib/types';
import { Card } from '@/components/Card';

interface HistoryTabProps {
  tasks: MaestroTask[];
  agents: Agent[];
}

interface TimelineEvent {
  id: string;
  type: 'task_created' | 'task_started' | 'task_completed' | 'task_blocked' | 'agent_joined';
  timestamp: string;
  title: string;
  description: string;
  actor?: string;
  metadata?: any;
}

export function HistoryTab({ tasks, agents }: HistoryTabProps) {
  // Generate timeline events from tasks and agents
  const timelineEvents = useMemo(() => {
    const events: TimelineEvent[] = [];

    // Add task events
    tasks.forEach((task) => {
      // Task created
      events.push({
        id: `task_created_${task.task_id}`,
        type: 'task_created',
        timestamp: task.created_date,
        title: `Task created: ${task.title}`,
        description: task.description,
        actor: 'System',
        metadata: { priority: task.priority },
      });

      // Task started
      if (task.started_date) {
        events.push({
          id: `task_started_${task.task_id}`,
          type: 'task_started',
          timestamp: task.started_date,
          title: `Task started: ${task.title}`,
          description: `Started by ${task.assigned_to_agent}`,
          actor: task.assigned_to_agent,
        });
      }

      // Task completed
      if (task.completed_date) {
        events.push({
          id: `task_completed_${task.task_id}`,
          type: 'task_completed',
          timestamp: task.completed_date,
          title: `Task completed: ${task.title}`,
          description: `Completed by ${task.assigned_to_agent}`,
          actor: task.assigned_to_agent,
        });
      }

      // Task blocked
      if (task.status === 'blocked' && task.blocked_reason) {
        events.push({
          id: `task_blocked_${task.task_id}`,
          type: 'task_blocked',
          timestamp: task.created_date, // Use created date as fallback
          title: `Task blocked: ${task.title}`,
          description: task.blocked_reason,
          actor: task.assigned_to_agent,
        });
      }
    });

    // Add agent events
    agents.forEach((agent) => {
      if (agent.created_at) {
        events.push({
          id: `agent_joined_${agent.agent_id}`,
          type: 'agent_joined',
          timestamp: agent.created_at,
          title: `Agent joined: ${agent.agent_name}`,
          description: agent.agent_type || 'General purpose agent',
          actor: 'System',
        });
      }
    });

    // Sort by timestamp (most recent first)
    return events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [tasks, agents]);

  const getEventIcon = (type: TimelineEvent['type']) => {
    switch (type) {
      case 'task_created':
        return '📝';
      case 'task_started':
        return '▶️';
      case 'task_completed':
        return '✅';
      case 'task_blocked':
        return '🚫';
      case 'agent_joined':
        return '🤖';
      default:
        return '📌';
    }
  };

  const getEventColor = (type: TimelineEvent['type']) => {
    switch (type) {
      case 'task_created':
        return 'bg-blue-500';
      case 'task_started':
        return 'bg-yellow-500';
      case 'task_completed':
        return 'bg-green-500';
      case 'task_blocked':
        return 'bg-red-500';
      case 'agent_joined':
        return 'bg-purple-500';
      default:
        return 'bg-slate-500';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    let relative = '';
    if (diffMins < 1) relative = 'just now';
    else if (diffMins < 60) relative = `${diffMins}m ago`;
    else if (diffHours < 24) relative = `${diffHours}h ago`;
    else if (diffDays < 7) relative = `${diffDays}d ago`;
    else relative = date.toLocaleDateString();

    return {
      relative,
      absolute: date.toLocaleString(),
    };
  };

  // Group events by date
  const groupedEvents = useMemo(() => {
    const groups: { [key: string]: TimelineEvent[] } = {};

    timelineEvents.forEach((event) => {
      const date = new Date(event.timestamp).toLocaleDateString();
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(event);
    });

    return groups;
  }, [timelineEvents]);

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-400">
              {timelineEvents.filter((e) => e.type === 'task_created').length}
            </div>
            <div className="text-xs text-slate-400 mt-1">Created</div>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-400">
              {timelineEvents.filter((e) => e.type === 'task_started').length}
            </div>
            <div className="text-xs text-slate-400 mt-1">Started</div>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-400">
              {timelineEvents.filter((e) => e.type === 'task_completed').length}
            </div>
            <div className="text-xs text-slate-400 mt-1">Completed</div>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-400">
              {timelineEvents.filter((e) => e.type === 'task_blocked').length}
            </div>
            <div className="text-xs text-slate-400 mt-1">Blocked</div>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-400">
              {timelineEvents.filter((e) => e.type === 'agent_joined').length}
            </div>
            <div className="text-xs text-slate-400 mt-1">Agents</div>
          </div>
        </Card>
      </div>

      {/* Timeline */}
      <Card>
        <h2 className="text-xl font-bold text-slate-50 mb-6">Project Timeline</h2>

        {Object.keys(groupedEvents).length > 0 ? (
          <div className="space-y-8">
            {Object.entries(groupedEvents).map(([date, events]) => (
              <div key={date}>
                <div className="text-sm font-bold text-slate-400 mb-4 sticky top-0 bg-slate-800 py-2 z-10">
                  {date}
                </div>
                <div className="space-y-4">
                  {events.map((event) => {
                    const { relative, absolute } = formatDate(event.timestamp);

                    return (
                      <div key={event.id} className="flex gap-4">
                        {/* Timeline indicator */}
                        <div className="flex flex-col items-center">
                          <div
                            className={`w-3 h-3 rounded-full ${getEventColor(
                              event.type
                            )} flex-shrink-0`}
                          />
                          <div className="w-0.5 bg-slate-700 flex-1 mt-2" />
                        </div>

                        {/* Event content */}
                        <div className="flex-1 pb-6">
                          <div className="bg-slate-700 rounded-lg p-4 hover:bg-slate-600 transition">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <span className="text-lg">{getEventIcon(event.type)}</span>
                                <h3 className="font-medium text-slate-50">{event.title}</h3>
                              </div>
                              <span
                                className="text-xs text-slate-400 ml-2 flex-shrink-0"
                                title={absolute}
                              >
                                {relative}
                              </span>
                            </div>

                            <p className="text-sm text-slate-400 mb-2">{event.description}</p>

                            {event.actor && (
                              <div className="flex items-center gap-2 text-xs text-slate-500">
                                <span>by {event.actor}</span>
                              </div>
                            )}

                            {event.metadata && event.metadata.priority && (
                              <div className="mt-2">
                                <span
                                  className={`inline-block px-2 py-1 rounded text-xs ${
                                    event.metadata.priority === 1 ||
                                    event.metadata.priority === 2
                                      ? 'bg-red-900 text-red-200'
                                      : event.metadata.priority === 3
                                      ? 'bg-yellow-900 text-yellow-200'
                                      : 'bg-green-900 text-green-200'
                                  }`}
                                >
                                  P{event.metadata.priority}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-slate-400">No history available yet</p>
          </div>
        )}
      </Card>
    </div>
  );
}
