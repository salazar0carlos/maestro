/**
 * API Route: Analyze Project and Generate Improvement Suggestions
 * POST /api/analyze
 */

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectId, files, anthropicApiKey } = body;

    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      );
    }

    if (!files || !Array.isArray(files)) {
      return NextResponse.json(
        { error: 'Files array is required' },
        { status: 400 }
      );
    }

    if (!anthropicApiKey) {
      return NextResponse.json(
        { error: 'Anthropic API key is required' },
        { status: 400 }
      );
    }

    // Import analysis engine and suggestion generator
    const { AnalysisEngine } = await import('@/lib/analysis-engine.js');
    const { SuggestionGenerator } = await import('@/lib/suggestion-generator.js');
    const { createSuggestions } = await import('@/lib/storage');

    // Step 1: Analyze codebase
    const analysisReport = AnalysisEngine.analyzeCodebase(files) as any;

    // Step 2: Generate suggestions using AI
    const generator = new SuggestionGenerator(anthropicApiKey);
    const suggestions = await generator.generateWithRetry(analysisReport, projectId, 3);

    // Step 3: Save suggestions to storage
    // Cast to ImprovementSuggestion[] since the generator returns properly typed objects
    const savedSuggestions = createSuggestions(suggestions as any);

    return NextResponse.json({
      success: true,
      analysisReport: {
        summary: analysisReport.summary,
        filesAnalyzed: files.length,
      },
      suggestionsCount: savedSuggestions.length,
      suggestions: savedSuggestions,
    });
  } catch (error) {
    console.error('Error analyzing project:', error);
    return NextResponse.json(
      {
        error: 'Failed to analyze project',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
