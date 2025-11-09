/**
 * API Endpoint: Run Analysis
 * POST /api/analysis/run
 * Manually trigger analysis for a project
 */

import { NextRequest, NextResponse } from 'next/server';
import { getContinuousAnalysisAgent } from '@/lib/continuous-analysis-agent';
import { createImprovement } from '@/lib/storage';
import { ImprovementSuggestion } from '@/lib/types';

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

    // Convert suggestions to ImprovementSuggestion format and save to storage
    let newSuggestionsCount = 0;
    if (result.suggestions && result.suggestions.length > 0) {
      for (const suggestion of result.suggestions) {
        // Ensure priority is a valid TaskPriority (1-5)
        const priority = suggestion.priority &&
          suggestion.priority >= 1 &&
          suggestion.priority <= 5
            ? (suggestion.priority as 1 | 2 | 3 | 4 | 5)
            : 3 as const;

        const improvement: ImprovementSuggestion = {
          improvement_id: `improvement-${suggestion.id}`,
          project_id,
          title: suggestion.title,
          description: suggestion.description,
          suggested_by: 'ContinuousAnalysisAgent',
          status: 'pending',
          priority,
          estimated_impact: suggestion.estimated_impact || 'medium',
          created_date: new Date().toISOString(),
        };

        createImprovement(improvement);
        newSuggestionsCount++;
      }
    }

    return NextResponse.json({
      success: true,
      suggestions_created: newSuggestionsCount,
      analysis_id: result.analysis_id,
      execution_time_ms: result.execution_time_ms,
    });
  } catch (error) {
    console.error('Error running analysis:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
