-- Maestro Supabase Schema
-- PostgreSQL schema for storing Maestro orchestration data

-- Drop existing tables if they exist (for clean reinstall)
DROP TABLE IF EXISTS suggestion_quality_metrics CASCADE;
DROP TABLE IF EXISTS code_snapshots CASCADE;
DROP TABLE IF EXISTS impact_tracking CASCADE;
DROP TABLE IF EXISTS pattern_library CASCADE;
DROP TABLE IF EXISTS analysis_history CASCADE;
DROP TABLE IF EXISTS events CASCADE;
DROP TABLE IF EXISTS cost_records CASCADE;
DROP TABLE IF EXISTS improvements CASCADE;
DROP TABLE IF EXISTS tasks CASCADE;
DROP TABLE IF EXISTS agents CASCADE;
DROP TABLE IF EXISTS projects CASCADE;

-- ============================================================================
-- CORE TABLES
-- ============================================================================

-- Projects table
CREATE TABLE projects (
  project_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'active',
  created_date TIMESTAMPTZ DEFAULT NOW(),
  agent_count INTEGER DEFAULT 0,
  task_count INTEGER DEFAULT 0
);

-- Agents table
CREATE TABLE agents (
  agent_id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
  agent_name TEXT NOT NULL,
  status TEXT DEFAULT 'idle',
  tasks_completed INTEGER DEFAULT 0,
  tasks_in_progress INTEGER DEFAULT 0,
  last_poll_date TIMESTAMPTZ,
  health_score REAL DEFAULT 100.0,
  created_date TIMESTAMPTZ DEFAULT NOW()
);

-- Tasks table
CREATE TABLE tasks (
  task_id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'todo',
  priority INTEGER DEFAULT 3,
  assigned_to_agent TEXT REFERENCES agents(agent_id) ON DELETE SET NULL,
  created_date TIMESTAMPTZ DEFAULT NOW(),
  started_date TIMESTAMPTZ,
  completed_date TIMESTAMPTZ,
  ai_prompt TEXT,
  tags TEXT[]
);

-- Improvements table
CREATE TABLE improvements (
  improvement_id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  suggested_by TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  priority INTEGER DEFAULT 3,
  estimated_impact TEXT DEFAULT 'medium',
  created_date TIMESTAMPTZ DEFAULT NOW(),
  implemented_date TIMESTAMPTZ
);

-- Cost records table
CREATE TABLE cost_records (
  cost_id SERIAL PRIMARY KEY,
  project_id TEXT REFERENCES projects(project_id) ON DELETE CASCADE,
  task_id TEXT REFERENCES tasks(task_id) ON DELETE CASCADE,
  agent_id TEXT REFERENCES agents(agent_id) ON DELETE SET NULL,
  cost_usd REAL NOT NULL,
  tokens_used INTEGER,
  model TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Events table
CREATE TABLE events (
  event_id SERIAL PRIMARY KEY,
  event_type TEXT NOT NULL,
  project_id TEXT REFERENCES projects(project_id) ON DELETE CASCADE,
  task_id TEXT REFERENCES tasks(task_id) ON DELETE CASCADE,
  agent_id TEXT REFERENCES agents(agent_id) ON DELETE SET NULL,
  message TEXT NOT NULL,
  severity TEXT DEFAULT 'info',
  metadata JSONB,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INTELLIGENCE LAYER TABLES
-- ============================================================================

-- Analysis history table
CREATE TABLE analysis_history (
  analysis_id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
  analysis_type TEXT NOT NULL,
  findings JSONB NOT NULL,
  suggestions TEXT[],
  metrics JSONB,
  triggered_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pattern library table
CREATE TABLE pattern_library (
  pattern_id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
  pattern_type TEXT NOT NULL,
  pattern_name TEXT NOT NULL,
  description TEXT,
  occurrence_count INTEGER DEFAULT 1,
  confidence_score REAL DEFAULT 0.5,
  related_tasks TEXT[],
  metadata JSONB,
  first_seen_at TIMESTAMPTZ DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ DEFAULT NOW()
);

-- Impact tracking table
CREATE TABLE impact_tracking (
  impact_id TEXT PRIMARY KEY,
  improvement_id TEXT REFERENCES improvements(improvement_id) ON DELETE CASCADE,
  metric_name TEXT NOT NULL,
  before_value REAL,
  after_value REAL,
  improvement_percentage REAL,
  measured_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB
);

-- Code snapshots table
CREATE TABLE code_snapshots (
  snapshot_id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  content TEXT NOT NULL,
  hash TEXT NOT NULL,
  related_task_id TEXT REFERENCES tasks(task_id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB
);

-- Suggestion quality metrics table
CREATE TABLE suggestion_quality_metrics (
  metric_id TEXT PRIMARY KEY,
  improvement_id TEXT REFERENCES improvements(improvement_id) ON DELETE CASCADE,
  suggestion_quality_score REAL,
  implementation_success BOOLEAN,
  time_to_implement_hours REAL,
  user_rating INTEGER CHECK (user_rating >= 1 AND user_rating <= 5),
  feedback_text TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Core table indexes
CREATE INDEX idx_agents_project_id ON agents(project_id);
CREATE INDEX idx_agents_status ON agents(status);
CREATE INDEX idx_tasks_project_id ON tasks(project_id);
CREATE INDEX idx_tasks_assigned_to_agent ON tasks(assigned_to_agent);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_priority ON tasks(priority);
CREATE INDEX idx_improvements_project_id ON improvements(project_id);
CREATE INDEX idx_improvements_status ON improvements(status);
CREATE INDEX idx_cost_records_project_id ON cost_records(project_id);
CREATE INDEX idx_cost_records_timestamp ON cost_records(timestamp);
CREATE INDEX idx_events_project_id ON events(project_id);
CREATE INDEX idx_events_timestamp ON events(timestamp);

-- Intelligence layer indexes
CREATE INDEX idx_analysis_history_project_id ON analysis_history(project_id);
CREATE INDEX idx_analysis_history_created_at ON analysis_history(created_at);
CREATE INDEX idx_pattern_library_project_id ON pattern_library(project_id);
CREATE INDEX idx_pattern_library_pattern_type ON pattern_library(pattern_type);
CREATE INDEX idx_impact_tracking_improvement_id ON impact_tracking(improvement_id);
CREATE INDEX idx_code_snapshots_project_id ON code_snapshots(project_id);
CREATE INDEX idx_code_snapshots_file_path ON code_snapshots(file_path);
CREATE INDEX idx_suggestion_quality_metrics_improvement_id ON suggestion_quality_metrics(improvement_id);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Disable RLS for now (enable in production with proper policies)
ALTER TABLE projects DISABLE ROW LEVEL SECURITY;
ALTER TABLE agents DISABLE ROW LEVEL SECURITY;
ALTER TABLE tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE improvements DISABLE ROW LEVEL SECURITY;
ALTER TABLE cost_records DISABLE ROW LEVEL SECURITY;
ALTER TABLE events DISABLE ROW LEVEL SECURITY;
ALTER TABLE analysis_history DISABLE ROW LEVEL SECURITY;
ALTER TABLE pattern_library DISABLE ROW LEVEL SECURITY;
ALTER TABLE impact_tracking DISABLE ROW LEVEL SECURITY;
ALTER TABLE code_snapshots DISABLE ROW LEVEL SECURITY;
ALTER TABLE suggestion_quality_metrics DISABLE ROW LEVEL SECURITY;

-- ============================================================================
-- USEFUL VIEWS
-- ============================================================================

-- Active agents view
CREATE OR REPLACE VIEW active_agents AS
SELECT
  a.*,
  p.name AS project_name,
  COUNT(DISTINCT t.task_id) AS current_tasks
FROM agents a
LEFT JOIN projects p ON a.project_id = p.project_id
LEFT JOIN tasks t ON t.assigned_to_agent = a.agent_id AND t.status = 'in-progress'
WHERE a.status != 'offline'
GROUP BY a.agent_id, p.name;

-- Task summary view
CREATE OR REPLACE VIEW task_summary AS
SELECT
  p.project_id,
  p.name AS project_name,
  COUNT(CASE WHEN t.status = 'todo' THEN 1 END) AS todo_count,
  COUNT(CASE WHEN t.status = 'in-progress' THEN 1 END) AS in_progress_count,
  COUNT(CASE WHEN t.status = 'done' THEN 1 END) AS done_count,
  COUNT(CASE WHEN t.status = 'blocked' THEN 1 END) AS blocked_count,
  COUNT(t.task_id) AS total_tasks
FROM projects p
LEFT JOIN tasks t ON p.project_id = t.project_id
GROUP BY p.project_id, p.name;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE projects IS 'Maestro projects - each project represents a codebase being orchestrated';
COMMENT ON TABLE agents IS 'Autonomous agents that execute tasks';
COMMENT ON TABLE tasks IS 'Work items assigned to agents';
COMMENT ON TABLE improvements IS 'Suggested improvements identified by the Product Improvement Agent';
COMMENT ON TABLE cost_records IS 'API cost tracking for Claude usage';
COMMENT ON TABLE events IS 'System events and audit log';
COMMENT ON TABLE analysis_history IS 'Historical analysis results from Continuous Analysis Agent';
COMMENT ON TABLE pattern_library IS 'Detected patterns in tasks, errors, and code';
COMMENT ON TABLE impact_tracking IS 'Tracks the measured impact of implemented improvements';
COMMENT ON TABLE code_snapshots IS 'Version snapshots of code before/after changes';
COMMENT ON TABLE suggestion_quality_metrics IS 'Tracks quality and success of improvement suggestions';
