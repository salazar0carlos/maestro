/**
 * Supabase Client Configuration
 *
 * Provides database access and authentication for Maestro
 * Replaces localStorage with shared PostgreSQL database
 */

import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';

// Create client with placeholder values if env vars not set
// This allows the app to build without configured Supabase
export const supabase = createSupabaseClient(supabaseUrl, supabaseAnonKey);

// Create browser client for client-side authentication
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// Helper to check if Supabase is configured
export const isSupabaseConfigured = () => {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
    process.env.NEXT_PUBLIC_SUPABASE_URL !== 'https://placeholder.supabase.co'
  );
};

// Authentication helpers
export async function getCurrentUser() {
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error) {
    console.error('[supabase] Error getting current user:', error);
    return null;
  }

  return user;
}

export async function getUserId(): Promise<string | null> {
  const user = await getCurrentUser();
  return user?.id || null;
}

// Server-side client with service role (for agents)
export function createServiceClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  if (!serviceRoleKey) {
    console.warn('[Supabase] Service role key not found. Some operations may fail.');
  }

  return createSupabaseClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

// Export for compatibility with analysis modules
export const getSupabase = () => supabase;

// Database table names for analysis modules
export const Tables = {
  ANALYSIS_HISTORY: 'analysis_history',
  PATTERN_LIBRARY: 'pattern_library',
  IMPACT_TRACKING: 'impact_tracking',
  CODE_SNAPSHOTS: 'code_snapshots',
  SUGGESTION_QUALITY_METRICS: 'suggestion_quality_metrics',
} as const;

// Analysis module types (for Phase 3 continuous analysis)
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
          assigned_to_agent_type: string | null;
          priority: number;
          status: 'todo' | 'in-progress' | 'done' | 'blocked';
          created_date: string;
          started_date: string | null;
          completed_date: string | null;
          blocked_reason: string | null;
          ai_response: string | null;
          completed_by_agent: string | null;
        };
        Insert: Omit<Database['public']['Tables']['tasks']['Row'], 'created_date'>;
        Update: Partial<Database['public']['Tables']['tasks']['Insert']>;
      };
      agents: {
        Row: {
          agent_id: string;
          project_id: string;
          agent_name: string;
          agent_type: string | null;
          status: 'active' | 'idle' | 'offline';
          last_poll_date: string | null;
          tasks_completed: number;
          tasks_in_progress: number;
          tasks_failed: number | null;
          success_rate: number | null;
          average_task_time: number | null;
          current_task_id: string | null;
          capabilities: string[] | null;
          health_score: number | null;
          created_date: string | null;
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
          reviewed_by: string | null;
          rejection_reason: string | null;
          converted_to_task_id: string | null;
        };
        Insert: Omit<Database['public']['Tables']['improvements']['Row'], 'created_date'>;
        Update: Partial<Database['public']['Tables']['improvements']['Insert']>;
      };
    };
  };
};
