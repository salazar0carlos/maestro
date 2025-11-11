/**
 * Task Assignment API
 * Assigns a task to the best available agent
 */

import { NextRequest, NextResponse } from 'next/server';
import { TaskRouter } from '@/lib/task-assignment';
import { getTask } from '@/lib/storage-adapter';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { taskId } = body;

    if (!taskId) {
      return NextResponse.json(
        { error: 'taskId is required' },
        { status: 400 }
      );
    }

    const task = await getTask(taskId);

    if (!task) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }

    const result = TaskRouter.assignTaskToAgent(task);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error assigning task:', error);
    return NextResponse.json(
      { error: 'Failed to assign task' },
      { status: 500 }
    );
  }
}
