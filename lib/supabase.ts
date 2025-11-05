/**
 * Supabase Client Configuration
 *
 * Provides database access for Maestro
 * Replaces localStorage with shared PostgreSQL database
 */

import { createClient } from '@supabase/supabase-js';

// Get credentials from environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Create Supabase client (browser-safe with anon key)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Server-side client with service role (for agents)
export function createServiceClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  if (!serviceRoleKey) {
    console.warn('[Supabase] Service role key not found. Some operations may fail.');
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

// Check if Supabase is configured
export function isSupabaseConfigured(): boolean {
  return Boolean(supabaseUrl && supabaseAnonKey);
}

// Database types (matching our schema)
export interface DbProject {
  project_id: string;
  name: string;
  description?: string;
  status: string;
  created_date: string;
  agent_count: number;
  task_count: number;
  github_repo?: string;
  local_path?: string;
}

export interface DbTask {
  task_id: string;
  project_id: string;
  title: string;
  description?: string;
  ai_prompt?: string;
  assigned_to_agent?: string;
  assigned_to_agent_type?: string;
  priority: number;
  status: string;
  created_date: string;
  started_date?: string;
  completed_date?: string;
  blocked_reason?: string;
  ai_response?: string;
  completed_by_agent?: string;
}

export interface DbAgent {
  agent_id: string;
  project_id: string;
  agent_name: string;
  agent_type?: string;
  status: string;
  last_poll_date?: string;
  tasks_completed: number;
  tasks_in_progress: number;
  tasks_failed?: number;
  success_rate?: number;
  average_task_time?: number;
  current_task_id?: string;
  capabilities?: string[];
  health_score?: number;
  created_date?: string;
}
