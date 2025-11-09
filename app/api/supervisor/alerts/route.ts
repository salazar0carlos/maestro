/**
 * Alerts API
 * Generates and returns current system alerts
 */

import { NextResponse } from 'next/server';
import { AlertSystem } from '@/lib/alerts';

export async function GET() {
  try {
    const alerts = AlertSystem.generateAlerts();
    const summary = AlertSystem.getAlertSummary();

    return NextResponse.json({
      alerts,
      summary,
      hasCritical: AlertSystem.hasCriticalAlerts(),
    });
  } catch (error) {
    console.error('Error generating alerts:', error);
    return NextResponse.json(
      { error: 'Failed to generate alerts' },
      { status: 500 }
    );
  }
}
