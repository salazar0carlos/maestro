'use client';

import { useState, useMemo } from 'react';
import { MaestroTask, TaskStatus, Agent } from '@/lib/types';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';

interface TasksTabProps {
  tasks: MaestroTask[];
  agents: Agent[];
  onTaskClick: (task: MaestroTask) => void;
  onTaskStatusChange: (taskId: string, status: TaskStatus) => void;
  onBulkAssign: (taskIds: string[], agentId: string) => void;
  onBulkArchive: (taskIds: string[]) => void;
}

const TASK_COLUMNS: TaskStatus[] = ['todo', 'in-progress', 'done'];

type ViewMode = 'kanban' | 'list';

export function TasksTab({
  tasks,
  agents,
  onTaskClick,
  onTaskStatusChange,
  onBulkAssign,
  onBulkArchive,
}: TasksTabProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('kanban');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [filterAgent, setFilterAgent] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());

  // Filter tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const matchesStatus = filterStatus === 'all' || task.status === filterStatus;
      const matchesPriority =
        filterPriority === 'all' || task.priority.toString() === filterPriority;
      const matchesAgent = filterAgent === 'all' || task.assigned_to_agent === filterAgent;
      const matchesSearch =
        searchQuery === '' ||
        task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.description.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesStatus && matchesPriority && matchesAgent && matchesSearch;
    });
  }, [tasks, filterStatus, filterPriority, filterAgent, searchQuery]);

  const toggleTaskSelection = (taskId: string) => {
    const newSelection = new Set(selectedTasks);
    if (newSelection.has(taskId)) {
      newSelection.delete(taskId);
    } else {
      newSelection.add(taskId);
    }
    setSelectedTasks(newSelection);
  };

  const selectAll = () => {
    if (selectedTasks.size === filteredTasks.length) {
      setSelectedTasks(new Set());
    } else {
      setSelectedTasks(new Set(filteredTasks.map((t) => t.task_id)));
    }
  };

  const handleBulkAssign = (agentId: string) => {
    if (selectedTasks.size === 0) return;
    onBulkAssign(Array.from(selectedTasks), agentId);
    setSelectedTasks(new Set());
  };

  const handleBulkArchive = () => {
    if (selectedTasks.size === 0) return;
    if (confirm(`Archive ${selectedTasks.size} selected tasks?`)) {
      onBulkArchive(Array.from(selectedTasks));
      setSelectedTasks(new Set());
    }
  };

  const agentIds = [...new Set(tasks.map((t) => t.assigned_to_agent))].sort();

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4">
        {/* View Mode Toggle */}
        <div className="flex gap-2">
          <Button
            variant={viewMode === 'kanban' ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setViewMode('kanban')}
          >
            Kanban
          </Button>
          <Button
            variant={viewMode === 'list' ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setViewMode('list')}
          >
            List
          </Button>
        </div>

        {/* Bulk Actions */}
        {selectedTasks.size > 0 && (
          <div className="flex gap-2 items-center">
            <span className="text-sm text-slate-400">{selectedTasks.size} selected</span>
            <select
              onChange={(e) => {
                if (e.target.value) {
                  handleBulkAssign(e.target.value);
                  e.target.value = '';
                }
              }}
              className="rounded-md border border-slate-600 bg-slate-800 px-3 py-1 text-sm text-slate-50 focus:border-blue-500 focus:outline-none"
            >
              <option value="">Assign to...</option>
              {agents.map((agent) => (
                <option key={agent.agent_id} value={agent.agent_id}>
                  {agent.agent_name}
                </option>
              ))}
            </select>
            <Button variant="danger" size="sm" onClick={handleBulkArchive}>
              Archive
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setSelectedTasks(new Set())}>
              Clear
            </Button>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
        <input
          type="text"
          placeholder="Search tasks..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="rounded-md border border-slate-600 bg-slate-800 px-3 py-2 text-slate-50 placeholder-slate-500 focus:border-blue-500 focus:outline-none"
        />

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="rounded-md border border-slate-600 bg-slate-800 px-3 py-2 text-slate-50 focus:border-blue-500 focus:outline-none"
        >
          <option value="all">All Status</option>
          <option value="todo">To Do</option>
          <option value="in-progress">In Progress</option>
          <option value="done">Done</option>
          <option value="blocked">Blocked</option>
        </select>

        <select
          value={filterPriority}
          onChange={(e) => setFilterPriority(e.target.value)}
          className="rounded-md border border-slate-600 bg-slate-800 px-3 py-2 text-slate-50 focus:border-blue-500 focus:outline-none"
        >
          <option value="all">All Priorities</option>
          <option value="1">P1 (Critical)</option>
          <option value="2">P2 (High)</option>
          <option value="3">P3 (Medium)</option>
          <option value="4">P4 (Low)</option>
          <option value="5">P5 (Trivial)</option>
        </select>

        <select
          value={filterAgent}
          onChange={(e) => setFilterAgent(e.target.value)}
          className="rounded-md border border-slate-600 bg-slate-800 px-3 py-2 text-slate-50 focus:border-blue-500 focus:outline-none"
        >
          <option value="all">All Agents</option>
          {agentIds.map((agent) => (
            <option key={agent} value={agent}>
              {agent}
            </option>
          ))}
        </select>

        <Button variant="secondary" size="md" onClick={selectAll}>
          {selectedTasks.size === filteredTasks.length ? 'Deselect All' : 'Select All'}
        </Button>
      </div>

      {/* Task Dependencies Visualization Note */}
      {filteredTasks.some(t => t.description.toLowerCase().includes('depends') || t.description.toLowerCase().includes('blocked')) && (
        <div className="bg-yellow-900/20 border border-yellow-700 rounded-md p-3">
          <p className="text-sm text-yellow-200">
            ⚠️ Some tasks may have dependencies. Check task descriptions for dependency information.
          </p>
        </div>
      )}

      {/* Kanban View */}
      {viewMode === 'kanban' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {TASK_COLUMNS.map((status) => {
            const columnTasks = filteredTasks.filter((t) => t.status === status);
            const columnLabel =
              status === 'todo'
                ? 'To Do'
                : status === 'in-progress'
                ? 'In Progress'
                : 'Done';

            return (
              <div key={status} className="bg-slate-900 rounded-lg p-4 min-h-96">
                <h2 className="font-bold text-slate-50 mb-4 flex items-center justify-between">
                  {columnLabel}
                  <span className="bg-slate-700 text-slate-300 text-xs px-2 py-1 rounded">
                    {columnTasks.length}
                  </span>
                </h2>

                <div className="space-y-3">
                  {columnTasks.map((task) => (
                    <Card
                      key={task.task_id}
                      className="cursor-pointer"
                      onClick={() => onTaskClick(task)}
                    >
                      <div className="space-y-2">
                        {/* Checkbox for selection */}
                        <div className="flex items-start gap-2">
                          <input
                            type="checkbox"
                            checked={selectedTasks.has(task.task_id)}
                            onChange={(e) => {
                              e.stopPropagation();
                              toggleTaskSelection(task.task_id);
                            }}
                            className="mt-1 rounded border-slate-600 bg-slate-800 text-blue-500 focus:ring-blue-500"
                          />
                          <div className="flex-1">
                            <h3 className="font-medium text-slate-50 line-clamp-2">
                              {task.title}
                            </h3>
                          </div>
                        </div>

                        <p className="text-xs text-slate-400 line-clamp-2">
                          {task.description}
                        </p>

                        <div className="flex items-center justify-between pt-2">
                          <span className="text-xs bg-blue-900 text-blue-200 px-2 py-1 rounded">
                            {task.assigned_to_agent}
                          </span>
                          <span
                            className={`text-xs px-2 py-1 rounded ${
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

                        {status !== 'done' && (
                          <div className="flex gap-2 pt-2">
                            {status !== 'in-progress' && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onTaskStatusChange(task.task_id, 'in-progress');
                                }}
                                className="text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 px-2 py-1 rounded transition flex-1"
                              >
                                Start
                              </button>
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onTaskStatusChange(task.task_id, 'done');
                              }}
                              className="text-xs bg-green-900 hover:bg-green-800 text-green-200 px-2 py-1 rounded transition flex-1"
                            >
                              ✓ Done
                            </button>
                          </div>
                        )}
                      </div>
                    </Card>
                  ))}

                  {columnTasks.length === 0 && (
                    <div className="text-center py-8">
                      <p className="text-sm text-slate-500">No tasks</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <div className="bg-slate-900 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-800">
              <tr>
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedTasks.size === filteredTasks.length && filteredTasks.length > 0}
                    onChange={selectAll}
                    className="rounded border-slate-600 bg-slate-700 text-blue-500 focus:ring-blue-500"
                  />
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">Task</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">Status</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">Priority</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">Agent</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {filteredTasks.map((task) => (
                <tr
                  key={task.task_id}
                  className="hover:bg-slate-800 cursor-pointer transition"
                  onClick={() => onTaskClick(task)}
                >
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedTasks.has(task.task_id)}
                      onChange={(e) => {
                        e.stopPropagation();
                        toggleTaskSelection(task.task_id);
                      }}
                      className="rounded border-slate-600 bg-slate-700 text-blue-500 focus:ring-blue-500"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-slate-50 font-medium">{task.title}</div>
                    <div className="text-xs text-slate-400 line-clamp-1">{task.description}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block px-2 py-1 rounded text-xs ${
                        task.status === 'done'
                          ? 'bg-green-900 text-green-200'
                          : task.status === 'in-progress'
                          ? 'bg-yellow-900 text-yellow-200'
                          : task.status === 'blocked'
                          ? 'bg-red-900 text-red-200'
                          : 'bg-slate-700 text-slate-300'
                      }`}
                    >
                      {task.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block px-2 py-1 rounded text-xs ${
                        task.priority === 1 || task.priority === 2
                          ? 'bg-red-900 text-red-200'
                          : task.priority === 3
                          ? 'bg-yellow-900 text-yellow-200'
                          : 'bg-green-900 text-green-200'
                      }`}
                    >
                      P{task.priority}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-300 text-sm">{task.assigned_to_agent}</td>
                  <td className="px-4 py-3 text-slate-400 text-sm">
                    {new Date(task.created_date).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredTasks.length === 0 && (
            <div className="text-center py-12">
              <p className="text-slate-400">No tasks found</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
