/**
 * API route: PUT /api/tasks/[id]/status
 *
 * Update task status and related metadata
 * Called by agents when they update task progress
 *
 * Request body:
 * {
 *   status: 'todo' | 'in-progress' | 'done' | 'blocked',
 *   blocked_reason?: string (only if status is 'blocked')
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { updateTask, getTask } from '@/lib/storage';
import { TaskStatus } from '@/lib/types';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { status, blocked_reason } = body;

    // Validate status
    const validStatuses: TaskStatus[] = ['todo', 'in-progress', 'done', 'blocked'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status', status: 400 },
        { status: 400 }
      );
    }

    // Get task
    const task = getTask(params.id);
    if (!task) {
      return NextResponse.json(
        { error: 'Task not found', status: 404 },
        { status: 404 }
      );
    }

    // Build update object
    const updates: any = { status };

    // Set timestamps
    if (status === 'in-progress' && !task.started_date) {
      updates.started_date = new Date().toISOString();
    }

    if (status === 'done') {
      updates.completed_date = new Date().toISOString();
    }

    if (status === 'blocked' && blocked_reason) {
      updates.blocked_reason = blocked_reason;
    }

    // Update task
    const updated = updateTask(params.id, updates);

    if (!updated) {
      return NextResponse.json(
        { error: 'Failed to update task', status: 500 },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      task: updated,
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
