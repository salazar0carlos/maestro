/**
 * API route: /api/database/export
 * GET - Export all data from database as JSON
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
      version: '0.2.0',
      exportDate: new Date().toISOString(),
      projects,
      tasks,
      agents,
      improvements,
      counts: {
        projects: projects.length,
        tasks: tasks.length,
        agents: agents.length,
        improvements: improvements.length,
      },
    });
  } catch (error) {
    console.error('[database/export] Error:', error);
    return NextResponse.json(
      { error: 'Failed to export data' },
      { status: 500 }
    );
  }
}
