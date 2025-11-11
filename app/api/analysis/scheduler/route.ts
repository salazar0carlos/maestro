/**
 * API Endpoint: Analysis Scheduler
 * GET /api/analysis/scheduler - Get scheduler status
 * POST /api/analysis/scheduler - Control scheduler (start/stop/force)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getScheduler } from '@/lib/analysis-scheduler';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const action = searchParams.get('action');

    const scheduler = getScheduler();

    if (action === 'schedules') {
      const schedules = await scheduler.getScheduledAnalyses();
      return NextResponse.json({
        success: true,
        schedules,
      });
    } else {
      const status = scheduler.getStatus();
      return NextResponse.json({
        success: true,
        status,
      });
    }
  } catch (error) {
    console.error('Error getting scheduler status:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, project_id, project_name } = body;

    if (!action) {
      return NextResponse.json(
        { error: 'Missing required field: action' },
        { status: 400 }
      );
    }

    const scheduler = getScheduler();

    switch (action) {
      case 'start':
        scheduler.start();
        return NextResponse.json({
          success: true,
          message: 'Scheduler started',
        });

      case 'stop':
        scheduler.stop();
        return NextResponse.json({
          success: true,
          message: 'Scheduler stopped',
        });

      case 'force':
        if (!project_id) {
          return NextResponse.json(
            { error: 'project_id required for force action' },
            { status: 400 }
          );
        }
        await scheduler.forceAnalysis(project_id, project_name);
        return NextResponse.json({
          success: true,
          message: `Forced analysis for project ${project_id}`,
        });

      case 'run_all':
        await scheduler.runScheduledAnalysis();
        return NextResponse.json({
          success: true,
          message: 'Running scheduled analysis for all projects',
        });

      default:
        return NextResponse.json(
          { error: 'Invalid action. Must be: start, stop, force, or run_all' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Error controlling scheduler:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
