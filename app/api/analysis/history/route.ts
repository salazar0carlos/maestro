/**
 * API Endpoint: Analysis History
 * GET /api/analysis/history?project_id=xxx&limit=10
 * Get analysis history for a project
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAnalysisHistoryService } from '@/lib/analysis-history';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const projectId = searchParams.get('project_id');
    const limit = parseInt(searchParams.get('limit') || '10');

    if (!projectId) {
      return NextResponse.json(
        { error: 'Missing required parameter: project_id' },
        { status: 400 }
      );
    }

    const historyService = getAnalysisHistoryService();
    const history = await historyService.getHistory(projectId, limit);

    return NextResponse.json({
      success: true,
      project_id: projectId,
      total: history.length,
      history,
    });
  } catch (error) {
    console.error('Error fetching analysis history:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
