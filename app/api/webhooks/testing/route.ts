/**
 * API route: POST /api/webhooks/testing
 *
 * Webhook endpoint for Testing Agent
 * Receives notifications about completed features that need testing
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  withErrorHandling,
  successResponse,
  parseJsonBody,
} from '@/lib/api-utils';
import { EventTypes, EventPayload } from '@/lib/event-system';
import { PerformanceMonitor } from '@/lib/performance';

const AGENT_NAME = 'testing';

async function handlePost(request: NextRequest): Promise<NextResponse> {
  PerformanceMonitor.start(`webhook_${AGENT_NAME}`);

  try {
    const payload = await parseJsonBody<EventPayload>(request);

    console.log(`[${AGENT_NAME}] Received event: ${payload.event}`);

    let action = 'acknowledged';

    switch (payload.event) {
      case EventTypes.TASK_COMPLETED:
        action = 'run_tests';
        console.log(`[${AGENT_NAME}] Task completed, running tests`);
        break;

      case EventTypes.TASK_ASSIGNED:
        if (payload.data.agent_id === AGENT_NAME) {
          action = 'create_test_suite';
          console.log(`[${AGENT_NAME}] Task assigned, creating test suite`);
        }
        break;

      case EventTypes.IMPROVEMENT_IMPLEMENTED:
        action = 'verify_improvement';
        console.log(`[${AGENT_NAME}] Improvement implemented, verifying`);
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
