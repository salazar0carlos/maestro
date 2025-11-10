/**
 * API route: /api/agents
 *
 * GET - List all agents with optional filtering
 * POST - Register a new agent
 *
 * Query parameters for GET:
 * - project_id: Filter by project
 * - status: Filter by status (active, idle, offline)
 * - with_stats: Include detailed statistics (true/false)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAgents, getProjectAgents, createAgent } from '@/lib/storage-adapter';
import { Agent } from '@/lib/types';
import {
  withErrorHandling,
  successResponse,
  parseJsonBody,
  getQueryParam,
  validationErrorResponse,
} from '@/lib/api-utils';
import { validateAgent } from '@/lib/validation';
import { getAgentStatistics, getProjectAgentStatistics } from '@/lib/agent-stats';
import { PerformanceMonitor } from '@/lib/performance';

export const dynamic = 'force-dynamic';

/**
 * Generate a simple unique ID
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * GET /api/agents
 * List all agents with optional filtering and stats
 */
async function handleGet(request: NextRequest): Promise<NextResponse> {
  PerformanceMonitor.start('list_agents');

  try {
    const projectId = getQueryParam(request, 'project_id');
    const status = getQueryParam(request, 'status');
    const withStats = getQueryParam(request, 'with_stats') === 'true';

    // Get agents
    let agents = projectId ? await getProjectAgents(projectId) : await getAgents();

    // Filter by status
    if (status) {
      agents = agents.filter(a => a.status === status);
    }

    // Add statistics if requested
    let result;
    if (withStats) {
      if (projectId) {
        result = await getProjectAgentStatistics(projectId);
        if (status) {
          result = result.filter(a => a.status === status);
        }
      } else {
        result = await Promise.all(
          agents.map(agent => getAgentStatistics(agent.agent_id))
        ).then(stats => stats.filter(Boolean));
      }
    } else {
      result = agents;
    }

    PerformanceMonitor.end('list_agents');

    return successResponse({
      total: result.length,
      agents: result,
      filters: {
        project_id: projectId,
        status,
        with_stats: withStats,
      },
    });
  } catch (error) {
    PerformanceMonitor.end('list_agents');
    throw error;
  }
}

/**
 * POST /api/agents
 * Register a new agent
 */
async function handlePost(request: NextRequest): Promise<NextResponse> {
  PerformanceMonitor.start('create_agent');

  try {
    // Parse request body
    const body = await parseJsonBody<Partial<Agent>>(request);

    // Validate
    const validation = validateAgent(body);
    if (!validation.valid) {
      return validationErrorResponse(validation);
    }

    // Generate agent ID
    const agentId = body.agent_id || `agent-${generateId()}`;

    // Create agent object
    const newAgent: Agent = {
      agent_id: agentId,
      project_id: body.project_id!,
      agent_name: body.agent_name!,
      status: body.status || 'idle',
      tasks_completed: 0,
      tasks_in_progress: 0,
      last_poll_date: new Date().toISOString(),
    };

    // Save to storage
    const created = await createAgent(newAgent);

    PerformanceMonitor.end('create_agent');

    return successResponse(
      {
        agent: created,
        message: 'Agent registered successfully',
      },
      201
    );
  } catch (error) {
    PerformanceMonitor.end('create_agent');
    throw error;
  }
}

// Export handlers with error handling
export const GET = withErrorHandling(handleGet);
export const POST = withErrorHandling(handlePost);
