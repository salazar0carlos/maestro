/**
 * Bottleneck Detection API
 * Returns detected bottlenecks and spawn recommendations
 */

import { NextResponse } from 'next/server';
import { BottleneckDetector } from '@/lib/bottleneck-detection';

export async function GET() {
  try {
    const bottlenecks = BottleneckDetector.detectBottlenecks();
    const recommendations = BottleneckDetector.getSpawnRecommendations();
    const utilization = BottleneckDetector.getCapacityUtilization();

    return NextResponse.json({
      bottlenecks,
      recommendations,
      utilization,
      needsCapacity: BottleneckDetector.needsMoreCapacity(),
    });
  } catch (error) {
    console.error('Error detecting bottlenecks:', error);
    return NextResponse.json(
      { error: 'Failed to detect bottlenecks' },
      { status: 500 }
    );
  }
}
