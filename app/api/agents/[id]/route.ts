/**
 * API route: /api/agents/[id]
 *
 * GET - Get agent information and statistics
 * PATCH - Update agent status or metadata
 *
 * Shows tasks assigned, completed count, current status
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAgent, getTasks } from '@/lib/storage-adapter';
import { getAgent, updateAgent } from '@/lib/storage';
import { Agent } from '@/lib/types';
import {
  withErrorHandling,
  successResponse,
  NotFoundError,
  parseJsonBody,
  getQueryParam,
} from '@/lib/api-utils';
import { getAgentStatistics, checkAgentHealth } from '@/lib/agent-stats';
import { PerformanceMonitor } from '@/lib/performance';

/**
 * GET /api/agents/[id]
 */
async function handleGet(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  PerformanceMonitor.start('get_agent');

  try {
    const agent = await getAgent(params.id);
    const withStats = getQueryParam(request, 'with_stats') === 'true';
    const checkHealth = getQueryParam(request, 'check_health') === 'true';

    const agent = getAgent(params.id);
    if (!agent) {
      throw new NotFoundError('Agent');
    }

    let result: any = agent;

    // Add detailed statistics if requested
    if (withStats) {
      const stats = getAgentStatistics(params.id);
      result = stats || agent;
    }

    // Add health check if requested
    if (checkHealth) {
      const health = checkAgentHealth(params.id);
      result = { ...result, health };
    }

    PerformanceMonitor.end('get_agent');

    return successResponse(result);
  } catch (error) {
    PerformanceMonitor.end('get_agent');
    throw error;
  }
}

/**
 * PATCH /api/agents/[id]
 * Update agent status or metadata
 */
async function handlePatch(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  PerformanceMonitor.start('update_agent');

  try {
    const agent = getAgent(params.id);
    if (!agent) {
      throw new NotFoundError('Agent');
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
    // Parse request body
    const body = await parseJsonBody<Partial<Agent>>(request);

    // Build updates object with allowed fields
    const updates: Partial<Agent> = {};

    if (body.status !== undefined) {
      updates.status = body.status;
    }

    if (body.agent_name !== undefined) {
      updates.agent_name = body.agent_name;
    }

    // Update last poll date
    updates.last_poll_date = new Date().toISOString();

    // Perform update
    const updated = updateAgent(params.id, updates);
    if (!updated) {
      throw new Error('Failed to update agent');
    }

    PerformanceMonitor.end('update_agent');

    return successResponse({
      agent: updated,
      updated_fields: Object.keys(updates),
      message: 'Agent updated successfully',
    });
  } catch (error) {
    PerformanceMonitor.end('update_agent');
    throw error;
  }
}

export const GET = withErrorHandling(handleGet);
export const PATCH = withErrorHandling(handlePatch);
