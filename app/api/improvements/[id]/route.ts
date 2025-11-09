/**
 * API route: /api/improvements/[id]
 *
 * GET - Get improvement suggestion details
 * PATCH - Update improvement (approve, reject, mark as implemented)
 *
 * PATCH Request body:
 * {
 *   status: 'approved' | 'rejected' | 'implemented',
 *   rejection_reason?: string (required if status is 'rejected'),
 *   reviewed_by?: string,
 *   convert_to_task?: boolean (if approved, optionally convert to task)
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getImprovement,
  updateImprovement,
  createTask,
  getProject,
} from '@/lib/storage-adapter';
import { ImprovementSuggestion, MaestroTask } from '@/lib/types';
import {
  withErrorHandling,
  successResponse,
  NotFoundError,
  parseJsonBody,
  ValidationError,
  validationErrorResponse,
} from '@/lib/api-utils';
import { validateImprovementUpdate } from '@/lib/validation';
import { PerformanceMonitor } from '@/lib/performance';

/**
 * Generate a simple unique ID
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * GET /api/improvements/[id]
 */
async function handleGet(
  _request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  PerformanceMonitor.start('get_improvement');

  try {
    const improvement = await getImprovement(params.id);
    if (!improvement) {
      throw new NotFoundError('Improvement suggestion');
    }

    PerformanceMonitor.end('get_improvement');

    return successResponse(improvement);
  } catch (error) {
    PerformanceMonitor.end('get_improvement');
    throw error;
  }
}

/**
 * PATCH /api/improvements/[id]
 * Update improvement status (approve, reject, implement)
 */
async function handlePatch(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  PerformanceMonitor.start('update_improvement');

  try {
    const improvement = await getImprovement(params.id);
    if (!improvement) {
      throw new NotFoundError('Improvement suggestion');
    }

    // Parse request body
    const body = await parseJsonBody<any>(request);

    // Validate
    const validation = validateImprovementUpdate(body);
    if (!validation.valid) {
      return validationErrorResponse(validation);
    }

    // Build updates
    const updates: Partial<ImprovementSuggestion> = {};

    if (body.status) {
      updates.status = body.status;
      updates.reviewed_date = new Date().toISOString();

      // Handle rejection
      if (body.status === 'rejected') {
        if (!body.rejection_reason && !improvement.rejection_reason) {
          throw new ValidationError(
            'rejection_reason is required when rejecting an improvement'
          );
        }
        if (body.rejection_reason) {
          updates.rejection_reason = body.rejection_reason;
        }
      }
    }

    if (body.reviewed_by) {
      updates.reviewed_by = body.reviewed_by;
    }

    // Convert to task if approved and requested
    let createdTask: MaestroTask | null = null;
    if (body.status === 'approved' && body.convert_to_task === true) {
      // Verify project exists
      const project = await getProject(improvement.project_id);
      if (!project) {
        throw new NotFoundError('Project');
      }

      // Create task from improvement
      const taskId = `task-${generateId()}`;
      const newTask: MaestroTask = {
        task_id: taskId,
        project_id: improvement.project_id,
        title: improvement.title,
        description: improvement.description || '',
        ai_prompt: `Implement the following improvement:\n\n${improvement.description || improvement.title}`,
        assigned_to_agent: improvement.suggested_by === 'system'
          ? 'unassigned'
          : improvement.suggested_by,
        priority: improvement.priority,
        status: 'todo',
        created_date: new Date().toISOString(),
      };

      createdTask = await createTask(newTask);
      updates.converted_to_task_id = taskId;
      updates.status = 'implemented';
    }

    // Perform update
    const updated = await updateImprovement(params.id, updates);
    if (!updated) {
      throw new Error('Failed to update improvement');
    }

    PerformanceMonitor.end('update_improvement');

    const response: any = {
      improvement: updated,
      updated_fields: Object.keys(updates),
      message: 'Improvement updated successfully',
    };

    if (createdTask) {
      response.created_task = createdTask;
      response.message = 'Improvement approved and converted to task';
    }

    return successResponse(response);
  } catch (error) {
    PerformanceMonitor.end('update_improvement');
    throw error;
  }
}

export const GET = withErrorHandling(handleGet);
export const PATCH = withErrorHandling(handlePatch);
