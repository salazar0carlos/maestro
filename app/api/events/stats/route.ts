/**
 * API route: GET /api/events/stats
 *
 * Get event bus statistics and history
 *
 * Query parameters:
 * - event: Filter by event type
 * - source: Filter by source
 * - limit: Limit number of history records
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  withErrorHandling,
  successResponse,
  getQueryParam,
} from '@/lib/api-utils';
import { EventBus } from '@/lib/event-system';
import { PerformanceMonitor } from '@/lib/performance';

/**
 * GET /api/events/stats
 */
async function handleGet(request: NextRequest): Promise<NextResponse> {
  PerformanceMonitor.start('get_event_stats');

  try {
    const eventFilter = getQueryParam(request, 'event') || undefined;
    const sourceFilter = getQueryParam(request, 'source') || undefined;
    const limitStr = getQueryParam(request, 'limit');
    const limit = limitStr ? parseInt(limitStr, 10) : undefined;

    // Get overall stats
    const stats = EventBus.getStats();

    // Get history with filters
    const history = EventBus.getHistory({
      event: eventFilter,
      source: sourceFilter,
      limit: limit || 50,
    });

    // Get failed events
    const failedEvents = EventBus.getFailedEvents(10);

    // Get registered event types
    const eventTypes = EventBus.getEventTypes();

    PerformanceMonitor.end('get_event_stats');

    return successResponse({
      stats,
      history,
      failed_events: failedEvents,
      registered_event_types: eventTypes,
    });
  } catch (error) {
    PerformanceMonitor.end('get_event_stats');
    throw error;
  }
}

export const GET = withErrorHandling(handleGet);
