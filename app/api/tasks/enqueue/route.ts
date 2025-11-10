import { NextRequest, NextResponse } from 'next/server';
import { enqueueTask } from '@/lib/queue';
import type { MaestroTask } from '@/lib/types';

export const dynamic = 'force-dynamic';

/**
 * POST /api/tasks/enqueue
 *
 * Enqueue a task for execution by BullMQ workers
 * Replaces webhook-based triggering with queue-based architecture
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { task, taskId, agentType } = body;

    if (!task || !taskId) {
      return NextResponse.json(
        { success: false, error: 'Missing task or taskId' },
        { status: 400 }
      );
    }

    // Ensure task has agent type
    const taskWithType: MaestroTask = {
      ...task,
      assigned_to_agent_type: task.assigned_to_agent_type || agentType,
    };

    // Enqueue task
    await enqueueTask(taskWithType);

    console.log(`[enqueue] Task ${taskId} added to ${agentType} queue`);

    return NextResponse.json({
      success: true,
      taskId,
      agentType: taskWithType.assigned_to_agent_type,
      message: 'Task enqueued successfully',
    });

  } catch (error) {
    console.error('[enqueue] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to enqueue task',
      },
      { status: 500 }
    );
  }
}
