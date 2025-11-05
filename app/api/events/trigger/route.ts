/**
 * API Route: Trigger Event
 * POST /api/events/trigger
 *
 * Event-driven architecture endpoint
 * Accepts event triggers and dispatches them through the event system
 */

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { eventType, payload } = body;

    if (!eventType) {
      return NextResponse.json(
        { error: 'Event type is required' },
        { status: 400 }
      );
    }

    // Dynamic import to avoid build issues
    const { EventSystem } = await import('@/lib/event-system.js');

    // Trigger the event
    console.log(`[EventTrigger] Triggering event: ${eventType}`);

    // Fire and forget - don't wait for completion
    EventSystem.emit(eventType, payload || {});

    return NextResponse.json({
      success: true,
      message: `Event '${eventType}' triggered successfully`,
      eventType,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error triggering event:', error);
    return NextResponse.json(
      {
        error: 'Failed to trigger event',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint to view event stats and history
 */
export async function GET() {
  try {
    const { EventSystem } = await import('@/lib/event-system.js');

    const stats = EventSystem.getStats();
    const recentEvents = EventSystem.getHistory(undefined, 50);

    return NextResponse.json({
      success: true,
      stats,
      recentEvents,
    });
  } catch (error) {
    console.error('Error getting event stats:', error);
    return NextResponse.json(
      {
        error: 'Failed to get event stats',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
