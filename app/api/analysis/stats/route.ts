/**
 * API Endpoint: Analysis Statistics
 * GET /api/analysis/stats?project_id=xxx&days=30
 * Get comprehensive analysis statistics for a project
 */

import { NextRequest, NextResponse } from 'next/server';
import { getContinuousAnalysisAgent } from '@/lib/continuous-analysis-agent';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const projectId = searchParams.get('project_id');
    const days = parseInt(searchParams.get('days') || '30');

    if (!projectId) {
      return NextResponse.json(
        { error: 'Missing required parameter: project_id' },
        { status: 400 }
      );
    }

    const agent = getContinuousAnalysisAgent();
    const stats = await agent.getProjectStats(projectId, days);

    return NextResponse.json({
      success: true,
      project_id: projectId,
      days,
      stats,
    });
  } catch (error) {
    console.error('Error fetching analysis stats:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
