-- Maestro Database Schema for Supabase
-- Run this in Supabase SQL Editor after creating your project

-- Projects table
CREATE TABLE IF NOT EXISTS projects (
  project_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'active',
  created_date TIMESTAMPTZ DEFAULT NOW(),
  agent_count INTEGER DEFAULT 0,
  task_count INTEGER DEFAULT 0,
  github_repo TEXT,
  local_path TEXT
-- Maestro Analytics Database Schema
-- Run this in your Supabase SQL editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Projects table
CREATE TABLE IF NOT EXISTS projects (
  project_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  github_repo TEXT,
  local_path TEXT,
  status TEXT NOT NULL CHECK (status IN ('active', 'paused', 'complete')),
  created_date TIMESTAMPTZ DEFAULT NOW(),
  agent_count INTEGER DEFAULT 0,
  task_count INTEGER DEFAULT 0
);

-- Tasks table
CREATE TABLE IF NOT EXISTS tasks (
  task_id TEXT PRIMARY KEY,
  project_id TEXT REFERENCES projects(project_id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  ai_prompt TEXT,
  assigned_to_agent TEXT,
  assigned_to_agent_type TEXT,
  priority INTEGER DEFAULT 3,
  status TEXT DEFAULT 'todo',
  created_date TIMESTAMPTZ DEFAULT NOW(),
  started_date TIMESTAMPTZ,
  completed_date TIMESTAMPTZ,
  blocked_reason TEXT,
  ai_response TEXT,
  completed_by_agent TEXT
  task_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(project_id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  ai_prompt TEXT NOT NULL,
  assigned_to_agent TEXT,
  priority INTEGER DEFAULT 3 CHECK (priority >= 1 AND priority <= 5),
  status TEXT NOT NULL CHECK (status IN ('todo', 'in-progress', 'done', 'blocked')),
  created_date TIMESTAMPTZ DEFAULT NOW(),
  started_date TIMESTAMPTZ,
  completed_date TIMESTAMPTZ,
  blocked_reason TEXT
);

-- Agents table
CREATE TABLE IF NOT EXISTS agents (
  agent_id TEXT PRIMARY KEY,
  project_id TEXT REFERENCES projects(project_id) ON DELETE CASCADE,
  agent_name TEXT NOT NULL,
  agent_type TEXT,
  status TEXT DEFAULT 'idle',
  last_poll_date TIMESTAMPTZ,
  tasks_completed INTEGER DEFAULT 0,
  tasks_in_progress INTEGER DEFAULT 0,
  tasks_failed INTEGER DEFAULT 0,
  success_rate DECIMAL DEFAULT 1.0,
  average_task_time INTEGER,
  current_task_id TEXT,
  capabilities TEXT[],
  health_score INTEGER,
  created_date TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_agent ON tasks(assigned_to_agent);
CREATE INDEX IF NOT EXISTS idx_agents_project ON agents(project_id);
CREATE INDEX IF NOT EXISTS idx_agents_status ON agents(status);
CREATE INDEX IF NOT EXISTS idx_tasks_created ON tasks(created_date DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;

-- Create policies (allow all for now, can restrict later)
DROP POLICY IF EXISTS "Allow all access to projects" ON projects;
CREATE POLICY "Allow all access to projects" ON projects FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow all access to tasks" ON tasks;
CREATE POLICY "Allow all access to tasks" ON tasks FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow all access to agents" ON agents;
CREATE POLICY "Allow all access to agents" ON agents FOR ALL USING (true);

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Maestro database schema created successfully!';
  RAISE NOTICE 'Tables: projects, tasks, agents';
  RAISE NOTICE 'You can now configure your application with the Supabase credentials.';
END $$;
  project_id UUID REFERENCES projects(project_id) ON DELETE CASCADE,
  agent_name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active', 'idle', 'offline')),
  last_poll_date TIMESTAMPTZ,
  tasks_completed INTEGER DEFAULT 0,
  tasks_in_progress INTEGER DEFAULT 0
);

-- Cost records table (for Claude API usage tracking)
CREATE TABLE IF NOT EXISTS cost_records (
  record_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id TEXT,
  task_id UUID REFERENCES tasks(task_id) ON DELETE SET NULL,
  project_id UUID REFERENCES projects(project_id) ON DELETE SET NULL,
  model TEXT NOT NULL,
  input_tokens INTEGER NOT NULL,
  output_tokens INTEGER NOT NULL,
  cost_usd DECIMAL(10, 6) NOT NULL,
  operation TEXT NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB
);

-- Events table (for event tracking)
CREATE TABLE IF NOT EXISTS events (
  event_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_type TEXT NOT NULL,
  source TEXT NOT NULL,
  data JSONB,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Improvements table
CREATE TABLE IF NOT EXISTS improvements (
  improvement_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(project_id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  suggested_by TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected', 'implemented')),
  priority INTEGER DEFAULT 3 CHECK (priority >= 1 AND priority <= 5),
  estimated_impact TEXT CHECK (estimated_impact IN ('low', 'medium', 'high')),
  created_date TIMESTAMPTZ DEFAULT NOW(),
  reviewed_date TIMESTAMPTZ,
  converted_to_task_id UUID REFERENCES tasks(task_id) ON DELETE SET NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_agent ON tasks(assigned_to_agent);
CREATE INDEX IF NOT EXISTS idx_tasks_created_date ON tasks(created_date);
CREATE INDEX IF NOT EXISTS idx_tasks_completed_date ON tasks(completed_date);

CREATE INDEX IF NOT EXISTS idx_agents_project_id ON agents(project_id);
CREATE INDEX IF NOT EXISTS idx_agents_status ON agents(status);

CREATE INDEX IF NOT EXISTS idx_cost_records_timestamp ON cost_records(timestamp);
CREATE INDEX IF NOT EXISTS idx_cost_records_agent_id ON cost_records(agent_id);
CREATE INDEX IF NOT EXISTS idx_cost_records_task_id ON cost_records(task_id);
CREATE INDEX IF NOT EXISTS idx_cost_records_project_id ON cost_records(project_id);
CREATE INDEX IF NOT EXISTS idx_cost_records_model ON cost_records(model);

CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp);
CREATE INDEX IF NOT EXISTS idx_events_event_type ON events(event_type);
CREATE INDEX IF NOT EXISTS idx_events_source ON events(source);

-- Views for analytics

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

-- Enable Row Level Security (RLS) - Optional, can be configured later
-- ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE cost_records ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE events ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE improvements ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE projects IS 'Maestro orchestration projects';
COMMENT ON TABLE tasks IS 'Tasks assigned to agents';
COMMENT ON TABLE agents IS 'AI agents performing tasks';
COMMENT ON TABLE cost_records IS 'Claude API usage and cost tracking';
COMMENT ON TABLE events IS 'System event log';
COMMENT ON TABLE improvements IS 'Product improvement suggestions';
