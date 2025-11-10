/**
 * API route: /api/analytics/costs
 *
 * GET - Get cost statistics and records
 * POST - Track a new API call cost
 *
 * Query parameters for GET:
 * - agent_id: Filter by agent
 * - task_id: Filter by task
 * - model: Filter by model
 * - from_date: Filter from date (ISO string)
 * - to_date: Filter to date (ISO string)
 * - limit: Limit number of records
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  withErrorHandling,
  successResponse,
  parseJsonBody,
  getQueryParam,
  validationErrorResponse,
} from '@/lib/api-utils';
import { CostTracker } from '@/lib/cost-tracking';
import { PerformanceMonitor } from '@/lib/performance';
import { validate } from '@/lib/validation';

export const dynamic = 'force-dynamic';

/**
 * POST body validation schema
 */
const trackCostSchema = {
  agent_id: {
    type: 'string' as const,
    required: true,
    minLength: 1,
  },
  model: {
    type: 'string' as const,
    required: true,
    minLength: 1,
  },
  tokens_input: {
    type: 'number' as const,
    required: true,
    min: 0,
  },
  tokens_output: {
    type: 'number' as const,
    required: true,
    min: 0,
  },
  operation: {
    type: 'string' as const,
    required: true,
    minLength: 1,
  },
  task_id: {
    type: 'string' as const,
    required: false,
  },
  duration_ms: {
    type: 'number' as const,
    required: false,
    min: 0,
  },
};

/**
 * GET /api/analytics/costs
 * Get cost statistics and records
 */
async function handleGet(request: NextRequest): Promise<NextResponse> {
  PerformanceMonitor.start('get_costs');

  try {
    const agentId = getQueryParam(request, 'agent_id') || undefined;
    const taskId = getQueryParam(request, 'task_id') || undefined;
    const model = getQueryParam(request, 'model') || undefined;
    const fromDate = getQueryParam(request, 'from_date') || undefined;
    const toDate = getQueryParam(request, 'to_date') || undefined;
    const limitStr = getQueryParam(request, 'limit');
    const limit = limitStr ? parseInt(limitStr, 10) : undefined;

    // Get records with filters
    const records = CostTracker.getRecords({
      agent_id: agentId,
      task_id: taskId,
      model,
      from_date: fromDate,
      to_date: toDate,
      limit,
    });

    // Get statistics with filters
    const stats = CostTracker.getStats({
      agent_id: agentId,
      from_date: fromDate,
      to_date: toDate,
    });

    // Get most expensive operations
    const mostExpensive = CostTracker.getMostExpensive(10);

    // Get cost trend
    const trend = CostTracker.getCostTrend(7);

    PerformanceMonitor.end('get_costs');

    return successResponse({
      stats,
      records,
      most_expensive: mostExpensive,
      trend,
      filters: {
        agent_id: agentId,
        task_id: taskId,
        model,
        from_date: fromDate,
        to_date: toDate,
        limit,
      },
    });
  } catch (error) {
    PerformanceMonitor.end('get_costs');
    throw error;
  }
}

/**
 * POST /api/analytics/costs
 * Track a new API call cost
 */
async function handlePost(request: NextRequest): Promise<NextResponse> {
  PerformanceMonitor.start('track_cost');

  try {
    // Parse request body
    const body = await parseJsonBody(request);

    // Validate
    const validation = validate(body, trackCostSchema);
    if (!validation.valid) {
      return validationErrorResponse(validation);
    }

    // Track the cost
    const record = CostTracker.trackAPICall({
      agent_id: body.agent_id,
      model: body.model,
      tokens_input: body.tokens_input,
      tokens_output: body.tokens_output,
      operation: body.operation,
      task_id: body.task_id,
      duration_ms: body.duration_ms,
      success: body.success !== false,
      error: body.error,
    });

    PerformanceMonitor.end('track_cost');

    return successResponse(
      {
        record,
        message: 'Cost tracked successfully',
      },
      201
    );
  } catch (error) {
    PerformanceMonitor.end('track_cost');
    throw error;
  }
}

export const GET = withErrorHandling(handleGet);
export const POST = withErrorHandling(handlePost);
