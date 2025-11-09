/**
 * API route: PATCH /api/tasks/[id]/update
 *
 * Update task fields (title, description, priority, status, etc.)
 * More comprehensive than the status endpoint
 *
 * Request body:
 * {
 *   title?: string,
 *   description?: string,
 *   status?: 'todo' | 'in-progress' | 'done' | 'blocked',
 *   priority?: 1 | 2 | 3 | 4 | 5,
 *   blocked_reason?: string,
 *   ai_prompt?: string
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { updateTask, getTask } from '@/lib/storage-adapter';
import { MaestroTask } from '@/lib/types';
import {
  withErrorHandling,
  successResponse,
  NotFoundError,
  ValidationError,
  parseJsonBody,
  validationErrorResponse,
} from '@/lib/api-utils';
import { validateTaskUpdate } from '@/lib/validation';
import { trackTaskStart, trackTaskCompletion } from '@/lib/agent-stats';
import { PerformanceMonitor } from '@/lib/performance';

async function handler(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  PerformanceMonitor.start('update_task');

  try {
    // Get task
    const task = await getTask(params.id);
    if (!task) {
      throw new NotFoundError('Task');
    }

    // Parse request body
    const body = await parseJsonBody<Partial<MaestroTask>>(request);

    // Validate update data
    const validation = validateTaskUpdate(body);
    if (!validation.valid) {
      return validationErrorResponse(validation);
    }

    // Build updates object
    const updates: Partial<MaestroTask> = {};

    // Copy allowed fields
    if (body.title !== undefined) updates.title = body.title;
    if (body.description !== undefined) updates.description = body.description;
    if (body.ai_prompt !== undefined) updates.ai_prompt = body.ai_prompt;
    if (body.priority !== undefined) updates.priority = body.priority;
    if (body.status !== undefined) updates.status = body.status;
    if (body.blocked_reason !== undefined) updates.blocked_reason = body.blocked_reason;

    // Handle status-specific logic
    if (body.status) {
      // Starting a task
      if (body.status === 'in-progress' && task.status !== 'in-progress') {
        if (!task.started_date) {
          updates.started_date = new Date().toISOString();
        }
        await trackTaskStart(task.assigned_to_agent, params.id);
      }

      // Completing a task
      if (body.status === 'done' && task.status !== 'done') {
        updates.completed_date = new Date().toISOString();
        await trackTaskCompletion(task.assigned_to_agent, params.id, true);
      }

      // Blocking a task requires reason
      if (body.status === 'blocked' && !body.blocked_reason && !task.blocked_reason) {
        throw new ValidationError('blocked_reason is required when blocking a task');
      }
    }

    // Perform update
    const updated = await updateTask(params.id, updates);

    if (!updated) {
      throw new Error('Failed to update task');
    }

    PerformanceMonitor.end('update_task');

    return successResponse({
      task: updated,
      updated_fields: Object.keys(updates),
      message: 'Task updated successfully',
    });
  } catch (error) {
    PerformanceMonitor.end('update_task');
    throw error;
  }
}

export const PATCH = withErrorHandling(handler);
