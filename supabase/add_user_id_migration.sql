-- Migration: Add user_id to all tables for multi-tenancy
-- Run this in Supabase SQL Editor BEFORE enabling RLS policies
-- This adds user_id columns and creates indexes for efficient queries

-- Add user_id to projects table
ALTER TABLE projects ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);

-- Add user_id to tasks table
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);

-- Add user_id to agents table
ALTER TABLE agents ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_agents_user_id ON agents(user_id);

-- Add user_id to improvements table
ALTER TABLE improvements ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_improvements_user_id ON improvements(user_id);

-- Add user_id to cost_records table (optional - for tracking costs per user)
ALTER TABLE cost_records ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_cost_records_user_id ON cost_records(user_id);

-- Add user_id to events table (optional - for tracking events per user)
ALTER TABLE events ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_events_user_id ON events(user_id);

-- Note: After running this migration:
-- 1. Existing data will have NULL user_id
-- 2. You may want to either:
--    a) Delete test data: DELETE FROM projects WHERE user_id IS NULL;
--    b) Assign to a specific user: UPDATE projects SET user_id = 'your-user-id' WHERE user_id IS NULL;
-- 3. Then run the RLS policies migration
