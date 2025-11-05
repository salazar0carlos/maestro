'use client';

import { useState, useEffect } from 'react';
import { MaestroTask } from '@/lib/types';
import { createTask, getProjectAgents } from '@/lib/storage-adapter';
import { generateTaskPrompt } from '@/lib/ai-prompt-generator';
import { Modal } from './Modal';
import { Button } from './Button';

interface NewTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  onTaskCreated: (task: MaestroTask) => void;
}

type Step = 'form' | 'generating' | 'prompt-review';

export default function NewTaskModal({
  isOpen,
  onClose,
  projectId,
  onTaskCreated,
}: NewTaskModalProps) {
  const [step, setStep] = useState<Step>('form');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [agentId, setAgentId] = useState('agent-1');
  const [priority, setPriority] = useState<1 | 2 | 3 | 4 | 5>(3);
  const [aiPrompt, setAiPrompt] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [agents, setAgents] = useState<any[]>([]);

  // Load available agents
  useEffect(() => {
    const loadAgents = async () => {
      const projectAgents = await getProjectAgents(projectId);
      setAgents(projectAgents);
    };
    loadAgents();
  }, [projectId]);

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!title.trim()) {
      setError('Task title is required');
      return;
    }

    setStep('generating');
    setIsSubmitting(true);

    try {
      const prompt = await generateTaskPrompt(title, description);
      setAiPrompt(prompt);
      setStep('prompt-review');
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to generate prompt. Check your API key in settings.'
      );
      setStep('form');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateTask = async () => {
    const task: MaestroTask = {
      task_id: `task-${Date.now()}`,
      project_id: projectId,
      title,
      description,
      ai_prompt: aiPrompt,
      assigned_to_agent: agentId,
      priority,
      status: 'todo',
      created_date: new Date().toISOString(),
    };

    await createTask(task);
    onTaskCreated(task);

    // Reset form
    setTitle('');
    setDescription('');
    setAiPrompt('');
    setAgentId('agent-1');
    setPriority(3);
    setStep('form');
    setError('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create New Task">
      {step === 'form' && (
        <form onSubmit={handleSubmitForm} className="space-y-4">
          {error && (
            <div className="p-3 rounded-md bg-red-900 text-red-200 text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Task Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g., Add dark mode toggle"
              className="w-full rounded-md border border-slate-600 bg-slate-800 px-3 py-2 text-slate-50 placeholder-slate-500 focus:border-blue-500 focus:outline-none"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Description (optional)
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Additional context or requirements..."
              rows={3}
              className="w-full rounded-md border border-slate-600 bg-slate-800 px-3 py-2 text-slate-50 placeholder-slate-500 focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Assign to Agent
              </label>
              <select
                value={agentId}
                onChange={e => setAgentId(e.target.value)}
                className="w-full rounded-md border border-slate-600 bg-slate-800 px-3 py-2 text-slate-50 focus:border-blue-500 focus:outline-none"
              >
                {agents.length > 0 ? (
                  agents.map(agent => (
                    <option key={agent.agent_id} value={agent.agent_id}>
                      {agent.agent_name}
                    </option>
                  ))
                ) : (
                  <option value="agent-1">agent-1</option>
                )}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Priority (1-5)
              </label>
              <select
                value={priority}
                onChange={e => setPriority(parseInt(e.target.value) as any)}
                className="w-full rounded-md border border-slate-600 bg-slate-800 px-3 py-2 text-slate-50 focus:border-blue-500 focus:outline-none"
              >
                <option value="1">1 - Critical</option>
                <option value="2">2 - High</option>
                <option value="3">3 - Medium</option>
                <option value="4">4 - Low</option>
                <option value="5">5 - Minimal</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" isLoading={isSubmitting}>
              Next: Generate Prompt
            </Button>
          </div>
        </form>
      )}

      {step === 'generating' && (
        <div className="text-center py-12">
          <div className="text-4xl mb-4">✨</div>
          <p className="text-slate-300 mb-2">Generating AI prompt...</p>
          <p className="text-sm text-slate-500">
            This may take a few seconds
          </p>
        </div>
      )}

      {step === 'prompt-review' && (
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium text-slate-300">
                AI Generated Prompt (editable)
              </label>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(aiPrompt);
                  alert('Copied to clipboard!');
                }}
                className="text-xs text-blue-400 hover:text-blue-300"
              >
                Copy
              </button>
            </div>
            <textarea
              value={aiPrompt}
              onChange={e => setAiPrompt(e.target.value)}
              rows={10}
              className="w-full rounded-md border border-slate-600 bg-slate-800 px-3 py-2 text-slate-50 placeholder-slate-500 focus:border-blue-500 focus:outline-none font-mono text-sm"
            />
          </div>

          <div className="bg-slate-800 p-3 rounded-md text-sm text-slate-400 space-y-1">
            <p>
              <strong>Title:</strong> {title}
            </p>
            <p>
              <strong>Agent:</strong> {agentId}
            </p>
            <p>
              <strong>Priority:</strong> {priority}
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="ghost"
              onClick={() => setStep('form')}
            >
              Back
            </Button>
            <Button variant="primary" onClick={handleCreateTask}>
              Create Task
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
