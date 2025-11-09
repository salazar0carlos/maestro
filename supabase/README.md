# Supabase Setup for Maestro Analytics

This guide will help you set up Supabase as the backend database for Maestro's analytics and reporting system.

## Prerequisites

- A Supabase account (free tier available at https://supabase.com)
- Node.js environment set up with Maestro

## Step 1: Create a Supabase Project

1. Go to https://app.supabase.com
2. Click "New Project"
3. Fill in the project details:
   - Project name: `maestro-analytics` (or your preferred name)
   - Database password: Choose a strong password
   - Region: Select the closest region to your users
4. Wait for the project to finish setting up (2-3 minutes)

## Step 2: Get Your API Credentials

1. In your Supabase project dashboard, go to **Settings** → **API**
2. Copy the following values:
   - **Project URL** (looks like `https://xxxxx.supabase.co`)
   - **anon/public key** (starts with `eyJ...`)

## Step 3: Configure Environment Variables

1. In your Maestro project root, create a `.env.local` file (or update your existing `.env`)
2. Add the following variables with your actual values:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here

# Anthropic API Key
ANTHROPIC_API_KEY=sk-ant-your-api-key-here
```

**Important:** Never commit `.env.local` to version control. It's already in `.gitignore`.

## Step 4: Run the Database Schema

1. In your Supabase project, go to the **SQL Editor**
2. Click **New Query**
3. Copy the entire contents of `supabase/schema.sql` from this directory
4. Paste it into the SQL editor
5. Click **Run** (or press Cmd/Ctrl + Enter)

You should see a success message indicating all tables and views were created.

## Step 5: Verify the Database Setup

1. Go to **Table Editor** in your Supabase dashboard
2. You should see the following tables:
   - `projects`
   - `tasks`
   - `agents`
   - `cost_records`
   - `events`
   - `improvements`

3. Go to **Database** → **Views** to verify:
   - `agent_productivity`
   - `task_completion_trends`
   - `cost_analytics`

## Step 6: Test the Connection

1. Start your Maestro development server:
   ```bash
   npm run dev
   ```

2. Navigate to http://localhost:3000/analytics

3. The analytics page should load (it may be empty if you don't have data yet)

## Data Migration (Optional)

If you have existing data in localStorage, you'll need to migrate it to Supabase. This involves:

1. Exporting data from localStorage
2. Transforming it to match the Supabase schema
3. Inserting it via the Supabase client or SQL

Contact the development team for migration scripts if needed.

## Database Schema Overview

### Tables

#### `projects`
Stores orchestration projects.
- `project_id` (UUID, PK)
- `name`, `description`
- `github_repo`, `local_path`
- `status` (active, paused, complete)
- `created_date`
- `agent_count`, `task_count`

#### `tasks`
Stores tasks assigned to agents.
- `task_id` (UUID, PK)
- `project_id` (FK → projects)
- `title`, `description`, `ai_prompt`
- `assigned_to_agent`
- `priority` (1-5)
- `status` (todo, in-progress, done, blocked)
- `created_date`, `started_date`, `completed_date`
- `blocked_reason`

#### `agents`
Stores agent information.
- `agent_id` (TEXT, PK)
- `project_id` (FK → projects)
- `agent_name`
- `status` (active, idle, offline)
- `last_poll_date`
- `tasks_completed`, `tasks_in_progress`

#### `cost_records`
Tracks Claude API usage and costs.
- `record_id` (UUID, PK)
- `agent_id`, `task_id`, `project_id`
- `model`, `input_tokens`, `output_tokens`
- `cost_usd`
- `operation`
- `timestamp`
- `metadata` (JSONB)

#### `events`
System event log.
- `event_id` (UUID, PK)
- `event_type`, `source`
- `data` (JSONB)
- `timestamp`

#### `improvements`
Product improvement suggestions.
- `improvement_id` (UUID, PK)
- `project_id` (FK → projects)
- `title`, `description`
- `suggested_by`
- `status` (pending, approved, rejected, implemented)
- `priority` (1-5)
- `estimated_impact` (low, medium, high)
- `created_date`, `reviewed_date`
- `converted_to_task_id`

### Views

#### `agent_productivity`
Aggregated agent performance metrics including:
- Tasks completed (today, this week)
- Average completion time
- Total cost

#### `task_completion_trends`
Daily task completion statistics by project and status.

#### `cost_analytics`
Daily cost breakdowns by model, agent, and project.

## Analytics Features

The analytics system provides:

1. **Agent Productivity Metrics**
   - Tasks per day/hour
   - Success/failure rates
   - Average completion times

2. **Task Completion Trends**
   - Line charts showing task creation and completion over time
   - Filterable by date range (today, week, month, all time)

3. **Cost Tracking**
   - Claude API usage per agent/model
   - Cost per task calculations
   - Total spend tracking

4. **Failure Analysis**
   - Most common blocking reasons
   - Blocked task trends

5. **Agent Utilization**
   - Active/idle/offline distribution
   - Pie charts for visual representation

6. **CSV Export**
   - Export all metrics to CSV for external analysis

## Troubleshooting

### "Failed to load analytics"
- Verify your Supabase credentials in `.env.local`
- Check that the schema was applied successfully
- Look for errors in the browser console (F12)

### Empty charts/no data
- This is normal if you haven't created any projects or tasks yet
- Add some test data via the Maestro UI
- The analytics will populate as agents complete tasks

### Database connection errors
- Ensure `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set correctly
- Restart the development server after changing environment variables
- Check that your Supabase project is active (not paused)

### Row Level Security (RLS) issues
- The schema does not enable RLS by default for simplicity
- For production deployments, uncomment the RLS lines in `schema.sql` and set up appropriate policies

## Security Considerations

### For Development
- The current setup uses the public anon key, which is safe for development
- No RLS policies are enabled by default

### For Production
1. Enable Row Level Security (RLS) on all tables
2. Create policies to restrict access based on user authentication
3. Use Supabase Auth for user management
4. Consider using service role keys for server-side operations only

## Next Steps

1. ✅ Set up Supabase project
2. ✅ Configure environment variables
3. ✅ Run database schema
4. ✅ Verify tables and views
5. ✅ Test analytics page
6. 🔄 Create test data (projects, tasks, agents)
7. 🔄 Monitor analytics in real-time as agents work

## Support

For issues or questions:
- Check the [Supabase Documentation](https://supabase.com/docs)
- Review the Maestro project README
- Contact the development team

## Additional Resources

- [Supabase SQL Editor](https://supabase.com/docs/guides/database/overview)
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript/introduction)
- [Next.js Environment Variables](https://nextjs.org/docs/basic-features/environment-variables)
