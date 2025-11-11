/**
 * Reassign Stuck Tasks API
 * Re-assigns tasks that have been stuck for too long
 */

import { NextResponse } from 'next/server';
import { TaskRouter } from '@/lib/task-assignment';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const results = await TaskRouter.reassignStuckTasks();

    return NextResponse.json({
      results,
      reassigned: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
    });
  } catch (error) {
    console.error('Error reassigning stuck tasks:', error);
    return NextResponse.json(
      { error: 'Failed to reassign stuck tasks' },
      { status: 500 }
    );
  }
}
