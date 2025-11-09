/**
 * Bull Board - Queue Monitoring Dashboard
 *
 * Provides real-time view of all task queues:
 * - Waiting, active, completed, failed jobs
 * - Retry attempts
 * - Job details and errors
 * - Queue management (pause, resume, clean)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { queues } from '@/lib/queue';

const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/api/queues');

createBullBoard({
  queues: Object.values(queues).map(queue => new BullMQAdapter(queue)),
  serverAdapter,
});

export async function GET(_request: NextRequest) {
  // This will be handled by Bull Board's UI
  // For now, return queue stats
  try {
    const stats = await Promise.all(
      Object.entries(queues).map(async ([name, queue]) => {
        const [waiting, active, completed, failed] = await Promise.all([
          queue.getWaitingCount(),
          queue.getActiveCount(),
          queue.getCompletedCount(),
          queue.getFailedCount(),
        ]);

        return {
          name,
          waiting,
          active,
          completed,
          failed,
          total: waiting + active + completed + failed,
        };
      })
    );

    return NextResponse.json({ success: true, queues: stats });

  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
