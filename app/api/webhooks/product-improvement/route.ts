/**
 * API route: POST /api/webhooks/product-improvement
 *
 * Webhook endpoint for Product Improvement Agent
 * Receives notifications about tasks, improvements, and system events
 *
 * Request body:
 * {
 *   event: string,
 *   data: any,
 *   metadata: EventMetadata
 * }
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

const AGENT_NAME = 'product-improvement';

/**
 * POST /api/webhooks/product-improvement
 * Process webhook for product improvement agent
 */
async function handlePost(request: NextRequest): Promise<NextResponse> {
  PerformanceMonitor.start(`webhook_${AGENT_NAME}`);

  try {
    // Parse event payload
    const payload = await parseJsonBody<EventPayload>(request);

    console.log(
      `[${AGENT_NAME}] Received event: ${payload.event}`,
      payload.metadata
    );

    // Process different event types
    let action = 'acknowledged';

    switch (payload.event) {
      case EventTypes.TASK_COMPLETED:
        action = 'analyze_for_improvements';
        console.log(
          `[${AGENT_NAME}] Task completed, analyzing for improvement opportunities`
        );
        break;

      case EventTypes.AGENT_HEALTH_WARNING:
        action = 'suggest_optimization';
        console.log(`[${AGENT_NAME}] Agent health warning, suggesting optimizations`);
        break;

      case EventTypes.IMPROVEMENT_APPROVED:
        action = 'track_implementation';
        console.log(`[${AGENT_NAME}] Improvement approved, tracking implementation`);
        break;

      case EventTypes.SYSTEM_ERROR:
        action = 'analyze_error_pattern';
        console.log(`[${AGENT_NAME}] System error detected, analyzing patterns`);
        break;

      default:
        console.log(`[${AGENT_NAME}] Event received but no specific action defined`);
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
