-- ============================================================================
-- Maestro Database Schema for Supabase
-- ============================================================================
-- This schema creates all tables needed to migrate from localStorage to Supabase
-- Run this in your Supabase SQL Editor: https://app.supabase.com/project/_/sql
--
-- Instructions:
-- 1. Go to your Supabase project SQL Editor
-- 2. Copy and paste this entire file
-- 3. Click "Run" to execute
-- ============================================================================

-- Enable UUID extension for cost_records and events
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- CORE TABLES
-- ============================================================================

-- Projects Table
-- Uses TEXT IDs to match existing codebase (e.g., 'sample-project-1')
CREATE TABLE IF NOT EXISTS projects (
  project_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  github_repo TEXT,
  local_path TEXT,
  status TEXT CHECK (status IN ('active', 'paused', 'complete')) NOT NULL DEFAULT 'active',
  created_date TIMESTAMPTZ DEFAULT NOW(),
  agent_count INTEGER DEFAULT 0,
  task_count INTEGER DEFAULT 0
);

-- Tasks Table
CREATE TABLE IF NOT EXISTS tasks (
  task_id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  ai_prompt TEXT NOT NULL,
  assigned_to_agent TEXT,
  assigned_to_agent_type TEXT,
  priority INTEGER CHECK (priority BETWEEN 1 AND 5) NOT NULL DEFAULT 3,
  status TEXT CHECK (status IN ('todo', 'in-progress', 'done', 'blocked')) NOT NULL DEFAULT 'todo',
  created_date TIMESTAMPTZ DEFAULT NOW(),
  started_date TIMESTAMPTZ,
  completed_date TIMESTAMPTZ,
  blocked_reason TEXT,
  ai_response TEXT,
  completed_by_agent TEXT
);

-- Agents Table
CREATE TABLE IF NOT EXISTS agents (
  agent_id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
  agent_name TEXT NOT NULL,
  agent_type TEXT,
  status TEXT CHECK (status IN ('active', 'idle', 'offline')) NOT NULL DEFAULT 'idle',
  last_poll_date TIMESTAMPTZ,
  tasks_completed INTEGER DEFAULT 0,
  tasks_in_progress INTEGER DEFAULT 0,
  tasks_failed INTEGER DEFAULT 0,
  success_rate NUMERIC(5,4),
  average_task_time INTEGER,
  current_task_id TEXT,
  capabilities TEXT[],
  health_score INTEGER CHECK (health_score BETWEEN 0 AND 100),
  created_date TIMESTAMPTZ DEFAULT NOW()
);

-- Improvements/Suggestions Table
CREATE TABLE IF NOT EXISTS improvements (
  improvement_id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  suggested_by TEXT NOT NULL,
  status TEXT CHECK (status IN ('pending', 'approved', 'rejected', 'implemented')) NOT NULL DEFAULT 'pending',
  priority INTEGER CHECK (priority BETWEEN 1 AND 5) NOT NULL DEFAULT 3,
  estimated_impact TEXT CHECK (estimated_impact IN ('low', 'medium', 'high')) DEFAULT 'medium',
  created_date TIMESTAMPTZ DEFAULT NOW(),
  reviewed_date TIMESTAMPTZ,
  reviewed_by TEXT,
  rejection_reason TEXT,
  converted_to_task_id TEXT REFERENCES tasks(task_id)
);

-- Cost Records Table (for API usage tracking)
CREATE TABLE IF NOT EXISTS cost_records (
  record_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id TEXT,
  task_id TEXT REFERENCES tasks(task_id),
  project_id TEXT REFERENCES projects(project_id),
  model TEXT NOT NULL,
  input_tokens INTEGER NOT NULL,
  output_tokens INTEGER NOT NULL,
  cost_usd NUMERIC(10,6) NOT NULL,
  operation TEXT NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB
);

-- Events Table (for system events and audit log)
CREATE TABLE IF NOT EXISTS events (
  event_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_type TEXT NOT NULL,
  source TEXT NOT NULL,
  data JSONB,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- PHASE 3: INTELLIGENCE LAYER TABLES
-- ============================================================================

-- Analysis History Table
CREATE TABLE IF NOT EXISTS analysis_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id TEXT NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
  analysis_date TIMESTAMPTZ DEFAULT NOW(),
  suggestions_count INTEGER DEFAULT 0,
  approved_count INTEGER DEFAULT 0,
  rejected_count INTEGER DEFAULT 0,
  implemented_count INTEGER DEFAULT 0,
  analysis_data JSONB,
  code_snapshot TEXT,
  model_version TEXT,
  execution_time_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pattern Library Table
CREATE TABLE IF NOT EXISTS pattern_library (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pattern_name TEXT NOT NULL,
  pattern_type TEXT CHECK (pattern_type IN ('approved', 'rejected')) NOT NULL,
  description TEXT,
  code_example TEXT,
  context JSONB,
  frequency INTEGER DEFAULT 1,
  confidence_score NUMERIC(5,4) CHECK (confidence_score BETWEEN 0 AND 1),
  last_seen TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Impact Tracking Table
CREATE TABLE IF NOT EXISTS impact_tracking (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  improvement_id TEXT REFERENCES improvements(improvement_id) ON DELETE CASCADE,
  project_id TEXT NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
  metric_type TEXT CHECK (metric_type IN ('performance', 'errors', 'code_quality', 'user_experience')) NOT NULL,
  baseline_value NUMERIC,
  current_value NUMERIC,
  improvement_percentage NUMERIC,
  measurement_date TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Code Snapshots Table
CREATE TABLE IF NOT EXISTS code_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id TEXT NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
  snapshot_date TIMESTAMPTZ DEFAULT NOW(),
  file_count INTEGER,
  total_lines INTEGER,
  file_checksums JSONB,
  git_commit TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Suggestion Quality Metrics Table
CREATE TABLE IF NOT EXISTS suggestion_quality_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  analysis_id UUID REFERENCES analysis_history(id) ON DELETE CASCADE,
  total_suggestions INTEGER DEFAULT 0,
  approval_rate NUMERIC(5,4),
  implementation_rate NUMERIC(5,4),
  avg_confidence_score NUMERIC(5,4),
  pattern_matches INTEGER DEFAULT 0,
  research_triggers INTEGER DEFAULT 0,
  quality_score NUMERIC(5,4),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Projects indexes
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_created_date ON projects(created_date);

-- Tasks indexes
CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to_agent);
CREATE INDEX IF NOT EXISTS idx_tasks_project_status ON tasks(project_id, status);
CREATE INDEX IF NOT EXISTS idx_tasks_created_date ON tasks(created_date);
CREATE INDEX IF NOT EXISTS idx_tasks_completed_date ON tasks(completed_date);

-- Agents indexes
CREATE INDEX IF NOT EXISTS idx_agents_project_id ON agents(project_id);
CREATE INDEX IF NOT EXISTS idx_agents_status ON agents(status);
CREATE INDEX IF NOT EXISTS idx_agents_current_task ON agents(current_task_id);

-- Improvements indexes
CREATE INDEX IF NOT EXISTS idx_improvements_project_id ON improvements(project_id);
CREATE INDEX IF NOT EXISTS idx_improvements_status ON improvements(status);
CREATE INDEX IF NOT EXISTS idx_improvements_project_status ON improvements(project_id, status);

-- Cost records indexes
CREATE INDEX IF NOT EXISTS idx_cost_records_project_id ON cost_records(project_id);
CREATE INDEX IF NOT EXISTS idx_cost_records_timestamp ON cost_records(timestamp);
CREATE INDEX IF NOT EXISTS idx_cost_records_agent_id ON cost_records(agent_id);
CREATE INDEX IF NOT EXISTS idx_cost_records_model ON cost_records(model);

-- Events indexes
CREATE INDEX IF NOT EXISTS idx_events_event_type ON events(event_type);
CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp);

-- Analysis history indexes
CREATE INDEX IF NOT EXISTS idx_analysis_history_project_id ON analysis_history(project_id);
CREATE INDEX IF NOT EXISTS idx_analysis_history_date ON analysis_history(analysis_date);

-- Pattern library indexes
CREATE INDEX IF NOT EXISTS idx_pattern_library_type ON pattern_library(pattern_type);
CREATE INDEX IF NOT EXISTS idx_pattern_library_name ON pattern_library(pattern_name);

-- Impact tracking indexes
CREATE INDEX IF NOT EXISTS idx_impact_tracking_improvement_id ON impact_tracking(improvement_id);
CREATE INDEX IF NOT EXISTS idx_impact_tracking_project_id ON impact_tracking(project_id);

-- ============================================================================
-- VIEWS FOR ANALYTICS
-- ============================================================================

-- Agent productivity metrics
CREATE OR REPLACE VIEW agent_productivity AS
SELECT
  a.agent_id,
  a.agent_name,
  a.project_id,
  a.status,
  a.tasks_completed,
  a.tasks_in_progress,
  COUNT(DISTINCT t.task_id) FILTER (WHERE t.completed_date >= NOW() - INTERVAL '1 day') as tasks_completed_today,
  COUNT(DISTINCT t.task_id) FILTER (WHERE t.completed_date >= NOW() - INTERVAL '7 days') as tasks_completed_week,
  ROUND(AVG(EXTRACT(EPOCH FROM (t.completed_date - t.started_date)) / 3600)::numeric, 2) as avg_completion_hours,
  COALESCE(SUM(cr.cost_usd), 0) as total_cost
FROM agents a
LEFT JOIN tasks t ON a.agent_id = t.assigned_to_agent
LEFT JOIN cost_records cr ON a.agent_id = cr.agent_id
GROUP BY a.agent_id, a.agent_name, a.project_id, a.status, a.tasks_completed, a.tasks_in_progress;

-- Task completion trends
CREATE OR REPLACE VIEW task_completion_trends AS
SELECT
  DATE(completed_date) as completion_date,
  COUNT(*) as tasks_completed,
  status,
  project_id
FROM tasks
WHERE completed_date IS NOT NULL
GROUP BY DATE(completed_date), status, project_id
ORDER BY completion_date DESC;

-- Cost analytics
CREATE OR REPLACE VIEW cost_analytics AS
SELECT
  DATE(timestamp) as cost_date,
  model,
  agent_id,
  project_id,
  COUNT(*) as api_calls,
  SUM(input_tokens) as total_input_tokens,
  SUM(output_tokens) as total_output_tokens,
  SUM(cost_usd) as total_cost
FROM cost_records
GROUP BY DATE(timestamp), model, agent_id, project_id
ORDER BY cost_date DESC;

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE improvements ENABLE ROW LEVEL SECURITY;
ALTER TABLE cost_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Create permissive policies (allow all access for now)
-- You can restrict these later for multi-tenant support

DROP POLICY IF EXISTS "Allow all access to projects" ON projects;
CREATE POLICY "Allow all access to projects" ON projects FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow all access to tasks" ON tasks;
CREATE POLICY "Allow all access to tasks" ON tasks FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow all access to agents" ON agents;
CREATE POLICY "Allow all access to agents" ON agents FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow all access to improvements" ON improvements;
CREATE POLICY "Allow all access to improvements" ON improvements FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow all access to cost_records" ON cost_records;
CREATE POLICY "Allow all access to cost_records" ON cost_records FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow all access to events" ON events;
CREATE POLICY "Allow all access to events" ON events FOR ALL USING (true);

-- ============================================================================
-- TABLE COMMENTS
-- ============================================================================

COMMENT ON TABLE projects IS 'Maestro orchestration projects';
COMMENT ON TABLE tasks IS 'Tasks assigned to agents';
COMMENT ON TABLE agents IS 'AI agents performing tasks';
COMMENT ON TABLE improvements IS 'Product improvement suggestions';
COMMENT ON TABLE cost_records IS 'Claude API usage and cost tracking';
COMMENT ON TABLE events IS 'System event log';
COMMENT ON TABLE analysis_history IS 'Continuous analysis run history';
COMMENT ON TABLE pattern_library IS 'Learned patterns from approvals/rejections';
COMMENT ON TABLE impact_tracking IS 'Impact metrics for implemented improvements';

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '==============================================================================';
  RAISE NOTICE 'Maestro database schema created successfully!';
  RAISE NOTICE '==============================================================================';
  RAISE NOTICE 'Core tables: projects, tasks, agents, improvements, cost_records, events';
  RAISE NOTICE 'Intelligence tables: analysis_history, pattern_library, impact_tracking';
  RAISE NOTICE 'Views: agent_productivity, task_completion_trends, cost_analytics';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Verify tables in your Supabase dashboard';
  RAISE NOTICE '2. Update your application to use Supabase';
  RAISE NOTICE '3. Run the migration script to transfer localStorage data';
  RAISE NOTICE '==============================================================================';
END $$;
