/**
 * Agent Health API
 * Returns health status of all agents
 */

import { NextResponse } from 'next/server';
import { AgentHealthMonitor } from '@/lib/agent-health';

export async function GET() {
  try {
    const healthCheck = await AgentHealthMonitor.runHealthCheck();

    return NextResponse.json({
      systemHealth: healthCheck.systemHealth,
      healthy: healthCheck.healthyAgents,
      idle: healthCheck.idleAgents,
      stuck: healthCheck.stuckAgents,
      offline: healthCheck.offlineAgents,
      criticalIssues: healthCheck.criticalIssues,
    });
  } catch (error) {
    console.error('Error getting agent health:', error);
    return NextResponse.json(
      { error: 'Failed to get agent health' },
      { status: 500 }
    );
  }
}
