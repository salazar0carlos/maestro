/**
 * API route: POST /api/webhooks/frontend
 *
 * Webhook endpoint for Frontend Agent
 * Receives notifications about UI-related tasks and improvements
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  withErrorHandling,
  successResponse,
  parseJsonBody,
} from '@/lib/api-utils';
import { EventTypes, EventPayload } from '@/lib/event-system';
import { PerformanceMonitor } from '@/lib/performance';

const AGENT_NAME = 'frontend';

async function handlePost(request: NextRequest): Promise<NextResponse> {
  PerformanceMonitor.start(`webhook_${AGENT_NAME}`);

  try {
    const payload = await parseJsonBody<EventPayload>(request);

    console.log(`[${AGENT_NAME}] Received event: ${payload.event}`);

    let action = 'acknowledged';

    switch (payload.event) {
      case EventTypes.TASK_ASSIGNED:
        if (payload.data.agent_id === AGENT_NAME) {
          action = 'poll_and_execute';
          console.log(`[${AGENT_NAME}] Task assigned, polling for details`);
        }
        break;

      case EventTypes.IMPROVEMENT_SUGGESTED:
        action = 'review_ui_impact';
        console.log(`[${AGENT_NAME}] Reviewing improvement for UI impact`);
        break;

      case EventTypes.PROJECT_CREATED:
        action = 'setup_frontend_scaffold';
        console.log(`[${AGENT_NAME}] New project created, preparing frontend setup`);
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
