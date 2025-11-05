/**
 * API route: GET /api/agents/[id]
 *
 * Get agent information and statistics
 * Shows tasks assigned, completed count, current status
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAgent, getTasks } from '@/lib/storage-adapter';

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const agent = await getAgent(params.id);

    if (!agent) {
      return NextResponse.json(
        { error: 'Agent not found', status: 404 },
        { status: 404 }
      );
    }

    // Get all tasks for this agent
    const allTasks = await getTasks();
    const agentTasks = allTasks.filter(t => t.assigned_to_agent === params.id);

    // Count tasks by status
    const todo = agentTasks.filter(t => t.status === 'todo').length;
    const inProgress = agentTasks.filter(t => t.status === 'in-progress').length;
    const done = agentTasks.filter(t => t.status === 'done').length;
    const blocked = agentTasks.filter(t => t.status === 'blocked').length;

    return NextResponse.json({
      ...agent,
      total_tasks: agentTasks.length,
      todo_count: todo,
      in_progress_count: inProgress,
      done_count: done,
      blocked_count: blocked,
      tasks: agentTasks,
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
