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
