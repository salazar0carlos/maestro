import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/tasks/:id/update-from-worker
 *
 * Allows BullMQ workers to update task status
 * Workers run server-side and can't access localStorage directly
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const taskId = params.id;
    const body = await request.json();

    const { status, result, error, progress } = body;

    // Return the update data - client will need to apply it to localStorage
    // This endpoint serves as a bridge between server-side workers and client-side storage
    return NextResponse.json({
      success: true,
      taskId,
      update: {
        status,
        result,
        error,
        progress,
        updated_at: new Date().toISOString(),
      },
    });

  } catch (error) {
    console.error('[update-from-worker] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
