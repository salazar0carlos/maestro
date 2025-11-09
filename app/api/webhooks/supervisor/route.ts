/**
 * API route: POST /api/webhooks/supervisor
 *
 * Webhook endpoint for Supervisor Agent
 * Receives notifications about all system events for orchestration
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  withErrorHandling,
  successResponse,
  parseJsonBody,
} from '@/lib/api-utils';
import { EventTypes, EventPayload } from '@/lib/event-system';
import { PerformanceMonitor } from '@/lib/performance';

const AGENT_NAME = 'supervisor';

async function handlePost(request: NextRequest): Promise<NextResponse> {
  PerformanceMonitor.start(`webhook_${AGENT_NAME}`);

  try {
    const payload = await parseJsonBody<EventPayload>(request);

    console.log(`[${AGENT_NAME}] Received event: ${payload.event}`);

    let action = 'acknowledged';

    switch (payload.event) {
      case EventTypes.TASK_FAILED:
        action = 'reassign_or_escalate';
        console.log(`[${AGENT_NAME}] Task failed, determining next action`);
        break;

      case EventTypes.AGENT_ERROR:
        action = 'monitor_agent_health';
        console.log(`[${AGENT_NAME}] Agent error detected, monitoring health`);
        break;

      case EventTypes.AGENT_HEALTH_WARNING:
        action = 'redistribute_workload';
        console.log(`[${AGENT_NAME}] Agent health warning, considering redistribution`);
        break;

      case EventTypes.PROJECT_CREATED:
        action = 'initialize_workflow';
        console.log(`[${AGENT_NAME}] New project, initializing workflow`);
        break;

      case EventTypes.PERFORMANCE_ALERT:
        action = 'optimize_system';
        console.log(`[${AGENT_NAME}] Performance alert, optimizing system`);
        break;

      default:
        action = 'log_and_monitor';
        console.log(`[${AGENT_NAME}] Event logged: ${payload.event}`);
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
