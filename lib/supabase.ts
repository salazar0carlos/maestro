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
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';

// Create client with placeholder values if env vars not set
// This allows the app to build without configured Supabase
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Helper to check if Supabase is configured
export const isSupabaseConfigured = () => {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
    process.env.NEXT_PUBLIC_SUPABASE_URL !== 'https://placeholder.supabase.co'
  );
};

export type Database = {
  public: {
    Tables: {
      projects: {
        Row: {
          project_id: string;
          name: string;
          description: string;
          github_repo: string | null;
          local_path: string | null;
          status: 'active' | 'paused' | 'complete';
          created_date: string;
          agent_count: number;
          task_count: number;
        };
        Insert: Omit<Database['public']['Tables']['projects']['Row'], 'created_date'>;
        Update: Partial<Database['public']['Tables']['projects']['Insert']>;
      };
      tasks: {
        Row: {
          task_id: string;
          project_id: string;
          title: string;
          description: string;
          ai_prompt: string;
          assigned_to_agent: string | null;
          priority: number;
          status: 'todo' | 'in-progress' | 'done' | 'blocked';
          created_date: string;
          started_date: string | null;
          completed_date: string | null;
          blocked_reason: string | null;
        };
        Insert: Omit<Database['public']['Tables']['tasks']['Row'], 'created_date'>;
        Update: Partial<Database['public']['Tables']['tasks']['Insert']>;
      };
      agents: {
        Row: {
          agent_id: string;
          project_id: string;
          agent_name: string;
          status: 'active' | 'idle' | 'offline';
          last_poll_date: string | null;
          tasks_completed: number;
          tasks_in_progress: number;
        };
        Insert: Database['public']['Tables']['agents']['Row'];
        Update: Partial<Database['public']['Tables']['agents']['Insert']>;
      };
      cost_records: {
        Row: {
          record_id: string;
          agent_id: string | null;
          task_id: string | null;
          project_id: string | null;
          model: string;
          input_tokens: number;
          output_tokens: number;
          cost_usd: number;
          operation: string;
          timestamp: string;
          metadata: Record<string, any> | null;
        };
        Insert: Omit<Database['public']['Tables']['cost_records']['Row'], 'record_id' | 'timestamp'>;
        Update: Partial<Database['public']['Tables']['cost_records']['Insert']>;
      };
      events: {
        Row: {
          event_id: string;
          event_type: string;
          source: string;
          data: Record<string, any> | null;
          timestamp: string;
        };
        Insert: Omit<Database['public']['Tables']['events']['Row'], 'event_id' | 'timestamp'>;
        Update: Partial<Database['public']['Tables']['events']['Insert']>;
      };
      improvements: {
        Row: {
          improvement_id: string;
          project_id: string;
          title: string;
          description: string;
          suggested_by: string;
          status: 'pending' | 'approved' | 'rejected' | 'implemented';
          priority: number;
          estimated_impact: 'low' | 'medium' | 'high';
          created_date: string;
          reviewed_date: string | null;
          converted_to_task_id: string | null;
        };
        Insert: Omit<Database['public']['Tables']['improvements']['Row'], 'created_date'>;
        Update: Partial<Database['public']['Tables']['improvements']['Insert']>;
      };
    };
  };
};
