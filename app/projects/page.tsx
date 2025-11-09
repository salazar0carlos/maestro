'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Modal } from '@/components/Modal';
import { createProject } from '@/lib/storage-adapter';
import { Project } from '@/lib/types';
import { Plus, RefreshCw, Folder } from 'lucide-react';

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isNewProjectOpen, setIsNewProjectOpen] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      setError(null);
      const response = await fetch('/api/projects');

      if (!response.ok) {
        throw new Error(`Failed to fetch projects: ${response.statusText}`);
      }

      const data = await response.json();
      setProjects(data);
    } catch (err) {
      console.error('Error fetching projects:', err);
      setError(err instanceof Error ? err.message : 'Failed to load projects');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchProjects();
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!projectName.trim()) {
      alert('Project name is required');
      return;
    }

    try {
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

      // Refresh the projects list
      await fetchProjects();
    } catch (err) {
      console.error('Error creating project:', err);
      alert('Failed to create project. Please try again.');
    }
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

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="text-3xl mb-4">⚠️</div>
          <p className="text-slate-400 mb-4">Failed to load projects</p>
          <p className="text-sm text-slate-500 mb-4">{error}</p>
          <Button onClick={handleRefresh} variant="primary">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-slate-50 mb-2">Projects</h1>
          <p className="text-slate-400">
            Manage and monitor all your AI-powered projects
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={handleRefresh}
            variant="secondary"
            disabled={isRefreshing}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            onClick={() => setIsNewProjectOpen(true)}
            variant="primary"
            className="flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Create Project
          </Button>
        </div>
      </div>

      {/* Empty State */}
      {projects.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="p-6 bg-slate-800/50 rounded-full mb-6">
            <Folder className="w-16 h-16 text-slate-400" />
          </div>
          <h2 className="text-2xl font-bold text-slate-50 mb-2">
            No projects yet
          </h2>
          <p className="text-slate-400 mb-6 text-center max-w-md">
            Get started by creating your first project. Your AI agents will help you build amazing applications.
          </p>
          <Button
            onClick={() => setIsNewProjectOpen(true)}
            variant="primary"
            className="flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Create Your First Project
          </Button>
        </div>
      )}

      {/* Projects Grid */}
      {projects.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <Link key={project.project_id} href={`/projects/${project.project_id}`}>
              <Card hover className="p-6 h-full">
                <div className="flex flex-col h-full">
                  {/* Project Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-slate-50 mb-2">
                        {project.name}
                      </h3>
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium border ${
                            project.status === 'active'
                              ? 'bg-green-900/20 text-green-400 border-green-500'
                              : project.status === 'paused'
                              ? 'bg-yellow-900/20 text-yellow-400 border-yellow-500'
                              : 'bg-blue-900/20 text-blue-400 border-blue-500'
                          }`}
                        >
                          {project.status}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-slate-400 text-sm mb-4 line-clamp-3 flex-1">
                    {project.description || 'No description provided'}
                  </p>

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-3 pt-4 border-t border-slate-700">
                    <div>
                      <div className="text-xs text-slate-400">Tasks</div>
                      <div className="text-lg font-bold text-slate-50">
                        {project.task_count || 0}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-400">Agents</div>
                      <div className="text-lg font-bold text-green-400">
                        {project.agent_count || 0}
                      </div>
                    </div>
                  </div>

                  {/* Created Date */}
                  <div className="mt-4 pt-4 border-t border-slate-700">
                    <p className="text-xs text-slate-500">
                      Created {new Date(project.created_date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
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
              onChange={(e) => setProjectName(e.target.value)}
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
              onChange={(e) => setProjectDescription(e.target.value)}
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
