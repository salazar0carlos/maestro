'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Project, MaestroTask, TaskStatus } from '@/lib/types';
import {
  getProject,
  getProjectTasks,
  updateTask,
  deleteTask,
} from '@/lib/storage';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import NewTaskModal from '@/components/NewTaskModal';
import TaskDetailModal from '@/components/TaskDetailModal';
import { useToast } from '@/components/ToastContainer';
import { Sparkles } from 'lucide-react';

const TASK_COLUMNS: TaskStatus[] = ['todo', 'in-progress', 'done'];

export default function ProjectDetail({ params }: { params: { id: string } }) {
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<MaestroTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isNewTaskOpen, setIsNewTaskOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<MaestroTask | null>(null);
  const [isTaskDetailOpen, setIsTaskDetailOpen] = useState(false);
  const [filterAgent, setFilterAgent] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const { showSuccess, showError, showInfo } = useToast();

  useEffect(() => {
    const loaded = getProject(params.id);
    if (!loaded) {
      setIsLoading(false);
      return;
    }

    setProject(loaded);
    const projectTasks = getProjectTasks(params.id);
    setTasks(projectTasks);
    setIsLoading(false);
  }, [params.id]);

  const handleTaskStatusChange = (taskId: string, newStatus: TaskStatus) => {
    const updated = updateTask(taskId, {
      status: newStatus,
      started_date:
        newStatus === 'in-progress'
          ? new Date().toISOString()
          : undefined,
      completed_date:
        newStatus === 'done'
          ? new Date().toISOString()
          : undefined,
    });

    if (updated) {
      setTasks(tasks.map(t => (t.task_id === taskId ? updated : t)));
    }
  };

  const handleDeleteTask = (taskId: string) => {
    if (confirm('Are you sure? This cannot be undone.')) {
      deleteTask(taskId);
      setTasks(tasks.filter(t => t.task_id !== taskId));
      setIsTaskDetailOpen(false);
    }
  };

  const handleAnalyzeProject = async () => {
    if (!project) return;

    setIsAnalyzing(true);
    showInfo(
      'Analysis Starting',
      'Product Improvement Agent is analyzing your project...'
    );

    try {
      const response = await fetch('/api/events/trigger', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          event: 'analyze_project',
          projectId: project.project_id,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to trigger analysis');
      }

      await response.json();

      showSuccess(
        'Analysis Triggered',
        'Analysis will complete in the background. You\'ll receive a notification when it\'s done.',
        {
          duration: 7000,
          link: '/improvements',
          linkText: 'View Improvements',
        }
      );
    } catch (error) {
      console.error('Failed to trigger analysis:', error);
      showError(
        'Analysis Failed',
        error instanceof Error ? error.message : 'Failed to trigger project analysis'
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  const filteredTasks = tasks.filter(task => {
    const matchesAgent = filterAgent === 'all' || task.assigned_to_agent === filterAgent;
    const matchesSearch =
      task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesAgent && matchesSearch;
  });

  const agentIds = [...new Set(tasks.map(t => t.assigned_to_agent))].sort();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-slate-400">Loading...</p>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-400 mb-4">Project not found</p>
        <Link href="/">
          <Button variant="primary">Back to Projects</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link href="/" className="text-blue-400 hover:text-blue-300 text-sm mb-4 block">
          ← Back to Projects
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-50">{project.name}</h1>
            <p className="text-slate-400 mt-1">{project.description}</p>
          </div>
          <div className="flex gap-3">
            <Button
              onClick={handleAnalyzeProject}
              variant="secondary"
              isLoading={isAnalyzing}
              disabled={isAnalyzing}
              className="flex items-center gap-2"
            >
              <Sparkles size={16} />
              {isAnalyzing ? 'Analyzing...' : 'Generate Improvements'}
            </Button>
            <Button onClick={() => setIsNewTaskOpen(true)} variant="primary">
              + New Task
            </Button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 flex items-center gap-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full rounded-md border border-slate-600 bg-slate-800 px-3 py-2 text-slate-50 placeholder-slate-500 focus:border-blue-500 focus:outline-none"
          />
        </div>
        <select
          value={filterAgent}
          onChange={e => setFilterAgent(e.target.value)}
          className="rounded-md border border-slate-600 bg-slate-800 px-3 py-2 text-slate-50 focus:border-blue-500 focus:outline-none"
        >
          <option value="all">All Agents</option>
          {agentIds.map(agent => (
            <option key={agent} value={agent}>
              {agent}
            </option>
          ))}
        </select>
      </div>

      {/* Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {TASK_COLUMNS.map(status => {
          const columnTasks = filteredTasks.filter(t => t.status === status);
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
                {columnTasks.map(task => (
                  <Card
                    key={task.task_id}
                    className="cursor-pointer"
                    onClick={() => {
                      setSelectedTask(task);
                      setIsTaskDetailOpen(true);
                    }}
                  >
                    <div className="space-y-2">
                      <h3 className="font-medium text-slate-50 line-clamp-2">
                        {task.title}
                      </h3>
                      <p className="text-xs text-slate-400 line-clamp-2">
                        {task.description}
                      </p>

                      <div className="flex items-center justify-between pt-2">
                        <span className="text-xs bg-blue-900 text-blue-200 px-2 py-1 rounded">
                          {task.assigned_to_agent}
                        </span>
                        <span className={`text-xs px-2 py-1 rounded ${
                          task.priority === 1 || task.priority === 2
                            ? 'bg-red-900 text-red-200'
                            : task.priority === 3
                            ? 'bg-yellow-900 text-yellow-200'
                            : 'bg-green-900 text-green-200'
                        }`}>
                          P{task.priority}
                        </span>
                      </div>

                      {status !== 'done' && (
                        <div className="flex gap-2 pt-2">
                          {status !== 'in-progress' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleTaskStatusChange(task.task_id, 'in-progress');
                              }}
                              className="text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 px-2 py-1 rounded transition flex-1"
                            >
                              Start
                            </button>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleTaskStatusChange(task.task_id, 'done');
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

      {/* New Task Modal */}
      <NewTaskModal
        isOpen={isNewTaskOpen}
        onClose={() => setIsNewTaskOpen(false)}
        projectId={project.project_id}
        onTaskCreated={(task) => {
          setTasks([...tasks, task]);
          setIsNewTaskOpen(false);
        }}
      />

      {/* Task Detail Modal */}
      {selectedTask && (
        <TaskDetailModal
          isOpen={isTaskDetailOpen}
          onClose={() => setIsTaskDetailOpen(false)}
          task={selectedTask}
          onStatusChange={(status) => {
            handleTaskStatusChange(selectedTask.task_id, status);
            setSelectedTask(null);
            setIsTaskDetailOpen(false);
          }}
          onDelete={() => {
            handleDeleteTask(selectedTask.task_id);
          }}
        />
      )}
    </div>
  );
}
