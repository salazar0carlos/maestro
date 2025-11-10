import { NextResponse } from 'next/server';
import { getProjects } from '@/lib/storage-adapter';
import { requireAuth } from '@/lib/auth-helpers';

export const dynamic = 'force-dynamic';

/**
 * GET /api/projects
 * Fetches all projects for the authenticated user
 * PROTECTED: Requires authentication
 */
export async function GET() {
  try {
    // Verify user is authenticated (throws if not)
    await requireAuth();

    // Fetch projects - RLS will automatically filter by user_id
    const projects = await getProjects();

    return NextResponse.json(projects, { status: 200 });
  } catch (error) {
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'You must be logged in to view projects' },
        { status: 401 }
      );
    }

    console.error('Error fetching projects:', error);
    return NextResponse.json(
      { error: 'Failed to fetch projects', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
