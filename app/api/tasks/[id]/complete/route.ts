/**
 * API route: POST /api/tasks/[id]/complete
 *
 * Mark a task as completed
 * Updates status to 'done', sets completion time, and updates agent stats
 *
 * Request body: (optional)
 * {
 *   notes?: string
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { updateTask, getTask } from '@/lib/storage';
import {
  withErrorHandling,
  successResponse,
  NotFoundError,
  ApiError,
} from '@/lib/api-utils';
import { trackTaskCompletion } from '@/lib/agent-stats';
import { PerformanceMonitor } from '@/lib/performance';

async function handler(
  _request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  PerformanceMonitor.start('complete_task');

  try {
    // Get task
    const task = getTask(params.id);
    if (!task) {
      throw new NotFoundError('Task');
    }

    // Check if already completed
    if (task.status === 'done') {
      throw new ApiError(
        'ALREADY_COMPLETED',
        'Task is already completed',
        400
      );
    }

    // Update task to completed
    const updates: any = {
      status: 'done' as const,
      completed_date: new Date().toISOString(),
    };

    // If task wasn't started, set start date to now
    if (!task.started_date) {
      updates.started_date = new Date().toISOString();
    }

    const updated = updateTask(params.id, updates);

    if (!updated) {
      throw new ApiError(
        'UPDATE_FAILED',
        'Failed to update task',
        500
      );
    }

    // Update agent statistics
    trackTaskCompletion(task.assigned_to_agent, params.id, true);

    PerformanceMonitor.end('complete_task');

    return successResponse({
      task: updated,
      message: 'Task completed successfully',
    });
  } catch (error) {
    PerformanceMonitor.end('complete_task');
    throw error;
  }
}

export const POST = withErrorHandling(handler);
