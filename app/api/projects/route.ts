import { NextResponse } from 'next/server';
import { getProjects } from '@/lib/storage-adapter';

/**
 * GET /api/projects
 * Fetches all projects from the database
 */
export async function GET() {
  try {
    const projects = await getProjects();

    return NextResponse.json(projects, { status: 200 });
  } catch (error) {
    console.error('Error fetching projects:', error);
    return NextResponse.json(
      { error: 'Failed to fetch projects', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
