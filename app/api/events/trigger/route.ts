/**
 * API route: POST /api/events/trigger
 *
 * Triggers events in the event bus
 * Validates event type and emits to all registered handlers
 *
 * Request body:
 * {
 *   event: string,
 *   data: any,
 *   source?: string
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  withErrorHandling,
  successResponse,
  parseJsonBody,
  ValidationError,
} from '@/lib/api-utils';
import { EventBus, EventTypes } from '@/lib/event-system';
import { PerformanceMonitor } from '@/lib/performance';

export const dynamic = 'force-dynamic';

/**
 * Valid event types (all from EventTypes constant)
 */
const VALID_EVENTS: Set<string> = new Set(Object.values(EventTypes));

/**
 * POST /api/events/trigger
 * Trigger an event
 */
async function handlePost(request: NextRequest): Promise<NextResponse> {
  PerformanceMonitor.start('trigger_event');

  try {
    // Parse request body
    const body = await parseJsonBody<{
      event: string;
      data: any;
      source?: string;
    }>(request);

    // Validate event
    if (!body.event) {
      throw new ValidationError('event field is required');
    }

    if (typeof body.event !== 'string') {
      throw new ValidationError('event must be a string');
    }

    // Warn if event is not a known type
    if (!VALID_EVENTS.has(body.event)) {
      console.warn(
        `⚠️ Unknown event type: "${body.event}". Known types: ${Array.from(VALID_EVENTS).join(', ')}`
      );
    }

    // Validate data exists
    if (body.data === undefined) {
      throw new ValidationError('data field is required');
    }

    const source = body.source || 'api';

    // Emit event
    await EventBus.emit(body.event, body.data, source);

    // Get stats for this event
    const listenerCount = EventBus.getListenerCount(body.event);

    PerformanceMonitor.end('trigger_event');

    return successResponse({
      event: body.event,
      source,
      listeners_notified: listenerCount,
      message: `Event triggered successfully`,
    });
  } catch (error) {
    PerformanceMonitor.end('trigger_event');
    throw error;
  }
}

export const POST = withErrorHandling(handlePost);
