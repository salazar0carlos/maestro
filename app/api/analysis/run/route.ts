/**
 * API Endpoint: Run Analysis
 * POST /api/analysis/run
 * Manually trigger analysis for a project
 *
 * TEMPORARY: Returns mock data while we stabilize the endpoint
 * TODO: Implement real analysis with Supabase integration
 */

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { project_id } = body;

    if (!project_id) {
      return NextResponse.json(
        { error: 'Missing required field: project_id' },
        { status: 400 }
      );
    }

    // Mock suggestions for now
    const mockSuggestions = [
      {
        id: 'suggestion-1',
        title: 'Add input validation to API endpoints',
        description: 'Implement comprehensive input validation for all API routes to prevent invalid data from being processed.',
        priority: 4,
        estimated_impact: 'high',
        category: 'security'
      },
      {
        id: 'suggestion-2',
        title: 'Optimize database queries',
        description: 'Add indexes to frequently queried fields and implement query result caching to improve performance.',
        priority: 3,
        estimated_impact: 'medium',
        category: 'performance'
      },
      {
        id: 'suggestion-3',
        title: 'Add unit tests for core functionality',
        description: 'Increase test coverage by adding unit tests for critical business logic components.',
        priority: 3,
        estimated_impact: 'medium',
        category: 'quality'
      }
    ];

    return NextResponse.json(
      {
        success: true,
        count: mockSuggestions.length,
        suggestions: mockSuggestions
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error running analysis:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      },
      { status: 500 }
    );
  }
}
