'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Project, MaestroTask, Agent } from '@/lib/types';
import { getProjects, createProject, seedData, createTask, createAgent } from '@/lib/storage-adapter';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Modal } from '@/components/Modal';
import ImportPDFModal from '@/components/ImportPDFModal';

interface ParsedProject {
  name: string;
  description?: string;
  phases?: string[];
  tasks?: Array<{
    title: string;
    description?: string;
    agent?: string;
  }>;
}

export default function Dashboard() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isNewProjectOpen, setIsNewProjectOpen] = useState(false);
  const [isImportPDFOpen, setIsImportPDFOpen] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [importMessage, setImportMessage] = useState('');

  // Initialize projects on mount
  useEffect(() => {
    const loadProjects = async () => {
      await seedData();
      const loaded = await getProjects();
      setProjects(loaded);
      setIsLoading(false);
    };
    loadProjects();
  }, []);

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
    setProjects([...projects, newProject]);
    setProjectName('');
    setProjectDescription('');
    setIsNewProjectOpen(false);
  };

  const handleImportPDF = async (parsedProjects: ParsedProject[]) => {
    let createdCount = 0;
    let tasksCount = 0;
    const newProjects: Project[] = [];

    for (const parsedProject of parsedProjects) {
      // Create project
      const now = new Date().toISOString();
      const projectId = `project-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      const newProject: Project = {
        project_id: projectId,
        name: parsedProject.name,
        description: parsedProject.description || '',
        status: 'active',
        created_date: now,
        agent_count: 0,
        task_count: 0,
      };

      await createProject(newProject);
      newProjects.push(newProject);
      createdCount++;

      // Create agents (one for each mentioned agent in tasks)
      const agentSet = new Set<string>();
      if (parsedProject.tasks) {
        parsedProject.tasks.forEach(task => {
          if (task.agent) {
            agentSet.add(task.agent);
          }
        });
      }

      const agentIds: Record<string, string> = {};
      for (const [index, agentName] of Array.from(agentSet).entries()) {
        const agentId = `agent-${Date.now()}-${index}`;
        const agent: Agent = {
          agent_id: agentId,
          project_id: projectId,
          agent_name: agentName,
          status: 'idle',
          tasks_completed: 0,
          tasks_in_progress: 0,
        };
        await createAgent(agent);
        agentIds[agentName] = agentId;
      }

      // If no agents mentioned, create a default agent
      if (agentSet.size === 0) {
        const defaultAgentId = `agent-${Date.now()}`;
        const defaultAgent: Agent = {
          agent_id: defaultAgentId,
          project_id: projectId,
          agent_name: 'agent-1',
          status: 'idle',
          tasks_completed: 0,
          tasks_in_progress: 0,
        };
        await createAgent(defaultAgent);
        agentIds['default'] = defaultAgentId;
      }

      // Create tasks
      if (parsedProject.tasks) {
        for (const [taskIndex, parsedTask] of parsedProject.tasks.entries()) {
          const taskId = `task-${Date.now()}-${taskIndex}`;
          const assignedAgent = parsedTask.agent
            ? agentIds[parsedTask.agent]
            : Object.values(agentIds)[0];

          const task: MaestroTask = {
            task_id: taskId,
            project_id: projectId,
            title: parsedTask.title,
            description: parsedTask.description || '',
            ai_prompt: `Task: ${parsedTask.title}\n${parsedTask.description ? `Description: ${parsedTask.description}` : ''}`,
            assigned_to_agent: assignedAgent,
            priority: 3,
            status: 'todo',
            created_date: now,
          };

          await createTask(task);
          tasksCount++;
        }
      }

      // Update agent count
      if (newProject) {
        newProject.agent_count = agentSet.size > 0 ? agentSet.size : 1;
      }
    }

    // Update projects list
    setProjects([...projects, ...newProjects]);
    setIsImportPDFOpen(false);

    // Show success message
    setImportMessage(`Successfully imported ${createdCount} project(s) with ${tasksCount} task(s)`);
    setTimeout(() => setImportMessage(''), 3000);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="text-3xl mb-4">⏳</div>
          <p className="text-slate-400">Loading projects...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-50 mb-2">Projects</h1>
          <p className="text-slate-400">
            {projects.length} project{projects.length !== 1 ? 's' : ''} created
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setIsImportPDFOpen(true)} variant="secondary">
            📄 Import from PDF
          </Button>
          <Button onClick={() => setIsNewProjectOpen(true)} variant="primary">
            + New Project
          </Button>
        </div>
      </div>

      {/* Import Success Message */}
      {importMessage && (
        <div className="mb-4 p-4 rounded-md bg-green-900 text-green-200">
          {importMessage}
        </div>
      )}

      {/* Projects Grid */}
      {projects.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-5xl mb-4">📁</div>
          <p className="text-slate-400 mb-6">No projects yet. Create one to get started!</p>
          <Button onClick={() => setIsNewProjectOpen(true)} variant="primary">
            Create First Project
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map(project => (
            <Link key={project.project_id} href={`/projects/${project.project_id}`}>
              <Card hover className="h-full">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="text-lg font-bold text-slate-50">{project.name}</h2>
                    <p className="text-sm text-slate-400 mt-1">{project.description}</p>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    project.status === 'active'
                      ? 'bg-green-900 text-green-200'
                      : project.status === 'paused'
                      ? 'bg-yellow-900 text-yellow-200'
                      : 'bg-slate-700 text-slate-300'
                  }`}>
                    {project.status}
                  </span>
                </div>

                <div className="flex gap-4 text-sm">
                  <div>
                    <div className="text-slate-400">Tasks</div>
                    <div className="text-lg font-bold text-blue-400">{project.task_count || 0}</div>
                  </div>
                  <div>
                    <div className="text-slate-400">Agents</div>
                    <div className="text-lg font-bold text-green-400">{project.agent_count}</div>
                  </div>
                </div>

                <div className="text-xs text-slate-500 mt-4">
                  Created {new Date(project.created_date).toLocaleDateString()}
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}

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

      {/* Import PDF Modal */}
      <ImportPDFModal
        isOpen={isImportPDFOpen}
        onClose={() => setIsImportPDFOpen(false)}
        onImportComplete={handleImportPDF}
      />
    </div>
  );
}
