'use client';

import { useState } from 'react';
import { getTasks } from '@/lib/storage';

interface StartResult {
  success: boolean;
  triggered: number;
  skipped: number;
  errors: string[];
}

export default function StartAllTasksButton({ projectId }: { projectId: string }) {
  const [isStarting, setIsStarting] = useState(false);
  const [result, setResult] = useState<StartResult | null>(null);

  const handleStartAllTasks = async () => {
    setIsStarting(true);
    setResult(null);

    try {
      const allTasks = getTasks();
      const projectTasks = allTasks.filter(t => t.project_id === projectId);

      let triggeredCount = 0;
      let skippedCount = 0;
      const errors: string[] = [];

      for (const task of projectTasks) {
        try {
          // Skip if not assigned or already in progress/done
          if (!task.assigned_to_agent || task.assigned_to_agent === 'Unassigned') {
            skippedCount++;
            continue;
          }

          if (task.status !== 'todo') {
            skippedCount++;
            continue;
          }

          // Determine agent type from task or assigned_to_agent_type
          const agentType = task.assigned_to_agent_type || inferAgentTypeFromTaskContent(task);

          if (!agentType) {
            errors.push(`Task ${task.task_id}: Could not determine agent type`);
            continue;
          }

          // Trigger agent webhook
          const response = await fetch(`/api/agents/trigger/${agentType}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ taskId: task.task_id })
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
            errors.push(`Task ${task.task_id}: ${errorData.error || 'Trigger failed'}`);
            continue;
          }

          triggeredCount++;

        } catch (error) {
          errors.push(`Task ${task.task_id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      setResult({
        success: true,
        triggered: triggeredCount,
        skipped: skippedCount,
        errors
      });

      // Reload page after short delay if tasks were triggered
      if (triggeredCount > 0) {
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      }

    } catch (error) {
      setResult({
        success: false,
        triggered: 0,
        skipped: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      });
    } finally {
      setIsStarting(false);
    }
  };

  const inferAgentTypeFromTaskContent = (task: any): string | null => {
    const content = (
      (task.title || '') + ' ' +
      (task.description || '') + ' ' +
      (task.ai_prompt || '')
    ).toLowerCase();

    // Simple inference based on keywords
    if (content.includes('ui') || content.includes('frontend') || content.includes('react') || content.includes('component')) {
      return 'Frontend';
    }
    if (content.includes('api') || content.includes('backend') || content.includes('database') || content.includes('server')) {
      return 'Backend';
    }
    if (content.includes('test') || content.includes('testing') || content.includes('spec')) {
      return 'Testing';
    }
    if (content.includes('deploy') || content.includes('docker') || content.includes('ci/cd')) {
      return 'DevOps';
    }
    if (content.includes('doc') || content.includes('readme') || content.includes('guide')) {
      return 'Documentation';
    }
    if (content.includes('data') || content.includes('analytics') || content.includes('ml')) {
      return 'Data';
    }
    if (content.includes('security') || content.includes('auth') || content.includes('secure')) {
      return 'Security';
    }

    return 'Backend'; // default
  };

  return (
    <div className="space-y-4">
      <button
        onClick={handleStartAllTasks}
        disabled={isStarting}
        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
      >
        {isStarting ? '⚡ Starting Tasks...' : '▶️ Start All Tasks'}
      </button>

      {result && (
        <div className={`p-4 rounded-lg ${result.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
          <h3 className="font-semibold mb-2">
            {result.success ? '✅ Tasks Started' : '❌ Start Failed'}
          </h3>

          {result.success && (
            <ul className="text-sm space-y-1">
              <li>⚡ Tasks Triggered: {result.triggered}</li>
              <li>⊙ Tasks Skipped (not ready): {result.skipped}</li>
            </ul>
          )}

          {result.errors.length > 0 && (
            <div className="mt-2">
              <p className="text-sm font-semibold text-orange-600">Warnings:</p>
              <ul className="text-xs space-y-1 text-orange-600">
                {result.errors.slice(0, 5).map((error, i) => (
                  <li key={i}>• {error}</li>
                ))}
                {result.errors.length > 5 && (
                  <li>• ... and {result.errors.length - 5} more</li>
                )}
              </ul>
            </div>
          )}

          {result.success && result.triggered > 0 && (
            <p className="text-xs text-gray-600 mt-2">Page will reload in 2 seconds...</p>
          )}
        </div>
      )}

      <div className="text-xs text-gray-500 space-y-1">
        <p><strong>What this does:</strong> Triggers webhooks for all assigned &apos;todo&apos; tasks</p>
        <p><strong>Skips:</strong> Unassigned tasks, in-progress tasks, completed tasks</p>
      </div>
    </div>
  );
}
