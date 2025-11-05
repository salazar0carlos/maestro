/**
 * API route: GET /api/analytics/costs/export
 *
 * Export cost records as CSV
 */

import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling } from '@/lib/api-utils';
import { CostTracker } from '@/lib/cost-tracking';
import { PerformanceMonitor } from '@/lib/performance';

/**
 * GET /api/analytics/costs/export
 * Export costs as CSV
 */
async function handleGet(_request: NextRequest): Promise<NextResponse> {
  PerformanceMonitor.start('export_costs');

  try {
    const csv = CostTracker.exportCSV();

    PerformanceMonitor.end('export_costs');

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="maestro-costs-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });
  } catch (error) {
    PerformanceMonitor.end('export_costs');
    throw error;
  }
}

export const GET = withErrorHandling(handleGet);
