-- Row Level Security (RLS) Policies for Maestro
-- Run this in Supabase SQL Editor AFTER running the user_id migration
-- This ensures users can only access their own data

-- ============================================
-- PROJECTS TABLE
-- ============================================

-- Enable RLS on projects table
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- Allow users to view only their own projects
CREATE POLICY "Users can view their own projects"
  ON projects FOR SELECT
  USING (auth.uid() = user_id);

-- Allow users to insert their own projects
CREATE POLICY "Users can insert their own projects"
  ON projects FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own projects
CREATE POLICY "Users can update their own projects"
  ON projects FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Allow users to delete their own projects
CREATE POLICY "Users can delete their own projects"
  ON projects FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- TASKS TABLE
-- ============================================

-- Enable RLS on tasks table
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Allow users to view only their own tasks
CREATE POLICY "Users can view their own tasks"
  ON tasks FOR SELECT
  USING (auth.uid() = user_id);

-- Allow users to insert their own tasks
CREATE POLICY "Users can insert their own tasks"
  ON tasks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own tasks
CREATE POLICY "Users can update their own tasks"
  ON tasks FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Allow users to delete their own tasks
CREATE POLICY "Users can delete their own tasks"
  ON tasks FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- AGENTS TABLE
-- ============================================

-- Enable RLS on agents table
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;

-- Allow users to view only their own agents
CREATE POLICY "Users can view their own agents"
  ON agents FOR SELECT
  USING (auth.uid() = user_id);

-- Allow users to insert their own agents
CREATE POLICY "Users can insert their own agents"
  ON agents FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own agents
CREATE POLICY "Users can update their own agents"
  ON agents FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Allow users to delete their own agents
CREATE POLICY "Users can delete their own agents"
  ON agents FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- IMPROVEMENTS TABLE
-- ============================================

-- Enable RLS on improvements table
ALTER TABLE improvements ENABLE ROW LEVEL SECURITY;

-- Allow users to view only their own improvements
CREATE POLICY "Users can view their own improvements"
  ON improvements FOR SELECT
  USING (auth.uid() = user_id);

-- Allow users to insert their own improvements
CREATE POLICY "Users can insert their own improvements"
  ON improvements FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own improvements
CREATE POLICY "Users can update their own improvements"
  ON improvements FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Allow users to delete their own improvements
CREATE POLICY "Users can delete their own improvements"
  ON improvements FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- COST_RECORDS TABLE
-- ============================================

-- Enable RLS on cost_records table
ALTER TABLE cost_records ENABLE ROW LEVEL SECURITY;

-- Allow users to view only their own cost records
CREATE POLICY "Users can view their own cost records"
  ON cost_records FOR SELECT
  USING (auth.uid() = user_id);

-- Allow users to insert their own cost records
CREATE POLICY "Users can insert their own cost records"
  ON cost_records FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- EVENTS TABLE
-- ============================================

-- Enable RLS on events table
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Allow users to view only their own events
CREATE POLICY "Users can view their own events"
  ON events FOR SELECT
  USING (auth.uid() = user_id);

-- Allow users to insert their own events
CREATE POLICY "Users can insert their own events"
  ON events FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- VERIFICATION
-- ============================================

-- After running these policies, verify with:
-- SELECT tablename, policyname, permissive, roles, cmd, qual, with_check
-- FROM pg_policies
-- WHERE schemaname = 'public'
-- ORDER BY tablename, policyname;

-- Test that RLS is working:
-- 1. Sign up as user A, create a project
-- 2. Sign up as user B, try to view user A's projects (should see none)
-- 3. Create a project as user B (should only see B's project)
