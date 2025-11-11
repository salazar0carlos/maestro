/**
 * API route: POST /api/webhooks/research
 *
 * Webhook endpoint for Research Agent
 * Receives notifications about research tasks and knowledge gathering
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  withErrorHandling,
  successResponse,
  parseJsonBody,
} from '@/lib/api-utils';
import { EventTypes, EventPayload } from '@/lib/event-system';
import { PerformanceMonitor } from '@/lib/performance';

export const dynamic = 'force-dynamic';

const AGENT_NAME = 'research';

async function handlePost(request: NextRequest): Promise<NextResponse> {
  PerformanceMonitor.start(`webhook_${AGENT_NAME}`);

  try {
    const payload = await parseJsonBody<EventPayload>(request);

    console.log(`[${AGENT_NAME}] Received event: ${payload.event}`);

    let action = 'acknowledged';

    switch (payload.event) {
      case EventTypes.TASK_ASSIGNED:
        if (payload.data.agent_id === AGENT_NAME) {
          action = 'start_research';
          console.log(`[${AGENT_NAME}] Task assigned, starting research`);
        }
        break;

      case EventTypes.PROJECT_CREATED:
        action = 'gather_requirements';
        console.log(`[${AGENT_NAME}] New project, gathering requirements`);
        break;

      case EventTypes.IMPROVEMENT_SUGGESTED:
        action = 'research_feasibility';
        console.log(`[${AGENT_NAME}] Researching improvement feasibility`);
        break;

      default:
        console.log(`[${AGENT_NAME}] Event received: ${payload.event}`);
    }

    PerformanceMonitor.end(`webhook_${AGENT_NAME}`);

    return successResponse({
      agent: AGENT_NAME,
      event: payload.event,
      action,
      processed_at: new Date().toISOString(),
    });
  } catch (error) {
    PerformanceMonitor.end(`webhook_${AGENT_NAME}`);
    throw error;
  }
}

export const POST = withErrorHandling(handlePost);
