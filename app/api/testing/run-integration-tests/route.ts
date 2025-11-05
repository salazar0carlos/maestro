/**
 * API: Run Integration Tests
 * POST /api/testing/run-integration-tests
 */

import { NextRequest, NextResponse } from 'next/server';
import { createTestExecutor, TestMode } from '@/lib/test-executor';

export async function POST(request: NextRequest) {
  try {
    console.log('[API] Running integration tests');

    const executor = createTestExecutor({
      projectRoot: process.cwd(),
      maestroUrl: process.env.MAESTRO_URL || 'http://localhost:3000',
    });

    // Always run deep tests for integration testing
    const result = await executor.runManualTests(TestMode.DEEP);

    return NextResponse.json({
      success: true,
      mode: result.mode,
      passed: result.results.passed,
      duration: result.results.duration,
      test_suites: result.results.test_suites,
      total_tests: result.results.total_tests,
      passed_tests: result.results.passed_tests,
      failed_tests: result.results.failed_tests,
    });
  } catch (error) {
    console.error('[API] Error running integration tests:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}
