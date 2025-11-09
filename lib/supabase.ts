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
