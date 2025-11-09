# Production Database Setup for Maestro

## Why We Need This

**Problem:** localStorage is browser-specific
- Vercel browser has different data than localhost browser
- Agents can't see localStorage data
- No real-time sync

**Solution:** Shared PostgreSQL database (Supabase)
- One source of truth
- Vercel reads/writes to database
- Agents read/writes to database
- Everything syncs in real-time

## Setup Steps

### 1. Create Supabase Account (Free)

1. Go to https://supabase.com
2. Sign up (free tier is generous)
3. Create new project
4. Get your credentials:
   - Project URL
   - API Key (anon/public)
   - Service Role Key (for agents)

### 2. Create Database Tables

Run this SQL in Supabase SQL Editor:

```sql
-- Projects table
CREATE TABLE projects (
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
CREATE TABLE tasks (
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
CREATE TABLE agents (
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
CREATE INDEX idx_tasks_project ON tasks(project_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_agent ON tasks(assigned_to_agent);
CREATE INDEX idx_agents_project ON agents(project_id);
CREATE INDEX idx_agents_status ON agents(status);

-- Enable Row Level Security (RLS)
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;

-- Create policies (allow all for now, restrict later)
CREATE POLICY "Allow all access to projects" ON projects FOR ALL USING (true);
CREATE POLICY "Allow all access to tasks" ON tasks FOR ALL USING (true);
CREATE POLICY "Allow all access to agents" ON agents FOR ALL USING (true);
```

### 3. Install Supabase Client

```bash
npm install @supabase/supabase-js
```

### 4. Add Environment Variables

**For Vercel:**
1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your-project-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```

**For Localhost (.env):**
```bash
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 5. Migration Script

To migrate existing localStorage data to Supabase, we'll create a migration tool.

### 6. Deploy Agents

Agents will be deployed to Railway and will:
- Read tasks from Supabase
- Execute tasks
- Write results back to Supabase
- Vercel UI shows real-time updates

## Benefits

✅ **Single Source of Truth** - One database for everything
✅ **Real-time Sync** - Vercel and agents see same data
✅ **Always Online** - Database hosted by Supabase
✅ **Scalable** - PostgreSQL can handle production load
✅ **Free Tier** - Supabase free tier is generous

## Next Steps

1. Create Supabase account
2. Run SQL to create tables
3. Update storage.ts to use Supabase
4. Deploy agents to Railway
5. Configure Vercel with database URL

Then everything will work online! 🚀
