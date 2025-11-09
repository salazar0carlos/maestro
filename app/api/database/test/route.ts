/**
 * API route: /api/database/test
 * GET - Test database connection
 */

import { NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

export async function GET() {
  try {
    // Check if Supabase is configured
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        {
          error: 'Database not configured',
          message: 'NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are not set',
        },
        { status: 503 }
      );
    }

    // Test connection by querying projects table
    const { data, error } = await supabase
      .from('projects')
      .select('project_id')
      .limit(1);

    if (error) {
      console.error('[database/test] Connection error:', error);
      return NextResponse.json(
        {
          error: 'Connection test failed',
          message: error.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Database connection successful',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[database/test] Error:', error);
    return NextResponse.json(
      {
        error: 'Connection test failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
