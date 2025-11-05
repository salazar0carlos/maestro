/**
 * API route: GET /api/projects/[id]/tasks
 *
 * Returns tasks for a specific project, optionally filtered by agent and status
 * Used by agents to poll for tasks assigned to them
 *
 * Query parameters:
 * - agent: Filter by agent_id (e.g., "agent-1")
 * - status: Filter by status (e.g., "todo", "in-progress")
 *
 * Example: GET /api/projects/project-1/tasks?agent=agent-1&status=todo
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getProject,
  getProjectTasks,
  getAgentTasks,
  getTasksByStatus,
} from '@/lib/storage';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const agent = searchParams.get('agent');
    const status = searchParams.get('status');

    // Verify project exists
    const project = getProject(params.id);
    if (!project) {
      return NextResponse.json(
        { error: 'Project not found', status: 404 },
        { status: 404 }
      );
    }

    let tasks;

    // Get tasks based on filters
    if (agent && status) {
      // Both agent and status filters
      const allTasks = getAgentTasks(params.id, agent);
      tasks = allTasks.filter(t => t.status === status);
    } else if (agent) {
      // Only agent filter
      tasks = getAgentTasks(params.id, agent);
    } else if (status) {
      // Only status filter
      tasks = getTasksByStatus(params.id, status);
    } else {
      // No filters
      tasks = getProjectTasks(params.id);
    }

    // Sort by priority (1 = highest)
    tasks = tasks.sort((a, b) => a.priority - b.priority);

    return NextResponse.json({
      project_id: params.id,
      agent: agent || null,
      status: status || null,
      total: tasks.length,
      tasks,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
        status: 500,
      },
      { status: 500 }
    );
  }
}
