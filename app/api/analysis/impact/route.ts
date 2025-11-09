/**
 * API Endpoint: Impact Tracking
 * GET /api/analysis/impact?project_id=xxx&days=30
 * POST /api/analysis/impact (record new impact)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getImpactTracking } from '@/lib/impact-tracking';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const projectId = searchParams.get('project_id');
    const improvementId = searchParams.get('improvement_id');
    const days = parseInt(searchParams.get('days') || '30');

    if (!projectId && !improvementId) {
      return NextResponse.json(
        { error: 'Missing required parameter: project_id or improvement_id' },
        { status: 400 }
      );
    }

    const impactTracking = getImpactTracking();

    if (improvementId) {
      const summary = await impactTracking.getImpactSummary(improvementId);
      return NextResponse.json({
        success: true,
        improvement_id: improvementId,
        summary,
      });
    } else if (projectId) {
      const impacts = await impactTracking.getProjectImpacts(projectId, days);
      const stats = await impactTracking.getProjectImpactStats(projectId, days);

      return NextResponse.json({
        success: true,
        project_id: projectId,
        days,
        total: impacts.length,
        impacts,
        stats,
      });
    }
  } catch (error) {
    console.error('Error fetching impact data:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      improvement_id,
      project_id,
      metric_type,
      baseline_value,
      current_value,
      metadata,
    } = body;

    if (!improvement_id || !project_id || !metric_type || baseline_value === undefined || current_value === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const validMetricTypes = ['performance', 'errors', 'code_quality', 'user_experience'];
    if (!validMetricTypes.includes(metric_type)) {
      return NextResponse.json(
        { error: `Invalid metric_type. Must be one of: ${validMetricTypes.join(', ')}` },
        { status: 400 }
      );
    }

    const impactTracking = getImpactTracking();
    const impactId = await impactTracking.recordImpact({
      improvement_id,
      project_id,
      metric_type,
      baseline_value: parseFloat(baseline_value),
      current_value: parseFloat(current_value),
      metadata,
    });

    return NextResponse.json({
      success: true,
      impact_id: impactId,
    });
  } catch (error) {
    console.error('Error recording impact:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
