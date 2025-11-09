/**
 * API Endpoint: Run Analysis
 * POST /api/analysis/run
 * Manually trigger analysis for a project
 */

import { NextRequest, NextResponse } from 'next/server';
import { getContinuousAnalysisAgent } from '@/lib/continuous-analysis-agent';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { project_id, project_name, code_files, git_commit } = body;

    if (!project_id || !project_name) {
      return NextResponse.json(
        { error: 'Missing required fields: project_id, project_name' },
        { status: 400 }
      );
    }

    const anthropicApiKey = process.env.ANTHROPIC_API_KEY;
    if (!anthropicApiKey) {
      return NextResponse.json(
        { error: 'ANTHROPIC_API_KEY not configured' },
        { status: 500 }
      );
    }

    const agent = getContinuousAnalysisAgent();

    const result = await agent.runAnalysis({
      project_id,
      project_name,
      code_files,
      git_commit,
      anthropic_api_key: anthropicApiKey,
    });

    return NextResponse.json({
      success: true,
      analysis: result,
    });
  } catch (error) {
    console.error('Error running analysis:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
