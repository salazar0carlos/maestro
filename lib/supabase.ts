/**
 * Supabase client configuration for Maestro
 * Provides database access for analysis history, pattern library, and impact tracking
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Database types
export interface AnalysisHistory {
  id: string;
  project_id: string;
  analysis_date: string;
  suggestions_count: number;
  approved_count: number;
  rejected_count: number;
  implemented_count: number;
  analysis_data: any;
  code_snapshot: string;
  model_version: string;
  execution_time_ms: number;
  created_at: string;
}

export interface PatternLibrary {
  id: string;
  pattern_name: string;
  pattern_type: 'approved' | 'rejected';
  description: string;
  code_example: string;
  context: any;
  frequency: number;
  confidence_score: number;
  last_seen: string;
  created_at: string;
  updated_at: string;
}

export interface ImpactTracking {
  id: string;
  improvement_id: string;
  project_id: string;
  metric_type: 'performance' | 'errors' | 'code_quality' | 'user_experience';
  baseline_value: number;
  current_value: number;
  improvement_percentage: number;
  measurement_date: string;
  metadata: any;
  created_at: string;
}

export interface CodeSnapshot {
  id: string;
  project_id: string;
  snapshot_date: string;
  file_count: number;
  total_lines: number;
  file_checksums: any;
  git_commit: string | null;
  created_at: string;
}

export interface SuggestionQualityMetrics {
  id: string;
  analysis_id: string;
  total_suggestions: number;
  approval_rate: number;
  implementation_rate: number;
  avg_confidence_score: number;
  pattern_matches: number;
  research_triggers: number;
  quality_score: number;
  created_at: string;
}

/**
 * Get Supabase client instance
 */
export function getSupabaseClient(): SupabaseClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }

  return createClient(supabaseUrl, supabaseKey);
}

/**
 * Singleton Supabase client
 */
let supabaseInstance: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!supabaseInstance) {
    supabaseInstance = getSupabaseClient();
  }
  return supabaseInstance;
}

/**
 * Database table names
 */
export const Tables = {
  ANALYSIS_HISTORY: 'analysis_history',
  PATTERN_LIBRARY: 'pattern_library',
  IMPACT_TRACKING: 'impact_tracking',
  CODE_SNAPSHOTS: 'code_snapshots',
  SUGGESTION_QUALITY_METRICS: 'suggestion_quality_metrics',
} as const;
