'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Project, MaestroTask, Agent, TaskStatus } from '@/lib/types';
import {
  getProject,
  getProjectTasks,
  getProjectAgents,
  updateTask,
  updateProject,
  deleteTask,
} from '@/lib/storage-adapter';
import { Button } from '@/components/Button';
import { Tabs } from '@/components/Tabs';
import { OverviewTab } from '@/components/project-tabs/OverviewTab';
import { TasksTab } from '@/components/project-tabs/TasksTab';
import { AgentsTab } from '@/components/project-tabs/AgentsTab';
import { SettingsTab } from '@/components/project-tabs/SettingsTab';
import { HistoryTab } from '@/components/project-tabs/HistoryTab';
import NewTaskModal from '@/components/NewTaskModal';
import TaskDetailModal from '@/components/TaskDetailModal';

type TabId = 'overview' | 'tasks' | 'agents' | 'settings' | 'history';

const TABS = [
  { id: 'overview' as TabId, label: 'Overview', icon: '📊' },
  { id: 'tasks' as TabId, label: 'Tasks', icon: '✓' },
  { id: 'agents' as TabId, label: 'Agents', icon: '🤖' },
  { id: 'settings' as TabId, label: 'Settings', icon: '⚙️' },
  { id: 'history' as TabId, label: 'History', icon: '📜' },
];

export default function ProjectDetail({ params }: { params: { id: string } }) {
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<MaestroTask[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [isNewTaskOpen, setIsNewTaskOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<MaestroTask | null>(null);
  const [isTaskDetailOpen, setIsTaskDetailOpen] = useState(false);

  useEffect(() => {
    const loadProject = async () => {
      const loaded = await getProject(params.id);
      if (!loaded) {
        setIsLoading(false);
        return;
      }

      setProject(loaded);
      const projectTasks = await getProjectTasks(params.id);
      const projectAgents = await getProjectAgents(params.id);
      setTasks(projectTasks);
      setAgents(projectAgents);
      setIsLoading(false);
    };
    loadProject();
  }, [params.id]);

  const handleTaskStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    const updated = await updateTask(taskId, {
      status: newStatus,
      started_date:
        newStatus === 'in-progress' ? new Date().toISOString() : undefined,
      completed_date: newStatus === 'done' ? new Date().toISOString() : undefined,
    });

    if (updated) {
      setTasks(tasks.map((t) => (t.task_id === taskId ? updated : t)));
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (confirm('Are you sure? This cannot be undone.')) {
      await deleteTask(taskId);
      setTasks(tasks.filter((t) => t.task_id !== taskId));
      setIsTaskDetailOpen(false);
    }
  };

  const handleTaskClick = (task: MaestroTask) => {
    setSelectedTask(task);
    setIsTaskDetailOpen(true);
  };

  const handleBulkAssign = async (taskIds: string[], agentId: string) => {
    // Update all tasks with the new agent
    for (const taskId of taskIds) {
      const updated = await updateTask(taskId, { assigned_to_agent: agentId });
      if (updated) {
        setTasks(tasks.map((t) => (t.task_id === taskId ? updated : t)));
      }
    }
  };

  const handleBulkArchive = async (taskIds: string[]) => {
    // Mark tasks as done (archive)
    for (const taskId of taskIds) {
      await deleteTask(taskId);
    }
    setTasks(tasks.filter((t) => !taskIds.includes(t.task_id)));
  };

  const handleReassignAgent = async (agentId: string, taskIds: string[]) => {
    // This is a placeholder - in a real app, you'd reassign tasks
    console.log('Reassigning tasks', taskIds, 'from agent', agentId);
  };

  const handleUpdateProject = async (updates: Partial<Project>) => {
    if (!project) return;

    const updated = await updateProject(project.project_id, updates);
    if (updated) {
      setProject(updated);
    }
  };

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
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-slate-50">{project.name}</h1>
            <div className="flex items-center gap-3 mt-2">
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
              <span className="text-slate-400 text-sm">
                {tasks.length} tasks • {agents.length} agents
              </span>
            </div>
          </div>
          <Button onClick={() => setIsNewTaskOpen(true)} variant="primary">
            + New Task
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs tabs={TABS} activeTab={activeTab} onTabChange={(id) => setActiveTab(id as TabId)}>
        {activeTab === 'overview' && (
          <OverviewTab project={project} tasks={tasks} agents={agents} />
        )}

        {activeTab === 'tasks' && (
          <TasksTab
            tasks={tasks}
            agents={agents}
            onTaskClick={handleTaskClick}
            onTaskStatusChange={handleTaskStatusChange}
            onBulkAssign={handleBulkAssign}
            onBulkArchive={handleBulkArchive}
          />
        )}

        {activeTab === 'agents' && (
          <AgentsTab
            agents={agents}
            tasks={tasks}
            onReassignAgent={handleReassignAgent}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsTab project={project} onUpdateProject={handleUpdateProject} />
        )}

        {activeTab === 'history' && <HistoryTab tasks={tasks} agents={agents} />}
      </Tabs>

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
