'use client';

import { useState } from 'react';
import { getProjects, getTasks, getAgents, createAgent, updateTask } from '@/lib/storage-adapter';

interface AssignmentResult {
  success: boolean;
  assigned: number;
  skipped: number;
  agentsCreated: number;
  errors: string[];
}

interface AgentTypeConfig {
  capabilities: string[];
  patterns: string[];
}

export default function AssignTasksButton({ projectId }: { projectId: string }) {
  const [isAssigning, setIsAssigning] = useState(false);
  const [result, setResult] = useState<AssignmentResult | null>(null);

  const agentTypes: Record<string, AgentTypeConfig> = {
    'Frontend': {
      capabilities: ['React', 'Next.js', 'TypeScript', 'Tailwind CSS', 'UI/UX', 'Components', 'Styling'],
      patterns: ['ui', 'frontend', 'react', 'component', 'css', 'style', 'tailwind', 'page', 'interface', 'modal', 'button', 'form', 'layout']
    },
    'Backend': {
      capabilities: ['Node.js', 'API', 'Database', 'TypeScript', 'Express', 'Routes', 'Authentication'],
      patterns: ['api', 'backend', 'database', 'server', 'endpoint', 'route', 'auth', 'storage', 'sql', 'query']
    },
    'Testing': {
      capabilities: ['Jest', 'Cypress', 'Unit Tests', 'Integration Tests', 'E2E Tests'],
      patterns: ['test', 'testing', 'spec', 'jest', 'cypress', 'e2e', 'unit test', 'integration test']
    },
    'DevOps': {
      capabilities: ['Docker', 'CI/CD', 'Deployment', 'Infrastructure', 'Monitoring'],
      patterns: ['deploy', 'deployment', 'docker', 'ci/cd', 'infrastructure', 'build', 'pipeline', 'kubernetes']
    },
    'Documentation': {
      capabilities: ['Technical Writing', 'API Docs', 'User Guides', 'README'],
      patterns: ['documentation', 'docs', 'readme', 'guide', 'tutorial', 'document', 'write', 'explain']
    },
    'Data': {
      capabilities: ['Data Processing', 'Analytics', 'ML/AI', 'Data Pipeline'],
      patterns: ['data', 'analytics', 'ml', 'ai', 'machine learning', 'model', 'training', 'dataset', 'pipeline']
    },
    'Security': {
      capabilities: ['Security Audit', 'Vulnerability Assessment', 'Authentication', 'Authorization'],
      patterns: ['security', 'auth', 'permission', 'vulnerability', 'encrypt', 'secure', 'audit', 'compliance']
    }
  };

  const determineAgentType = (task: any): string => {
    const content = (
      (task.title || '') + ' ' +
      (task.description || '') + ' ' +
      (task.ai_prompt || '')
    ).toLowerCase();

    const scores: Record<string, number> = {};

    for (const [agentType, config] of Object.entries(agentTypes)) {
      let score = 0;
      for (const pattern of config.patterns) {
        if (content.includes(pattern)) {
          score += 1;
        }
      }
      scores[agentType] = score;
    }

    let bestType = 'Backend';
    let highestScore = 0;

    for (const [type, score] of Object.entries(scores)) {
      if (score > highestScore) {
        highestScore = score;
        bestType = type;
      }
    }

    return bestType;
  };

  const getOrCreateAgent = async (projectId: string, agentType: string, existingAgents: any[]) => {
    let agent = existingAgents.find(a =>
      a.project_id === projectId && a.agent_type === agentType
    );

    if (agent) {
      return { agent, created: false };
    }

    const agentId = `${agentType.toLowerCase()}-agent-${Date.now()}`;
    const now = new Date().toISOString();

    agent = {
      agent_id: agentId,
      project_id: projectId,
      agent_name: `${agentType} Agent`,
      agent_type: agentType,
      status: 'idle',
      tasks_completed: 0,
      tasks_in_progress: 0,
      tasks_failed: 0,
      success_rate: 1.0,
      average_task_time: 0,
      created_date: now,
      capabilities: agentTypes[agentType].capabilities
    };

    await createAgent(agent);
    existingAgents.push(agent);

    return { agent, created: true };
  };

  const handleAssignTasks = async () => {
    setIsAssigning(true);
    setResult(null);

    try {
      const projects = await getProjects();
      const project = projects.find(p => p.project_id === projectId);

      if (!project) {
        throw new Error('Project not found');
      }

      const allTasks = await getTasks();
      const projectTasks = allTasks.filter(t => t.project_id === projectId);
      const agents = await getAgents();

      let assignedCount = 0;
      let skippedCount = 0;
      let createdAgentsCount = 0;
      const errors: string[] = [];

      for (const task of projectTasks) {
        try {
          // Skip if already assigned
          if (task.assigned_to_agent && task.assigned_to_agent !== 'Unassigned') {
            skippedCount++;
            continue;
          }

          // Determine agent type
          const agentType = determineAgentType(task);

          // Get or create agent
          const { agent, created } = await getOrCreateAgent(project.project_id, agentType, agents);

          if (created) {
            createdAgentsCount++;
          }

          // Assign task to agent
          await updateTask(task.task_id, {
            assigned_to_agent: agent.agent_id,
            assigned_to_agent_type: agentType
          });

          // Trigger agent webhook for this task
          try {
            await fetch(`/api/agents/trigger/${agentType}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ taskId: task.task_id })
            });
          } catch (triggerError) {
            console.warn(`Failed to trigger agent for task ${task.task_id}:`, triggerError);
            // Don't fail the whole operation if webhook fails
          }

          assignedCount++;

        } catch (error) {
          errors.push(`Task ${task.task_id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      setResult({
        success: true,
        assigned: assignedCount,
        skipped: skippedCount,
        agentsCreated: createdAgentsCount,
        errors
      });

      // Reload page after short delay to show changes
      setTimeout(() => {
        window.location.reload();
      }, 2000);

    } catch (error) {
      setResult({
        success: false,
        assigned: 0,
        skipped: 0,
        agentsCreated: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      });
    } finally {
      setIsAssigning(false);
    }
  };

  return (
    <div className="space-y-4">
      <button
        onClick={handleAssignTasks}
        disabled={isAssigning}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
      >
        {isAssigning ? '🔄 Assigning Tasks...' : '🎯 Auto-Assign Tasks'}
      </button>

      {result && (
        <div className={`p-4 rounded-lg ${result.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
          <h3 className="font-semibold mb-2">
            {result.success ? '✅ Assignment Complete' : '❌ Assignment Failed'}
          </h3>

          {result.success && (
            <ul className="text-sm space-y-1">
              <li>📝 Tasks Assigned: {result.assigned}</li>
              <li>⊙ Tasks Skipped (already assigned): {result.skipped}</li>
              <li>✨ Agents Created: {result.agentsCreated}</li>
            </ul>
          )}

          {result.errors.length > 0 && (
            <div className="mt-2">
              <p className="text-sm font-semibold text-red-600">Errors:</p>
              <ul className="text-xs space-y-1 text-red-600">
                {result.errors.map((error, i) => (
                  <li key={i}>• {error}</li>
                ))}
              </ul>
            </div>
          )}

          {result.success && (
            <p className="text-xs text-gray-600 mt-2">Page will reload in 2 seconds...</p>
          )}
        </div>
      )}

      <div className="text-xs text-gray-500 space-y-1">
        <p><strong>Agent Types:</strong> Frontend, Backend, Testing, DevOps, Documentation, Data, Security</p>
        <p><strong>Assignment:</strong> Analyzes task title, description, and AI prompt to determine best agent type</p>
      </div>
    </div>
  );
}
