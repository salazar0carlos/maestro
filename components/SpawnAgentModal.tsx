'use client';

import { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { getProjects } from '@/lib/storage';
import { Project } from '@/lib/types';

interface SpawnAgentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const AGENT_TYPES = [
  { id: 'supervisor', name: 'Supervisor Agent', description: 'Oversees workflow and coordinates other agents' },
  { id: 'frontend', name: 'Frontend Agent', description: 'Specializes in React, Next.js, and UI development' },
  { id: 'backend', name: 'Backend Agent', description: 'Handles APIs, databases, and server-side logic' },
  { id: 'testing', name: 'Testing Agent', description: 'Writes and runs tests, ensures quality' },
  { id: 'research', name: 'Research Agent', description: 'Researches solutions and best practices' },
  { id: 'product-improvement', name: 'Product Improvement Agent', description: 'Analyzes and suggests product enhancements' },
];

export function SpawnAgentModal({ isOpen, onClose, onSuccess }: SpawnAgentModalProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState('');
  const [selectedAgentType, setSelectedAgentType] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      const loadedProjects = getProjects();
      setProjects(loadedProjects);
      setError('');
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!selectedProject || !selectedAgentType) {
      setError('Please select both project and agent type');
      return;
    }

    setIsSubmitting(true);

    try {
      const agentType = AGENT_TYPES.find(t => t.id === selectedAgentType);
      if (!agentType) {
        throw new Error('Invalid agent type');
      }

      const response = await fetch('/api/agents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          project_id: selectedProject,
          agent_name: agentType.name,
          status: 'idle',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create agent');
      }

      // Reset form
      setSelectedProject('');
      setSelectedAgentType('');

      // Call success callback
      if (onSuccess) {
        onSuccess();
      }

      // Close modal
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to spawn agent');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Spawn New Agent">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Project Selection */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Select Project
          </label>
          <select
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
            className="w-full bg-slate-700 border border-slate-600 text-slate-200 rounded px-3 py-2 focus:outline-none focus:border-blue-500"
            required
          >
            <option value="">Choose a project...</option>
            {projects.map(project => (
              <option key={project.project_id} value={project.project_id}>
                {project.name}
              </option>
            ))}
          </select>
          {projects.length === 0 && (
            <p className="text-sm text-yellow-400 mt-1">
              No projects available. Create a project first.
            </p>
          )}
        </div>

        {/* Agent Type Selection */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Select Agent Type
          </label>
          <div className="space-y-2">
            {AGENT_TYPES.map(agentType => (
              <label
                key={agentType.id}
                className={`block p-3 rounded border cursor-pointer transition ${
                  selectedAgentType === agentType.id
                    ? 'border-blue-500 bg-blue-900/20'
                    : 'border-slate-600 hover:border-slate-500'
                }`}
              >
                <input
                  type="radio"
                  name="agentType"
                  value={agentType.id}
                  checked={selectedAgentType === agentType.id}
                  onChange={(e) => setSelectedAgentType(e.target.value)}
                  className="mr-3"
                />
                <span className="font-medium text-slate-200">{agentType.name}</span>
                <p className="text-sm text-slate-400 ml-6 mt-1">
                  {agentType.description}
                </p>
              </label>
            ))}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-900/20 border border-red-500 rounded p-3">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={isSubmitting || !selectedProject || !selectedAgentType}
            isLoading={isSubmitting}
          >
            {isSubmitting ? 'Spawning...' : 'Spawn Agent'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
