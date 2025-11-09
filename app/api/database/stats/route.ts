/**
 * API route: /api/database/stats
 * GET - Get database statistics (counts)
 */

import { NextResponse } from 'next/server';
import {
  getProjects,
  getTasks,
  getAgents,
  getImprovements,
} from '@/lib/storage-adapter';

export async function GET() {
  try {
    const [projects, tasks, agents, improvements] = await Promise.all([
      getProjects(),
      getTasks(),
      getAgents(),
      getImprovements(),
    ]);

    return NextResponse.json({
      projects: projects.length,
      tasks: tasks.length,
      agents: agents.length,
      improvements: improvements.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[database/stats] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch database stats' },
      { status: 500 }
    );
  }
}
