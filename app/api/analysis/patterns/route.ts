/**
 * API Endpoint: Pattern Library
 * GET /api/analysis/patterns?type=approved&limit=20
 * POST /api/analysis/patterns (add new pattern)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPatternLibrary } from '@/lib/pattern-library';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type') as 'approved' | 'rejected' | null;
    const limit = parseInt(searchParams.get('limit') || '20');

    const patternLibrary = getPatternLibrary();

    if (type) {
      const patterns = await patternLibrary.getPatternsByType(type, limit);
      return NextResponse.json({
        success: true,
        type,
        total: patterns.length,
        patterns,
      });
    } else {
      const stats = await patternLibrary.getStats();
      return NextResponse.json({
        success: true,
        stats,
      });
    }
  } catch (error) {
    console.error('Error fetching patterns:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { pattern_name, pattern_type, description, code_example, context } = body;

    if (!pattern_name || !pattern_type || !description || !code_example) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (!['approved', 'rejected'].includes(pattern_type)) {
      return NextResponse.json(
        { error: 'Invalid pattern_type. Must be "approved" or "rejected"' },
        { status: 400 }
      );
    }

    const patternLibrary = getPatternLibrary();
    const patternId = await patternLibrary.addPattern({
      pattern_name,
      pattern_type,
      description,
      code_example,
      context,
    });

    return NextResponse.json({
      success: true,
      pattern_id: patternId,
    });
  } catch (error) {
    console.error('Error adding pattern:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
