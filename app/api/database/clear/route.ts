/**
 * API route: /api/database/clear
 * POST - Clear all data from database (DANGEROUS)
 */

import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST() {
  try {
    // Delete all data from tables (in correct order due to foreign keys)
    await supabase.from('improvements').delete().neq('improvement_id', '');
    await supabase.from('tasks').delete().neq('task_id', '');
    await supabase.from('agents').delete().neq('agent_id', '');
    await supabase.from('projects').delete().neq('project_id', '');
    await supabase.from('cost_records').delete().neq('record_id', '');
    await supabase.from('events').delete().neq('event_id', '');

    return NextResponse.json({
      success: true,
      message: 'All data cleared successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[database/clear] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to clear data',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
