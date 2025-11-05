/**
 * API: Run Tests Manually
 * POST /api/testing/run-tests
 */

import { NextRequest, NextResponse } from 'next/server';
import { createTestExecutor, TestMode } from '@/lib/test-executor';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const mode = body.mode || TestMode.QUICK;

    console.log(`[API] Running tests in ${mode} mode`);

    const executor = createTestExecutor({
      projectRoot: process.cwd(),
      maestroUrl: process.env.MAESTRO_URL || 'http://localhost:3000',
    });

    const result = await executor.runManualTests(mode);

    return NextResponse.json({
      success: true,
      mode: result.mode,
      passed: result.results.passed,
      duration: result.results.duration,
      results: result.results,
    });
  } catch (error) {
    console.error('[API] Error running tests:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const executor = createTestExecutor();
    const stats = await executor.getStatistics();

    return NextResponse.json({
      success: true,
      statistics: stats,
    });
  } catch (error) {
    console.error('[API] Error getting test statistics:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}
