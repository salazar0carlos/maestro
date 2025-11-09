/**
 * API route: /api/improvements
 *
 * GET - List improvement suggestions with filtering
 * POST - Create a new improvement suggestion
 *
 * Query parameters for GET:
 * - project_id: Filter by project (required)
 * - status: Filter by status (pending, approved, rejected, implemented)
 * - suggested_by: Filter by agent who suggested
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getProjectImprovements,
  getImprovementsByStatus,
  createImprovement,
} from '@/lib/storage-adapter';
import { ImprovementSuggestion } from '@/lib/types';
import {
  withErrorHandling,
  successResponse,
  parseJsonBody,
  getQueryParam,
  validationErrorResponse,
  ValidationError,
} from '@/lib/api-utils';
import { validateImprovement } from '@/lib/validation';
import { PerformanceMonitor } from '@/lib/performance';

/**
 * Generate a simple unique ID
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * GET /api/improvements
 * List improvement suggestions with filtering
 */
async function handleGet(request: NextRequest): Promise<NextResponse> {
  PerformanceMonitor.start('list_improvements');

  try {
    const projectId = getQueryParam(request, 'project_id');
    const status = getQueryParam(request, 'status');
    const suggestedBy = getQueryParam(request, 'suggested_by');

    // Project ID is required for filtering
    if (!projectId) {
      throw new ValidationError('project_id query parameter is required');
    }

    // Get improvements based on filters
    let improvements: ImprovementSuggestion[];

    if (status) {
      improvements = await getImprovementsByStatus(projectId, status);
    } else {
      improvements = await getProjectImprovements(projectId);
    }

    // Filter by suggested_by if provided
    if (suggestedBy) {
      improvements = improvements.filter(i => i.suggested_by === suggestedBy);
    }

    // Sort by priority (1 = highest) and date
    improvements = improvements.sort((a, b) => {
      if (a.priority !== b.priority) {
        return a.priority - b.priority;
      }
      return new Date(b.created_date).getTime() - new Date(a.created_date).getTime();
    });

    PerformanceMonitor.end('list_improvements');

    return successResponse({
      total: improvements.length,
      improvements,
      filters: {
        project_id: projectId,
        status,
        suggested_by: suggestedBy,
      },
    });
  } catch (error) {
    PerformanceMonitor.end('list_improvements');
    throw error;
  }
}

/**
 * POST /api/improvements
 * Create a new improvement suggestion
 */
async function handlePost(request: NextRequest): Promise<NextResponse> {
  PerformanceMonitor.start('create_improvement');

  try {
    // Parse request body
    const body = await parseJsonBody<Partial<ImprovementSuggestion>>(request);

    // Validate
    const validation = validateImprovement(body);
    if (!validation.valid) {
      return validationErrorResponse(validation);
    }

    // Generate improvement ID
    const improvementId = body.improvement_id || `improvement-${generateId()}`;

    // Create improvement object
    const newImprovement: ImprovementSuggestion = {
      improvement_id: improvementId,
      project_id: body.project_id!,
      title: body.title!,
      description: body.description!,
      suggested_by: body.suggested_by!,
      status: 'pending',
      priority: body.priority || 3,
      estimated_impact: body.estimated_impact || 'medium',
      created_date: new Date().toISOString(),
    };

    // Save to storage
    const created = await createImprovement(newImprovement);

    PerformanceMonitor.end('create_improvement');

    return successResponse(
      {
        improvement: created,
        message: 'Improvement suggestion created successfully',
      },
      201
    );
  } catch (error) {
    PerformanceMonitor.end('create_improvement');
    throw error;
  }
}

// Export handlers with error handling
export const GET = withErrorHandling(handleGet);
export const POST = withErrorHandling(handlePost);
